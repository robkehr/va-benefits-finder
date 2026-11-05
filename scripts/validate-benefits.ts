import { existsSync, readdirSync, readFileSync } from "node:fs";
import { load } from "js-yaml";
import { benefitsSchema, type Benefit } from "../lib/benefit-schema";
import { stateCountyDataSchema } from "../lib/county-schema";
import { stateFips } from "../lib/state-fips";
import { stateRankings } from "../data/state-rankings";

const directory = new URL("../data/benefits/", import.meta.url);
const expectedStates = new Set(stateRankings.map(({ abbreviation }) => abbreviation.toLowerCase()));
const files = readdirSync(directory).filter((fileName) => fileName.endsWith(".yaml"));
const actualStates = new Set(files.map((fileName) => fileName.slice(0, -5)));
const missingStates = [...expectedStates].filter((state) => !actualStates.has(state));
const unexpectedStates = [...actualStates].filter((state) => !expectedStates.has(state));

if (missingStates.length || unexpectedStates.length) {
  console.error("Benefit files must include exactly one YAML file for every ranked state.");
  if (missingStates.length) console.error(`Missing: ${missingStates.join(", ")}`);
  if (unexpectedStates.length) console.error(`Unexpected: ${unexpectedStates.join(", ")}`);
  process.exitCode = 1;
} else {
  const allBenefits: Benefit[] = [];
  let hasErrors = false;

  for (const fileName of files) {
    const state = fileName.slice(0, -5).toUpperCase();
    const source = readFileSync(new URL(fileName, directory), "utf8");
    const parsed = benefitsSchema.safeParse(load(source));

    if (!parsed.success) {
      console.error(`Benefit data validation failed for ${state}:`);
      console.error(parsed.error.format());
      hasErrors = true;
      continue;
    }

    const wrongState = parsed.data.filter((benefit) => benefit.state !== state);
    if (wrongState.length) {
      console.error(`${fileName} contains records for other states: ${wrongState.map(({ id }) => id).join(", ")}`);
      hasErrors = true;
    }
    allBenefits.push(...parsed.data);
  }

  const ids = new Set<string>();
  const duplicateIds = allBenefits.filter((benefit) => {
    if (ids.has(benefit.id)) return true;
    ids.add(benefit.id);
    return false;
  }).map(({ id }) => id);
  if (duplicateIds.length) {
    console.error(`Duplicate benefit IDs: ${duplicateIds.join(", ")}`);
    hasErrors = true;
  }

  if (hasErrors) process.exitCode = 1;
  else console.log(`Validated ${files.length} state files and ${allBenefits.length} benefit records.`);
}

const countiesDirectory = new URL("../data/counties/", import.meta.url);
if (existsSync(countiesDirectory)) {
  const countyFiles = readdirSync(countiesDirectory).filter((fileName) => fileName.endsWith(".yaml"));
  let countyErrors = false;

  for (const fileName of countyFiles) {
    const source = readFileSync(new URL(fileName, countiesDirectory), "utf8");
    const parsed = stateCountyDataSchema.safeParse(load(source));

    if (!parsed.success) {
      console.error(`County data validation failed for ${fileName}:`);
      console.error(parsed.error.format());
      countyErrors = true;
      continue;
    }

    const { state, counties } = parsed.data;
    const fileState = fileName.slice(0, -5).toUpperCase();
    const fipsPrefix = stateFips[state];
    if (state !== fileState) {
      console.error(`${fileName} has state ${state} but the file name implies ${fileState}.`);
      countyErrors = true;
    }
    if (!fipsPrefix) {
      console.error(`${fileName} has unknown state ${state}.`);
      countyErrors = true;
    }

    const names = new Set<string>();
    for (const county of counties) {
      if (names.has(county.name)) {
        console.error(`${fileName} has duplicate county ${county.name}.`);
        countyErrors = true;
      }
      names.add(county.name);
      if (fipsPrefix && !county.fips.startsWith(fipsPrefix)) {
        console.error(`${fileName}: county ${county.name} FIPS ${county.fips} does not match state ${state}.`);
        countyErrors = true;
      }
    }
  }

  if (countyErrors) process.exitCode = 1;
  else console.log(`Validated ${countyFiles.length} county data files.`);
}
