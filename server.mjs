import fs from "node:fs";
import http from "node:http";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const CONFIG_PATH = path.join(process.cwd(), "proxy.config.json");

const DEFAULT_CONFIG = {
  port: 9183,
  workerBaseUrl: "http://127.0.0.1:9182",
  workerProtocol: "responses",
  workerPath: "/openai/responses",
  upstreamMode: "cursor_worker",
  upstreamBaseUrl: "https://capi.quan2go.com",
  upstreamPath: "/openai/responses",
  sqlitePath: "sqlite3.exe",
  cursorStateDb: path.join(process.env.APPDATA ?? "", "Cursor", "User", "globalStorage", "state.vscdb"),
  debug: false,
  requestDefaults: {
    reasoningEffort: "medium",
    verbosity: "low"
  },
  auth: {
    workerAuthToken: "",
    loginKey: "",
    directBearerToken: "",
    directXApiKey: "",
    capturedAuthPath: path.join(process.cwd(), "runtime", "latest-upstream-auth.json"),
    credentialMode: "auto",
    preferCursorState: true
  },
  models: {
    defaultAnthropicModel: "claude-sonnet-4-20250514",
    aliases: {
      opus: "claude-opus-4-6",
      sonnet: "claude-sonnet-4-20250514",
      haiku: "claude-3-5-haiku-20241022",
      "claude-opus-4-6": "claude-opus-4-6",
      "claude-sonnet-4-20250514": "claude-sonnet-4-20250514",
      "claude-haiku-3-5-20241022": "claude-3-5-haiku-20241022",
      "claude-3-5-haiku-20241022": "claude-3-5-haiku-20241022",
      "claude-3-7-sonnet-20250219": "claude-3-7-sonnet-20250219",
      "claude-opus-4-20250514": "claude-opus-4-20250514",
      "gpt-5.4": "gpt-5.4"
    }
  },
  headers: {
    originator: "codex_vscode",
    extra: {}
  }
};

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override ?? base;
  }

  if (!base || typeof base !== "object") {
    return override ?? base;
  }

  if (!override || typeof override !== "object") {
    return override ?? base;
  }

  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    merged[key] = key in base ? deepMerge(base[key], value) : value;
  }
  return merged;
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return {};
  }
}

function parseJsonEnv(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function loadConfig() {
  const fileConfig = readJsonFile(CONFIG_PATH);
  const envConfig = {
    port: process.env.PORT ? Number.parseInt(process.env.PORT, 10) : undefined,
    workerBaseUrl: process.env.WORKER_BASE_URL,
    workerProtocol: process.env.WORKER_PROTOCOL,
    workerPath: process.env.WORKER_PATH,
    upstreamMode: process.env.UPSTREAM_MODE,
    upstreamBaseUrl: process.env.UPSTREAM_BASE_URL,
    upstreamPath: process.env.UPSTREAM_PATH,
    debug: process.env.DEBUG_PROXY === "1" ? true : undefined,
    auth: {
      workerAuthToken: process.env.UPSTREAM_AUTH_TOKEN,
      loginKey: process.env.LOGIN_KEY,
      directBearerToken: process.env.DIRECT_BEARER_TOKEN,
      directXApiKey: process.env.DIRECT_X_API_KEY,
      capturedAuthPath: process.env.CAPTURED_AUTH_PATH,
      credentialMode: process.env.WORKER_CREDENTIAL_MODE
    },
    models: {
      defaultAnthropicModel: process.env.DEFAULT_MODEL,
      aliases: parseJsonEnv(process.env.MODEL_MAP_JSON, undefined)
    },
    headers: {
      extra: parseJsonEnv(process.env.UPSTREAM_HEADERS_JSON, undefined)
    }
  };

  return deepMerge(DEFAULT_CONFIG, deepMerge(fileConfig, envConfig));
}

const config = loadConfig();

let cachedState = {
  value: null,
  fetchedAt: 0
};

function log(...args) {
  if (config.debug) {
    console.log("[debug]", ...args);
  }
}

function json(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body)
  });
  res.end(body);
}

function anthropicError(res, status, type, message) {
  json(res, status, {
    type: "error",
    error: { type, message },
    request_id: `req_${randomUUID().replace(/-/g, "")}`
  });
}

function sseHeaders(res) {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive"
  });
}

function writeSseEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const text = Buffer.concat(chunks).toString("utf8").trim();
  return text ? JSON.parse(text) : {};
}

function normalizeTextContent(content) {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((block) => {
      if (!block || typeof block !== "object") {
        return "";
      }

      if (block.type === "text") {
        return block.text ?? "";
      }

      if (block.type === "tool_result") {
        return normalizeTextContent(block.content);
      }

      if (block.type === "image") {
        return "[image omitted]";
      }

      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function normalizeSystem(system) {
  if (!system) {
    return "";
  }

  if (typeof system === "string") {
    return system;
  }

  return normalizeTextContent(system);
}

function convertAnthropicMessagesToResponsesInput(messages) {
  const input = [];

  for (const message of messages ?? []) {
    const role = message?.role ?? "user";
    const contentBlocks = Array.isArray(message?.content)
      ? message.content
      : [{ type: "text", text: message?.content ?? "" }];

    const text = normalizeTextContent(contentBlocks);
    if (!text) {
      continue;
    }

    input.push({
      type: "message",
      role,
      content: [
        {
          type: "input_text",
          text
        }
      ]
    });
  }

  return input;
}

function mapModel(requestedModel) {
  const fallback = config.models.defaultAnthropicModel;
  const aliasMap = config.models.aliases ?? {};
  const resolved = requestedModel ? aliasMap[requestedModel] ?? requestedModel : fallback;
  return aliasMap[resolved] ?? resolved ?? fallback;
}

function getCursorWorkerToken() {
  const authState = getAuthState();
  return (
    config.auth.workerAuthToken ||
    authState.cursorState?.workerAuthToken ||
    authState.localAuth?.codexCursorToken ||
    ""
  );
}

function approximateTokens(input) {
  const text = typeof input === "string" ? input : JSON.stringify(input ?? "");
  return Math.max(1, Math.ceil(text.length / 4));
}

function sqliteQuery(sql) {
  return execFileSync(config.sqlitePath, [config.cursorStateDb, sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
}

function readFileTrimmed(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8").trim();
  } catch {
    return "";
  }
}

function readCapturedUpstreamAuth() {
  const filePath = config.auth.capturedAuthPath || path.join(process.cwd(), "runtime", "latest-upstream-auth.json");
  const parsed = readJsonFile(filePath);
  return {
    filePath,
    capturedAt: parsed.capturedAt ?? null,
    authorization: parsed.authorization ?? "",
    xApiKey: parsed.xApiKey ?? "",
    conversationId: parsed.conversationId ?? "",
    userAgent: parsed.userAgent ?? ""
  };
}

function readLocalAuthFiles() {
  const codexCursor = readFileTrimmed(path.join(os.homedir(), ".codex_cursor"));
  const codexCursorLines = codexCursor
    ? codexCursor
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

  return {
    codexCursorToken: codexCursorLines[0] ?? "",
    codexCursorUrl: codexCursorLines[1] ?? "",
    codexActivator: readFileTrimmed(path.join(os.homedir(), ".codex-activator"))
  };
}

function readCursorPoolState() {
  const sources = ["keg1255.cursorpool", "undefined_publisher.cursorpool"];
  let state = null;

  for (const key of sources) {
    try {
      const raw = sqliteQuery(`select value from ItemTable where key='${key}';`);
      if (!raw) {
        continue;
      }

      const parsed = JSON.parse(raw);
      const user = parsed["cursorpool.user"];
      if (user) {
        state = {
          sourceKey: key,
          account: user.account ?? "",
          loginKey: user.activationCode ?? "",
          workerAuthToken: user.token ?? "",
          status: user.status ?? null,
          vipProduct: user.vip?.product ?? "",
          vipExpiresAt: user.vip?.expire_at ?? null
        };

        log("cursor state candidate", {
          sourceKey: key,
          hasAccount: Boolean(state.account),
          hasLoginKey: Boolean(state.loginKey),
          hasWorkerToken: Boolean(state.workerAuthToken),
          status: state.status,
          vipProduct: state.vipProduct,
          vipExpiresAt: state.vipExpiresAt
        });
        break;
      }
    } catch (error) {
      log("cursor state lookup failed", key, error.message);
    }
  }

  cachedState = {
    value: state,
    fetchedAt: Date.now()
  };

  log("cursor state resolved", {
    found: Boolean(state),
    sourceKey: state?.sourceKey ?? null,
    hasAccount: Boolean(state?.account),
    hasLoginKey: Boolean(state?.loginKey),
    hasWorkerToken: Boolean(state?.workerAuthToken),
    vipProduct: state?.vipProduct ?? null,
    vipExpiresAt: state?.vipExpiresAt ?? null
  });

  return state;
}

function getAuthState() {
  const cursorState = readCursorPoolState();
  const localAuth = readLocalAuthFiles();
  const capturedUpstream = readCapturedUpstreamAuth();
  const explicitToken = config.auth.workerAuthToken || "";
  const explicitLoginKey = config.auth.loginKey || "";
  const credentialMode = (config.auth.credentialMode || "auto").toLowerCase();

  const candidates = {
    explicit_worker_token: explicitToken,
    cursor_state_worker_token: config.auth.preferCursorState !== false ? cursorState?.workerAuthToken ?? "" : "",
    codex_cursor_token: localAuth.codexCursorToken,
    explicit_login_key: explicitLoginKey,
    cursor_state_activation_code: cursorState?.loginKey ?? "",
    cursor_state_account: cursorState?.account ?? "",
    codex_activator: localAuth.codexActivator
  };

  const modes = {
    auto: [
      "explicit_worker_token",
      "cursor_state_worker_token",
      "codex_cursor_token",
      "explicit_login_key",
      "cursor_state_activation_code",
      "cursor_state_account",
      "codex_activator"
    ],
    worker_token: ["explicit_worker_token", "cursor_state_worker_token", "codex_cursor_token"],
    activation_code: ["explicit_login_key", "cursor_state_activation_code"],
    account: ["cursor_state_account"],
    codex_activator: ["codex_activator"]
  };

  const orderedSources = modes[credentialMode] ?? modes.auto;
  const resolvedSource = orderedSources.find((key) => candidates[key]) ?? null;
  const resolvedCredential = resolvedSource ? candidates[resolvedSource] : "";

  return {
    credentialMode,
    resolvedSource,
    resolvedCredential,
    configTokenPresent: Boolean(explicitToken),
    configLoginKeyPresent: Boolean(explicitLoginKey),
    localAuth,
    resolvedLoginKey: explicitLoginKey || cursorState?.loginKey || "",
    cursorState,
    capturedUpstream
  };
}

function getWorkerHeaders() {
  const authState = getAuthState();
  const token = authState.resolvedCredential;

  if (!token) {
    throw new Error(
      "No worker credential was found. Refresh CursorPool once in Cursor or set auth.workerAuthToken/auth.loginKey in proxy.config.json."
    );
  }

  return {
    authorization: `Bearer ${token}`,
    accept: "text/event-stream",
    "content-type": "application/json",
    originator: config.headers.originator ?? "codex_vscode",
    session_id: randomUUID(),
    "x-client-request-id": randomUUID(),
    "x-codex-window-id": `${randomUUID()}:0`,
    "x-codex-turn-metadata": JSON.stringify({
      session_id: randomUUID(),
      turn_id: randomUUID(),
      sandbox: "windows_elevated"
    }),
    ...config.headers.extra
  };
}

function getDirectUpstreamHeaders() {
  const authState = getAuthState();
  const captured = authState.capturedUpstream;
  const authorization = config.auth.directBearerToken
    ? `Bearer ${config.auth.directBearerToken.replace(/^Bearer\s+/i, "")}`
    : captured.authorization;
  const workerToken = authState.cursorState?.workerAuthToken || authState.localAuth?.codexCursorToken || "";
  const xApiKey =
    config.auth.directXApiKey ||
    captured.xApiKey ||
    (workerToken ? `cursor|${workerToken}` : "");

  if (!authorization) {
    throw new Error(
      `No upstream bearer token is available. Start the worker through ${path.join(process.cwd(), "debug-worker-wrapper.cjs")} and let Cursor make one successful request first.`
    );
  }

  if (!xApiKey) {
    throw new Error("No upstream x-api-key is available for direct mode.");
  }

  return {
    authorization,
    "x-api-key": xApiKey,
    accept: "text/event-stream",
    "content-type": "application/json",
    conversation_id: randomUUID(),
    "user-agent": captured.userAgent || "codex_cli_rs/0.63.0 (Mac OS 26.1.0; arm64) iTerm.app/3.6.5"
  };
}

function normalizeAnthropicBlocks(content) {
  if (typeof content === "string") {
    return [{ type: "text", text: content }];
  }

  if (!Array.isArray(content)) {
    return [];
  }

  return content.filter(Boolean);
}

function buildToolDefinitions(tools) {
  if (!Array.isArray(tools) || tools.length === 0) {
    return undefined;
  }

  return tools.map((tool) => ({
    name: tool?.name ?? "tool",
    description: tool?.description ?? "",
    input_schema_json: JSON.stringify(tool?.input_schema ?? { type: "object", properties: {} })
  }));
}

function buildRequestMessageState(content, startingId = 0) {
  const blocks = normalizeAnthropicBlocks(content);
  const nodes = [];
  let nextId = startingId;
  const textParts = [];

  for (const block of blocks) {
    if (block.type === "text" && block.text) {
      textParts.push(block.text);
      continue;
    }

    if (block.type === "tool_result") {
      nodes.push({
        id: nextId++,
        type: 1,
        tool_result_node: {
          tool_use_id: block.tool_use_id ?? block.id ?? `toolu_${randomUUID().replace(/-/g, "")}`,
          content: normalizeTextContent(block.content)
        }
      });
      continue;
    }

    if (block.type === "image") {
      textParts.push("[image omitted]");
    }
  }

  const text = textParts.join("\n").trim();
  if (text) {
    nodes.unshift({
      id: nextId++,
      type: 0,
      text_node: {
        content: text
      }
    });
  }

  return {
    text,
    nodes
  };
}

function buildAssistantResponseState(content, startingId = 0) {
  const blocks = normalizeAnthropicBlocks(content);
  const nodes = [];
  let nextId = startingId;
  let responseText = "";

  for (const block of blocks) {
    if (block.type === "text" && block.text) {
      responseText += (responseText ? "\n" : "") + block.text;
      continue;
    }

    if (block.type === "tool_use") {
      nodes.push({
        id: nextId++,
        type: 5,
        content: "",
        tool_use: {
          tool_use_id: block.id ?? `toolu_${randomUUID().replace(/-/g, "")}`,
          tool_name: block.name ?? "tool",
          input_json: JSON.stringify(block.input ?? {})
        },
        metadata: {}
      });
    }
  }

  if (responseText) {
    nodes.unshift({
      id: nextId++,
      type: 0,
      content: responseText
    });
  }

  return {
    responseText,
    nodes
  };
}

function buildChatHistory(messages) {
  const history = [];
  let pendingUser = null;

  for (const message of messages ?? []) {
    if (message?.role === "user") {
      if (pendingUser) {
        history.push(pendingUser);
      }

      const requestState = buildRequestMessageState(message.content);
      pendingUser = {
        request_message: requestState.text,
        request_nodes: requestState.nodes,
        response_text: "",
        response_nodes: []
      };
      continue;
    }

    if (message?.role === "assistant" && pendingUser) {
      const responseState = buildAssistantResponseState(message.content);
      pendingUser.response_text = responseState.responseText;
      pendingUser.response_nodes = responseState.nodes;
      history.push(pendingUser);
      pendingUser = null;
      continue;
    }
  }

  return {
    history,
    pendingUser
  };
}

function buildChatStreamRequest(request) {
  const messages = Array.isArray(request.messages) ? request.messages : [];
  const { history, pendingUser } = buildChatHistory(messages);
  const currentUser = pendingUser ?? buildRequestMessageState(messages.at(-1)?.content ?? "");
  const currentUserText = pendingUser?.request_message ?? currentUser.text;
  const currentUserNodes = pendingUser?.request_nodes ?? currentUser.nodes;

  return {
    model: mapModel(request.model),
    message: currentUserText,
    user_guidelines: normalizeSystem(request.system),
    chat_history: history,
    tool_definitions: buildToolDefinitions(request.tools),
    nodes: currentUserNodes
  };
}

function buildResponsesRequest(request) {
  return {
    model: mapModel(request.model),
    instructions: normalizeSystem(request.system),
    input: convertAnthropicMessagesToResponsesInput(request.messages),
    tool_choice: "auto",
    parallel_tool_calls: true,
    reasoning: {
      effort: config.requestDefaults.reasoningEffort ?? "medium"
    },
    store: false,
    stream: true,
    text: {
      verbosity: config.requestDefaults.verbosity ?? "low"
    }
  };
}

function buildCursorToolDefinitions(tools) {
  if (!Array.isArray(tools) || tools.length === 0) {
    return undefined;
  }

  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool?.name ?? "tool",
      description: tool?.description ?? "",
      parameters: tool?.input_schema ?? { type: "object", properties: {} }
    }
  }));
}

