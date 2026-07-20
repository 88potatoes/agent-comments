import { execSync } from "node:child_process";

// ── types ──────────────────────────────────────────────────────

export type GhComment = {
  id: number;
  path: string;
  line: number | null;
  original_line: number | null;
  body: string;
  user: { login: string } | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  pull_request_url: string;
};

export type GhPrReference = {
  owner: string;
  repo: string;
  prNumber: number;
};

// ── client ─────────────────────────────────────────────────────

export class GitHubClient {
  private static instance: GitHubClient;
  static getInstance(): GitHubClient {
    if (!GitHubClient.instance) {
      GitHubClient.instance = new GitHubClient();
    }
    return GitHubClient.instance;
  }

  private constructor() {
    this.ensureCli();
  }

  // ── public API ───────────────────────────────────────────────

  /** Fetch review comments for a PR. */
  fetchPrComments(owner: string, repo: string, prNumber: number): GhComment[] {
    this.ensureAuth();

    const endpoint = `repos/${owner}/${repo}/pulls/${prNumber}/comments`;
    try {
      const raw = execSync(
        `gh api ${endpoint} --paginate --jq '.[]'`,
        { encoding: "utf-8", stdio: "pipe", maxBuffer: 50 * 1024 * 1024 },
      );

      const lines = raw.trim().split("\n").filter(Boolean);
      return lines.map((line) => {
        try {
          return JSON.parse(line) as GhComment;
        } catch {
          throw new Error(`Failed to parse GitHub API response line: ${line.slice(0, 100)}...`);
        }
      });
    } catch (e) {
      if (e instanceof Error && e.message.includes("gh api")) {
        throw new Error(
          `Failed to fetch PR comments from GitHub. Is the PR number correct? (${owner}/${repo}#${prNumber})`,
        );
      }
      throw e;
    }
  }

  /** Parse a PR reference: full URL, or a number (uses git remote for owner/repo). */
  parsePrReference(input: string): GhPrReference {
    // https://github.com/owner/repo/pull/42
    const urlMatch = input.match(
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/,
    );
    if (urlMatch) {
      return {
        owner: urlMatch[1],
        repo: urlMatch[2].replace(/\.git$/, ""),
        prNumber: Number(urlMatch[3]),
      };
    }

    // Just a PR number: "42"
    const numMatch = input.match(/^(\d+)$/);
    if (numMatch) {
      const remote = this.getDefaultRemote();
      return { ...remote, prNumber: Number(numMatch[1]) };
    }

    throw new Error(
      `Invalid PR reference "${input}". Use a full URL or a PR number.`,
    );
  }

  /** Derive owner/repo from git remote origin. */
  getDefaultRemote(): { owner: string; repo: string } {
    try {
      const url = execSync("git remote get-url origin", {
        encoding: "utf-8",
        stdio: "pipe",
      }).trim();

      // git@github.com:owner/repo.git
      const sshMatch = url.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
      if (sshMatch) {
        return { owner: sshMatch[1], repo: sshMatch[2] };
      }

      // https://github.com/owner/repo.git
      const httpsMatch = url.match(
        /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/,
      );
      if (httpsMatch) {
        return { owner: httpsMatch[1], repo: httpsMatch[2] };
      }

      throw new Error(`Unrecognized remote URL format: ${url}`);
    } catch (e) {
      if (e instanceof Error && e.message.includes("Unrecognized")) {
        throw e;
      }
      throw new Error(
        "Could not determine GitHub repo from git remote. Provide a full PR URL instead.",
      );
    }
  }

  // ── private helpers ──────────────────────────────────────────

  private ensureCli(): void {
    try {
      execSync("gh --version", { encoding: "utf-8", stdio: "pipe" });
    } catch {
      throw new Error(
        "GitHub CLI (gh) is required. Install it: https://cli.github.com",
      );
    }
  }

  private ensureAuth(): void {
    try {
      execSync("gh auth status", { encoding: "utf-8", stdio: "pipe" });
    } catch {
      throw new Error(
        "Not authenticated with GitHub CLI. Run: gh auth login",
      );
    }
  }
}

export const githubClient = GitHubClient.getInstance();
