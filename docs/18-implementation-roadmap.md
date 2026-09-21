# 18. Implementation roadmap

## Purpose

Give one developer a safe build order with dependencies, acceptance criteria and effort ranges.

## Milestones

| Milestone | Deliverable | Rough effort |
| --- | --- | --- |
| 01 | Daily Logbook Loop, responsive web UI, PostgreSQL persistence, grounded fake/real AI interface, weekly history | 5-8 days |
| 02 | Auth hardening, working-day settings, Telegram linking and daily bot flow | 4-6 days |
| 03 | Evidence Vault, skills/tools/projects timeline, weekly/monthly summaries | 5-8 days |
| 04 | Report builder and configurable logbook/monthly exports | 6-10 days |
| 05 | Presentation, notes, question bank and progressive Defense Center | 5-8 days |
| 06 | Mock defense, reminders, operations, privacy/deletion workflows | 6-10 days |
| 07 | Institution templates, pilot feedback, performance/accessibility/security hardening | 5-10 days |

## Definition of done

Code is modular, typed, linted, tested, documented, owner-scoped, resilient to provider failure, covered by a focused commit, and deployable from a clean checkout. No feature is done if it silently loses a draft or invents an experience.

## Milestone 01 build guide

1. Initialize Next App Router and install dependencies.
2. Create `.env` from the minimal example and start PostgreSQL.
3. Apply Prisma schema and generate client.
4. Implement `src/core/shared/date.ts`, errors and Zod schemas.
5. Implement repository ports and Prisma entry/programme repositories.
6. Add a deterministic fake LLM for local development and Anthropic provider behind the same interface.
7. Add session fixture/auth shell and create-programme screen.
8. Add dashboard and today editor with local draft autosave.
9. Add capture, generate and edit/save route handlers with version conflicts.
10. Add weekly history and missing working-day status.
11. Add unit/integration/e2e tests and enforce coverage.
12. Build and run Docker smoke test.

## Telegram sequence

Telegram linking lands after the web daily loop is stable because it is an adapter over working services. The first bot command can land in Milestone 02 as `/today`/`/log`; evidence, reminders and mock defense follow the corresponding web capabilities.

## First coding tasks

```text
feat: add postgres domain schema
feat: add core date and entry services
feat: add prisma repositories
feat: add auth and programme setup
feat: add daily entry web loop
test: cover milestone 01 services and routes
feat: add telegram link token flow
```

## Open questions

- Which exact institution sample and AI model are required before V1 acceptance?
- Is the first deployment Vercel/managed Postgres or the provided private VPS?

## Cross-references

See [03-system-architecture.md](./03-system-architecture.md), [14-testing-and-qa-strategy.md](./14-testing-and-qa-strategy.md), and [19-risks-open-questions-and-future-roadmap.md](./19-risks-open-questions-and-future-roadmap.md).
