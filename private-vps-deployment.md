# Private VPS deployment

This runbook deploys the standalone Next.js container and PostgreSQL on a private Ubuntu VPS. It assumes you control a domain and can create DNS records. Use a managed PostgreSQL service instead of the container when you need provider-managed point-in-time recovery or do not want to operate a database.

## Recommended shape

```text
Internet -> Caddy HTTPS -> Docker app :3000 -> PostgreSQL volume
Telegram -> https://your-domain.example/api/telegram/webhook
```

Keep PostgreSQL private on the Docker network. Expose only ports 22, 80 and 443 through the VPS firewall.

## 1. Provision the VPS

Use a current Ubuntu LTS image with at least 2 vCPUs, 4 GB RAM and 40 GB SSD for a small cohort. Add a non-root deploy user, SSH keys, automatic security updates and a firewall.

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw unattended-upgrades
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Install Docker Engine and the Compose plugin from Docker's official Ubuntu instructions. Verify with `docker version` and `docker compose version`.

## 2. Point DNS

Create an `A` record such as `siwes.example.com` to the VPS public IPv4 address. Wait for DNS propagation before starting Caddy so certificate issuance can succeed.

## 3. Check out the repository

```bash
sudo mkdir -p /opt/siwes-companion
sudo chown "$USER":"$USER" /opt/siwes-companion
git clone https://github.com/divinefavourak/siwes-companion.git /opt/siwes-companion
cd /opt/siwes-companion
cp .env.example .env
chmod 600 .env
```

Set the existing four variables in `.env` with production values. `DATABASE_URL` is overridden by the Compose service in the included local stack; for a separately managed database, replace it with the provider's private connection string. Add provider-specific secrets directly on the VPS only when that feature is enabled.

## 4. Add Caddy

Create a `Caddyfile` beside the Compose file:

```text
siwes.example.com {
  reverse_proxy app:3000
}
```

Run Caddy as a separate container on the same Docker network, or install it as a system service. If you use a separate Compose file, attach both services to one external network and do not publish the app port publicly.

## 5. Build, migrate and start

```bash
docker compose build app
docker compose up -d postgres
docker compose --profile migrate run --rm migrator
docker compose up -d app
docker compose ps
curl -fsS https://siwes.example.com/api/health
```

If the app image cannot run Prisma CLI because the runner is standalone-only, run the migration from the builder/deploy environment before replacing the app container. Never use `prisma db push` as a production migration substitute after data exists.

## 6. Telegram webhook

Configure the bot token in the VPS secret store and register the HTTPS webhook with Telegram using the deployment URL. The handler verifies `X-Telegram-Bot-Api-Secret-Token`; use the bot token as the fallback secret only for a single-bot private deployment, or add a separate secret in the platform.

After deployment, send a test update through Telegram and confirm the webhook route returns 200. A duplicate update must return a successful duplicate response without creating a second entry.

## 7. Backups

- Back up the PostgreSQL volume/database daily to storage outside the VPS.
- Test restoring into a separate temporary database at least quarterly.
- Back up the environment secret inventory, not plaintext secret values.
- Use private object storage for evidence; do not put evidence files in the container filesystem.

## 8. Updates and rollback

```bash
cd /opt/siwes-companion
git fetch origin
git checkout main
git pull --ff-only origin main
docker compose build app
docker compose --profile migrate run --rm migrator
docker compose up -d app
docker compose logs --tail=200 app
```

For rollback, deploy the previous image/tag and only roll back migrations when there is a reviewed down-migration plan. Prefer backward-compatible additive migrations.

## 9. Operations checklist

- Monitor disk, RAM, CPU, container restarts, PostgreSQL connections and backup freshness.
- Keep logs free of raw student entries, tokens, signed URLs and matric numbers.
- Rotate `AUTH_SECRET` only with a planned session invalidation window.
- Rotate Telegram tokens through BotFather and update the VPS secret.
- Keep Docker, Ubuntu, Node base image and npm lockfile patched.
- Review [docs/08-security-and-privacy.md](./docs/08-security-and-privacy.md) before inviting real students.

## Design concerns

A single VPS is operationally simple but creates a single failure domain. Use managed PostgreSQL and off-site backups before treating it as production-critical. Vercel plus managed Postgres remains the default architecture in the main docs; this runbook is the private deployment option requested for handoff.
