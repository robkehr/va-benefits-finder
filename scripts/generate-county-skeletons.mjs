// Generates a county skeleton YAML for each state from the us-atlas counties TopoJSON.
// Only writes files for states that don't already have one (never overwrites curated data like pa.yaml).
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const topo = JSON.parse(readFileSync(resolve(root, "node_modules", "us-atlas", "counties-10m.json"), "utf8"));

const stateFips = {
  AL: "01", AK: "02", AZ: "04", AR: "05", CA: "06", CO: "08", CT: "09", DE: "10",
  FL: "12", GA: "13", HI: "15", ID: "16", IL: "17", IN: "18", IA: "19", KS: "20",
  KY: "21", LA: "22", ME: "23", MD: "24", MA: "25", MI: "26", MN: "27", MS: "28",
  MO: "29", MT: "30", NE: "31", NV: "32", NH: "33", NJ: "34", NM: "35", NY: "36",
  NC: "37", ND: "38", OH: "39", OK: "40", OR: "41", PA: "42", RI: "44", SC: "45",
  SD: "46", TN: "47", TX: "48", UT: "49", VT: "50", VA: "51", WA: "53", WV: "54",
  WI: "55", WY: "56"
};

const outDir = resolve(root, "data", "counties");
mkdirSync(outDir, { recursive: true });

// Group counties by state FIPS prefix.
const byState = {};
for (const geometry of topo.objects.counties.geometries) {
  const id = String(geometry.id).padStart(5, "0");
  const stateCode = id.slice(0, 2);
  if (!byState[stateCode]) byState[stateCode] = [];
  byState[stateCode].push({ name: geometry.properties.name, fips: id });
}

let written = 0;
for (const [abbr, fips] of Object.entries(stateFips)) {
  const file = resolve(outDir, `${abbr.toLowerCase()}.yaml`);
  if (existsSync(file)) continue; // never overwrite curated data

  const counties = (byState[fips] ?? []).sort((a, b) => a.name.localeCompare(b.name));
  if (!counties.length) continue;

  const lines = [`state: ${abbr}`, "counties:"];
  for (const county of counties) {
    lines.push(
      `  - { name: ${JSON.stringify(county.name)}, fips: "${county.fips}", income_limit: null, exemption: "County-level veteran benefits not yet verified", notes: null, source_url: null, source_name: null, last_verified: null }`
    );
  }
  writeFileSync(file, lines.join("\n") + "\n", "utf8");
  written++;
}

console.log(`Wrote ${written} county skeleton files.`);
