import { describe, expect, it } from "vitest";

import { casePacks, validateContentReferences } from "./cases";
import { sharedCurriculum } from "./curriculum";

describe("published content", () => {
  it("publishes 42 validated vocabulary senses", () => {
    expect(sharedCurriculum).toHaveLength(42);
    expect(new Set(sharedCurriculum.map((word) => word.itemId)).size).toBe(42);
  });

  it("publishes two complete seven-chapter cases", () => {
    expect(casePacks).toHaveLength(2);
    expect(casePacks.every((casePack) => casePack.chapters.length === 7)).toBe(
      true,
    );
  });

  it("uses every curriculum item once as a new item in each case", () => {
    for (const casePack of casePacks) {
      const newWordIds = casePack.chapters.flatMap(
        (chapter) => chapter.newWordIds,
      );
      expect(new Set(newWordIds).size).toBe(42);
    }
  });

  it("has no broken authored references or reading-length violations", () => {
    expect(validateContentReferences()).toEqual([]);
  });
});

