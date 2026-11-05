import type { Benefit } from "./benefit-schema";

export type AnswerValue<T> = T | "unsure" | null | undefined;

export type MatchAnswers = {
  state: string;
  county?: string;
  who?: AnswerValue<"veteran" | "spouse" | "surviving_spouse" | "dependent_child">;
  rating?: AnswerValue<number>;
  p_and_t?: AnswerValue<boolean>;
  tdiu?: AnswerValue<boolean>;
  homeowner?: AnswerValue<boolean>;
  discharge?: AnswerValue<"honorable" | "general" | "oth" | "other">;
  wartime?: AnswerValue<boolean>;
  special_statuses?: string[];
};

export type MatchResults = {
  eligible: Benefit[];
  maybe: Benefit[];
  ineligible: Benefit[];
};

function isUnknown<T>(value: AnswerValue<T>): value is "unsure" | null | undefined {
  return value === undefined || value === null || value === "unsure";
}

export function match(answers: MatchAnswers, benefits: Benefit[]): MatchResults {
  const results: MatchResults = { eligible: [], maybe: [], ineligible: [] };

  for (const benefit of benefits) {
    let hasUnknownRule = false;
    let failedRule = benefit.state !== answers.state;

    if (benefit.counties !== "all") {
      if (isUnknown(answers.county)) hasUnknownRule = true;
      else if (!benefit.counties.includes(answers.county ?? "")) failedRule = true;
    }

    const rules = benefit.eligibility;
    if (rules.who?.length) {
      if (isUnknown(answers.who)) hasUnknownRule = true;
      else if (!rules.who.includes(answers.who)) failedRule = true;
    }
    if (rules.min_rating !== undefined) {
      if (isUnknown(answers.rating)) hasUnknownRule = true;
      else if (answers.rating < rules.min_rating) failedRule = true;
    }
    if (rules.p_and_t !== undefined) {
      if (isUnknown(answers.p_and_t)) hasUnknownRule = true;
      else if (answers.p_and_t !== rules.p_and_t) failedRule = true;
    }
    if (rules.tdiu !== undefined) {
      if (isUnknown(answers.tdiu)) hasUnknownRule = true;
      else if (answers.tdiu !== rules.tdiu) failedRule = true;
    }
    if (rules.requires_homeowner !== undefined) {
      if (isUnknown(answers.homeowner)) hasUnknownRule = true;
      else if (answers.homeowner !== rules.requires_homeowner) failedRule = true;
    }
    if (rules.discharge?.length) {
      if (isUnknown(answers.discharge)) hasUnknownRule = true;
      else if (!rules.discharge.includes(answers.discharge)) failedRule = true;
    }
    if (rules.wartime_required) {
      if (isUnknown(answers.wartime)) hasUnknownRule = true;
      else if (answers.wartime !== true) failedRule = true;
    }
    if (rules.special_statuses?.length) {
      if (answers.special_statuses === undefined) hasUnknownRule = true;
      else if (!rules.special_statuses.every((status) => answers.special_statuses!.includes(status))) {
        failedRule = true;
      }
    }

    if (failedRule) results.ineligible.push(benefit);
    else if (hasUnknownRule || (rules.other_requirements?.length ?? 0) > 0) {
      results.maybe.push(benefit);
    } else results.eligible.push(benefit);
  }

  return results;
}
