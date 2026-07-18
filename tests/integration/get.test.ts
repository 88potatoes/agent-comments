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

describe("get", () => {
  let dir = "";
  beforeEach(() => { dir = createTempRepo(); });
  afterEach(() => { cleanupDb(dir); rmSync(dir, { recursive: true, force: true }); });

  it("lists active comments by default", () => {
    cli(["add", "src/main.ts", "11", "bug one"], dir);
    cli(["add", "src/main.ts", "22", "bug two"], dir);
    const out = cli(["get"], dir);
    expect(out).toContain("bug one");
    expect(out).toContain("bug two");
  });

  it("filters by file", () => {
    cli(["add", "src/main.ts", "11", "main bug"], dir);
    cli(["add", "README.md", "3", "readme typo"], dir);
    const out = cli(["get", "--file", "src/main.ts"], dir);
    expect(out).toContain("main bug");
    expect(out).not.toContain("readme typo");
  });

  it("filters by resolved status", () => {
    const addOut = cli(["add", "src/main.ts", "11", "fix me"], dir);
    const id = addOut.match(/[a-f0-9]{8}/)![0];
    cli(["resolve", id], dir);
    const resolved = cli(["get", "--status", "resolved"], dir);
    expect(resolved).toContain("fix me");
    const active = cli(["get", "--status", "active"], dir);
    expect(active).toBe("No comments found.");
  });

  it("shows all comments with --status all", () => {
    const addOut = cli(["add", "src/main.ts", "11", "fix me"], dir);
    const id = addOut.match(/[a-f0-9]{8}/)![0];
    cli(["resolve", id], dir);
    cli(["add", "src/main.ts", "22", "new bug"], dir);
    const out = cli(["get", "--status", "all"], dir);
    expect(out).toContain("fix me");
    expect(out).toContain("new bug");
  });

  it("shows empty message when no comments exist", () => {
    expect(cli(["get"], dir)).toBe("No comments found.");
  });

  it("shows empty message in graph view when no comments", () => {
    expect(cli(["get", "--view", "graph"], dir)).toBe("No comments found.");
  });

  it("outputs json with --view json", () => {
    cli(["add", "src/main.ts", "11", "json test"], dir);
    const out = cli(["get", "--view", "json"], dir);
    const parsed = JSON.parse(out);
    expect(parsed.comments).toHaveLength(1);
    expect(parsed.comments[0].message).toBe("json test");
    expect(parsed.comments[0].file).toBe("src/main.ts");
    expect(parsed.comments[0]).toHaveProperty("id");
    expect(parsed.comments[0]).toHaveProperty("status", "active");
  });
});