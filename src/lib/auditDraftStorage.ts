/**
 * Audit Draft Persistence
 * 
 * Uses IndexedDB for reliable storage of in-progress audit forms.
 * Falls back to localStorage if IndexedDB is not available.
 * 
 * This ensures audit data survives page reloads, app switches, and browser closures on mobile.
 */

const DB_NAME = 'auditDraftsDB';
const STORE_NAME = 'drafts';
const DB_VERSION = 1;

export interface AuditDraft {
  key: string;
  userId: string;
  locationId: string;
  templateId: string;
  formData: {
    location_id: string;
    auditDate: string;
    timeStart: string;
    timeEnd: string;
    notes: string;
    customData: Record<string, any>;
  };
  currentSectionIndex: number;
  sectionFollowUps: Record<string, { needed: boolean; notes: string }>;
  savedAt: number;
}

// Build draft key from identifiers
export const buildDraftKey = (userId: string, locationId: string, templateId: string): string => {
  return `auditDraft:${userId}:${locationId}:${templateId}`;
};

// Check if IndexedDB is available
const isIndexedDBAvailable = (): boolean => {
  try {
    return 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
};

// Open IndexedDB connection
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn('[AuditDraft] IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('savedAt', 'savedAt', { unique: false });
      }
    };
  });
};

// Save draft to IndexedDB
const saveToIndexedDB = async (draft: AuditDraft): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(draft);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
};

// Load draft from IndexedDB
const loadFromIndexedDB = async (key: string): Promise<AuditDraft | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
};

// Delete draft from IndexedDB
const deleteFromIndexedDB = async (key: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
};

// Find drafts by user from IndexedDB
const findDraftsByUserFromIndexedDB = async (userId: string): Promise<AuditDraft[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('userId');
    const request = index.getAll(userId);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
};

// LocalStorage fallback key prefix
const LS_PREFIX = 'auditDraft_';

// Save to localStorage fallback
const saveToLocalStorage = (draft: AuditDraft): void => {
  try {
    localStorage.setItem(LS_PREFIX + draft.key, JSON.stringify(draft));
  } catch (e) {
    console.warn('[AuditDraft] LocalStorage save error:', e);
  }
};

// Load from localStorage fallback
const loadFromLocalStorage = (key: string): AuditDraft | null => {
  try {
    const data = localStorage.getItem(LS_PREFIX + key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

// Delete from localStorage fallback
const deleteFromLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(LS_PREFIX + key);
  } catch {
    // Ignore errors
  }
};

// Find drafts by user from localStorage
const findDraftsByUserFromLocalStorage = (userId: string): AuditDraft[] => {
  const drafts: AuditDraft[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LS_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          const draft = JSON.parse(data) as AuditDraft;
          if (draft.userId === userId) {
            drafts.push(draft);
          }
        }
      }
    }
  } catch {
    // Ignore errors
  }
  return drafts;
};

/**
 * Save an audit draft
 */
export const saveAuditDraft = async (draft: AuditDraft): Promise<void> => {
  draft.savedAt = Date.now();
  
  if (isIndexedDBAvailable()) {
    try {
      await saveToIndexedDB(draft);
      return;
    } catch (e) {
      console.warn('[AuditDraft] IndexedDB save failed, using localStorage:', e);
    }
  }
  
  saveToLocalStorage(draft);
};

/**
 * Load an audit draft by key
 */
export const loadAuditDraft = async (key: string): Promise<AuditDraft | null> => {
  if (isIndexedDBAvailable()) {
    try {
      const draft = await loadFromIndexedDB(key);
      if (draft) return draft;
    } catch (e) {
      console.warn('[AuditDraft] IndexedDB load failed, trying localStorage:', e);
    }
  }
  
  return loadFromLocalStorage(key);
};

/**
 * Delete an audit draft by key
 */
export const clearAuditDraft = async (key: string): Promise<void> => {
  // Delete from both storages to ensure cleanup
  deleteFromLocalStorage(key);
  
  if (isIndexedDBAvailable()) {
    try {
      await deleteFromIndexedDB(key);
    } catch (e) {
      console.warn('[AuditDraft] IndexedDB delete error:', e);
    }
  }
};

/**
 * Find all drafts for a user
 */
export const findDraftsForUser = async (userId: string): Promise<AuditDraft[]> => {
  let drafts: AuditDraft[] = [];
  
  if (isIndexedDBAvailable()) {
    try {
      drafts = await findDraftsByUserFromIndexedDB(userId);
    } catch (e) {
      console.warn('[AuditDraft] IndexedDB query failed:', e);
    }
  }
  
  // Also check localStorage for any fallback drafts
  const lsDrafts = findDraftsByUserFromLocalStorage(userId);
  
  // Merge, preferring newer versions
  const draftMap = new Map<string, AuditDraft>();
  [...drafts, ...lsDrafts].forEach(d => {
    const existing = draftMap.get(d.key);
    if (!existing || d.savedAt > existing.savedAt) {
      draftMap.set(d.key, d);
    }
  });
  
  return Array.from(draftMap.values());
};

/**
 * Format saved time for display
 */
export const formatDraftTime = (savedAt: number): string => {
  const date = new Date(savedAt);
  const now = new Date();
  const diffMs = now.getTime() - savedAt;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return date.toLocaleDateString();
};
