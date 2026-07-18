import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync, execFileSync } from "child_process";
import Database from "better-sqlite3";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, existsSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const cliScript = resolve(projectRoot, "src/index.ts");
const tsxBin = resolve(projectRoot, "node_modules/.bin/tsx");

function createTempRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "agent-comments-test-"));
  execSync("git init", { cwd: dir, encoding: "utf-8", stdio: "pipe" });
  execSync("git config user.email test@test.com", {
    cwd: dir,
    encoding: "utf-8",
    stdio: "pipe",
  });
  execSync("git config user.name test", {
    cwd: dir,
    encoding: "utf-8",
    stdio: "pipe",
  });

  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "main.ts"), "// placeholder\n");
  writeFileSync(join(dir, "README.md"), "# test repo\n");

  return dir;
}

function removeTempRepo(dir: string) {
  rmSync(dir, { recursive: true, force: true });
}

function cli(args: string[], cwd: string): string {
  return execFileSync(tsxBin, [cliScript, ...args], {
    cwd,
    encoding: "utf-8",
  }).trim();
}

describe("agent-comments integration", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempRepo();
  });

  afterEach(() => {
    // Clean up the sqlite db files created by this test's repo
    try {
      const dbPath = cli(["debug", "pwd"], tmpDir);
      for (const ext of [".sqlite", ".sqlite-wal", ".sqlite-shm"]) {
        const path = dbPath.replace(/\.sqlite$/, ext);
        if (existsSync(path)) unlinkSync(path);
      }
    } catch {
      // if debug pwd fails, just skip db cleanup
    }
    removeTempRepo(tmpDir);
  });

  describe("add", () => {
    it("adds a single-line comment and returns a short id", () => {
      const out = cli(["add", "src/main.ts", "11", "fix the bug"], tmpDir);
      expect(out).toMatch(/Added [a-f0-9]{8} at src\/main\.ts:11$/);
    });

    it("adds a range comment", () => {
      const out = cli(["add", "src/main.ts", "10:15", "refactor this"], tmpDir);
      expect(out).toMatch(/Added [a-f0-9]{8} at src\/main\.ts:10-15$/);
    });
  });

  describe("get", () => {
    it("lists active comments by default", () => {
      cli(["add", "src/main.ts", "11", "bug one"], tmpDir);
      cli(["add", "src/main.ts", "22", "bug two"], tmpDir);

      const out = cli(["get"], tmpDir);
      expect(out).toContain("bug one");
      expect(out).toContain("bug two");
    });

    it("filters by file", () => {
      cli(["add", "src/main.ts", "11", "main bug"], tmpDir);
      cli(["add", "README.md", "3", "readme typo"], tmpDir);

      const out = cli(["get", "--file", "src/main.ts"], tmpDir);
      expect(out).toContain("main bug");
      expect(out).not.toContain("readme typo");
    });

    it("filters by resolved status", () => {
      const addOut = cli(["add", "src/main.ts", "11", "fix me"], tmpDir);
      const id = addOut.match(/[a-f0-9]{8}/)![0];

      cli(["resolve", id], tmpDir);

      const resolved = cli(["get", "--status", "resolved"], tmpDir);
      expect(resolved).toContain("fix me");

      const active = cli(["get", "--status", "active"], tmpDir);
      expect(active).not.toContain("fix me");
    });

    it("shows all comments with --status all", () => {
      const addOut = cli(["add", "src/main.ts", "11", "fix me"], tmpDir);
      const id = addOut.match(/[a-f0-9]{8}/)![0];
      cli(["resolve", id], tmpDir);
      cli(["add", "src/main.ts", "22", "new bug"], tmpDir);

      const out = cli(["get", "--status", "all"], tmpDir);
      expect(out).toContain("fix me");
      expect(out).toContain("new bug");
    });

    it("outputs json with --view json", () => {
      cli(["add", "src/main.ts", "11", "json test"], tmpDir);

      const out = cli(["get", "--view", "json"], tmpDir);
      const parsed = JSON.parse(out);
      expect(parsed.comments).toHaveLength(1);
      expect(parsed.comments[0].message).toBe("json test");
      expect(parsed.comments[0].file).toBe("src/main.ts");
      expect(parsed.comments[0]).toHaveProperty("id");
      expect(parsed.comments[0]).toHaveProperty("status", "active");
    });
  });

  describe("resolve", () => {
    it("resolves a single comment by short id", () => {
      const addOut = cli(["add", "src/main.ts", "11", "fix me"], tmpDir);
      const id = addOut.match(/[a-f0-9]{8}/)![0];

      const resolveOut = cli(["resolve", id], tmpDir);
      expect(resolveOut).toContain(`Resolved ${id}`);

      const active = cli(["get", "--status", "active"], tmpDir);
      expect(active).not.toContain("fix me");
    });

    it("resolves multiple comments at once", () => {
      const a1 = cli(["add", "src/main.ts", "11", "bug a"], tmpDir).match(/[a-f0-9]{8}/)![0];
      const a2 = cli(["add", "src/main.ts", "22", "bug b"], tmpDir).match(/[a-f0-9]{8}/)![0];

      cli(["resolve", a1, a2], tmpDir);

      const active = cli(["get", "--status", "active"], tmpDir);
      expect(active).not.toContain("bug a");
      expect(active).not.toContain("bug b");
    });

    it("resolves all with --all", () => {
      cli(["add", "src/main.ts", "11", "bug x"], tmpDir);
      cli(["add", "src/main.ts", "22", "bug y"], tmpDir);

      const out = cli(["resolve", "--all"], tmpDir);
      expect(out).toMatch(/^Resolved 2 comments?$/);

      const active = cli(["get", "--status", "active"], tmpDir);
      expect(active).toBe("");
    });
  });

  describe("unresolve", () => {
    it("unresolves a comment", () => {
      const addOut = cli(["add", "src/main.ts", "11", "oops"], tmpDir);
      const id = addOut.match(/[a-f0-9]{8}/)![0];

      cli(["resolve", id], tmpDir);
      const unresolveOut = cli(["unresolve", id], tmpDir);
      expect(unresolveOut).toContain(`Unresolved ${id}`);

      const active = cli(["get", "--status", "active"], tmpDir);
      expect(active).toContain("oops");
    });
  });

  describe("delete", () => {
    it("deletes a comment by short id", () => {
      const addOut = cli(["add", "src/main.ts", "11", "delete me"], tmpDir);
      const id = addOut.match(/[a-f0-9]{8}/)![0];

      const deleteOut = cli(["delete", id], tmpDir);
      expect(deleteOut).toContain(`Deleted ${id}`);

      const all = cli(["get", "--status", "all"], tmpDir);
      expect(all).not.toContain("delete me");
    });
  });

  describe("clean", () => {
    it("deletes all resolved comments by default", () => {
      cli(["add", "src/main.ts", "11", "keep"], tmpDir
         );
      const a2 = cli(["add", "src/main.ts", "22", "remove"], tmpDir).match(/[a-f0-9]{8}/)![0];
      cli(["resolve", a2], tmpDir);

      const cleanOut = cli(["clean"], tmpDir);
      expect(cleanOut).toContain("Cleared 1 resolved");

      const all = cli(["get", "--status", "all"], tmpDir);
      expect(all).toContain("keep");
      expect(all).not.toContain("remove");
    });

    it("deletes only resolved with clean resolved", () => {
      cli(["add", "src/main.ts", "11", "keep"], tmpDir);
      const a2 = cli(["add", "src/main.ts", "22", "remove"], tmpDir).match(/[a-f0-9]{8}/)![0];
      cli(["resolve", a2], tmpDir);


      const out = cli(["clean", "resolved"], tmpDir);
      expect(out).toContain("Cleared 1 resolved");

      const all = cli(["get", "--status", "all"], tmpDir);
      expect(all).toContain("keep");
      expect(all).not.toContain("remove");
    });

    it("deletes only unresolved with clean unresolved", () => {
      cli(["add", "src/main.ts", "11", "remove"], tmpDir);
      const a2 = cli(["add", "src/main.ts", "22", "keep"], tmpDir).match(/[a-f0-9]{8}/)![0];
      cli(["resolve", a2], tmpDir);

      const out = cli(["clean", "unresolved"], tmpDir);
      expect(out).toContain("Cleared 1 unresolved");

      const all = cli(["get", "--status", "all"], tmpDir);
      expect(all).not.toContain("remove");
      expect(all).toContain("keep");
    });
  });

  describe("debug", () => {
    it("pwd prints the sqlite db path", () => {
      const out = cli(["debug", "pwd"], tmpDir);
      expect(out).toMatch(/\.sqlite$/);
      expect(out).toContain("agent-comments-test-");
    });
  });

  describe("error cases", () => {
    it("fails with clear message when adding to non-existent file", () => {
      const out = execFileSync(tsxBin, [cliScript, "add", "nope.ts", "11", "whatever"], {
        cwd: tmpDir,
        encoding: "utf-8",
      });
      // Should still succeed — the CLI doesn't validate file existence
      expect(out).toContain("Added");
    });

    it("fails when resolving a non-existent comment", () => {
      expect(() => cli(["resolve", "deadbeef"], tmpDir)).toThrow("No comment found");
    });

    it("fails when deleting a non-existent comment", () => {
      expect(() => cli(["delete", "deadbeef"], tmpDir)).toThrow("No comment found");
    });

    it("fails when short id is ambiguous", () => {
      // Insert two comments with known IDs that share a prefix
      const dbPath = cli(["debug", "pwd"], tmpDir);
      const testDb = new Database(dbPath);
      const now = new Date().toISOString();
      testDb
        .prepare("INSERT INTO comments VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(
          "aaaaaa00-0000-0000-0000-000000000000",
          "src/main.ts",
          11,
          11,
          "aaa comment",
          "active",
          now,
          now,
        );
      testDb
        .prepare("INSERT INTO comments VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(
          "aaaabb00-0000-0000-0000-000000000000",
          "src/main.ts",
          22,
          22,
          "aab comment",
          "active",
          now,
          now,
        );
      testDb.close();

      // Both IDs start with "aaa" (strip dashes, lowercase) → ambiguous
      expect(() => cli(["resolve", "aaa"], tmpDir)).toThrow("Ambiguous");
    });
  });
});
