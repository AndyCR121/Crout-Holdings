# sync-server-to-local.ps1
# Run from PowerShell: .\sync-server-to-local.ps1
# Requires: MySQL client tools on PATH (mysqldump.exe & mysql.exe)
# Typically found at: C:\Program Files\MySQL\MySQL Server 8.x\bin\

# ── Server credentials ──────────────────────────────────────
$SERVER_HOST = "169.255.58.150"
$SERVER_PORT = "3306"
$SERVER_USER = "root"
$SERVER_PASS = "g3r7ufIzg1%h"
$SERVER_DB   = "crout_automations"

# ── Local Docker credentials (from docker-compose.yml) ──────
$LOCAL_HOST  = "127.0.0.1"
$LOCAL_PORT  = "3306"
$LOCAL_USER  = "root"
$LOCAL_PASS  = "g3r7ufIzg1%h"
$LOCAL_DB    = "crout_automations"

# ── Dump path ───────────────────────────────────────────────
$DUMP_FILE = "$env:TEMP\crout_server_dump.sql"

Write-Host ">>> Dumping server DB to $DUMP_FILE ..." -ForegroundColor Cyan

mysqldump `
  -h $SERVER_HOST `
  -P $SERVER_PORT `
  -u $SERVER_USER `
  "-p$SERVER_PASS" `
  --single-transaction `
  --routines `
  --triggers `
  --add-drop-table `
  --set-gtid-purged=OFF `
  $SERVER_DB | Out-File -FilePath $DUMP_FILE -Encoding utf8

if ($LASTEXITCODE -ne 0) {
    Write-Host ">>> ERROR: mysqldump failed. Check server credentials & connectivity." -ForegroundColor Red
    exit 1
}

Write-Host ">>> Dump complete. Injecting into local Docker DB..." -ForegroundColor Cyan

Get-Content $DUMP_FILE | mysql `
  -h $LOCAL_HOST `
  -P $LOCAL_PORT `
  -u $LOCAL_USER `
  "-p$LOCAL_PASS" `
  $LOCAL_DB

if ($LASTEXITCODE -ne 0) {
    Write-Host ">>> ERROR: Import failed. Is your Docker container running? (docker ps)" -ForegroundColor Red
    exit 1
}

Write-Host ">>> Cleaning up dump file..." -ForegroundColor Gray
Remove-Item $DUMP_FILE -Force

Write-Host ">>> Sync complete! Local DB now mirrors server." -ForegroundColor Green