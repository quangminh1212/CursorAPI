# CursorPool API Proxy

Reverse engineer extension CursorPool và tạo API proxy server tương thích OpenAI format.

## 🚀 Cài đặt

```bash
npm install
```

## 📖 Sử dụng

### 1. Chạy server
```bash
node cursorpool-api-server.js
```

Server sẽ tự động đọc token từ `~/.codex_cursor` và khởi động tại `http://localhost:3000`

### 2. Gọi API
```bash
curl http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

### 3. Endpoints

- `GET /health` - Kiểm tra status và token
- `GET /v1/models` - Danh sách models
- `POST /v1/chat/completions` - Chat completions (OpenAI format)
- `POST /v1/messages` - Messages (Anthropic format)

## 🔑 Token

Token được lưu trong file `~/.codex_cursor` với format:
```
user:192531/3d82d817ebd8462c97d743b20eccd0eb
https://ecodex.micosoft.icu
```

## ⚠️ Lưu ý

Extension CursorPool có 2 loại gói:
1. **VIP Pool** - Đổi account Cursor (bypass free tier limit)
2. **Copilot** - Chat API/completions

Để dùng API này, bạn cần **gói Copilot** (không chỉ VIP Pool).

## 📁 Files

- `cursorpool-api-server.js` - API proxy server chính
- `FINAL-RESULT.md` - Kết quả phân tích chi tiết
- `.gitignore` - Git ignore rules

## 🛠️ Development

Test scripts:
- `test-free-models.js` - Test các model free
- `test-raw-response.js` - Xem raw API response
- `check-account-info.js` - Kiểm tra thông tin account

## 📝 License

ISC
