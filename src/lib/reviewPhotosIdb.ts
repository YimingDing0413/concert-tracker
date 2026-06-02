import type { ConcertReview } from '@/types/concertReview';
import { compressReviewPhotos } from '@/lib/reviewPhotoCompress';

const DB_NAME = 'encore_review_photos';
const DB_VERSION = 1;
const STORE = 'photos';

function photoKey(userId: string, eventId: string): string {
  return `${userId}::${eventId}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

export async function saveReviewPhotosToIdb(
  userId: string,
  eventId: string,
  photos: string[]
): Promise<void> {
  if (!photos.length) {
    await deleteReviewPhotosFromIdb(userId, eventId);
    return;
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
    tx.objectStore(STORE).put(photos, photoKey(userId, eventId));
  });
  db.close();
}

export async function loadReviewPhotosFromIdb(
  userId: string,
  eventId: string
): Promise<string[] | null> {
  try {
    const db = await openDb();
    const photos = await new Promise<string[] | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(photoKey(userId, eventId));
      req.onsuccess = () => {
        const value = req.result;
        resolve(Array.isArray(value) ? value : null);
      };
      req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'));
    });
    db.close();
    return photos;
  } catch {
    return null;
  }
}

export async function deleteReviewPhotosFromIdb(
  userId: string,
  eventId: string
): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed'));
      tx.objectStore(STORE).delete(photoKey(userId, eventId));
    });
    db.close();
  } catch {
    /* ignore */
  }
}

/** Prefer the longest non-empty photo list when merging local/server copies. */
export function pickBestPhotos(
  ...candidates: (string[] | undefined)[]
): string[] | undefined {
  let best: string[] = [];
  for (const list of candidates) {
    const cleaned = list?.filter(Boolean) ?? [];
    if (cleaned.length > best.length) best = cleaned;
  }
  return best.length > 0 ? best : undefined;
}

export async function prepareReviewForPersistence(
  review: ConcertReview
): Promise<ConcertReview> {
  const compressed = await compressReviewPhotos(review.photoDataUrls);
  await saveReviewPhotosToIdb(review.userId, review.eventId, compressed);
  return {
    ...review,
    photoDataUrls: compressed.length > 0 ? compressed : undefined,
  };
}

export async function attachStoredPhotos(review: ConcertReview): Promise<ConcertReview> {
  const idb = await loadReviewPhotosFromIdb(review.userId, review.eventId);
  const photoDataUrls = pickBestPhotos(review.photoDataUrls, idb ?? undefined);
  return photoDataUrls ? { ...review, photoDataUrls } : { ...review, photoDataUrls: undefined };
}
