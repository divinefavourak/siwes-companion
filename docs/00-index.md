# 00. Index, glossary and decision log

## Purpose

This is the contract for the SIWES Companion documentation set and the place to resolve cross-document terminology and architecture decisions.

## Scope

The set covers the product from account creation through daily documentation, report compilation, defense preparation, Telegram parity, privacy, deployment, testing, operations and future extensions.

## Reading order

1. This document for vocabulary and decisions.
2. [01-prd.md](./01-prd.md) for product boundaries and measurable outcomes.
3. [02-ux-information-architecture.md](./02-ux-information-architecture.md) for screens and conversations.
4. [03-system-architecture.md](./03-system-architecture.md) and [04-database-design.md](./04-database-design.md) for the executable shape.
5. [05-api-specification.md](./05-api-specification.md), [06-ai-llm-design.md](./06-ai-llm-design.md), and [07-telegram-bot-design.md](./07-telegram-bot-design.md) for service contracts.
6. [08-security-and-privacy.md](./08-security-and-privacy.md) through [17-legal-and-policy-drafts.md](./17-legal-and-policy-drafts.md) for implementation guardrails.
7. [18-implementation-roadmap.md](./18-implementation-roadmap.md) for execution order.
8. [19-risks-open-questions-and-future-roadmap.md](./19-risks-open-questions-and-future-roadmap.md) for unresolved decisions.

## Glossary

| Term | Meaning in this product |
| --- | --- |
| SIWES | Students Industrial Work Experience Scheme, the industrial training experience being documented. Institutional rules must be verified with each school. |
| IBS | Industry-Based Supervisor, the workplace supervisor who reviews the student's practical work. |
| ISS | Institution-Based Supervisor, the university supervisor who assesses the placement. |
| SIWES programme | One configured placement belonging to one student, with duration, dates, organization, unit and supervisors. |
| Working day | A calendar date the student marked as expected work for this programme. It is configurable and is not assumed to be Monday-Friday. |
| Entry | One student's saved daily logbook record for one SIWES and one working date. |
| Raw experience | The student's original text, transcript or imported note. It is retained as provenance and is never overwritten by AI. |
| Generated draft | The structured and formalized output produced from raw experience by an LLM. |
| Edited entry | The student's reviewed version. It is the preferred source for downstream summaries, while raw and generated versions remain available. |
| Assisted capture | The flow in which the system asks a small number of clarifying questions when raw input is too vague to support a grounded entry. |
| Evidence | A file, URL or note attached to an entry, project or skill to help the student retrieve and defend what they actually did. |
| Project | A named piece of work extracted from or explicitly associated with entries. A project can be incomplete. |
| Skill | A capability the student documented or explicitly confirmed, not an inferred credential. |
| Tool | A software, hardware, platform or method named in the student's evidence. |
| Challenge | A documented obstacle or uncertainty, with a solution only when the student supplied one. |
| Timeline | A date-ordered view of entries, skills, tools, projects, challenges, achievements and evidence. |
| Weekly progress | An editable aggregation of saved entries for a programme week. |
| Monthly summary | An editable aggregation of saved entries for a programme month. |
| Final report | The institution-configurable report assembled from reviewed programme data. |
| Defense Center | The end-of-programme area for presentations, speaker notes, questions and mock defense practice. |
| Mock defense turn | One examiner question, student answer and follow-up/feedback unit in a practice session. |
| Channel adapter | Thin web or Telegram code that translates channel events into shared application service calls. |
| Core service | Channel-independent business logic and policy. |
| Link token | A short-lived, single-use secret used to connect a Telegram identity to an existing account. |
| Provenance | The source relationship between raw input, AI output, student edits and downstream documents. |
| Day X of N | Programme progress based on configured working days, not elapsed calendar days. |
| Phase | Document, Compile or Defend; the dashboard phase derived from programme dates and configuration. |
| NDPA | Nigeria Data Protection Act 2023. Legal language and compliance steps require qualified review. |
| LLM | Large language model used for grounded transformation, summarization and defense practice. |

## Design concerns

