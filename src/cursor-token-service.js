/**
 * Cursor Token API - Public Service
 *
 * API service giống OpenAI/Claude để cung cấp Cursor access tokens
 * Người dùng cần API key để sử dụng
 */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIG
// ============================================================================

const CONFIG = {
    port: 8080,

    // Database file lưu API keys
    apiKeysFile: path.join(__dirname, 'api-keys.json'),

    // Cursor database path
    cursorDbPath: 'C:\\Users\\GHC\\AppData\\Roaming\\Cursor\\User\\globalStorage\\state.vscdb',

    // Rate limiting
    rateLimit: {
        maxRequests: 100,  // 100 requests
        windowMs: 3600000  // per hour
    }
};

// ============================================================================
// API KEYS MANAGEMENT
// ============================================================================

class ApiKeyManager {
    constructor() {
        this.keys = this.loadKeys();
        this.usage = new Map(); // Track usage per key
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
        const key = 'ck_' + crypto.randomBytes(32).toString('hex');
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

        // Update stats
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

    listKeys() {
        return Object.entries(this.keys).map(([key, data]) => ({
            key: key.substring(0, 20) + '...',
            name: data.name,
            created: data.created,
            requests: data.requests,
            lastUsed: data.lastUsed
        }));
    }
}

const apiKeyManager = new ApiKeyManager();

// ============================================================================
// TOKEN EXTRACTION
// ============================================================================

function extractAccessToken() {
    try {
        const data = fs.readFileSync(CONFIG.cursorDbPath);
        const content = data.toString('utf8', 0, data.length);
        const pattern = /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g;
        const tokens = content.match(pattern);

        if (tokens && tokens.length > 0) {
            const token = tokens[0];
            const parts = token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());

            return {
                access_token: token,
                token_type: 'Bearer',
                expires_at: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
                user: payload.sub || null,
                scope: payload.scope || null
            };
        }

        return null;
    } catch (e) {
        throw new Error('Failed to extract token: ' + e.message);
    }
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

    // Helper functions
    const sendJSON = (statusCode, data) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data, null, 2));
    };

    const sendError = (statusCode, message) => {
        sendJSON(statusCode, { error: { message, code: statusCode } });
    };

    // Authentication middleware
    const authenticate = () => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            sendError(401, 'Missing or invalid Authorization header');
            return null;
        }

        const apiKey = authHeader.substring(7);
        if (!apiKeyManager.validateKey(apiKey)) {
            sendError(401, 'Invalid API key');
            return null;
        }

        if (!apiKeyManager.checkRateLimit(apiKey)) {
            sendError(429, 'Rate limit exceeded. Try again later.');
            return null;
        }

        return apiKey;
    };

    // ========================================================================
    // PUBLIC ENDPOINTS (No auth required)
    // ========================================================================

    // GET / - API documentation
    if (url.pathname === '/' && req.method === 'GET') {
        sendJSON(200, {
            name: 'Cursor Token API',
            version: '1.0.0',
            description: 'API service to get Cursor access tokens',
            endpoints: {
                'POST /v1/keys': 'Generate new API key (admin)',
                'GET /v1/keys': 'List all API keys (admin)',
                'GET /v1/token': 'Get Cursor access token (requires API key)',
                'GET /v1/health': 'Health check'
            },
            documentation: 'https://github.com/your-repo/cursor-token-api'
        });
        return;
    }

    // GET /v1/health
    if (url.pathname === '/v1/health' && req.method === 'GET') {
        sendJSON(200, {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
        return;
    }

    // ========================================================================
    // ADMIN ENDPOINTS (No auth for demo, add auth in production)
    // ========================================================================

    // POST /v1/keys - Generate new API key
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

    // GET /v1/keys - List API keys
    if (url.pathname === '/v1/keys' && req.method === 'GET') {
        sendJSON(200, {
            keys: apiKeyManager.listKeys(),
            total: Object.keys(apiKeyManager.keys).length
        });
        return;
    }

    // ========================================================================
    // PROTECTED ENDPOINTS (Require API key)
    // ========================================================================

    // GET /v1/token - Get access token
    if (url.pathname === '/v1/token' && req.method === 'GET') {
        const apiKey = authenticate();
        if (!apiKey) return;

        try {
            const tokenData = extractAccessToken();
            if (tokenData) {
                sendJSON(200, tokenData);
            } else {
                sendError(404, 'No access token found in Cursor database');
            }
        } catch (e) {
            sendError(500, e.message);
        }
        return;
    }

    // GET /v1/me - Get API key stats
    if (url.pathname === '/v1/me' && req.method === 'GET') {
        const apiKey = authenticate();
        if (!apiKey) return;

        const stats = apiKeyManager.getStats(apiKey);
        sendJSON(200, {
            name: stats.name,
            created: stats.created,
            requests: stats.requests,
            lastUsed: stats.lastUsed
        });
        return;
    }

    // 404
    sendError(404, 'Endpoint not found');
});

// ============================================================================
// START SERVER
// ============================================================================

server.listen(CONFIG.port, () => {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║         Cursor Token API - Public Service           ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    console.log(`🚀 Server running at: http://localhost:${CONFIG.port}`);
    console.log(`📁 API Keys file: ${CONFIG.apiKeysFile}`);
    console.log(`📊 Rate limit: ${CONFIG.rateLimit.maxRequests} requests/hour\n`);

    // Generate first API key if none exist
    if (Object.keys(apiKeyManager.keys).length === 0) {
        const firstKey = apiKeyManager.generateKey('Default Key');
        console.log('🔑 First API key generated:');
        console.log(`   ${firstKey}`);
        console.log('   Save this key! It will not be shown again.\n');
    }

    console.log('📌 Endpoints:');
    console.log('   GET  /              - API documentation');
    console.log('   GET  /v1/health     - Health check');
    console.log('   POST /v1/keys       - Generate new API key');
    console.log('   GET  /v1/keys       - List all API keys');
    console.log('   GET  /v1/token      - Get access token (requires API key)');
    console.log('   GET  /v1/me         - Get API key stats\n');

    console.log('📖 Usage example:');
    console.log('   curl -H "Authorization: Bearer YOUR_API_KEY" \\');
    console.log(`        http://localhost:${CONFIG.port}/v1/token\n`);

    console.log('⏳ Ready to serve requests...\n');
});
