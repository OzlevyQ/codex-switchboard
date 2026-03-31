$ErrorActionPreference = "Stop"

$RootDir = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$SwitchboardDir = Join-Path $HOME ".codex-switchboard"
$AppDir = Join-Path $SwitchboardDir "app"
$BinDir = Join-Path $SwitchboardDir "bin"
$ConfigFile = Join-Path $SwitchboardDir "config.json"

$realCodex = $env:CODEX_SWITCHBOARD_REAL_CODEX
if (-not $realCodex) {
  $cmd = Get-Command codex -ErrorAction SilentlyContinue
  if (-not $cmd) {
    throw "Could not find codex in PATH."
  }
  $realCodex = $cmd.Source
}

New-Item -ItemType Directory -Force -Path $AppDir | Out-Null
New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $SwitchboardDir "profiles") | Out-Null

Copy-Item -Force (Join-Path $RootDir "server.mjs") (Join-Path $AppDir "server.mjs")
Copy-Item -Recurse -Force (Join-Path $RootDir "runtime") (Join-Path $AppDir "runtime")
Copy-Item -Recurse -Force (Join-Path $RootDir "public") (Join-Path $AppDir "public")

@{
  version = "1.1.0"
  installedAt = [DateTime]::UtcNow.ToString("o")
  platform = "windows"
  realCodex = $realCodex
  appDir = $AppDir
  binDir = $BinDir
} | ConvertTo-Json | Set-Content -Encoding UTF8 $ConfigFile

@"
@echo off
node "$AppDir\runtime\codex-wrapper.mjs" %*
"@ | Set-Content -Encoding ASCII (Join-Path $BinDir "codex.cmd")

@"
@echo off
node "$AppDir\runtime\codex-swap.mjs" %*
"@ | Set-Content -Encoding ASCII (Join-Path $BinDir "codex-swap.cmd")

@"
@echo off
node "$AppDir\server.mjs" %*
"@ | Set-Content -Encoding ASCII (Join-Path $BinDir "codex-switchboard-dashboard.cmd")

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if (-not $userPath.Split(";") -contains $BinDir) {
  [Environment]::SetEnvironmentVariable("Path", "$BinDir;$userPath", "User")
}

Write-Host "Codex Switchboard installed."
Write-Host "Open a new terminal, then use: codex, codex-swap, codex-switchboard-dashboard"
