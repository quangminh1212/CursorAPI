# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-04-16

### Added
- Initial release
- Claude API adapter with full compatibility
- Auto token detection and rotation
- Multiple account support
- Streaming and non-streaming support
- API key management with rate limiting
- Token service endpoints
- Example implementations in JavaScript and Python
- Comprehensive documentation
- Batch scripts for Windows

### Features
- POST /v1/messages - Create message (Claude format)
- POST /v1/complete - Legacy completions
- GET /v1/models - List available models
- POST /v1/keys - Generate API keys
- GET /health - Health check

### Supported Models
- claude-3-5-sonnet-20241022
- claude-3-opus-20240229
- claude-3-sonnet-20240229
- claude-3-haiku-20240307