function buildCursorChatMessages(request) {
  const result = [];
  const systemText = normalizeSystem(request.system);

  if (systemText) {
    result.push({
      role: "system",
      content: systemText
    });
  }

  for (const message of request.messages ?? []) {
    const blocks = normalizeAnthropicBlocks(message?.content);

    if (message?.role === "user") {
      const textParts = [];

      for (const block of blocks) {
        if (block.type === "text" && block.text) {
          textParts.push(block.text);
          continue;
        }

        if (block.type === "tool_result") {
          const toolText = normalizeTextContent(block.content);
          result.push({
            role: "tool",
            tool_call_id: block.tool_use_id ?? block.id ?? `toolu_${randomUUID().replace(/-/g, "")}`,
            content: toolText
          });
        }
      }

      const text = textParts.join("\n").trim();
      if (text) {
        result.push({
          role: "user",
          content: text
        });
      }

      continue;
    }

    if (message?.role === "assistant") {
      const textParts = [];
      const toolCalls = [];

      for (const block of blocks) {
        if (block.type === "text" && block.text) {
          textParts.push(block.text);
          continue;
        }

        if (block.type === "tool_use") {
          toolCalls.push({
            id: block.id ?? `toolu_${randomUUID().replace(/-/g, "")}`,
            type: "function",
            function: {
              name: block.name ?? "tool",
              arguments: JSON.stringify(block.input ?? {})
            }
          });
        }
      }

      if (textParts.length > 0 || toolCalls.length > 0) {
        result.push({
          role: "assistant",
          content: textParts.join("\n"),
          ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {})
        });
      }
    }
  }

  return result;
}

