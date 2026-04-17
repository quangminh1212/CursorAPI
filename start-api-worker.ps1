param(
    [switch]$Restart
)

$worker = Join-Path $env:TEMP "api-worker"
$runtimeDir = Join-Path $PSScriptRoot "runtime"
$stdout = Join-Path $runtimeDir "api-worker.log"
$stderr = Join-Path $runtimeDir "api-worker.err.log"

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

if (-not (Test-Path $worker)) {
    throw "api-worker was not found at $worker. Open Cursor once with CursorPool installed or run the extension launcher first."
}

$listener = Get-NetTCPConnection -LocalPort 9182 -State Listen -ErrorAction SilentlyContinue

if ($Restart -and $listener) {
    $listener | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
    $listener = $null
}

if (-not $listener) {
    Start-Process -FilePath "node" -ArgumentList $worker -WorkingDirectory $PSScriptRoot -RedirectStandardOutput $stdout -RedirectStandardError $stderr | Out-Null
    Start-Sleep -Seconds 4
    $listener = Get-NetTCPConnection -LocalPort 9182 -State Listen -ErrorAction SilentlyContinue
}

if (-not $listener) {
    throw "api-worker did not start on port 9182. Check $stderr."
}

Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:9182/health" -TimeoutSec 5 | Select-Object StatusCode, Content
