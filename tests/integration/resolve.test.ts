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

describe("resolve", () => {
  let dir = "";
  beforeEach(() => { dir = createTempRepo(); });
  afterEach(() => { cleanupDb(dir); rmSync(dir, { recursive: true, force: true }); });

  it("resolves a single comment by short id", () => {
    const addOut = cli(["add", "src/main.ts", "11", "fix me"], dir);
    const id = addOut.match(/[a-f0-9]{8}/)![0];
    const resolveOut = cli(["resolve", id], dir);
    expect(resolveOut).toContain(`Resolved ${id}`);
    const active = cli(["get", "--status", "active"], dir);
    expect(active).toBe("No comments found.");
  });

  it("resolves multiple comments at once", () => {
    const a1 = cli(["add", "src/main.ts", "11", "bug a"], dir).match(/[a-f0-9]{8}/)![0];
    const a2 = cli(["add", "src/main.ts", "22", "bug b"], dir).match(/[a-f0-9]{8}/)![0];
    cli(["resolve", a1, a2], dir);
    const active = cli(["get", "--status", "active"], dir);
    expect(active).toBe("No comments found.");
  });

  it("resolves all with --all", () => {
    cli(["add", "src/main.ts", "11", "bug x"], dir);
    cli(["add", "src/main.ts", "22", "bug y"], dir);
    const out = cli(["resolve", "--all"], dir);
    expect(out).toMatch(/^Resolved 2 comments?$/);
    const active = cli(["get", "--status", "active"], dir);
    expect(active).toBe("No comments found.");
  });
});

describe("unresolve", () => {
  let dir = "";
  beforeEach(() => { dir = createTempRepo(); });
  afterEach(() => { cleanupDb(dir); rmSync(dir, { recursive: true, force: true }); });

  it("unresolves a comment", () => {
    const addOut = cli(["add", "src/main.ts", "11", "oops"], dir);
    const id = addOut.match(/[a-f0-9]{8}/)![0];
    cli(["resolve", id], dir);
    const unresolveOut = cli(["unresolve", id], dir);
    expect(unresolveOut).toContain(`Unresolved ${id}`);
    const active = cli(["get", "--status", "active"], dir);
    expect(active).toContain("oops");
  });
});
