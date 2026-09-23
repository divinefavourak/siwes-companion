# SIWES Companion handoff

## Current state

The repository is a runnable Next.js App Router application with PostgreSQL/Prisma persistence, a premium mobile-first Milestone 01 web flow, a grounded AI provider boundary, secure Telegram linking/logging adapter, full documentation set, Docker deployment artifacts, and deterministic core coverage at 100%.

## Working features

- Local demo mode works without a database or provider key.
- Programme setup supports 3/6 months, dates, placement details and Monday-Friday defaults.
- Dashboard calculates working-day progress and shows phase-aware locked areas.
- Daily flow autosaves raw text locally, captures it idempotently, generates a grounded draft, supports review/edit/save, and handles version conflicts.
- Weekly history shows saved and missing working days.
- Groq is the primary provider when `GROQ_API_KEY` is present; Anthropic is supported when `ANTHROPIC_API_KEY` is present; local mode uses a deterministic fake provider.
- Telegram webhook, single-use hashed web-to-Telegram linking, `/today`, `/log`, `/cancel`, callbacks and duplicate update protection are wired to the shared core.
- Prisma schema and initial migration cover future summaries, evidence, reports, presentation, defense, jobs, audit and usage records.

## Verification commands

```bash
npm ci
npm run typecheck
npm run lint
npm run test:coverage
npm run build
```

The build uses a local placeholder PostgreSQL URL only for Prisma client generation when no real `.env` exists. Runtime persistence requires a reachable PostgreSQL database.

## Start locally

```bash
cp .env.example .env
docker compose up -d postgres
npm run db:deploy
npm run dev
```

The local demo fallback is useful for UI work, but use PostgreSQL before testing persistence, auth, Telegram or jobs.

## Known limitations

- Auth.js production identity providers need Google credentials configured in the hosting secret store; local mode intentionally exposes a demo path only outside production.
- Telegram-to-web setup wizard, evidence uploads, summaries, report editor, exports, presentation editor, reminders and Defense Center are documented and schema-ready but not yet implemented as user-facing vertical slices.
- The current in-memory fallback is process-local and is not a production data store.
- Export layout cannot be finalized until the institution sample logbook is supplied.
- Current model IDs/prices are intentionally `verify-at-build-time`; verify official Anthropic documentation before enabling paid production calls.

## Important safety rule

Never weaken grounding to make an entry sound more impressive. Raw input, generated output and edited output must remain separate. The router observation test is a release gate.

## Commit history

Work is on `main` in focused commits. Continue with the same style and push after each verified focused change.

## Next coding sequence

1. Add production Auth.js Google/email provider configuration and account tests.
2. Add working-day settings and Telegram setup wizard.
3. Add Evidence Vault with signed uploads and quarantine scanning.
4. Add weekly/monthly summary jobs and editor.
5. Add report/presentation/export workers.
6. Add Defense Center and mock-defense evaluation.

## Cross-references

Start with [docs/18-implementation-roadmap.md](./docs/18-implementation-roadmap.md), then [private-vps-deployment.md](./private-vps-deployment.md).
