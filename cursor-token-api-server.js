/**
 * Cursor Access Token API
 *
 * Lấy access token từ Cursor database và cung cấp API để sử dụng
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const STATE_DB_PATH = 'C:\\Users\\GHC\\AppData\\Roaming\\Cursor\\User\\globalStorage\\state.vscdb';

// Lấy access token từ Cursor database
function getAccessToken() {
    try {
        const data = fs.readFileSync(STATE_DB_PATH);
        const content = data.toString('utf8', 0, data.length);

        // Tìm JWT token
        const jwtPattern = /eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g;
        const tokens = content.match(jwtPattern);

        if (tokens && tokens.length > 0) {
            const token = tokens[0];

            // Decode để kiểm tra expiration
            const parts = token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());

            const expDate = new Date(payload.exp * 1000);
            const now = new Date();
            const isExpired = expDate < now;

            return {
                token: token,
                payload: payload,
                expired: isExpired,
                expiration: expDate.toISOString()
            };
        }

        return null;
    } catch (e) {
        return { error: e.message };
    }
}

// Lấy Machine ID
function getMachineId() {
    try {
        const data = fs.readFileSync(STATE_DB_PATH);
        const content = data.toString('utf8', 0, data.length);

        // Tìm machine ID pattern
        const machineIdPattern = /machineId["\s:]+([a-f0-9]{32,})/gi;
        const matches = content.match(machineIdPattern);

        if (matches && matches.length > 0) {
            const cleaned = matches[0].replace(/["\s:machineId]/gi, '');
            return cleaned;
        }

        return null;
    } catch (e) {
        return null;
    }
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

    // GET /access-token - Lấy access token
    if (url.pathname === '/access-token' && req.method === 'GET') {
        const tokenInfo = getAccessToken();

        if (tokenInfo && !tokenInfo.error) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                access_token: tokenInfo.token,
                expired: tokenInfo.expired,
                expiration: tokenInfo.expiration,
                payload: tokenInfo.payload
            }, null, 2));
        } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: tokenInfo?.error || 'Token not found'
            }));
        }
        return;
    }

    // GET /machine-id - Lấy machine ID
    if (url.pathname === '/machine-id' && req.method === 'GET') {
        const machineId = getMachineId();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: !!machineId,
            machine_id: machineId
        }));
        return;
    }

    // GET /cursor-auth - Lấy cả access token và machine ID
    if (url.pathname === '/cursor-auth' && req.method === 'GET') {
        const tokenInfo = getAccessToken();
        const machineId = getMachineId();

        if (tokenInfo && !tokenInfo.error) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                access_token: tokenInfo.token,
                machine_id: machineId,
                expired: tokenInfo.expired,
                expiration: tokenInfo.expiration,
                user: tokenInfo.payload.sub
            }, null, 2));
        } else {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: tokenInfo?.error || 'Token not found'
            }));
        }
        return;
    }

    // GET /status
    if (url.pathname === '/status' && req.method === 'GET') {
        const tokenInfo = getAccessToken();
        const machineId = getMachineId();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            has_access_token: !!(tokenInfo && !tokenInfo.error),
            has_machine_id: !!machineId,
            token_expired: tokenInfo?.expired || null,
            database_path: STATE_DB_PATH
        }));
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
});

const PORT = 3002;
server.listen(PORT, () => {
    const tokenInfo = getAccessToken();
    const machineId = getMachineId();

    console.log('\n╔══════════════════════════════════════════════════════╗');
    console.log('║   Cursor Access Token API Server                    ║');
    console.log('╚══════════════════════════════════════════════════════╝\n');
    console.log(`🚀 Server        : http://localhost:${PORT}`);
    console.log(`📁 Database      : ${STATE_DB_PATH}`);
    console.log(`🔑 Access Token  : ${tokenInfo && !tokenInfo.error ? '✅ Found' : '❌ Not found'}`);
    console.log(`💻 Machine ID    : ${machineId ? '✅ Found' : '❌ Not found'}`);

    if (tokenInfo && !tokenInfo.error) {
        console.log(`⏰ Token Expires : ${tokenInfo.expiration}`);
        console.log(`📊 Token Status  : ${tokenInfo.expired ? '❌ EXPIRED' : '✅ VALID'}`);
    }

    console.log(`\n📌 Endpoints:`);
    console.log(`   GET /status       - Kiểm tra trạng thái`);
    console.log(`   GET /access-token - Lấy access token`);
    console.log(`   GET /machine-id   - Lấy machine ID`);
    console.log(`   GET /cursor-auth  - Lấy cả access token và machine ID`);
    console.log(`\n⏳ Đang chờ request...\n`);
});
