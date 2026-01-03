import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AppVisibilityOptions {
  /**
   * Callback when app becomes visible again
   */
  onVisible?: () => void;
  
  /**
   * Callback when app becomes hidden
   */
  onHidden?: () => void;
  
  /**
   * Whether to automatically revalidate critical data on visibility change
   * @default true
   */
  autoRevalidate?: boolean;
  
  /**
   * Query keys to invalidate when app becomes visible
   * @default ['company', 'company_modules', 'user_role']
   */
  criticalQueryKeys?: string[];
}

/**
 * useAppVisibility - Handles browser tab switching and focus management
 * 
 * This hook:
 * 1. Detects when the browser tab becomes visible/hidden
 * 2. Re-validates session token on visibility change
 * 3. Re-fetches critical cached state (company, permissions, modules)
 * 4. Does NOT hard reload the entire app unless session is invalid
 * 
 * Usage:
 * ```tsx
 * useAppVisibility({
 *   onVisible: () => console.log('App visible'),
 *   autoRevalidate: true,
 * });
 * ```
 */
export function useAppVisibility(options: AppVisibilityOptions = {}): void {
  const {
    onVisible,
    onHidden,
    autoRevalidate = true,
    criticalQueryKeys = ['company', 'company_modules', 'user_role', 'permissions'],
  } = options;
  
  const queryClient = useQueryClient();
  const { user, session } = useAuth();
  const lastVisibleRef = useRef<number>(Date.now());
  const isValidatingRef = useRef(false);

  /**
   * Validate the current session
   * Returns true if session is valid, false otherwise
   */
  const validateSession = useCallback(async (): Promise<boolean> => {
    if (!session) return false;
    
    try {
      // Check if token is still valid by getting current session
      const { data, error } = await supabase.auth.getSession();
      
      if (error || !data.session) {
        console.warn('[useAppVisibility] Session invalid or expired');
        return false;
      }
      
      // Check if refresh token exists
      if (!data.session.refresh_token) {
        console.warn('[useAppVisibility] Session missing refresh token');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('[useAppVisibility] Error validating session:', error);
      return false;
    }
  }, [session]);

  /**
   * Revalidate critical data after visibility change
   */
  const revalidateCriticalData = useCallback(async () => {
    if (isValidatingRef.current) return;
    isValidatingRef.current = true;
    
    try {
      // First validate session
      const isValid = await validateSession();
      
      if (!isValid) {
        // Session is invalid - let AuthContext handle logout
        // Don't hard reload, just let the auth flow take over
        console.log('[useAppVisibility] Session invalid, auth flow will handle');
        return;
      }
      
      // Invalidate critical queries to get fresh data
      // Using invalidateQueries instead of refetch to respect staleTime
      await Promise.all(
        criticalQueryKeys.map(key => 
          queryClient.invalidateQueries({ 
            queryKey: [key],
            refetchType: 'active' // Only refetch if query is actively being used
          })
        )
      );
      
      console.log('[useAppVisibility] Critical data revalidated');
    } catch (error) {
      console.error('[useAppVisibility] Error revalidating data:', error);
    } finally {
      isValidatingRef.current = false;
    }
  }, [validateSession, queryClient, criticalQueryKeys]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      
      if (isVisible) {
        const timeSinceLastVisible = Date.now() - lastVisibleRef.current;
        
        // Revalidate when coming back after a short pause (helps with PWAs/backgrounding)
        // Keep this low to avoid users seeing stale/incorrect views after tab switching.
        if (autoRevalidate && user && timeSinceLastVisible > 2000) {
          revalidateCriticalData();
        }
        
        onVisible?.();
      } else {
        lastVisibleRef.current = Date.now();
        onHidden?.();
      }
    };

    // Handle page focus (not just visibility)
    const handleFocus = () => {
      if (autoRevalidate && user) {
        const timeSinceLastVisible = Date.now() - lastVisibleRef.current;
        if (timeSinceLastVisible > 2000) {
          revalidateCriticalData();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, autoRevalidate, revalidateCriticalData, onVisible, onHidden]);
}

/**
 * Hook to detect if the app is currently visible
 */
export function useIsAppVisible(): boolean {
  const visibleRef = useRef(document.visibilityState === 'visible');
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      visibleRef.current = document.visibilityState === 'visible';
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
  
  return visibleRef.current;
}
