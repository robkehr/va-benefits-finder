import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import { describe, expect, it } from "vitest";
import { stateCountyDataSchema } from "./county-schema";
import { stateFips } from "./state-fips";

describe("stateCountyDataSchema", () => {
  it("accepts the Pennsylvania county catalog", () => {
    const source = readFileSync("data/counties/pa.yaml", "utf8");
    const parsed = stateCountyDataSchema.parse(load(source));

    expect(parsed.state).toBe("PA");
    expect(parsed.counties).toHaveLength(67);
  });

  it("uses FIPS codes that match the state", () => {
    const source = readFileSync("data/counties/pa.yaml", "utf8");
    const parsed = stateCountyDataSchema.parse(load(source));
    const prefix = stateFips[parsed.state];

    for (const county of parsed.counties) {
      expect(county.fips.startsWith(prefix)).toBe(true);
    }
  });

  it("rejects counties with malformed FIPS codes", () => {
    const source = readFileSync("data/counties/pa.yaml", "utf8");
    const parsed = stateCountyDataSchema.parse(load(source));
    const broken = {
      ...parsed,
      counties: [{ ...parsed.counties[0], fips: "123" }]
    };

    expect(stateCountyDataSchema.safeParse(broken).success).toBe(false);
  });
});
