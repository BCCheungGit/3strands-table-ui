import * as XLSX from "xlsx";
import { assignRounds, getTableSummary, scoreParticipants } from "./scoring";
import { loadSurvey, SurveyConfig } from "./loader";

export function buildOutputWorkbook(
  fileBuffer: Buffer,
  config: SurveyConfig,
): Buffer {
  // 1. Load + score
  const rows = loadSurvey(fileBuffer, config);
  const scored = scoreParticipants(rows, config);
  const allRounds = assignRounds(scored);

  const wb = XLSX.utils.book_new();

  // ── Sheet 1: Participants & Scores ────────────────────────────────────────
  const participantData = scored.map((p) => ({
    Name: p.name,
    Email: p.email,
    Age: p.age,
    Gender: p.gender === "M" ? "Male" : "Female",
    Score: p.score,
  }));
  const participantSheet = XLSX.utils.json_to_sheet(participantData);
  setColumnWidths(participantSheet, [20, 28, 8, 10, 10]);
  XLSX.utils.book_append_sheet(wb, participantSheet, "Participants");

  // ── Sheets 2–N: One sheet per round ───────────────────────────────────────
  for (const [roundNum, assignments] of Object.entries(allRounds)) {
    const summary = getTableSummary(assignments);

    // Flatten to rows: blank row between tables for readability
    const sheetRows: Record<string, string | number>[] = [];

    for (const { table, members, avg_score } of summary) {
      sheetRows.push({
        Table: `Table ${table}`,
        Name: "Name",
        Email: "Email",
        Age: "Age",
        Gender: "Gender",
        Score: "Score",
      });
      for (const m of members) {
        sheetRows.push({
          Table: "",
          Name: m.name,
          Email: m.email,
          Age: m.age,
          Gender: m.gender === "M" ? "Male" : "Female",
          Score: m.score,
        });
      }
      sheetRows.push({
        Table: "",
        Name: "Avg Score",
        Email: "",
        Age: "",
        Gender: "",
        Score: avg_score,
      });
      // blank separator row
      sheetRows.push({
        Table: "",
        Name: "",
        Email: "",
        Age: "",
        Gender: "",
        Score: "",
      });
    }

    const roundSheet = XLSX.utils.json_to_sheet(sheetRows, {
      header: ["Table", "Name", "Email", "Age", "Gender", "Score"],
    });
    setColumnWidths(roundSheet, [12, 20, 28, 8, 10, 10]);
    XLSX.utils.book_append_sheet(wb, roundSheet, `Round ${roundNum}`);
  }

  // ── Sheet N+1: Full flat dump (all rounds) ────────────────────────────────
  const allRows = Object.entries(allRounds).flatMap(([roundNum, assignments]) =>
    assignments.map((a) => ({
      Round: Number(roundNum),
      Table: a.table,
      Name: a.name,
      Email: a.email,
      Age: a.age,
      Gender: a.gender === "M" ? "Male" : "Female",
      Score: a.score,
    })),
  );
  const allRoundsSheet = XLSX.utils.json_to_sheet(allRows);
  setColumnWidths(allRoundsSheet, [8, 8, 20, 28, 8, 10, 10]);
  XLSX.utils.book_append_sheet(wb, allRoundsSheet, "All Rounds");

  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

function setColumnWidths(sheet: XLSX.WorkSheet, widths: number[]) {
  sheet["!cols"] = widths.map((w) => ({ wch: w }));
}
