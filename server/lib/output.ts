import * as XLSX from "xlsx";
import { computeScore, assignRounds, Assignment } from "./matcher";
import { loadSurvey } from "./loader";
import weights from "../config/weights.json";

const config = weights as Record<
  string,
  { weight: number; scale_min: number; scale_max: number }
>;

export function processBatch(fileBuffer: ArrayBuffer): Buffer {
  const rows = loadSurvey(fileBuffer, config);
  const questionCols = Object.keys(config);

  const scored = rows.map((row) => ({
    user_id: String(row.user_id),
    gender: String(row.gender ?? "U"),
    score: computeScore(
      Object.fromEntries(questionCols.map((q) => [q, Number(row[q])])),
      config,
    ),
  }));

  const allRounds = assignRounds(scored, 4);
  return exportAllRounds(allRounds);
}

export function exportAllRounds(
  allRounds: Record<number, Assignment[]>,
): Buffer {
  const rows = Object.entries(allRounds).flatMap(([round, assignments]) =>
    assignments.map((p) => ({
      round: Number(round),
      table: p.table,
      user_id: p.user_id,
      gender: p.gender,
      score: p.score,
    })),
  );

  rows.sort(
    (a, b) =>
      a.round - b.round ||
      a.table - b.table ||
      a.gender.localeCompare(b.gender) ||
      a.score - b.score,
  );

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rounds");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}
