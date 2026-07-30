import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rmSync } from "fs";
import { createTempRepo, cli, cleanupDb } from "./helpers";

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