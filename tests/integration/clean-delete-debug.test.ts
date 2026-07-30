import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rmSync } from "fs";
import { createTempRepo, cli, cleanupDb } from "./helpers";

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