- A generic AI writer can accidentally turn observation into claimed performance. Every downstream prompt therefore receives provenance and must distinguish observed, assisted and performed work.
- A single hosting runtime is a poor fit for long LLM calls and reminders. The design uses short request handlers plus durable jobs that can run in a worker or scheduled route.
- “Typical Nigerian logbook” is not one universal layout. Export rendering is template-driven and requires a supplied institution sample before pixel-level matching.
- 100% automated coverage cannot prove an LLM is truthful. The codebase enforces 100% coverage on deterministic core modules and adds golden, adversarial and human-reviewed AI evaluations.

## Decision log

| ID | Decision | Options considered | Choice and reason | Consequences |
| --- | --- | --- | --- | --- |
| ADR-001 | Use a shared domain core | Duplicate web/bot logic; shared services; event-only architecture | Shared services with repository ports. It makes Telegram another adapter and keeps policy in one place. | Adapters must translate channel concerns without adding business rules. |
| ADR-002 | Database | PostgreSQL; document database; hosted spreadsheet | PostgreSQL with Prisma. The data has relational ownership, unique daily constraints and audit relationships. | PostgreSQL is required in local, staging and production. |
| ADR-003 | Web stack | Next Pages Router; Next App Router; separate SPA/API | Next App Router with server components and route handlers. It supports mobile-first server-rendered pages and one deployable web service. | Long jobs remain asynchronous. |
| ADR-004 | Auth | Custom auth; Auth.js; external-only auth | Auth.js with email magic-link/passwordless support and Google OAuth. A dev adapter allows local demo without delivery dependency. | Production email delivery and OAuth setup are required for real sign-in. |
| ADR-005 | LLM provider | Direct Anthropic calls everywhere; one fixed model; provider abstraction | Provider interface with Anthropic default and config-driven model/price settings. | Prompts and schemas must not depend on provider-specific response shape. |
| ADR-006 | File storage | Database blobs; Cloudinary; S3-compatible object storage | S3-compatible storage with signed URLs and a local adapter. R2 is the default production example. | Malware scanning and lifecycle rules are part of upload handling. |
| ADR-007 | Background work | In-request work; Redis queue; database jobs | PostgreSQL job table with claim/lease fields and an optional worker process. It avoids a mandatory paid queue for a student project. | Worker polling and idempotent jobs are required. |
| ADR-008 | Telegram transport | Long polling; webhook | HTTPS webhook with a secret token on the chosen hosted deployment. Local development can use grammY polling. | Deployment must expose a stable endpoint and verify the secret. |
| ADR-009 | Source of truth | Generated paragraph only; raw plus generated plus edited | Retain all three plus structured extractions and provenance. Student edits are preferred downstream. | More storage and UI explainability, but reliable report generation and audits. |
| ADR-010 | Working days | Fixed Mon-Fri; institution calendar only; student-configurable | Per-programme weekday defaults plus explicit date overrides. | Every aggregation queries the working-day policy, not a hard-coded weekday list. |
| ADR-011 | Time boundary | Browser local date; UTC date; programme timezone | Programme timezone, default Africa/Lagos, converted to UTC for storage. | “Today” is consistent across web and Telegram even after midnight UTC. |
| ADR-012 | UI styling | Large component library; bespoke CSS; Tailwind + shadcn primitives | Tailwind CSS with small local primitives modeled on shadcn/ui. | Components remain accessible and easy to theme without a large runtime. |
| ADR-013 | Defense rating | Numeric score; qualitative feedback | No fake numeric score. Feedback reports answered questions, topics covered, review areas and struggled questions. | Students receive actionable practice guidance without false precision. |

## Open questions

- Which institutions and sample logbook templates will be supported first?
- Which email provider and Google OAuth project will be used in production?
- Will evidence uploads be encrypted with a customer-managed key for institutional deployments?
- What precise progress thresholds should unlock Defense Center when a programme has unusual dates?

## Cross-references

All documents use the entity names and ADR IDs above. The database implementation is in [04-database-design.md](./04-database-design.md), while policy implications are in [08-security-and-privacy.md](./08-security-and-privacy.md).
