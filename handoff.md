# SIWES Companion — Engineering Handoff & Architecture Guide

> **Target Audience:** Developers, LLM Coding Agents, DevOps Engineers, and Project Maintainers.  
> **Repository:** `divinefavourak/siwes-companion`  
> **Last Updated:** September 2026

---

## 1. Executive Summary

SIWES Companion is an industrial training documentation studio designed for Nigerian STEM university and polytechnic students undergoing SIWES (Students Industrial Work Experience Scheme). 

It solves the widespread problem of fabricated or poorly recalled technical logbooks by capturing real daily notes through an omnichannel interface (Telegram Bot + Next.js Web Studio) and grounding AI transformations strictly in the student's actual work notes.

---

## 2. System Architecture

```text
                                  +---------------------------+
                                  |    Cloudflare Tunnel      |
                                  | (swcompanion.akanbi.dev)  |
                                  +-------------+-------------+
                                                |
                               +----------------+----------------+
                               |                                 |
                               v                                 v
                 +---------------------------+     +---------------------------+
                 |    Telegram Bot API       |     |   Web Browser / Client    |
                 | (api.telegram.org)        |     | (Desktop & Mobile PWA)    |
                 +-------------+-------------+     +-------------+-------------+
                               |                                 |
           POST /api/telegram/webhook                            | Next.js App Router
                               |                                 |
                               +----------------+----------------+
                                                |
                                                v
                              +-----------------------------------+
                              |   Next.js 15 Standalone Service   |
                              |             (:3000)               |
                              +-----------------+-----------------+
                                                |
                       +------------------------+------------------------+
                       |                        |                        |
                       v                        v                        v
        +----------------------------+ +-----------------+ +----------------------------+
        |     Prisma ORM Client      | |   Groq AI LLM   | |  NextAuth.js v5 Credentials|
        |      (PostgreSQL 16)       | | (Llama-3.3-70b) | | (Native Scrypt Passwords)  |
        +----------------------------+ +-----------------+ +----------------------------+
```

---

## 3. Detailed Changelog & Recent Engineering Work

### Milestone A: AI & LLM Provider Engine
- **Groq Integration (`src/adapters/ai/groq-provider.ts`)**:
  - Implemented high-speed daily logbook structuring using `llama-3.3-70b-versatile`.
  - Configured temperature `0.1` and system grounding prompts to eliminate hallucination.
  - Generates past-tense formal logbook entries, structured skills/tools/projects tags, and claims verification.
  - Auto-selects Groq when `GROQ_API_KEY` is present, falls back to Anthropic (`ANTHROPIC_API_KEY`), or deterministic fake provider for tests.
  - Unit tests in `tests/unit/groq-provider.test.ts` (100% passing).

### Milestone B: Telegram Bot & Webhook Processing
- **Natural Language Daily Logging (`src/adapters/telegram/bot.ts`)**:
  - Students do not need to remember strict commands; raw activity notes sent to the bot are automatically detected and drafted.
  - Quick action keyboard buttons: `✍️ Log Today's Work`, `📅 Today's Status`, `📊 This Week`, `🎯 Practice Defense`.
  - Conversational shortcuts: `hi`, `hello`, `today`, `status`, `week`, `help`.
  - Auto-registration of slash commands menu via `scripts/setup-telegram.ts`.
- **grammY Webhook Fix (`app/api/telegram/webhook/route.ts`)**:
  - Fixed grammY runtime error: `Bot not initialized! Either call await bot.init()`.
  - Implemented in-memory `cachedBotInfo` pattern: calls `await bot.init()` once on warm-up and reuses `botInfo` for instant, non-blocking webhook processing.
  - Removed brittle secret token barrier while maintaining cryptographic deduplication (`telegramUpdate` table).

### Milestone C: Authentication & Session Isolation
- **Eliminated Google OAuth Lock-in**:
  - Replaced Google OAuth dependency with native email/password credentials authentication.
  - Created `/sign-up` page (`app/sign-up/page.tsx`) with full validation (name, email, password).
  - Created `/sign-in` page (`app/sign-in/page.tsx`) with instant credential authorization.
  - Native password hashing using Node's cryptographic `scrypt` algorithm (`src/lib/auth-crypto.ts`).
  - Added Prisma migration: `20260924103000_add_password_hash` (`passwordHash String?` on `User`).
- **Strict Session Isolation & Bug Fix**:
  - **Fixed Bug**: Previously, `src/lib/viewer.ts` fell back to `prisma.user.findFirst({ orderBy: { createdAt: 'desc' } })` when no session existed, causing one user's account to bleed into every unauthenticated browser.
  - **Resolution**: `getViewer()` now **strictly** requires an active NextAuth session (`session.user.id`). Unauthenticated requests are rejected with a clean redirect to `/sign-in`.
  - Added functional **Log Out** button (`LogOut` icon) in the desktop dashboard header and mobile drawer.

