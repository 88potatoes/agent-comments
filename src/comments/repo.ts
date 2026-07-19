import { db } from "../lib/db.ts";

import { CommentEntity, CommentStatus } from "./comments.domain.ts";
import { CommentRecord, CreateCommentInput, UpdateCommentInput } from "./comments.table.ts";

export class CommentRepo {
  private constructor() {}

  public static readonly instance = new CommentRepo();

  async getCommentById(id: string): Promise<CommentEntity> {
    const row = db.prepare("SELECT * FROM comments WHERE id = ?").get(id) as
      | CommentRecord
      | undefined;
    if (!row) {
      throw new Error(`Comment with id ${id} not found`);
    }
    return this.toDomain(row);
  }

  async resolveCommentId(input: string): Promise<string> {
    const normalized = input.replace(/-/g, "").toLowerCase();
    const pattern = normalized + "%";

    const rows = db
      .prepare("SELECT id FROM comments WHERE REPLACE(LOWER(id), '-', '') LIKE ?")
      .all(pattern) as Pick<CommentRecord, "id">[];

    if (rows.length === 0) {
      throw new Error(`No comment found matching id "${input}"`);
    }
    if (rows.length > 1) {
      const ids = rows.map((r) => r.id).join(", ");
      throw new Error(`Ambiguous id "${input}" matches multiple comments: ${ids}`);
    }

    return rows[0].id;
  }

  async getAllComments(): Promise<CommentEntity[]> {
    const rows = db.prepare("SELECT * FROM comments").all() as CommentRecord[];
    return rows.map((r) => this.toDomain(r));
  }

  async queryComments(filter: { file?: string; status?: CommentStatus }): Promise<CommentEntity[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filter.file !== undefined) {
      conditions.push("file = ?");
      params.push(filter.file);
    }
    if (filter.status !== undefined) {
      conditions.push("status = ?");
      params.push(filter.status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const sql = `SELECT * FROM comments ${where}`;
    const rows = db.prepare(sql).all(...params) as CommentRecord[];
    return rows.map((r) => this.toDomain(r));
  }

  async createComment(comment: CreateCommentInput): Promise<CommentEntity> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    db.prepare(
      `INSERT INTO comments (id, file, startLine, endLine, message, status, source, externalId, author, url, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      comment.file,
      comment.startLine,
      comment.endLine,
      comment.message,
      comment.status,
      comment.source ?? "local",
      comment.externalId ?? null,
      comment.author ?? null,
      comment.url ?? null,
      now,
      now,
    );

    return this.toDomain({
      id,
      file: comment.file,
      startLine: comment.startLine,
      endLine: comment.endLine,
      message: comment.message,
      status: comment.status,
      source: comment.source ?? "local",
      externalId: comment.externalId ?? null,
      author: comment.author ?? null,
      url: comment.url ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateComment(updateCommentPayload: UpdateCommentInput): Promise<CommentEntity> {
    const existing = await this.getCommentById(updateCommentPayload.id);
    const now = new Date().toISOString();

    const { id, ...updates } = updateCommentPayload;
    const merged = { ...existing, ...updates, updatedAt: now };

    db.prepare(
      `UPDATE comments SET file = ?, startLine = ?, endLine = ?, message = ?, status = ?, source = ?, externalId = ?, author = ?, url = ?, updatedAt = ?
       WHERE id = ?`,
    ).run(
      merged.file,
      merged.startLine,
      merged.endLine,
      merged.message,
      merged.status,
      merged.source,
      merged.externalId,
      merged.author,
      merged.url,
      merged.updatedAt,
      id,
    );

    return this.toDomain(merged);
  }

  async deleteComment(id: string): Promise<void> {
    await this.getCommentById(id); // throws if not found
    db.prepare("DELETE FROM comments WHERE id = ?").run(id);
  }

  async findByExternalId(externalId: number): Promise<CommentEntity | null> {
    const row = db
      .prepare("SELECT * FROM comments WHERE externalId = ?")
      .get(externalId) as CommentRecord | undefined;
    return row ? this.toDomain(row) : null;
  }

  toDomain(comment: CommentRecord): CommentEntity {
    return {
      id: comment.id,
      file: comment.file,
      startLine: comment.startLine,
      endLine: comment.endLine,
      message: comment.message,
      status: comment.status as CommentEntity["status"],
      source: comment.source as CommentEntity["source"],
      externalId: comment.externalId,
      author: comment.author,
      url: comment.url,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}

export const commentRepo = CommentRepo.instance;
