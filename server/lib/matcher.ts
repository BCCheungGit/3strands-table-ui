export function computeScore(
  responses: Record<string, number>,
  config: Record<
    string,
    { weight: number; scale_min: number; scale_max: number }
  >,
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

  if (totalWeight === 0)
    throw new Error("Total weight is zero. Check weights.json.");
  return Math.round((weightedSum / totalWeight) * 10000) / 100;
}

export interface Participant {
  user_id: string;
  score: number;
  gender: string;
}

export interface Assignment extends Participant {
  table: number;
}

export function assignRounds(
  scores: Participant[],
  tableSize = 4,
  numRounds = 4,
): Record<number, Assignment[]> {
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
  const allRounds: Record<number, Assignment[]> = {};

  for (let round = 1; round <= numRounds; round++) {
    const rotation = ((round - 1) * half) % minSize;
    const rotFemales = [
      ...trimmedFemales.slice(rotation),
      ...trimmedFemales.slice(0, rotation),
    ];

    const combined: Participant[] = [];
    for (let i = 0; i < minSize; i++) {
      combined.push(trimmedMales[i], rotFemales[i]);
    }

    const assignments: Assignment[] = [];
    let tableNum = 1;
    for (let i = 0; i < combined.length; i += tableSize) {
      const chunk = combined.slice(i, i + tableSize);
      if (chunk.length < tableSize && assignments.length > 0) {
        chunk.forEach((p) => assignments.push({ ...p, table: tableNum - 1 }));
      } else {
        chunk.forEach((p) => assignments.push({ ...p, table: tableNum }));
        tableNum++;
      }
    }

    allRounds[round] = assignments;
  }

  return allRounds;
}

export function getTableSummary(
  assignments: Assignment[],
): { table: number; members: Assignment[]; avg_score: number }[] {
  const grouped: Record<number, Assignment[]> = {};
  for (const a of assignments) {
    (grouped[a.table] ??= []).push(a);
  }
  return Object.entries(grouped).map(([table, members]) => ({
    table: Number(table),
    members,
    avg_score:
      Math.round(
        (members.reduce((s, m) => s + m.score, 0) / members.length) * 100,
      ) / 100,
  }));
}
