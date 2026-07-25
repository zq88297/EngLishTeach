import { z } from "zod";

const StoryStatusSchema = z.enum(["active", "failed", "completed"]);

const CheckpointSnapshotSchema = z.object({
  checkpointId: z.string().min(1),
  encounterId: z.string().min(1),
  caseClock: z.number().int().nonnegative(),
  worstChoiceCount: z.number().int().nonnegative(),
});

const StoryHistoryEntrySchema = z.object({
  kind: z.enum(["choice", "timeout", "checkpoint", "retry", "complete"]),
  encounterId: z.string().min(1),
  outcomeId: z.string().nullable(),
  riskLevel: z.union([z.literal(0), z.literal(1)]),
});

export const StoryStateSchema = z.object({
  caseId: z.string().min(1),
  chapterId: z.string().min(1),
  currentEncounterId: z.string().min(1),
  caseClock: z.number().int().nonnegative(),
  worstChoiceCount: z.number().int().nonnegative(),
  status: StoryStatusSchema,
  lastCheckpoint: CheckpointSnapshotSchema,
  history: z.array(StoryHistoryEntrySchema),
});

export type StoryState = z.infer<typeof StoryStateSchema>;

export function createStoryState(
  caseId: string,
  chapterId: string,
  encounterId: string,
  checkpointId: string,
): StoryState {
  return StoryStateSchema.parse({
    caseId,
    chapterId,
    currentEncounterId: encounterId,
    caseClock: 0,
    worstChoiceCount: 0,
    status: "active",
    lastCheckpoint: {
      checkpointId,
      encounterId,
      caseClock: 0,
      worstChoiceCount: 0,
    },
    history: [],
  });
}

export function recordCheckpoint(
  state: StoryState,
  checkpointId: string,
  encounterId: string,
): StoryState {
  return StoryStateSchema.parse({
    ...state,
    currentEncounterId: encounterId,
    lastCheckpoint: {
      checkpointId,
      encounterId,
      caseClock: state.caseClock,
      worstChoiceCount: state.worstChoiceCount,
    },
    history: [
      ...state.history,
      { kind: "checkpoint", encounterId, outcomeId: null, riskLevel: 0 },
    ],
  });
}

type ChoiceInput = {
  outcomeId: string;
  nextEncounterId: string;
  riskLevel: 0 | 1;
  source?: "choice" | "timeout";
};

export function applyStoryChoice(
  state: StoryState,
  input: ChoiceInput,
): StoryState {
  if (state.status !== "active") {
    return state;
  }

  const worstChoiceCount = state.worstChoiceCount + input.riskLevel;
  const status = worstChoiceCount >= 3 ? "failed" : "active";

  return StoryStateSchema.parse({
    ...state,
    currentEncounterId: input.nextEncounterId,
    caseClock: state.caseClock + input.riskLevel,
    worstChoiceCount,
    status,
    history: [
      ...state.history,
      {
        kind: input.source ?? "choice",
        encounterId: state.currentEncounterId,
        outcomeId: input.outcomeId,
        riskLevel: input.riskLevel,
      },
    ],
  });
}

export function retryFromCheckpoint(state: StoryState): StoryState {
  if (state.status !== "failed") {
    return state;
  }

  const checkpoint = state.lastCheckpoint;

  return StoryStateSchema.parse({
    ...state,
    currentEncounterId: checkpoint.encounterId,
    caseClock: checkpoint.caseClock,
    worstChoiceCount: checkpoint.worstChoiceCount,
    status: "active",
    history: [
      ...state.history,
      {
        kind: "retry",
        encounterId: checkpoint.encounterId,
        outcomeId: null,
        riskLevel: 0,
      },
    ],
  });
}

export function completeStory(state: StoryState): StoryState {
  if (state.status !== "active") {
    return state;
  }

  return StoryStateSchema.parse({
    ...state,
    status: "completed",
    history: [
      ...state.history,
      {
        kind: "complete",
        encounterId: state.currentEncounterId,
        outcomeId: null,
        riskLevel: 0,
      },
    ],
  });
}

