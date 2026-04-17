param(
    [Parameter(Mandatory = $true)]
    [string]$AnthropicModel,

    [string]$UpstreamModel
)

$configPath = Join-Path $PSScriptRoot "proxy.config.json"
$config = Get-Content -Raw $configPath | ConvertFrom-Json

$config.models.defaultAnthropicModel = $AnthropicModel

if (-not $config.models.aliases) {
    $config.models | Add-Member -MemberType NoteProperty -Name aliases -Value @{}
}

if (-not $UpstreamModel) {
    $UpstreamModel = $AnthropicModel
}

$config.models.aliases | Add-Member -MemberType NoteProperty -Name $AnthropicModel -Value $UpstreamModel -Force
$config | ConvertTo-Json -Depth 10 | Set-Content -Encoding utf8 $configPath
Get-Content -Raw $configPath
