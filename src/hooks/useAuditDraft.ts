import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  AuditDraft,
  buildDraftKey,
  saveAuditDraft,
  loadAuditDraft,
  clearAuditDraft,
  formatDraftTime,
} from '@/lib/auditDraftStorage';

interface FormData {
  location_id: string;
  auditDate: string;
  timeStart: string;
  timeEnd: string;
  notes: string;
  customData: Record<string, any>;
}

interface UseAuditDraftOptions {
  templateId: string;
  locationId: string;
  formData: FormData;
  currentSectionIndex: number;
  sectionFollowUps?: Record<string, { needed: boolean; notes: string }>;
  onRestore?: (draft: AuditDraft) => void;
  enabled?: boolean;
}

export const useAuditDraft = ({
  templateId,
  locationId,
  formData,
  currentSectionIndex,
  sectionFollowUps = {},
  onRestore,
  enabled = true,
}: UseAuditDraftOptions) => {
  const { user } = useAuth();
  const [draftKey, setDraftKey] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasRestoredRef = useRef(false);
  const lastSavedDataRef = useRef<string>('');

  // Build draft key when identifiers change
  useEffect(() => {
    if (user?.id && locationId && templateId && enabled) {
      const key = buildDraftKey(user.id, locationId, templateId);
      setDraftKey(key);
    } else {
      setDraftKey(null);
    }
  }, [user?.id, locationId, templateId, enabled]);

  // Restore draft on mount (only once per key)
  useEffect(() => {
    if (!draftKey || !user?.id || hasRestoredRef.current) return;

    const restoreDraft = async () => {
      setIsRestoring(true);
      try {
        const draft = await loadAuditDraft(draftKey);
        if (draft && onRestore) {
          // Check if draft is recent (within 7 days)
          const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          if (draft.savedAt > sevenDaysAgo) {
            hasRestoredRef.current = true;
            setHasPendingDraft(true);
            onRestore(draft);
            toast.success(`Draft restored (saved ${formatDraftTime(draft.savedAt)})`, {
              duration: 3000,
            });
          } else {
            // Draft is too old, clear it
            await clearAuditDraft(draftKey);
          }
        }
      } catch (e) {
        console.warn('[useAuditDraft] Failed to restore draft:', e);
      } finally {
        setIsRestoring(false);
      }
    };

    restoreDraft();
  }, [draftKey, user?.id, onRestore]);

  // Debounced save function
  const saveDraft = useCallback(async () => {
    if (!draftKey || !user?.id || !enabled) return;

    const draft: AuditDraft = {
      key: draftKey,
      userId: user.id,
      locationId,
      templateId,
      formData,
      currentSectionIndex,
      sectionFollowUps,
      savedAt: Date.now(),
    };

    // Skip save if data hasn't changed
    const dataString = JSON.stringify({ formData, currentSectionIndex, sectionFollowUps });
    if (dataString === lastSavedDataRef.current) return;

    try {
      await saveAuditDraft(draft);
      lastSavedDataRef.current = dataString;
      setHasPendingDraft(true);
    } catch (e) {
      console.warn('[useAuditDraft] Failed to save draft:', e);
    }
  }, [draftKey, user?.id, locationId, templateId, formData, currentSectionIndex, sectionFollowUps, enabled]);

  // Auto-save on data change (debounced)
  useEffect(() => {
    if (!draftKey || !enabled) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new debounced save
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 500); // 500ms debounce

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, currentSectionIndex, sectionFollowUps, saveDraft, draftKey, enabled]);

  // Save on visibility change (app goes to background)
  useEffect(() => {
    if (!draftKey || !enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveDraft();
      }
    };

    const handleBeforeUnload = () => {
      saveDraft();
    };

    const handlePageHide = () => {
      saveDraft();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [saveDraft, draftKey, enabled]);

  // Clear draft function (call after successful submission)
  const clearDraft = useCallback(async () => {
    if (!draftKey) return;

    try {
      await clearAuditDraft(draftKey);
      setHasPendingDraft(false);
      hasRestoredRef.current = false;
      lastSavedDataRef.current = '';
    } catch (e) {
      console.warn('[useAuditDraft] Failed to clear draft:', e);
    }
  }, [draftKey]);

  // Reset draft state (for template/location change confirmation)
  const resetDraftState = useCallback(() => {
    hasRestoredRef.current = false;
    lastSavedDataRef.current = '';
    setHasPendingDraft(false);
  }, []);

  return {
    draftKey,
    isRestoring,
    hasPendingDraft,
    saveDraft,
    clearDraft,
    resetDraftState,
  };
};
