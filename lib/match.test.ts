import { describe, expect, it } from "vitest";
import { benefitSchema, benefitsSchema } from "./benefit-schema";
import { match, type MatchAnswers } from "./match";

const benefits = benefitsSchema.parse([
  {
    id: "test-property-tax",
    name: "Test property tax exemption",
    state: "PA",
    scope: "state",
    counties: "all",
    category: "property_tax",
    summary: "Test benefit.",
    value: null,
    eligibility: {
      who: ["veteran", "surviving_spouse"],
      min_rating: 100,
      requires_homeowner: true,
      discharge: ["honorable"],
      wartime_required: true,
      other_requirements: ["A test requirement."]
    },
    how_to_apply: ["Contact the test office."],
    application_url: "https://example.gov/apply",
    source_url: "https://example.gov/source",
    last_verified: "2026-11-05"
  },
  {
    id: "test-vehicle-fee-waiver",
    name: "Test vehicle fee waiver",
    state: "PA",
    scope: "state",
    counties: "all",
    category: "vehicle",
    summary: "Test benefit.",
    value: null,
    eligibility: {
      who: ["veteran"],
      min_rating: 100,
      p_and_t: true,
      discharge: ["honorable", "general"],
      other_requirements: ["A test requirement."]
    },
    how_to_apply: ["Contact the test office."],
    application_url: "https://example.gov/apply",
    source_url: "https://example.gov/source",
    last_verified: "2026-11-05"
  },
  {
    id: "test-parks-access",
    name: "Test parks access",
    state: "PA",
    scope: "state",
    counties: "all",
    category: "recreation",
    summary: "Test benefit.",
    value: null,
    eligibility: {
      who: ["veteran", "spouse", "dependent_child"],
      other_requirements: ["A test requirement."]
    },
    how_to_apply: ["Contact the test office."],
    application_url: "https://example.gov/apply",
    source_url: "https://example.gov/source",
    last_verified: "2026-11-05"
  }
]);

const completeAnswers: MatchAnswers = {
  state: "PA",
  county: "Allegheny",
  who: "veteran",
  rating: 100,
  p_and_t: true,
  tdiu: false,
  homeowner: true,
  discharge: "honorable",
  wartime: true,
  special_statuses: []
};

describe("match", () => {
  it("returns all three benefits and evaluates each one's eligibility rules", () => {
    const result = match(completeAnswers, benefits);

    expect(result.eligible).toEqual([]);
    expect(result.maybe.map(({ id }) => id)).toEqual([
      "test-property-tax",
      "test-vehicle-fee-waiver",
      "test-parks-access"
    ]);
    expect(result.ineligible).toEqual([]);
  });

  it("marks unknown answers and unmet additional requirements as maybe", () => {
    const result = match({ state: "PA" }, benefits);

    expect(result.eligible).toEqual([]);
    expect(result.maybe).toHaveLength(3);
    expect(result.ineligible).toEqual([]);
  });

  it("marks a benefit ineligible when a known answer fails a rule", () => {
    const result = match({ ...completeAnswers, rating: 70 }, benefits);

    expect(result.ineligible.map(({ id }) => id)).toEqual([
      "test-property-tax",
      "test-vehicle-fee-waiver"
    ]);
    expect(result.eligible).toEqual([]);
    expect(result.maybe.map(({ id }) => id)).toEqual(["test-parks-access"]);
  });

  it("does not mutate the provided benefits or answers", () => {
    const answers = { ...completeAnswers };
    const benefitsBefore = structuredClone(benefits);

    match(answers, benefits);

    expect(answers).toEqual(completeAnswers);
    expect(benefits).toEqual(benefitsBefore);
  });

  it("rejects empty county lists instead of treating them as statewide", () => {
    expect(benefitSchema.safeParse({ ...benefits[0], counties: [] }).success).toBe(false);

    const benefit = { ...benefits[0], counties: [] };
    const result = match(completeAnswers, [benefit]);

    expect(result.ineligible.map(({ id }) => id)).toEqual([benefit.id]);
  });

  it("marks a benefit eligible when all machine-checkable rules pass", () => {
    const benefit = {
      ...benefits[1],
      eligibility: { ...benefits[1].eligibility, other_requirements: undefined }
    };
    const result = match(completeAnswers, [benefit]);

    expect(result.eligible.map(({ id }) => id)).toEqual([benefit.id]);
  });
});
