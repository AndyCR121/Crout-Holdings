#!/bin/bash
# sync-server-to-local.sh
# Pulls the server's crout_automations DB and injects it into the local Docker MySQL.
# Requires: mysql client & mysqldump installed locally.
#
# Fill in your server credentials:
SERVER_HOST="169.255.58.150"
SERVER_PORT="3306"
SERVER_USER="root"
SERVER_PASS="g3r7ufIzg1%h"
SERVER_DB="crout_automations"

# Local Docker credentials (matches docker-compose.yml):
LOCAL_HOST="localhost"
LOCAL_PORT="3306"
LOCAL_USER="root"
LOCAL_PASS="g3r7ufIzg1%h"
LOCAL_DB="crout_automations"

echo ">>> Dumping server DB..."
mysqldump \
  -h "$SERVER_HOST" \
  -P "$SERVER_PORT" \
  -u "$SERVER_USER" \
  -p"$SERVER_PASS" \
  --single-transaction \
  --routines \
  --triggers \
  --add-drop-table \
  --set-gtid-purged=OFF \
  "$SERVER_DB" > /tmp/server_dump.sql

echo ">>> Injecting into local DB..."
mysql \
  -h "$LOCAL_HOST" \
  -P "$LOCAL_PORT" \
  -u "$LOCAL_USER" \
  -p"$LOCAL_PASS" \
  "$LOCAL_DB" < /tmp/server_dump.sql

echo ">>> Done! Cleaning up..."
rm /tmp/server_dump.sql
echo ">>> Sync complete."