# HƯỚNG DẪN TÌM ENDPOINT ĐỔI ACCOUNT

## 🎯 Mục tiêu
Tìm endpoint API thật mà CursorPool extension sử dụng để đổi account.

## 📋 Chuẩn bị

### Cài đặt tools
1. **Fiddler** (Windows) - https://www.telerik.com/fiddler
   - Hoặc **Wireshark** - https://www.wireshark.org/
   - Hoặc **mitmproxy** - https://mitmproxy.org/

2. **Chrome DevTools** (đơn giản nhất)

## 🔍 Phương pháp 1: Chrome DevTools (Dễ nhất)

### Bước 1: Mở DevTools trong Cursor
```bash
# Trong Cursor, nhấn:
Ctrl + Shift + I (Windows)
# hoặc
Cmd + Option + I (Mac)
```

### Bước 2: Vào tab Network
1. Click tab "Network"
2. Check "Preserve log"
3. Filter: chọn "Fetch/XHR"

### Bước 3: Trigger đổi account
1. Mở CursorPool extension (click icon trên sidebar)
2. Click nút "换号" (đổi account)
3. Quan sát tab Network

### Bước 4: Tìm request
Tìm request đến:
- `dapi.micosoft.icu`
- `ecodex.micosoft.icu`
- Hoặc domain khác

### Bước 5: Copy request
1. Right-click vào request
2. Copy > Copy as cURL
3. Hoặc xem Headers, Payload

## 🔍 Phương pháp 2: Fiddler (Chi tiết hơn)

### Bước 1: Cài đặt Fiddler
1. Download và cài đặt Fiddler
2. Chạy Fiddler
3. Tools > Options > HTTPS
4. Check "Decrypt HTTPS traffic"

### Bước 2: Cấu hình Cursor
Cursor sẽ tự động dùng proxy của Fiddler

### Bước 3: Trigger đổi account
1. Mở CursorPool extension
2. Click "换号"
3. Xem Fiddler capture request

### Bước 4: Phân tích request
Tìm request có:
- Method: POST
- Host: dapi.micosoft.icu hoặc tương tự
- Body chứa: activationCode

## 📝 Thông tin cần lấy

Khi tìm được request, ghi lại:

```
URL: https://dapi.micosoft.icu/api/xxx/xxx
Method: POST
Headers:
  - Authorization: Bearer xxx
  - Content-Type: application/json
  - X-Custom-Header: xxx (nếu có)

Body:
{
  "activationCode": "FFFCAE24-82BB-4489-9515-0F623CCB1E2C",
  "xxx": "xxx"
}

Response:
{
  "token": "user:xxxxx/xxxxx",
  "xxx": "xxx"
}
```

## 🔧 Sau khi tìm được endpoint

### Tạo file: `switch-account-api.js`

```javascript
const https = require('https');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ACTIVATION_KEY = 'FFFCAE24-82BB-4489-9515-0F623CCB1E2C';
const TOKEN_FILE = path.join(os.homedir(), '.codex_cursor');

// THAY ĐỔI THEO ENDPOINT TÌM ĐƯỢC
const API_CONFIG = {
    hostname: 'dapi.micosoft.icu',
    path: '/api/xxx/xxx',  // <-- Thay endpoint thật
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        // Thêm headers khác nếu cần
    }
};

function switchAccount() {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify({
            activationCode: ACTIVATION_KEY,
            // Thêm fields khác nếu cần
        });

        const options = {
            ...API_CONFIG,
            headers: {
                ...API_CONFIG.headers,
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
                        const newToken = json.token; // Hoặc json.data.token
                        
                        // Cập nhật token
                        fs.writeFileSync(TOKEN_FILE, 
                            `${newToken}\nhttps://ecodex.micosoft.icu`, 
                            'utf8'
                        );
                        
                        resolve({ success: true, token: newToken });
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${body}`));
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

// HTTP API Server
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    if (req.url === '/switch' && req.method === 'POST') {
        switchAccount()
            .then(result => {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            })
            .catch(err => {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message }));
            });
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

server.listen(3004, () => {
    console.log('🚀 Switch Account API: http://localhost:3004');
    console.log('📌 POST /switch - Đổi account');
});
```

### Sử dụng API

```bash
# Chạy server
node switch-account-api.js

# Đổi account
curl -X POST http://localhost:3004/switch
```

## 🎯 Tích hợp vào cursor.bat

Sau khi có endpoint, thêm vào cursor.bat:

```batch
@echo off
echo.
echo 1. Hiển thị access token
echo 2. Đổi account mới
echo.
set /p choice="Chọn (1/2): "

if "%choice%"=="1" goto show_token
if "%choice%"=="2" goto switch_account

:show_token
REM Code hiện tại
goto end

:switch_account
echo Đang đổi account...
curl -X POST http://localhost:3004/switch
goto end

:end
pause
```

## ⚠️ Lưu ý

1. **Phải tìm được endpoint thật** - không có endpoint thì không làm được
2. **Có thể cần thêm authentication** - token, signature, etc.
3. **Rate limit** - CursorPool có thể giới hạn số lần đổi/ngày
4. **VIP expiration** - Activation key hết hạn 2026-05-14

## 📞 Liên hệ CursorPool

Nếu không tìm được endpoint, liên hệ:
- GitHub: https://github.com/keg1255/windsurf-pool
- Hỏi về API documentation
- Request API access

---

**Kết luận:** Cần monitor network traffic để tìm endpoint thật, sau đó mới có thể tạo API.