function parseJsonLines(rawText) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
}

function parseSseEvents(rawText) {
  const events = [];
  const chunks = rawText.split(/\r?\n\r?\n/);

  for (const chunk of chunks) {
    const lines = chunk
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean);

    if (lines.length === 0) {
      continue;
    }

    let eventName = "message";
    const dataLines = [];

    for (const line of lines) {
      if (line.startsWith("event:")) {
        eventName = line.slice("event:".length).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trim());
      }
    }

    if (dataLines.length === 0) {
      continue;
    }

    const dataText = dataLines.join("\n");
    if (dataText === "[DONE]") {
      continue;
    }

    try {
      events.push({
        event: eventName,
        data: JSON.parse(dataText)
      });
    } catch {
      events.push({
        event: eventName,
        data: dataText
      });
    }
  }

  return events;
}

function parseJsonMaybe(value) {
  if (!value || typeof value !== "string") {
    return value ?? {};
  }

  try {
    return JSON.parse(value);
  } catch {
    return { raw: value };
  }
}

function buildAnthropicMessageFromResponses(request, parsed) {
  const completed = parsed.events.find((entry) => entry.data?.type === "response.completed")?.data?.response;
  const failed = parsed.events.find((entry) => entry.data?.type === "response.failed")?.data;

  if (failed?.error?.message) {
    throw new Error(failed.error.message);
  }

  const content = [];

  if (completed?.output && Array.isArray(completed.output)) {
    for (const outputItem of completed.output) {
      if (outputItem?.type === "message") {
        for (const block of outputItem.content ?? []) {
          if ((block?.type === "output_text" || block?.type === "text") && block.text) {
            content.push({ type: "text", text: block.text });
          }
        }
      }

      if (outputItem?.type === "function_call") {
        content.push({
          type: "tool_use",
          id: outputItem.call_id ?? `toolu_${randomUUID().replace(/-/g, "")}`,
          name: outputItem.name ?? "tool",
          input: parseJsonMaybe(outputItem.arguments)
        });
      }
    }
  }

  if (content.length === 0) {
    const textFromDeltas = parsed.events
      .filter((entry) => entry.data?.type === "response.output_text.delta")
      .map((entry) => entry.data.delta ?? "")
      .join("");

    content.push({
      type: "text",
      text: textFromDeltas
    });
  }

  return {
    id: `msg_${randomUUID().replace(/-/g, "")}`,
    type: "message",
    role: "assistant",
    model: request.model ?? config.models.defaultAnthropicModel,
    content,
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: completed?.usage?.input_tokens ?? approximateTokens(request.messages),
      output_tokens: completed?.usage?.output_tokens ?? approximateTokens(content)
    }
  };
}

