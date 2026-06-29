import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "qr-suite";
const DB_VERSION = 1;
const STORE_NAME = "drafts";

let dbPromise: Promise<IDBPDatabase> | undefined;

function getDb(): Promise<IDBPDatabase> {
  return (dbPromise ??= openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    }
  }));
}

/**
 * Loads a persisted draft.
 *
 * The stored value originates from a possibly older app version, so the `T`
 * type parameter is an UNCHECKED assertion unless a `parse` validator is
 * supplied. Prefer passing `parse` to migrate/validate the raw shape.
 */
export async function loadDraft<T>(
  key: string,
  parse?: (raw: unknown) => T | null
): Promise<T | null> {
  const db = await getDb();
  const raw = (await db.get(STORE_NAME, key)) ?? null;
  if (raw === null) {
    return null;
  }
  return parse ? parse(raw) : (raw as T);
}

export async function saveDraft<T>(key: string, value: T): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, value, key);
}

export async function clearDraft(key: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, key);
}
