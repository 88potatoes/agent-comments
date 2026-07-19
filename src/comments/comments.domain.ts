export enum CommentStatus {
  Active = "active",
  Resolved = "resolved",
  Draft = "draft",
}

export enum CommentSource {
  Local = "local",
  GitHub = "github",
}

export type OptionalField<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type CreateEntityInput<T> = Omit<T, "id" | "createdAt" | "updatedAt">;
export type UpdateEntityInput<T extends { id: string }> = Partial<
  Omit<T, "createdAt" | "updatedAt">
> &
  Pick<T, "id">;

export type CommentEntity = {
  id: string;
  file: string; // relative to repo root
  startLine: number;
  endLine: number;
  message: string;
  status: CommentStatus;
  source: CommentSource;
  externalId: number | null;
  author: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateCommentEntityInput = CreateEntityInput<CommentEntity>;
export type UpdateCommentEntityInput = UpdateEntityInput<CommentEntity>;
