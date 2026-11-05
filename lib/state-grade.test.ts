import { describe, expect, it } from "vitest";
import { stateRankings } from "../data/state-rankings";
import { gradeForRank } from "./state-grade";

describe("state ranking grades", () => {
  it("includes each state exactly once with ranks 1 through 50", () => {
    expect(stateRankings).toHaveLength(50);
    expect(new Set(stateRankings.map(({ abbreviation }) => abbreviation)).size).toBe(50);
    expect(stateRankings.map(({ rank }) => rank).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 50 }, (_, index) => index + 1)
    );
  });

  it("converts rank bands to letter grades", () => {
    expect([1, 9, 18, 26, 34, 42].map(gradeForRank)).toEqual([
      "A", "B", "C", "D", "E", "F"
    ]);
  });

  it("rejects ranks outside the 50-state scale", () => {
    expect(() => gradeForRank(0)).toThrow(RangeError);
    expect(() => gradeForRank(51)).toThrow(RangeError);
  });
});
