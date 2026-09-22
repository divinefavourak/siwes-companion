# Master Prompt: SIWES Companion Documentation Set

Paste everything below this line into Claude.

---

## 1. Your role

You are a senior staff engineer, product architect and technical writer working together. Your job is to produce the complete documentation set for a product called **SIWES Companion**, detailed enough that a solo developer (a Computer Science student at a Nigerian university) can build the whole thing from these docs alone, without guessing.

Do not write marketing fluff. Every document must be concrete, internally consistent and buildable.

## 2. What the product is

SIWES (Students Industrial Work Experience Scheme) is the compulsory industrial training for Nigerian university students. It runs for 3 or 6 months depending on the institution and course. Students must fill a logbook every working day, get it signed off by supervisors, write a final report, and later defend or present their experience.

The problem: students find the daily logbook overwhelming. They don't know what to write, the day's tasks are often messy or not straightforward, and by month end they cannot remember what they did.

**Core promise:** Document your SIWES. Understand your experience. Defend it confidently.

**Founding principle (hard rule, must appear in the AI design and product docs):**
AI organizes the student's real experience. It never manufactures experience. The AI must never invent an activity, technology, responsibility, achievement, project or outcome the student did not provide or that cannot reasonably be derived from what they documented. Example: if the student says "I watched my supervisor configure the router", the output must not say "configured and optimized enterprise network infrastructure". The product helps students document, understand and communicate the SIWES they actually did.

### Product journey

```
CREATE SIWES -> SET DURATION (3 or 6 months) -> DAILY ACTIVITY -> AI LOGBOOK ENTRY
-> WEEKLY PROGRESS -> MONTHLY SUMMARY -> SKILLS + PROJECTS + EVIDENCE
-> FINAL REPORT -> DEFENSE PREPARATION -> PRESENTATION + MOCK DEFENSE
```

Three phases:
1. **Document** (during SIWES): daily logbook, weekly progress, monthly summaries, skills, tools, projects, evidence.
2. **Compile** (end of SIWES): experience timeline, final report, skills summary, project summaries, presentation.
3. **Defend** (before presentation): slides, speaker notes, likely questions, personalized questions, mock defense, practice feedback.

### Feature set

