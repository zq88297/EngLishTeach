import {
  deferEvents,
  markEventsAcknowledged,
  pendingEvents,
  pruneAcknowledgedEvents,
} from "@/data/localDatabase";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export type SyncResult =
  | { status: "synced"; count: number }
  | { status: "local-only" | "signed-out" | "failed"; count: 0 };

let syncInFlight: Promise<SyncResult> | null = null;

async function performSync(): Promise<SyncResult> {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return { status: "local-only", count: 0 };
  }

  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return { status: "signed-out", count: 0 };
  }

  const events = await pendingEvents();
  if (events.length === 0) {
    await pruneAcknowledgedEvents();
    return { status: "synced", count: 0 };
  }

  const rows = events.map((event) => ({
    event_id: event.eventId,
    user_id: user.id,
    item_id: event.itemId,
    case_id: event.caseId,
    chapter_id: event.chapterId,
    encounter_id: event.encounterId,
    content_version: event.contentVersion,
    occurred_at: event.occurredAt,
    result: event.result,
    response_ms: event.responseMs,
    used_hint: event.usedHint,
    answer_normalized: event.answerNormalized,
    confused_with_item_id: event.confusedWithItemId,
  }));

  const { error } = await client
    .from("learning_events")
    .upsert(rows, { onConflict: "event_id" });

  if (error) {
    await deferEvents(events.map((event) => event.eventId));
    return { status: "failed", count: 0 };
  }

  await markEventsAcknowledged(events.map((event) => event.eventId));
  await pruneAcknowledgedEvents();
  return { status: "synced", count: events.length };
}

export function syncPendingLearningEvents(): Promise<SyncResult> {
  if (!syncInFlight) {
    syncInFlight = performSync()
      .catch((): SyncResult => ({ status: "failed", count: 0 }))
      .finally(() => {
        syncInFlight = null;
      });
  }

  return syncInFlight;
}

