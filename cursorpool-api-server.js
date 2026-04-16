/**
 * CursorPool API Proxy Server
 *
 * Tự động đọc token từ ~/.codex_cursor
 * Proxy tất cả request đến ecodex.micosoft.icu
 * Compatible với OpenAI API format
 */

const express = require('express');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');

const app = express();
const PORT = 3000;

// ─── Tự động đọc token ────────────────────────────────────────────────────────
function readToken() {
    const tokenFile = path.join(os.homedir(), '.codex_cursor');
    try {
        const content = fs.readFileSync(tokenFile, 'utf8').trim();
        const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
        return {
            token: lines[0] || null,
            url: lines[1] || 'https://ecodex.micosoft.icu'
        };
    } catch (e) {
        return { token: null, url: 'https://ecodex.micosoft.icu' };
    }
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// ─── Helper: proxy request đến ecodex ────────────────────────────────────────
function proxyToEcodex(path, method, body, res) {
    const { token, url } = readToken();
    const host = url.replace('https://', '').split('/')[0];

    if (!token) {
        return res.status(500).json({ error: 'Token not found in ~/.codex_cursor' });
    }

    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

    const options = {
        hostname: host,
        port: 443,
        path: path,
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'Content-Length': Buffer.byteLength(bodyStr)
        }
    };

    const upstream = https.request(options, (upstream_res) => {
        res.status(upstream_res.statusCode);
        // Forward headers
        Object.entries(upstream_res.headers).forEach(([k, v]) => {
            if (!['transfer-encoding', 'connection'].includes(k)) {
                res.setHeader(k, v);
            }
        });

        // Stream response (support SSE / streaming)
        upstream_res.pipe(res);
    });

    upstream.on('error', (e) => {
        console.error('Upstream error:', e.message);
        if (!res.headersSent) {
            res.status(502).json({ error: e.message });
        }
    });

    upstream.write(bodyStr);
    upstream.end();
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check + token info
app.get('/health', (req, res) => {
    const { token, url } = readToken();
    res.json({
        status: 'ok',
        token: token ? token.substring(0, 20) + '...' : null,
        upstream: url,
        endpoints: [
            'POST /v1/chat/completions',
            'POST /chat/completions',
            'GET  /v1/models',
        ]
    });
});

// Models (trả về danh sách model cứng)
app.get('/v1/models', (req, res) => {
    res.json({
        object: 'list',
        data: [
            { id: 'claude-3-5-sonnet-20241022', object: 'model', created: 1, owned_by: 'anthropic' },
            { id: 'claude-3-opus-20240229', object: 'model', created: 1, owned_by: 'anthropic' },
            { id: 'claude-3-haiku-20240307', object: 'model', created: 1, owned_by: 'anthropic' },
            { id: 'gpt-4o', object: 'model', created: 1, owned_by: 'openai' },
            { id: 'gpt-4-turbo', object: 'model', created: 1, owned_by: 'openai' },
        ]
    });
});

// Chat Completions - route chính, proxy đến /chat/completions
app.post('/v1/chat/completions', (req, res) => {
    proxyToEcodex('/chat/completions', 'POST', req.body, res);
});

app.post('/chat/completions', (req, res) => {
    proxyToEcodex('/chat/completions', 'POST', req.body, res);
});

// Messages (Anthropic format)
app.post('/v1/messages', (req, res) => {
    proxyToEcodex('/v1/messages', 'POST', req.body, res);
});

app.use((req, res) => {
    proxyToEcodex(req.path, req.method, req.body || {}, res);
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    const { token, url } = readToken();
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║      CursorPool API Proxy - ACTIVE                  ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    console.log(`🚀 Proxy Server : http://localhost:${PORT}`);
    console.log(`🎯 Upstream     : ${url}`);
    console.log(`🔑 Token        : ${token ? token.substring(0, 25) + '...' : '❌ NOT FOUND'}\n`);
    console.log('📌 Sử dụng trong app của bạn:');
    console.log(`   Base URL : http://localhost:${PORT}`);
    console.log(`   API Key  : ${token || 'any-key'}\n`);
    console.log('📋 Endpoints:');
    console.log('   GET  /health              → Status + token info');
    console.log('   GET  /v1/models           → Danh sách models');
    console.log('   POST /v1/chat/completions → Chat (proxy → ecodex)');
    console.log('   POST /v1/messages         → Anthropic format\n');
    console.log('⏳ Đang chờ request...\n');
});
