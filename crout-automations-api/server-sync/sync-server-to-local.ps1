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

# ── Step 1: Dump server DB using mysqldump inside local container ──
Write-Host ">>> Dumping server DB via docker exec..." -ForegroundColor Cyan

docker exec $LOCAL_CONTAINER mysqldump `
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
    Write-Host ">>> ERROR: Dump failed. Check server host/credentials and that crout_db container is running." -ForegroundColor Red
    exit 1
}

Write-Host ">>> Dump saved to $DUMP_FILE" -ForegroundColor Gray

# ── Step 2: Copy dump into the container ────────────────────
Write-Host ">>> Copying dump into container..." -ForegroundColor Cyan
docker cp $DUMP_FILE "${LOCAL_CONTAINER}:/tmp/server_dump.sql"

# ── Step 3: Import into local DB ────────────────────────────
Write-Host ">>> Importing into local DB..." -ForegroundColor Cyan

docker exec $LOCAL_CONTAINER bash -c `
  "mysql -u $LOCAL_USER -p'$LOCAL_PASS' $LOCAL_DB < /tmp/server_dump.sql"

if ($LASTEXITCODE -ne 0) {
    Write-Host ">>> ERROR: Import failed." -ForegroundColor Red
    exit 1
}

# ── Step 4: Cleanup ─────────────────────────────────────────
Write-Host ">>> Cleaning up..." -ForegroundColor Gray
docker exec $LOCAL_CONTAINER rm /tmp/server_dump.sql
Remove-Item $DUMP_FILE -Force

Write-Host ">>> Done! Local DB now mirrors the server." -ForegroundColor Green
Before running — quick checklist
powershell
# 1. Confirm crout_db container is running:
docker ps --filter "name=crout_db"

# 2. Confirm the container can reach your server (replace with your actual server host):
docker exec crout_db mysqladmin ping -h your.server.host -u crout_user -pyour_server_password

# 3. Then run the sync:
.\sync-server-to-local.ps1