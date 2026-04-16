/**
 * CursorPool Account Switching API
 *
 * Sử dụng access token từ Cursor để đổi account qua CursorPool
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_DB_PATH = 'C:\\Users\\GHC\\AppData\\Roaming\\Cursor\\User\\globalStorage\\state.vscdb';
const TOKEN_FILE = path.join(os.homedir(), '.codex_cursor');
const ACTIVATION_KEY = 'FFFCAE24-82BB-4489-9515-0F623CCB1E2C';

// Lấy access token từ Cursor
function getAccessToken() {
    try {
        const data = fs.readFileSync(STATE_DB_PATH);
        const content = data.toString('utf8', 0, data.length);
        const jwtPattern = /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g;
        const tokens = content.match(jwtPattern);
        return tokens && tokens.length > 0 ? tokens[0] : null;
    } catch (e) {
        return null;
    }
}

// Lấy token hiện tại từ ~/.codex_cursor
function getCurrentToken() {
    try {
        const content = fs.readFileSync(TOKEN_FILE, 'utf8');
        const lines = content.split('\n').map(x => x.trim()).filter(x => x);
        return lines[0] || null;
    } catch (e) {
        return null;
    }
}

// Cập nhật token mới
function updateToken(newToken) {
    const content = `${newToken}\nhttps://ecodex.micosoft.icu`;
    fs.writeFileSync(TOKEN_FILE, content, 'utf8');
}

// Gọi CursorPool API để đổi account (thử nhiều endpoint)
function switchAccount(accessToken, activationKey) {
    return new Promise((resolve) => {
        // Thử endpoint có thể có
        const endpoints = [
            '/api/switch',
            '/api/account/switch',
            '/switch',
            '/gainNew',
            '/api/gainNew',
        ];

        let currentIndex = 0;

        function tryNext() {
            if (currentIndex >= endpoints.length) {
                resolve({
                    success: false,
                    error: 'No working endpoint found',
                    note: 'Extension code is obfuscated, cannot find real endpoint'
                });
                return;
            }

            const endpoint = endpoints[currentIndex++];
            const payload = JSON.stringify({
                activationCode: activationKey,
                accessToken: accessToken,
            });

            const options = {
                hostname: 'dapi.micosoft.icu',
                port: 443,
                path: endpoint,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Length': Buffer.byteLength(payload)
                }
            };

            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const json = JSON.parse(body);
                            if (json.token || json.data?.token) {
                                resolve({
                                    success: true,
                                    endpoint: endpoint,
                                    data: json
                                });
                                return;
                            }
                        } catch (e) {}
                    }
                    tryNext();
                });
            });

            req.on('error', () => tryNext());
            req.write(payload);
            req.end();
        }

        tryNext();
    });
}

// HTTP Server
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);

    // GET /status
    if (url.pathname === '/status' && req.method === 'GET') {
        const accessToken = getAccessToken();
        const currentToken = getCurrentToken();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            has_access_token: !!accessToken,
            has_current_token: !!currentToken,
            activation_key: ACTIVATION_KEY,
            current_token: currentToken ? currentToken.substring(0, 30) + '...' : null
        }));
        return;
    }

    // POST /switch - Đổi account
    if (url.pathname === '/switch' && req.method === 'POST') {
        const accessToken = getAccessToken();

        if (!accessToken) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Access token not found in Cursor database'
            }));
            return;
        }

        switchAccount(accessToken, ACTIVATION_KEY).then(result => {
            if (result.success) {
                // Cập nhật token mới
                const newToken = result.data.token || result.data.data?.token;
                updateToken(newToken);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'Account switched successfully',
                    new_token: newToken.substring(0, 30) + '...',
                    endpoint: result.endpoint
                }));
            } else {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: result.error,
                    note: result.note,
                    fallback: 'Using simulation mode'
                }));
            }
        });
        return;
    }

    // POST /switch-simulate - Giả lập đổi account
    if (url.pathname === '/switch-simulate' && req.method === 'POST') {
        const fakeUserId = Math.floor(Math.random() * 900000) + 100000;
        const fakeHash = Array.from({length: 32}, () =>
            Math.floor(Math.random() * 16).toString(16)
        ).join('');
        const newToken = `user:${fakeUserId}/${fakeHash}`;

        updateToken(newToken);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            message: 'Account switched (simulated)',
            new_token: newToken.substring(0, 30) + '...',
            note: 'This is a simulated token for testing'
        }));
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

const PORT = 3003;
server.listen(PORT, () => {
    const accessToken = getAccessToken();
    const currentToken = getCurrentToken();

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║   CursorPool Account Switching API                  ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    console.log(`🚀 Server         : http://localhost:${PORT}`);
    console.log(`🔑 Activation Key : ${ACTIVATION_KEY}`);
    console.log(`🎫 Access Token   : ${accessToken ? '✅ Found' : '❌ Not found'}`);
    console.log(`📝 Current Token  : ${currentToken ? currentToken.substring(0, 30) + '...' : 'None'}`);
    console.log(`\n📌 Endpoints:`);
    console.log(`   GET  /status          - Kiểm tra trạng thái`);
    console.log(`   POST /switch          - Đổi account (thử gọi API thật)`);
    console.log(`   POST /switch-simulate - Đổi account (simulation)`);
    console.log(`\n⚠️  Lưu ý:`);
    console.log(`   - Endpoint /switch sẽ thử gọi API thật của CursorPool`);
    console.log(`   - Nếu không tìm được endpoint, sẽ báo lỗi`);
    console.log(`   - Dùng /switch-simulate để test`);
    console.log(`\n⏳ Đang chờ request...\n`);
});
