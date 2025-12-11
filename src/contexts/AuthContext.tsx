import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

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
        // First check if user is a company admin or owner - they should NOT be treated as staff
        const { data: companyUser } = await supabase
          .from('company_users')
          .select('company_role')
          .eq('user_id', user.id)
          .maybeSingle();

        // Company admins and owners should access the admin dashboard, not staff
        if (companyUser?.company_role === 'company_owner' || companyUser?.company_role === 'company_admin') {
          setIsStaff(false);
          setStaffCheckComplete(true);
          return;
        }

        // Also check platform admin role
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (userRole?.role === 'admin') {
          setIsStaff(false);
          setStaffCheckComplete(true);
          return;
        }

        // Now check if they have an employee record (for actual staff members)
        const { data: employee } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        setIsStaff(!!employee);
      } catch (error) {
        console.error('Error checking staff status:', error);
        setIsStaff(false);
      } finally {
        setStaffCheckComplete(true);
      }
    };

    setStaffCheckComplete(false);
    checkStaffStatus();
  }, [user]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, 'Has session:', !!session);
        
        // If we have a session but no refresh token, force logout
        if (session && !session.refresh_token) {
          console.error('Invalid session detected - no refresh token');
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Invalidate ALL queries on auth state change to ensure fresh data
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          console.log('[AuthContext] Clearing all queries for fresh data');
          queryClient.clear(); // Clear ALL cached queries
          queryClient.invalidateQueries({ queryKey: ['user_role'] });
          queryClient.invalidateQueries({ queryKey: ['company'] });
          queryClient.invalidateQueries({ queryKey: ['company_modules'] });
        }
        
        if (event === 'SIGNED_OUT') {
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
      console.log('Initial session check:', !!session, 'Error:', error);
      
      if (error) {
        console.error('Session validation error:', error);
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }
      
      // Validate session has required tokens
      if (session && !session.refresh_token) {
        console.error('Invalid session - missing refresh token');
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
      // Try to sign out from server
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      // Always clear local state and redirect, even if server sign out fails
      setSession(null);
      setUser(null);
      
      // Clear local storage manually as backup
      localStorage.removeItem('sb-lnscfmmwqxlkeunfhfdh-auth-token');
      
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
