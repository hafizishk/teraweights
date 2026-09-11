import { describe, expect, it } from "vitest";
import { parsePostBody, postExcerpt } from "./post-body";

describe("parsePostBody", () => {
  it("splits paragraphs on blank lines and joins wrapped lines", () => {
    expect(parsePostBody("one\ntwo\n\nthree")).toEqual([
      { kind: "paragraph", text: "one two" },
      { kind: "paragraph", text: "three" },
    ]);
  });

  it("turns # lines into headings", () => {
    expect(parsePostBody("## You need\n\noats")).toEqual([
      { kind: "heading", text: "You need" },
      { kind: "paragraph", text: "oats" },
    ]);
  });

  it("strips ** rather than rendering bold", () => {
    expect(parsePostBody("**Bring** water")).toEqual([{ kind: "paragraph", text: "Bring water" }]);
  });

  it("handles Windows line endings", () => {
    expect(parsePostBody("a\r\n\r\nb")).toHaveLength(2);
  });

  it("returns nothing for an empty body", () => {
    expect(parsePostBody("   \n\n")).toEqual([]);
  });
});

describe("postExcerpt", () => {
  it("skips a leading heading", () => {
    expect(postExcerpt("# Title\n\nThe text.")).toBe("The text.");
  });

  it("cuts on a word boundary with an ellipsis", () => {
    const long = "word ".repeat(40).trim();
    const out = postExcerpt(long, 50);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out).not.toMatch(/wor…$/);
  });
});
