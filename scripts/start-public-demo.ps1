$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$publicRuntime = Join-Path $projectRoot '.judge-demo'
New-Item -ItemType Directory -Path $publicRuntime -Force | Out-Null
if (-not (Test-Path -LiteralPath (Join-Path $projectRoot '.next/BUILD_ID'))) { throw 'Run npm ci and npm run build in the project first.' }
$tunnelBinary = Join-Path $publicRuntime 'cloudflared.exe'
if (-not (Test-Path -LiteralPath $tunnelBinary)) {
 $release = Invoke-RestMethod -Uri 'https://api.github.com/repos/cloudflare/cloudflared/releases/latest'
 $asset = $release.assets | Where-Object name -EQ 'cloudflared-windows-amd64.exe'
 if (-not $asset -or -not $asset.digest) { throw 'An official checksummed Windows release could not be resolved.' }
 Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tunnelBinary
 $checksum = (Get-FileHash -LiteralPath $tunnelBinary -Algorithm SHA256).Hash.ToLower()
 if ($asset.digest -ne ('sha256:' + $checksum)) { throw 'Tunnel download checksum mismatch. Do not run this binary.' }
}
if (Get-NetTCPConnection -State Listen -LocalPort 3005 -ErrorAction SilentlyContinue) { throw 'Port 3005 is already running. Keep using its existing demo URL, or stop that demo before restarting.' }
$previousData = $env:DATA_DIR
$previousKey = $env:OPENAI_API_KEY
$previousPassword = $env:TEACHER_PASSWORD
try {
 $env:DATA_DIR = Join-Path $publicRuntime 'data'
 $env:OPENAI_API_KEY = ''
 $env:TEACHER_PASSWORD = 'classpocket-demo'
 $serverProcess = Start-Process -FilePath (Get-Command node).Source -ArgumentList @('node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3005') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $publicRuntime 'server.log') -RedirectStandardError (Join-Path $publicRuntime 'server-error.log') -PassThru
 $serverProcess.Id | Set-Content -LiteralPath (Join-Path $publicRuntime 'server.pid')
} finally { $env:DATA_DIR=$previousData; $env:OPENAI_API_KEY=$previousKey; $env:TEACHER_PASSWORD=$previousPassword }
Start-Sleep -Seconds 2
$tunnelProcess = Start-Process -FilePath $tunnelBinary -ArgumentList @('tunnel','--no-autoupdate','--protocol','http2','--url','http://127.0.0.1:3005') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $publicRuntime 'tunnel-out.log') -RedirectStandardError (Join-Path $publicRuntime 'tunnel.log') -PassThru
$tunnelProcess.Id | Set-Content -LiteralPath (Join-Path $publicRuntime 'tunnel.pid')
for ($attempt=0;$attempt -lt 30;$attempt++) {
 Start-Sleep -Seconds 1
 $log = Get-Content -LiteralPath (Join-Path $publicRuntime 'tunnel.log') -Raw -ErrorAction SilentlyContinue
 if ($log -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
  $judgeUrl=$Matches[0]
  $judgeUrl | Set-Content -LiteralPath (Join-Path $publicRuntime 'public-url.txt')
  Write-Output "Public judge demo: $judgeUrl"
  Write-Output 'Keep this laptop, server and tunnel running. This temporary address changes after a tunnel restart.'
  exit 0
 }
}
throw 'No public URL was returned yet. Inspect .judge-demo/tunnel.log and server-error.log before starting another tunnel.'
