const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const crypto = require("node:crypto");

function readStdin() {
  return fs.readFileSync(0, "utf8");
}

function writeJson(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function parseJsonMaybe(text, fallback = {}) {
  if (!text) {
    return fallback;
  }

  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function suppressConsole() {
  const original = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  };

  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
  console.info = () => {};

  return () => {
    console.log = original.log;
    console.error = original.error;
    console.warn = original.warn;
    console.info = original.info;
  };
}

function loadWorkerInternals() {
  const workerPath = path.join(process.env.TEMP || "", "api-worker");
  if (!workerPath || !fs.existsSync(workerPath)) {
    throw new Error(`Worker runtime not found at ${workerPath}`);
  }

  const source = fs.readFileSync(workerPath, "utf8");
  const probe = `
;module.exports = {
  Zoe: typeof Zoe === 'function' ? Zoe : null,
  Ma: typeof Ma === 'function' ? Ma : null,
  td: typeof td === 'function' ? td : null
};
`;

  const restoreConsole = suppressConsole();
  try {
    const mod = new Module(workerPath, module);
    mod.filename = workerPath;
    mod.paths = Module._nodeModulePaths(path.dirname(workerPath));
    mod._compile(source + probe, workerPath);
    return mod.exports;
  } finally {
    restoreConsole();
  }
}

function selectProvider(providers, requestedModel) {
  if (!Array.isArray(providers) || providers.length === 0) {
    throw new Error("Cursor bridge returned no providers.");
  }

  const preferred = providers.find((provider) => provider?.options?.model === requestedModel);
  return preferred ? [preferred, ...providers.filter((provider) => provider !== preferred)] : providers;
}

function aggregateToolCall(toolCalls, chunk) {
  const hasName = Boolean(chunk.func_name);
  const hasArgs = Boolean(chunk.func_args);
  if (!hasName && !hasArgs) {
    return;
  }

  let current = toolCalls.at(-1);
  if (!current || (hasName && current.name && current.arguments)) {
    current = {
      id: `toolu_${crypto.randomUUID().replace(/-/g, "")}`,
      name: "",
      arguments: ""
    };
    toolCalls.push(current);
  }

  if (hasName) {
    current.name += chunk.func_name;
  }

  if (hasArgs) {
    current.arguments += chunk.func_args;
  }
}

async function main() {
  const input = parseJsonMaybe(readStdin(), null);
  if (!input || typeof input !== "object") {
    throw new Error("Bridge input must be a JSON object.");
  }

  if (!input.workerToken) {
    throw new Error("Bridge input is missing workerToken.");
  }

  const { Zoe, Ma, td } = loadWorkerInternals();
  if (typeof Zoe !== "function" || typeof Ma !== "function" || typeof td !== "function") {
    throw new Error("Failed to load required worker internals.");
  }

  const providerHeaders = {
    accept: "text/event-stream",
    conversation_id: input.conversationId || crypto.randomUUID(),
    "user-agent":
      input.userAgent || "codex_cli_rs/0.63.0 (Mac OS 26.1.0; arm64) iTerm.app/3.6.5"
  };

  const restoreConsole = suppressConsole();
  try {
    const providers = selectProvider(await Zoe(`cursor|${input.workerToken}`, providerHeaders), input.model);
    const aggregate = new td();
    aggregate.retry = Math.max(1, Number(input.retries) || 1);

    for (const provider of providers) {
      provider.options.timeout = Math.max(
        1,
        Number(input.timeoutMs) || 10000
      );
      aggregate.add(new Ma(provider.options));
    }

    const request = new Request("http://127.0.0.1/openai/responses", {
      method: "POST",
      headers: {
        accept: "text/event-stream",
        "content-type": "application/json"
      }
    });

    const body = {
      model: input.model,
      messages: Array.isArray(input.messages) ? input.messages : [],
      stream: true
    };

    if (Array.isArray(input.tools) && input.tools.length > 0) {
      body.tools = input.tools;
      body.tool_choice = input.toolChoice || "auto";
    }

    const result = {
      ok: true,
      provider_model: input.model,
      text: "",
      reasoning: "",
      tool_calls: []
    };

    await aggregate.chat({
      request,
      body,
      onMessage(chunk) {
        if (chunk?.text) {
          result.text += chunk.text;
        }

        if (chunk?.reasoning) {
          result.reasoning += chunk.reasoning;
        }

        aggregateToolCall(result.tool_calls, chunk ?? {});
      },
      async onEnd() {
        return null;
      }
    });

    writeJson(result);
  } finally {
    restoreConsole();
  }
}

main().catch((error) => {
  writeJson({
    ok: false,
    error: error?.message || String(error)
  });
});
