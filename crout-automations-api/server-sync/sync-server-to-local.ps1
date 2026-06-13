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

$LOCAL_CONTAINER = "crout_db"

# ── Dump path ───────────────────────────────────────────────
$DUMP_FILE = "$env:TEMP\crout_server_dump.sql"

# ── Step 1: Verify container is running ─────────────────────
Write-Host ">>> Checking container..." -ForegroundColor Cyan
$running = docker inspect --format "{{.State.Running}}" $LOCAL_CONTAINER 2>&1
if ($running -ne "true") {
    Write-Host ">>> ERROR: Container '$LOCAL_CONTAINER' is not running. Run: docker compose up -d" -ForegroundColor Red
    exit 1
}
Write-Host ">>> Container '$LOCAL_CONTAINER' is up." -ForegroundColor Green

# ── Step 2: Dump server DB (all args as explicit array) ──────
Write-Host ">>> [1/4] Dumping server DB..." -ForegroundColor Cyan
$dumpArgs = @(
    "exec", $LOCAL_CONTAINER,
    "mysqldump",
    "-h", $SERVER_HOST,
    "-P", $SERVER_PORT,
    "-u", $SERVER_USER,
    "-p$SERVER_PASS",
    "--single-transaction",
    "--routines",
    "--triggers",
    "--add-drop-table",
    "--set-gtid-purged=OFF",
    $SERVER_DB
)
& docker @dumpArgs | Out-File -FilePath $DUMP_FILE -Encoding utf8
if ($LASTEXITCODE -ne 0) { Write-Host ">>> ERROR: Dump failed." -ForegroundColor Red; exit 1 }
Write-Host ">>> Dump saved: $DUMP_FILE" -ForegroundColor Gray

# ── Step 3: Copy dump into container ────────────────────────
Write-Host ">>> [2/4] Copying dump file into container..." -ForegroundColor Cyan
& docker @("cp", $DUMP_FILE, "${LOCAL_CONTAINER}:/tmp/server_dump.sql")
if ($LASTEXITCODE -ne 0) { Write-Host ">>> ERROR: docker cp failed." -ForegroundColor Red; exit 1 }

# ── Step 4: Import into local DB ────────────────────────────
Write-Host ">>> [3/4] Importing into local DB..." -ForegroundColor Cyan
$importCmd = "mysql -u$LOCAL_USER -p$LOCAL_PASS $LOCAL_DB < /tmp/server_dump.sql"
& docker @("exec", $LOCAL_CONTAINER, "bash", "-c", $importCmd)
if ($LASTEXITCODE -ne 0) { Write-Host ">>> ERROR: Import failed." -ForegroundColor Red; exit 1 }

# ── Step 5: Cleanup ──────────────────────────────────────────
Write-Host ">>> [4/4] Cleaning up..." -ForegroundColor Gray
& docker @("exec", $LOCAL_CONTAINER, "rm", "/tmp/server_dump.sql")
Remove-Item $DUMP_FILE -Force

Write-Host ">>> Sync complete! Local DB now mirrors the server." -ForegroundColor Green