1. **SIWES setup:** duration (3 or 6 months), university, department, level, matric number, organization, unit, supervisor(s), start date, end date. Duration drives the whole timeline (Month 1 to 3, or Month 1 to 6). It is one configurable program, not two products.
2. **Daily logbook:** the student dumps what they did in messy natural language. The system produces a formal logbook entry plus structured data (skills, tools, learnings, challenges, projects). Student reviews, edits, saves. Working days are configurable per student (not assumed Monday to Friday; some work Saturdays). Only real working days are tracked.
3. **Assisted capture:** when the input is too thin or vague, the AI asks short clarifying questions instead of guessing or padding. Support backfilling past days, missed days, and late joiners.
4. **Weekly progress:** auto-grouped from daily entries: work completed, skills, tools, learnings, challenges, major activities. Editable weekly summary.
5. **Monthly work experience summary:** generated from the actual entries of that month, editable, exportable.
6. **Experience and skills timeline:** skills, tools, projects, challenges, achievements across the whole SIWES.
7. **Evidence Vault:** attach screenshots, documents, code/project links, designs, reports, videos, notes to entries and projects; retrievable later ("show me the projects I worked on").
8. **Final SIWES report:** built from accumulated data. Sections: introduction, organization overview, department/unit, activities carried out, skills acquired, tools and technologies, projects, challenges, solutions, knowledge gained, conclusion, recommendations. Student reviews and edits everything. Section structure must be configurable per institution.
9. **Defense Center:** unlocks progressively near the end date.
   - Presentation generator (slide structure from the student's real experience, exportable)
   - Speaker notes ("what should I say" plus "key point to remember")
   - Question generator (general plus personalized from their logbook, plus follow-up chains)
   - Mock defense mode (AI plays examiner, asks follow-ups from the student's answers and documented experience, ends with actionable feedback: questions answered, topics covered, areas to review, questions struggled with; no fake "you scored 73/100" rating)
10. **Progress and countdown:** dashboard shows week/month progress, completion status, day X of N. Preparation is introduced progressively: final month, start organizing the report; final 2 weeks, presentation; final week, practice questions; final 3 days, mock defense.
11. **Exports:** logbook in a format that resembles the typical Nigerian SIWES logbook (weekly pages, day-by-day entries, space for industry-based and institution-based supervisor comments/signatures), monthly summary, final report, and slides. Layout must be configurable because institutions differ. The developer will supply a sample logbook screenshot separately; do not assume its exact layout.

### Milestone 01 (build first): The Daily Logbook Loop

Student signs in, creates SIWES, opens today's entry, types what they did, generates the entry, reviews/edits, saves, and sees it in weekly history. Everything else is built around this vertical slice. Defense features stay locked until the final phase.

### Key data principle

Never store only the generated paragraph. Store raw input, AI output and the student's edited version for every entry, plus structured extractions, so later outputs (weekly, monthly, report, slides, questions) are generated from the real history:

```
RAW EXPERIENCE -> AI TRANSFORMATION -> MULTIPLE OUTPUTS
```

## 3. Two interfaces, one account

The product must be usable from **both a web app and a Telegram bot**, on the same account and the same data. A student can log on the web in the morning and from Telegram in the evening, and everything stays in sync.

Design requirements for the dual interface:

- **One core, two adapters.** All business logic lives in a shared domain/service layer. The web app and the Telegram bot are thin channel adapters over it. Never duplicate logic in the bot. Design the adapter boundary so another channel (WhatsApp is the obvious next one) could be added later without touching the core.
- **Account linking.** Specify the full flows and their security: (a) start on web, link Telegram via a short-lived one-time code or deep link (`t.me/<bot>?start=<token>`); (b) start on Telegram and be able to create and set up an account from the bot (setup wizard), with a defined way to attach a web login later; (c) unlinking, re-linking, lost Telegram account, one Telegram account attached to at most one user, token expiry, replay protection.
- **Feature parity matrix.** Table of every feature against Web, Telegram, or Both, with reasoning. Suggested direction (challenge it if you disagree): daily logging, quick edits, streak/reminders, today/week status, evidence upload, and mock defense practice work very well in a chat interface; long-form report editing, presentation editing, exports, and setup-heavy screens are better on the web. The bot should hand off to the web with authenticated deep links where needed.
- **Conversational capture.** The bot naturally fits the "assisted capture" idea: it can ask the student what they did today, ask one or two clarifying questions if the answer is thin, show the generated entry with inline buttons (Save / Edit / Regenerate), and confirm.
- **Bot specifics to design in detail:** command list (for example /start, /today, /log, /week, /month, /skills, /evidence, /report, /defense, /settings, /help, /unlink), inline keyboards, conversation state machine and where state is stored, handling of long messages and Telegram's 4096 character limit, voice notes (transcribe into raw activity, optional feature with cost implications), photo/document uploads as evidence, daily reminder scheduling per user in the Africa/Lagos timezone with quiet hours and opt-out, webhook vs long polling (recommend one for the chosen hosting), webhook secret token verification, idempotent handling of duplicate updates (`update_id`), rate limiting, graceful behavior when the LLM or database is down, and message formatting (Telegram MarkdownV2/HTML escaping pitfalls).
- **Consistency.** A draft started on one channel must be resumable on the other. Define how drafts, generation state and concurrent edits from two channels are reconciled.

## 4. Technical baseline

These are the default choices. Use them unless you have a strong reason not to. If you deviate or see a problem, say so explicitly in a "Design concerns" section of the relevant doc and record it in the decision log.

- **Language/framework:** TypeScript, Next.js (App Router), Tailwind CSS, shadcn/ui
- **Database:** PostgreSQL with Prisma
- **Auth:** Auth.js (email plus at least one social provider; specify what is best for Nigerian students, including passwordless/email options and what happens with unreliable email delivery)
- **Validation:** Zod on every boundary
- **Telegram:** grammY (or justify an alternative)
- **LLM:** provider-abstracted interface, default provider is the Anthropic Claude API. Model IDs and prices must live in config, not code. Suggest tiering: a cheaper fast model for daily entry generation and classification, a stronger model for final report and mock defense reasoning. Verify current model names and pricing at build time and say that in the doc.
- **File storage:** S3-compatible (Cloudflare R2 or similar) or Cloudinary, with the trade-offs
- **Background jobs / scheduling:** pick and justify (for reminders, monthly summary generation, exports); it must work with the chosen hosting
- **Hosting:** Vercel plus a separately hosted managed Postgres (for example Neon or Supabase); note cold starts, function timeouts and how they affect LLM calls and bot webhooks
- **Timezone:** default Africa/Lagos, stored in UTC, with the "what counts as today" boundary defined (students often log late at night)

## 5. Context you must design for

- Users are Nigerian university students, mostly on phones, often on slow or expensive mobile data and unstable power. Mobile-first, lightweight pages, resilient drafts (do not lose typed text), graceful offline/poor-network behavior.
- Users are non-experts, often anxious about the logbook. Tone and UX should reduce overwhelm, not add ceremony.
- Sensitive personal data is involved: names, matric numbers, employer and supervisor details, work descriptions that may contain confidential company information. Address the **Nigeria Data Protection Act 2023**, data minimization, what is sent to the LLM provider, consent, retention, deletion/export rights, and cross-border transfer considerations.
- Academic integrity: the product must not become a tool for faking SIWES. Specify how the design enforces this (grounding, refusal behavior, clarifying questions, visible provenance of what the student typed vs what AI wrote).
- Cost control matters: a student project must stay cheap. Include per-user LLM cost modeling.

## 6. Documents to produce

Produce each of the following as its own document. Every document needs: purpose, scope, decisions made (and why), detailed content, open questions, and cross-references to related docs.

**00. Index, glossary and decision log**
Reading order, glossary of every domain term (SIWES, IBS, ISS, logbook, entry, etc.), and an ADR-style decision log (decision, options, choice, consequences).

**01. Product Requirements Document**
Vision, problem, personas (at minimum: the student, and secondary stakeholders such as the industry-based supervisor and the institution-based supervisor), user stories with acceptance criteria, scope split into Milestone 01 / MVP / V1 / Later, explicit non-goals, success metrics, assumptions, risks.

**02. UX and information architecture**
Sitemap, screen inventory, key user flows (Mermaid), wireframes (ASCII), all states (empty, loading, error, offline, locked), copy and tone guidelines, accessibility, low-bandwidth considerations, the dashboard's phase-based behavior (Document, Compile, Defend), and the equivalent conversational flows for the Telegram bot.

**03. System architecture**
Context, container and component diagrams (Mermaid, C4 style), the shared core plus channel adapters design, module boundaries, sequence diagrams for every critical flow (sign-in, create SIWES, generate entry, save entry, link Telegram, bot logging flow, monthly summary generation, report generation, mock defense turn), deployment topology, environments (local, staging, production), scalability and failure modes.

**04. Database design**
Full ERD (Mermaid), the complete Prisma schema, every table and field explained, constraints and indexes with reasons, enums, one-entry-per-SIWES-per-day rules, working-day handling, timezone handling, soft delete vs hard delete, audit trail, provenance fields (raw vs generated vs edited), Telegram link tables, bot conversation state, job/queue tables if any, LLM usage/cost tables, migration strategy, seed data, retention and deletion policy, example queries for the dashboard, weekly rollup and monthly rollup.

**05. API specification**
Every endpoint or server action: purpose, auth, request and response schema (Zod-style), errors, idempotency, pagination, rate limits. Include an OpenAPI 3 snippet for the public surface. Define the internal service interfaces that both web and bot call.

**06. AI and LLM design**
Provider abstraction, model tiering and config, and a full prompt specification for each task: daily entry generation with structured output, clarifying-question generation, weekly summary, monthly summary, final report sections, presentation outline, speaker notes, question generator, follow-up chains, and mock defense examiner. For each: system prompt, user prompt template, JSON output schema, worked examples (include the router example), and failure handling. Also: anti-fabrication guardrails and how they are tested, prompt-injection defense (student text and uploaded content are untrusted), context-window strategy for monthly and final outputs (feed structured records, not raw dumps), output validation and retries, caching, streaming, timeouts, cost and token budgets, evaluation plan (golden test set, hallucination checks, regression tests), and logging without leaking personal data.

**07. Telegram bot design**
Everything in section 3, expanded into an implementable spec: state machine diagrams, command reference with example transcripts, inline keyboard layouts, linking flows with sequence diagrams, webhook handling and security, reminders and scheduling, error and edge-case catalog, parity matrix, and testing approach.

**08. Security and privacy**
Threat model (STRIDE), trust boundaries, authentication and session design, authorization (every query scoped to the owner; prevent IDOR), Telegram-specific threats (webhook spoofing, link-token theft, account takeover via linking, replay), file upload security (type checking, size limits, malware scanning strategy, signed URLs), input validation and output encoding, prompt-injection and LLM-specific risks, OWASP Top 10 mapping, secrets management, encryption in transit and at rest, backups, rate limiting and abuse prevention, logging rules (no PII or raw entries in logs), dependency and supply-chain hygiene, incident response, and NDPA compliance checklist. Include a privacy policy outline and a data-handling table (what data, where stored, who can see it, retention).

**09. Frontend implementation guide**
Folder structure, routing, server vs client components, forms and validation, draft autosave, state management, design system and tokens (shadcn/ui usage), component inventory, responsive rules, accessibility, performance budget, PWA/offline drafts, error boundaries, and example code for the core Milestone 01 screens.

**10. Backend implementation guide**
Folder and module structure, service layer, repository/data access layer, validation, error handling conventions, transactions, background jobs, LLM client wrapper, Telegram adapter wiring, config and environment variables (full table), logging, and example code for the core services (create SIWES, generate entry, save entry, weekly rollup).

**11. Export and document generation**
Logbook, monthly summary, final report and slides export: formats (PDF, DOCX, PPTX), templating approach, configurable institutional layouts, and how signatures/supervisor comment spaces are handled.

**12. Defense Center design**
Report builder, presentation generator, speaker notes, question generator, and mock defense mode: state machine, conversation memory, difficulty handling, feedback format, and how it behaves on both web and Telegram (including voice, if supported).

**13. Infrastructure, DevOps and deployment**
Environments, CI/CD pipeline, branching strategy, migrations in deployment, secrets, domain and DNS, monitoring, backups and restore drills, cost estimate at 100, 1,000 and 10,000 users (infra plus LLM), and free-tier limits to watch.

**14. Testing and QA strategy**
Test pyramid, unit/integration/e2e plans, Telegram bot testing (update simulation), AI evaluation suite, security testing, accessibility testing, load testing, and a Milestone 01 acceptance test checklist.

**15. Observability and operations**
Logging, metrics, tracing, alerting, dashboards, runbooks for the likely failures (LLM outage, Telegram webhook failing, database connection exhaustion, storage errors), and support workflow.

**16. Analytics and product metrics**
Privacy-respecting event plan, activation and retention metrics (for example: completed first entry, 7-day logging streak, report started), and how to measure whether the product actually reduces logbook stress.

**17. Legal and policy drafts**
Outline drafts of Terms of Use, Privacy Policy (NDPA-aligned), AI-use disclosure, and an academic integrity statement. Mark clearly that these need review by a qualified lawyer.

**18. Implementation roadmap**
Milestones from 01 onward with task breakdowns, dependencies, acceptance criteria, definition of done and rough effort estimates for one developer. Milestone 01 gets a step-by-step build guide (project init commands, folder structure, env setup, migration, first screens, first AI call, first bot command). Show where Telegram linking and the bot land in the sequence and why.

**19. Risks, open questions and future roadmap**
Risk register (likelihood, impact, mitigation), open questions for the developer, and a future roadmap (WhatsApp adapter, supervisor sign-off portal, institution dashboards, Pidgin/multilingual input, offline-first mobile app, monetization options including local payment providers) clearly separated from the current scope.

## 7. Quality rules

- Be specific. Prefer tables, schemas, diagrams (Mermaid) and real code over prose. No filler, no hype, no generic advice that could apply to any app.
- Stay consistent. The same entity, field, endpoint and status names must be used in every document. Before finishing each document, check it against the earlier ones and fix contradictions.
- Make decisions. When there are options, compare briefly, choose one, and record why. Do not leave "TBD" for things you can decide; use "Open question" only for things that truly need the developer's input.
- Think about failure. Every flow needs its error and edge cases, especially around the LLM, Telegram, network loss, duplicate submissions and two channels editing the same entry.
- Challenge me. If anything in this brief is a bad idea, risky, or under-specified, say so plainly in a "Design concerns" section and propose the better alternative.
- Do not invent facts about SIWES rules, the Nigeria Data Protection Act, Telegram limits, pricing or library APIs. If you are not sure, mark it "verify" and say where to check.
- Writing style: plain, direct, human. No emojis, no em dashes, no marketing language, no filler introductions or conclusions.

## 8. Output format and process

1. If you can create files, write each document to `/docs` as Markdown, named `00-index.md`, `01-prd.md`, and so on. Put schemas and code in fenced blocks with the language tagged.
2. If you cannot create files, output **one document per response**, complete, then end with a single line naming the next document, and wait for me to say "continue".
3. Do not stop to ask questions before starting. Where information is missing, make a sensible assumption, list it in the document's "Assumptions" section, and add it to the decision log.
4. Start with a short plan: the document order, and the top 10 assumptions you are making. Then begin with document 00 and 01.
5. After the final document, produce a consistency review: contradictions found and fixed, unresolved open questions, and the first 10 tasks to do when coding starts.

Begin now.
