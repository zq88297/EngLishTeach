import { describe, expect, it } from "vitest";

import {
  dedupeMasteryEvents,
  evaluateAnswer,
  hasConfirmedConfusion,
  isMasteryEvidence,
  type LearningEvent,
} from "./learning";

const event = (
  overrides: Partial<LearningEvent> = {},
): LearningEvent => ({
  eventId: "event-1",
  itemId: "evidence:primary",
  caseId: "court",
  chapterId: "court-1",
  encounterId: "archive",
  contentVersion: "1.0.0",
  occurredAt: "2026-07-24T08:00:00+08:00",
  result: "knowledge_incorrect",
  responseMs: 3_000,
  usedHint: false,
  answerNormalized: "testimony",
  confusedWithItemId: "testimony:primary",
  ...overrides,
});

describe("answer evaluation", () => {
  it("normalizes case, width, spacing and punctuation", () => {
    expect(evaluateAnswer("  EVIDENCE！ ", ["evidence"]).correct).toBe(true);
    expect(evaluateAnswer("cypher", ["cipher", "cypher"]).correct).toBe(true);
  });

  it("does not invent undeclared synonyms", () => {
    expect(evaluateAnswer("proof", ["evidence"]).correct).toBe(false);
  });
});

describe("learning evidence", () => {
  it("never treats timeout or interruption as mastery evidence", () => {
    expect(isMasteryEvidence("timeout")).toBe(false);
    expect(isMasteryEvidence("input_cancelled")).toBe(false);
    expect(isMasteryEvidence("system_interruption")).toBe(false);
  });

  it("deduplicates repeated evidence in one authored context", () => {
    const duplicate = event({ eventId: "event-2" });
    const timeout = event({ eventId: "event-3", result: "timeout" });

    expect(dedupeMasteryEvents([event(), duplicate, timeout])).toHaveLength(1);
  });

  it("requires two distinct contexts to confirm a confusion", () => {
    const secondContext = event({
      eventId: "event-2",
      encounterId: "garden",
      occurredAt: "2026-07-25T08:00:00+08:00",
    });

    expect(
      hasConfirmedConfusion(
        [event(), secondContext],
        "evidence:primary",
        "testimony:primary",
        new Date("2026-07-26T00:00:00Z"),
      ),
    ).toBe(true);
  });
});

