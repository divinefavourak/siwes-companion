# 10. Backend implementation guide

## Purpose

Translate the architecture and API contracts into modular TypeScript modules that can be called from web and Telegram.

## Folder structure

```text
src/core/{entries,siwes,ai,telegram,jobs,shared}/
src/adapters/web/              HTTP/session mapping
src/adapters/telegram/        grammY mapping and keyboards
src/lib/prisma.ts             one lazy Prisma client
src/lib/env.ts                minimal validated environment
src/lib/logger.ts             redacted structured logging
app/api/                      route handlers only
```

## Service/repository rule

Routes authenticate and parse. Services enforce policy. Repositories perform owner-scoped persistence. Providers call external systems. No route handler may contain a second version of daily-entry logic.

## Configuration

| Variable | Required | Use |
| --- | --- | --- |
| `DATABASE_URL` | production | PostgreSQL connection. |
| `AUTH_SECRET` | production | Auth.js session/signing secret. |
| `ANTHROPIC_API_KEY` | optional locally, production for AI | LLM provider key. |
| `TELEGRAM_BOT_TOKEN` | optional locally, production for bot | grammY token. |

Optional model/storage/worker values have safe code defaults in development and should be set through the deployment platform without expanding `.env.example` unless a feature becomes mandatory.

## Error conventions

Throw `AppError` with stable code and safe details. Route handlers map it to the API error contract and include a request ID. Unexpected errors are logged server-side with stack trace and returned as a generic 500.

## Transactions and retries

- Create programme and supervisors in one transaction.
- Consume link token and create Telegram identity in one transaction.
- Save generated entry and LLM usage in one transaction.
- Use exponential backoff for jobs; cap attempts and retain safe error code.
- Never retry a generation blindly from a client reconnect; require idempotency.

## LLM wrapper

The wrapper sets timeout, max tokens, provider/model, JSON schema validation, one repair retry and usage recording. It receives already-authorized structured context and does not query the database itself.

## Telegram wiring

The webhook route checks the secret, constructs a grammY `Bot`, records `update_id`, and delegates to `telegramAdapter.handleUpdate`. Local polling is a separate script that uses the same adapter.

## Example service flow

```ts
export async function createEntryAndGenerate(input: CaptureDailyNoteInput) {
  const entry = await captureDailyNote(entryRepository, input);
  try {
    return await generateEntry(entryRepository, llmEntryGenerator, input.userId, entry.id);
  } catch (error) {
    if (error instanceof AppError && error.code === "AI_UNAVAILABLE") {
      return entryRepository.findOwnedById(input.userId, entry.id);
    }
    throw error;
  }
}
```

## Weekly rollup

1. Determine week boundaries in programme timezone.
2. Read only owner-scoped SAVED entries.
3. Build compact structured context and source IDs.
4. Generate/validate summary.
5. Upsert unique `(programmeId, weekStartDate)` summary.
6. Preserve edited text if a later regeneration is explicitly requested.

## Logging

Log event name, request ID, route, latency, status, user-independent entity hash and provider timing. Do not log raw notes, generated paragraphs, tokens, evidence URLs or email/matric values.

## Design concerns

The core database job table is intentionally simple. At high throughput it may need a dedicated queue, but introducing Redis before the daily loop needs it would increase operational cost and failure modes.

## Open questions

- Do production deployments need a separate always-on worker before report generation ships?
- Which structured logger and error tracker fit the budget and privacy requirements?

## Cross-references

See [03-system-architecture.md](./03-system-architecture.md), [05-api-specification.md](./05-api-specification.md), [06-ai-llm-design.md](./06-ai-llm-design.md), and [07-telegram-bot-design.md](./07-telegram-bot-design.md).
