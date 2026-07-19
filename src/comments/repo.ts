import { eq, and, sql } from "drizzle-orm";
import { db } from "../lib/db.ts";
import { comments } from "../db/schema.ts";
import { CommentEntity, CommentStatus } from "./comments.domain.ts";
import type { CreateCommentInput, UpdateCommentInput } from "./comments.table.ts";

export class CommentRepo {
  private constructor() {}

  public static readonly instance = new CommentRepo();

  async getCommentById(id: string): Promise<CommentEntity> {
    const row = db.select().from(comments).where(eq(comments.id, id)).get();
    if (!row) {
      throw new Error(`Comment with id ${id} not found`);
    }
    return this.toDomain(row);
  }

  async resolveCommentId(input: string): Promise<string> {
    const normalized = input.replace(/-/g, "").toLowerCase();
    const pattern = normalized + "%";

    const rows = db
      .select({ id: comments.id })
      .from(comments)
      .where(sql`REPLACE(LOWER(${comments.id}), '-', '') LIKE ${pattern}`)
      .all();

    if (rows.length === 0) {
      throw new Error(`No comment found matching id "${input}"`);
    }
    if (rows.length > 1) {
      const ids = rows.map((r) => r.id).join(", ");
      throw new Error(
        `Ambiguous id "${input}" matches multiple comments: ${ids}`,
      );
    }

    return rows[0].id;
  }

  async getAllComments(): Promise<CommentEntity[]> {
    const rows = db.select().from(comments).all();
    return rows.map((r) => this.toDomain(r));
  }

  async queryComments(filter: {
    file?: string;
    status?: CommentStatus;
  }): Promise<CommentEntity[]> {
    const conditions = [];
    if (filter.file !== undefined) {
      conditions.push(eq(comments.file, filter.file));
    }
    if (filter.status !== undefined) {
      conditions.push(eq(comments.status, filter.status));
    }

    const query = db.select().from(comments);
    if (conditions.length > 0) {
      query.where(and(...conditions));
    }

    const rows = query.all();
    return rows.map((r) => this.toDomain(r));
  }

  async createComment(input: CreateCommentInput): Promise<CommentEntity> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    db.insert(comments)
      .values({
        id,
        file: input.file,
        startLine: input.startLine,
        endLine: input.endLine,
        message: input.message,
        status: input.status,
        source: input.source ?? "local",
        externalId: input.externalId ?? null,
        author: input.author ?? null,
        url: input.url ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return this.toDomain({
      id,
      file: input.file,
      startLine: input.startLine,
      endLine: input.endLine,
      message: input.message,
      status: input.status,
      source: input.source ?? "local",
      externalId: input.externalId ?? null,
      author: input.author ?? null,
      url: input.url ?? null,
      createdAt: now,
      updatedAt: now,
    });
  }

  async updateComment(input: UpdateCommentInput): Promise<CommentEntity> {
    const existing = await this.getCommentById(input.id);
    const now = new Date().toISOString();

    const { id, ...updates } = input;
    const merged = { ...existing, ...updates, updatedAt: now };

    db.update(comments)
      .set({
        file: merged.file,
        startLine: merged.startLine,
        endLine: merged.endLine,
        message: merged.message,
        status: merged.status,
        source: merged.source,
        externalId: merged.externalId,
        author: merged.author,
        url: merged.url,
        updatedAt: merged.updatedAt,
      })
      .where(eq(comments.id, id))
      .run();

    return this.toDomain(merged);
  }

  async deleteComment(id: string): Promise<void> {
    await this.getCommentById(id);
    db.delete(comments).where(eq(comments.id, id)).run();
  }

  async findByExternalId(externalId: number): Promise<CommentEntity | null> {
    const row = db
      .select()
      .from(comments)
      .where(eq(comments.externalId, externalId))
      .get();
    return row ? this.toDomain(row) : null;
  }

  toDomain(row: typeof comments.$inferSelect): CommentEntity {
    return {
      id: row.id,
      file: row.file,
      startLine: row.startLine,
      endLine: row.endLine,
      message: row.message,
      status: row.status as CommentStatus,
      source: row.source as CommentEntity["source"],
      externalId: row.externalId,
      author: row.author,
      url: row.url,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

export const commentRepo = CommentRepo.instance;