# Claude API Adapter - Hướng dẫn sử dụng

Chuyển đổi API worker của CursorPool thành Claude API format, tương thích 100% với Anthropic Claude API.

## 🚀 Khởi động

```bash
node claude-api-adapter.js
```

Server chạy tại: `http://localhost:8000`

## 🔑 Lấy API Key

Khi khởi động lần đầu, server tự động tạo API key:

```
sk-ant-17693cbe0c40c33065c7948d328fe41fbc4f1843d4c9fe65c9d1a549481a4a13
```

**Lưu key này!** Nó sẽ không hiển thị lại.

## 📖 API Endpoints

### 1. POST /v1/messages - Tạo message (Claude format)

**Request:**
```bash
curl -X POST http://localhost:8000/v1/messages \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
      {"role": "user", "content": "Hello, Claude!"}
    ],
    "max_tokens": 1024
  }'
```

**Response:**
```json
{
  "id": "msg_1713283759296",
  "type": "message",
  "role": "assistant",
  "content": "Hello! How can I help you today?",
  "model": "claude-3-5-sonnet-20241022",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 10,
    "output_tokens": 25
  }
}
```

### 2. POST /v1/messages (Streaming)

**Request:**
```bash
curl -X POST http://localhost:8000/v1/messages \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [
      {"role": "user", "content": "Write a haiku"}
    ],
    "stream": true
  }'
```

**Response (SSE):**
```
event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Cherry"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":" blossoms"}}

event: message_stop
data: {"type":"message_stop"}
```

### 3. GET /v1/models - Danh sách models

**Request:**
```bash
curl http://localhost:8000/v1/models
```

**Response:**
```json
{
  "data": [
    {
      "id": "claude-3-5-sonnet-20241022",
      "type": "model",
      "display_name": "Claude 3.5 Sonnet"
    },
    {
      "id": "claude-3-opus-20240229",
      "type": "model",
      "display_name": "Claude 3 Opus"
    },
    {
      "id": "claude-3-sonnet-20240229",
      "type": "model",
      "display_name": "Claude 3 Sonnet"
    },
    {
      "id": "claude-3-haiku-20240307",
      "type": "model",
      "display_name": "Claude 3 Haiku"
    }
  ]
}
```

### 4. POST /v1/complete - Legacy completions

**Request:**
```bash
curl -X POST http://localhost:8000/v1/complete \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "prompt": "What is the capital of France?"
  }'
```

**Response:**
```json
{
  "completion": "The capital of France is Paris.",
  "stop_reason": "end_turn",
  "model": "claude-3-5-sonnet-20241022"
}
```

### 5. POST /v1/keys - Tạo API key mới

**Request:**
```bash
curl -X POST http://localhost:8000/v1/keys \
  -H "Content-Type: application/json" \
  -d '{"name": "My App"}'
```

**Response:**
```json
{
  "api_key": "sk-ant-xxx...",
  "name": "My App",
  "created": "2026-04-16T16:09:19.296Z",
  "message": "Save this key securely. It will not be shown again."
}
```

### 6. GET /health - Health check

**Request:**
```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "ok",
  "token_configured": true,
  "timestamp": "2026-04-16T16:09:19.296Z"
}
```

## 💻 Sử dụng trong Code

### Python (với Anthropic SDK)

```python
from anthropic import Anthropic

# Khởi tạo client với custom base URL
client = Anthropic(
    api_key="sk-ant-xxx...",
    base_url="http://localhost:8000"
)

# Gọi API
message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello, Claude!"}
    ]
)

print(message.content)
```

### Python (với requests)

```python
import requests

API_KEY = "sk-ant-xxx..."
API_URL = "http://localhost:8000"

def chat_with_claude(message):
    response = requests.post(
        f"{API_URL}/v1/messages",
        headers={
            "x-api-key": API_KEY,
            "Content-Type": "application/json"
        },
        json={
            "model": "claude-3-5-sonnet-20241022",
            "messages": [{"role": "user", "content": message}]
        }
    )
    return response.json()

# Sử dụng
result = chat_with_claude("What is AI?")
print(result['content'])
```

### JavaScript/Node.js (với Anthropic SDK)

```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: 'sk-ant-xxx...',
  baseURL: 'http://localhost:8000'
});

async function chatWithClaude(message) {
  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{ role: 'user', content: message }]
  });
  
  return response.content;
}

// Sử dụng
const result = await chatWithClaude('Hello!');
console.log(result);
```

### JavaScript (với fetch)

```javascript
const API_KEY = 'sk-ant-xxx...';
const API_URL = 'http://localhost:8000';

async function chatWithClaude(message) {
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
  
  return await response.json();
}

// Sử dụng
const result = await chatWithClaude('What is AI?');
console.log(result.content);
```

### Streaming Example (JavaScript)

```javascript
async function streamClaude(message) {
  const response = await fetch(`${API_URL}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: message }],
      stream: true
    })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.substring(6));
        if (data.delta?.text) {
          process.stdout.write(data.delta.text);
        }
      }
    }
  }
}

