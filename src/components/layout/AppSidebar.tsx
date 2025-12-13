import { 
  Home, Users, MapPin, ClipboardCheck, ListTodo, 
  Wrench, Package, FileText, Lightbulb, Plug, 
  CreditCard, Building2, ChevronDown, Bell, BarChart, Activity,
  GraduationCap, Image, UserCog, Bug, Shield, Calendar,
  PanelLeftClose, PanelLeft, ChevronRight, Store, Bot, Settings2, AlertTriangle
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useSidebarContext } from "@/contexts/SidebarContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompany } from "@/hooks/useCompany";
import { usePermissions, CompanyPermission } from "@/hooks/useCompanyPermissions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEffect } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Role-based access configuration
// Manager: workforce (staff, shifts, attendance, sales, performance), audits/templates, equipment, notifications, tests, view reports/insights
// Checker: view/perform audits, access audit templates
// HR: workforce (staff, shifts, attendance, time off, payroll, performance), audits/templates, view reports/insights

const navigationItems = [
  { 
    title: "Home", 
    url: "/dashboard", 
    icon: Home,
    module: null
  },
  { 
    title: "Workforce", 
    url: "/workforce", 
    icon: Users,
    module: "workforce",
    allowedRoles: ['admin', 'manager', 'hr'],
    companyPermission: 'manage_shifts' as CompanyPermission, // Members need manage_shifts
    subItems: [
      { title: "Overview", url: "/workforce" },
      { title: "Staff", url: "/workforce/staff", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_employees' as CompanyPermission },
      { title: "Shifts", url: "/workforce/shifts", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_shifts' as CompanyPermission },
      { title: "Attendance", url: "/workforce/attendance", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_shifts' as CompanyPermission },
      { title: "Time Off", url: "/workforce/time-off", allowedRoles: ['admin', 'hr'] },
      { title: "Payroll", url: "/workforce/payroll", allowedRoles: ['admin', 'hr'] },
      { title: "Sales", url: "/workforce/sales", allowedRoles: ['admin', 'manager'] },
      { title: "Performance", url: "/workforce/performance", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'view_reports' as CompanyPermission },
      { title: "Payroll Batches", url: "/workforce/payroll-batches", allowedRoles: ['admin', 'hr'] },
      { title: "Attendance Alerts", url: "/workforce/attendance-alerts", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_shifts' as CompanyPermission },
      { title: "Scheduling Insights", url: "/workforce/scheduling-insights", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'view_reports' as CompanyPermission },
    ]
  },
  { 
    title: "Locations", 
    url: "/admin/locations", 
    icon: MapPin,
    module: null,
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_locations' as CompanyPermission
  },
  { 
    title: "Audits", 
    url: "/audits", 
    icon: ClipboardCheck,
    module: "location_audits",
    allowedRoles: ['admin', 'manager', 'hr', 'checker'],
    companyPermission: 'manage_audits' as CompanyPermission,
    subItems: [
      { title: "Perform Audit", url: "/audits" },
      { title: "Template Library", url: "/audits/templates", allowedRoles: ['admin', 'manager', 'hr', 'checker'], companyPermission: 'manage_audits' as CompanyPermission },
      { title: "Audit Calendar", url: "/audits-calendar" },
      { title: "Schedules", url: "/recurring-schedules", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_audits' as CompanyPermission },
      { title: "Employee Audits", url: "/staff-audits", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_audits' as CompanyPermission },
      { title: "New Staff Audit", url: "/staff-audit/new", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_audits' as CompanyPermission },
      { title: "Manual Metrics", url: "/manual-metrics", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_audits' as CompanyPermission },
      { title: "Photo Gallery", url: "/photos" },
    ]
  },
  { 
    title: "Tasks", 
    url: "/tasks", 
    icon: ListTodo,
    module: null,
    subItems: [
      { title: "All Tasks", url: "/tasks" },
      { title: "Calendar", url: "/tasks/calendar" },
    ]
  },
  { 
    title: "Equipment", 
    url: "/equipment", 
    icon: Wrench,
    module: "equipment_management",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_audits' as CompanyPermission, // Members with manage_audits can access equipment
    subItems: [
      { title: "All Equipment", url: "/equipment" },
      { title: "Maintenance Calendar", url: "/maintenance-calendar" },
      { title: "Recurring Maintenance", url: "/recurring-maintenance" },
      { title: "Bulk QR Codes", url: "/equipment/bulk-qr" },
    ]
  },
  { 
    title: "Notifications", 
    url: "/notifications", 
    icon: Bell,
    module: "notifications",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_notifications' as CompanyPermission,
    subItems: [
      { title: "Send Notifications", url: "/notifications" },
      { title: "Templates", url: "/notification-templates" },
      { title: "Recurring", url: "/recurring-notifications" },
      { title: "Analytics", url: "/notification-analytics" },
      { title: "Audit Logs", url: "/notification-audit-logs" },
    ]
  },
  { 
    title: "Reports", 
    url: "/reports", 
    icon: BarChart,
    module: "reports",
    allowedRoles: ['admin', 'manager', 'hr'],
    companyPermission: 'view_reports' as CompanyPermission,
    subItems: [
      { title: "Location Performance", url: "/reports", companyPermission: 'view_reports' as CompanyPermission },
      { title: "Employee Performance", url: "/staff-audits", companyPermission: 'view_reports' as CompanyPermission },
    ]
  },
  { 
    title: "Inventory", 
    url: "/inventory", 
    icon: Package,
    module: "inventory"
  },
  { 
    title: "Documents", 
    url: "/documents", 
    icon: FileText,
    module: "documents",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'view_reports' as CompanyPermission, // Members with view_reports can access documents
    subItems: [
      { title: "All Documents", url: "/documents" },
    ]
  },
  { 
    title: "Tests", 
    url: "/test-management", 
    icon: GraduationCap,
    module: null,
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_employees' as CompanyPermission, // Members with manage_employees can manage tests
    subItems: [
      { title: "Test Management", url: "/test-management" },
      { title: "Create Test", url: "/test-creation" },
    ]
  },
  { 
    title: "Insights", 
    url: "/insights", 
    icon: Lightbulb,
    module: "insights",
    allowedRoles: ['admin', 'manager', 'hr'],
    companyPermission: 'view_reports' as CompanyPermission,
    subItems: [
      { title: "Overview", url: "/insights", companyPermission: 'view_reports' as CompanyPermission },
      { title: "AI Feed", url: "/ai-feed", companyPermission: 'view_reports' as CompanyPermission },
    ]
  },
  { 
    title: "Integrations", 
    url: "/integrations", 
    icon: Plug,
    module: "integrations",
    allowedRoles: ['admin']
  },
  { 
    title: "Template Marketplace", 
    url: "/marketplace", 
    icon: Store,
    module: null,
    allowedRoles: ['admin', 'manager', 'hr', 'checker']
  },
  { 
    title: "Operations", 
    url: "/operations/daily", 
    icon: Settings2,
    module: null,
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_audits' as CompanyPermission, // Members with manage_audits can access operations
    subItems: [
      { title: "Daily Ops", url: "/operations/daily" },
      { title: "Maintenance Tasks", url: "/operations/maintenance" },
      { title: "SLA Management", url: "/operations/slas" },
    ]
  },
];
const settingsItems = [
  { 
    title: "Billing & Modules", 
    url: "/pricing", 
    icon: CreditCard,
    requiresOwner: true
  },
  { 
    title: "Company Settings", 
    url: "/settings/company", 
    icon: Building2,
    requiresOwnerOrAdmin: true
  },
  { 
    title: "User Management", 
    url: "/admin/users", 
    icon: UserCog,
    requiresOwner: true  // Only company owners can access user management
  },
  { 
    title: "Platform Admin", 
    url: "/admin/platform", 
    icon: Shield,
    requiresPlatformAdmin: true  // NEW: Only platform admins (user_roles.role = 'admin')
  },
  { 
    title: "System Health", 
    url: "/system-health", 
    icon: Activity,
    requiresPlatformAdmin: true  // NEW: Only platform admins
  },
  { 
    title: "Debug Data", 
    url: "/debug/system-health", 
    icon: Bug,
    requiresPlatformAdmin: true  // NEW: Only platform admins
  },
  { 
    title: "AI Agents", 
    url: "/admin/agents", 
    icon: Bot,
    requiresPlatformAdmin: true  // NEW: Only platform admins
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { hasModule, canAccessModule } = useCompanyContext();
  const { expandedGroups, toggleGroup, expandGroup, isCollapsed, toggleCollapsed } = useSidebarContext();
  const { data: roleData } = useUserRole();
  const { data: company } = useCompany();
  const { hasPermission } = usePermissions();
  
  const currentPath = location.pathname;
  const isOwner = company?.userRole === 'company_owner';
  const isCompanyAdmin = company?.userRole === 'company_admin';
  const isMember = company?.userRole === 'company_member';

  const isActive = (path: string) => currentPath === path;
  const isParentActive = (item: any) => {
    if (item.subItems) {
      return item.subItems.some((sub: any) => currentPath === sub.url || currentPath.startsWith(sub.url + '/'));
    }
    return false;
  };

  // Auto-expand parent groups when navigating to a child route
  useEffect(() => {
    navigationItems.forEach((item) => {
      if (item.subItems && isParentActive(item)) {
        expandGroup(item.title);
      }
    });
  }, [currentPath, expandGroup]);

  const hasAllowedRole = (allowedRoles?: string[]) => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    // If roleData is still loading, show items to prevent flickering
    if (!roleData) return true;
    // Company owners and admins always have access to everything
    if (isOwner || roleData.isAdmin) return true;
    if (roleData.isManager && allowedRoles.includes('manager')) return true;
    if (roleData.isChecker && allowedRoles.includes('checker')) return true;
    if (roleData.isHR && allowedRoles.includes('hr')) return true;
    return false;
  };

  const shouldShowItem = (item: any) => {
    // Check module access (includes tier check)
    if (item.module && !canAccessModule(item.module)) {
      return false;
    }

    // Check requiresPlatformAdmin - ONLY users with 'admin' role in user_roles table
    // This is for Platform Admin, System Health, Debug Data, AI Agents
    if (item.requiresPlatformAdmin) {
      // Must have platform admin role - NOT company admin
      const hasPlatformAdminRole = roleData?.roles?.includes('admin') === true;
      return hasPlatformAdminRole;
    }

    // Legacy check for requiresAdmin (same as requiresPlatformAdmin for backward compatibility)
    if (item.requiresAdmin) {
      const hasPlatformAdminRole = roleData?.roles?.includes('admin') === true;
      return hasPlatformAdminRole;
    }

    // Check legacy requiresOwner - MUST be company owner
    if (item.requiresOwner) {
      return isOwner === true;
    }

    // Check requiresOwnerOrAdmin - MUST be company owner OR company admin
    if (item.requiresOwnerOrAdmin) {
      return isOwner === true || isCompanyAdmin === true;
    }

    // Company owners and admins always have access to other items
    if (isOwner || isCompanyAdmin) {
      return true;
    }

    // For company members, ONLY check company permissions (not platform roles)
    if (isMember) {
      // If item requires a company permission, check if user has it
      if (item.companyPermission) {
        return hasPermission(item.companyPermission);
      }
      // No permission requirement means accessible
      return true;
    }

    // For platform users (manager, checker, hr, admin), check role requirements
    if (item.allowedRoles && item.allowedRoles.length > 0) {
      return hasAllowedRole(item.allowedRoles);
    }

    // If no allowedRoles restriction, allow access
    return true;
  };

  const shouldShowSubItem = (subItem: any) => {
    // Company owners and admins always have access
    if (isOwner || isCompanyAdmin) {
      return true;
    }

    // For company members, check company permissions
    if (isMember) {
      if (subItem.companyPermission) {
        return hasPermission(subItem.companyPermission);
      }
      // No permission requirement means accessible
      return true;
    }

    // For platform users, check allowed roles
    if (subItem.allowedRoles && !hasAllowedRole(subItem.allowedRoles)) {
      return false;
    }
    return true;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={`${isCollapsed ? 'w-[68px]' : 'w-72'} h-screen bg-sidebar flex flex-col sticky top-0 border-r border-sidebar-border/50 shadow-[1px_0_0_0_rgba(0,0,0,0.02)] transition-all duration-300`}>
        {/* Header with collapse toggle */}
        <div className={`p-4 pb-3 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="relative flex-shrink-0">
              <img 
                src="/dashspect-logo-512.png" 
                alt="Dashspect" 
                className="h-9 w-9 rounded-xl shadow-sm"
              />
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-sidebar" />
            </div>
            {!isCollapsed && (
              <span className="text-lg font-bold tracking-tight text-sidebar-foreground">Dashspect</span>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={toggleCollapsed}
              className="p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-muted transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="px-3 pb-2">
            <button
              onClick={toggleCollapsed}
              className="w-full p-2 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-muted transition-colors flex items-center justify-center"
              title="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
          {/* Main Navigation */}
          <div className="mb-4">
            {!isCollapsed && (
              <div className="px-3 py-2 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-[0.15em]">
                Navigation
              </div>
            )}
            <nav className="space-y-0.5">
              {navigationItems.filter(shouldShowItem).map((item) => (
                <div key={item.title}>
                  {item.subItems && !isCollapsed ? (
                    <Collapsible
                      open={expandedGroups[item.title] ?? false}
                      onOpenChange={() => toggleGroup(item.title)}
                    >
                      <CollapsibleTrigger className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                        transition-all duration-200 ease-out group
                        ${isParentActive(item) 
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-primary/20' 
                          : 'text-sidebar-foreground/80 hover:bg-sidebar-muted hover:text-sidebar-foreground'}
                      `}>
                        <div className={`p-1.5 rounded-lg transition-colors duration-200 ${
                          isParentActive(item) 
                            ? 'bg-white/20' 
                            : 'bg-sidebar-muted group-hover:bg-sidebar-border'
                        }`}>
                          <item.icon className="h-4 w-4 flex-shrink-0" />
                        </div>
                        <span className="flex-1 text-left">{item.title}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ease-out opacity-60 ${expandedGroups[item.title] ? 'rotate-180' : ''}`} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-1 ml-[22px] pl-4 border-l border-sidebar-border/60 space-y-0.5 overflow-hidden">
                        {item.subItems.filter(shouldShowSubItem).map((subItem: any) => (
                          <NavLink
                            key={subItem.url}
                            to={subItem.url}
                            className="block px-3 py-2 text-[13px] rounded-lg transition-all duration-200 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted"
                            activeClassName="text-primary font-medium bg-primary/10"
                          >
                            {subItem.title}
                          </NavLink>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : isCollapsed && item.subItems ? (
                    // Collapsed state with sub-items - show popover
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          className={`w-full flex items-center justify-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-out text-sidebar-foreground/80 hover:bg-sidebar-muted hover:text-sidebar-foreground group ${
                            isParentActive(item) ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-primary/20' : ''
                          }`}
                        >
                          <div className={`p-1.5 rounded-lg transition-colors duration-200 ${
                            isParentActive(item) ? 'bg-white/20' : 'bg-sidebar-muted group-hover:bg-sidebar-border'
                          }`}>
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="right" align="start" className="w-48 p-2 bg-popover border shadow-lg">
                        <div className="font-medium text-sm mb-2 px-2 text-foreground">{item.title}</div>
                        <div className="space-y-0.5">
                          {item.subItems.filter(shouldShowSubItem).map((subItem: any) => (
                            <NavLink
                              key={subItem.url}
                              to={subItem.url}
                              className="block px-2 py-1.5 text-[13px] rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted"
                              activeClassName="text-primary font-medium bg-primary/10"
                            >
                              {subItem.title}
                            </NavLink>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    // Regular item or expanded state without sub-items
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/dashboard"}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-out text-sidebar-foreground/80 hover:bg-sidebar-muted hover:text-sidebar-foreground group ${isCollapsed ? 'justify-center' : ''}`}
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-primary/20 [&>div]:bg-white/20 [&>div]:text-white"
                        >
                          <div className={`p-1.5 rounded-lg transition-colors duration-200 bg-sidebar-muted group-hover:bg-sidebar-border ${isActive(item.url) ? 'bg-white/20' : ''}`}>
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                          </div>
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right" className="bg-popover text-popover-foreground border">
                          {item.title}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* Settings Section with divider */}
          {settingsItems.some(shouldShowItem) && (
            <div className="pt-3 border-t border-sidebar-border/40">
              {!isCollapsed && (
                <div className="px-3 py-2 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-[0.15em]">
                  Settings
                </div>
              )}
              <nav className="space-y-0.5">
                {settingsItems.filter(shouldShowItem).map((item) => (
                  <Tooltip key={item.title}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.url}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ease-out text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground group ${isCollapsed ? 'justify-center' : ''}`}
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-primary/20"
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {!isCollapsed && <span>{item.title}</span>}
                      </NavLink>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right" className="bg-popover text-popover-foreground border">
                        {item.title}
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </nav>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
