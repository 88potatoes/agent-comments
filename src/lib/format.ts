import { CommentEntity } from "../comments/comments.domain.ts";

export function wordWrap(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph.length === 0) {
      lines.push("");
    } else {
      let remaining = paragraph;
      while (remaining.length > maxWidth) {
        const segment = remaining.slice(0, maxWidth);
        const spaceIdx = segment.lastIndexOf(" ");
        if (spaceIdx > 0) {
          lines.push(remaining.slice(0, spaceIdx));
          remaining = remaining.slice(spaceIdx + 1);
        } else {
          lines.push(segment);
          remaining = remaining.slice(maxWidth);
        }
      }
      if (remaining.length > 0) {
        lines.push(remaining);
      }
    }
  }
  return lines;
}

export function formatDefault(comments: CommentEntity[]): string {
  const header = "ID\tFile:Line\tMessage\tStatus";
  const body = comments
    .map((c) => `${c.id.slice(0, 8)}\t${c.file}:${c.startLine}-${c.endLine}\t${c.message}\t${c.status}`)
    .join("\n");
  return body.length > 0 ? `${header}\n${body}` : "";
}

export function formatJson(comments: CommentEntity[]): string {
  return JSON.stringify({ comments }, null, 2);
}

const ansi = {
  bold: (s: string) => `\x1b[1m${s}\x1b[22m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[22m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[39m`,
  green: (s: string) => `\x1b[32m${s}\x1b[39m`,
};

function formatId(shortId: string, highlight: boolean): string {
  return highlight ? ansi.dim(shortId) : shortId;
}

function formatIcon(icon: string, status: string, highlight: boolean): string {
  if (!highlight) {
    return icon;
  }
  const colored = status === "active" ? ansi.yellow(icon) : ansi.green(icon);
  return ansi.bold(colored);
}

export function formatGraph(
  comments: CommentEntity[],
  messageWidth = 80,
  highlight = false,
): string {
  const blocks: string[] = [];
  for (const c of comments) {
    const icon = formatIcon(c.status === "active" ? "●" : "✓", c.status, highlight);
    const shortId = formatId(c.id.slice(0, 8), highlight);
    const linesLabel = c.startLine === c.endLine ? `${c.startLine}` : `${c.startLine}-${c.endLine}`;
    const fileLine = `${c.file}:${linesLabel}`;
    const header = `${icon} ${shortId}  ${fileLine}`;
    const lines: string[] = [header];
    const continuationIndent = 12;
    const wrapped = wordWrap(c.message, messageWidth);
    for (const wl of wrapped) {
      lines.push(`${" ".repeat(continuationIndent)}${wl}`);
    }
    lines.push("");
    blocks.push(lines.join("\n"));
  }
  return blocks.join("\n");
}
