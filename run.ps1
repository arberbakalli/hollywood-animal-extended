param(
    [int]$Port = $(if ($env:PORT) { [int]$env:PORT } else { 8765 }),
    [string]$HostName = $(if ($env:HOST) { $env:HOST } else { "127.0.0.1" })
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RootDir

$pythonCommand = $null
foreach ($candidate in @("python", "python3", "py")) {
    if (Get-Command $candidate -ErrorAction SilentlyContinue) {
        $pythonCommand = $candidate
        break
    }
}

if (-not $pythonCommand) {
    Write-Error "No Python found. Install Python or run another static file server from this folder."
    exit 1
}

Write-Host "Hollywood Animal Calculator"
Write-Host "Serving $RootDir"
Write-Host "Open: http://$HostName`:$Port/index.html"
Write-Host "Stop: Ctrl+C"
Write-Host ""

& $pythonCommand -m http.server $Port --bind $HostName
