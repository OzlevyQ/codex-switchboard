$ErrorActionPreference = "Stop"

$PurgeData = $false
if ($args -contains "--purge-data") {
  $PurgeData = $true
}

$SwitchboardDir = Join-Path $HOME ".codex-switchboard"
$AppDir = Join-Path $SwitchboardDir "app"
$ConfigFile = Join-Path $SwitchboardDir "config.json"

$config = $null
if (Test-Path $ConfigFile) {
  $config = Get-Content $ConfigFile -Raw | ConvertFrom-Json
}

if ($config -and (Test-Path $config.backupCodex)) {
  Remove-Item -Force -ErrorAction SilentlyContinue $config.managedCodex
  Copy-Item -Force $config.backupCodex $config.managedCodex
}

if ($config) {
  Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $config.binDir "codex-swap.cmd")
  Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $config.binDir "codex-switchboard-dashboard.cmd")
  Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $config.binDir "csb.cmd")
  Remove-Item -Force -ErrorAction SilentlyContinue $config.backupCodex
}
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $AppDir
Remove-Item -Force -ErrorAction SilentlyContinue $ConfigFile

if ($PurgeData) {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $SwitchboardDir
}

Write-Host "Codex Switchboard removed."
