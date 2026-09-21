# SIWES Companion

SIWES Companion helps students document real industrial training work, understand the experience, and prepare to defend it confidently.

The codebase is a TypeScript Next.js App Router application with a shared domain core, PostgreSQL/Prisma persistence, a web adapter, and a grammY Telegram adapter. AI transforms student-provided experience; it must not manufacture experience.

## Status

Milestone 01 is being built first: create a programme, capture a daily note, generate a grounded draft, review/edit it, save it, and view weekly history. Later modules are documented and will be added behind the same service boundaries.

## Local development

Requirements: Node.js 20.9+, npm, and PostgreSQL. The current local sandbox can also run the checked-in Next 15 toolchain on Node 18, but use Node 20.9+ for deployment.

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

Useful checks:

```bash
npm run typecheck
npm run lint
npm run test:coverage
npm run build
```

With Docker and Compose:

```bash
cp .env.example .env
docker compose up -d postgres
npm run db:deploy
docker build -t siwes-companion .
docker run --env-file .env -p 3000:3000 siwes-companion
```

See [`docs/18-implementation-roadmap.md`](./docs/18-implementation-roadmap.md) for the build sequence and [`handoff.md`](./handoff.md) for the current handoff. Deployment notes for a private VPS live in [`private-vps-deployment.md`](./private-vps-deployment.md).

The default local experience uses an in-memory demo when `DATABASE_URL` is not available. Use real PostgreSQL before testing persistence or Telegram.

## Documentation

The complete product and engineering documentation is in [`docs/00-index.md`](./docs/00-index.md), followed by documents `01` through `19`.

## Data integrity rule

The application stores raw student input, AI output and student-edited output separately. The AI is allowed to organize, summarize and ask clarifying questions. It is not allowed to invent activities, technologies, responsibilities, achievements or outcomes.
