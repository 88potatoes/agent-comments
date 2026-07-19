import { CommentStatus } from "./comments.domain.ts";

export type CreateInput<T> = Omit<T, "id" | "createdAt" | "updatedAt">;
export type UpdateInput<T extends { id: string }> = Partial<Omit<T, "createdAt" | "updatedAt">> &
  Pick<T, "id">;

export type CommentRecord = {
  id: string;
  file: string; // relative to repo root
  startLine: number;
  endLine: number;
  message: string;
  status: CommentStatus;
  source: string;
  externalId: number | null;
  author: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCommentInput = CreateInput<CommentRecord>;
export type UpdateCommentInput = UpdateInput<CommentRecord>;
