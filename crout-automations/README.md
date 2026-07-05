# Crout Automations

Angular 20 frontend for the Crout Automations public site plus the client, developer, and admin portals.

## Stack

- Angular 20 standalone components
- SCSS
- Angular Router with nested shell routes
- Optional Angular Elements build for legacy WordPress embeds
- Docker Compose + Nginx for standalone SPA hosting

## Local development

```bash
npm install
npm start
```

The default local API target is `http://localhost:5000/api`.

## Production SPA build

```bash
npm run build
```

The production app is built to `dist/crout-automations/browser/`.

## Legacy Elements build

```bash
npm run build:elements
```

That build remains available for legacy WordPress/custom-element usage in [WORDPRESS-DEPLOY.md](C:\Users\User\Documents\GitHub\FinanceManager\Crout-Holdings\crout-automations\WORDPRESS-DEPLOY.md), but the main application routing now runs as a normal Angular SPA.

## Docker Compose hosting

### Files

- `Dockerfile`: multi-stage Angular build plus Nginx runtime
- `docker-compose.yml`: standalone SPA service
- `nginx.conf`: static hosting plus Angular deep-link fallback
- `docker/entrypoint.sh`: generates `env.js` from runtime variables
- `public/env.template.js`: runtime API URL template

### Environment configuration

Create a `.env` file next to `docker-compose.yml`:

```env
API_URL=https://api.example.com/api
SPA_PORT=8080
```

`API_URL` is injected into `/env.js` at container startup, so the same image can be reused across environments.

### Build and start

```bash
docker compose build
docker compose up -d
```

### Inspect status and logs

```bash
docker compose ps
docker compose logs -f
```

### Restart, stop, and redeploy

```bash
docker compose restart
docker compose down
git pull
docker compose build
docker compose up -d
```

## VPS deployment guide

### 1. Prepare the VPS

Install:

- Git
- Docker Engine
- Docker Compose plugin
- A public reverse proxy / TLS layer for HTTPS

Open firewall ports:

- `80/tcp`
- `443/tcp`

Do not expose a production SPA over plain HTTP only.

### 2. Clone and configure

```bash
git clone <YOUR_REPOSITORY_URL>
cd crout-automations
```

Create `.env`:

```env
API_URL=https://api.example.com/api
SPA_PORT=8080
```

### 3. Run the SPA container

```bash
docker compose build
docker compose up -d
```

Nginx inside the container serves the Angular build and falls back to `index.html` for deep links such as:

- `/client/dashboard`
- `/dev/dev-services/guide/?userServiceId=123`
- `/admin/users`
- `/services/quote-system`

### 4. Put HTTPS in front of it

Recommended production setup:

- terminate TLS at a reverse proxy on the VPS
- forward requests to `http://127.0.0.1:8080` or your chosen `SPA_PORT`
- keep SPA fallback behavior intact by forwarding all unmatched paths to the SPA container

If you already use Nginx Proxy Manager, Caddy, Traefik, or another reverse proxy on the VPS, point the selected site/domain there and proxy to the SPA container.

### 5. DNS through cPanel

The cPanel/WordPress filesystem and the VPS filesystem are unrelated. DNS only decides which server the domain resolves to.

Example:

```text
app.example.com -> VPS_PUBLIC_IP
```

In cPanel DNS Zone Editor:

1. Create or update an `A` record for the SPA domain or subdomain to the VPS public IPv4 address.
2. Add optional `www` handling if needed:
   `www.app.example.com -> app.example.com` as a `CNAME`, or a matching `A` record.
3. Remove or replace conflicting `A`, `CNAME`, forwarding, or parked-domain records for that same host.

Use placeholders only:

```text
Type: A
Name: app
Value: VPS_PUBLIC_IP
TTL: default
```

### 6. DNS verification

Browser check:

- open `https://app.example.com`

Command-line checks:

```bash
nslookup app.example.com
dig app.example.com
curl -I https://app.example.com
curl -I https://app.example.com/dev/dashboard
```

DNS propagation can take a few minutes to 48 hours depending on upstream caches and TTLs, though changes are often visible much sooner.

## Notes

- The SPA container does not include the API, database, or TLS proxy.
- The API can remain hosted separately as long as `API_URL` points to the correct public API origin.
- Deep-link refresh support depends on both the included Nginx fallback and any external reverse proxy passing requests through correctly.
