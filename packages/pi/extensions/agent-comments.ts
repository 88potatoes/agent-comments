import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { execSync } from "node:child_process";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("address", {
    description: "Fetch unresolved agent-comments and ask the agent to address them",
    handler: async (args, ctx) => {
      let output: string;
      try {
        output = execSync("agent-comments get", {
          cwd: ctx.cwd,
          encoding: "utf-8",
          timeout: 10000,
        }).trim();
      } catch (e: any) {
        ctx.ui.notify(`Failed to run agent-comments: ${e.message}`, "error");
        return;
      }

      if (!output) {
        ctx.ui.notify("No unresolved comments found", "info");
        return;
      }

      ctx.ui.notify(`Found comments, sending to agent`, "info");

      const instruction = args.trim();
      const prefix = instruction
        ? `${instruction}\n\n`
        : `please address these comments\n\n`;

      // Remind the agent to resolve each comment it addressed so /address
      // closes the loop instead of leaving stale active threads. Avoid
      // hard-coding the resolve subcommand — the CLI may evolve — and point
      // at `agent-comments help` if the agent needs the exact syntax.
      const suffix = `\n\nafter addressing each comment (and once any smoke checks pass), resolve the comment threads so they don't stay active. run \`agent-comments help\` if you need more info on the CLI.`;

      pi.sendUserMessage(`${prefix}${output}${suffix}`, {
        deliverAs: "followUp",
      });
    },
  });
}
