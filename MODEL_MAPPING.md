# Model Mapping - Claude API Adapter

## Tổng quan
Server đã được cập nhật để sử dụng tên model thật từ API worker của Cursor extension.

## Model Mapping

### Claude API → API Worker

| Claude API (Legacy)           | API Worker (Actual)  | Mô tả                    |
|-------------------------------|---------------------|--------------------------|
| claude-3-5-sonnet-20241022    | claude-sonnet-4.5   | Claude Sonnet 4.5        |
| claude-3-5-sonnet-latest      | claude-sonnet-4.5   | Claude Sonnet 4.5        |
| claude-3-opus-20240229        | claude-opus-4.5     | Claude Opus 4.5          |
| claude-3-sonnet-20240229      | claude-sonnet-4     | Claude Sonnet 4          |
| claude-3-haiku-20240307       | claude-haiku-4.5    | Claude Haiku 4.5         |

### Direct Model Names (Recommended)

Bạn cũng có thể sử dụng trực tiếp tên model mới:
- `claude-sonnet-4.5` (Recommended - Default)
- `claude-opus-4.5`
- `claude-sonnet-4`
- `claude-haiku-4.5`

## API Worker Models

Danh sách đầy đủ model từ API worker (https://ecodex.micosoft.icu/models):

### Claude Models (Anthropic)
- **claude-sonnet-4.5** - Claude Sonnet 4.5 (200K context, 32K output)
- **claude-opus-4.5** - Claude Opus 4.5 (200K context, 32K output, 3x billing)
- **claude-sonnet-4** - Claude Sonnet 4 (216K context, 16K output)
- **claude-haiku-4.5** - Claude Haiku 4.5 (200K context, 32K output, 0.33x billing)

### GPT Models (OpenAI/Azure)
- gpt-5.2-codex, gpt-5.2, gpt-5.1-codex, gpt-5.1, gpt-5
- gpt-5-mini, gpt-4.1, gpt-4o, gpt-4o-mini
- gpt-3.5-turbo

### Gemini Models (Google)
- gemini-3-pro-preview, gemini-3-flash-preview
- gemini-2.5-pro

### Other Models
- grok-code-fast-1 (xAI)
- raptor-mini (Microsoft)

## Endpoint `/v1/models`

Trả về danh sách model bao gồm:
1. **Model mới** (từ API worker): claude-sonnet-4.5, claude-opus-4.5, etc.
2. **Model legacy** (tương thích ngược): claude-3-5-sonnet-20241022, etc.

## Usage Example

```bash
# Sử dụng model mới (Recommended)
curl -X POST http://localhost:8000/v1/messages \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-sonnet-4.5",
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# Sử dụng model legacy (vẫn hoạt động, tự động map sang model mới)
curl -X POST http://localhost:8000/v1/messages \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## Thay đổi trong Code

### File: `src/claude-api-adapter.js`

1. **MODEL_MAPPING** (dòng 149-165):
   - Map tên Claude API legacy → tên model thật từ API worker
   - Hỗ trợ cả tên model mới và cũ

2. **Endpoint `/v1/models`** (dòng 343-357):
   - Trả về danh sách model mới từ API worker
   - Bao gồm cả model legacy để tương thích ngược

3. **Default model**:
   - Thay đổi từ `claude-3-5-sonnet-20241022` → `claude-sonnet-4.5`

## Lưu ý

- Token từ file `~/.codex_cursor` cần phải hợp lệ
- Nếu gặp lỗi 401 "请先登录", cần cập nhật token mới
- Model mapping hoạt động tự động, không cần thay đổi code client
