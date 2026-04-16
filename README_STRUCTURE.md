# Project Structure Summary

## Root Files
- `run.bat` - Quick start (launches Claude API Adapter on port 8000)
- `stop.bat` - Stop all running servers
- `package.json` - Dependencies and npm scripts
- `README.md` - Main documentation
- `LICENSE` - MIT License
- `CHANGELOG.md` - Version history
- `CONTRIBUTING.md` - Contribution guidelines

## Directories

### src/ (Source Code)
- `claude-api-adapter.js` - Main API adapter (port 8000)
- `cursor-token-service.js` - Token management service (port 8080)
- `cursor-token-api-server.js` - Token API (port 3002)
- `vip-pool-api-server.js` - VIP Pool API (port 3001)
- `cursorpool-switch-api.js` - Account switch API (port 3003)
- `cursor-api-emulator.js` - Chat emulator (port 3000)
- `switch-account-api.js` - Account switching
- `show-tokens.js` - Token display utility

### examples/ (Usage Examples)
- `example-claude-api.js` - JavaScript example
- `example-claude-api.py` - Python example
- `test-claude-api.js` - Test suite

### scripts/ (Utility Scripts)
- `start.bat` - Start with dependency check
- `run.bat` - Server manager menu
- `test.bat` - Test & examples menu
- `cursor.bat` - Show Cursor tokens

### docs/ (Documentation)
- `API-SERVICE-GUIDE.md` - Token service guide
- `CLAUDE-API-GUIDE.md` - Complete API documentation
- `CLAUDE-API-SUMMARY.md` - API summary
- `QUICK-START.md` - 5-minute quickstart
- `BATCH-FILES.md` - Batch files documentation
- `HUONG-DAN-TIM-ENDPOINT.md` - Endpoint finding guide
- `PROJECT-OVERVIEW.md` - Project overview

## Quick Commands

```bash
# Start server
run.bat

# Stop all servers
stop.bat

# NPM commands
npm start              # Start Claude API Adapter
npm test               # Run tests
npm run example        # Run examples
npm run show-tokens    # Display tokens
```

## Standards Applied

✅ International directory structure (src/, docs/, examples/, scripts/)
✅ Professional README with badges
✅ Standard files (LICENSE, CHANGELOG, CONTRIBUTING)
✅ Clean .gitignore
✅ Proper package.json configuration
✅ No redundant files
✅ English-first documentation
✅ Conventional commit messages
