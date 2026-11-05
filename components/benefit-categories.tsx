"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Benefit } from "@/lib/benefit-schema";
import type { StateCountyData } from "@/lib/county-schema";
import { gradeForRank } from "@/lib/state-grade";
import { rankingSource, type StateRanking } from "@/data/state-rankings";
import { CountyMap } from "@/components/county-map";

const categoryNames: Record<Benefit["category"], string> = {
  property_tax: "Property tax",
  vehicle: "Vehicles",
  recreation: "Recreation",
  education: "Education",
  employment: "Employment",
  financial: "Financial",
  other: "Other"
};

const categoryOrder = Object.keys(categoryNames) as Benefit["category"][];

const eligibleWhoNames: Record<NonNullable<Benefit["eligibility"]["who"]>[number], string> = {
  veteran: "veterans",
  spouse: "spouses",
  surviving_spouse: "surviving spouses",
  dependent_child: "dependent children"
};

function eligibilitySummary(benefit: Benefit): string | null {
  const { eligibility } = benefit;
  const details: string[] = [];

  if (eligibility.who?.length) {
    details.push(`For ${eligibility.who.map((who) => eligibleWhoNames[who]).join(", ")}`);
  }
  if (eligibility.min_rating !== undefined) {
    details.push(`at least ${eligibility.min_rating}% service-connected disability`);
  }
  if (eligibility.p_and_t) details.push("permanent-and-total disability status");
  if (eligibility.tdiu) details.push("individual unemployability status");
  if (eligibility.requires_homeowner) details.push("homeownership");
  if (eligibility.income_limit) details.push(`income limit: ${eligibility.income_limit}`);
  if (eligibility.discharge?.length) {
    details.push(`qualifying discharge (${eligibility.discharge.join(", ")})`);
  }
  if (eligibility.wartime_required) details.push("qualifying wartime service");
  if (eligibility.special_statuses?.length) {
    details.push(`qualifying status: ${eligibility.special_statuses.join(", ")}`);
  }

  return details.length ? `${details.join("; ")}.` : null;
}

export function BenefitCategories({
  benefitsByState,
  countyDataByState,
  rankings
}: {
  benefitsByState: Record<string, Benefit[]>;
  countyDataByState: Record<string, StateCountyData>;
  rankings: StateRanking[];
}) {
  const searchParams = useSearchParams();
  const stateCode = searchParams.get("state")?.toUpperCase() ?? "PA";
  const ranking = rankings.find(({ abbreviation }) => abbreviation === stateCode);
  const stateName = ranking?.name ?? stateCode;
  const benefits = benefitsByState[stateCode] ?? [];
  const countyData = countyDataByState[stateCode];
  const groupedBenefits = categoryOrder
    .map((category) => ({
      category,
      benefits: benefits.filter((benefit) => benefit.category === category)
    }))
    .filter((group) => group.benefits.length > 0);
  return (
    <main className="check-page">
      <section className="check-card benefits-page" aria-labelledby="check-title">
        <Link className="text-link back-link" href="/">
          Back to the state map
        </Link>
        <p className="eyebrow">{stateName} benefits</p>
        <h1 id="check-title">Browse benefits by category</h1>
        {ranking && (
          <div className="state-grade-card">
            <span className="grade-letter" aria-label={`Grade ${gradeForRank(ranking.rank)}`}>
              {gradeForRank(ranking.rank)}
            </span>
            <p>
              <strong>{stateName} ranks #{ranking.rank} of 50</strong>
              <br />
              In WalletHub&apos;s military-retiree comparison (score {ranking.score}).
            </p>
          </div>
        )}

        <p className="data-notice" role="note">
          This third-party ranking compares overall conditions for military retirees,
          including economic environment, quality of life, and health care. It is not a
          rating of veterans&apos; benefits alone. Letter grades are our own equal-sized
          rank bands (A: 1–8, B: 9–17, C: 18–25, D: 26–33, E: 34–41, F: 42–50), not
          grades issued by WalletHub. Benefit records are an initial, non-exhaustive
          catalog, and states with no sourced entries are shown as needing research, not
          as having none.
        </p>

        {countyData && (
          <CountyMap stateCode={stateCode} stateName={stateName} countyData={countyData} />
        )}

        {groupedBenefits.length > 0 ? (
          <div className="benefit-groups">
            {groupedBenefits.map(({ category, benefits: categoryBenefits }) => (
              <section key={category} aria-labelledby={`category-${category}`}>
                <h2 id={`category-${category}`}>{categoryNames[category]}</h2>
                <ul className="benefit-list">
                  {categoryBenefits.map((benefit) => (
                    <li className="benefit-item" key={benefit.id}>
                      <h3>{benefit.name}</h3>
                      <p>{benefit.summary}</p>
                      {benefit.value && <p><strong>Possible value:</strong> {benefit.value}</p>}
                      {eligibilitySummary(benefit) && (
                        <p>
                          <strong>Eligibility:</strong> {eligibilitySummary(benefit)}
                        </p>
                      )}
                      {benefit.eligibility.other_requirements?.length ? (
                        <p>
                          <strong>Still needs verification:</strong>{" "}
                          {benefit.eligibility.other_requirements.join(" ")}
                        </p>
                      ) : null}
                      {benefit.how_to_apply.length > 0 && (
                        <p>
                          <strong>How to apply:</strong> {benefit.how_to_apply.join(" ")}
                        </p>
                      )}
                      <p className="benefit-meta">
                        Source checked {benefit.last_verified.toISOString().slice(0, 10)}
                      </p>
                      <a href={benefit.source_url} target="_blank" rel="noreferrer">
                        {benefit.source_name ?? "Official source"}
                      </a>
                      {benefit.notes && <p className="benefit-meta">{benefit.notes}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <p className="no-results">
            We have not added verified benefit listings for {stateName} yet. This does not
            mean the state offers no veteran benefits. Check the state&apos;s official
            veterans affairs agency for current programs.
          </p>
        )}
        <p className="ranking-source">
          Ranking source:{" "}
          <a href={rankingSource.url} target="_blank" rel="noreferrer">
            {rankingSource.name}
          </a>
          . Accessed {rankingSource.accessed}. D.C. excluded.
        </p>
        <p className="disclaimer">
          Not affiliated with the VA or any government agency. Not legal advice. Confirm
          eligibility with the responsible agency or a free accredited VSO.
        </p>
      </section>
    </main>
  );
}
