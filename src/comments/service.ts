import {
  CommentEntity,
  CommentSource,
  CommentStatus,
  CreateCommentEntityInput,
  OptionalField,
} from "./comments.domain.ts";
import { CommentRepo } from "./repo.ts";
import { fetchPrComments, type ImportResult } from "./gh-import.ts";
import { githubClient } from "./github-client.ts";

export class CommentService {
  private constructor() {}

  public static readonly instance = new CommentService();

  private get commentsRepo(): CommentRepo {
    return CommentRepo.instance;
  }

  async getAllComments(filter?: {
    file?: string;
    status?: CommentStatus;
    includeGitRemote?: string;
  }): Promise<CommentEntity[]> {
    const local = await this.commentsRepo.queryComments(filter ?? {});

    if (!filter?.includeGitRemote) return local;

    const { owner, repo, prNumber } =
      githubClient.parsePrReference(filter.includeGitRemote);
    const ghComments = githubClient.fetchPrComments(owner, repo, prNumber);
    const prUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}`;

    const remoteEntities: CommentEntity[] = ghComments.map((gh) => {
      const line = gh.line ?? gh.original_line ?? 0;
      return {
        id: `gh-${gh.id}`,
        file: gh.path,
        startLine: line,
        endLine: line,
        message: gh.body || "(no comment body)",
        status: CommentStatus.Active,
        source: CommentSource.GitHub,
        externalId: gh.id,
        author: gh.user?.login ?? null,
        url: gh.html_url,
        createdAt: gh.created_at,
        updatedAt: gh.updated_at,
      };
    });

    return [...local, ...remoteEntities];
  }

  async addComment(
    comment: OptionalField<CreateCommentEntityInput, "status">,
  ): Promise<CommentEntity> {
    const commentEntity = await this.commentsRepo.createComment({
      status: CommentStatus.Active,
      ...comment,
    });
    return commentEntity;
  }

  async setStatus(id: string, status: CommentStatus): Promise<CommentEntity> {
    const fullId = await this.commentsRepo.resolveCommentId(id);
    return this.commentsRepo.updateComment({ id: fullId, status });
  }

  async deleteComment(id: string): Promise<void> {
    const fullId = await this.commentsRepo.resolveCommentId(id);
    await this.commentsRepo.deleteComment(fullId);
  }

  async resolveAll(): Promise<number> {
    const active = await this.commentsRepo.queryComments({
      status: CommentStatus.Active,
    });
    for (const c of active) {
      await this.commentsRepo.updateComment({
        id: c.id,
        status: CommentStatus.Resolved,
      });
    }
    return active.length;
  }

  async resolveComment(id: string): Promise<CommentEntity> {
    const fullId = await this.commentsRepo.resolveCommentId(id);
    const commentEntity = await this.commentsRepo.updateComment({
      id: fullId,
      status: CommentStatus.Resolved,
    });
    return commentEntity;
  }

  async unresolveComment(id: string): Promise<CommentEntity> {
    const fullId = await this.commentsRepo.resolveCommentId(id);
    const commentEntity = await this.commentsRepo.updateComment({
      id: fullId,
      status: CommentStatus.Active,
    });
    return commentEntity;
  }

  async importGitHubComments(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<ImportResult> {
    const ghComments = fetchPrComments(owner, repo, prNumber);
    const prUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}`;

    let imported = 0;
    let skipped = 0;

    for (const gh of ghComments) {
      const existing = await this.commentsRepo.findByExternalId(gh.id);
      if (existing) {
        skipped++;
        continue;
      }

      const line = gh.line ?? gh.original_line ?? 0;
      const body = gh.body || "(no comment body)";

      await this.commentsRepo.createComment({
        file: gh.path,
        startLine: line,
        endLine: line,
        message: body,
        status: CommentStatus.Active,
        source: CommentSource.GitHub,
        externalId: gh.id,
        author: gh.user?.login ?? null,
        url: gh.html_url,
      });
      imported++;
    }

    return { imported, skipped, total: ghComments.length };
  }

  async clearResolved(): Promise<number> {
    const resolved = await this.commentsRepo.queryComments({
      status: CommentStatus.Resolved,
    });
    for (const c of resolved) {
      await this.commentsRepo.deleteComment(c.id);
    }
    return resolved.length;
  }

  async clearUnresolved(): Promise<number> {
    const unresolved = await this.commentsRepo.queryComments({
      status: CommentStatus.Active,
    });
    for (const c of unresolved) {
      await this.commentsRepo.deleteComment(c.id);
    }
    return unresolved.length;
  }
}

export const commentService = CommentService.instance;
