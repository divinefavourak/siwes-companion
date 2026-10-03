import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { formatDateOnly, type DateOnly } from "@/src/core/shared/date";
import type { LogbookWeek } from "@/src/core/exports/logbook";

export type LogbookPdfInput = {
  studentName: string;
  matricNumber: string;
  institution: string;
  department: string;
  level: string;
  organization: string;
  unit: string;
  startDate: DateOnly;
  endDate: DateOnly;
  weeks: LogbookWeek[];
  generatedOn: DateOnly;
};

const PAGE: [number, number] = [595.28, 841.89]; // A4
const MARGIN = 42;
const CONTENT_WIDTH = PAGE[0] - MARGIN * 2;
const FOOTER_SPACE = 34;
const BODY_SIZE = 9.5;
const LINE = 13;
const CELL_PAD = 6;
const DAY_COL = 108;
const SIGNATURE_BLOCK = 222;

const INK = rgb(0.09, 0.11, 0.16);
const MUTED = rgb(0.42, 0.45, 0.5);
const RULE = rgb(0.78, 0.8, 0.84);
const BRAND = rgb(0.02, 0.45, 0.7);
const BAND = rgb(0.94, 0.96, 0.98);

/** Standard PDF fonts only cover WinAnsi; swap anything else for a safe stand-in. */
function makeSanitizer(font: PDFFont) {
  const cache = new Map<string, string>();
  const replacements: Record<string, string> = { "\t": "    ", "→": "->", "←": "<-", "≤": "<=", "≥": ">=", " ": " " };
  return (text: string) =>
    Array.from(text.normalize("NFC"))
      .map((char) => {
        if (cache.has(char)) return cache.get(char)!;
        let safe = replacements[char];
        if (safe === undefined) {
          try {
            font.widthOfTextAtSize(char, 10);
            safe = char;
          } catch {
            const stripped = char.normalize("NFKD").replace(/[̀-ͯ]/g, "");
            try {
              font.widthOfTextAtSize(stripped, 10);
              safe = stripped;
            } catch {
              // Emoji and joiners carry no logbook meaning; other scripts get a visible marker.
              safe = /\p{Extended_Pictographic}|[\u200d\ufe0f]/u.test(char) ? "" : "?";
            }
          }
        }
        cache.set(char, safe);
        return safe;
      })
      .join("");
}

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) {
        current = candidate;
        continue;
      }
      if (current) lines.push(current);
      // Hard-break words longer than the column (URLs, hashes).
      let rest = word;
      while (font.widthOfTextAtSize(rest, size) > width) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), size) > width) cut -= 1;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      current = rest;
    }
    if (current) lines.push(current);
  }
  while (lines.length > 1 && lines.at(-1) === "") lines.pop();
  return lines;
}