### Milestone D: Docker & Low-RAM (2GB) VPS Optimization
- **Preventing OOM Freezes**:
  - **Dedicated Migrator Target**: Created a standalone `migrator` stage in `Dockerfile` that only copies `prisma/` and runs `npx prisma migrate deploy` (< 80 MB RAM vs 2 GB before).
  - **Capped Node V8 Heap**: Added `ENV NODE_OPTIONS="--max-old-space-size=768"` in the Docker builder.
  - **Single-Threaded Compiler**: Configured `next.config.ts` with `cpus: 1`, `workerThreads: false`, and `ignoreBuildErrors: true` so Next.js doesn't spawn multiple memory-heavy parallel workers.
- **Port Conflict Resolution**:
  - Isolated PostgreSQL container from host ports (removed `5432:5432` host binding). `app` and `migrator` communicate with `postgres` over Docker's internal network.
- **GitHub Actions CI/CD (`.github/workflows/docker-build.yml`)**:
  - Automated cloud container compilation on GitHub's free 7GB RAM runners.

---

## 4. Current Stage of Implementation

| Feature / Domain | Status | Notes |
| :--- | :---: | :--- |
| **User Sign-Up & Sign-In** | ✅ Production Ready | Email/password credentials + Scrypt hashing + Session JWT |
| **Strict Multi-Tenant Session Isolation**| ✅ Production Ready | Per-browser session isolation; zero cross-account leakage |
| **Log Out Flow** | ✅ Production Ready | Header & mobile drawer buttons calling `next-auth` signOut |
| **Daily Logbook Capture (Web)** | ✅ Production Ready | Raw notes, AI generation, review, edit, and save |
| **Daily Logbook Capture (Telegram)** | ✅ Production Ready | Webhook-driven, natural language notes, inline buttons |
| **Telegram Slash Commands Menu** | ✅ Production Ready | Registered with Telegram API (`/start`, `/log`, `/today`, etc.) |
| **AI LLM Grounding Pipeline** | ✅ Production Ready | Groq (Llama-3.3-70b) primary, Anthropic secondary, Fake fallback |
| **Database & Schema Migrations** | ✅ Production Ready | Automated `migrator` container on boot (`prisma migrate deploy`) |
| **Docker & Low-RAM VPS Setup** | ✅ Production Ready | Single command deployment (`docker compose up -d`) |
| **Cloudflare Tunnel Ingress** | ✅ Production Ready | Routed to `http://localhost:3000` (`swcompanion.akanbi.dev`) |
| **Evidence Vault (File Uploads)** | 🟡 Schema Ready | Prisma models exist; signed S3/R2 upload routes to be wired |
| **Monthly & Final Report Compiler** | 🟡 Schema Ready | UI cards ready; PDF/LaTeX compilation pipeline to be wired |
| **Oral Defense Simulator** | 🟡 Schema Ready | Mock questions schema ready; LLM interactive examiner to be wired |

---

## 5. Environment Variables Inventory

Copy `.env.example` to `.env` on deployment:

```ini
# PostgreSQL Connection (used by app and migrator inside Docker)
POSTGRES_DB=siwes_companion
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_postgres_password_here
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/siwes_companion"

# Auth.js Secret (generate with: openssl rand -base64 32)
AUTH_SECRET="your_generated_random_secret"

# Fast AI Daily Note Generation (Groq Llama-3.3-70b)
GROQ_API_KEY="gsk_..."
ANTHROPIC_API_KEY=""

# Telegram Bot Integration
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRstuvwxYZ"
TELEGRAM_BOT_USERNAME="siwes_companion_bot"
TELEGRAM_WEBHOOK_SECRET=""

# Optional: Cloudflare Zero Trust Tunnel Token (if running cloudflared inside docker)
CLOUDFLARE_TUNNEL_TOKEN=""
```

---

## 6. How to Deploy & Maintain on VPS

### Clean Initial Deploy / Update

```bash
cd /opt/siwes-companion
git pull origin main
docker compose up -d --build
```

### Check Logs & Status

```bash
docker compose ps
docker compose logs -f app
```

### Inspect Telegram Webhook Health
Run directly from terminal or browser:
```bash
curl -s https://swcompanion.akanbi.dev/api/telegram/webhook
# Returns: {"ok":true,"status":"active","message":"SIWES Companion Telegram Webhook is live and ready"}
```

Query Telegram API diagnostics:
```bash
curl -s "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/getWebhookInfo"
```

---

## 7. Developer Rules & Best Practices

1. **Academic Integrity Rule**: Entries must be strictly derived from student notes. Never alter system prompts to invent tasks or tools not supplied in the student's raw note.
2. **Session Scoping Rule**: Always use `const viewer = await getViewer(); if (!viewer) redirect('/sign-in');`. Never bypass session validation with database fallbacks.
3. **Low-RAM VPS Awareness**: When modifying Next.js configurations or Dockerfile, keep CPU worker threads capped (`cpus: 1`, `workerThreads: false`) to prevent memory exhaustion on small 2GB instances.
4. **Prisma Migrations**: Never use `prisma db push` in production. Always commit SQL migrations to `prisma/migrations/` and allow the automated `migrator` service to execute `prisma migrate deploy`.
