#!/usr/bin/env node
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const entry = resolve(__dirname, "..", "src", "index.ts");

process.argv = [process.execPath, "--import", "tsx/esm", entry, ...process.argv.slice(2)];
import("node:child_process").then(({ execFileSync }) => {
  try {
    execFileSync(process.argv[0], process.argv.slice(1), { stdio: "inherit" });
    process.exit(0);
  } catch (e) {
    process.exit(e.status ?? 1);
  }
});