export async function renderLogbookPdf(input: LogbookPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const clean = makeSanitizer(regular);

  doc.setTitle(clean(`SIWES Logbook - ${input.studentName}`));
  doc.setAuthor(clean(input.studentName));
  doc.setCreator("SIWES Companion");
  doc.setProducer("SIWES Companion");

  const text = (page: PDFPage, value: string, x: number, y: number, size: number, font = regular, color = INK) =>
    page.drawText(clean(value), { x, y, size, font, color });

  // Cover page
  const cover = doc.addPage(PAGE);
  let y = PAGE[1] - 120;
  text(cover, "STUDENTS INDUSTRIAL WORK EXPERIENCE SCHEME", MARGIN, y, 11, bold, BRAND);
  y -= 34;
  text(cover, "Daily Logbook", MARGIN, y, 30, bold);
  y -= 22;
  text(cover, `${formatDateOnly(input.startDate, { day: "numeric", month: "long", year: "numeric" })} to ${formatDateOnly(input.endDate, { day: "numeric", month: "long", year: "numeric" })}`, MARGIN, y, 12, regular, MUTED);
  y -= 48;
  const details: [string, string][] = [
    ["Student name", input.studentName],
    ["Matriculation number", input.matricNumber],
    ["Institution", input.institution],
    ["Department", input.department],
    ["Level", input.level],
    ["Organisation", input.organization],
    ["Unit / department", input.unit],
    ["Weeks in this export", input.weeks.length === 0 ? "None" : `Week ${input.weeks[0].number} to Week ${input.weeks.at(-1)!.number}`]
  ];
  for (const [label, value] of details) {
    cover.drawLine({ start: { x: MARGIN, y: y - 8 }, end: { x: PAGE[0] - MARGIN, y: y - 8 }, thickness: 0.5, color: RULE });
    text(cover, label.toUpperCase(), MARGIN, y, 8, bold, MUTED);
    const lines = wrap(clean(value), regular, 12, CONTENT_WIDTH - 170);
    lines.forEach((line, index) => text(cover, line, MARGIN + 170, y - index * 15, 12));
    y -= 30 + (lines.length - 1) * 15;
  }
  y -= 20;
  for (const line of wrap(
    "Entries in this logbook are the daily records the student reviewed and saved. Working days left blank had no reviewed entry at the time of export. Supervisor comments and signatures are completed by hand.",
    italic,
    9.5,
    CONTENT_WIDTH
  )) {
    text(cover, line, MARGIN, y, 9.5, italic, MUTED);
    y -= LINE;
  }

  // Week pages
  for (const week of input.weeks) {
    let page = doc.addPage(PAGE);
    let cursor = PAGE[1] - MARGIN;
    const range = `${formatDateOnly(week.start, { day: "numeric", month: "short" })} - ${formatDateOnly(week.end, { day: "numeric", month: "short", year: "numeric" })}`;

    const header = (continued: boolean) => {
      page.drawRectangle({ x: MARGIN, y: cursor - 34, width: CONTENT_WIDTH, height: 34, color: BAND });
      text(page, `WEEK ${week.number}${continued ? " (continued)" : ""}`, MARGIN + 10, cursor - 21, 13, bold);
      const rangeWidth = regular.widthOfTextAtSize(clean(range), 10);
      text(page, range, PAGE[0] - MARGIN - 10 - rangeWidth, cursor - 21, 10, regular, MUTED);
      cursor -= 46;
      text(page, "DAY / DATE", MARGIN + CELL_PAD, cursor, 7.5, bold, MUTED);
      text(page, "DESCRIPTION OF WORK DONE", MARGIN + DAY_COL + CELL_PAD, cursor, 7.5, bold, MUTED);
      cursor -= 6;
    };
    const newPage = () => {
      page = doc.addPage(PAGE);
      cursor = PAGE[1] - MARGIN;
      header(true);
    };
    header(false);

    for (const day of week.days) {
      const body = day.text ? wrap(clean(day.text), regular, BODY_SIZE, CONTENT_WIDTH - DAY_COL - CELL_PAD * 2) : [];
      let lines = body.length > 0 ? body : ["No reviewed entry for this day."];
      let first = true;
      while (lines.length > 0 || first) {
        const available = Math.floor((cursor - MARGIN - FOOTER_SPACE - CELL_PAD * 2) / LINE);
        if (available < 2) {
          newPage();
          continue;
        }
        const chunk = lines.slice(0, available);
        lines = lines.slice(chunk.length);
        const rows = Math.max(chunk.length, 2);
        const height = rows * LINE + CELL_PAD * 2;
        page.drawRectangle({ x: MARGIN, y: cursor - height, width: CONTENT_WIDTH, height, borderColor: RULE, borderWidth: 0.75 });
        page.drawLine({ start: { x: MARGIN + DAY_COL, y: cursor }, end: { x: MARGIN + DAY_COL, y: cursor - height }, thickness: 0.75, color: RULE });
        const top = cursor - CELL_PAD - BODY_SIZE;
        text(page, first ? day.weekday : `${day.weekday} (cont.)`, MARGIN + CELL_PAD, top, BODY_SIZE, bold);
        text(page, day.label, MARGIN + CELL_PAD, top - LINE, 8.5, regular, MUTED);
        chunk.forEach((line, index) =>
          text(page, line, MARGIN + DAY_COL + CELL_PAD, top - index * LINE, BODY_SIZE, day.text ? regular : italic, day.text ? INK : MUTED)
        );
        cursor -= height;
        first = false;
      }
    }

    if (cursor - SIGNATURE_BLOCK < MARGIN + FOOTER_SPACE) newPage();
    cursor -= 22;
    const signLine = (label: string, x: number, width: number) => {
      text(page, label, x, cursor, 8.5, regular, MUTED);
      const labelWidth = regular.widthOfTextAtSize(label, 8.5) + 6;
      page.drawLine({ start: { x: x + labelWidth, y: cursor - 2 }, end: { x: x + width, y: cursor - 2 }, thickness: 0.6, color: MUTED });
    };
    signLine("Student's signature:", MARGIN, 300);
    signLine("Date:", MARGIN + 320, CONTENT_WIDTH - 320);
    cursor -= 18;

    for (const title of ["Industry-based supervisor", "Institution-based supervisor"]) {
      const boxHeight = 88;
      page.drawRectangle({ x: MARGIN, y: cursor - boxHeight, width: CONTENT_WIDTH, height: boxHeight, borderColor: RULE, borderWidth: 0.75 });
      cursor -= 15;
      text(page, title.toUpperCase(), MARGIN + 8, cursor, 7.5, bold, MUTED);
      cursor -= 18;
      signLine("Comments:", MARGIN + 8, CONTENT_WIDTH - 16);
      cursor -= 18;
      page.drawLine({ start: { x: MARGIN + 8, y: cursor - 2 }, end: { x: PAGE[0] - MARGIN - 8, y: cursor - 2 }, thickness: 0.6, color: MUTED });
      cursor -= 22;
      signLine("Name:", MARGIN + 8, 200);
      signLine("Signature:", MARGIN + 218, 170);
      signLine("Date:", MARGIN + 398, CONTENT_WIDTH - 406);
      cursor -= boxHeight - 73 + 8;
    }
  }

  const pages = doc.getPages();
  const generated = `Generated by SIWES Companion from reviewed entries on ${formatDateOnly(input.generatedOn, { day: "numeric", month: "short", year: "numeric" })}`;
  pages.forEach((page, index) => {
    text(page, clean(`${input.studentName} - ${input.matricNumber}`), MARGIN, 22, 7.5, regular, MUTED);
    const label = `${generated}  |  Page ${index + 1} of ${pages.length}`;
    text(page, label, PAGE[0] - MARGIN - regular.widthOfTextAtSize(label, 7.5), 22, 7.5, regular, MUTED);
  });

  return doc.save();
}
