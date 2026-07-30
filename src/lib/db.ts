import { execSync } from "node:child_process";
import { mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
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

export { getRepoRoot };

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

const dbPath = getDbPath();
const client = createClient({ url: `file:${dbPath}` });

export const db: LibSQLDatabase<typeof schema> = drizzle(client, { schema });

const migrationsFolder = getMigrationsFolder();
try {
  await migrate(db, { migrationsFolder });
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
