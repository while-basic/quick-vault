import { Capsule } from '../types';

const DB_NAME = 'ChronosVaultDB';
const STORE_NAME = 'capsules';
const DB_VERSION = 1;

export const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => reject('Database error: ' + (event.target as IDBOpenDBRequest).error);

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const saveCapsule = async (capsule: Capsule): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    // We don't store the blob URL, we regenerate it on load
    const { mediaUrl, ...dataToStore } = capsule;
    const request = store.put(dataToStore);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error saving capsule');
  });
};

export const getAllCapsules = async (): Promise<Capsule[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const capsules = request.result as Capsule[];
      // Check lock status and clean data
      const now = new Date();
      const processed = capsules.map(c => ({
        ...c,
        isLocked: new Date(c.unlockDate) > now,
        mediaUrl: c.mediaBlob ? URL.createObjectURL(c.mediaBlob) : undefined
      }));
      resolve(processed);
    };
    request.onerror = () => reject('Error fetching capsules');
  });
};

export const deleteCapsule = async (id: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error deleting capsule');
  });
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
