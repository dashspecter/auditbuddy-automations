import { 
  Home, Users, MapPin, ClipboardCheck, ListTodo, 
  Wrench, Package, FileText, Lightbulb, Plug, QrCode, 
  CreditCard, Building2, ChevronDown, Bell, BarChart, Activity,
  GraduationCap, UserCog, Bug, Shield,
  PanelLeftClose, PanelLeft, ChevronRight, Store, Bot, Settings2,
  MessageCircleQuestion, Cog, Trash2, History, ShieldCheck, ShieldAlert
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useSidebarContext } from "@/contexts/SidebarContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompany } from "@/hooks/useCompany";
import { usePermissions, CompanyPermission } from "@/hooks/useCompanyPermissions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEffect, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AIGuideChat } from "@/components/AIGuideChat";
import { useTranslation } from "react-i18next";

// Role-based access configuration
// Manager: workforce (staff, shifts, attendance, sales, performance), audits/templates, equipment, notifications, tests, view reports/insights
// Checker: view/perform audits, access audit templates
// HR: workforce (staff, shifts, attendance, time off, payroll, performance), audits/templates, view reports/insights

/**
 * NAVIGATION MENU ORDER (do not reorder without updating this comment):
 * 1. Home
 * 2. Workforce
 * 3. Locations (with Auto Clock-Out & Shift Presets sub-items)
 * 4. Audits
 * 5. Tasks
 * 6. Equipment
 * 7. CMMS
 * 8. Notifications
 * 9. Reports
 * 10. Inventory
 * 11. Documents
 * 12. Tests
 * 13. Insights
 * 14. Integrations
 * 15. Template Marketplace
 * 16. Operations
 */
