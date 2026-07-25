import { z } from "zod";

export const AttemptResultSchema = z.enum([
  "knowledge_correct",
  "knowledge_incorrect",
  "timeout",
  "input_cancelled",
  "system_interruption",
]);

export type AttemptResult = z.infer<typeof AttemptResultSchema>;

export const LearningEventSchema = z.object({
  eventId: z.string().min(1),
  itemId: z.string().min(1),
  caseId: z.string().min(1),
  chapterId: z.string().min(1),
  encounterId: z.string().min(1),
  contentVersion: z.string().min(1),
  occurredAt: z.string().datetime({ offset: true }),
  result: AttemptResultSchema,
  responseMs: z.number().int().nonnegative(),
  usedHint: z.boolean(),
  answerNormalized: z.string().nullable(),
  confusedWithItemId: z.string().nullable(),
});

export type LearningEvent = z.infer<typeof LearningEventSchema>;

const punctuationPattern = /[.,!?;:'"()[\]{}，。！？；：“”‘’]/g;

export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(punctuationPattern, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function evaluateAnswer(
  answer: string,
  acceptedForms: readonly string[],
): { correct: boolean; normalizedAnswer: string } {
  const normalizedAnswer = normalizeAnswer(answer);
  const accepted = new Set(acceptedForms.map(normalizeAnswer));

  return {
    correct: normalizedAnswer.length > 0 && accepted.has(normalizedAnswer),
    normalizedAnswer,
  };
}

export function isMasteryEvidence(result: AttemptResult): boolean {
  return result === "knowledge_correct" || result === "knowledge_incorrect";
}

export function masteryEvidenceWeight(event: LearningEvent): number {
  if (!isMasteryEvidence(event.result)) {
    return 0;
  }

  if (event.result === "knowledge_incorrect") {
    return -1;
  }

  return event.usedHint ? 0.5 : 1;
}

export function dedupeMasteryEvents(
  events: readonly LearningEvent[],
): LearningEvent[] {
  const evidenceKeys = new Set<string>();

  return events.filter((event) => {
    if (!isMasteryEvidence(event.result)) {
      return false;
    }

    const key = [
      event.itemId,
      event.encounterId,
      event.contentVersion,
    ].join(":");

    if (evidenceKeys.has(key)) {
      return false;
    }

    evidenceKeys.add(key);
    return true;
  });
}

export function hasConfirmedConfusion(
  events: readonly LearningEvent[],
  targetItemId: string,
  confusedWithItemId: string,
  now: Date,
): boolean {
  const windowStart = now.getTime() - 90 * 24 * 60 * 60 * 1000;
  const contexts = new Set(
    events
      .filter(
        (event) =>
          event.result === "knowledge_incorrect" &&
          event.itemId === targetItemId &&
          event.confusedWithItemId === confusedWithItemId &&
          new Date(event.occurredAt).getTime() >= windowStart,
      )
      .map((event) =>
        [event.encounterId, event.contentVersion].join(":"),
      ),
  );

  return contexts.size >= 2;
}

