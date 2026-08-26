const DATABASE_NAME = "scripticx-client-cache";
const DATABASE_VERSION = 1;
const STORE_NAME = "query-cache";

type AsyncStringStorage = {
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
};

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openCacheDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB upgrade blocked"));
  });
}

export function createQueryCacheStorage(): AsyncStringStorage | undefined {
  if (typeof window === "undefined") return undefined;

  let databasePromise: Promise<IDBDatabase> | null = null;

  function getDatabase() {
    if (!databasePromise) {
      databasePromise = openCacheDatabase().catch((error) => {
        databasePromise = null;
        throw error;
      });
    }
    return databasePromise;
  }

  return {
    async getItem(key) {
      try {
        const database = await getDatabase();
        const value = await requestResult(
          database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key)
        );

        if (typeof value === "string") return value;

        // One-time migration from the old synchronous localStorage persister.
        const legacyValue = window.localStorage.getItem(key);
        if (legacyValue) {
          await requestResult(
            database
              .transaction(STORE_NAME, "readwrite")
              .objectStore(STORE_NAME)
              .put(legacyValue, key)
          );
          window.localStorage.removeItem(key);
          return legacyValue;
        }
        return null;
      } catch {
        return window.localStorage.getItem(key);
      }
    },

    async setItem(key, value) {
      try {
        const database = await getDatabase();
        await requestResult(
          database
            .transaction(STORE_NAME, "readwrite")
            .objectStore(STORE_NAME)
            .put(value, key)
        );
      } catch {
        window.localStorage.setItem(key, value);
      }
    },

    async removeItem(key) {
      try {
        const database = await getDatabase();
        await requestResult(
          database
            .transaction(STORE_NAME, "readwrite")
            .objectStore(STORE_NAME)
            .delete(key)
        );
      } catch {
        // localStorage remains the compatibility fallback when IndexedDB is
        // unavailable (private browsing policies, blocked storage, etc.).
      }
      window.localStorage.removeItem(key);
    },
  };
}
