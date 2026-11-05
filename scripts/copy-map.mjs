import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = resolve(root, "public");

mkdirSync(publicDir, { recursive: true });
copyFileSync(resolve(root, "node_modules", "us-atlas", "states-10m.json"), resolve(publicDir, "us-states.json"));
copyFileSync(resolve(root, "node_modules", "us-atlas", "counties-10m.json"), resolve(publicDir, "us-counties.json"));
