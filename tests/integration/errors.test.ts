import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { rmSync } from "fs";
import { createTempRepo, cli, cleanupDb } from "./helpers";

describe("error cases", () => {
  let dir = "";
  beforeEach(() => { dir = createTempRepo(); });
  afterEach(() => { cleanupDb(dir); rmSync(dir, { recursive: true, force: true }); });

  it("fails with clear message when adding to non-existent file", () => {
    const out = cli(["add", "nope.ts", "11", "whatever"], dir);
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
      .prepare("INSERT INTO comments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run("aaaaaa00-0000-0000-0000-000000000000", "src/main.ts", 11, 11, "aaa comment", "active", "local", null, null, null, now, now);
    testDb
      .prepare("INSERT INTO comments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run("aaaabb00-0000-0000-0000-000000000000", "src/main.ts", 22, 22, "aab comment", "active", "local", null, null, null, now, now);
    testDb.close();
    expect(() => cli(["resolve", "aaa"], dir)).toThrow("Ambiguous");
  });
});