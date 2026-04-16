/**
 * VIP Pool API Server
 *
 * Mô phỏng chức năng "đổi account" của CursorPool extension
 * Vì không tìm được endpoint API chính xác, ta sẽ tạo API để:
 * 1. Đọc token hiện tại từ ~/.codex_cursor
 * 2. Cho phép cập nhật token mới (giả lập việc "đổi account")
 * 3. Kiểm tra trạng thái VIP
 */

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TOKEN_FILE = path.join(os.homedir(), '.codex_cursor');
const ACTIVATION_KEY = 'FFFCAE24-82BB-4489-9515-0F623CCB1E2C';

// Đọc token hiện tại
function getCurrentToken() {
    try {
        const content = fs.readFileSync(TOKEN_FILE, 'utf8');
        const lines = content.split('\n').map(x => x.trim()).filter(x => x);
        return {
            token: lines[0] || null,
            url: lines[1] || 'https://ecodex.micosoft.icu'
        };
    } catch (e) {
        return { token: null, url: 'https://ecodex.micosoft.icu' };
    }
}

// Cập nhật token mới
function updateToken(newToken, url) {
    const content = `${newToken}\n${url || 'https://ecodex.micosoft.icu'}`;
    fs.writeFileSync(TOKEN_FILE, content, 'utf8');
    return true;
}

// HTTP Server
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

    // GET /status - Kiểm tra trạng thái
    if (url.pathname === '/status' && req.method === 'GET') {
        const current = getCurrentToken();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            activation_key: ACTIVATION_KEY,
            current_token: current.token ? current.token.substring(0, 30) + '...' : null,
            current_url: current.url,
            vip_status: 'active',
            features: ['account_switching', 'vip_pool'],
            note: 'VIP Pool chỉ hỗ trợ đổi account, không bao gồm copilot chat API'
        }));
        return;
    }

    // GET /token - Lấy token hiện tại
    if (url.pathname === '/token' && req.method === 'GET') {
        const current = getCurrentToken();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            token: current.token,
            url: current.url,
            file: TOKEN_FILE
        }));
        return;
    }

    // POST /token - Cập nhật token mới (giả lập "đổi account")
    if (url.pathname === '/token' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const data = JSON.parse(body);

                if (!data.token) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Token is required' }));
                    return;
                }

                updateToken(data.token, data.url);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'Token updated successfully',
                    token: data.token.substring(0, 30) + '...',
                    url: data.url || 'https://ecodex.micosoft.icu'
                }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });
        return;
    }

    // POST /switch - Giả lập "đổi account" (tạo token mới ngẫu nhiên)
    if (url.pathname === '/switch' && req.method === 'POST') {
        // Trong thực tế, extension sẽ gọi API của CursorPool để lấy account mới
        // Ở đây ta chỉ giả lập bằng cách tạo token giả
        const fakeUserId = Math.floor(Math.random() * 900000) + 100000;
        const fakeHash = Array.from({length: 32}, () =>
            Math.floor(Math.random() * 16).toString(16)
        ).join('');
        const newToken = `user:${fakeUserId}/${fakeHash}`;

        updateToken(newToken, 'https://ecodex.micosoft.icu');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            message: 'Account switched (simulated)',
            new_token: newToken.substring(0, 30) + '...',
            note: 'This is a simulated token. Real extension calls CursorPool API to get actual account.'
        }));
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║   VIP Pool API Server (Account Switching)           ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    console.log(`🚀 Server      : http://localhost:${PORT}`);
    console.log(`🔑 Activation  : ${ACTIVATION_KEY}`);
    console.log(`📁 Token File  : ${TOKEN_FILE}`);
    console.log(`\n📌 Endpoints:`);
    console.log(`   GET  /status  - Kiểm tra trạng thái VIP`);
    console.log(`   GET  /token   - Lấy token hiện tại`);
    console.log(`   POST /token   - Cập nhật token mới`);
    console.log(`   POST /switch  - Đổi account (simulated)`);
    console.log(`\n⚠️  Lưu ý:`);
    console.log(`   - VIP Pool chỉ hỗ trợ đổi account Cursor`);
    console.log(`   - KHÔNG bao gồm copilot chat API`);
    console.log(`   - Endpoint /switch chỉ là simulation`);
    console.log(`   - Extension thực tế gọi API riêng của CursorPool\n`);
});
