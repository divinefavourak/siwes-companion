# 09. Frontend implementation guide

## Purpose

Give a solo developer a concrete structure for the mobile-first Next.js UI and the Milestone 01 daily loop.

## Folder structure

```text
app/
  dashboard/{page.tsx, today/page.tsx, history/page.tsx, setup/page.tsx}
  api/{health,siwes,entries,telegram}/...
src/
  components/ui/          local shadcn-style primitives
  components/             domain UI blocks
  adapters/web/           request/response mapping
  core/                   shared domain services
  lib/                    env, Prisma, auth, client helpers
```

## Server/client boundaries

- Pages and data loading are Server Components by default.
- Text entry, autosave, generation status, inline editing and keyboard interactions are Client Components.
- Keep database and provider imports out of client modules.
- Use route handlers for public adapter boundaries; use server actions only for tightly coupled authenticated forms.

## Design tokens

Use a restrained premium palette: ink `#101828`, muted slate `#667085`, paper `#F8FAFC`, white surfaces, indigo `#635BFF`, warm amber for attention, emerald for saved state. Keep color in CSS variables so institution themes can be added later.

## Component inventory

`AppShell`, `Sidebar`, `MobileHeader`, `PhaseCard`, `ProgressRing`, `EntryComposer`, `EntryDraftCard`, `StatusBadge`, `WorkingDayStrip`, `EvidencePill`, `EmptyState`, `OfflineBanner`, `ConfirmDialog`, `TextareaAutosize`, `Skeleton`, `Toast`.

## Form and validation rules

- Use the same Zod schemas on the server and client where safe.
- Show field errors beside controls and a summary for screen readers.
- Disable only the action being submitted; never make the full page inert for a background save.
- Preserve entered values after validation/network failures.

## Draft autosave

1. On input, debounce 500ms and save the raw text to IndexedDB/localStorage.
2. Display “Saved on this device” and a timestamp.
3. On reconnect, send the draft with an idempotency key.
4. Clear local draft only after server acknowledgement or explicit discard.
5. Never automatically call the LLM because connectivity returned.

## Responsive rules

- Mobile first at 360px wide; one-column composition until 768px.
- Desktop dashboard uses a 240px navigation rail and max 1180px content width.
- Editor actions remain sticky at the bottom on mobile and in the right rail on desktop.
- Avoid large decorative images and heavy client bundles; the product is a working logbook, not a marketing page.

## Performance budget

- First meaningful dashboard render under 2.5s on a mid-range 4G profile in staging.
- Initial JS under 180KB compressed for dashboard shell, excluding editor/export chunks.
- No image is required for the core flow. Lazy-load evidence previews.

## Accessibility and errors

Use semantic HTML, keyboard focus management, `aria-live` for generation, reduced-motion support and clear retry states. Route-level `error.tsx` files offer retry and preserve local drafts.

## Milestone 01 example

```tsx
"use client";

import { useEffect, useState } from "react";

export function EntryComposer({ date }: { date: string }) {
  const [rawText, setRawText] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "generating">("idle");

  useEffect(() => {
    const saved = window.localStorage.getItem(`siwes-draft:${date}`);
    if (saved) setRawText(saved);
  }, [date]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(`siwes-draft:${date}`, rawText);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [date, rawText]);

  async function generate() {
    setStatus("saving");
    const capture = await fetch("/api/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workDate: date, rawText, source: "WEB" })
    });
    if (!capture.ok) return setStatus("idle");
    const entry = (await capture.json()) as { id: string };
    setStatus("generating");
    await fetch(`/api/entries/${entry.id}/generate`, { method: "POST" });
    setStatus("idle");
  }

  return (
    <section aria-labelledby="entry-heading">
      <h1 id="entry-heading">What did you work on?</h1>
      <textarea value={rawText} onChange={(event) => setRawText(event.target.value)} />
      <p aria-live="polite">{status === "generating" ? "Creating a grounded draft…" : ""}</p>
      <button disabled={rawText.trim().length < 3 || status !== "idle"} onClick={generate}>
        Generate grounded draft
      </button>
    </section>
  );
}
```

## Design concerns

Do not put all data fetching in one client-side dashboard component. That would increase bundle size and make offline states harder to reason about.

## Open questions

- Should the product ship as an installable PWA in MVP or remain a resilient web app first?
- Which institution theme tokens are needed after the first pilot?

## Cross-references

See [02-ux-information-architecture.md](./02-ux-information-architecture.md), [05-api-specification.md](./05-api-specification.md), and [14-testing-and-qa-strategy.md](./14-testing-and-qa-strategy.md).
