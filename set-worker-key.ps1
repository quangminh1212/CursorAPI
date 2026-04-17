param(
    [string]$LoginKey,
    [string]$WorkerToken,
    [ValidateSet("auto", "worker_token", "activation_code", "account", "codex_activator")]
    [string]$CredentialMode
)

$configPath = Join-Path $PSScriptRoot "proxy.config.json"
$config = Get-Content -Raw $configPath | ConvertFrom-Json

if ($PSBoundParameters.ContainsKey("LoginKey")) {
    $config.auth.loginKey = $LoginKey
}

if ($PSBoundParameters.ContainsKey("WorkerToken")) {
    $config.auth.workerAuthToken = $WorkerToken
}

if ($PSBoundParameters.ContainsKey("CredentialMode")) {
    $config.auth.credentialMode = $CredentialMode
}

$config | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $configPath
Get-Content -Raw $configPath
