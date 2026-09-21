# 11. Export and document generation

## Purpose

Define how logbooks, summaries, reports and slides become downloadable, institution-adjustable documents without fabricating signatures or facts.

## Scope

Exports are generated from reviewed records and templates. The first implementation can produce HTML/PDF and DOCX-compatible output; PPTX is added with the same source model.

## Decisions

- Store content as structured sections/slides, not only a final binary file.
- Use a template registry keyed by institution/layout version.
- Render PDF from print CSS/HTML in a worker; generate DOCX with a document library; generate PPTX with a slide library or a carefully tested template.
- Supervisor comment/signature spaces are blank form areas. The product never generates a signature.

## Export models

| Export | Source | Default format |
| --- | --- | --- |
| Logbook | working dates + reviewed entries + weekly supervisor area | PDF, DOCX |
| Monthly summary | monthly summary record + source list | PDF, DOCX |
| Final report | ordered report sections | PDF, DOCX |
| Presentation | presentation slides + notes | PPTX, PDF |

## Template contract

```ts
type ExportTemplate = {
  id: string;
  institutionKey: string;
  version: number;
  pageSize: "A4" | "LETTER";
  logbook: {
    rowsPerWeek: number;
    showIndustrySupervisorBox: boolean;
    showInstitutionSupervisorBox: boolean;
    commentLines: number;
  };
  reportSections: Array<{ key: string; title: string; required: boolean }>;
};
```

## Logbook rules

- Render only configured working dates; missed dates appear as blank/missing status where the template expects them, not as invented activity.
- One page/week by default, with day-by-day entry rows and blank supervisor comment/signature spaces.
- Long entries continue on a controlled page or are shortened only after student review; never silently truncate.
- Include a provenance footer in digital exports where the institution permits it: generated from reviewed entries, export date, template version.

## Security

- Generate exports asynchronously for large documents.
- Store temporary files in private storage with short-lived download URLs.
- Delete temporary binaries after the retention window; keep source structured data according to policy.
- Sanitize any HTML/Markdown before rendering.

## Failure handling

- Missing required section data produces a clear checklist, not a blank factual paragraph.
- Template mismatch is reported with institution/template version.
- Render timeout leaves the source document intact and allows retry.

## Design concerns

Without a real sample logbook from a pilot institution, exact layout fidelity cannot be claimed. The template engine is the decision; the first sample determines the first template implementation.

## Open questions

- Which rendering stack is acceptable for the first deployment: Playwright HTML/PDF, a hosted renderer, or a pure JS PDF library?
- Does the institution require a specific font, binding margin or page numbering convention?

## Cross-references

See [04-database-design.md](./04-database-design.md), [09-frontend-implementation-guide.md](./09-frontend-implementation-guide.md), [12-defense-center-design.md](./12-defense-center-design.md), and [13-infrastructure-devops-and-deployment.md](./13-infrastructure-devops-and-deployment.md).
