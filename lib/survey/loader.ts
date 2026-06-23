import * as XLSX from "xlsx";

export interface SurveyConfig {
  [questionKey: string]: {
    weight: number;
    scale_min: number;
    scale_max: number;
  };
}

export interface SurveyRow {
  user_id: string;
  name: string;
  age: number;
  email: string;
  gender: string;
  [questionKey: string]: string | number;
}

export function loadSurvey(
  fileBuffer: Buffer,
  config: SurveyConfig,
): SurveyRow[] {
  const workbook = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: false,
    dateNF: "yyyy-mm-dd hh:mm:ss",
  });

  if (rawRows.length === 0) throw new Error("Spreadsheet is empty.");

  const rows = rawRows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v]),
    ),
  ) as Record<string, unknown>[];

  for (const row of rows) {
    if (!row["user_id"]) {
      if (!row["name"] || !row["timestamp"]) {
        throw new Error(
          "Spreadsheet must have either a 'user_id' column or both 'name' and 'timestamp' columns.",
        );
      }
      const name = String(row["name"]).trim();
      const ts = new Date(String(row["timestamp"]));
      if (isNaN(ts.getTime()))
        throw new Error(`Invalid timestamp: ${row["timestamp"]}`);

      const formatted = ts
        .toISOString()
        .replace(/[-:T]/g, "")
        .slice(0, 15)
        .replace(/(\d{8})(\d{6})/, "$1_$2");

      row["user_id"] = `${name}_${formatted}`;
    }
  }

  const identityCols = ["user_id", "name", "age", "email", "gender"];
  const questionCols = Object.keys(config).map((k) => k.toLowerCase());
  const requiredCols = [...identityCols, ...questionCols];

  const availableCols = Object.keys(rows[0]);
  const missing = requiredCols.filter((c) => !availableCols.includes(c));
  if (missing.length > 0) {
    throw new Error(`Missing columns in spreadsheet: ${missing.join(", ")}`);
  }

  return rows
    .map(
      (row) =>
        Object.fromEntries(
          requiredCols.map((col) => [col, row[col]]),
        ) as SurveyRow,
    )
    .filter((row) =>
      requiredCols.every(
        (col) => row[col] !== undefined && row[col] !== null && row[col] !== "",
      ),
    );
}
