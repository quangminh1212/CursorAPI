# CursorPool API Adapter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)

Convert CursorPool API to Claude API format for seamless integration with Anthropic's Claude SDK.

## ✨ Features

- 🔄 **Auto Token Detection** - Automatic token rotation and management
- 🚀 **Claude API Compatible** - 100% compatible with Anthropic Claude API v1
- 📊 **Usage Tracking** - Monitor token usage and rate limits
- 🔐 **Multi-Account Support** - Handle multiple accounts seamlessly
- ⚡ **High Performance** - Optimized proxy with minimal latency
- 🌊 **Streaming Support** - Both streaming and non-streaming responses

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Configure API keys
cp api-keys.example.json api-keys.json
# Edit api-keys.json with your credentials

# Start the adapter
npm start

# Test the API
npm test
```

Server will be available at `http://localhost:8000`

## 📁 Project Structure

```
cursorpool-api/
├── src/                          # Source code
│   ├── claude-api-adapter.js     # Main API adapter
│   ├── cursor-token-service.js   # Token management service
│   ├── cursor-token-api-server.js
│   ├── vip-pool-api-server.js
│   └── ...
├── examples/                     # Usage examples
│   ├── example-claude-api.js     # JavaScript example
│   ├── example-claude-api.py     # Python example
│   └── test-claude-api.js        # Test suite
├── scripts/                      # Utility scripts
│   ├── start.bat                 # Windows start script
│   ├── test.bat                  # Windows test script
│   └── ...
├── docs/                         # Documentation
│   ├── API-SERVICE-GUIDE.md
│   ├── CLAUDE-API-GUIDE.md
│   └── QUICK-START.md
├── package.json
├── README.md
└── LICENSE
```

## 🔌 API Endpoints

### Main Adapter (Port 8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/messages` | POST | Create message (Claude format) |
| `/v1/complete` | POST | Legacy completions |
| `/v1/models` | GET | List available models |
| `/v1/keys` | POST | Generate API keys |
| `/health` | GET | Health check |

### Supported Models

- `claude-3-5-sonnet-20241022`
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

## 💻 Usage Examples

### Python with Anthropic SDK

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
print(message.content)
```

### JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:8000/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': 'sk-ant-xxx...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{ role: 'user', content: 'Hello!' }]
  })
});

const data = await response.json();
console.log(data);
```

### cURL

```bash
curl -X POST http://localhost:8000/v1/messages \
  -H "x-api-key: sk-ant-xxx..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## ⚙️ Configuration

Create `api-keys.json` in the root directory:

```json
{
  "cursorpool_endpoint": "your-endpoint-here",
  "api_key": "your-api-key-here"
}
```

## 📚 Documentation

- [Quick Start Guide](docs/QUICK-START.md) - Get started in 5 minutes
- [Claude API Guide](docs/CLAUDE-API-GUIDE.md) - Detailed API documentation
- [API Service Guide](docs/API-SERVICE-GUIDE.md) - Token service documentation
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Changelog](CHANGELOG.md) - Version history

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the API adapter |
| `npm test` | Run test suite |
| `npm run example` | Run example code |
| `npm run show-tokens` | Display available tokens |
| `npm run token-service` | Start token service |

## 🚢 Deployment

### Local Development

```bash
npm start
```

### Production with PM2

```bash
npm install -g pm2
pm2 start src/claude-api-adapter.js --name claude-api
pm2 startup
pm2 save
```

### Expose with ngrok

```bash
ngrok http 8000
```

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Anthropic for Claude API
- CursorPool for the original service

---

**Created**: 2026-04-16  
**Version**: 1.0.0  
**Maintainer**: CursorPool API Team
