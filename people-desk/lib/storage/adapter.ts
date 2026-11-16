import type { PeopleDeskData } from "@/lib/domain/types";

/**
 * Couche de persistance indépendante : une implémentation localStorage aujourd'hui,
 * remplaçable par une API distante plus tard sans toucher aux composants.
 */
export interface StoreAdapter {
  readonly kind: "local" | "memory" | "remote";
  isAvailable(): boolean;
  read(): PeopleDeskData | null;
  write(data: PeopleDeskData): boolean;
  /** Écriture initiale sans notification (évite un double rendu à l'hydratation). */
  silentWrite(data: PeopleDeskData): boolean;
  clear(): boolean;
  subscribe(listener: () => void): () => void;
}

export const LOCAL_STORAGE_KEY = "people-desk:data:v1";

export function createLocalStorageAdapter(key = LOCAL_STORAGE_KEY): StoreAdapter {
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };

  function storage(): Storage | null {
    try {
      if (typeof window === "undefined") return null;
      return window.localStorage;
    } catch {
      return null;
    }
  }

  return {
    kind: "local",
    isAvailable() {
      const store = storage();
      if (!store) return false;
      try {
        const probe = `${key}:probe`;
        store.setItem(probe, "1");
        store.removeItem(probe);
        return true;
      } catch {
        return false;
      }
    },
    read() {
      const store = storage();
      if (!store) return null;
      try {
        const raw = store.getItem(key);
        return raw ? (JSON.parse(raw) as PeopleDeskData) : null;
      } catch {
        return null;
      }
    },
    write(data) {
      const store = storage();
      if (!store) return false;
      try {
        store.setItem(key, JSON.stringify(data));
        notify();
        return true;
      } catch {
        return false;
      }
    },
    silentWrite(data) {
      const store = storage();
      if (!store) return false;
      try {
        store.setItem(key, JSON.stringify(data));
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      const store = storage();
      if (!store) return false;
      try {
        store.removeItem(key);
        notify();
        return true;
      } catch {
        return false;
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) listener();
      };
      if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      };
    },
  };
}

export function createMemoryAdapter(initial: PeopleDeskData | null = null): StoreAdapter {
  let data = initial;
  const listeners = new Set<() => void>();
  return {
    kind: "memory",
    isAvailable: () => true,
    read: () => data,
    write(next) {
      data = next;
      return true;
    },
    silentWrite(next) {
      data = next;
      return true;
    },
    clear() {
      data = null;
      return true;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
