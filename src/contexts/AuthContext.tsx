import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { logAuthChange, logBootstrap, logDebug } from '@/lib/debug/logger';
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isStaff: boolean | null;
  staffCheckComplete: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Session timeout: 30 minutes of inactivity
const SESSION_TIMEOUT = 30 * 60 * 1000;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);
  const [staffCheckComplete, setStaffCheckComplete] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<number>(Date.now());

  // Reset inactivity timer
  const resetInactivityTimer = () => {
    lastActivityRef.current = Date.now();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (user) {
      timeoutRef.current = setTimeout(() => {
        handleInactivityLogout();
      }, SESSION_TIMEOUT);
    }
  };

  // Handle automatic logout due to inactivity
  const handleInactivityLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Session Expired",
      description: "You have been logged out due to inactivity.",
      variant: "destructive",
    });
    navigate('/auth');
  };

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Set up activity listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    // Start the initial timer
    resetInactivityTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user]);

  // Check if user is a staff member (but NOT a company admin/owner) - runs once when user changes
  useEffect(() => {
    const checkStaffStatus = async () => {
      if (!user) {
        setIsStaff(null);
        setStaffCheckComplete(true);
        return;
      }

      try {
        // IMPORTANT: Never use maybeSingle() for role existence checks.
        // Users can have multiple company_users rows (multi-company) and multiple user_roles.
        // We only need to know whether a qualifying row exists.

        // 1) Company admins/owners should NOT be treated as staff
        const { count: companyAdminCount, error: companyAdminError } = await supabase
          .from('company_users')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('company_role', ['company_owner', 'company_admin']);

        if (companyAdminError) {
          console.error('[AuthContext] Error checking company admin status:', companyAdminError);
        }

        if ((companyAdminCount ?? 0) > 0) {
          setIsStaff(false);
          setStaffCheckComplete(true);
          return;
        }

        // 2) Platform admins/managers should NOT be treated as staff
        const { count: platformAdminCount, error: platformAdminError } = await supabase
          .from('user_roles')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('role', ['admin', 'manager']);

        if (platformAdminError) {
          console.error('[AuthContext] Error checking platform admin/manager role:', platformAdminError);
        }

        if ((platformAdminCount ?? 0) > 0) {
          setIsStaff(false);
          setStaffCheckComplete(true);
          return;
        }

        // 3) Staff users are those who have an employee record (checker can still be staff)
        const { count: employeeCount, error: employeeError } = await supabase
          .from('employees')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (employeeError) {
          console.error('[AuthContext] Error checking employee record:', employeeError);
          setIsStaff(false);
        } else {
          setIsStaff((employeeCount ?? 0) > 0);
        }
      } catch (error) {
        console.error('[AuthContext] Error checking staff status:', error);
        setIsStaff(false);
      } finally {
        setStaffCheckComplete(true);
      }
    };

    setStaffCheckComplete(false);
    checkStaffStatus();
  }, [user]);

  useEffect(() => {
    logBootstrap('start');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logAuthChange(event, !!session, session?.user?.id);
        logDebug('auth', `Auth state changed: ${event}, Has session: ${!!session}`);
        
        // If we have a session but no refresh token, force logout
        if (session && !session.refresh_token) {
          logDebug('auth', 'Invalid session detected - no refresh token');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Keep UI stable on TOKEN_REFRESHED: don't clear cache (clearing causes full-page spinners
        // and feels like a hard refresh). Instead, refetch critical data in the background.
        // STABILITY FIX: Only clear on SIGNED_IN when there was no previous user (fresh login)
        // This prevents the "refresh storm" when token refreshes or user updates
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          logDebug('auth', 'Auth changed, invalidating cached queries (not clearing)');
          // CHANGED: Use invalidate instead of clear to preserve UI stability
          queryClient.invalidateQueries({ queryKey: ['user_role'] });
          queryClient.invalidateQueries({ queryKey: ['company'] });
          queryClient.invalidateQueries({ queryKey: ['company_modules'] });
          queryClient.invalidateQueries({ queryKey: ['permissions'] });
        }

        if (event === 'TOKEN_REFRESHED') {
          logDebug('auth', 'Token refreshed, background invalidation only');
          queryClient.invalidateQueries({ queryKey: ['user_role'] });
          queryClient.invalidateQueries({ queryKey: ['company'] });
          queryClient.invalidateQueries({ queryKey: ['company_modules'] });
          queryClient.invalidateQueries({ queryKey: ['permissions'] });
        }
        
        if (event === 'SIGNED_OUT') {
          logDebug('auth', 'Signed out, clearing all cached queries');
          queryClient.clear();
          setIsStaff(null);
          setStaffCheckComplete(false);
        }
        
        // Clear timer when user logs out
        if (!session && timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }
    );

    // THEN check for existing session with validation
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      logDebug('auth', `Initial session check: ${!!session}, Error: ${error?.message || 'none'}`);
      logBootstrap('auth', { hasSession: !!session, error: error?.message });
      
      if (error) {
        logDebug('auth', 'Session validation error', error);
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Validate session has required tokens
      if (session && !session.refresh_token) {
        logDebug('auth', 'Invalid session - missing refresh token');
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    try {
      // Use scope: 'local' to always clear the local session,
      // even if the server session is already expired (avoids 403 loops)
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      // Always clear local state and redirect, even if server sign out fails
      setSession(null);
      setUser(null);
      
      navigate('/auth');
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isStaff, staffCheckComplete, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
