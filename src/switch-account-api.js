/**
 * Switch Account API Server
 *
 * HƯỚNG DẪN:
 * 1. Dùng Chrome DevTools hoặc Fiddler để tìm endpoint thật
 * 2. Điền thông tin vào phần CONFIG bên dưới
 * 3. Chạy: node switch-account-api.js
 * 4. Test: curl -X POST http://localhost:3004/switch
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

// ============================================================================
// CONFIG - ĐIỀN THÔNG TIN SAU KHI TÌM ĐƯỢC ENDPOINT
// ============================================================================

const CONFIG = {
    // Activation key
    activationKey: 'FFFCAE24-82BB-4489-9515-0F623CCB1E2C',

    // API endpoint (TÌM ĐƯỢC TỪ NETWORK MONITOR)
    api: {
        hostname: 'dapi.micosoft.icu',  // <-- Thay đổi nếu khác
        path: '/api/UNKNOWN',            // <-- ĐIỀN ENDPOINT THẬT Ở ĐÂY
        method: 'POST',
        port: 443
    },

    // Headers (THÊM HEADERS NẾU CẦN)
    headers: {
        'Content-Type': 'application/json',
        // 'X-Custom-Header': 'value',  // <-- Thêm nếu cần
    },

    // Request body fields (ĐIỀU CHỈNH NẾU CẦN)
    requestFields: {
        activationCode: true,  // Gửi activationCode
        // Thêm fields khác nếu cần:
        // userId: 'xxx',
        // timestamp: () => Date.now(),
    },

    // Response parsing (ĐIỀU CHỈNH NẾU CẦN)
    parseResponse: (json) => {
        // Tìm token trong response
        return json.token || json.data?.token || json.account?.token || null;
    },

    // Token file
    tokenFile: path.join(os.homedir(), '.codex_cursor'),
    tokenUrl: 'https://ecodex.micosoft.icu'
};

// ============================================================================
// CORE LOGIC - KHÔNG CẦN SỬA
// ============================================================================

function getCurrentToken() {
    try {
        const content = fs.readFileSync(CONFIG.tokenFile, 'utf8');
        const lines = content.split('\n').map(x => x.trim()).filter(x => x);
        return lines[0] || null;
    } catch (e) {
        return null;
    }
}

function updateToken(newToken) {
    const content = `${newToken}\n${CONFIG.tokenUrl}`;
    fs.writeFileSync(CONFIG.tokenFile, content, 'utf8');
}

function switchAccount() {
    return new Promise((resolve, reject) => {
        // Build request body
        const body = {};
        for (const [key, value] of Object.entries(CONFIG.requestFields)) {
            if (value === true) {
                body[key] = CONFIG.activationKey;
            } else if (typeof value === 'function') {
                body[key] = value();
            } else {
                body[key] = value;
            }
        }

        const payload = JSON.stringify(body);

        const options = {
            hostname: CONFIG.api.hostname,
            port: CONFIG.api.port,
            path: CONFIG.api.path,
            method: CONFIG.api.method,
            headers: {
                ...CONFIG.headers,
                'Authorization': `Bearer ${CONFIG.activationKey}`,
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        console.log('📤 Request:', options.method, options.hostname + options.path);
        console.log('📦 Payload:', payload);

        const req = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', c => responseBody += c);
            res.on('end', () => {
                console.log('📥 Response Status:', res.statusCode);
                console.log('📥 Response Body:', responseBody.substring(0, 200));

                if (res.statusCode === 200) {
                    try {
                        const json = JSON.parse(responseBody);
                        const newToken = CONFIG.parseResponse(json);

                        if (newToken) {
                            const oldToken = getCurrentToken();
                            updateToken(newToken);

                            resolve({
                                success: true,
                                old_token: oldToken ? oldToken.substring(0, 30) + '...' : null,
                                new_token: newToken.substring(0, 30) + '...',
                                full_response: json
                            });
                        } else {
                            reject(new Error('Token not found in response'));
                        }
                    } catch (e) {
                        reject(new Error('Failed to parse response: ' + e.message));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
                }
            });
        });

        req.on('error', (e) => {
            reject(new Error('Request failed: ' + e.message));
        });

        req.write(payload);
        req.end();
    });
}

// ============================================================================
// HTTP API SERVER
// ============================================================================

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // GET /status
    if (req.url === '/status' && req.method === 'GET') {
        const currentToken = getCurrentToken();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            endpoint_configured: CONFIG.api.path !== '/api/UNKNOWN',
            current_token: currentToken ? currentToken.substring(0, 30) + '...' : null,
            activation_key: CONFIG.activationKey
        }));
        return;
    }

    // POST /switch
    if (req.url === '/switch' && req.method === 'POST') {
        if (CONFIG.api.path === '/api/UNKNOWN') {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'Endpoint chưa được cấu hình. Xem HUONG-DAN-TIM-ENDPOINT.md'
            }));
            return;
        }

        console.log('\n🔄 Đang đổi account...\n');

        switchAccount()
            .then(result => {
                console.log('✅ Đổi account thành công!\n');
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result, null, 2));
            })
            .catch(err => {
                console.error('❌ Lỗi:', err.message, '\n');
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: err.message
                }));
            });
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

// ============================================================================
// START SERVER
// ============================================================================

const PORT = 3004;
server.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║        Switch Account API Server                    ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    console.log(`🚀 Server         : http://localhost:${PORT}`);
    console.log(`🔑 Activation Key : ${CONFIG.activationKey}`);
    console.log(`📍 Endpoint       : ${CONFIG.api.hostname}${CONFIG.api.path}`);

    if (CONFIG.api.path === '/api/UNKNOWN') {
        console.log(`\n⚠️  CẢNH BÁO: Endpoint chưa được cấu hình!`);
        console.log(`   Xem file: HUONG-DAN-TIM-ENDPOINT.md`);
        console.log(`   Cần monitor network traffic để tìm endpoint thật.`);
    } else {
        console.log(`\n✅ Endpoint đã được cấu hình`);
    }

    console.log(`\n📌 Endpoints:`);
    console.log(`   GET  /status - Kiểm tra trạng thái`);
    console.log(`   POST /switch - Đổi account`);
    console.log(`\n⏳ Đang chờ request...\n`);
});
