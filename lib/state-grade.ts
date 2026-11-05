const gradeBands = ["A", "B", "C", "D", "E", "F"] as const;
const rankBandLimits = [8, 17, 25, 33, 41, 50] as const;

export function gradeForRank(rank: number): (typeof gradeBands)[number] {
  if (!Number.isInteger(rank) || rank < 1 || rank > 50) {
    throw new RangeError("State rank must be an integer from 1 to 50.");
  }

  const band = rankBandLimits.findIndex((limit) => rank <= limit);
  return gradeBands[band];
}