const navigationItems = [
  { 
    titleKey: "nav.home", 
    url: "/dashboard", 
    icon: Home,
    module: null
  },
  { 
    titleKey: "nav.workforce", 
    url: "/workforce", 
    icon: Users,
    module: "workforce",
    allowedRoles: ['admin', 'manager', 'hr'],
    companyPermission: 'manage_shifts' as CompanyPermission,
    subItems: [
      { titleKey: "nav.staff", url: "/workforce/staff", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_employees' as CompanyPermission },
      { titleKey: "nav.shifts", url: "/workforce/shifts", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_shifts' as CompanyPermission },
      { titleKey: "nav.training", url: "/workforce/training", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_employees' as CompanyPermission },
      { 
        titleKey: "nav.attendance", 
        url: "/workforce/attendance", 
        allowedRoles: ['admin', 'manager', 'hr'], 
        companyPermission: 'manage_shifts' as CompanyPermission,
        nestedItems: [
          { titleKey: "nav.attendanceGeneral", url: "/workforce/attendance" },
          { titleKey: "nav.attendanceAlerts", url: "/workforce/attendance-alerts" },
        ]
      },
      { titleKey: "nav.warnings", url: "/workforce/warnings", allowedRoles: ['admin', 'manager', 'hr', 'checker'], companyPermission: 'manage_employees' as CompanyPermission },
      { titleKey: "nav.timeOff", url: "/workforce/time-off", allowedRoles: ['admin', 'hr'] },
      { 
        titleKey: "nav.payroll", 
        url: "/workforce/payroll", 
        allowedRoles: ['admin', 'hr'],
        nestedItems: [
          { titleKey: "nav.payrollGeneral", url: "/workforce/payroll" },
          { titleKey: "nav.payrollBatches", url: "/workforce/payroll-batches" },
        ]
      },
    ]
  },
  { 
    titleKey: "nav.locations", 
    url: "/admin/locations", 
    icon: MapPin,
    module: null,
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_locations' as CompanyPermission,
    subItems: [
      { titleKey: "nav.locationsGeneral", url: "/admin/locations" },
      { titleKey: "nav.sales", url: "/admin/locations/sales", allowedRoles: ['admin', 'manager'] },
    ]
  },
  { 
    titleKey: "nav.audits", 
    url: "/audits", 
    icon: ClipboardCheck,
    module: "location_audits",
    allowedRoles: ['admin', 'manager', 'hr', 'checker'],
    companyPermission: 'manage_audits' as CompanyPermission,
    subItems: [
      { titleKey: "nav.locationAudits", url: "/audits", allowedRoles: ['admin', 'manager', 'hr', 'checker'], companyPermission: 'manage_audits' as CompanyPermission },
      { 
        titleKey: "nav.employeeAudits", 
        url: "/staff-audits/all", 
        allowedRoles: ['admin', 'manager', 'hr'], 
        companyPermission: 'manage_audits' as CompanyPermission,
        nestedItems: [
          { titleKey: "nav.newStaffAudit", url: "/staff-audits/new" },
          { titleKey: "nav.newPerformanceReview", url: "/staff-audits?review=new" },
        ]
      },
      { 
        titleKey: "nav.calendar",
        url: "/audits-calendar",
        allowedRoles: ['admin', 'manager', 'hr', 'checker'],
        companyPermission: 'manage_audits' as CompanyPermission,
        nestedItems: [
          { titleKey: "nav.scheduled", url: "/audits-calendar" },
          { titleKey: "nav.recurring", url: "/recurring-schedules" },
        ]
      },
      { 
        titleKey: "nav.auditTemplates",
        url: "/admin/templates",
        allowedRoles: ['admin', 'manager', 'hr', 'checker'],
        companyPermission: 'manage_audits' as CompanyPermission,
        nestedItems: [
          { titleKey: "nav.manage", url: "/admin/templates" },
          { titleKey: "nav.library", url: "/admin/template-library" },
        ]
      },
      { titleKey: "nav.mysteryShopper", url: "/audits/mystery-shopper", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_audits' as CompanyPermission },
      { titleKey: "nav.photoGallery", url: "/photos", allowedRoles: ['admin', 'manager', 'hr', 'checker'], companyPermission: 'manage_audits' as CompanyPermission },
      { 
        titleKey: "nav.tests",
        url: "/test-management",
        allowedRoles: ['admin', 'manager'],
        companyPermission: 'manage_employees' as CompanyPermission,
        nestedItems: [
          { titleKey: "nav.testManagement", url: "/test-management" },
          { titleKey: "nav.createTest", url: "/test-creation" },
        ]
      },
    ]
  },
  { 
    titleKey: "nav.tasks", 
    url: "/tasks", 
    icon: ListTodo,
    module: null,
    subItems: [
      { titleKey: "nav.allTasks", url: "/tasks" },
      { titleKey: "nav.calendar", url: "/tasks/calendar" },
    ]
  },
  { 
    titleKey: "nav.equipment", 
    url: "/equipment", 
    icon: Wrench,
    module: "equipment_management",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_audits' as CompanyPermission,
    subItems: [
      { titleKey: "nav.allEquipment", url: "/equipment" },
      { titleKey: "nav.maintenanceCalendar", url: "/maintenance-calendar" },
      { titleKey: "nav.recurringMaintenance", url: "/recurring-maintenance-schedules" },
      { titleKey: "nav.bulkQRCodes", url: "/equipment/bulk-qr" },
    ]
  },
  { 
    titleKey: "nav.cmms", 
    url: "/cmms", 
    icon: Cog,
    module: null,
    allowedRoles: ['admin', 'manager'],
    subItems: [
      { titleKey: "nav.overview", url: "/cmms/overview" },
      { titleKey: "nav.dashboard", url: "/cmms" },
      { titleKey: "nav.assets", url: "/cmms/assets" },
      { titleKey: "nav.workOrders", url: "/cmms/work-orders" },
      { titleKey: "nav.pmSchedules", url: "/cmms/pm-schedules" },
      { titleKey: "nav.partsInventory", url: "/cmms/parts" },
      { titleKey: "nav.procedures", url: "/cmms/procedures" },
      { titleKey: "nav.vendors", url: "/cmms/vendors" },
      { titleKey: "nav.teams", url: "/cmms/teams" },
      { titleKey: "nav.purchaseOrders", url: "/cmms/purchase-orders" },
      { titleKey: "nav.reports", url: "/cmms/reports" },
    ]
  },
  { 
    titleKey: "nav.notifications", 
    url: "/notifications", 
    icon: Bell,
    module: "notifications",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_notifications' as CompanyPermission,
    subItems: [
      { titleKey: "nav.sendNotifications", url: "/notifications" },
      { titleKey: "nav.notificationTemplates", url: "/notification-templates" },
      { titleKey: "nav.recurringNotifications", url: "/recurring-notifications" },
      { titleKey: "nav.analytics", url: "/notification-analytics" },
      { titleKey: "nav.auditLogs", url: "/notification-audit-logs" },
    ]
  },
  { 
    titleKey: "nav.reports", 
    url: "/reports", 
    icon: BarChart,
    module: "reports",
    allowedRoles: ['admin', 'manager', 'hr'],
    companyPermission: 'view_reports' as CompanyPermission,
    subItems: [
      { titleKey: "nav.locationPerformance", url: "/reports?tab=location", companyPermission: 'view_reports' as CompanyPermission },
      { titleKey: "nav.employeePerformance", url: "/reports?tab=employee", companyPermission: 'view_reports' as CompanyPermission },
      { titleKey: "nav.vouchers", url: "/audits/vouchers", companyPermission: 'view_reports' as CompanyPermission },
      { titleKey: "nav.overview", url: "/insights", companyPermission: 'view_reports' as CompanyPermission },
      { titleKey: "nav.aiFeed", url: "/ai-feed", companyPermission: 'view_reports' as CompanyPermission },
      { titleKey: "nav.schedulingInsights", url: "/workforce/scheduling-insights", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'view_reports' as CompanyPermission },
    ]
  },
  { 
    titleKey: "nav.wastage", 
    url: "/admin/waste/entries", 
    icon: Trash2,
    module: "wastage",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'view_reports' as CompanyPermission,
    subItems: [
      { titleKey: "nav.wasteAdd", url: "/admin/waste/add", allowedRoles: ['admin', 'manager'] },
      { titleKey: "nav.wasteEntries", url: "/admin/waste/entries", allowedRoles: ['admin', 'manager'] },
      { titleKey: "nav.wasteReports", url: "/reports/waste", companyPermission: 'view_reports' as CompanyPermission },
      { titleKey: "nav.wasteProducts", url: "/admin/waste/products", allowedRoles: ['admin', 'manager'] },
      { titleKey: "nav.wasteReasons", url: "/admin/waste/reasons", allowedRoles: ['admin', 'manager'] },
    ]
  },
  { 
    titleKey: "nav.inventory", 
    url: "/inventory", 
    icon: Package,
    module: "inventory"
  },
  { 
    titleKey: "nav.documents", 
    url: "/documents", 
    icon: FileText,
    module: "documents",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'view_reports' as CompanyPermission,
    subItems: [
      { titleKey: "nav.allDocuments", url: "/documents" },
    ]
  },
  {
    titleKey: "nav.integrations", 
    url: "/integrations", 
    icon: Plug,
    module: "integrations",
    allowedRoles: ['admin']
  },
  { 
    titleKey: "nav.qrForms", 
    url: "/admin/qr-forms/templates", 
    icon: QrCode,
    module: "qr_forms",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_audits' as CompanyPermission,
    subItems: [
      { titleKey: "nav.formTemplates", url: "/admin/qr-forms/templates", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_audits' as CompanyPermission },
      { titleKey: "nav.formAssignments", url: "/admin/qr-forms/assignments", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_audits' as CompanyPermission },
      { titleKey: "nav.formRecords", url: "/admin/qr-forms/records", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_audits' as CompanyPermission },
    ]
  },
  { 
    titleKey: "nav.templateMarketplace", 
    url: "/marketplace", 
    icon: Store,
    module: null,
    allowedRoles: ['admin', 'manager', 'hr', 'checker']
  },
  { 
    titleKey: "nav.operations", 
    url: "/operations/daily", 
    icon: Settings2,
    module: null,
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_audits' as CompanyPermission,
    subItems: [
      { titleKey: "nav.dailyOps", url: "/operations/daily" },
      { titleKey: "nav.maintenanceTasks", url: "/operations/maintenance" },
      { titleKey: "nav.slaManagement", url: "/operations/slas" },
    ]
  },
];

const settingsItems = [
  { 
    titleKey: "nav.activityLog", 
    url: "/activity-log", 
    icon: History,
    requiresOwnerOrAdmin: true
  },
  { 
    titleKey: "nav.roleTemplates", 
    url: "/role-templates", 
    icon: ShieldCheck,
    requiresOwnerOrAdmin: true
  },
  { 
    titleKey: "nav.policyRules", 
    url: "/policy-rules", 
    icon: ShieldAlert,
    requiresOwnerOrAdmin: true
  },
  { 
    titleKey: "nav.billingModules", 
    url: "/pricing", 
    icon: CreditCard,
    requiresOwner: true
  },
  { 
    titleKey: "nav.companySettings", 
    url: "/settings/company", 
    icon: Building2,
    requiresOwnerOrAdmin: true
  },
  { 
    titleKey: "nav.userManagement", 
    url: "/admin/users", 
    icon: UserCog,
    requiresOwner: true
  },
  { 
    titleKey: "nav.platformAdmin", 
    url: "/admin/platform", 
    icon: Shield,
    requiresPlatformAdmin: true
  },
  { 
    titleKey: "nav.systemHealth", 
    url: "/system-health", 
    icon: Activity,
    requiresPlatformAdmin: true
  },
  { 
    titleKey: "nav.debugData", 
    url: "/debug/system-health", 
    icon: Bug,
    requiresPlatformAdmin: true
  },
  { 
    titleKey: "nav.aiAgents", 
    url: "/admin/agents", 
    icon: Bot,
    requiresPlatformAdmin: true
  },
];

export function AppSidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { hasModule, canAccessModule } = useCompanyContext();
  const { expandedGroups, toggleGroup, expandGroup, isCollapsed, toggleCollapsed } = useSidebarContext();
  const { data: roleData } = useUserRole();
  const { data: company } = useCompany();
  const { hasPermission } = usePermissions();
  
  const currentPath = location.pathname;
  
  // Helper to navigate with state.from for proper back navigation
  const navigateWithFrom = useCallback((url: string) => {
    navigate(url, { state: { from: currentPath } });
  }, [navigate, currentPath]);
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
        expandGroup(item.titleKey);
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

    // Company owners, company admins, and platform admins always have access to other items
    if (isOwner || isCompanyAdmin || roleData?.isAdmin) {
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
    // Check module access for sub-items that have a module requirement
    if (subItem.module && !canAccessModule(subItem.module)) {
      return false;
    }

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
                {t('nav.navigation')}
              </div>
            )}
            <nav className="space-y-0.5">
              {navigationItems.filter(shouldShowItem).map((item) => (
                <div key={item.titleKey}>
                  {item.subItems && !isCollapsed ? (
                    <Collapsible
                      open={expandedGroups[item.titleKey] ?? false}
                      onOpenChange={() => toggleGroup(item.titleKey)}
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
                        <span className="flex-1 text-left">{t(item.titleKey)}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ease-out opacity-60 ${expandedGroups[item.titleKey] ? 'rotate-180' : ''}`} />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-1 ml-[22px] pl-4 border-l border-sidebar-border/60 space-y-0.5 overflow-hidden">
                        {item.subItems.filter(shouldShowSubItem).map((subItem: any) => (
                          subItem.nestedItems ? (
                            <Collapsible key={subItem.url}>
                              <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-lg transition-all duration-200 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted group">
                                <span>{t(subItem.titleKey)}</span>
                                <ChevronRight className="h-3 w-3 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="ml-3 pl-3 border-l border-sidebar-border/40 space-y-0.5 mt-1">
                                <NavLink
                                  to={subItem.url}
                                  className="block px-3 py-1.5 text-[12px] rounded-lg transition-all duration-200 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-muted"
                                  activeClassName="text-primary font-medium bg-primary/10"
                                >
                                  {t('common.view')} {t('common.all')}
                                </NavLink>
                                {subItem.nestedItems.map((nestedItem: any) => (
                                  <NavLink
                                    key={nestedItem.url}
                                    to={nestedItem.url}
                                    className="block px-3 py-1.5 text-[12px] rounded-lg transition-all duration-200 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-muted"
                                    activeClassName="text-primary font-medium bg-primary/10"
                                  >
                                    {t(nestedItem.titleKey)}
                                  </NavLink>
                                ))}
                              </CollapsibleContent>
                            </Collapsible>
                          ) : (
                            // For wastage sub-items, use onClick to pass state.from for proper back navigation
                            subItem.url.startsWith('/admin/waste') || subItem.url.startsWith('/reports/waste') ? (
                              <button
                                key={subItem.url}
                                onClick={() => navigateWithFrom(subItem.url)}
                                className={`block w-full text-left px-3 py-2 text-[13px] rounded-lg transition-all duration-200 ${
                                  currentPath === subItem.url || currentPath.startsWith(subItem.url + '/')
                                    ? 'text-primary font-medium bg-primary/10'
                                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted'
                                }`}
                              >
                                {t(subItem.titleKey)}
                              </button>
                            ) : (
                              <NavLink
                                key={subItem.url}
                                to={subItem.url}
                                className="block px-3 py-2 text-[13px] rounded-lg transition-all duration-200 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted"
                                activeClassName="text-primary font-medium bg-primary/10"
                              >
                                {t(subItem.titleKey)}
                              </NavLink>
                            )
                          )
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
                        <div className="font-medium text-sm mb-2 px-2 text-foreground">{t(item.titleKey)}</div>
                        <div className="space-y-0.5">
                          {item.subItems.filter(shouldShowSubItem).map((subItem: any) => (
                            // For wastage sub-items, use onClick to pass state.from for proper back navigation
                            subItem.url.startsWith('/admin/waste') || subItem.url.startsWith('/reports/waste') ? (
                              <button
                                key={subItem.url}
                                onClick={() => navigateWithFrom(subItem.url)}
                                className={`block w-full text-left px-2 py-1.5 text-[13px] rounded-lg transition-all duration-200 ${
                                  currentPath === subItem.url || currentPath.startsWith(subItem.url + '/')
                                    ? 'text-primary font-medium bg-primary/10'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                              >
                                {t(subItem.titleKey)}
                              </button>
                            ) : (
                              <NavLink
                                key={subItem.url}
                                to={subItem.url}
                                className="block px-2 py-1.5 text-[13px] rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted"
                                activeClassName="text-primary font-medium bg-primary/10"
                              >
                                {t(subItem.titleKey)}
                              </NavLink>
                            )
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
                          {!isCollapsed && <span>{t(item.titleKey)}</span>}
                        </NavLink>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right" className="bg-popover text-popover-foreground border">
                          {t(item.titleKey)}
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
                  {t('nav.settingsSection')}
                </div>
              )}
              <nav className="space-y-0.5">
                {settingsItems.filter(shouldShowItem).map((item) => (
                  <Tooltip key={item.titleKey}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.url}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ease-out text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground group ${isCollapsed ? 'justify-center' : ''}`}
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-primary/20"
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {!isCollapsed && <span>{t(item.titleKey)}</span>}
                      </NavLink>
                    </TooltipTrigger>
                    {isCollapsed && (
                      <TooltipContent side="right" className="bg-popover text-popover-foreground border">
                        {t(item.titleKey)}
                      </TooltipContent>
                    )}
                  </Tooltip>
                ))}
              </nav>
            </div>
          )}
        </div>

        {/* AI Guide at bottom */}
        <div className="px-3 py-3 border-t border-sidebar-border/40">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <AIGuideChat
                  trigger={
                    <button
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-out bg-primary/10 text-primary hover:bg-primary/20 group ${isCollapsed ? 'justify-center' : ''}`}
                    >
                      <div className="p-1.5 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors duration-200">
                        <MessageCircleQuestion className="h-4 w-4 flex-shrink-0" />
                      </div>
                      {!isCollapsed && <span>{t('nav.aiGuide')}</span>}
                    </button>
                  }
                />
              </div>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" className="bg-popover text-popover-foreground border">
                {t('nav.aiGuide')}
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
