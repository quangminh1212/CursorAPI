# Cursor Token API - Public Service

API service để cung cấp Cursor access tokens cho người dùng, giống như OpenAI API hoặc Claude API.

## 🚀 Khởi động

```bash
node cursor-token-service.js
```

Server sẽ chạy tại: `http://localhost:8080`

## 🔑 API Key

Khi khởi động lần đầu, server tự động tạo API key mặc định:

```
ck_17693cbe0c40c33065c7948d328fe41fbc4f1843d4c9fe65c9d1a549481a4a13
```

**Lưu key này!** Nó sẽ không hiển thị lại.

## 📖 API Endpoints

### 1. GET / - API Documentation
```bash
curl http://localhost:8080/
```

### 2. GET /v1/health - Health Check
```bash
curl http://localhost:8080/v1/health
```

### 3. POST /v1/keys - Tạo API Key mới
```bash
curl -X POST http://localhost:8080/v1/keys \
  -H "Content-Type: application/json" \
  -d '{"name": "My App"}'
```

Response:
```json
{
  "api_key": "ck_xxx...",
  "name": "My App",
  "created": "2026-04-16T15:53:15.603Z",
  "message": "Save this key securely. It will not be shown again."
}
```

### 4. GET /v1/keys - Liệt kê API Keys
```bash
curl http://localhost:8080/v1/keys
```

### 5. GET /v1/token - Lấy Access Token (Cần API Key)
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:8080/v1/token
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_at": "2026-06-14T23:28:16.000Z",
  "user": "github|user_01J6HZTSF0WDXNV48MAAKFJPWA",
  "scope": "openid profile email offline_access"
}
```

### 6. GET /v1/me - Thống kê API Key
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     http://localhost:8080/v1/me
```

## 🔒 Authentication

Tất cả protected endpoints cần header:
```
Authorization: Bearer YOUR_API_KEY
```

## 📊 Rate Limiting

- **Limit**: 100 requests/hour per API key
- **Response khi vượt limit**: HTTP 429

## 💻 Sử dụng trong Code

### JavaScript/Node.js
```javascript
const API_KEY = 'ck_xxx...';
const API_URL = 'http://localhost:8080';

async function getCursorToken() {
    const response = await fetch(`${API_URL}/v1/token`, {
        headers: {
            'Authorization': `Bearer ${API_KEY}`
        }
    });
    
    const data = await response.json();
    return data.access_token;
}

// Sử dụng
const token = await getCursorToken();
console.log('Access Token:', token);
```

### Python
```python
import requests

API_KEY = 'ck_xxx...'
API_URL = 'http://localhost:8080'

def get_cursor_token():
    response = requests.get(
        f'{API_URL}/v1/token',
        headers={'Authorization': f'Bearer {API_KEY}'}
    )
    return response.json()['access_token']

# Sử dụng
token = get_cursor_token()
print(f'Access Token: {token}')
```

### cURL
```bash
# Lưu API key vào biến
export CURSOR_API_KEY="ck_xxx..."

# Lấy token
curl -H "Authorization: Bearer $CURSOR_API_KEY" \
     http://localhost:8080/v1/token
```

## 🌐 Deploy lên Server

### 1. Deploy lên VPS/Cloud

```bash
# Cài đặt PM2
npm install -g pm2

# Chạy service
pm2 start cursor-token-service.js --name cursor-api

# Auto start on reboot
pm2 startup
pm2 save
```

### 2. Expose ra Internet

**Dùng ngrok (nhanh nhất):**
```bash
# Cài ngrok
# Download từ https://ngrok.com/

# Expose port 8080
ngrok http 8080
```

Bạn sẽ nhận được URL public: `https://xxx.ngrok.io`

**Dùng Cloudflare Tunnel:**
```bash
# Cài cloudflared
# Download từ https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# Tạo tunnel
cloudflared tunnel --url http://localhost:8080
```

### 3. Sử dụng từ xa

```bash
# Thay localhost bằng domain public
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://your-domain.com/v1/token
```

## 🔐 Bảo mật

### Production Checklist

1. **Thêm HTTPS**: Dùng reverse proxy (nginx/caddy)
2. **Admin authentication**: Bảo vệ endpoints `/v1/keys`
3. **IP whitelist**: Giới hạn IP được phép
4. **Logging**: Log tất cả requests
5. **Monitoring**: Theo dõi usage và errors

### Ví dụ với nginx

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📈 Monitoring

### Xem logs
```bash
pm2 logs cursor-api
```

### Xem stats
```bash
# Tổng số API keys
curl http://localhost:8080/v1/keys | jq '.total'

# Stats của key
curl -H "Authorization: Bearer YOUR_KEY" \
     http://localhost:8080/v1/me
```

## 🎯 Use Cases

### 1. Chia sẻ cho team
- Tạo API key cho mỗi thành viên
- Theo dõi usage per user
- Revoke key khi cần

### 2. Tích hợp vào app
- App của bạn gọi API này
- Lấy Cursor token tự động
- Không cần share token trực tiếp

### 3. Automation
- Script tự động lấy token
- Refresh token khi hết hạn
- Tích hợp vào CI/CD

## ⚠️ Lưu ý

1. **Token từ Cursor database**: Service này lấy token từ Cursor database local, nên:
   - Phải chạy trên máy có Cursor
   - Token là của tài khoản Cursor đang đăng nhập
   - Token hết hạn: 2026-06-14

2. **Rate limiting**: 100 requests/hour/key
   - Đủ cho hầu hết use cases
   - Có thể tăng trong code nếu cần

3. **Security**: 
   - API keys lưu trong `api-keys.json`
   - Không encrypt (thêm encryption nếu cần)
   - Không có admin password (thêm nếu cần)

## 🆘 Troubleshooting

### Lỗi: "No access token found"
- Kiểm tra Cursor đã đăng nhập chưa
- Kiểm tra path database đúng chưa

### Lỗi: "Rate limit exceeded"
- Đợi 1 giờ hoặc tạo API key mới
- Tăng limit trong code

### Lỗi: "Invalid API key"
- Kiểm tra key có trong `api-keys.json`
- Tạo key mới nếu cần

---

**Port**: 8080
**API Version**: 1.0.0
**Compatible**: OpenAI API format
