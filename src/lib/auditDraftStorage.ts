/**
 * Audit Draft Persistence v2
 * 
 * Uses IndexedDB for reliable storage of in-progress audit forms.
 * Falls back to localStorage if IndexedDB is not available.
 * Includes SYNCHRONOUS save for iOS pagehide/visibilitychange events.
 * 
 * This ensures audit data survives page reloads, app switches, and browser closures on mobile.
 */

const DB_NAME = 'auditDraftsDB';
const STORE_NAME = 'drafts';
const DB_VERSION = 2; // Bumped version for schema consistency

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
  schemaVersion?: number;
}

// Build draft key from identifiers - STABLE format with version prefix
export const buildDraftKey = (userId: string, locationId: string, templateId: string): string => {
  const loc = locationId || 'none';
  const tmpl = templateId || 'none';
  return `auditDraft:v1:${userId}:${loc}:${tmpl}`;
};

// Check if IndexedDB is available
const isIndexedDBAvailable = (): boolean => {
  try {
    return 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
};

// Cached DB connection
let cachedDB: IDBDatabase | null = null;

// Open IndexedDB connection (with caching)
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Return cached connection if valid
    if (cachedDB && cachedDB.name === DB_NAME) {
      try {
        // Test if connection is still valid
        const tx = cachedDB.transaction([STORE_NAME], 'readonly');
        tx.abort();
        resolve(cachedDB);
        return;
      } catch {
        cachedDB = null;
      }
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn('[AuditDraft] IndexedDB open error:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      cachedDB = request.result;
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
  });
};

// LocalStorage fallback key prefix
const LS_PREFIX = 'auditDraft_v1_';

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
    // Try new prefix first
    let data = localStorage.getItem(LS_PREFIX + key);
    if (data) return JSON.parse(data);
    
    // Fallback to old prefix for migration
    data = localStorage.getItem('auditDraft_' + key);
    if (data) return JSON.parse(data);
    
    return null;
  } catch {
    return null;
  }
};

// Delete from localStorage fallback
const deleteFromLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(LS_PREFIX + key);
    // Also try old prefix
    localStorage.removeItem('auditDraft_' + key);
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
      if (key?.startsWith(LS_PREFIX) || key?.startsWith('auditDraft_')) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const draft = JSON.parse(data) as AuditDraft;
            if (draft.userId === userId) {
              drafts.push(draft);
            }
          } catch {
            // Skip invalid entries
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
 * Save an audit draft (async - for debounced saves)
 */
export const saveAuditDraft = async (draft: AuditDraft): Promise<void> => {
  draft.savedAt = Date.now();
  draft.schemaVersion = 1;
  
  // Always save to localStorage first (most reliable on mobile)
  saveToLocalStorage(draft);
  
  if (isIndexedDBAvailable()) {
    try {
      await saveToIndexedDB(draft);
    } catch (e) {
      console.warn('[AuditDraft] IndexedDB save failed, localStorage used:', e);
    }
  }
};

/**
 * Save an audit draft SYNCHRONOUSLY (for pagehide/visibilitychange on iOS)
 * This uses only localStorage since IndexedDB is async
 */
export const saveAuditDraftSync = (draft: AuditDraft): void => {
  draft.savedAt = Date.now();
  draft.schemaVersion = 1;
  
  // Synchronous localStorage save - critical for iOS
  saveToLocalStorage(draft);
  console.log('[AuditDraft] Sync save to localStorage completed');
};

/**
 * Load an audit draft by key
 */
export const loadAuditDraft = async (key: string): Promise<AuditDraft | null> => {
  // Try localStorage first (most reliable after sync saves)
  const lsDraft = loadFromLocalStorage(key);
  
  if (isIndexedDBAvailable()) {
    try {
      const idbDraft = await loadFromIndexedDB(key);
      
      // Return whichever is newer
      if (lsDraft && idbDraft) {
        return lsDraft.savedAt > idbDraft.savedAt ? lsDraft : idbDraft;
      }
      return idbDraft || lsDraft;
    } catch (e) {
      console.warn('[AuditDraft] IndexedDB load failed, using localStorage:', e);
    }
  }
  
  return lsDraft;
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
  
  // Check localStorage first
  const lsDrafts = findDraftsByUserFromLocalStorage(userId);
  
  if (isIndexedDBAvailable()) {
    try {
      drafts = await findDraftsByUserFromIndexedDB(userId);
    } catch (e) {
      console.warn('[AuditDraft] IndexedDB query failed:', e);
    }
  }
  
  // Merge, preferring newer versions
  const draftMap = new Map<string, AuditDraft>();
  [...lsDrafts, ...drafts].forEach(d => {
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
