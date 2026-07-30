import { describe, it, expect } from "vitest";
import { renderTable } from "../../src/lib/table.ts";

describe("renderTable", () => {
  it("renders empty for zero columns", () => {
    expect(renderTable([], [])).toBe("");
  });

  it("renders header only with no data", () => {
    const result = renderTable(
      [{ name: "A" }, { name: "BB" }],
      [],
    );
    const lines = result.split("\n");
    expect(lines[0]).toBe("A │ BB");
    expect(lines.length).toBe(1);
  });

  it("renders header and data rows", () => {
    const result = renderTable(
      [{ name: "Col1" }, { name: "Col2" }],
      [
        ["a", "b"],
        ["cc", "dd"],
      ],
    );
    const lines = result.split("\n");
    expect(lines[0]).toBe("Col1 │ Col2");
    expect(lines[1]).toBe("a    │ b   ");
    expect(lines[2]).toBe("cc   │ dd  ");
  });

  it("truncates cells exceeding maxWidth with ...", () => {
    const result = renderTable(
      [{ name: "ID", maxWidth: 6 }, { name: "Message" }],
      [["1234567890", "hello"]],
    );
    const lines = result.split("\n");
    expect(lines[1]).toContain("123...");
    expect(lines[1]).toContain("hello");
  });

  it("truncates header exceeding maxWidth with ...", () => {
    const result = renderTable(
      [{ name: "VeryLongHeader", maxWidth: 6 }],
      [],
    );
    expect(result).toBe("Ver...");
  });

  it("does not truncate cell exactly at maxWidth", () => {
    const result = renderTable(
      [{ name: "Hdr", maxWidth: 6 }, { name: "Other" }],
      [["123456", "x"]],
    );
    const lines = result.split("\n");
    expect(lines[1]).toBe("123456 │ x    ");
  });

  it("pads short cells to column width", () => {
    const result = renderTable(
      [{ name: "A" }, { name: "BBBBB" }],
      [["x", "y"]],
    );
    const lines = result.split("\n");
    expect(lines[1]).toBe("x │ y    ");
  });

  it("handles missing cell values as empty strings", () => {
    const result = renderTable(
      [{ name: "A" }, { name: "B" }],
      [["only one"]],
    );
    const lines = result.split("\n");
    expect(lines[1]).toBe("only one │  ");
  });
});