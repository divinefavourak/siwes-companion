# Private VPS Deployment Runbook

This guide describes deploying SIWES Companion on a Linux VPS (Debian/Ubuntu) using Docker Compose, PostgreSQL 16, Cloudflare Tunnel (or reverse proxy), and the Telegram Bot webhook.

---

## 1. Architecture

```text
Internet -> Cloudflare Edge (SSL) -> Cloudflare Tunnel (or Reverse Proxy) -> Docker app:3000 -> PostgreSQL
Telegram -> https://swcompanion.akanbi.dev/api/telegram/webhook -> Next.js webhook route
```

- PostgreSQL runs in a private Docker volume (`siwes-postgres`) with no exposed public ports.
- Next.js runs in `standalone` mode on port `3000`.
- The database migrations are applied automatically by the `migrator` container before `app` boots.

---

## 2. Low-RAM VPS Optimizations (2GB VPS)

Images are built by GitHub Actions and pulled from GHCR. **Never build on a 2GB VPS**: a Next.js build needs 1–2 GB by itself and will exhaust memory. `docker-compose.yml` has no `build:` for the app or migrator, so `docker compose up` cannot start one by accident.

The settings below keep builds small wherever they do run:
1. **Docker Builder RAM Cap**: The Dockerfile builder sets `NODE_OPTIONS="--max-old-space-size=768"` to prevent memory spikes.
2. **Next.js Worker Cap**: `next.config.ts` sets `cpus: 1`, `workerThreads: false`, and `typescript: { ignoreBuildErrors: true }`.
3. **Dedicated Migrator**: The `migrator` stage does not compile Next.js, saving ~1.5 GB of RAM during boot.

---

## 3. Clone Repository & Configure Environment

```bash
git clone https://github.com/divinefavourak/siwes-companion.git /opt/siwes-companion
cd /opt/siwes-companion
cp .env.example .env
chmod 600 .env
nano .env
```

Configure:
```ini
POSTGRES_DB=siwes_companion
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/siwes_companion"

AUTH_SECRET="generate_with_openssl_rand_base64_32"
GROQ_API_KEY="gsk_..."
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
TELEGRAM_BOT_USERNAME="your_bot_username"
# Required. Generate with: openssl rand -hex 32 (only A-Z, a-z, 0-9, _ and - are allowed)
TELEGRAM_WEBHOOK_SECRET="your_webhook_secret"
```

---

## 4. Route via Cloudflare Tunnel

Add your hostname to `/etc/cloudflared/config.yml`:

```yaml
tunnel: <YOUR_TUNNEL_UUID>
credentials-file: /root/.cloudflared/<YOUR_TUNNEL_UUID>.json

ingress:
  - hostname: swcompanion.akanbi.dev
    service: http://localhost:3000
  - service: http_status:404
```

Create the DNS CNAME record and restart the tunnel:
```bash
cloudflared tunnel route dns <YOUR_TUNNEL_UUID> swcompanion.akanbi.dev
systemctl restart cloudflared
```

---

## 5. Pull, Migrate, and Start Stack

```bash
docker compose pull
docker compose up -d
```

The images are public, so no registry login is needed. If the pull fails with `denied`, an expired `ghcr.io` login is saved on the server: run `docker logout ghcr.io` and pull again.

Container startup order:
1. `postgres` boots and passes its healthcheck (`service_healthy`).
2. `migrator` applies pending Prisma migrations (`service_completed_successfully`).
3. `app` boots Next.js in production standalone mode on port 3000.

---

## 6. Configure Telegram Webhook & Slash Commands

Register the slash commands menu:
```bash
BOT_TOKEN=$(grep -E '^TELEGRAM_BOT_TOKEN=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d '\r')

curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      {"command": "log", "description": "Log the work you did today"},
      {"command": "today", "description": "See the entry for today"},
      {"command": "week", "description": "This week at a glance"},
      {"command": "skills", "description": "Skills and tools so far"},
      {"command": "defense", "description": "Practise panel questions"},
      {"command": "web", "description": "Open your dashboard on the web"},
      {"command": "email", "description": "Add your email"},
      {"command": "password", "description": "Set a password for the web app"},
      {"command": "settings", "description": "Programme and account"},
      {"command": "start", "description": "Home"},
      {"command": "help", "description": "All commands"},
      {"command": "cancel", "description": "Stop what you are doing"},
      {"command": "unlink", "description": "Disconnect Telegram"}
    ]
  }'
```

Set the webhook endpoint with the same secret the app verifies. The app rejects webhook calls with 401 when the `X-Telegram-Bot-Api-Secret-Token` header does not match `TELEGRAM_WEBHOOK_SECRET`, and with 503 when the secret is unset:
```bash
WEBHOOK_SECRET=$(grep -E '^TELEGRAM_WEBHOOK_SECRET=' .env | cut -d '=' -f2- | tr -d '"' | tr -d "'" | tr -d '\r')

curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://swcompanion.akanbi.dev/api/telegram/webhook\",
    \"secret_token\": \"${WEBHOOK_SECRET}\",
    \"drop_pending_updates\": true
  }"
```

---

## 7. Updates and Maintenance

To deploy new code from `main`, wait for the "Build and Push Docker Image" workflow to finish, then:
```bash
cd /opt/siwes-companion
git pull origin main
docker compose pull
docker compose up -d
```

To roll back, set `IMAGE_TAG=sha-<commit>` in `.env` (the short commit of the version you want) and run the last two commands again. Remove the line to return to `latest`.

To build from source on a machine with enough memory:
```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

Check health:
```bash
docker compose ps
docker compose logs -f app
curl -s https://swcompanion.akanbi.dev/api/telegram/webhook
```
