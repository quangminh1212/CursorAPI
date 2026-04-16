# Batch Files - Hướng dẫn sử dụng

Các file batch để quản lý và chạy CursorPool API servers.

## 📁 Files

### 1. run.bat - Quick Start
Chạy Claude API Adapter nhanh nhất.

```bash
run.bat
```

**Chức năng:**
- Kiểm tra Node.js
- Kiểm tra token file
- Cài đặt dependencies (nếu cần)
- Khởi động Claude API Adapter (port 8000)

### 2. start.bat - Server Manager
Menu quản lý tất cả servers.

```bash
start.bat
```

**Menu:**
1. Claude API Adapter (Port 8000) - RECOMMENDED
2. Token Service (Port 8080)
3. Token API Server (Port 3002)
4. VIP Pool API (Port 3001)
5. Switch API (Port 3003)
6. Chat Emulator (Port 3000)
7. Show Tokens
8. Run Tests
9. Run Examples

### 3. test.bat - Test & Examples
Chạy tests và examples.

```bash
test.bat
```

**Menu:**
1. Run Test Suite (10 tests)
2. Run JavaScript Examples
3. Run Python Examples
4. Show Tokens
5. Check Health
6. List Models
7. Create API Key

### 4. cursor.bat - Show Tokens
Hiển thị access tokens từ Cursor database.

```bash
cursor.bat
```

## 🚀 Quick Start

### Cách nhanh nhất:
```bash
# Chạy Claude API Adapter
run.bat
```

### Với menu:
```bash
# Mở menu chọn server
start.bat
```

### Chạy tests:
```bash
# Mở menu test
test.bat
```

## 📊 Servers

| File | Port | Server |
|------|------|--------|
| run.bat | 8000 | Claude API Adapter |
| start.bat → 1 | 8000 | Claude API Adapter |
| start.bat → 2 | 8080 | Token Service |
| start.bat → 3 | 3002 | Token API Server |
| start.bat → 4 | 3001 | VIP Pool API |
| start.bat → 5 | 3003 | Switch API |
| start.bat → 6 | 3000 | Chat Emulator |

## 💡 Use Cases

### Development
```bash
# Terminal 1: Chạy server
run.bat

# Terminal 2: Chạy tests
test.bat
```

### Testing
```bash
# Chạy test suite
test.bat → 1

# Chạy examples
test.bat → 2
```

### Production
```bash
# Dùng PM2 thay vì batch files
pm2 start claude-api-adapter.js --name claude-api
```

## ⚠️ Yêu cầu

- Windows OS
- Node.js installed
- Token file: `%USERPROFILE%\.codex_cursor`
- CursorPool extension đã cài đặt

## 🔧 Troubleshooting

### Lỗi: "Node.js chưa được cài đặt"
```bash
# Cài đặt Node.js từ:
https://nodejs.org/
```

### Lỗi: "Token file không tồn tại"
```bash
# Chạy CursorPool extension trong Cursor để tạo token
# Hoặc tạo thủ công:
echo user:159714/your-token > %USERPROFILE%\.codex_cursor
echo https://ecodex.micosoft.icu >> %USERPROFILE%\.codex_cursor
```

### Lỗi: "Port already in use"
```bash
# Kiểm tra port đang dùng
netstat -ano | findstr :8000

# Kill process
taskkill /PID <PID> /F
```

## 📚 Tài liệu

- [START-HERE.md](START-HERE.md) - Tóm tắt nhanh
- [QUICK-START.md](QUICK-START.md) - Bắt đầu trong 5 phút
- [CLAUDE-API-GUIDE.md](CLAUDE-API-GUIDE.md) - Hướng dẫn chi tiết

---

**Created**: 2026-04-16  
**Platform**: Windows  
**Files**: 4 batch files
