import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { load } from "js-yaml";
import { Suspense } from "react";
import { benefitsSchema } from "@/lib/benefit-schema";
import { stateCountyDataSchema, type StateCountyData } from "@/lib/county-schema";
import { BenefitCategories } from "@/components/benefit-categories";
import { stateRankings } from "@/data/state-rankings";

const benefitsDirectory = resolve(process.cwd(), "data", "benefits");
const benefitsByState = Object.fromEntries(
  readdirSync(benefitsDirectory)
    .filter((fileName) => fileName.endsWith(".yaml"))
    .map((fileName) => {
      const state = fileName.slice(0, -".yaml".length).toUpperCase();
      const benefits = benefitsSchema.parse(
        load(readFileSync(resolve(benefitsDirectory, fileName), "utf8"))
      );
      return [state, benefits];
    })
);

const countiesDirectory = resolve(process.cwd(), "data", "counties");
const countyDataByState: Record<string, StateCountyData> = existsSync(countiesDirectory)
  ? Object.fromEntries(
      readdirSync(countiesDirectory)
        .filter((fileName) => fileName.endsWith(".yaml"))
        .map((fileName) => {
          const data = stateCountyDataSchema.parse(
            load(readFileSync(resolve(countiesDirectory, fileName), "utf8"))
          );
          return [data.state, data];
        })
    )
  : {};

export default function CheckPage() {
  return (
    <Suspense fallback={<main className="check-page">Loading state benefits...</main>}>
      <BenefitCategories
        benefitsByState={benefitsByState}
        countyDataByState={countyDataByState}
        rankings={stateRankings}
      />
    </Suspense>
  );
}
