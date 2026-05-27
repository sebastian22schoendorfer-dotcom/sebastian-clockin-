import { openDB, type IDBPDatabase } from "idb";
import type { ClockAttemptInput } from "./types";

const DB_NAME = "clockin";
const STORE = "pending_events";
const VERSION = 1;

type QueuedRecord = ClockAttemptInput & { id?: number };

let dbPromise: Promise<IDBPDatabase> | null = null;

async function db(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE)) {
          database.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueue(record: ClockAttemptInput): Promise<void> {
  const d = await db();
  await d.add(STORE, record);
}

export async function listPending(): Promise<QueuedRecord[]> {
  const d = await db();
  return (await d.getAll(STORE)) as QueuedRecord[];
}

export async function remove(id: number): Promise<void> {
  const d = await db();
  await d.delete(STORE, id);
}

export async function count(): Promise<number> {
  const d = await db();
  return d.count(STORE);
}

export async function drain(): Promise<{ sent: number; failed: number; kept: number }> {
  const records = await listPending();
  let sent = 0;
  let failed = 0;
  let kept = 0;

  for (const r of records) {
    try {
      const res = await fetch("/api/clock-event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(r),
      });
      if (res.ok) {
        sent++;
        if (r.id !== undefined) await remove(r.id);
      } else if (res.status >= 400 && res.status < 500) {
        failed++;
        if (r.id !== undefined) await remove(r.id);
      } else {
        kept++;
      }
    } catch {
      kept++;
    }
  }
  return { sent, failed, kept };
}
