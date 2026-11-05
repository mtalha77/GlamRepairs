/**
 * CSV for outreach lists (Handover 68 §4.1). No dependency: RFC 4180 quoting,
 * commas, CRLF or LF. A CSV is still an upload (Handover 59), so it is
 * checked as one: size and row caps, UTF-8 text only (a NUL byte or a binary
 * signature means it is not a CSV, whatever the file name says).
 */

export const MAX_BYTES = 1_000_000;
export const MAX_ROWS = 2_000;
/** More invalid rows than this and the whole file is refused: it is usually the wrong file. */
export const MAX_INVALID_SHARE = 0.05;

const BINARY_SIGNATURES = [
  [0x50, 0x4b, 0x03, 0x04], // zip, xlsx
  [0x25, 0x50, 0x44, 0x46], // pdf
  [0xd0, 0xcf, 0x11, 0xe0], // old Office
  [0x89, 0x50, 0x4e, 0x47], // png
  [0xff, 0xd8, 0xff], // jpeg
];

export function checkCsvBytes(bytes: Uint8Array): string | null {
  if (bytes.length === 0) return "The file is empty.";
  if (bytes.length > MAX_BYTES) return "The file is over 1 MB. Split it into smaller lists.";
  if (BINARY_SIGNATURES.some((sig) => sig.every((b, i) => bytes[i] === b))) {
    return "That is not a CSV file. If it is a spreadsheet, export it as CSV first.";
  }
  if (bytes.includes(0)) return "That is not a text CSV file.";
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return "The file is not UTF-8 text. Export it as CSV (UTF-8).";
  }
  return null;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export type ParsedContact = {
  email: string;
  first_name: string | null;
  company: string | null;
  role_title: string | null;
  country_code: string | null;
};

const HEADER_ALIASES: Record<keyof ParsedContact, string[]> = {
  email: ["email", "email address", "e-mail", "work email"],
  first_name: ["first_name", "first name", "firstname", "name", "first"],
  company: ["company", "brand", "organisation", "organization", "company name"],
  role_title: ["role_title", "role", "title", "job title", "position"],
  country_code: ["country_code", "country", "country code"],
};

/** Header row mapped by name, so column order does not matter. Email is required. */
export function mapRows(rows: string[][], defaultCountry: string | null): { contacts: ParsedContact[]; invalid: number; error: string | null } {
  if (rows.length < 2) return { contacts: [], invalid: 0, error: "The file needs a header row and at least one contact." };
  if (rows.length - 1 > MAX_ROWS) return { contacts: [], invalid: 0, error: `At most ${MAX_ROWS} contacts per file.` };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (k: keyof ParsedContact) => header.findIndex((h) => HEADER_ALIASES[k].includes(h));
  const idx = { email: col("email"), first_name: col("first_name"), company: col("company"), role_title: col("role_title"), country_code: col("country_code") };
  if (idx.email < 0) return { contacts: [], invalid: 0, error: 'No "email" column found in the header row.' };

  const seen = new Set<string>();
  const contacts: ParsedContact[] = [];
  let invalid = 0;
  for (const r of rows.slice(1)) {
    const email = (r[idx.email] ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      invalid++;
      continue;
    }
    if (seen.has(email)) continue;
    seen.add(email);
    const get = (i: number) => (i >= 0 ? (r[i] ?? "").trim().slice(0, 120) || null : null);
    const country = (get(idx.country_code) ?? defaultCountry ?? "").toUpperCase();
    contacts.push({
      email,
      first_name: get(idx.first_name)?.split(/\s+/)[0] ?? null,
      company: get(idx.company),
      role_title: get(idx.role_title),
      country_code: /^[A-Z]{2}$/.test(country) ? country : null,
    });
  }
  const total = rows.length - 1;
  if (total > 0 && invalid / total > MAX_INVALID_SHARE) {
    return { contacts: [], invalid, error: `${invalid} of ${total} rows are not valid email addresses. That is usually the wrong file, so nothing was imported.` };
  }
  return { contacts, invalid, error: null };
}
