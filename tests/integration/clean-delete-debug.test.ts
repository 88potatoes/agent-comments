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

describe("clean", () => {
  let dir = "";
  beforeEach(() => { dir = createTempRepo(); });
  afterEach(() => { cleanupDb(dir); rmSync(dir, { recursive: true, force: true }); });

  it("deletes all resolved comments by default", () => {
    cli(["add", "src/main.ts", "11", "keep"], dir);
    const a2 = cli(["add", "src/main.ts", "22", "remove"], dir).match(/[a-f0-9]{8}/)![0];
    cli(["resolve", a2], dir);
    const cleanOut = cli(["clean"], dir);
    expect(cleanOut).toContain("Cleared 1 resolved");
    const all = cli(["get", "--status", "all"], dir);
    expect(all).toContain("keep");
    expect(all).not.toContain("remove");
  });

  it("deletes only resolved with clean resolved", () => {
    cli(["add", "src/main.ts", "11", "keep"], dir);
    const a2 = cli(["add", "src/main.ts", "22", "remove"], dir).match(/[a-f0-9]{8}/)![0];
    cli(["resolve", a2], dir);
    const out = cli(["clean", "resolved"], dir);
    expect(out).toContain("Cleared 1 resolved");
    const all = cli(["get", "--status", "all"], dir);
    expect(all).toContain("keep");
    expect(all).not.toContain("remove");
  });

  it("deletes only unresolved with clean unresolved", () => {
    cli(["add", "src/main.ts", "11", "remove"], dir);
    const a2 = cli(["add", "src/main.ts", "22", "keep"], dir).match(/[a-f0-9]{8}/)![0];
    cli(["resolve", a2], dir);
    const out = cli(["clean", "unresolved"], dir);
    expect(out).toContain("Cleared 1 unresolved");
    const all = cli(["get", "--status", "all"], dir);
    expect(all).not.toContain("remove");
    expect(all).toContain("keep");
  });
});

describe("delete", () => {
  let dir = "";
  beforeEach(() => { dir = createTempRepo(); });
  afterEach(() => { cleanupDb(dir); rmSync(dir, { recursive: true, force: true }); });

  it("deletes a comment by short id", () => {
    const addOut = cli(["add", "src/main.ts", "11", "delete me"], dir);
    const id = addOut.match(/[a-f0-9]{8}/)![0];
    const deleteOut = cli(["delete", id], dir);
    expect(deleteOut).toContain(`Deleted ${id}`);
    const all = cli(["get", "--status", "all"], dir);
    expect(all).toBe("No comments found.");
  });
});

describe("debug", () => {
  let dir = "";
  beforeEach(() => { dir = createTempRepo(); });
  afterEach(() => { cleanupDb(dir); rmSync(dir, { recursive: true, force: true }); });

  it("pwd prints the sqlite db path", () => {
    const out = cli(["debug", "pwd"], dir);
    expect(out).toMatch(/\.sqlite$/);
    expect(out).toContain("agent-comments-test-");
  });
});
