import { execSync } from "node:child_process";
import { mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import Database from "better-sqlite3";

type DB = InstanceType<typeof Database>;

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
export const db: DB = new Database(dbPath);

// WAL mode for better concurrent reads
db.pragma("journal_mode = WAL");

db.exec(`
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

// Migrations: add columns added after initial release
const migrateColumns: Array<{ name: string; type: string }> = [
  { name: "source", type: "TEXT NOT NULL DEFAULT 'local'" },
  { name: "externalId", type: "INTEGER" },
  { name: "author", type: "TEXT" },
  { name: "url", type: "TEXT" },
];
for (const col of migrateColumns) {
  const hasColumn = db
    .prepare(`SELECT COUNT(*) as cnt FROM pragma_table_info('comments') WHERE name = ?`)
    .get(col.name) as { cnt: number };
  if (hasColumn.cnt === 0) {
    db.exec(`ALTER TABLE comments ADD COLUMN ${col.name} ${col.type}`);
  }
}

// Migrate older schemas whose CHECK constraint did not allow 'draft'.
// SQLite can't ALTER a CHECK in place, so rebuild the table.
const commentsSchema = db
  .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='comments'")
  .get() as { sql: string } | undefined;
if (
  commentsSchema &&
  !commentsSchema.sql.includes("'draft'")
) {
  db.exec("ALTER TABLE comments RENAME TO comments_old");
  db.exec(`
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
  db.exec("INSERT INTO comments SELECT * FROM comments_old");
  db.exec("DROP TABLE comments_old");
}
