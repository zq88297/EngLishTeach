import { describe, expect, it } from "vitest";

import {
  applyStoryChoice,
  createStoryState,
  recordCheckpoint,
  retryFromCheckpoint,
} from "./story";

describe("story state", () => {
  it("fails after three worst story choices", () => {
    let state = createStoryState("court", "court-1", "gate", "arrival");

    for (let index = 0; index < 3; index += 1) {
      state = applyStoryChoice(state, {
        outcomeId: "risk-" + index,
        nextEncounterId: "scene-" + index,
        riskLevel: 1,
      });
    }

    expect(state.status).toBe("failed");
    expect(state.caseClock).toBe(3);
  });

  it("rolls story back without receiving or mutating learning state", () => {
    let state = createStoryState("court", "court-1", "gate", "arrival");
    state = recordCheckpoint(state, "archive", "archive-door");

    for (let index = 0; index < 3; index += 1) {
      state = applyStoryChoice(state, {
        outcomeId: "risk-" + index,
        nextEncounterId: "scene-" + index,
        riskLevel: 1,
        source: index === 2 ? "timeout" : "choice",
      });
    }

    const retried = retryFromCheckpoint(state);

    expect(retried.status).toBe("active");
    expect(retried.currentEncounterId).toBe("archive-door");
    expect(retried.caseClock).toBe(0);
    expect(retried.history.at(-1)?.kind).toBe("retry");
  });
});

