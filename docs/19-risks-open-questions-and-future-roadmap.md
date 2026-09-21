# 19. Risks, open questions and future roadmap

## Purpose

Keep unresolved product, technical, legal and operational risks visible instead of hiding them in implementation details.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| AI invents experience | Medium | Critical | Grounding prompts, claim checks, provenance, refusal/clarification, golden tests. |
| Confidential employer data is uploaded | Medium | High | Warnings, minimization, private storage, provider review, deletion. |
| Email delivery is unreliable | High | Medium | Google sign-in, retryable links, local draft, Telegram-to-web handoff. |
| Telegram identity is stolen | Low/Medium | High | Secret webhook, one-use token, identity uniqueness, re-auth/unlink. |
| Serverless timeout on reports | Medium | Medium | Durable jobs and worker path. |
| Export layout fails institution | High | High | Template registry and pilot sample before claiming support. |
| PostgreSQL connection exhaustion | Medium | High | Pooling, owner-scoped queries, short transactions, load tests. |
| AI costs exceed student budget | Medium | High | Fast/strong tiering, budgets, caching, usage alerts. |
| Offline draft is lost | Medium | High | Local autosave, explicit sync status, conflict UI. |
| Legal policy is incomplete | Medium | Critical | Qualified counsel review before public launch. |

## Open questions for developer

- Which institutions and sample templates are first?
- What exact presentation date controls Defense unlocks?
- Which managed PostgreSQL, object storage and email providers will be used?
- Will voice transcription ship in the first Telegram release?
- Which consent wording and retention period are legally approved?
- Does the first cohort need multiple concurrent programmes?

## Future roadmap

These are explicitly outside the current scope:

- WhatsApp adapter using the same channel boundary.
- Supervisor sign-off portal with invitation and scoped access.
- Institution dashboards and template administration.
- Pidgin and multilingual input/output with the same grounding rule.
- Offline-first mobile app with a local sync engine.
- Local payment providers and monetization after the free workflow proves useful.
- Calendar integrations and institution holiday imports.
- Advanced evidence OCR only after privacy and cost review.

## Cross-references

See [00-index.md](./00-index.md), [01-prd.md](./01-prd.md), and [18-implementation-roadmap.md](./18-implementation-roadmap.md).
