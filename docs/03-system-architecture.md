# 03. System architecture

## Purpose

Describe the deployable services, module boundaries, channel adapter contract, critical sequences and failure behavior.

## Scope

The architecture covers the web app, Telegram webhook, PostgreSQL, object storage, LLM providers, scheduled jobs and exports. It does not require a second microservice for Milestone 01.

## Decisions

- One Next.js application owns web pages and authenticated route handlers.
- Core services are pure TypeScript modules behind repository/provider ports.
- grammY runs in the Telegram route handler and calls core services through `src/adapters/telegram`.
- PostgreSQL jobs are claimed by a worker endpoint/process; serverless requests enqueue rather than wait on long work.
- LLM calls are provider-abstracted and schema-validated at the boundary.

## Context diagram

```mermaid
flowchart TB
  Student --> Web[Next.js web adapter]
  Student --> Telegram[Telegram adapter / grammY]
  Web --> Core[Shared domain and application services]
  Telegram --> Core
  Core --> DB[(PostgreSQL / Prisma)]
  Core --> Storage[(S3-compatible private storage)]
  Core --> LLM[Provider-abstracted LLM]
  Core --> Jobs[Database job queue]
  Jobs --> Worker[Worker / scheduled route]
  Worker --> Core
```

## Container diagram

```mermaid
flowchart LR
  subgraph App[Next.js application]
    Pages[Server components + client UI]
    Routes[Route handlers / server actions]
    WebAdapter[Web adapter]
    TelegramAdapter[Telegram adapter]
    Core[Core services]
    Repos[Prisma repositories]
    Providers[AI, storage, clock, mail ports]
  end
  Pages --> WebAdapter
  Routes --> WebAdapter
  Routes --> TelegramAdapter
  WebAdapter --> Core
  TelegramAdapter --> Core
  Core --> Repos
  Core --> Providers
  Repos --> DB[(PostgreSQL)]
  Providers --> LLM[Anthropic or other LLM]
  Providers --> S3[S3/R2]
```

## Component boundaries

| Module | Owns | Must not own |
| --- | --- | --- |
| `src/core/siwes` | Programme validation, active programme policy, calendar inputs | HTTP, Telegram formatting |
| `src/core/entries` | Capture, generation state, optimistic versioning, entry provenance | Prisma query syntax, Telegram messages |
| `src/core/ai` | Prompt contracts, output validation, provider calls, redaction policy | User authorization and persistence |
| `src/core/telegram` | Link-token policy and channel-neutral conversation state | grammY update parsing |
| `src/core/jobs` | Queue lifecycle, retry/backoff and idempotency | Hosting scheduler implementation |
| `src/adapters/web` | Authenticated request parsing and response mapping | Business decisions |
| `src/adapters/telegram` | Update parsing, keyboard rendering and message chunking | Direct database writes |
| `src/lib` | Prisma client, env parsing, logging | Product policy |

## Critical sequences

### Sign-in and programme load

```mermaid
sequenceDiagram
  Browser->>Auth.js: Sign in
  Auth.js->>Provider: OAuth or email verification
  Provider-->>Auth.js: Identity
  Auth.js->>DB: Upsert User + session
  Browser->>Dashboard: Request with session cookie
  Dashboard->>Core: getActiveProgramme(userId)
  Core->>DB: Owner-scoped query
  DB-->>Dashboard: Programme or empty state
```

### Create programme

```mermaid
sequenceDiagram
  Browser->>Web adapter: POST /api/siwes
  Web adapter->>Zod: Validate body
  Web adapter->>Core: createProgramme(userId, input)
  Core->>DB: Check active programme
  Core->>DB: Create programme and supervisors transactionally
  DB-->>Core: Programme
  Core-->>Browser: 201 response
```

### Generate and save entry

```mermaid
sequenceDiagram
  Channel->>Core: captureDailyNote
  Core->>DB: Upsert programme/date entry
  Channel->>Core: generateEntry
  Core->>DB: Mark PENDING
  Core->>AI: Generate structured draft
  AI-->>Core: Valid output or clarification
  Core->>DB: Store generated text + structured data
  Channel->>Core: saveEditedEntry(version)
  Core->>DB: UPDATE ... WHERE version = expected
  DB-->>Core: Saved or conflict
```

### Telegram linking

```mermaid
sequenceDiagram
  Browser->>Core: Create link token
  Core->>DB: Store SHA-256 hash + expiry
  Browser-->>Student: t.me/bot?start=token
  Student->>Telegram: Open deep link
  Telegram->>Bot: /start token
  Bot->>Core: Consume token with Telegram identity
  Core->>DB: Transactionally verify unused token and unique identity
  DB-->>Bot: Linked user
```

### Monthly summary and report

```mermaid
sequenceDiagram
  Scheduler->>Core: enqueue summary job
  Core->>DB: Queue idempotent Job
  Worker->>DB: Claim job lease
  Worker->>Core: Build structured month context
  Core->>AI: Generate summary
  AI-->>Core: Valid summary
  Core->>DB: Save source IDs + generated text
  Worker->>DB: Mark success
```

### Mock defense turn

```mermaid
sequenceDiagram
  Student->>Channel: Start / answer
  Channel->>Core: create or continue session
  Core->>DB: Load compact session memory + reviewed records
  Core->>AI: Generate grounded question/follow-up
  AI-->>Core: Question or feedback
  Core->>DB: Save turn
  Channel-->>Student: Next question / actionable feedback
```

## Deployment topology

```text
Browser / Telegram -> HTTPS -> Vercel Next.js
                               |-> Neon/Supabase Postgres
                               |-> Cloudflare R2
                               |-> Anthropic API
                               `-> scheduled worker route or small VPS worker
```

Vercel function timeouts and cold starts mean daily generation should have a short timeout and a raw-save fallback. Exports and large reports are jobs. A private VPS deployment is documented separately in `private-vps-deployment.md`.

## Environments

| Environment | Database | Storage | Provider behavior |
| --- | --- | --- | --- |
| Local | Docker PostgreSQL | local adapter or MinIO | fake generator unless API key is intentionally set |
| Staging | isolated managed PostgreSQL | isolated bucket | real provider with low quotas and redacted logs |
| Production | managed PostgreSQL with backups | private bucket with lifecycle rules | configured models, limits and alerts |

## Failure modes

- Database unavailable: show retryable error; retain local draft; do not claim a save.
- LLM timeout/invalid JSON: mark generation failed, keep raw note, offer retry and edit manually.
- Telegram duplicate update: ignore already-recorded `update_id`.
- Concurrent edit: return 409 with latest version and let the student choose merge/overwrite.
- Storage failure: persist evidence metadata as pending only if upload can resume; never expose an unverified URL.
- Job lease timeout: reclaim after lease interval; idempotency key prevents duplicate outputs.

## Open questions

- Should the production worker be a small always-on VPS process or a provider-native scheduled function?
- Which email provider meets the first cohort's delivery and cost needs?

## Cross-references

See [04-database-design.md](./04-database-design.md), [05-api-specification.md](./05-api-specification.md), [10-backend-implementation-guide.md](./10-backend-implementation-guide.md), and [13-infrastructure-devops-and-deployment.md](./13-infrastructure-devops-and-deployment.md).
