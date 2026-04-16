/**
 * Claude API Adapter for CursorPool
 *
 * Chuyển đổi API worker của CursorPool thành Claude API format
 * Compatible với Anthropic Claude API v1
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// ============================================================================
// CONFIG
// ============================================================================

const CONFIG = {
    port: 8000,

    // API Keys storage
    apiKeysFile: path.join(__dirname, 'claude-api-keys.json'),

    // Cursor token file
    tokenFile: path.join(os.homedir(), '.codex_cursor'),

    // Cursor database for access token
    cursorDbPath: path.join(os.homedir(), 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),

    // Upstream API
    upstreamUrl: 'https://ecodex.micosoft.icu',

    // Rate limiting
    rateLimit: {
        maxRequests: 1000,
        windowMs: 3600000  // 1 hour
    }
};

// ============================================================================
// API KEY MANAGER
// ============================================================================

class ApiKeyManager {
    constructor() {
        this.keys = this.loadKeys();
        this.usage = new Map();
    }

    loadKeys() {
        try {
            if (fs.existsSync(CONFIG.apiKeysFile)) {
                return JSON.parse(fs.readFileSync(CONFIG.apiKeysFile, 'utf8'));
            }
        } catch (e) {}
        return {};
    }

    saveKeys() {
        fs.writeFileSync(CONFIG.apiKeysFile, JSON.stringify(this.keys, null, 2));
    }

    generateKey(name) {
        const key = 'sk-ant-' + crypto.randomBytes(32).toString('hex');
        this.keys[key] = {
            name: name,
            created: new Date().toISOString(),
            requests: 0,
            lastUsed: null
        };
        this.saveKeys();
        return key;
    }

    validateKey(key) {
        return this.keys[key] !== undefined;
    }

    checkRateLimit(key) {
        const now = Date.now();
        const usage = this.usage.get(key) || { count: 0, resetAt: now + CONFIG.rateLimit.windowMs };

        if (now > usage.resetAt) {
            usage.count = 0;
            usage.resetAt = now + CONFIG.rateLimit.windowMs;
        }

        if (usage.count >= CONFIG.rateLimit.maxRequests) {
            return false;
        }

        usage.count++;
        this.usage.set(key, usage);

        if (this.keys[key]) {
            this.keys[key].requests++;
            this.keys[key].lastUsed = new Date().toISOString();
            this.saveKeys();
        }

        return true;
    }

    getStats(key) {
        return this.keys[key];
    }
}

const apiKeyManager = new ApiKeyManager();

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

function loadCursorToken() {
    try {
        const content = fs.readFileSync(CONFIG.tokenFile, 'utf8');
        const lines = content.split('\n').map(x => x.trim()).filter(x => x);
        return {
            token: lines[0],
            url: lines[1] || CONFIG.upstreamUrl
        };
    } catch (e) {
        return null;
    }
}

function extractAccessToken() {
    try {
        const data = fs.readFileSync(CONFIG.cursorDbPath);
        const content = data.toString('utf8', 0, data.length);
        const pattern = /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g;
        const tokens = content.match(pattern);

        if (tokens && tokens.length > 0) {
            return tokens[0];
        }
        return null;
    } catch (e) {
        return null;
    }
}

// ============================================================================
// MODEL MAPPING
// ============================================================================

const MODEL_MAPPING = {
    // Claude models -> Cursor models
    'claude-3-5-sonnet-20241022': 'claude-3-5-sonnet-20241022',
    'claude-3-5-sonnet-latest': 'claude-3-5-sonnet-20241022',
    'claude-3-opus-20240229': 'gpt-4o',
    'claude-3-sonnet-20240229': 'gpt-4o',
    'claude-3-haiku-20240307': 'gpt-5-mini',
    'claude-2.1': 'gpt-4o',
    'claude-2.0': 'gpt-4o',
    'claude-instant-1.2': 'gpt-5-mini',

    // Default
    'default': 'claude-3-5-sonnet-20241022'
};

function mapModel(claudeModel) {
    return MODEL_MAPPING[claudeModel] || MODEL_MAPPING['default'];
}

// ============================================================================
// MESSAGE CONVERSION
// ============================================================================

function convertClaudeToOpenAI(claudeMessages) {
    // Claude format: [{ role: 'user', content: 'text' }]
    // OpenAI format: same
    return claudeMessages.map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content :
                 Array.isArray(msg.content) ? msg.content.map(c => c.text || c).join('\n') :
                 String(msg.content)
    }));
}

function convertOpenAIToClaude(openaiResponse, model) {
    // Convert OpenAI streaming response to Claude format
    return {
        id: openaiResponse.id || 'msg_' + Date.now(),
        type: 'message',
        role: 'assistant',
        content: openaiResponse.choices?.[0]?.delta?.content ||
                 openaiResponse.choices?.[0]?.message?.content || '',
        model: model,
        stop_reason: openaiResponse.choices?.[0]?.finish_reason === 'stop' ? 'end_turn' : null,
        usage: openaiResponse.usage ? {
            input_tokens: openaiResponse.usage.prompt_tokens || 0,
            output_tokens: openaiResponse.usage.completion_tokens || 0
        } : null
    };
}

// ============================================================================
// UPSTREAM API CALL
// ============================================================================

function callUpstreamAPI(messages, model, stream, onChunk, onComplete) {
    const config = loadCursorToken();
    if (!config) {
        onComplete({ error: 'No token configured' });
        return;
    }

    const hostname = config.url.replace('https://', '').replace('http://', '');
    const cursorModel = mapModel(model);

    const payload = JSON.stringify({
        model: cursorModel,
        messages: convertClaudeToOpenAI(messages),
        stream: stream,
        max_tokens: 4096,
        temperature: 0.7,
    });

    const options = {
        hostname: hostname,
        port: 443,
        path: '/chat/completions',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.token}`,
            'Content-Length': Buffer.byteLength(payload),
            'User-Agent': 'Claude-API-Adapter/1.0',
        }
    };

    const req = https.request(options, (res) => {
        let buffer = '';

        res.on('data', (chunk) => {
            if (stream) {
                buffer += chunk.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') continue;

                        try {
                            const json = JSON.parse(data);
                            const claudeFormat = convertOpenAIToClaude(json, model);
                            onChunk(claudeFormat);
                        } catch (e) {}
                    }
                }
            } else {
                buffer += chunk.toString();
            }
        });

        res.on('end', () => {
            if (!stream) {
                try {
                    const json = JSON.parse(buffer);
                    const claudeFormat = convertOpenAIToClaude(json, model);
                    onComplete({ success: true, data: claudeFormat });
                } catch (e) {
                    onComplete({ error: buffer || 'Unknown error' });
                }
            } else {
                onComplete({ success: true });
            }
        });
    });

    req.on('error', (e) => {
        onComplete({ error: e.message });
    });

    req.write(payload);
    req.end();
}

// ============================================================================
// HTTP SERVER
// ============================================================================

const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    const sendJSON = (statusCode, data) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data, null, 2));
    };

    const sendError = (statusCode, message, type = 'api_error') => {
        sendJSON(statusCode, {
            type: 'error',
            error: {
                type: type,
                message: message
            }
        });
    };

    const authenticate = () => {
        const authHeader = req.headers['x-api-key'] || req.headers['authorization'];
        if (!authHeader) {
            sendError(401, 'Missing API key', 'authentication_error');
            return null;
        }

        const apiKey = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

        if (!apiKeyManager.validateKey(apiKey)) {
            sendError(401, 'Invalid API key', 'authentication_error');
            return null;
        }

        if (!apiKeyManager.checkRateLimit(apiKey)) {
            sendError(429, 'Rate limit exceeded', 'rate_limit_error');
            return null;
        }

        return apiKey;
    };

    // ========================================================================
    // CLAUDE API ENDPOINTS
    // ========================================================================

    // GET /v1/models - List available models
    if (url.pathname === '/v1/models' && req.method === 'GET') {
        sendJSON(200, {
            data: [
                { id: 'claude-3-5-sonnet-20241022', type: 'model', display_name: 'Claude 3.5 Sonnet' },
                { id: 'claude-3-opus-20240229', type: 'model', display_name: 'Claude 3 Opus' },
                { id: 'claude-3-sonnet-20240229', type: 'model', display_name: 'Claude 3 Sonnet' },
                { id: 'claude-3-haiku-20240307', type: 'model', display_name: 'Claude 3 Haiku' },
            ]
        });
        return;
    }

    // POST /v1/messages - Create message (Claude API format)
    if (url.pathname === '/v1/messages' && req.method === 'POST') {
        const apiKey = authenticate();
        if (!apiKey) return;

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const model = data.model || 'claude-3-5-sonnet-20241022';
                const messages = data.messages || [];
                const stream = data.stream || false;

                if (stream) {
                    // Streaming response
                    res.writeHead(200, {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                    });

                    callUpstreamAPI(
                        messages,
                        model,
                        true,
                        (claudeChunk) => {
                            if (claudeChunk.content) {
                                res.write(`event: content_block_delta\n`);
                                res.write(`data: ${JSON.stringify({
                                    type: 'content_block_delta',
                                    index: 0,
                                    delta: { type: 'text_delta', text: claudeChunk.content }
                                })}\n\n`);
                            }
                        },
                        (result) => {
                            if (result.error) {
                                res.write(`event: error\n`);
                                res.write(`data: ${JSON.stringify({ type: 'error', error: { message: result.error } })}\n\n`);
                            } else {
                                res.write(`event: message_stop\n`);
                                res.write(`data: ${JSON.stringify({ type: 'message_stop' })}\n\n`);
                            }
                            res.end();
                        }
                    );
                } else {
                    // Non-streaming response
                    callUpstreamAPI(
                        messages,
                        model,
                        false,
                        null,
                        (result) => {
                            if (result.error) {
                                sendError(500, result.error);
                            } else {
                                sendJSON(200, result.data);
                            }
                        }
                    );
                }
            } catch (e) {
                sendError(400, 'Invalid request body', 'invalid_request_error');
            }
        });
        return;
    }

    // POST /v1/complete - Legacy completions endpoint
    if (url.pathname === '/v1/complete' && req.method === 'POST') {
        const apiKey = authenticate();
        if (!apiKey) return;

        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const prompt = data.prompt || '';
                const model = data.model || 'claude-3-5-sonnet-20241022';

                // Convert prompt to messages format
                const messages = [{ role: 'user', content: prompt }];

                callUpstreamAPI(
                    messages,
                    model,
                    false,
                    null,
                    (result) => {
                        if (result.error) {
                            sendError(500, result.error);
                        } else {
                            sendJSON(200, {
                                completion: result.data.content,
                                stop_reason: result.data.stop_reason,
                                model: model
                            });
                        }
                    }
                );
            } catch (e) {
                sendError(400, 'Invalid request body', 'invalid_request_error');
            }
        });
        return;
    }

    // ========================================================================
    // ADMIN ENDPOINTS
    // ========================================================================

    // POST /v1/keys - Generate API key
    if (url.pathname === '/v1/keys' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const name = data.name || 'Unnamed';
                const key = apiKeyManager.generateKey(name);

                sendJSON(201, {
                    api_key: key,
                    name: name,
                    created: new Date().toISOString(),
                    message: 'Save this key securely. It will not be shown again.'
                });
            } catch (e) {
                sendError(400, 'Invalid request body');
            }
        });
        return;
    }

    // GET /health - Health check
    if (url.pathname === '/health' && req.method === 'GET') {
        const config = loadCursorToken();
        sendJSON(200, {
            status: 'ok',
            token_configured: !!config,
            timestamp: new Date().toISOString()
        });
        return;
    }

    // GET / - Documentation
    if (url.pathname === '/' && req.method === 'GET') {
        sendJSON(200, {
            name: 'Claude API Adapter for CursorPool',
            version: '1.0.0',
            description: 'Converts CursorPool API to Claude API format',
            endpoints: {
                'POST /v1/messages': 'Create message (Claude format)',
                'POST /v1/complete': 'Legacy completions',
                'GET /v1/models': 'List models',
                'POST /v1/keys': 'Generate API key',
                'GET /health': 'Health check'
            },
            authentication: 'Use x-api-key header or Authorization: Bearer <key>'
        });
        return;
    }

    sendError(404, 'Endpoint not found', 'not_found_error');
});

// ============================================================================
// START SERVER
// ============================================================================

server.listen(CONFIG.port, () => {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║     Claude API Adapter for CursorPool               ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    console.log(`🚀 Server: http://localhost:${CONFIG.port}`);
    console.log(`📁 Keys file: ${CONFIG.apiKeysFile}`);

    const config = loadCursorToken();
    console.log(`🔑 Token: ${config ? config.token.substring(0, 30) + '...' : 'NOT CONFIGURED'}`);
    console.log(`🎯 Upstream: ${config ? config.url : 'N/A'}\n`);

    // Generate first API key if none exist
    if (Object.keys(apiKeyManager.keys).length === 0) {
        const firstKey = apiKeyManager.generateKey('Default Key');
        console.log('🔑 First API key generated:');
        console.log(`   ${firstKey}`);
        console.log('   Save this key!\n');
    }

    console.log('📌 Claude API Compatible Endpoints:');
    console.log('   POST /v1/messages    - Create message');
    console.log('   POST /v1/complete    - Legacy completions');
    console.log('   GET  /v1/models      - List models');
    console.log('   POST /v1/keys        - Generate API key');
    console.log('   GET  /health         - Health check\n');

    console.log('📖 Usage example:');
    console.log('   curl -X POST http://localhost:8000/v1/messages \\');
    console.log('     -H "x-api-key: YOUR_API_KEY" \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log('     -d \'{"model":"claude-3-5-sonnet-20241022","messages":[{"role":"user","content":"Hello"}]}\'\n');

    console.log('⏳ Ready to serve requests...\n');
});
