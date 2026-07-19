import { sqliteTable, text, integer, check } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const comments = sqliteTable(
  "comments",
  {
    id: text("id").primaryKey(),
    file: text("file").notNull(),
    startLine: integer("startLine").notNull(),
    endLine: integer("endLine").notNull(),
    message: text("message").notNull(),
    status: text("status", { enum: ["active", "resolved", "draft"] })
      .notNull()
      .default("active"),
    source: text("source").notNull().default("local"),
    externalId: integer("externalId"),
    author: text("author"),
    url: text("url"),
    createdAt: text("createdAt").notNull(),
    updatedAt: text("updatedAt").notNull(),
  },
  (table) => [
    check(
      "comments_status_check",
      sql`${table.status} IN ('active', 'resolved', 'draft')`,
    ),
  ],
);