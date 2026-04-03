$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$SwitchboardDir = Join-Path $HOME ".codex-switchboard"
$AppDir = Join-Path $SwitchboardDir "app"
$BackupDir = Join-Path $SwitchboardDir "original"
$ConfigFile = Join-Path $SwitchboardDir "config.json"

$realCodex = $env:CODEX_SWITCHBOARD_REAL_CODEX
if (-not $realCodex) {
  $cmd = Get-Command codex -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Could not find codex in PATH."
  }
  $realCodex = $cmd.Source
}

$TargetBinDir = Split-Path -Parent $realCodex
$ManagedCodex = Join-Path $TargetBinDir "codex.cmd"
$BackupCodex = Join-Path $TargetBinDir "codex-switchboard-real.cmd"
$LegacyBackupCodex = Join-Path $BackupDir "codex.cmd"

New-Item -ItemType Directory -Force -Path $AppDir | Out-Null
New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $SwitchboardDir "profiles") | Out-Null

Copy-Item -Force (Join-Path $RootDir "server.mjs") (Join-Path $AppDir "server.mjs")
if (Test-Path (Join-Path $AppDir "runtime")) { Remove-Item -Recurse -Force (Join-Path $AppDir "runtime") }
if (Test-Path (Join-Path $AppDir "public")) { Remove-Item -Recurse -Force (Join-Path $AppDir "public") }
Copy-Item -Recurse -Force (Join-Path $RootDir "runtime") (Join-Path $AppDir "runtime")
Copy-Item -Recurse -Force (Join-Path $RootDir "public") (Join-Path $AppDir "public")

$requiredFiles = @(
  (Join-Path $AppDir "server.mjs"),
  (Join-Path $AppDir "runtime\\common.mjs"),
  (Join-Path $AppDir "runtime\\codex-wrapper.mjs"),
  (Join-Path $AppDir "runtime\\codex-swap.mjs"),
  (Join-Path $AppDir "runtime\\pool-manager.mjs"),
  (Join-Path $AppDir "runtime\\share-manager.mjs"),
  (Join-Path $AppDir "runtime\\csb-cloud.mjs")
)

foreach ($file in $requiredFiles) {
  if (-not (Test-Path $file)) {
    throw "Install verification failed. Missing file: $file"
  }
}

if (-not (Test-Path $BackupCodex)) {
  if (Test-Path $LegacyBackupCodex) {
    Copy-Item -Force $LegacyBackupCodex $BackupCodex
  } else {
    Copy-Item -Force $realCodex $BackupCodex
  }
}

Remove-Item -Force -ErrorAction SilentlyContinue $ManagedCodex

@{
  version = "1.1.0"
  installedAt = [DateTime]::UtcNow.ToString("o")
  platform = "windows"
  realCodex = $BackupCodex
  appDir = $AppDir
  binDir = $TargetBinDir
  managedCodex = $ManagedCodex
  backupCodex = $BackupCodex
} | ConvertTo-Json | Set-Content -Encoding UTF8 $ConfigFile

@"
@echo off
node "$AppDir\runtime\codex-wrapper.mjs" %*
"@ | Set-Content -Encoding ASCII $ManagedCodex

@"
@echo off
node "$AppDir\runtime\codex-swap.mjs" %*
"@ | Set-Content -Encoding ASCII (Join-Path $TargetBinDir "codex-swap.cmd")

@"
@echo off
node "$AppDir\server.mjs" --open-browser %*
"@ | Set-Content -Encoding ASCII (Join-Path $TargetBinDir "codex-switchboard-dashboard.cmd")

@"
@echo off
node "$AppDir\runtime\csb-cloud.mjs" %*
"@ | Set-Content -Encoding ASCII (Join-Path $TargetBinDir "csb.cmd")

Write-Host "Codex Switchboard installed."
Write-Host "real codex backup: $BackupCodex"
Write-Host "commands: codex, codex-swap, codex-switchboard-dashboard, csb"
Write-Host "installed in: $TargetBinDir"
Write-Host "It should work immediately in the current environment."
