import { describe, it, expect } from "vitest";
import { parsePrReference } from "../../src/comments/gh-import.ts";

describe("parsePrReference", () => {
  it("parses full GitHub PR URL", () => {
    const result = parsePrReference("https://github.com/owner/repo/pull/42");
    expect(result).toEqual({ owner: "owner", repo: "repo", prNumber: 42 });
  });

  it("parses full GitHub PR URL with trailing slash", () => {
    const result = parsePrReference("https://github.com/owner/repo/pull/42/");
    // trailing content after pr number is allowed by regex
    expect(result).toEqual({ owner: "owner", repo: "repo", prNumber: 42 });
  });

  it("parses PR number (infers owner/repo from git remote)", () => {
    // Only works when the repo has a GitHub origin remote
    try {
      const result = parsePrReference("42");
      expect(result.prNumber).toBe(42);
      expect(result.owner).toBeTruthy();
      expect(result.repo).toBeTruthy();
    } catch (e) {
      if (
        e instanceof Error &&
        e.message.includes("Could not determine GitHub repo")
      ) {
        // No GitHub remote — skip
        return;
      }
      throw e;
    }
  });

  it("throws on invalid input", () => {
    expect(() => parsePrReference("not-a-pr")).toThrow("Invalid PR reference");
  });

  it("throws on URL without PR number", () => {
    expect(() => parsePrReference("https://github.com/owner/repo")).toThrow(
      "Invalid PR reference",
    );
  });
});