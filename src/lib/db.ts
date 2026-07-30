import { execSync } from "node:child_process";
import { mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "../db/schema.ts";

export { schema };

function getRepoRoot(): string {
  try {
    return execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
  } catch {
    return process.cwd();
  }
}

export function getDbPath(): string {
  const repoRoot = getRepoRoot();
  const home = homedir();
  const relative = repoRoot.replace(home, "").replace(/^\//, "");
  const name = relative.replace(/\//g, "_");
  const dir = join(home, ".local", "share", "agent-comments");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, `${name}.sqlite`);
}

const dbPath = getDbPath();
export { getRepoRoot };

const sqlite: Database = new Database(dbPath);

// WAL mode for better concurrent reads
sqlite.pragma("journal_mode = WAL");

// ---- Drizzle migrations ----
function getMigrationsFolder(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    // src/lib/ → ../../drizzle
    const sourcePath = join(dirname(__filename), "..", "..", "drizzle");
    if (existsSync(sourcePath)) return sourcePath;
  } catch {
    // ignore
  }
  return join(process.cwd(), "drizzle");
}

// Wrap with drizzle. On first run, migrate() auto-creates the schema
// via the drizzle migration files shipped in the package.
export const db = drizzle(sqlite, { schema });

const migrationsFolder = getMigrationsFolder();
try {
  migrate(db, { migrationsFolder });
} catch (err) {
  if (
    err instanceof Error &&
    err.message.includes("Can't find meta/_journal.json")
  ) {
    // No migrations to apply — this is fine.
  } else {
    throw err;
  }
}
