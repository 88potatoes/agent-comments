import { Command } from "commander";
import { render } from "ink";
import React from "react";

import { CommentStatus } from "./comments/comments.domain.ts";
import { CommentRepo } from "./comments/repo.ts";
import { CommentService } from "./comments/service.ts";
import { getDbPath } from "./lib/db.ts";
import { formatDefault, formatJson, formatGraph, wordWrap } from "./lib/format.ts";
import { LineRangeType, parseLineInput } from "./lib/helpers.ts";
import App from "./gui/app.tsx";

export { formatDefault, formatJson, formatGraph, wordWrap };

const program = new Command();

const service = new CommentService({
  commentsRepo: CommentRepo.instance,
});

function wrap<T extends unknown[]>(handler: (...args: T) => Promise<void>) {
  return async (...args: T) => {
    try {
      await handler(...args);
    } catch (e: unknown) {
      console.error(`
  ✖ ${e instanceof Error ? e.message : String(e)}
`);
      process.exit(1);
    }
  };
}

program
  .name("agent-comments")
  .version("1.0.0")
  .description("Inline comment system for code reviews")
  .addHelpText("after", "\nAliases: aco → agent-comments, ls/get/list → get");

program
  .command("add <file> <lines> <message>")
  .description("Add a comment")
  .option("-d, --draft", "Save as a draft instead of an active comment")
  .action(
    wrap(async (file: string, lines: string, message: string, options: { draft?: boolean }) => {
      const lineRange = parseLineInput(lines);
      const startLine =
        lineRange.type === LineRangeType.Single ? lineRange.line : lineRange.startLine;
      const endLine =
        lineRange.type === LineRangeType.Single ? lineRange.line : lineRange.endLine;
      const label = startLine === endLine ? `${startLine}` : `${startLine}-${endLine}`;

      const comment = await service.addComment({
        file,
        startLine,
        endLine,
        message,
        status: options.draft ? CommentStatus.Draft : CommentStatus.Active,
      });

      const verb = options.draft ? "Draft" : "Added";
      console.log(`${verb} ${comment.id.slice(0, 8)} at ${file}:${label}`);
    }),
  );

program
  .command("delete <commentId>")
  .description("Delete a comment")
  .action(
    wrap(async (commentId: string) => {
      await service.deleteComment(commentId);
      console.log(`Deleted ${commentId.slice(0, 8)}`);
    }),
  );

program
  .command("resolve")
  .description("Resolve one or more comments, or all unresolved with --all")
  .argument("[commentIds...]", "Comment IDs to resolve")
  .option("-a, --all", "Resolve all unresolved comments")
  .action(
    wrap(async (commentIds: string[], options: { all?: boolean }) => {
      if (options.all) {
        const count = await service.resolveAll();
        console.log(`Resolved ${count} comment${count === 1 ? "" : "s"}`);
      } else if (commentIds.length === 0) {
        throw new Error("Provide comment IDs or use --all");
      } else {
        for (const id of commentIds) {
          await service.resolveComment(id);
          console.log(`Resolved ${id.slice(0, 8)}`);
        }
      }
    }),
  );

program
  .command("unresolve <commentIds...>")
  .description("Unresolve one or more comments")
  .action(
    wrap(async (commentIds: string[]) => {
      for (const id of commentIds) {
        await service.unresolveComment(id);
        console.log(`Unresolved ${id.slice(0, 8)}`);
      }
    }),
  );

const clean = program.command("clean").description("Delete comments (default: resolved)");

clean
  .command("resolved")
  .description("Delete all resolved comments")
  .action(
    wrap(async () => {
      const count = await service.clearResolved();
      console.log(`Cleared ${count} resolved comment${count === 1 ? "" : "s"}`);
    }),
  );

clean
  .command("unresolved")
  .description("Delete all unresolved (active) comments")
  .action(
    wrap(async () => {
      const count = await service.clearUnresolved();
      console.log(`Cleared ${count} unresolved comment${count === 1 ? "" : "s"}`);
    }),
  );

// Default: `agent-comments clean` does same as `agent-comments clean resolved`
clean.action(
  wrap(async () => {
    const count = await service.clearResolved();
    console.log(`Cleared ${count} resolved comment${count === 1 ? "" : "s"}`);
  }),
);

program
  .command("get")
  .alias("list")
  .alias("ls")
  .description("Get comments")
  .option("-f, --file <file>", "Filter by file path")
  .option("-s, --status <status>", "Filter by status: resolved, active, draft, or all (default: active)")
  .option("--view <view>", "Output format: default, graph, or json", "default")
  .action(
    wrap(async (options) => {
      const filter: { file?: string; status?: CommentStatus } = {
        status: CommentStatus.Active,
      };
      if (options.file) {
        filter.file = options.file;
      }
      if (options.status === "resolved") {
        filter.status = CommentStatus.Resolved;
      } else if (options.status === "active") {
        filter.status = CommentStatus.Active;
      } else if (options.status === "all") {
        filter.status = undefined;
      } else if (options.status === "draft") {
        filter.status = CommentStatus.Draft;
      } else if (options.status) {
        throw new Error(`Invalid status: "${options.status}". Use resolved, active, draft, or all.`);
      }

      const comments = await service.getAllComments(filter);

      if (options.view === "json") {
        console.log(formatJson(comments));
      } else if (options.view === "graph") {
        if (comments.length === 0) {
          console.log("No comments found.");
        } else {
          const highlight = !!(process.stdout.isTTY && !process.env.NO_COLOR);
          console.log(formatGraph(comments, 80, highlight));
        }
      } else {
        if (comments.length === 0) {
          console.log("No comments found.");
        } else {
          console.log(formatDefault(comments));
        }
      }
    }),
  );

program
  .command("tui")
  .alias("t")
  .description("Open interactive TUI")
  .action(
    wrap(async () => {
      if (!process.stdout.isTTY || !process.stdin.isTTY) {
        throw new Error("tui requires an interactive terminal");
      }
      const { waitUntilExit } = render(React.createElement(App, { service }), { alternateScreen: true });
      await waitUntilExit();
    }),
  );

const debug = program.command("debug").description("Debug commands");

debug
  .command("pwd")
  .description("Print the database directory path")
  .action(
    wrap(async () => {
      console.log(getDbPath());
    }),
  );

await program.parseAsync();
