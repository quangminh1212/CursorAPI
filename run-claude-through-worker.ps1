param(
    [string]$BaseUrl = "http://127.0.0.1:9183",
    [string]$Model,
    [switch]$Bare,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ClaudeArgs
)

$configPath = Join-Path $PSScriptRoot "proxy.config.json"
$config = Get-Content -Raw $configPath | ConvertFrom-Json
$runtimeDir = Join-Path $PSScriptRoot "runtime"

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

if (-not $Model) {
    $Model = $config.models.defaultAnthropicModel
}

& (Join-Path $PSScriptRoot "start-api-worker.ps1") | Out-Null

$proxyPort = ([System.Uri]$BaseUrl).Port
$proxyListener = Get-NetTCPConnection -State Listen -LocalPort $proxyPort -ErrorAction SilentlyContinue

if ($proxyListener) {
    $proxyListener | ForEach-Object {
        $process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
        if ($process -and $process.ProcessName -eq "node") {
            Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 1
}

Start-Process -FilePath "node" -ArgumentList "server.mjs" -WorkingDirectory $PSScriptRoot | Out-Null
Start-Sleep -Seconds 2

$env:ANTHROPIC_BASE_URL = $BaseUrl
$env:ANTHROPIC_API_KEY = if ($config.auth.loginKey) { $config.auth.loginKey } else { "local-worker-proxy" }
$env:ANTHROPIC_AUTH_TOKEN = $env:ANTHROPIC_API_KEY
$env:ANTHROPIC_DEFAULT_SONNET_MODEL = $Model
$env:ANTHROPIC_DEFAULT_OPUS_MODEL = $Model
$env:ANTHROPIC_DEFAULT_HAIKU_MODEL = $Model

$generatedSettingsPath = Join-Path $runtimeDir "claude-local-settings.generated.json"
$generatedSettings = @{
    env = @{
        ANTHROPIC_BASE_URL = $BaseUrl
        ANTHROPIC_API_KEY = $env:ANTHROPIC_API_KEY
        ANTHROPIC_AUTH_TOKEN = $env:ANTHROPIC_AUTH_TOKEN
        ANTHROPIC_DEFAULT_SONNET_MODEL = $Model
        ANTHROPIC_DEFAULT_OPUS_MODEL = $Model
        ANTHROPIC_DEFAULT_HAIKU_MODEL = $Model
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = "1"
    }
}
$generatedSettings | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $generatedSettingsPath

$finalArgs = @()
if (-not ($ClaudeArgs -contains "--settings")) {
    $finalArgs += @("--settings", $generatedSettingsPath)
}

if ($Bare -and -not ($ClaudeArgs -contains "--bare")) {
    $finalArgs += "--bare"
}

$finalArgs += $ClaudeArgs

if ($finalArgs.Count -eq 0) {
    & claude --settings $generatedSettingsPath
} else {
    & claude @finalArgs
}