function buildAnthropicMessageFromChatStream(request, parsed) {
  const content = [];
  const toolUses = new Map();
  let text = "";

  for (const entry of parsed.events) {
    if (entry?.text) {
      text += entry.text;
    }

    for (const node of entry?.nodes ?? []) {
      if (!node?.tool_use?.tool_use_id) {
        continue;
      }

      const existing = toolUses.get(node.tool_use.tool_use_id) ?? {
        type: "tool_use",
        id: node.tool_use.tool_use_id,
        name: node.tool_use.tool_name ?? "tool",
        input: {}
      };

      existing.name = node.tool_use.tool_name ?? existing.name;
      const partial = parseJsonMaybe(node.tool_use.input_json ?? "{}");
      if (partial && typeof partial === "object" && !Array.isArray(partial)) {
        existing.input = { ...existing.input, ...partial };
      }

      toolUses.set(existing.id, existing);
    }
  }

  if (text) {
    content.push({ type: "text", text });
  }

  content.push(...toolUses.values());

  if (content.length === 0) {
    throw new Error("Worker returned no assistant content.");
  }

  return {
    id: `msg_${randomUUID().replace(/-/g, "")}`,
    type: "message",
    role: "assistant",
    model: request.model ?? config.models.defaultAnthropicModel,
    content,
    stop_reason: toolUses.size > 0 ? "tool_use" : "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: approximateTokens(request.system) + approximateTokens(request.messages) + approximateTokens(request.tools),
      output_tokens: approximateTokens(content)
    }
  };
}

