import * as XLSX from "xlsx";

export function loadSurvey(
  buffer: ArrayBuffer,
  config: Record<string, unknown>,
): Record<string, unknown>[] {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

  const questionCols = Object.keys(config);
  const required = ["user_id", "gender", ...questionCols];

  for (const col of required) {
    if (!rows[0] || !(col in rows[0])) {
      throw new Error(`Missing required column: '${col}'`);
    }
  }

  return rows;
}
