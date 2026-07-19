import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, existsSync, readFileSync } from "fs";
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

// ---- Legacy migration: ensure schema matches for users upgrading from pre-drizzle versions ----
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    file TEXT NOT NULL,
    startLine INTEGER NOT NULL,
    endLine INTEGER NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'resolved', 'draft')),
    source TEXT NOT NULL DEFAULT 'local',
    externalId INTEGER,
    author TEXT,
    url TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`);

const migrateColumns: Array<{ name: string; type: string }> = [
  { name: "source", type: "TEXT NOT NULL DEFAULT 'local'" },
  { name: "externalId", type: "INTEGER" },
  { name: "author", type: "TEXT" },
  { name: "url", type: "TEXT" },
];
for (const col of migrateColumns) {
  const hasColumn = sqlite
    .prepare(`SELECT COUNT(*) as cnt FROM pragma_table_info('comments') WHERE name = ?`)
    .get(col.name) as { cnt: number };
  if (hasColumn.cnt === 0) {
    sqlite.exec(`ALTER TABLE comments ADD COLUMN ${col.name} ${col.type}`);
  }
}

const commentsSchema = sqlite
  .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='comments'")
  .get() as { sql: string } | undefined;
if (commentsSchema && !commentsSchema.sql.includes("'draft'")) {
  sqlite.exec("ALTER TABLE comments RENAME TO comments_old");
  sqlite.exec(`
    CREATE TABLE comments (
      id TEXT PRIMARY KEY,
      file TEXT NOT NULL,
      startLine INTEGER NOT NULL,
      endLine INTEGER NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'resolved', 'draft')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `);
  sqlite.exec("INSERT INTO comments SELECT * FROM comments_old");
  sqlite.exec("DROP TABLE comments_old");
}

// ---- Drizzle migrations for future schema changes ----
// Resolve the migrations folder.
// Bundled (production): <pkg>/dist/agent-comments.mjs → <pkg>/drizzle
// Source (tests/dev):    <pkg>/src/lib/db.ts         → <pkg>/drizzle (via cwd fallback)
function getMigrationsFolder(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    // Bundled: dist/ → ../drizzle
    const bundledPath = join(dirname(__filename), "..", "drizzle");
    if (existsSync(bundledPath)) return bundledPath;
    // Source: src/lib/ → ../../drizzle
    const sourcePath = join(dirname(__filename), "..", "..", "drizzle");
    if (existsSync(sourcePath)) return sourcePath;
  } catch {
    // ignore
  }
  return join(process.cwd(), "drizzle");
}

// Bootstrap: if the comments table exists from pre-drizzle code but no migration
// tracking table exists yet, mark the initial migration as already applied so
// migrate() doesn't try to recreate the table.
const migrationsFolder = getMigrationsFolder();
const hasCommentsTable = sqlite
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='comments'")
  .get();
const hasMigrationsTable = sqlite
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'")
  .get();

if (!hasMigrationsTable && hasCommentsTable) {
  // Read the initial migration hash from the journal and record it as applied.
  // This tells drizzle that the current schema (already ensured by legacy migrations
  // above) matches the initial migration, so only future migrations will be applied.
  const journalPath = join(migrationsFolder, "meta", "_journal.json");
  if (existsSync(journalPath)) {
    const journal = JSON.parse(readFileSync(journalPath, "utf-8"));
    if (journal.entries.length > 0) {
      const firstEntry = journal.entries[0];
      const migrationPath = join(migrationsFolder, `${firstEntry.tag}.sql`);
      if (existsSync(migrationPath)) {
        const migrationSql = readFileSync(migrationPath, "utf-8");
        const hash = createHash("sha256").update(migrationSql).digest("hex");

        // Create the drizzle migrations table and insert the initial record
        sqlite.exec(`
          CREATE TABLE IF NOT EXISTS __drizzle_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            hash text NOT NULL,
            created_at numeric
          )
        `);
        sqlite
          .prepare(
            `INSERT INTO __drizzle_migrations ("hash", "created_at") VALUES (?, ?)`,
          )
          .run(hash, firstEntry.when);
      }
    }
  }
}

// Wrap with drizzle. Queries go through drizzle for type safety;
// the underlying better-sqlite3 connection is shared.
export const db = drizzle(sqlite, { schema });

// Run pending drizzle migrations (for future schema changes).
// This is a no-op if all migrations have already been applied.
try {
  migrate(db, { migrationsFolder });
} catch (err) {
  // If the migrations folder doesn't exist (e.g. during development without
  // having run drizzle-kit generate), skip gracefully.
  if (
    err instanceof Error &&
    err.message.includes("Can't find meta/_journal.json")
  ) {
    // No migrations to apply — this is fine.
  } else {
    throw err;
  }
}