async function callWorkerResponses(requestBody) {
  const headers = getWorkerHeaders();
  const url = `${config.workerBaseUrl.replace(/\/$/, "")}${config.workerPath}`;

  log("worker request", {
    url,
    credentialMode: getAuthState().credentialMode,
    credentialSource: getAuthState().resolvedSource,
    model: requestBody.model
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody)
  });

  const rawText = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    text: rawText,
    events: config.workerProtocol === "responses" ? parseSseEvents(rawText) : parseJsonLines(rawText)
  };
}

async function callDirectUpstreamResponses(requestBody) {
  const headers = getDirectUpstreamHeaders();
  const url = `${config.upstreamBaseUrl.replace(/\/$/, "")}${config.upstreamPath}`;

  log("direct upstream request", {
    url,
    model: requestBody.model,
    xApiKey: headers["x-api-key"].slice(0, 24) + "..."
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(requestBody)
  });

  const rawText = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    text: rawText,
    events: parseSseEvents(rawText)
  };
}

async function callCursorWorkerBridge(request) {
  const workerToken = getCursorWorkerToken();
  if (!workerToken) {
    throw new Error(
      "No Cursor worker token was found. Refresh CursorPool in Cursor once or set auth.workerAuthToken in proxy.config.json."
    );
  }

  const helperPath = path.join(process.cwd(), "cursor-capi-bridge.cjs");
  const payload = {
    workerToken,
    model: mapModel(request.model),
    messages: buildCursorChatMessages(request),
    tools: buildCursorToolDefinitions(request.tools),
    toolChoice: "auto",
    conversationId: randomUUID()
  };

  const raw = execFileSync(process.execPath, [helperPath], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  }).trim();

  const parsed = raw ? JSON.parse(raw) : { ok: false, error: "Cursor bridge returned no output." };

  return {
    ok: Boolean(parsed.ok),
    status: parsed.ok ? 200 : 502,
    statusText: parsed.ok ? "OK" : "Bridge Error",
    text: parsed.error ?? "",
    result: parsed
  };
}

function mapHttpStatusToAnthropicType(status) {
  if (status === 400 || status === 409) {
    return "invalid_request_error";
  }

  if (status === 401) {
    return "authentication_error";
  }

  if (status === 403) {
    return "permission_error";
  }

  if (status === 404) {
    return "not_found_error";
  }

  if (status === 429) {
    return "rate_limit_error";
  }

  return "api_error";
}

