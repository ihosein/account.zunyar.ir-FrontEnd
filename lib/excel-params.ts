/** جدول پارامتر پیام/پیامک — ستون‌ها = نام پارامتر، ردیف‌ها = مقادیر. */

export type ParamTable = {
  columns: string[];
  rows: Record<string, string>[];
};

export type ParamRecipient = {
  phone: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
};

export type SavedParamTemplate = {
  id: string;
  name: string;
  columns: string[];
  rows: Record<string, string>[];
  savedAt: string;
};

export const EMPTY_PARAM_TABLE: ParamTable = { columns: [], rows: [] };

/** پارامترهای از پروفایل کاربر — بدون نیاز به ستون اکسل پر می‌شوند. */
export const PRESET_PARAMS = ["نام", "نام خانوادگی", "موبایل"] as const;

export const PRESET_EXCEL_COLUMNS = ["موبایل", "نام", "نام خانوادگی"] as const;

const TEMPLATE_STORAGE_KEY = "zy_param_templates_v1";

type XlsxLike = {
  read: (data: ArrayBuffer, opts: { type: string; codepage?: number }) => {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };
  utils: {
    sheet_to_json: (
      sheet: unknown,
      opts: { header: number; defval: string; raw: boolean },
    ) => string[][];
    aoa_to_sheet: (data: string[][]) => unknown;
    book_new: () => { SheetNames: string[]; Sheets: Record<string, unknown> };
    book_append_sheet: (wb: unknown, sheet: unknown, name: string) => void;
  };
  writeFile: (wb: unknown, filename: string, opts?: { bookType?: string }) => void;
};

declare global {
  interface Window {
    XLSX?: XlsxLike;
  }
}

let xlsxLoader: Promise<XlsxLike> | null = null;

function loadXlsx(): Promise<XlsxLike> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("xlsx only in browser"));
  }
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (!xlsxLoader) {
    xlsxLoader = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>("script[data-zy-xlsx]");
      if (existing) {
        existing.addEventListener("load", () => {
          if (window.XLSX) resolve(window.XLSX);
          else reject(new Error("xlsx load failed"));
        });
        return;
      }
      const script = document.createElement("script");
      script.src = "/vendor/xlsx.full.min.js";
      script.async = true;
      script.dataset.zyXlsx = "1";
      script.onload = () => {
        if (window.XLSX) resolve(window.XLSX);
        else reject(new Error("xlsx unavailable"));
      };
      script.onerror = () => reject(new Error("xlsx script failed"));
      document.head.appendChild(script);
    });
  }
  return xlsxLoader;
}

function normalizeHeader(raw: string, index: number): string {
  const t = String(raw ?? "").trim();
  return t || `ستون${index + 1}`;
}

function matrixToTable(matrix: string[][]): ParamTable {
  if (!matrix.length) return EMPTY_PARAM_TABLE;
  const header = matrix[0] || [];
  const columns: string[] = [];
  const seen = new Map<string, number>();
  header.forEach((h, i) => {
    let name = normalizeHeader(h, i);
    const n = (seen.get(name) || 0) + 1;
    seen.set(name, n);
    if (n > 1) name = `${name}_${n}`;
    columns.push(name);
  });
  if (columns.length === 0) return EMPTY_PARAM_TABLE;

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const line = matrix[r] || [];
    const empty = line.every((c) => !String(c ?? "").trim());
    if (empty) continue;
    const row: Record<string, string> = {};
    columns.forEach((col, i) => {
      row[col] = String(line[i] ?? "").trim();
    });
    rows.push(row);
  }
  return { columns, rows };
}

/** CSV ساده با جداکننده خودکار `,` یا `;` یا تب. */
export function parseCsvText(text: string): ParamTable {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) return EMPTY_PARAM_TABLE;
  const sep = detectSep(lines[0]!);
  const matrix = lines.map((line) => splitCsvLine(line, sep));
  return matrixToTable(matrix);
}

function detectSep(headerLine: string): string {
  const counts = [
    { sep: "\t", n: (headerLine.match(/\t/g) || []).length },
    { sep: ";", n: (headerLine.match(/;/g) || []).length },
    { sep: ",", n: (headerLine.match(/,/g) || []).length },
  ];
  counts.sort((a, b) => b.n - a.n);
  return counts[0]!.n > 0 ? counts[0]!.sep : ",";
}

function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === sep && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

export async function parseParamFile(file: File): Promise<ParamTable> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv") || file.type.includes("csv") || file.type === "text/plain") {
    const text = await file.text();
    return parseCsvText(text);
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".ods")) {
    const XLSX = await loadXlsx();
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", codepage: 65001 });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return EMPTY_PARAM_TABLE;
    const sheet = wb.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
    }) as string[][];
    return matrixToTable(matrix.map((row) => row.map((c) => String(c ?? ""))));
  }
  throw new Error("UNSUPPORTED_FILE");
}