// Sử dụng
await streamClaude('Write a story about a robot');
```

## 🔄 Model Mapping

Adapter tự động chuyển đổi Claude models sang Cursor models:

| Claude Model | Cursor Model |
|--------------|--------------|
| claude-3-5-sonnet-20241022 | claude-3-5-sonnet-20241022 |
| claude-3-opus-20240229 | gpt-4o |
| claude-3-sonnet-20240229 | gpt-4o |
| claude-3-haiku-20240307 | gpt-5-mini |
| claude-2.1 | gpt-4o |
| claude-2.0 | gpt-4o |
| claude-instant-1.2 | gpt-5-mini |

## 🔒 Authentication

Có 2 cách xác thực:

### 1. Header x-api-key (Recommended)
```bash
curl -H "x-api-key: sk-ant-xxx..." http://localhost:8000/v1/messages
```

### 2. Authorization Bearer
```bash
curl -H "Authorization: Bearer sk-ant-xxx..." http://localhost:8000/v1/messages
```

## 📊 Rate Limiting

- **Limit**: 1000 requests/hour per API key
- **Response khi vượt limit**: HTTP 429

```json
{
  "type": "error",
  "error": {
    "type": "rate_limit_error",
    "message": "Rate limit exceeded"
  }
}
```

## 🌐 Deploy lên Production

### 1. Dùng PM2

```bash
# Cài PM2
npm install -g pm2

# Chạy service
pm2 start claude-api-adapter.js --name claude-api

# Auto start on reboot
pm2 startup
pm2 save

# Xem logs
pm2 logs claude-api
```

### 2. Expose ra Internet với ngrok

```bash
# Cài ngrok từ https://ngrok.com/

# Expose port 8000
ngrok http 8000
```

Bạn sẽ nhận được URL: `https://xxx.ngrok.io`

### 3. Sử dụng từ xa

```python
from anthropic import Anthropic

client = Anthropic(
    api_key="sk-ant-xxx...",
    base_url="https://xxx.ngrok.io"  # URL public
)
```

## 🔐 Bảo mật Production

### 1. Thêm HTTPS với nginx

```nginx
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 2. Environment Variables

```bash
# Tạo file .env
PORT=8000
RATE_LIMIT_MAX=1000
RATE_LIMIT_WINDOW=3600000

# Load trong code
require('dotenv').config();
```

### 3. IP Whitelist

Thêm vào code:

```javascript
const ALLOWED_IPS = ['1.2.3.4', '5.6.7.8'];

function checkIP(req) {
    const ip = req.headers['x-real-ip'] || req.connection.remoteAddress;
    return ALLOWED_IPS.includes(ip);
}
```

## ⚠️ Lưu ý

1. **Token từ ~/.codex_cursor**: 
   - Phải có token hợp lệ trong file này
   - Token được lấy từ CursorPool extension
   - Token hết hạn: cần refresh

2. **VIP Pool activation**:
   - Cần activation key hợp lệ
   - Nếu chưa có copilot, API sẽ trả lỗi

3. **Model availability**:
   - Tùy thuộc vào gói CursorPool đã kích hoạt
   - Một số model có thể không khả dụng

## 🆘 Troubleshooting

### Lỗi: "No token configured"
```bash
# Kiểm tra file token
cat ~/.codex_cursor

# Nếu không có, chạy CursorPool extension để tạo token
```

### Lỗi: "激活码未开通copilot"
```bash
# Activation key chưa có gói copilot
# Cần mua gói copilot từ CursorPool
```

### Lỗi: "Rate limit exceeded"
```bash
# Đợi 1 giờ hoặc tạo API key mới
curl -X POST http://localhost:8000/v1/keys \
  -H "Content-Type: application/json" \
  -d '{"name": "New Key"}'
```

### Lỗi: "Invalid API key"
```bash
# Kiểm tra key trong file
cat claude-api-keys.json

# Tạo key mới nếu cần
curl -X POST http://localhost:8000/v1/keys \
  -d '{"name": "Test"}'
```

## 📈 Monitoring

### Xem logs với PM2
```bash
pm2 logs claude-api --lines 100
```

### Health check
```bash
# Kiểm tra server
curl http://localhost:8000/health

# Kiểm tra từ xa
curl https://your-domain.com/health
```

## 🎯 Use Cases

### 1. Thay thế Anthropic API
- Dùng CursorPool thay vì trả tiền Anthropic
- Tương thích 100% với Claude SDK
- Chỉ cần đổi base_url

### 2. Chia sẻ cho team
- Tạo API key cho mỗi thành viên
- Theo dõi usage per user
- Quản lý rate limit

### 3. Tích hợp vào app
- App gọi API này thay vì Anthropic
- Tiết kiệm chi phí
- Kiểm soát usage

### 4. Development/Testing
- Test app với Claude API
- Không tốn tiền Anthropic
- Unlimited requests (trong giới hạn CursorPool)

## 📚 Tài liệu tham khảo

- [Anthropic Claude API Docs](https://docs.anthropic.com/claude/reference)
- [CursorPool GitHub](https://github.com/keg1255/windsurf-pool)
- [Anthropic Python SDK](https://github.com/anthropics/anthropic-sdk-python)
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript)

---

**Port**: 8000  
**API Version**: 1.0.0  
**Compatible**: Anthropic Claude API v1  
**Created**: 2026-04-16