function buildAnthropicMessageFromCursorBridge(request, upstream) {
  const result = upstream.result ?? {};
  const content = [];

  if (result.text) {
    content.push({
      type: "text",
      text: result.text
    });
  }

  for (const toolCall of result.tool_calls ?? []) {
    if (!toolCall?.name) {
      continue;
    }

    content.push({
      type: "tool_use",
      id: toolCall.id ?? `toolu_${randomUUID().replace(/-/g, "")}`,
      name: toolCall.name,
      input: parseJsonMaybe(toolCall.arguments ?? "{}")
    });
  }

  if (content.length === 0) {
    throw new Error("Cursor bridge returned no assistant content.");
  }

  return {
    id: `msg_${randomUUID().replace(/-/g, "")}`,
    type: "message",
    role: "assistant",
    model: request.model ?? config.models.defaultAnthropicModel,
    content,
    stop_reason: (result.tool_calls?.length ?? 0) > 0 ? "tool_use" : "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens:
        approximateTokens(request.system) +
        approximateTokens(request.messages) +
        approximateTokens(request.tools),
      output_tokens: approximateTokens(result.text ?? "") + approximateTokens(result.tool_calls ?? [])
    }
  };
}

function syntheticStream(res, message) {
  const baseMessage = {
    id: message.id,
    type: "message",
    role: "assistant",
    model: message.model,
    content: [],
    stop_reason: null,
    stop_sequence: null,
    usage: {
      input_tokens: message.usage.input_tokens,
      output_tokens: 0
    }
  };

  sseHeaders(res);
  writeSseEvent(res, "message_start", {
    type: "message_start",
    message: baseMessage
  });

  for (const [index, block] of message.content.entries()) {
    if (block.type === "text") {
      writeSseEvent(res, "content_block_start", {
        type: "content_block_start",
        index,
        content_block: {
          type: "text",
          text: ""
        }
      });
      writeSseEvent(res, "content_block_delta", {
        type: "content_block_delta",
        index,
        delta: {
          type: "text_delta",
          text: block.text
        }
      });
      writeSseEvent(res, "content_block_stop", {
        type: "content_block_stop",
        index
      });
      continue;
    }

    if (block.type === "tool_use") {
      writeSseEvent(res, "content_block_start", {
        type: "content_block_start",
        index,
        content_block: {
          type: "tool_use",
          id: block.id,
          name: block.name,
          input: {}
        }
      });
      writeSseEvent(res, "content_block_delta", {
        type: "content_block_delta",
        index,
        delta: {
          type: "input_json_delta",
          partial_json: JSON.stringify(block.input ?? {})
        }
      });
      writeSseEvent(res, "content_block_stop", {
        type: "content_block_stop",
        index
      });
    }
  }

  writeSseEvent(res, "message_delta", {
    type: "message_delta",
    delta: {
      stop_reason: message.stop_reason,
      stop_sequence: null
    },
    usage: {
      output_tokens: message.usage.output_tokens
    }
  });
  writeSseEvent(res, "message_stop", { type: "message_stop" });
  res.end();
}

async function handleMessages(req, res) {
  let requestBody;

  try {
    requestBody = await readJsonBody(req);
  } catch (error) {
    anthropicError(res, 400, "invalid_request_error", `Invalid JSON body: ${error.message}`);
    return;
  }

  const upstreamMode = String(config.upstreamMode || "worker").toLowerCase();
  const isDirectMode = upstreamMode === "direct";
  const isCursorWorkerMode = upstreamMode === "cursor_worker";
  const upstreamRequest =
    isCursorWorkerMode || isDirectMode || config.workerProtocol === "responses"
      ? buildResponsesRequest(requestBody)
      : buildChatStreamRequest(requestBody);
  let upstream;

  try {
    upstream = isCursorWorkerMode
      ? await callCursorWorkerBridge(requestBody)
      : isDirectMode
        ? await callDirectUpstreamResponses(upstreamRequest)
        : await callWorkerResponses(upstreamRequest);
  } catch (error) {
    anthropicError(res, 502, "api_error", error.message);
    return;
  }

  if (!upstream.ok) {
    anthropicError(
      res,
      upstream.status,
      mapHttpStatusToAnthropicType(upstream.status),
      upstream.text || `Worker request failed with ${upstream.status}`
    );
    return;
  }

  let anthropicMessage;
  try {
    anthropicMessage = isCursorWorkerMode
      ? buildAnthropicMessageFromCursorBridge(requestBody, upstream)
      : isDirectMode || config.workerProtocol === "responses"
        ? buildAnthropicMessageFromResponses(requestBody, upstream)
        : buildAnthropicMessageFromChatStream(requestBody, upstream);
  } catch (error) {
    anthropicError(res, 502, "api_error", error.message);
    return;
  }

  if (requestBody.stream) {
    syntheticStream(res, anthropicMessage);
    return;
  }

  json(res, 200, anthropicMessage);
}

