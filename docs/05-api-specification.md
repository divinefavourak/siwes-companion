# 05. API specification

## Purpose

Define the authenticated surface used by web and Telegram adapters and the shared service contracts beneath it.

## Scope

Milestone 01 endpoints are complete below; later endpoints are reserved and follow the same owner-scoped, Zod-validated convention.

## Conventions

- JSON requests and responses use `application/json`.
- Authentication is the Auth.js session for web and a linked Telegram identity for bot calls.
- Every route validates path, query and body inputs with Zod.
- Mutations accept `Idempotency-Key` where a retry can create work or cost money.
- Cursor pagination uses opaque `nextCursor`; default page size 20, maximum 100.
- Errors use `{ error: { code, message, requestId, details? } }`.

## Endpoint catalogue

| Method and path | Auth | Purpose |
| --- | --- | --- |
| `GET /api/health` | public | Liveness only; does not expose dependency secrets. |
| `GET /api/siwes/current` | session | Load active programme and progress. |
| `POST /api/siwes` | session | Create programme. |
| `GET /api/entries?from&to` | session | List owner entries in date range. |
| `POST /api/entries` | session | Upsert raw daily note. |
| `POST /api/entries/:id/generate` | session | Generate grounded draft. May enqueue when async mode is enabled. |
| `PATCH /api/entries/:id` | session | Save edited text with expected version. |
| `POST /api/telegram/link-token` | session | Create short-lived web-to-Telegram token. |
| `POST /api/telegram/unlink` | session | Revoke Telegram identity after confirmation. |
| `POST /api/telegram/webhook` | Telegram secret | Receive grammY updates; returns quickly after idempotent acceptance. |
| `POST /api/summaries/monthly` | session | Enqueue or generate a month summary. |
| `GET /api/report` | session | Read report sections and provenance. |
| `POST /api/report/generate` | session | Enqueue report generation. |
| `POST /api/defense/sessions` | session/Telegram | Start a mock defense session. |
| `POST /api/defense/sessions/:id/turns` | session/Telegram | Submit answer and get next turn. |

## Zod-style contracts

```ts
const createProgrammeRequest = createProgrammeSchema.omit({ userId: true });

const captureEntryRequest = z.object({
  workDate: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  rawText: z.string().trim().min(3).max(5000),
  source: z.enum(["WEB", "TELEGRAM", "VOICE", "IMPORT"]).default("WEB")
});

const saveEntryRequest = z.object({
  editedText: z.string().trim().min(1).max(5000),
  expectedVersion: z.number().int().positive()
});

const entryResponse = z.object({
  id: z.string(),
  workDate: z.string(),
  rawText: z.string(),
  generatedText: z.string().nullable(),
  editedText: z.string().nullable(),
  status: z.enum(["DRAFT", "READY_FOR_REVIEW", "SAVED", "ARCHIVED"]),
  generationStatus: z.enum([
    "NOT_REQUESTED", "PENDING", "COMPLETED", "NEEDS_CLARIFICATION", "FAILED"
  ]),
  version: z.number().int()
});
```

## Internal service interfaces

```ts
interface ProgrammeService {
  createProgramme(userId: string, input: CreateProgrammeInput): Promise<Programme>;
  getActiveProgramme(userId: string): Promise<Programme | null>;
}

interface EntryService {
  captureDailyNote(input: CaptureDailyNoteInput): Promise<Entry>;
  generateEntry(userId: string, entryId: string): Promise<Entry>;
  saveEditedEntry(input: SaveEditedEntryInput): Promise<Entry>;
}

interface ChannelAdapterContext {
  userId: string;
  channel: "WEB" | "TELEGRAM";
  requestId: string;
}
```

## Idempotency and concurrency

- `POST /api/entries` is naturally idempotent by `(programmeId, workDate)`; retry updates the raw note and returns the same entry.
- Generation uses an idempotency key stored with the job or request record; a pending generation is not started twice.
- `PATCH /api/entries/:id` requires `expectedVersion`; mismatch returns `409 CONFLICT` with the latest safe metadata, not another user's content.
- Telegram uses `TelegramUpdate.update_id` uniqueness before processing.

## Error mapping

| App error | HTTP |
| --- | --- |
| `VALIDATION_ERROR` | 400 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `RATE_LIMITED` | 429 with `Retry-After` |
| `AI_UNAVAILABLE` | 503 for synchronous generation, 202 if queued |

## OpenAPI 3 snippet

```yaml
openapi: 3.0.3
info:
  title: SIWES Companion API
  version: 0.1.0
paths:
  /api/entries:
    post:
      security: [{ sessionCookie: [] }]
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [workDate, rawText]
              properties:
                workDate: { type: string, format: date }
                rawText: { type: string, minLength: 3, maxLength: 5000 }
                source: { type: string, enum: [WEB, TELEGRAM, VOICE, IMPORT] }
      responses:
        '200':
          description: Upserted entry
        '400': { description: Invalid input }
        '401': { description: Unauthenticated }
  /api/entries/{id}/generate:
    post:
      security: [{ sessionCookie: [] }]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      responses:
        '200': { description: Generated draft }
        '409': { description: Generation already in progress }
        '503': { description: Provider unavailable }
components:
  securitySchemes:
    sessionCookie: { type: apiKey, in: cookie, name: authjs.session-token }
```

## Design concerns

Synchronous generation is convenient for the first vertical slice but is vulnerable to serverless timeouts. The route contract therefore permits a future `202 { jobId }` response without changing the core service.

## Open questions

- Whether public API consumers beyond the first-party adapters are needed. If not, keep routes private and avoid long-lived API keys.
- Which rate limiter is available in the final hosting environment.

## Cross-references

See [03-system-architecture.md](./03-system-architecture.md), [06-ai-llm-design.md](./06-ai-llm-design.md), and [07-telegram-bot-design.md](./07-telegram-bot-design.md).
