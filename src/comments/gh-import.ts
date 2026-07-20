import { githubClient, type GhComment, type ImportResult } from "./github-client.ts";

export type { GhComment, ImportResult };

export function parsePrReference(input: string): { owner: string; repo: string; prNumber: number } {
  return githubClient.parsePrReference(input);
}

export function fetchPrComments(
  owner: string,
  repo: string,
  prNumber: number,
): GhComment[] {
  return githubClient.fetchPrComments(owner, repo, prNumber);
}