# Claude Code Through API Worker

This folder contains the cleaned setup for running Claude Code through the CursorPool `api-worker`.

## What It Does

- starts the downloaded `api-worker` on `http://127.0.0.1:9182`
- runs an Anthropic-compatible local proxy on `http://127.0.0.1:9183`
- points Claude Code at that proxy
- reads worker credentials from Cursor state by default
- lets you override credentials and model mappings

## Kept Files

- `README.md`
- `package.json`
- `server.mjs`
- `cursor-capi-bridge.cjs`
- `proxy.config.json`
- `start-api-worker.ps1`
- `run-claude-through-worker.ps1`
- `set-worker-key.ps1`
- `set-worker-model.ps1`

## Start It

```powershell
.\run-claude-through-worker.ps1
```

Quick non-interactive test:

```powershell
.\run-claude-through-worker.ps1 -Bare -p --output-format json --permission-mode bypassPermissions "Reply with exactly the word OK."
```

## Change Credentials

Set a login key:

```powershell
.\set-worker-key.ps1 -LoginKey "YOUR-NEW-LOGIN-KEY"
```

Set a worker token directly:

```powershell
.\set-worker-key.ps1 -WorkerToken "user:.../..."
```

Notes:

- the worker token is the most reliable credential for actual requests
- if the login key expires, opening Cursor with CursorPool once can refresh the stored worker token
- the proxy re-reads Cursor state on each request

## Change Model Mapping

Set the default Claude-facing model:

```powershell
.\set-worker-model.ps1 -AnthropicModel "claude-opus-4-6"
```

Map a Claude model name to a specific upstream model:

```powershell
.\set-worker-model.ps1 -AnthropicModel "claude-sonnet-4-20250514" -UpstreamModel "gpt-5.3-codex"
```

Current mappings are stored in `proxy.config.json`.

## Health Checks

Proxy:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9183/health
```

Worker:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:9182/health
```

## Runtime Files

Generated settings and logs now go under `runtime/` instead of cluttering the project root.

Typical runtime files:

- `runtime/api-worker.log`
- `runtime/api-worker.err.log`
- `runtime/claude-local-settings.generated.json`
- `runtime/latest-upstream-auth.json` when using direct upstream capture mode

## Current Limitations

- the provider can still be slow or unstable
- some advertised model labels appear to route to lower-level upstream model IDs
- the most stable mapping in this setup is currently `gpt-5.3-codex`
- requests can still fail if the upstream provider account or pool is unavailable

## If The Worker Is Missing

This setup expects the downloaded worker binary at:

```text
C:\Users\ts\AppData\Local\Temp\api-worker
```

If it is missing:

1. Open Cursor once with CursorPool installed.
2. Or run the CursorPool extension launcher from Cursor's installed extension directory.
