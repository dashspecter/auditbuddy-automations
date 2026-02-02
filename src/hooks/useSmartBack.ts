import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface SmartBackOptions {
  /** Fallback path if no safe navigation available - for admin pages */
  adminFallback?: string;
  /** Fallback path if no safe navigation available - for staff pages */
  staffFallback?: string;
}

/**
 * Smart back navigation that respects context based on PATHNAME ONLY.
 * - Admin pages (/admin/*) won't navigate to staff/mobile/kiosk routes
 * - Staff pages (/staff/*) won't navigate to admin routes
 * - Context is determined ONLY by route prefix, NOT by viewport/isMobile
 */
export function useSmartBack(options: SmartBackOptions = {}) {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    adminFallback = "/admin/waste/entries",
    staffFallback = "/staff",
  } = options;

  const goBack = useCallback(() => {
    const from = (location.state as { from?: string })?.from;
    const currentPath = location.pathname;
    
    // Context determined ONLY by pathname prefix - NOT by viewport
    const isAdminContext = currentPath.startsWith('/admin/') || 
                           currentPath.startsWith('/reports/') ||
                           currentPath.startsWith('/dashboard') ||
                           currentPath.startsWith('/workforce') ||
                           currentPath.startsWith('/audits') ||
                           currentPath.startsWith('/equipment') ||
                           currentPath.startsWith('/cmms');
    const isStaffContext = currentPath.startsWith('/staff/') || 
                           currentPath.startsWith('/mobile/') ||
                           currentPath.startsWith('/kiosk/');

    // Prefixes that are unsafe for admin navigation
    const staffPrefixes = ['/mobile', '/kiosk', '/staff/'];
    // Prefixes that are unsafe for staff navigation  
    const adminPrefixes = ['/admin/', '/reports/', '/dashboard', '/workforce', '/audits', '/equipment', '/cmms'];

    if (isAdminContext) {
      // Admin context: NEVER navigate to staff/mobile/kiosk
      const isSafeFrom = from && !staffPrefixes.some(prefix => from.startsWith(prefix));
      
      if (isSafeFrom) {
        navigate(from);
      } else if (window.history.length > 2) {
        navigate(-1);
      } else {
        navigate(adminFallback, { replace: true });
      }
      return;
    }

    if (isStaffContext) {
      // Staff context: NEVER navigate to admin/dashboard/reports
      const isSafeFrom = from && !adminPrefixes.some(prefix => from.startsWith(prefix));
      
      if (isSafeFrom) {
        navigate(from);
      } else if (window.history.length > 2) {
        navigate(-1);
      } else {
        navigate(staffFallback, { replace: true });
      }
      return;
    }

    // Generic fallback (neither admin nor staff context)
    if (from) {
      navigate(from);
    } else if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(adminFallback, { replace: true });
    }
  }, [navigate, location.state, location.pathname, adminFallback, staffFallback]);

  return goBack;
}
