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

If deploying to a 2GB RAM VPS or container (LXC/OpenVZ):
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

## 5. Build, Migrate, and Start Stack

Run with a single command:
```bash
docker compose up -d --build
```

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
      {"command": "today", "description": "View today status & logbook entry"},
      {"command": "log", "description": "Capture daily work activity note"},
      {"command": "week", "description": "Review this week entries & rollup"},
      {"command": "skills", "description": "List acquired technical skills & tools"},
      {"command": "defense", "description": "Practice mock oral defense questions"},
      {"command": "settings", "description": "View programme schedule & Telegram link"},
      {"command": "start", "description": "Onboard or restart conversation"},
      {"command": "help", "description": "View available commands & guide"},
      {"command": "cancel", "description": "Cancel active draft or flow"},
      {"command": "unlink", "description": "Disconnect Telegram"}
    ]
  }'
```

Set the webhook endpoint:
```bash
curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://swcompanion.akanbi.dev/api/telegram/webhook",
    "drop_pending_updates": true
  }'
```

---

## 7. Updates and Maintenance

To deploy new code from `main`:
```bash
cd /opt/siwes-companion
git pull origin main
docker compose up -d --build app
```

Check health:
```bash
docker compose ps
docker compose logs -f app
curl -s https://swcompanion.akanbi.dev/api/telegram/webhook
```
