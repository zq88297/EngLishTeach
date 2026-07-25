import Dexie, { type EntityTable } from "dexie";
import { z } from "zod";

import {
  LearningEventSchema,
  type LearningEvent,
} from "@/domain/learning";
import { StoryStateSchema, type StoryState } from "@/domain/story";

const CaseRuntimeRecordSchema = z.object({
  caseId: z.enum(["court", "city"]),
  chapterIndex: z.number().int().min(0).max(6),
  completedChapterIds: z.array(z.string()),
  story: StoryStateSchema,
  chapterResolved: z.boolean(),
  updatedAt: z.string().datetime({ offset: true }),
});

export type CaseRuntimeRecord = z.infer<typeof CaseRuntimeRecordSchema>;

type SyncQueueRow = {
  eventId: string;
  status: "pending" | "acknowledged";
  attempts: number;
  nextAttemptAt: string;
  acknowledgedAt: string | null;
};

class EnglishTechDatabase extends Dexie {
  learningEvents!: EntityTable<LearningEvent, "eventId">;
  caseRuntimes!: EntityTable<CaseRuntimeRecord, "caseId">;
  syncQueue!: EntityTable<SyncQueueRow, "eventId">;

  constructor() {
    super("englishtech");
    this.version(1).stores({
      learningEvents:
        "eventId, itemId, caseId, chapterId, encounterId, occurredAt, result",
      caseRuntimes: "caseId, updatedAt",
      syncQueue: "eventId, status, nextAttemptAt, acknowledgedAt",
    });
  }
}

let database: EnglishTechDatabase | null = null;

export function getLocalDatabase(): EnglishTechDatabase {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is unavailable");
  }

  database ??= new EnglishTechDatabase();
  return database;
}

export function retryDelayMs(attempts: number): number {
  const safeAttempts = Math.max(0, Math.min(attempts, 8));
  return Math.min(300_000, 1_000 * 2 ** safeAttempts);
}

export async function enqueueLearningEvent(
  input: LearningEvent,
): Promise<void> {
  const event = LearningEventSchema.parse(input);
  const db = getLocalDatabase();

  await db.transaction("rw", db.learningEvents, db.syncQueue, async () => {
    await db.learningEvents.put(event);
    await db.syncQueue.put({
      eventId: event.eventId,
      status: "pending",
      attempts: 0,
      nextAttemptAt: new Date().toISOString(),
      acknowledgedAt: null,
    });
  });
}

export async function saveCaseRuntime(
  runtime: Omit<CaseRuntimeRecord, "updatedAt">,
): Promise<void> {
  const record = CaseRuntimeRecordSchema.parse({
    ...runtime,
    updatedAt: new Date().toISOString(),
  });

  await getLocalDatabase().caseRuntimes.put(record);
}

export async function loadLocalProgress(): Promise<{
  runtimes: CaseRuntimeRecord[];
  learningEvents: LearningEvent[];
}> {
  const db = getLocalDatabase();
  const [runtimes, events] = await Promise.all([
    db.caseRuntimes.toArray(),
    db.learningEvents.orderBy("occurredAt").toArray(),
  ]);

  return {
    runtimes: runtimes.flatMap((runtime) => {
      const parsed = CaseRuntimeRecordSchema.safeParse(runtime);
      return parsed.success ? [parsed.data] : [];
    }),
    learningEvents: events.flatMap((event) => {
      const parsed = LearningEventSchema.safeParse(event);
      return parsed.success ? [parsed.data] : [];
    }),
  };
}

export async function pendingEvents(
  limit = 50,
): Promise<LearningEvent[]> {
  const db = getLocalDatabase();
  const now = new Date().toISOString();
  const queueRows = await db.syncQueue
    .where("status")
    .equals("pending")
    .filter((row) => row.nextAttemptAt <= now)
    .limit(limit)
    .toArray();

  const events = await db.learningEvents.bulkGet(
    queueRows.map((row) => row.eventId),
  );

  return events.flatMap((event) => (event ? [event] : []));
}

export async function markEventsAcknowledged(
  eventIds: readonly string[],
): Promise<void> {
  if (eventIds.length === 0) {
    return;
  }

  const db = getLocalDatabase();
  const acknowledgedAt = new Date().toISOString();

  await db.syncQueue
    .where("eventId")
    .anyOf([...eventIds])
    .modify({ status: "acknowledged", acknowledgedAt });
}

export async function deferEvents(
  eventIds: readonly string[],
): Promise<void> {
  if (eventIds.length === 0) {
    return;
  }

  const db = getLocalDatabase();

  await db.syncQueue
    .where("eventId")
    .anyOf([...eventIds])
    .modify((row) => {
      row.attempts += 1;
      row.nextAttemptAt = new Date(
        Date.now() + retryDelayMs(row.attempts),
      ).toISOString();
    });
}

export async function pruneAcknowledgedEvents(
  now = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1_000).toISOString();
  const db = getLocalDatabase();
  const rows = await db.syncQueue
    .where("status")
    .equals("acknowledged")
    .filter(
      (row) =>
        row.acknowledgedAt !== null && row.acknowledgedAt <= cutoff,
    )
    .toArray();

  await db.syncQueue.bulkDelete(rows.map((row) => row.eventId));
  return rows.length;
}

export type { StoryState };

