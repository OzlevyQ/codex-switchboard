$ErrorActionPreference = "Stop"

$RepoOwner = if ($env:CODEX_SWITCHBOARD_REPO_OWNER) { $env:CODEX_SWITCHBOARD_REPO_OWNER } else { "OzlevyQ" }
$RepoName = if ($env:CODEX_SWITCHBOARD_REPO_NAME) { $env:CODEX_SWITCHBOARD_REPO_NAME } else { "codex-switchboard" }
$RepoRef = if ($env:CODEX_SWITCHBOARD_REPO_REF) { $env:CODEX_SWITCHBOARD_REPO_REF } else { "main" }
$ArchiveUrl = "https://codeload.github.com/$RepoOwner/$RepoName/zip/refs/heads/$RepoRef"
$TempRoot = Join-Path ([System.IO.Path]::GetTempPath()) ("codex-switchboard-bootstrap-" + [System.Guid]::NewGuid().ToString("N"))
$ZipPath = Join-Path $TempRoot "codex-switchboard.zip"

New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null

try {
  Write-Host "Downloading Codex Switchboard from $RepoOwner/$RepoName@$RepoRef..."
  Invoke-WebRequest -UseBasicParsing -Uri $ArchiveUrl -OutFile $ZipPath
  Expand-Archive -Path $ZipPath -DestinationPath $TempRoot -Force

  $InstallScript = Get-ChildItem -Path $TempRoot -Recurse -Filter install.ps1 |
    Where-Object { $_.FullName -like "*\scripts\install.ps1" } |
    Select-Object -First 1

  if (-not $InstallScript) {
    throw "Failed to locate scripts/install.ps1 inside the downloaded archive."
  }

  & powershell -ExecutionPolicy Bypass -File $InstallScript.FullName
}
finally {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $TempRoot
}
