import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  AuditDraft,
  buildDraftKey,
  saveAuditDraft,
  saveAuditDraftSync,
  loadAuditDraft,
  clearAuditDraft,
  formatDraftTime,
  findDraftsForUser,
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
  const [isRestoring, setIsRestoring] = useState(true); // Start as restoring to prevent overwrites
  const [hasPendingDraft, setHasPendingDraft] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasRestoredRef = useRef(false);
  const lastSavedDataRef = useRef<string>('');
  const isHydratingRef = useRef(true); // Guard against overwriting draft with empty state

  // Build draft key when identifiers change
  const computedDraftKey = useMemo(() => {
    if (!user?.id || !enabled) return null;
    // Use 'none' placeholders for stable key when ids aren't set yet
    const loc = locationId || 'none';
    const tmpl = templateId || 'none';
    return buildDraftKey(user.id, loc, tmpl);
  }, [user?.id, locationId, templateId, enabled]);

  useEffect(() => {
    setDraftKey(computedDraftKey);
  }, [computedDraftKey]);

  // Restore draft on mount - BEFORE any autosave can happen
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
        // First try to find ANY draft for this user (since template/location may not be set yet)
        const allDrafts = await findDraftsForUser(user.id);
        console.log('[useAuditDraft] Found drafts:', allDrafts.length);
        
        // Find the most recent valid draft
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const validDrafts = allDrafts
          .filter(d => d.savedAt > sevenDaysAgo)
          .sort((a, b) => b.savedAt - a.savedAt);
        
        if (validDrafts.length > 0 && onRestore) {
          const draft = validDrafts[0];
          hasRestoredRef.current = true;
          setHasPendingDraft(true);
          console.log('[useAuditDraft] Draft restored:', draft.key);
          onRestore(draft);
          toast.success(`Draft restored (saved ${formatDraftTime(draft.savedAt)})`, {
            duration: 3000,
          });
        } else {
          console.log('[useAuditDraft] No valid draft found');
        }
      } catch (e) {
        console.warn('[useAuditDraft] Failed to restore draft:', e);
      } finally {
        // Allow autosave to proceed after a short delay to let state settle
        setTimeout(() => {
          isHydratingRef.current = false;
          setIsRestoring(false);
        }, 500);
      }
    };

    restoreDraft();
  }, [user?.id, enabled]); // Removed onRestore to avoid re-running

  // Create draft data object
  const createDraftData = useCallback((): AuditDraft | null => {
    if (!user?.id || !enabled) return null;
    
    const key = buildDraftKey(
      user.id, 
      locationId || 'none', 
      templateId || 'none'
    );

    return {
      key,
      userId: user.id,
      locationId: locationId || '',
      templateId: templateId || '',
      formData,
      currentSectionIndex,
      sectionFollowUps,
      savedAt: Date.now(),
    };
  }, [user?.id, locationId, templateId, formData, currentSectionIndex, sectionFollowUps, enabled]);

  // Debounced save function
  const saveDraft = useCallback(async () => {
    // Don't save during hydration or if disabled
    if (isHydratingRef.current || !user?.id || !enabled) {
      console.log('[useAuditDraft] Skipping save - hydrating or disabled');
      return;
    }

    const draft = createDraftData();
    if (!draft) return;

    // Skip save if data hasn't changed
    const dataString = JSON.stringify({ 
      formData, 
      currentSectionIndex, 
      sectionFollowUps,
      templateId,
      locationId 
    });
    if (dataString === lastSavedDataRef.current) return;

    try {
      await saveAuditDraft(draft);
      lastSavedDataRef.current = dataString;
      setHasPendingDraft(true);
      console.log('[useAuditDraft] Draft saved:', draft.key);
    } catch (e) {
      console.warn('[useAuditDraft] Failed to save draft:', e);
    }
  }, [user?.id, createDraftData, formData, currentSectionIndex, sectionFollowUps, templateId, locationId, enabled]);

  // Sync save for visibility/pagehide (critical for iOS)
  const saveDraftSync = useCallback(() => {
    if (isHydratingRef.current || !user?.id || !enabled) return;

    const draft = createDraftData();
    if (!draft) return;

    const dataString = JSON.stringify({ 
      formData, 
      currentSectionIndex, 
      sectionFollowUps,
      templateId,
      locationId 
    });
    if (dataString === lastSavedDataRef.current) return;

    try {
      saveAuditDraftSync(draft);
      lastSavedDataRef.current = dataString;
      console.log('[useAuditDraft] Draft saved (sync):', draft.key);
    } catch (e) {
      console.warn('[useAuditDraft] Failed to save draft (sync):', e);
    }
  }, [user?.id, createDraftData, formData, currentSectionIndex, sectionFollowUps, templateId, locationId, enabled]);

  // Auto-save on data change (debounced)
  useEffect(() => {
    if (!enabled || isHydratingRef.current) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new debounced save (300ms for responsiveness)
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, currentSectionIndex, sectionFollowUps, templateId, locationId, saveDraft, enabled]);

  // Safety net: periodic save every 5 seconds while editing
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
        console.log('[useAuditDraft] Visibility hidden - saving draft sync');
        saveDraftSync();
      }
    };

    const handlePageHide = (e: PageTransitionEvent) => {
      console.log('[useAuditDraft] pagehide event - saving draft sync');
      saveDraftSync();
    };

    const handleBeforeUnload = () => {
      console.log('[useAuditDraft] beforeunload event - saving draft sync');
      saveDraftSync();
    };

    const handleFreeze = () => {
      console.log('[useAuditDraft] freeze event - saving draft sync');
      saveDraftSync();
    };

    // Add all event listeners for maximum coverage on iOS
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);
    // Page Lifecycle API for frozen pages
    document.addEventListener('freeze', handleFreeze);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('freeze', handleFreeze);
    };
  }, [saveDraftSync, enabled]);

  // Clear draft function (call after successful submission)
  const clearDraft = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Clear all possible draft keys for this user
      const allDrafts = await findDraftsForUser(user.id);
      for (const draft of allDrafts) {
        await clearAuditDraft(draft.key);
        console.log('[useAuditDraft] Draft cleared:', draft.key);
      }
      
      // Also clear current computed key
      if (draftKey) {
        await clearAuditDraft(draftKey);
      }
      
      setHasPendingDraft(false);
      hasRestoredRef.current = false;
      lastSavedDataRef.current = '';
    } catch (e) {
      console.warn('[useAuditDraft] Failed to clear draft:', e);
    }
  }, [draftKey, user?.id]);

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
