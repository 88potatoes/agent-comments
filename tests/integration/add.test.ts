import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync, execFileSync } from "child_process";
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

describe("add", () => {
  let dir = "";
  beforeEach(() => { dir = createTempRepo(); });
  afterEach(() => { cleanupDb(dir); rmSync(dir, { recursive: true, force: true }); });

  it("adds a single-line comment and returns a short id", () => {
    const out = cli(["add", "src/main.ts", "11", "fix the bug"], dir);
    expect(out).toMatch(/Added [a-f0-9]{8} at src\/main\.ts:11$/);
  });

  it("adds a range comment", () => {
    const out = cli(["add", "src/main.ts", "10:15", "refactor this"], dir);
    expect(out).toMatch(/Added [a-f0-9]{8} at src\/main\.ts:10-15$/);
  });
});