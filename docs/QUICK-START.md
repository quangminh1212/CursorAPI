# Quick Start Guide - Claude API Adapter

Hướng dẫn nhanh để bắt đầu sử dụng Claude API Adapter trong 5 phút.

## 🚀 Bước 1: Cài đặt

```bash
# Clone hoặc download project
cd c:\Dev\0

# Cài đặt dependencies (nếu chưa có)
npm install
```

## 🔧 Bước 2: Khởi động Server

```bash
# Khởi động Claude API Adapter
node claude-api-adapter.js

# Hoặc dùng npm script
npm start
```

Server sẽ chạy tại: `http://localhost:8000`

Khi khởi động lần đầu, server tự động tạo API key:
```
sk-ant-17693cbe0c40c33065c7948d328fe41fbc4f1843d4c9fe65c9d1a549481a4a13
```

**⚠️ LƯU API KEY NÀY!** Nó sẽ không hiển thị lại.

## 🔑 Bước 3: Test API

### Test với cURL

```bash
# Lưu API key vào biến
set API_KEY=sk-ant-xxx...

# Test health check
curl http://localhost:8000/health

# Test chat
curl -X POST http://localhost:8000/v1/messages ^
  -H "x-api-key: %API_KEY%" ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"claude-3-5-sonnet-20241022\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello!\"}]}"
```

### Test với Node.js

```bash
# Chạy test suite
node test-claude-api.js

# Chạy examples
node example-claude-api.js
```

### Test với Python

```bash
# Cài đặt dependencies
pip install requests anthropic

# Chạy examples
python example-claude-api.py
```

## 💻 Bước 4: Sử dụng trong Code

### Python với Anthropic SDK

```python
from anthropic import Anthropic

# Khởi tạo client
client = Anthropic(
    api_key="sk-ant-xxx...",  # API key từ bước 2
    base_url="http://localhost:8000"
)

# Chat với Claude
message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello, Claude!"}
    ]
)

print(message.content[0].text)
```

### JavaScript/Node.js

```javascript
const fetch = require('node-fetch');

const API_KEY = 'sk-ant-xxx...';
const API_URL = 'http://localhost:8000';

async function chat(message) {
  const response = await fetch(`${API_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: message }]
    })
  });
  
  const data = await response.json();
  return data.content;
}

// Sử dụng
chat('Hello!').then(console.log);
```

## 📊 Bước 5: Kiểm tra Token

Đảm bảo CursorPool token đã được cấu hình:

```bash
# Xem token hiện tại
type %USERPROFILE%\.codex_cursor

# Hoặc dùng script
node show-tokens.js
```

Nếu chưa có token, chạy CursorPool extension trong Cursor để tạo token.

## 🎯 Use Cases

### 1. Thay thế Anthropic API

```python
# Trước (dùng Anthropic API)
client = Anthropic(api_key="sk-ant-real-key")

# Sau (dùng CursorPool)
client = Anthropic(
    api_key="sk-ant-local-key",
    base_url="http://localhost:8000"
)
```

### 2. Tích hợp vào App

```javascript
// config.js
export const CLAUDE_API = {
  key: process.env.CLAUDE_API_KEY,
  url: process.env.CLAUDE_API_URL || 'http://localhost:8000'
};

// chat.js
import { CLAUDE_API } from './config';

async function askClaude(question) {
  const response = await fetch(`${CLAUDE_API.url}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': CLAUDE_API.key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: question }]
    })
  });
  
  return await response.json();
}
```

### 3. Streaming Response

```python
from anthropic import Anthropic

client = Anthropic(
    api_key="sk-ant-xxx...",
    base_url="http://localhost:8000"
)

# Streaming
with client.messages.stream(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Write a story"}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

## 🔧 Troubleshooting

### Lỗi: "No token configured"

```bash
# Kiểm tra token file
type %USERPROFILE%\.codex_cursor

# Nếu không có, chạy CursorPool extension
# Hoặc tạo token thủ công
echo user:159714/your-token-here > %USERPROFILE%\.codex_cursor
echo https://ecodex.micosoft.icu >> %USERPROFILE%\.codex_cursor
```

### Lỗi: "Invalid API key"

```bash
# Tạo API key mới
curl -X POST http://localhost:8000/v1/keys -d "{\"name\":\"My Key\"}"
```

### Lỗi: "Rate limit exceeded"

```bash
# Đợi 1 giờ hoặc tạo key mới
curl -X POST http://localhost:8000/v1/keys -d "{\"name\":\"New Key\"}"
```

### Lỗi: "激活码未开通copilot"

```
Activation key chưa có gói copilot.
Cần mua gói copilot từ CursorPool.
```

## 📚 Tài liệu đầy đủ

- [CLAUDE-API-GUIDE.md](CLAUDE-API-GUIDE.md) - Hướng dẫn chi tiết
- [API-SERVICE-GUIDE.md](API-SERVICE-GUIDE.md) - Token service guide
- [TONG-KET.md](TONG-KET.md) - Tổng kết dự án

## 🎉 Hoàn thành!

Bây giờ bạn có thể:
- ✅ Sử dụng CursorPool như Claude API
- ✅ Tích hợp vào app của bạn
- ✅ Tiết kiệm chi phí Anthropic API
- ✅ Unlimited requests (trong giới hạn CursorPool)

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra [CLAUDE-API-GUIDE.md](CLAUDE-API-GUIDE.md) - Troubleshooting section
2. Chạy test suite: `node test-claude-api.js`
3. Kiểm tra logs của server

---

**Created**: 2026-04-16  
**Version**: 1.0.0  
**Port**: 8000
