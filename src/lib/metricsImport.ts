import * as XLSX from "xlsx";

export type MetricImportRow = {
  data: string; // yyyy-MM-dd
  faturamento: number;
  sessoes: number;
  investimento_trafego: number;
  vendas_quantidade: number;
  vendas_valor: number;
};

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function parseLooseNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const raw = String(value).trim();
  if (!raw) return 0;

  // Remove percent sign if present
  const s = raw.replace(/%/g, "").replace(/\s+/g, "");

  // US style: 1,074.50
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    const cleaned = s.replace(/,/g, "");
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  // BR style: 1.074,50
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    const cleaned = s.replace(/\./g, "").replace(/,/g, ".");
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  // Decimal with comma: 74,5
  if (s.includes(",") && !s.includes(".")) {
    const cleaned = s.replace(/,/g, ".");
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  // Fallback
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function parseLooseInt(value: unknown): number {
  const n = parseLooseNumber(value);
  if (!Number.isFinite(n)) return 0;
  return Math.trunc(n);
}

export function normalizeDateToISO(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  // Excel serial
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d || !d.y || !d.m || !d.d) return null;
    const yyyy = String(d.y).padStart(4, "0");
    const mm = String(d.m).padStart(2, "0");
    const dd = String(d.d).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  const s = String(value).trim();
  if (!s) return null;

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // dd/mm/yy or dd/mm/yyyy or mm/dd/yy
  if (s.includes("/")) {
    const [a, b, c] = s.split("/").map((p) => p.trim());
    if (!a || !b || !c) return null;
    const n1 = Number.parseInt(a, 10);
    const n2 = Number.parseInt(b, 10);
    let yy = Number.parseInt(c, 10);
    if (!Number.isFinite(n1) || !Number.isFinite(n2) || !Number.isFinite(yy)) return null;
    if (c.length === 2) yy = 2000 + yy;

    // Heurística: se o primeiro número > 12, é dd/mm; senão, assume dd/mm (padrão BR)
    const day = n1 > 12 ? n1 : n1;
    const month = n1 > 12 ? n2 : n2;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const yyyy = String(yy).padStart(4, "0");
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

function findHeaderRowIndex(rows: unknown[][]): number {
  const max = Math.min(rows.length, 30);
  for (let i = 0; i < max; i++) {
    const r = rows[i] ?? [];
    const headers = r.map(normalizeHeader);
    const hasData = headers.includes("data") || headers.includes("date");
    const hasShopifySignals = headers.includes("vendas brutas") || headers.includes("quantidade de vendas") || headers.includes("visitas");
    const hasStandardSignals = headers.includes("faturamento") || headers.includes("sessoes") || headers.includes("sessões");
    if (hasData && (hasShopifySignals || hasStandardSignals)) return i;
  }
  return 0;
}

function getIndex(headers: string[], aliases: string[]): number {
  for (const a of aliases) {
    const idx = headers.indexOf(a);
    if (idx !== -1) return idx;
  }
  return -1;
}

function mapColumns(headers: string[]) {
  const h = headers;
  const idxData = getIndex(h, ["data", "date"]);
  const idxSessoes = getIndex(h, ["sessoes", "sessões", "sessions", "visitas", "visits"]);
  const idxFaturamento = getIndex(h, ["faturamento", "revenue", "gross sales", "vendas brutas", "vendas_brutas"]);
  const idxInvest = getIndex(h, ["investimento_trafego", "investimento", "ad spend", "spend", "gasto"]);
  const idxVendasQtd = getIndex(h, ["vendas_quantidade", "quantidade de vendas", "orders", "qtd vendas", "quantidade_vendas"]);
  const idxVendasValor = getIndex(h, ["vendas_valor", "valor de vendas", "sales value", "vendas brutas", "gross sales"]);
  return { idxData, idxSessoes, idxFaturamento, idxInvest, idxVendasQtd, idxVendasValor };
}

function buildRowFromMappedColumns(row: unknown[], map: ReturnType<typeof mapColumns>): MetricImportRow | null {
  const iso = normalizeDateToISO(row[map.idxData]);
  if (!iso) return null;

  // Segurança: ignora datas muito no futuro (evita imports “silenciosamente errados”)
  const today = new Date();
  const isoDate = new Date(`${iso}T00:00:00`);
  const maxFuture = new Date(today);
  maxFuture.setDate(maxFuture.getDate() + 2);
  if (isoDate.getTime() > maxFuture.getTime()) return null;

  const sessoes = map.idxSessoes >= 0 ? parseLooseInt(row[map.idxSessoes]) : 0;
  const faturamento = map.idxFaturamento >= 0 ? parseLooseNumber(row[map.idxFaturamento]) : 0;
  const investimento = map.idxInvest >= 0 ? parseLooseNumber(row[map.idxInvest]) : 0;
  const vendasQtd = map.idxVendasQtd >= 0 ? parseLooseInt(row[map.idxVendasQtd]) : 0;
  const vendasValor = map.idxVendasValor >= 0 ? parseLooseNumber(row[map.idxVendasValor]) : faturamento;

  return {
    data: iso,
    faturamento,
    sessoes,
    investimento_trafego: investimento,
    vendas_quantidade: vendasQtd,
    vendas_valor: vendasValor,
  };
}

export function parseExcelMetricsFile(arrayBuffer: ArrayBuffer): MetricImportRow[] {
  const bytes = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(bytes, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true }) as unknown[][];
  if (!matrix.length) return [];

  const headerRowIndex = findHeaderRowIndex(matrix);
  const headers = (matrix[headerRowIndex] ?? []).map(normalizeHeader);
  const map = mapColumns(headers);

  // Se não conseguimos mapear o mínimo, cai no formato padrão por posição (compatibilidade)
  const canMap = map.idxData >= 0 && (map.idxFaturamento >= 0 || map.idxVendasValor >= 0 || map.idxSessoes >= 0);
  const start = headerRowIndex + 1;

  const out: MetricImportRow[] = [];
  for (let i = start; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row || row.every((c) => String(c ?? "").trim() === "")) continue;

    if (canMap) {
      const built = buildRowFromMappedColumns(row, map);
      if (built) out.push(built);
      continue;
    }

    // Posição padrão: data,faturamento,sessoes,investimento,vendas_quantidade,vendas_valor
    if (row.length < 2) continue;
    const iso = normalizeDateToISO(row[0]);
    if (!iso) continue;
    const built: MetricImportRow = {
      data: iso,
      faturamento: parseLooseNumber(row[1]),
      sessoes: parseLooseInt(row[2]),
      investimento_trafego: parseLooseNumber(row[3]),
      vendas_quantidade: parseLooseInt(row[4]),
      vendas_valor: parseLooseNumber(row[5]),
    };
    out.push(built);
  }

  return out;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseCsvMetricsFile(text: string): MetricImportRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];

  // Detect delimiter (simple)
  const delimiter = (lines[0].match(/;/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";

  // Find header
  let headerIndex = 0;
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const cols = parseCsvLine(lines[i], delimiter).map(normalizeHeader);
    const hasData = cols.includes("data") || cols.includes("date") || cols.includes("data ");
    if (hasData) {
      headerIndex = i;
      break;
    }
  }

  const headers = parseCsvLine(lines[headerIndex], delimiter).map(normalizeHeader);
  const map = mapColumns(headers);
  const canMap = map.idxData >= 0;

  const out: MetricImportRow[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i], delimiter);
    if (!row.length) continue;
    if (canMap) {
      const built = buildRowFromMappedColumns(row, map);
      if (built) out.push(built);
      continue;
    }
    if (row.length < 2) continue;
    const iso = normalizeDateToISO(row[0]);
    if (!iso) continue;
    out.push({
      data: iso,
      faturamento: parseLooseNumber(row[1]),
      sessoes: parseLooseInt(row[2]),
      investimento_trafego: parseLooseNumber(row[3]),
      vendas_quantidade: parseLooseInt(row[4]),
      vendas_valor: parseLooseNumber(row[5]),
    });
  }

  return out;
}
