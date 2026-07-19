import {
  CommentEntity,
  CommentStatus,
  CreateCommentEntityInput,
  OptionalField,
} from "./comments.domain.ts";
import { CommentRepo } from "./repo.ts";

export class CommentService {
  private constructor() {}

  public static readonly instance = new CommentService();

  private get commentsRepo(): CommentRepo {
    return CommentRepo.instance;
  }

  async getAllComments(filter?: {
    file?: string;
    status?: CommentStatus;
  }): Promise<CommentEntity[]> {
    return this.commentsRepo.queryComments(filter ?? {});
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