async function handleCountTokens(req, res) {
  let requestBody;

  try {
    requestBody = await readJsonBody(req);
  } catch (error) {
    anthropicError(res, 400, "invalid_request_error", `Invalid JSON body: ${error.message}`);
    return;
  }

  const inputTokens =
    approximateTokens(requestBody.system) +
    approximateTokens(requestBody.messages) +
    approximateTokens(requestBody.tools);

  json(res, 200, {
    input_tokens: inputTokens
  });
}

function handleModels(res) {
  const ids = Array.from(new Set(Object.keys(config.models.aliases ?? {}))).sort();
  json(res, 200, {
    data: ids.map((id) => ({
      id,
      type: "model",
      display_name: id,
      created_at: "2026-04-15T00:00:00Z"
    }))
  });
}

function formatDate(timestamp) {
  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function handleHealth(res) {
  const authState = getAuthState();

  json(res, 200, {
    ok: true,
    config_path: CONFIG_PATH,
    worker_base_url: config.workerBaseUrl,
    worker_protocol: config.workerProtocol,
    worker_path: config.workerPath,
    upstream_mode: config.upstreamMode,
    default_model: config.models.defaultAnthropicModel,
    auth: {
      credential_mode: authState.credentialMode,
      credential_detected: Boolean(authState.resolvedCredential),
      credential_source: authState.resolvedSource,
      token_detected: Boolean(authState.cursorState?.workerAuthToken || authState.localAuth?.codexCursorToken),
      login_key_detected: Boolean(authState.resolvedLoginKey),
      source_key: authState.cursorState?.sourceKey ?? null,
      account_detected: Boolean(authState.cursorState?.account),
      codex_activator_detected: Boolean(authState.localAuth?.codexActivator),
      vip_product: authState.cursorState?.vipProduct ?? null,
      vip_expires_at: formatDate(authState.cursorState?.vipExpiresAt),
      captured_upstream_auth_detected: Boolean(
        config.auth.directBearerToken || authState.capturedUpstream?.authorization
      ),
      captured_upstream_auth_path: authState.capturedUpstream?.filePath ?? null,
      captured_upstream_auth_at: authState.capturedUpstream?.capturedAt ?? null
    }
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `127.0.0.1:${config.port}`}`);
  const pathname = url.pathname;

  log(req.method, pathname, {
    authorization: req.headers.authorization ? req.headers.authorization.slice(0, 24) + "..." : null,
    apiKey: req.headers["x-api-key"] ? String(req.headers["x-api-key"]).slice(0, 24) + "..." : null,
    host: req.headers.host,
    userAgent: req.headers["user-agent"]
  });

  if (req.method === "GET" && pathname === "/health") {
    handleHealth(res);
    return;
  }

  if (req.method === "GET" && pathname === "/v1/models") {
    handleModels(res);
    return;
  }

  if (req.method === "POST" && pathname === "/v1/messages") {
    await handleMessages(req, res);
    return;
  }

  if (req.method === "POST" && pathname === "/v1/messages/count_tokens") {
    await handleCountTokens(req, res);
    return;
  }

  anthropicError(res, 404, "not_found_error", `No route for ${req.method} ${pathname}`);
});

server.listen(config.port, "127.0.0.1", () => {
  const authState = getAuthState();
  console.log(
    `Claude worker proxy listening on http://127.0.0.1:${config.port} -> ${config.workerBaseUrl}${config.workerPath}`
  );
  console.log(`Config: ${CONFIG_PATH}`);
  console.log(
    `Worker credential: ${authState.resolvedSource ?? "missing"} (${authState.credentialMode})`
  );
  console.log(`Default model: ${config.models.defaultAnthropicModel}`);
  console.log(`Node: ${process.version} on ${os.platform()}`);
  console.log(`Debug: ${config.debug ? "on" : "off"}`);
});
