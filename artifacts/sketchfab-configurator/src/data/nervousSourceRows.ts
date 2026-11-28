import nervousCsv from '@assets/Nervous_system_CLean_1791612986964.csv?raw';

// Shared raw source data must not import any atlas classifiers: those classifiers
// depend on one another, while CSV access must be safe in every import order.
export function parseCsv(source: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], value = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"') {
      if (quoted && source[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && (ch === ',' || ch === '\n')) {
      row.push(value.replace(/\r$/, '')); value = '';
      if (ch === '\n') { rows.push(row); row = []; }
    } else value += ch;
  }
  if (value || row.length) { row.push(value.replace(/\r$/, '')); rows.push(row); }
  const header = rows.shift() ?? [];
  return rows.filter(row => row.length > 1).map(row =>
    Object.fromEntries(header.map((key, i) => [key, row[i] ?? ''])));
}
export const NERVOUS_SOURCE_ROWS = parseCsv(nervousCsv);
export const NERVOUS_SOURCE_OBJECTS = NERVOUS_SOURCE_ROWS.filter(row => row.row_type === 'OBJECT' && row.object_type === 'MESH');
