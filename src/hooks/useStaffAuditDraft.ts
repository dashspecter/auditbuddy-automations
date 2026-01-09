/**
 * Staff Audit Draft Persistence Hook
 * 
 * iOS-optimized draft persistence for Employee Audit / Performance Review forms.
 * Uses IndexedDB with localStorage fallback for reliability on mobile.
 * 
 * Features:
 * - Debounced autosave on every input change
 * - Synchronous save on visibilitychange/pagehide (critical for iOS)
 * - Periodic save every 5 seconds as safety net
 * - Hydration guard to prevent empty state from overwriting drafts
 * - Stable draft keys for reliable restoration
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ----- Storage Types -----

export interface StaffAuditDraft {
  key: string;
  userId: string;
  formData: {
    location_id: string;
    employee_id: string;
    audit_date: string;
    score: number;
    notes: string;
    template_id: string | null;
    customData: Record<string, any>;
  };
  savedAt: number;
  schemaVersion: number;
}

// ----- Storage Constants -----

const DRAFT_KEY_PREFIX = 'staffAuditDraft:v1';
const LS_PREFIX = 'staffAuditDraft_v1_';

// ----- Key Generation -----

export const buildStaffAuditDraftKey = (
  userId: string,
  locationId?: string,
  employeeId?: string,
  templateId?: string
): string => {
  const loc = locationId || 'none';
  const emp = employeeId || 'none';
  const tmpl = templateId || 'none';
  return `${DRAFT_KEY_PREFIX}:${userId}:${loc}:${emp}:${tmpl}`;
};

// ----- LocalStorage Operations -----

const saveToLocalStorage = (draft: StaffAuditDraft): void => {
  try {
    localStorage.setItem(LS_PREFIX + draft.key, JSON.stringify(draft));
    console.log('[StaffAuditDraft] Saved to localStorage:', draft.key);
  } catch (e) {
    console.warn('[StaffAuditDraft] LocalStorage save error:', e);
  }
};

const loadFromLocalStorage = (key: string): StaffAuditDraft | null => {
  try {
    const data = localStorage.getItem(LS_PREFIX + key);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch {
    return null;
  }
};

const deleteFromLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(LS_PREFIX + key);
  } catch {
    // Ignore errors
  }
};

const findDraftsForUserFromLocalStorage = (userId: string): StaffAuditDraft[] => {
  const drafts: StaffAuditDraft[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(LS_PREFIX)) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const draft = JSON.parse(data) as StaffAuditDraft;
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

// ----- IndexedDB Operations -----

const DB_NAME = 'staffAuditDraftsDB';
const STORE_NAME = 'drafts';
const DB_VERSION = 1;

let cachedDB: IDBDatabase | null = null;

const isIndexedDBAvailable = (): boolean => {
  try {
    return 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
};

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (cachedDB && cachedDB.name === DB_NAME) {
      try {
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
      console.warn('[StaffAuditDraft] IndexedDB open error:', request.error);
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

const saveToIndexedDB = async (draft: StaffAuditDraft): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(draft);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const loadFromIndexedDB = async (key: string): Promise<StaffAuditDraft | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

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

const findDraftsByUserFromIndexedDB = async (userId: string): Promise<StaffAuditDraft[]> => {
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

// ----- High-level Storage API -----

export const saveStaffAuditDraft = async (draft: StaffAuditDraft): Promise<void> => {
  draft.savedAt = Date.now();
  draft.schemaVersion = 1;
  
  // Always save to localStorage first (most reliable on mobile)
  saveToLocalStorage(draft);
  
  if (isIndexedDBAvailable()) {
    try {
      await saveToIndexedDB(draft);
    } catch (e) {
      console.warn('[StaffAuditDraft] IndexedDB save failed, localStorage used:', e);
    }
  }
};

export const saveStaffAuditDraftSync = (draft: StaffAuditDraft): void => {
  draft.savedAt = Date.now();
  draft.schemaVersion = 1;
  saveToLocalStorage(draft);
  console.log('[StaffAuditDraft] Sync save completed');
};

export const loadStaffAuditDraft = async (key: string): Promise<StaffAuditDraft | null> => {
  const lsDraft = loadFromLocalStorage(key);
  
  if (isIndexedDBAvailable()) {
    try {
      const idbDraft = await loadFromIndexedDB(key);
      if (lsDraft && idbDraft) {
        return lsDraft.savedAt > idbDraft.savedAt ? lsDraft : idbDraft;
      }
      return idbDraft || lsDraft;
    } catch (e) {
      console.warn('[StaffAuditDraft] IndexedDB load failed:', e);
    }
  }
  
  return lsDraft;
};

export const clearStaffAuditDraft = async (key: string): Promise<void> => {
  deleteFromLocalStorage(key);
  
  if (isIndexedDBAvailable()) {
    try {
      await deleteFromIndexedDB(key);
    } catch (e) {
      console.warn('[StaffAuditDraft] IndexedDB delete error:', e);
    }
  }
  console.log('[StaffAuditDraft] Draft cleared:', key);
};

export const findStaffAuditDraftsForUser = async (userId: string): Promise<StaffAuditDraft[]> => {
  let drafts: StaffAuditDraft[] = [];
  
  const lsDrafts = findDraftsForUserFromLocalStorage(userId);
  
  if (isIndexedDBAvailable()) {
    try {
      drafts = await findDraftsByUserFromIndexedDB(userId);
    } catch (e) {
      console.warn('[StaffAuditDraft] IndexedDB query failed:', e);
    }
  }
  
  // Merge, preferring newer versions
  const draftMap = new Map<string, StaffAuditDraft>();
  [...lsDrafts, ...drafts].forEach(d => {
    const existing = draftMap.get(d.key);
    if (!existing || d.savedAt > existing.savedAt) {
      draftMap.set(d.key, d);
    }
  });
  
  return Array.from(draftMap.values());
};

// ----- Time Formatting -----

export const formatDraftTime = (savedAt: number): string => {
  const diffMs = Date.now() - savedAt;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return new Date(savedAt).toLocaleDateString();
};

// ----- Hook Interface -----

interface StaffAuditFormData {
  location_id: string;
  employee_id: string;
  audit_date: string;
  score: number;
  notes: string;
  template_id: string | null;
  customData: Record<string, any>;
}

interface UseStaffAuditDraftOptions {
  formData: StaffAuditFormData;
  onRestore?: (draft: StaffAuditDraft) => void;
  enabled?: boolean;
}

export const useStaffAuditDraft = ({
  formData,
  onRestore,
  enabled = true,
}: UseStaffAuditDraftOptions) => {
  const { user } = useAuth();
  const [isRestoring, setIsRestoring] = useState(true);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasRestoredRef = useRef(false);
  const lastSavedDataRef = useRef<string>('');
  const isHydratingRef = useRef(true);

  // Build current draft key
  const currentDraftKey = useMemo(() => {
    if (!user?.id || !enabled) return null;
    return buildStaffAuditDraftKey(
      user.id,
      formData.location_id || undefined,
      formData.employee_id || undefined,
      formData.template_id || undefined
    );
  }, [user?.id, formData.location_id, formData.employee_id, formData.template_id, enabled]);

  // Restore draft on mount - BEFORE any autosave
  useEffect(() => {
    if (!user?.id || hasRestoredRef.current || !enabled) {
      isHydratingRef.current = false;
      setIsRestoring(false);
      return;
    }

    const restoreDraft = async () => {
      setIsRestoring(true);
      isHydratingRef.current = true;
      
      try {
        // Find all drafts for this user and pick the most recent valid one
        const allDrafts = await findStaffAuditDraftsForUser(user.id);
        console.log('[useStaffAuditDraft] Found drafts:', allDrafts.length);
        
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const validDrafts = allDrafts
          .filter(d => d.savedAt > sevenDaysAgo)
          .sort((a, b) => b.savedAt - a.savedAt);
        
        if (validDrafts.length > 0 && onRestore) {
          const draft = validDrafts[0];
          hasRestoredRef.current = true;
          setHasPendingDraft(true);
          console.log('[useStaffAuditDraft] Restoring draft:', draft.key);
          onRestore(draft);
          toast.success(`Draft restored (saved ${formatDraftTime(draft.savedAt)})`, {
            duration: 3000,
          });
        } else {
          console.log('[useStaffAuditDraft] No valid draft found');
        }
      } catch (e) {
        console.warn('[useStaffAuditDraft] Failed to restore draft:', e);
      } finally {
        // Allow autosave after a short delay
        setTimeout(() => {
          isHydratingRef.current = false;
          setIsRestoring(false);
        }, 500);
      }
    };

    restoreDraft();
  }, [user?.id, enabled]); // Intentionally excluding onRestore

  // Create draft data object
  const createDraftData = useCallback((): StaffAuditDraft | null => {
    if (!user?.id || !enabled) return null;
    
    const key = buildStaffAuditDraftKey(
      user.id,
      formData.location_id || undefined,
      formData.employee_id || undefined,
      formData.template_id || undefined
    );

    return {
      key,
      userId: user.id,
      formData: { ...formData },
      savedAt: Date.now(),
      schemaVersion: 1,
    };
  }, [user?.id, formData, enabled]);

  // Async debounced save
  const saveDraft = useCallback(async () => {
    if (isHydratingRef.current || !user?.id || !enabled) {
      console.log('[useStaffAuditDraft] Skipping save - hydrating or disabled');
      return;
    }

    const draft = createDraftData();
    if (!draft) return;

    const dataString = JSON.stringify(formData);
    if (dataString === lastSavedDataRef.current) return;

    try {
      await saveStaffAuditDraft(draft);
      lastSavedDataRef.current = dataString;
      setHasPendingDraft(true);
      console.log('[useStaffAuditDraft] Draft saved:', draft.key);
    } catch (e) {
      console.warn('[useStaffAuditDraft] Failed to save draft:', e);
    }
  }, [user?.id, createDraftData, formData, enabled]);

  // Synchronous save for iOS visibility/pagehide
  const saveDraftSync = useCallback(() => {
    if (isHydratingRef.current || !user?.id || !enabled) return;

    const draft = createDraftData();
    if (!draft) return;

    const dataString = JSON.stringify(formData);
    if (dataString === lastSavedDataRef.current) return;

    try {
      saveStaffAuditDraftSync(draft);
      lastSavedDataRef.current = dataString;
      console.log('[useStaffAuditDraft] Draft saved (sync):', draft.key);
    } catch (e) {
      console.warn('[useStaffAuditDraft] Failed to save draft (sync):', e);
    }
  }, [user?.id, createDraftData, formData, enabled]);

  // Auto-save on data change (debounced 300ms)
  useEffect(() => {
    if (!enabled || isHydratingRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, saveDraft, enabled]);

  // Periodic save every 5 seconds as safety net
  useEffect(() => {
    if (!enabled) return;

    intervalRef.current = setInterval(() => {
      if (!isHydratingRef.current) {
        saveDraft();
      }
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [saveDraft, enabled]);

  // Save on visibility change / pagehide (critical for iOS)
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log('[useStaffAuditDraft] Visibility hidden - saving');
        saveDraftSync();
      }
    };

    const handlePageHide = () => {
      console.log('[useStaffAuditDraft] pagehide - saving');
      saveDraftSync();
    };

    const handleBeforeUnload = () => {
      console.log('[useStaffAuditDraft] beforeunload - saving');
      saveDraftSync();
    };

    const handleFreeze = () => {
      console.log('[useStaffAuditDraft] freeze - saving');
      saveDraftSync();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('freeze', handleFreeze);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('freeze', handleFreeze);
    };
  }, [saveDraftSync, enabled]);

  // Clear draft (call after successful submission)
  const clearDraft = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Clear all drafts for this user
      const allDrafts = await findStaffAuditDraftsForUser(user.id);
      for (const draft of allDrafts) {
        await clearStaffAuditDraft(draft.key);
      }
      
      setHasPendingDraft(false);
      hasRestoredRef.current = false;
      lastSavedDataRef.current = '';
      console.log('[useStaffAuditDraft] All drafts cleared');
    } catch (e) {
      console.warn('[useStaffAuditDraft] Failed to clear drafts:', e);
    }
  }, [user?.id]);

  return {
    currentDraftKey,
    isRestoring,
    hasPendingDraft,
    saveDraft,
    clearDraft,
  };
};
