$ErrorActionPreference = "Stop"

$PurgeData = $false
if ($args -contains "--purge-data") {
  $PurgeData = $true
}

$SwitchboardDir = Join-Path $HOME ".codex-switchboard"
$AppDir = Join-Path $SwitchboardDir "app"
$BinDir = Join-Path $SwitchboardDir "bin"

Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $BinDir "codex.cmd")
Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $BinDir "codex-swap.cmd")
Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $BinDir "codex-switchboard-dashboard.cmd")
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $AppDir
Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $SwitchboardDir "config.json")

if ($PurgeData) {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $SwitchboardDir
}

Write-Host "Codex Switchboard removed."
