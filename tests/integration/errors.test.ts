import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync, execFileSync } from "child_process";
import Database from "better-sqlite3";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "../..");
const cliScript = resolve(projectRoot, "dist/agent-comments.mjs");

function createTempRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "agent-comments-test-"));
  execSync("git init", { cwd: dir, encoding: "utf-8", stdio: "pipe" });
  execSync("git config user.email test@test.com", { cwd: dir, encoding: "utf-8", stdio: "pipe" });
  execSync("git config user.name test", { cwd: dir, encoding: "utf-8", stdio: "pipe" });
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "main.ts"), "// placeholder\n");
  writeFileSync(join(dir, "README.md"), "# test repo\n");
  return dir;
}

function cli(args: string[], cwd: string): string {
  return execFileSync(process.execPath, [cliScript, ...args], {
    cwd, encoding: "utf-8",
  }).trim();
}

function cleanupDb(dir: string) {
  try {
    const dbPath = cli(["debug", "pwd"], dir);
    for (const ext of [".sqlite", ".sqlite-wal", ".sqlite-shm"]) {
      const path = dbPath.replace(/\.sqlite$/, ext);
      if (existsSync(path)) unlinkSync(path);
    }
  } catch { /* best effort */ }
}

describe("error cases", () => {
  let dir = "";
  beforeEach(() => { dir = createTempRepo(); });
  afterEach(() => { cleanupDb(dir); rmSync(dir, { recursive: true, force: true }); });

  it("fails with clear message when adding to non-existent file", () => {
    const out = execFileSync(process.execPath, [cliScript, "add", "nope.ts", "11", "whatever"], {
      cwd: dir, encoding: "utf-8",
    });
    expect(out).toContain("Added");
  });

  it("fails when resolving a non-existent comment", () => {
    expect(() => cli(["resolve", "deadbeef"], dir)).toThrow("No comment found");
  });

  it("fails when deleting a non-existent comment", () => {
    expect(() => cli(["delete", "deadbeef"], dir)).toThrow("No comment found");
  });

  it("fails when short id is ambiguous", () => {
    const dbPath = cli(["debug", "pwd"], dir);
    const testDb = new Database(dbPath);
    const now = new Date().toISOString();
    testDb
      .prepare("INSERT INTO comments VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run("aaaaaa00-0000-0000-0000-000000000000", "src/main.ts", 11, 11, "aaa comment", "active", now, now);
    testDb
      .prepare("INSERT INTO comments VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run("aaaabb00-0000-0000-0000-000000000000", "src/main.ts", 22, 22, "aab comment", "active", now, now);
    testDb.close();
    expect(() => cli(["resolve", "aaa"], dir)).toThrow("Ambiguous");
  });
});
