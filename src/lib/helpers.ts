export enum LineRangeType {
  Single = "single",
  Range = "range",
}
export type LineRange =
  | { type: LineRangeType.Single; line: number }
  | { type: LineRangeType.Range; startLine: number; endLine: number };

export function parseLineInput(input: string): LineRange {
  const trimmed = input.trim();

  // range: "12:20" or "12-20"
  const rangeMatch = trimmed.match(/^(\d+)\s*[:\-]\s*(\d+)$/);
  if (rangeMatch) {
    const startLine = Number(rangeMatch[1]);
    const endLine = Number(rangeMatch[2]);

    if (startLine > endLine) {
      throw new Error(`Invalid line range: ${input} (start > end)`);
    }

    return {
      type: LineRangeType.Range,
      startLine,
      endLine,
    };
  }

  // single: "12"
  const singleMatch = trimmed.match(/^(\d+)$/);
  if (singleMatch) {
    return {
      type: LineRangeType.Single,
      line: Number(singleMatch[1]),
    };
  }

  throw new Error(`Invalid line format: "${input}". Use "12", "12:20", or "12-20"`);
}
