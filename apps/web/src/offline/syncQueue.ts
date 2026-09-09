/**
 * Fila de sincronização offline-first (spec §8 / doc original §16).
 *
 * Esta é a base para a Fase 3 (app do mecânico funcionando sem internet):
 * mutações feitas offline são empilhadas aqui em IndexedDB e reenviadas
 * quando a conexão volta. Na Fase 1 o app ainda assume conexão disponível;
 * esta fila existe apenas como scaffold para não exigir retrabalho estrutural
 * depois.
 */

const DB_NAME = "oficina-offline";
const STORE_NAME = "pending-mutations";
const DB_VERSION = 1;

export interface PendingMutation {
  id?: number;
  url: string;
  method: string;
  body?: unknown;
  createdAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB não disponível neste ambiente"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueMutation(mutation: Omit<PendingMutation, "id" | "createdAt">) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).add({ ...mutation, createdAt: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listPendingMutations(): Promise<PendingMutation[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as PendingMutation[]);
    req.onerror = () => reject(req.error);
  });
}

export async function clearMutation(id: number) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
