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
$CONTAINER_DUMP   = "/tmp/server_dump.sql"

Write-Host ">>> [1/4] Dumping server DB via docker exec..." -ForegroundColor Cyan
docker exec $LOCAL_CONTAINER mysqldump -h $SERVER_HOST -P $SERVER_PORT -u $SERVER_USER "-p$SERVER_PASS" --single-transaction --routines --triggers --add-drop-table --set-gtid-purged=OFF $SERVER_DB | Out-File -FilePath $DUMP_FILE -Encoding utf8
if ($LASTEXITCODE -ne 0) { Write-Host ">>> ERROR: Dump failed. Is crout_db running and can it reach the server?" -ForegroundColor Red; exit 1 }

Write-Host ">>> [2/4] Copying dump into container..." -ForegroundColor Cyan
docker cp $DUMP_FILE "${LOCAL_CONTAINER}:${CONTAINER_DUMP}"
if ($LASTEXITCODE -ne 0) { Write-Host ">>> ERROR: docker cp failed." -ForegroundColor Red; exit 1 }

Write-Host ">>> [3/4] Importing into local DB..." -ForegroundColor Cyan
docker exec $LOCAL_CONTAINER bash -c "mysql -u $LOCAL_USER -p'$LOCAL_PASS' $LOCAL_DB < $CONTAINER_DUMP"
if ($LASTEXITCODE -ne 0) { Write-Host ">>> ERROR: Import failed." -ForegroundColor Red; exit 1 }

Write-Host ">>> [4/4] Cleaning up..." -ForegroundColor Gray
docker exec $LOCAL_CONTAINER rm $CONTAINER_DUMP
Remove-Item $DUMP_FILE -Force

Write-Host ">>> Sync complete! Local DB now mirrors the server." -ForegroundColor Green