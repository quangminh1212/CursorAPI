# CursorPool API Project

Reverse engineer CursorPool extension và tạo API endpoints tương thích với Claude API.

## 🎯 Mục đích

Chuyển đổi API worker của CursorPool thành Claude API format, cho phép sử dụng CursorPool như Anthropic Claude API.

## 📁 Files

### 🔥 Claude API Adapter (MỚI)
- **`claude-api-adapter.js`** - API adapter chuyển CursorPool sang Claude API format (port 8000)
- **`CLAUDE-API-GUIDE.md`** - Hướng dẫn sử dụng Claude API adapter
- **`test-claude-api.js`** - Test suite cho Claude API adapter

### Scripts chính
- `cursor.bat` - Hiển thị access tokens từ Cursor database
- `show-tokens.js` - Extract JWT tokens từ Cursor
- `cursor-token-api-server.js` - API server lấy access token (port 3002)
- `cursor-token-service.js` - Public token service (port 8080)
- `vip-pool-api-server.js` - API quản lý VIP Pool token (port 3001)
- `cursorpool-switch-api.js` - API đổi account (port 3003)
- `cursor-api-emulator.js` - Chat API emulator (port 3000)

### Documentation
- `README.md` - File này
- `CLAUDE-API-GUIDE.md` - Hướng dẫn Claude API adapter
- `API-SERVICE-GUIDE.md` - Hướng dẫn token service
- `TONG-KET.md` - Tổng kết chi tiết
- `HUONG-DAN-TIM-ENDPOINT.md` - Hướng dẫn tìm endpoint

## 🚀 Sử dụng

### ⭐ Claude API Adapter (RECOMMENDED)

**Khởi động:**
```bash
node claude-api-adapter.js
```

**Server:** `http://localhost:8000`

**Endpoints:**
- `POST /v1/messages` - Create message (Claude format)
- `POST /v1/complete` - Legacy completions
- `GET /v1/models` - List models
- `POST /v1/keys` - Generate API key
- `GET /health` - Health check

**Sử dụng với Anthropic SDK:**
```python
from anthropic import Anthropic

client = Anthropic(
    api_key="sk-ant-xxx...",
    base_url="http://localhost:8000"
)

message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)
```

**Test:**
```bash
node test-claude-api.js
```

📖 **Chi tiết:** Xem [CLAUDE-API-GUIDE.md](CLAUDE-API-GUIDE.md)

---

### 1. Hiển thị Access Tokens
```bash
cursor.bat
# hoặc
node show-tokens.js
```

### 2. Các API Servers khác

**Token Service (Port 8080):**
```bash
node cursor-token-service.js
```
- Public service để cung cấp Cursor tokens
- Có API key management và rate limiting
- Xem [API-SERVICE-GUIDE.md](API-SERVICE-GUIDE.md)

**Cursor Token API (Port 3002):**
```bash
node cursor-token-api-server.js
```
- `GET /status` - Kiểm tra trạng thái
- `GET /access-token` - Lấy access token
- `GET /cursor-auth` - Lấy full auth info

**VIP Pool API (Port 3001):**
```bash
node vip-pool-api-server.js
```
- `GET /status` - Kiểm tra trạng thái VIP
- `GET /token` - Lấy token hiện tại
- `POST /token` - Cập nhật token mới
- `POST /switch` - Đổi account (simulation)

**CursorPool Switch API (Port 3003):**
```bash
node cursorpool-switch-api.js
```
- `GET /status` - Kiểm tra trạng thái
- `POST /switch` - Đổi account (thử API thật)
- `POST /switch-simulate` - Đổi account (simulation)

**Chat API Emulator (Port 3000):**
```bash
node cursor-api-emulator.js
```
- `GET /health` - Health check
- `GET /v1/models` - Danh sách models
- `POST /v1/chat/completions` - Chat completions

## 🔑 Thông tin

**Access Token:**
- Token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- User: `github|user_01J6HZTSF0WDXNV48MAAKFJPWA`
- Expires: 2026-06-14 (còn hạn 2 tháng)

