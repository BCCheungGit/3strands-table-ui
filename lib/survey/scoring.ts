import { SurveyConfig, SurveyRow } from "./loader";

export interface ScoredParticipant {
  user_id: string;
  name: string;
  age: number;
  email: string;
  gender: string;
  score: number;
}

export interface TableAssignment extends ScoredParticipant {
  table: number;
}

export interface TableSummary {
  table: number;
  members: TableAssignment[];
  avg_score: number;
}

export function computeScore(
  responses: Record<string, number>,
  config: SurveyConfig,
): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [q, value] of Object.entries(responses)) {
    if (!(q in config)) throw new Error(`Question '${q}' not found in config.`);
    const { weight, scale_min, scale_max } = config[q];
    if (scale_max === scale_min)
      throw new Error(`Question '${q}' has scale_min == scale_max.`);

    const normalized = Math.min(
      1,
      Math.max(0, (value - scale_min) / (scale_max - scale_min)),
    );
    weightedSum += normalized * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) throw new Error("Total weight is zero.");
  return Math.round((weightedSum / totalWeight) * 100 * 100) / 100;
}

export function scoreParticipants(
  rows: SurveyRow[],
  config: SurveyConfig,
): ScoredParticipant[] {
  const questionKeys = Object.keys(config).map((k) => k.toLowerCase());
  return rows.map((row) => {
    const responses = Object.fromEntries(
      questionKeys.map((q) => [q, Number(row[q])]),
    ) as Record<string, number>;
    return {
      user_id: String(row.user_id),
      name: String(row.name),
      age: Number(row.age),
      email: String(row.email),
      gender: String(row.gender),
      score: computeScore(responses, config),
    };
  });
}

export function assignRounds(
  scores: ScoredParticipant[],
  tableSize = 4,
  numRounds = 4,
): Record<number, TableAssignment[]> {
  const males = scores
    .filter((p) => p.gender.toUpperCase() === "M")
    .sort((a, b) => a.score - b.score);
  const females = scores
    .filter((p) => p.gender.toUpperCase() === "F")
    .sort((a, b) => a.score - b.score);

  if (!males.length || !females.length)
    throw new Error("Need at least one male and one female participant.");

  const minSize = Math.min(males.length, females.length);
  const trimmedMales = males.slice(0, minSize);
  const trimmedFemales = females.slice(0, minSize);
  const half = Math.floor(tableSize / 2);
  const allRounds: Record<number, TableAssignment[]> = {};

  for (let roundNum = 1; roundNum <= numRounds; roundNum++) {
    const rotation = ((roundNum - 1) * half) % minSize;
    const rotFemales = [
      ...trimmedFemales.slice(rotation),
      ...trimmedFemales.slice(0, rotation),
    ];

    const combined: ScoredParticipant[] = [];
    for (let i = 0; i < minSize; i++) {
      combined.push(trimmedMales[i]);
      combined.push(rotFemales[i]);
    }

    const assignments: TableAssignment[] = [];
    let tableNum = 1;

    for (let i = 0; i < combined.length; i += tableSize) {
      const chunk = combined.slice(i, i + tableSize);
      const effectiveTable =
        chunk.length < tableSize && assignments.length > 0
          ? tableNum - 1
          : tableNum;
      for (const p of chunk) assignments.push({ ...p, table: effectiveTable });
      if (chunk.length >= tableSize) tableNum++;
    }

    allRounds[roundNum] = assignments;
  }

  return allRounds;
}

export function getTableSummary(
  assignments: TableAssignment[],
): TableSummary[] {
  const byTable = new Map<number, TableAssignment[]>();
  for (const a of assignments) {
    if (!byTable.has(a.table)) byTable.set(a.table, []);
    byTable.get(a.table)!.push(a);
  }
  return Array.from(byTable.entries())
    .sort(([a], [b]) => a - b)
    .map(([tableNum, members]) => ({
      table: tableNum,
      members,
      avg_score:
        Math.round(
          (members.reduce((s, m) => s + m.score, 0) / members.length) * 100,
        ) / 100,
    }));
}
