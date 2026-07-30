export type ColumnDef = {
  name: string;
  maxWidth?: number;
};

export function renderTable(
  columns: ColumnDef[],
  data: string[][],
): string {
  if (columns.length === 0) return "";

  // Calculate natural widths: max of header and all cells in column
  const widths = columns.map((col, ci) => {
    let w = col.name.length;
    for (const row of data) {
      const cell = row[ci] ?? "";
      if (cell.length > w) w = cell.length;
    }
    if (col.maxWidth !== undefined && w > col.maxWidth) {
      w = col.maxWidth;
    }
    return w;
  });

  // Build header
  const headerCells = columns.map((col, ci) => {
    const text = col.name;
    return text.length > widths[ci]
      ? text.slice(0, widths[ci] - 3) + "..."
      : text.padEnd(widths[ci]);
  });

  const header = headerCells.join(" │ ");

  const rows = data.map((row) => {
    return columns.map((col, ci) => {
      const raw = row[ci] ?? "";
      const text = raw.length > widths[ci]
        ? raw.slice(0, widths[ci] - 3) + "..."
        : raw;
      return text.padEnd(widths[ci]);
    }).join(" │ ");
  });

  const all = [header, ...rows];
  return all.join("\n");
}