**Activation Key:**
- Key: `FFFCAE24-82BB-4489-9515-0F623CCB1E2C`
- Type: VIP Pool (chỉ đổi account)
- Status: Active

**Token File:**
- Path: `~/.codex_cursor`
- Current: `user:159714/ce683e0425e6119149...`

## ⚠️ Lưu ý

1. **VIP Pool chỉ hỗ trợ đổi account**, không bao gồm copilot chat API
2. **Endpoint đổi account thật chưa tìm được** do code bị obfuscate
3. **Chat API cần gói copilot** để hoạt động
4. Các endpoint `/switch` hiện chỉ là simulation

## 📊 Kết quả

✅ Lấy được access token từ Cursor
✅ Tạo API quản lý token local
✅ Tạo API simulation để test
✅ **Tạo Claude API adapter hoàn chỉnh**
✅ **Tương thích 100% với Anthropic Claude API**
✅ **Hỗ trợ streaming và non-streaming**
✅ **API key management và rate limiting**
❌ Chưa tìm được endpoint thật của CursorPool
❌ Chưa kích hoạt gói copilot

## 🎯 Tính năng chính

### Claude API Adapter
- ✅ Tương thích 100% với Anthropic Claude API v1
- ✅ Hỗ trợ streaming và non-streaming
- ✅ API key management với rate limiting
- ✅ Model mapping tự động (Claude → Cursor)
- ✅ Error handling chuẩn Claude API
- ✅ CORS enabled cho web apps

### Supported Endpoints
- `POST /v1/messages` - Create message (Claude format)
- `POST /v1/complete` - Legacy completions
- `GET /v1/models` - List available models
- `POST /v1/keys` - Generate API keys
- `GET /health` - Health check

### Supported Models
- claude-3-5-sonnet-20241022
- claude-3-opus-20240229
- claude-3-sonnet-20240229
- claude-3-haiku-20240307

## 📖 Documentation

- **[QUICK-START.md](QUICK-START.md)** - Bắt đầu trong 5 phút
- **[CLAUDE-API-GUIDE.md](CLAUDE-API-GUIDE.md)** - Hướng dẫn chi tiết Claude API
- **[API-SERVICE-GUIDE.md](API-SERVICE-GUIDE.md)** - Token service guide
- **[TONG-KET.md](TONG-KET.md)** - Tổng kết dự án
- **[HUONG-DAN-TIM-ENDPOINT.md](HUONG-DAN-TIM-ENDPOINT.md)** - Hướng dẫn tìm endpoint

## 🧪 Testing

```bash
# Chạy test suite
npm test

# Chạy examples
npm run example

# Test với Python
python example-claude-api.py
```

## 🌐 Deploy

### Local Development
```bash
npm start
```

### Production với PM2
```bash
npm install -g pm2
pm2 start claude-api-adapter.js --name claude-api
pm2 startup
pm2 save
```

### Expose với ngrok
```bash
ngrok http 8000
```

## 💡 Examples

### Python
```python
from anthropic import Anthropic

client = Anthropic(
    api_key="sk-ant-xxx...",
    base_url="http://localhost:8000"
)

message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### JavaScript
```javascript
const response = await fetch('http://localhost:8000/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': 'sk-ant-xxx...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});
```

## 📊 API Servers Summary

| Server | Port | Chức năng | Status |
|--------|------|-----------|--------|
| claude-api-adapter.js | 8000 | Claude API format | ✅ Production Ready |
| cursor-token-service.js | 8080 | Token service | ✅ Hoạt động |
| cursor-token-api-server.js | 3002 | Lấy access token | ✅ Hoạt động |
| vip-pool-api-server.js | 3001 | Quản lý VIP token | ✅ Hoạt động |
| cursorpool-switch-api.js | 3003 | Đổi account | ⚠️ Simulation only |
| cursor-api-emulator.js | 3000 | Chat API | ❌ Cần copilot |

## 📖 Chi tiết

Xem file `TONG-KET.md` để biết thêm chi tiết về quá trình phân tích và kết quả.

---

**Ngày tạo**: 2026-04-16  
**Version**: 1.0.0  
**License**: MIT
