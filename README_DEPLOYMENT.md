# Crout Holdings Production Deployment

Production architecture:

Domain -> VPS IP -> Caddy :443 -> frontend/API Docker containers -> private MySQL

This stack deploys:

- `crout-automations/` as a static Angular SPA served by Nginx
- `crout-automations-api/CroutApi/` as an ASP.NET Core .NET 8 API
- `crout-automations-api/sql/` as the reviewed SQL migration source
- `mysql:8.3` on a private Docker network

Only Caddy is public. Only ports `80` and `443` should be reachable from the internet.

## Networking rules

DNS cannot point to a port. DNS records point only to an IP address.

Port `4200` is Angular development only. Do not expose `4200`, `5000`, `8080`, or `3306` publicly.

Containers communicate internally over Docker networks:

- `frontend` is reachable by Caddy on the `public` network
- `api` is reachable by Caddy on the `public` network and by MySQL on the `internal` network
- `db` is reachable only on the private `internal` network

## Ubuntu VPS setup

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw
curl -fsSL https://get.docker.com | sudo sh
docker --version
docker compose version
```

## Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

## Clone and configure

```bash
sudo mkdir -p /opt/crout-holdings
sudo chown -R $USER:$USER /opt/crout-holdings
cd /opt/crout-holdings
git clone https://github.com/AndyCR121/Crout-Holdings.git .
cp .env.production.example .env.production
nano .env.production
nano Caddyfile
chmod 600 .env.production
```

Replace both `YOUR_DOMAIN_HERE` placeholders in [Caddyfile](/C:/Users/User/Documents/GitHub/FinanceManager/Crout-Holdings/Caddyfile) with the real domain, for example:

```text
example.com, www.example.com
```

Do not include ports in the domain.

## Start

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

Service-specific logs:

```bash
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f frontend
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f db
```

## SQL migration process

The API uses a guarded numbered SQL migration runner. Do not run migrations automatically during API startup.

Safe production procedure:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api --apply-migrations --dry-run --allow-production
```

Review the output, then run:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api --apply-migrations --allow-production
```

Do not drop, recreate, or erase production data.

## DNS migration from WordPress hosting

Update the web records to point at the VPS:

| Record | Host | Value |
| --- | --- | --- |
| A | @ | VPS public IPv4 |
| A | www | VPS public IPv4 |

Rules:

- Do not include ports in DNS records.
- Do not point DNS to `:4200`.
- Preserve MX, SPF, DKIM, DMARC, and mail host records.
- DNS propagation depends on TTL.
- Caddy can obtain certificates only once the domain resolves to the VPS and ports `80` and `443` are reachable.

## Verification

Run:

```bash
curl -I https://YOUR_DOMAIN_HERE
curl -I https://YOUR_DOMAIN_HERE/api/health
```

Also test:

- `https://YOUR_DOMAIN_HERE/`
- `https://YOUR_DOMAIN_HERE/api/health`
- an Angular child route followed by a browser refresh

The browser refresh check matters because Nginx is configured with SPA fallback routing to `index.html`.

## Future deployments

```bash
cd /opt/crout-holdings
git pull origin main
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## Database backups

Persistent Docker volumes are not backups. Copy backups off the VPS after creating them.

```bash
mkdir -p /opt/crout-backups

docker exec crout-mysql \
  mysqldump \
  -u root \
  -pYOUR_DB_ROOT_PASSWORD \
  crout_automations \
  > /opt/crout-backups/crout_automations_$(date +%F).sql
```