export function splitFullName(full?: string | null): { firstName: string; lastName: string } {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

/** ساخت جدول قالب اکسل از مخاطبان انتخاب‌شده + ستون‌های سفارشی خالی. */
export function buildRecipientTemplate(
  recipients: ParamRecipient[],
  extraColumns: string[] = [],
): ParamTable {
  const extras = extraColumns
    .map((c) => c.trim())
    .filter((c) => c && !(PRESET_EXCEL_COLUMNS as readonly string[]).includes(c));
  const columns = [...PRESET_EXCEL_COLUMNS, ...extras];
  const rows = recipients.map((u) => {
    const split = splitFullName(u.fullName);
    const first = (u.firstName || split.firstName).trim();
    const last = (u.lastName || split.lastName).trim();
    const row: Record<string, string> = {
      موبایل: u.phone || "",
      نام: first,
      "نام خانوادگی": last,
    };
    for (const col of extras) row[col] = "";
    return row;
  });
  return { columns: [...columns], rows };
}

export function normalizePhoneDigits(raw?: string | null): string {
  if (!raw) return "";
  let digits = String(raw).replace(/[^0-9]/g, "");
  if (digits.startsWith("98") && digits.length === 12) digits = `0${digits.slice(2)}`;
  if (digits.startsWith("9") && digits.length === 10) digits = `0${digits}`;
  return digits;
}

export function isPresetParamColumn(name: string): boolean {
  return (PRESET_EXCEL_COLUMNS as readonly string[]).includes(name.trim());
}

/**
 * ردیف‌ها = مخاطبان انتخاب‌شده؛ مقادیر ستون‌های سفارشی قبلی با تطبیق موبایل حفظ می‌شوند.
 */
export function buildManualListFromRecipients(
  recipients: ParamRecipient[],
  existing?: ParamTable | null,
): ParamTable {
  const extras =
    existing?.columns.filter((c) => !isPresetParamColumn(c)).map((c) => c.trim()).filter(Boolean) ||
    [];
  const base = buildRecipientTemplate(recipients, extras);
  if (!existing?.rows?.length || extras.length === 0) return base;

  const prevByPhone = new Map<string, Record<string, string>>();
  for (const row of existing.rows) {
    const phone = normalizePhoneDigits(row["موبایل"] || row.phone || row.mobile);
    if (phone) prevByPhone.set(phone, row);
  }

  return {
    columns: base.columns,
    rows: base.rows.map((row) => {
      const prev = prevByPhone.get(normalizePhoneDigits(row["موبایل"]));
      if (!prev) return row;
      const next = { ...row };
      for (const col of extras) {
        next[col] = prev[col] ?? "";
      }
      return next;
    }),
  };
}

function tableToMatrix(table: ParamTable): string[][] {
  const matrix: string[][] = [table.columns];
  for (const row of table.rows) {
    matrix.push(table.columns.map((c) => row[c] ?? ""));
  }
  return matrix;
}

export async function downloadParamExcel(table: ParamTable, filename = "params.xlsx") {
  if (!table.columns.length) throw new Error("EMPTY_TABLE");
  const XLSX = await loadXlsx();
  const sheet = XLSX.utils.aoa_to_sheet(tableToMatrix(table));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "params");
  XLSX.writeFile(wb, filename, { bookType: "xlsx" });
}

export function paramTablePayload(table: ParamTable): Record<string, string>[] | undefined {
  if (!table.columns.length || !table.rows.length) return undefined;
  return table.rows.map((row) => {
    const out: Record<string, string> = {};
    for (const col of table.columns) {
      out[col] = row[col] ?? "";
    }
    return out;
  });
}

export function insertPlaceholder(text: string, paramName: string, at?: number): string {
  const token = `{${paramName}}`;
  if (at == null || at < 0 || at > text.length) return `${text}${token}`;
  return text.slice(0, at) + token + text.slice(at);
}

/** پیدا کردن نام‌های ستون تکراری (پس از trim). */
export function findDuplicateColumns(columns: string[]): string[] {
  const counts = new Map<string, number>();
  for (const raw of columns) {
    const name = raw.trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()].filter(([, n]) => n > 1).map(([name]) => name);
}

export function normalizeDraftTable(columns: string[], cells: string[][]): ParamTable {
  const trimmed = columns.map((c) => c.trim());
  const dupes = findDuplicateColumns(trimmed);
  if (trimmed.some((c) => !c)) throw new Error("EMPTY_COLUMN");
  if (dupes.length) throw new Error("DUPLICATE_COLUMN");
  const rows = cells
    .map((line) => {
      const row: Record<string, string> = {};
      trimmed.forEach((col, i) => {
        row[col] = String(line[i] ?? "").trim();
      });
      return row;
    })
    .filter((r) => trimmed.some((c) => (r[c] || "").trim()));
  return { columns: trimmed, rows };
}

export function loadParamTemplates(): SavedParamTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SavedParamTemplate[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveParamTemplate(name: string, table: ParamTable): SavedParamTemplate {
  const templates = loadParamTemplates();
  const item: SavedParamTemplate = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || "بدون نام",
    columns: [...table.columns],
    rows: table.rows.map((r) => ({ ...r })),
    savedAt: new Date().toISOString(),
  };
  templates.unshift(item);
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates.slice(0, 40)));
  return item;
}

export function deleteParamTemplate(id: string) {
  const next = loadParamTemplates().filter((t) => t.id !== id);
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(next));
}
