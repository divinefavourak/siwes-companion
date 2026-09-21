# 13. Infrastructure, DevOps and deployment

## Purpose

Define environments, CI/CD, migrations, monitoring, backups, deployment choices and cost planning for a solo developer.

## Decisions

- Vercel is the default web host, managed PostgreSQL is separate, and private S3-compatible storage is separate.
- A small worker process or scheduled route executes database jobs. Long LLM calls and exports do not block webhook handlers.
- Docker is provided for an all-in-one Node deployment and for the private VPS handoff.
- Work happens on `main` with tiny focused commits for this early solo project; protected branch rules can be added when collaborators join.

## Environments

| Environment | Purpose | Data policy |
| --- | --- | --- |
| Local | Fast development with Docker Postgres | Demo/non-sensitive data only. |
| Staging | Preview branches and AI/provider contract checks | Synthetic or consented test data. |
| Production | Real students | Backups, alerts, least privilege, reviewed processors. |

## CI/CD pipeline

1. Checkout and install from lockfile.
2. Typecheck, lint, unit/coverage tests.
3. Prisma validate and migration check.
4. Build Next standalone output.
5. Run integration/e2e tests against disposable PostgreSQL.
6. Deploy preview or production.
7. Run `prisma migrate deploy` as a controlled release step.

## Branching and commits

Until a team exists, small commits land on `main`: `feat: ...`, `fix: ...`, `test: ...`, `docs: ...`, `chore: ...`. Never combine schema, UI redesign and deployment changes in one commit.

## Backups and restore

- Managed PostgreSQL daily backups plus point-in-time recovery if available.
- Object storage versioning/lifecycle rules for evidence.
- Quarterly restore drill to a temporary database and bucket; record duration and data checks.
- Restore never points production at a backup without an explicit runbook and approval.

## Monitoring

Track web error rate, p95 API latency, database connections, job age/failures, LLM timeout/invalid JSON rate, Telegram webhook 5xx rate, storage failures and cost per active student.

## Cost planning

Exact provider prices and free-tier limits change; verify them at deployment time. Plan three scenarios:

| Scale | Likely infrastructure shape | Cost drivers |
| --- | --- | --- |
| 100 users | Vercel hobby/low paid tier, small managed Postgres, low-volume storage | Email, LLM daily calls, database minimums. |
| 1,000 users | Paid web/database tiers, worker process, alerts and backup retention | Concurrent generation, storage, bandwidth, LLM output. |
| 10,000 users | Dedicated queue/worker, connection pooling, separate observability and storage lifecycle | Database connections, report/export jobs, LLM usage, support and compliance. |

Use measured token counts from `LlmUsage`; never promise a fixed cost from a model name alone.

## Free-tier limits to watch

Verify current limits for Vercel functions, managed Postgres storage/connections, object storage requests/egress, Telegram bot API, email provider sends and Anthropic quotas. Put spend alerts and per-user budgets in place before public sign-up.

## Open questions

- Which managed Postgres provider is selected for production?
- Does the first cohort justify a dedicated worker or can a scheduled route run jobs safely?

## Cross-references

See [03-system-architecture.md](./03-system-architecture.md), `Dockerfile`, `private-vps-deployment.md`, and [15-observability-and-operations.md](./15-observability-and-operations.md).
