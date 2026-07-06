# Crout Holdings Production Deployment

This deployment serves the Angular SPA and ASP.NET Core API behind Caddy, with MySQL on a private Docker network.

## Topology

- `https://YOUR_DOMAIN_HERE/` -> Caddy -> frontend Nginx -> Angular SPA
- `https://YOUR_DOMAIN_HERE/api/...` -> Caddy -> ASP.NET Core API
- MySQL is reachable only on the internal Docker network

Only Caddy publishes host ports `80` and `443`.

## VPS assumptions

- Ubuntu VPS
- Docker Engine installed
- Docker Compose plugin installed
- Git installed
- Public DNS for the target domain

## Install and verify Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg git ufw
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
docker --version
docker compose version
git --version
```

## Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Do not open `3306`, `8080`, `4200`, or any other application port.

## Clone location

```bash
sudo mkdir -p /opt/crout-holdings
sudo chown "$USER":"$USER" /opt/crout-holdings
git clone <YOUR_REPOSITORY_URL> /opt/crout-holdings
cd /opt/crout-holdings
```

## Create the production environment file

```bash
cp .env.production.example .env.production
```

Set every placeholder in `.env.production` before the first deployment.

Do not commit `.env.production`.

## Replace the domain placeholder

Edit [Caddyfile](C:\Users\User\Documents\GitHub\FinanceManager\Crout-Holdings\Caddyfile) and replace both instances of `YOUR_DOMAIN_HERE` with the real production domain.

Example:

```text
example.com, www.example.com
```

Do not add ports to the domain.

## Build and start

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## Operational commands

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

## DNS

DNS records point to IP addresses, not ports.

Create or update:

```text
A  @    -> VPS_PUBLIC_IP
A  www  -> VPS_PUBLIC_IP
```

Preserve MX, SPF, DKIM, DMARC, and other email records.

Remove or replace only conflicting web records that currently direct the site elsewhere, including WordPress-related web records if they still own the same hostnames.

Do not put `:4200`, `:8080`, `:3306`, or any other port in DNS.

## Validation after deployment

1. Confirm DNS resolves to the VPS IP.
2. Open `https://YOUR_DOMAIN_HERE`.
3. Open `https://YOUR_DOMAIN_HERE/api/health`.
4. Refresh deep links such as `/services`, `/admin`, and portal routes.
5. Restart the stack and confirm MySQL data persists.
6. Confirm only Caddy exposes host ports.

Useful checks:

```bash
docker compose -f docker-compose.prod.yml ps
docker ps --format 'table {{.Names}}\t{{.Ports}}'
curl -I https://YOUR_DOMAIN_HERE
curl https://YOUR_DOMAIN_HERE/api/health
```

## Updating later

```bash
cd /opt/crout-holdings
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## Schema updates

The API does not use EF Core migrations. It uses the guarded SQL updater built into `CroutApi`.

Safe production sequence:

1. Back up MySQL.
2. Run a dry run and review pending scripts.
3. Apply only after explicit approval.
4. Review updater output and API logs.

Dry run:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api \
  dotnet CroutApi.dll --apply-migrations --dry-run --allow-production
```

Apply:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api \
  dotnet CroutApi.dll --apply-migrations --allow-production
```

The updater resolves SQL scripts from the published image content, reads the normal `DB_*` variables, records successful scripts in `SchemaMigrations`, and ignores non-executable review scripts such as `08_schema_only_local_parity.sql`.

Do not drop, recreate, truncate, or reset the production database as part of normal deployment.

## Backups

Docker named volumes are not backups.

Take logical backups from the MySQL container:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T mysql \
  sh -c 'mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  > crout_automations_$(date +%F_%H%M%S).sql
```

Before any restore, take another backup of the current database first.

Store backups encrypted and off the VPS.
