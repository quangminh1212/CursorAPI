# Quick Start Guide

## Start Server

```bash
run.bat
```

Server will start at: **http://localhost:8000**

## Stop Server

```bash
stop.bat
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/messages` | POST | Create message (Claude format) |
| `/v1/complete` | POST | Legacy completions |
| `/v1/models` | GET | List available models |
| `/v1/keys` | POST | Generate API key |
| `/health` | GET | Health check |

## Example Usage

### Python
```python
from anthropic import Anthropic

client = Anthropic(
    api_key="sk-ant-xxx",
    base_url="http://localhost:8000"
)

message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}]
)
```

### cURL
```bash
curl -X POST http://localhost:8000/v1/messages \
  -H "x-api-key: sk-ant-xxx" \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":1024,"messages":[{"role":"user","content":"Hello!"}]}'
```

## Configuration

Edit `api-keys.json`:
```json
{
  "cursorpool_endpoint": "your-endpoint",
  "api_key": "your-key"
}
```

## More Info

- Full documentation: [docs/CLAUDE-API-GUIDE.md](docs/CLAUDE-API-GUIDE.md)
- Quick start: [docs/QUICK-START.md](docs/QUICK-START.md)
- Project structure: [README_STRUCTURE.md](README_STRUCTURE.md)
