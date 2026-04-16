/**
 * CursorPool API Emulator
 *
 * Mô phỏng chính xác cách extension CursorPool hoạt động:
 * 1. Đọc token từ ~/.codex_cursor
 * 2. Set environment variables như Cursor
 * 3. Gọi API giống hệt Cursor gọi
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ─── Đọc token giống Cursor ──────────────────────────────────────────────────
function loadCursorToken() {
    const tokenFile = path.join(os.homedir(), '.codex_cursor');
    try {
        const content = fs.readFileSync(tokenFile, 'utf8');
        const lines = content.split('\n').map(x => x.trim()).filter(x => x);

        // Giống code trong cursor-always-local/dist/main.js
        process.env.CODEX_TOKEN = lines[0];
        if (lines[1]) process.env.CODEX_URL = lines[1];

        return {
            token: lines[0],
            url: lines[1] || 'https://ecodex.micosoft.icu'
        };
    } catch (e) {
        console.error('❌ Cannot read ~/.codex_cursor:', e.message);
        return null;
    }
}

// ─── Gọi API giống Cursor ────────────────────────────────────────────────────
function callCursorAPI(messages, model, onChunk, onComplete) {
    const config = loadCursorToken();
    if (!config) {
        onComplete({ error: 'No token found' });
        return;
    }

    const hostname = config.url.replace('https://', '').replace('http://', '');

    // Payload giống Cursor gửi
    const payload = JSON.stringify({
        model: model || 'gpt-5-mini',
        messages: messages,
        stream: true, // Cursor luôn dùng stream
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
            'User-Agent': 'Cursor/0.42.3', // Giả làm Cursor
        }
    };

    const req = https.request(options, (res) => {
        let buffer = '';

        res.on('data', (chunk) => {
            buffer += chunk.toString();

            // Parse SSE chunks
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Giữ lại dòng chưa hoàn chỉnh

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.substring(6);
                    if (data === '[DONE]') continue;

                    try {
                        const json = JSON.parse(data);
                        const content = json.choices?.[0]?.delta?.content || '';
                        if (content) {
                            onChunk(content);
                        }
                    } catch (e) {}
                }
            }
        });

        res.on('end', () => {
            onComplete({ success: true });
        });
    });

    req.on('error', (e) => {
        onComplete({ error: e.message });
    });

    req.write(payload);
    req.end();
}

// ─── HTTP Server giống OpenAI API ────────────────────────────────────────────
const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': '*',
            'Access-Control-Allow-Headers': '*',
        });
        res.end();
        return;
    }

    if (req.url === '/health') {
        const config = loadCursorToken();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            token: config?.token?.substring(0, 20) + '...',
            url: config?.url,
        }));
        return;
    }

    if (req.url === '/v1/models') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            object: 'list',
            data: [
                { id: 'gpt-5-mini', object: 'model', owned_by: 'cursor' },
                { id: 'gpt-4o', object: 'model', owned_by: 'cursor' },
                { id: 'claude-3-5-sonnet-20241022', object: 'model', owned_by: 'cursor' },
            ]
        }));
        return;
    }

    if (req.url === '/v1/chat/completions' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const isStream = data.stream !== false;

                if (isStream) {
                    // Streaming response
                    res.writeHead(200, {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'Access-Control-Allow-Origin': '*',
                    });

                    callCursorAPI(
                        data.messages,
                        data.model,
                        (content) => {
                            const chunk = {
                                id: 'chatcmpl-' + Date.now(),
                                object: 'chat.completion.chunk',
                                created: Math.floor(Date.now() / 1000),
                                model: data.model || 'gpt-5-mini',
                                choices: [{
                                    index: 0,
                                    delta: { content: content },
                                    finish_reason: null
                                }]
                            };
                            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
                        },
                        (result) => {
                            if (result.error) {
                                res.write(`data: {"error": "${result.error}"}\n\n`);
                            }
                            res.write('data: [DONE]\n\n');
                            res.end();
                        }
                    );
                } else {
                    // Non-streaming response
                    let fullContent = '';
                    callCursorAPI(
                        data.messages,
                        data.model,
                        (content) => { fullContent += content; },
                        (result) => {
                            res.writeHead(200, {
                                'Content-Type': 'application/json',
                                'Access-Control-Allow-Origin': '*',
                            });
                            res.end(JSON.stringify({
                                id: 'chatcmpl-' + Date.now(),
                                object: 'chat.completion',
                                created: Math.floor(Date.now() / 1000),
                                model: data.model || 'gpt-5-mini',
                                choices: [{
                                    index: 0,
                                    message: {
                                        role: 'assistant',
                                        content: fullContent || result.error || '激活码未开通copilot'
                                    },
                                    finish_reason: 'stop'
                                }],
                                usage: {
                                    prompt_tokens: 0,
                                    completion_tokens: 0,
                                    total_tokens: 0
                                }
                            }));
                        }
                    );
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

const PORT = 3000;
server.listen(PORT, () => {
    const config = loadCursorToken();
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║   CursorPool API Emulator - CURSOR MODE             ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    console.log(`🚀 Server      : http://localhost:${PORT}`);
    console.log(`🔑 Token       : ${config?.token?.substring(0, 30)}...`);
    console.log(`🎯 Upstream    : ${config?.url}`);
    console.log(`\n📌 Hoạt động GIỐNG HỆT Cursor gọi API:`);
    console.log(`   - Đọc token từ ~/.codex_cursor`);
    console.log(`   - Set CODEX_TOKEN và CODEX_URL`);
    console.log(`   - Gọi API với header giống Cursor`);
    console.log(`   - Stream response như Cursor\n`);
    console.log(`⏳ Đang chờ request...\n`);
});
