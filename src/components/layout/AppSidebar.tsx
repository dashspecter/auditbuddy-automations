import { 
  Home, Users, MapPin, ClipboardCheck, ListTodo, 
  Wrench, Package, FileText, Lightbulb, Plug, QrCode, 
  CreditCard, Building2, ChevronDown, Bell, BarChart, Activity,
  GraduationCap, UserCog, Bug, Shield,
  PanelLeftClose, PanelLeft, ChevronRight, Store, Bot, Settings2,
  MessageCircleQuestion, Cog, Trash2, History, ShieldCheck, ShieldAlert,
  MessageSquare, Languages, Landmark
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useSidebarContext } from "@/contexts/SidebarContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompany } from "@/hooks/useCompany";
import { usePermissions, CompanyPermission } from "@/hooks/useCompanyPermissions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEffect, useCallback, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DashPanel } from "@/components/dash/DashPanel";
import { useTranslation } from "react-i18next";
import { useCompanyIndustry } from "@/hooks/useCompanyIndustry";
import { useLabels } from "@/hooks/useLabels";
import { useTerminology } from "@/hooks/useTerminology";

// Role-based access configuration
// Manager: workforce (staff, shifts, attendance, sales, performance), audits/templates, equipment, notifications, tests, view reports/insights
// Checker: view/perform audits, access audit templates
// HR: workforce (staff, shifts, attendance, time off, payroll, performance), audits/templates, view reports/insights

/**
 * NAVIGATION MENU ORDER (do not reorder without updating this comment):
 * 1. Home
 * 2. Workforce
 * 3. Audits
 * 4. Tasks
 * 5. Notifications
 * 6. Wastage
 * 7. QR Forms
 * 8. Inventory
 * 9. Documents
 * 10. Locations
 * 11. Equipment
 * 12. CMMS
 * 13. Reports
 * 14. Operations
 * 15. Integrations
 * 16. Template Marketplace
 */
const navigationItems = [
  // 1. Home
  { 
    titleKey: "nav.home", 
    labelKey: null,
    url: "/dashboard", 
    icon: Home,
    module: null,
    description: "Executive overview dashboard with key performance indicators",
  },
  // 2. Workforce
  { 
    titleKey: "nav.workforce", 
    labelKey: "employees",
    url: "/workforce", 
    icon: Users,
    module: "workforce",
    allowedRoles: ['admin', 'manager', 'hr'],
    companyPermission: 'manage_shifts' as CompanyPermission,
    description: "Manage staff, duty rosters, attendance, payroll, and training",
    subItems: [
      { titleKey: "nav.staff", labelKey: "employees", url: "/workforce/staff", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_employees' as CompanyPermission },
      { titleKey: "nav.shifts", labelKey: "shifts", url: "/workforce/shifts", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_shifts' as CompanyPermission },
      { titleKey: "nav.training", url: "/workforce/training", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_employees' as CompanyPermission },
      { titleKey: "nav.warnings", url: "/workforce/warnings", allowedRoles: ['admin', 'manager', 'hr', 'checker'], companyPermission: 'manage_employees' as CompanyPermission },
      { titleKey: "nav.timeOff", url: "/workforce/time-off", allowedRoles: ['admin', 'hr'] },
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
      { 
        titleKey: "nav.payroll", 
        url: "/workforce/payroll", 
        allowedRoles: ['admin', 'hr'],
        nestedItems: [
          { titleKey: "nav.payrollGeneral", url: "/workforce/payroll" },
          { titleKey: "nav.payrollBatches", url: "/workforce/payroll-batches" },
        ]
      },
      { titleKey: "nav.badgeSettings", url: "/workforce/badge-settings", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_employees' as CompanyPermission },
    ]
  },
  // 3. Audits
  { 
    titleKey: "nav.audits", 
    labelKey: "audits",
    url: "/audits", 
    icon: ClipboardCheck,
    module: "location_audits",
    allowedRoles: ['admin', 'manager', 'hr', 'checker'],
    companyPermission: 'manage_audits' as CompanyPermission,
    description: "Schedule and conduct inspections with compliance scoring",
    subItems: [
      { titleKey: "nav.locationAudits", labelKey: "locations", url: "/audits", allowedRoles: ['admin', 'manager', 'hr', 'checker'], companyPermission: 'manage_audits' as CompanyPermission },
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
        titleKey: "nav.employeeTests",
        url: "/test-management",
        allowedRoles: ['admin', 'manager'],
        companyPermission: 'manage_employees' as CompanyPermission,
        nestedItems: [
          { titleKey: "nav.testManagement", url: "/test-management" },
          { titleKey: "nav.createTest", url: "/test-creation" },
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
      { titleKey: "nav.mysteryShopper", url: "/audits/mystery-shopper", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_audits' as CompanyPermission, hideForGovernment: true },
    ]
  },
  // 4. Tasks
  { 
    titleKey: "nav.tasks", 
    labelKey: null,
    url: "/tasks", 
    icon: ListTodo,
    module: null,
    description: "Track operational tasks, assignments, and deadlines",
    subItems: [
      { titleKey: "nav.allTasks", url: "/tasks" },
      { titleKey: "nav.calendar", url: "/tasks/calendar" },
      { titleKey: "nav.evidenceReview", url: "/evidence-review", allowedRoles: ['admin', 'manager'] },
    ]
  },
  // 5. Notifications
  { 
    titleKey: "nav.notifications", 
    labelKey: null,
    url: "/notifications", 
    icon: Bell,
    module: "notifications",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_notifications' as CompanyPermission,
    description: "Send alerts and announcements to your team",
    subItems: [
      { titleKey: "nav.sendNotifications", url: "/notifications" },
      { titleKey: "nav.notificationTemplates", url: "/notification-templates" },
      { titleKey: "nav.recurringNotifications", url: "/recurring-notifications" },
      { titleKey: "nav.analytics", url: "/notification-analytics" },
      { titleKey: "nav.auditLogs", url: "/notification-audit-logs" },
    ]
  },
  // 6. Wastage
  { 
    titleKey: "nav.wastage", 
    labelKey: null,
    url: "/admin/waste/entries", 
    icon: Trash2,
    module: "wastage",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'view_reports' as CompanyPermission,
    description: "Track and report material wastage and losses",
    hideForGovernment: true,
    subItems: [
      { titleKey: "nav.wasteAdd", url: "/admin/waste/add", allowedRoles: ['admin', 'manager'] },
      { titleKey: "nav.wasteEntries", url: "/admin/waste/entries", allowedRoles: ['admin', 'manager'] },
      { titleKey: "nav.wasteReports", url: "/reports/waste", companyPermission: 'view_reports' as CompanyPermission },
      { titleKey: "nav.wasteProducts", url: "/admin/waste/products", allowedRoles: ['admin', 'manager'] },
      { titleKey: "nav.wasteReasons", url: "/admin/waste/reasons", allowedRoles: ['admin', 'manager'] },
    ]
  },
  // 7. QR Forms
  { 
    titleKey: "nav.qrForms", 
    labelKey: null,
    url: "/admin/qr-forms/templates", 
    icon: QrCode,
    module: "qr_forms",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_audits' as CompanyPermission,
    description: "Create QR-linked forms for quick field data collection",
    subItems: [
      { titleKey: "nav.formTemplates", url: "/admin/qr-forms/templates", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_audits' as CompanyPermission },
      { titleKey: "nav.formAssignments", url: "/admin/qr-forms/assignments", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_audits' as CompanyPermission },
      { titleKey: "nav.formRecords", url: "/admin/qr-forms/records", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_audits' as CompanyPermission },
    ]
  },
  // 8. Inventory
  { 
    titleKey: "nav.inventory", 
    labelKey: null,
    url: "/inventory", 
    icon: Package,
    module: "inventory",
    description: "Track stock levels, orders, and inventory movements",
  },
  // 9. Documents
  { 
    titleKey: "nav.documents", 
    labelKey: null,
    url: "/documents", 
    icon: FileText,
    module: "documents",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'view_reports' as CompanyPermission,
    description: "Centralized document storage with version control",
    subItems: [
      { titleKey: "nav.allDocuments", url: "/documents" },
    ]
  },
  // 10. Locations
  { 
    titleKey: "nav.locations", 
    labelKey: "locations",
    url: "/admin/locations", 
    icon: MapPin,
    module: null,
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_locations' as CompanyPermission,
    description: "Manage your sites, branches, and departments",
    subItems: [
      { titleKey: "nav.locationsGeneral", url: "/admin/locations" },
      { titleKey: "nav.sales", url: "/admin/locations/sales", allowedRoles: ['admin', 'manager'], hideForGovernment: true },
    ]
  },
  // 11. Equipment
  { 
    titleKey: "nav.equipment", 
    labelKey: "equipment",
    url: "/equipment", 
    icon: Wrench,
    module: "equipment_management",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_audits' as CompanyPermission,
    description: "Manage assets, maintenance schedules, and QR tracking",
    subItems: [
      { titleKey: "nav.allEquipment", url: "/equipment" },
      { titleKey: "nav.maintenanceCalendar", url: "/maintenance-calendar" },
      { titleKey: "nav.recurringMaintenance", url: "/recurring-maintenance-schedules" },
      { titleKey: "nav.bulkQRCodes", url: "/equipment/bulk-qr" },
    ]
  },
  // 12. CMMS
  { 
    titleKey: "nav.cmms", 
    labelKey: null,
    url: "/cmms", 
    icon: Cog,
    module: "cmms",
    allowedRoles: ['admin', 'manager'],
    description: "Computerized maintenance management for asset upkeep",
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
  // 13. Reports
  { 
    titleKey: "nav.reports", 
    labelKey: null,
    url: "/reports", 
    icon: BarChart,
    module: "reports",
    allowedRoles: ['admin', 'manager', 'hr'],
    companyPermission: 'view_reports' as CompanyPermission,
    description: "Performance analytics, compliance trends, and insights",
    subItems: [
      { titleKey: "nav.locationPerformance", url: "/reports?tab=location", companyPermission: 'view_reports' as CompanyPermission },
      { titleKey: "nav.complianceDossier", url: "/compliance-dossier", allowedRoles: ['admin', 'manager'], companyPermission: 'view_reports' as CompanyPermission },
      { titleKey: "nav.employeePerformance", url: "/reports?tab=employee", companyPermission: 'view_reports' as CompanyPermission },
      { titleKey: "nav.employeeDossier", url: "/employee-dossier", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'view_reports' as CompanyPermission },
      { titleKey: "nav.vouchers", url: "/audits/vouchers", companyPermission: 'view_reports' as CompanyPermission },
      { titleKey: "nav.overview", url: "/insights", companyPermission: 'view_reports' as CompanyPermission },
      { titleKey: "nav.aiFeed", url: "/ai-feed", companyPermission: 'view_reports' as CompanyPermission },
      { titleKey: "nav.schedulingInsights", url: "/workforce/scheduling-insights", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'view_reports' as CompanyPermission },
    ]
  },
  // 14. Operations
  { 
    titleKey: "nav.operations", 
    labelKey: null,
    url: "/operations/daily", 
    icon: Settings2,
    module: "operations",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_audits' as CompanyPermission,
    description: "Daily operational workflows and SLA management",
    subItems: [
      { titleKey: "nav.dailyOps", url: "/operations/daily" },
      { titleKey: "nav.maintenanceTasks", url: "/operations/maintenance" },
      { titleKey: "nav.slaManagement", url: "/operations/slas" },
      { titleKey: "nav.scouts", url: "/scouts", module: "scouts" },
    ]
  },
  // 14b. Corrective Actions (CAPA)
  {
    titleKey: "nav.correctiveActions",
    labelKey: null,
    url: "/corrective-actions",
    icon: ShieldAlert,
    module: "corrective_actions",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_audits' as CompanyPermission,
    description: "Track and resolve non-conformances from inspections",
    subItems: [
      { titleKey: "nav.allCAs", url: "/corrective-actions", allowedRoles: ['admin', 'manager'] },
      { titleKey: "nav.caRules", url: "/corrective-actions/rules", allowedRoles: ['admin'] },
    ]
  },
  // 15. Integrations
  {
    titleKey: "nav.integrations", 
    labelKey: null,
    url: "/integrations", 
    icon: Plug,
    module: "integrations",
    allowedRoles: ['admin'],
    description: "Connect third-party services and APIs",
  },
  // 15b. WhatsApp Messaging
  {
    titleKey: "nav.whatsapp",
    labelKey: null,
    url: "/whatsapp-templates",
    icon: MessageSquare,
    module: "whatsapp_messaging",
    allowedRoles: ['admin', 'manager'],
    description: "Automated WhatsApp messaging, templates, and broadcasts",
    subItems: [
      { titleKey: "nav.whatsappTemplates", url: "/whatsapp-templates" },
      { titleKey: "nav.whatsappRules", url: "/whatsapp-rules" },
      { titleKey: "nav.whatsappBroadcast", url: "/whatsapp-broadcast" },
      { titleKey: "nav.whatsappLogs", url: "/whatsapp-logs" },
    ],
  },
  // 16. Template Marketplace
  { 
    titleKey: "nav.templateMarketplace", 
    labelKey: null,
    url: "/marketplace", 
    icon: Store,
    module: null,
    allowedRoles: ['admin', 'manager', 'hr', 'checker'],
    description: "Browse and install ready-made audit templates",
    hideForGovernment: true,
  },
  // 17. Approvals (Government Operations)
  {
    titleKey: "nav.approvals",
    labelKey: null,
    url: "/approvals",
    icon: Landmark,
    module: "government_ops",
    allowedRoles: ['admin', 'manager'],
    description: "Multi-step approval workflows for institutional governance",
    subItems: [
      { titleKey: "nav.approvalQueue", url: "/approvals" },
      { titleKey: "nav.approvalWorkflows", url: "/settings/approval-workflows", allowedRoles: ['admin'] },
    ],
  },
];

const settingsItems = [
  { 
    titleKey: "nav.activityLog", 
    url: "/activity-log", 
    icon: History,
    requiresOwnerOrAdmin: true,
    description: "View a log of all user actions and system events",
  },
  { 
    titleKey: "nav.roleTemplates", 
    url: "/role-templates", 
    icon: ShieldCheck,
    requiresOwnerOrAdmin: true,
    description: "Define reusable permission sets for team members",
  },
  { 
    titleKey: "nav.policyRules", 
    url: "/policy-rules", 
    icon: ShieldAlert,
    requiresOwnerOrAdmin: true,
    description: "Automated rules and governance policies",
  },
  { 
    titleKey: "nav.billingModules", 
    url: "/pricing", 
    icon: CreditCard,
    requiresPlatformAdmin: true,
    description: "Manage subscription plans and active modules",
  },
  { 
    titleKey: "nav.companySettings", 
    labelKey: "company",
    url: "/settings/company", 
    icon: Building2,
    requiresOwnerOrAdmin: true,
    description: "Manage institution profile, departments, and configuration",
  },
  { 
    titleKey: "nav.userManagement", 
    url: "/admin/users", 
    icon: UserCog,
    requiresPlatformAdmin: true,
    description: "Manage platform user accounts and access",
  },
  { 
    titleKey: "nav.platformAdmin", 
    url: "/admin/platform", 
    icon: Shield,
    requiresPlatformAdmin: true,
    description: "Platform-wide administration panel",
  },
  { 
    titleKey: "nav.systemHealth", 
    url: "/system-health", 
    icon: Activity,
    requiresPlatformAdmin: true,
    description: "Monitor system performance and uptime",
  },
  { 
    titleKey: "nav.debugData", 
    url: "/debug/system-health", 
    icon: Bug,
    requiresPlatformAdmin: true,
    description: "Debug tools for platform diagnostics",
  },
  { 
    titleKey: "nav.aiAgents", 
    url: "/admin/agents", 
    icon: Bot,
    requiresPlatformAdmin: true,
    description: "Configure AI automation agents",
  },
  {
    titleKey: "nav.terminology",
    url: "/settings/terminology",
    icon: Languages,
    requiresOwnerOrAdmin: true,
    description: "Customize platform labels to match your institution's language",
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
  const { data: industry } = useCompanyIndustry();
  const { label } = useLabels();
  const term = useTerminology();
  const employeeLabel = term.employee();
  const employeesLabel = term.employees();
  const locationLabel = term.location();
  const locationsLabel = term.locations();
  const auditLabel = term.audit();
  const auditsLabel = term.audits();
  
  const isGovernment = industry?.slug === "government";
  
  const currentPath = location.pathname;
  
  // Helper to navigate with state.from for proper back navigation
  const navigateWithFrom = useCallback((url: string) => {
    navigate(url, { state: { from: currentPath } });
  }, [navigate, currentPath]);
  const isOwner = company?.userRole === 'company_owner';
  const isCompanyAdmin = company?.userRole === 'company_admin';
  const isMember = company?.userRole === 'company_member';

  const dynamicTitleMap = useMemo<Record<string, string>>(() => ({
    "nav.employeeAudits": `${employeesLabel} ${auditsLabel}`,
    "nav.newStaffAudit": `New ${employeeLabel} ${auditLabel}`,
    "nav.newPerformanceReview": `New ${employeeLabel} Performance Review`,
    "nav.employeeTests": `${employeesLabel} Tests`,
    "nav.createTest": `Create ${employeeLabel} Test`,
    "nav.auditTemplates": `${auditLabel} Templates`,
    "nav.locationAudits": locationsLabel,
    "nav.templates": `${auditLabel} Templates`,
    "nav.templateLibrary": `${auditLabel} Template Library`,
    "nav.locationsGeneral": `${locationsLabel}`,
    "nav.employeePerformance": `${employeeLabel} Performance`,
    "nav.locationPerformance": `${locationLabel} Performance`,
  }), [auditLabel, auditsLabel, employeeLabel, employeesLabel, locationLabel, locationsLabel]);

  // Resolve a nav item label: use dynamic terminology map first,
  // then explicit label overrides, then i18n fallback
  const resolveLabel = useCallback((item: { titleKey: string; labelKey?: string | null }) => {
    const dynamicTitle = dynamicTitleMap[item.titleKey];
    if (dynamicTitle) return dynamicTitle;

    if (item.labelKey) {
      const override = label(item.labelKey, "");
      if (override) return override;
    }

    return t(item.titleKey);
  }, [dynamicTitleMap, label, t]);

  const isActive = (path: string) => currentPath === path;
  const isParentActive = (item: any) => {
    if (item.subItems) {
      return item.subItems.some((sub: any) => currentPath === sub.url || currentPath.startsWith(sub.url + '/'));
    }
    return false;
  };

  // Filter nav items for government — hide items and sub-items marked hideForGovernment
  const filteredNavigationItems = useMemo(() => {
    return navigationItems
      .filter(item => !(isGovernment && (item as any).hideForGovernment))
      .map(item => {
        if (!item.subItems) return item;
        return {
          ...item,
          subItems: item.subItems.filter((sub: any) => !(isGovernment && sub.hideForGovernment)),
        };
      });
  }, [isGovernment]);

  // Auto-expand parent groups when navigating to a child route
  useEffect(() => {
    filteredNavigationItems.forEach((item) => {
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

    // For company members, check BOTH allowedRoles AND company permissions
    if (isMember) {
      if (item.allowedRoles && item.allowedRoles.length > 0) {
        if (!hasAllowedRole(item.allowedRoles)) return false;
      }
      if (item.companyPermission) {
        return hasPermission(item.companyPermission);
      }
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

    // For company members, check BOTH allowedRoles AND company permissions
    if (isMember) {
      if (subItem.allowedRoles && subItem.allowedRoles.length > 0) {
        if (!hasAllowedRole(subItem.allowedRoles)) return false;
      }
      if (subItem.companyPermission) {
        return hasPermission(subItem.companyPermission);
      }
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
              {filteredNavigationItems.filter(shouldShowItem).map((item) => (
                <div key={item.titleKey}>
                  {item.subItems && !isCollapsed ? (
                    <Collapsible
                      open={expandedGroups[item.titleKey] ?? false}
                      onOpenChange={() => toggleGroup(item.titleKey)}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
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
                            <span className="flex-1 text-left">{resolveLabel(item)}</span>
                            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ease-out opacity-60 ${expandedGroups[item.titleKey] ? 'rotate-180' : ''}`} />
                          </CollapsibleTrigger>
                        </TooltipTrigger>
                        {(item as any).description && (
                          <TooltipContent side="right" className="bg-popover text-popover-foreground border max-w-[220px]">
                            <p className="text-xs">{(item as any).description}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                      <CollapsibleContent className="mt-1 ml-[22px] pl-4 border-l border-sidebar-border/60 space-y-0.5 overflow-hidden">
                        {item.subItems.filter(shouldShowSubItem).map((subItem: any) => (
                          subItem.nestedItems ? (
                            <Collapsible key={subItem.url}>
                              <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-lg transition-all duration-200 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted group">
                                <span>{resolveLabel(subItem)}</span>
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
                                    {resolveLabel(nestedItem)}
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
                                {resolveLabel(subItem)}
                              </button>
                            ) : (
                              <NavLink
                                key={subItem.url}
                                to={subItem.url}
                                className="block px-3 py-2 text-[13px] rounded-lg transition-all duration-200 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted"
                                activeClassName="text-primary font-medium bg-primary/10"
                              >
                                {resolveLabel(subItem)}
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
                        <div className="font-medium text-sm mb-1 px-2 text-foreground">{resolveLabel(item)}</div>
                        {(item as any).description && (
                          <p className="text-xs text-muted-foreground px-2 mb-2">{(item as any).description}</p>
                        )}
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
                                {resolveLabel(subItem)}
                              </button>
                            ) : (
                              <NavLink
                                key={subItem.url}
                                to={subItem.url}
                                className="block px-2 py-1.5 text-[13px] rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted"
                                activeClassName="text-primary font-medium bg-primary/10"
                              >
                                {resolveLabel(subItem)}
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
                          {!isCollapsed && <span>{resolveLabel(item)}</span>}
                        </NavLink>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="bg-popover text-popover-foreground border max-w-[220px]">
                        <p className="font-medium text-xs">{resolveLabel(item)}</p>
                        {(item as any).description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{(item as any).description}</p>
                        )}
                      </TooltipContent>
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
                        {!isCollapsed && <span>{resolveLabel(item)}</span>}
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-popover text-popover-foreground border max-w-[220px]">
                      <p className="font-medium text-xs">{resolveLabel(item)}</p>
                      {(item as any).description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{(item as any).description}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </nav>
            </div>
          )}
        </div>

        {/* Dash Command Center at bottom */}
        <div className="px-3 py-3 border-t border-sidebar-border/40">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DashPanel
                  trigger={
                    <button
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-out bg-primary/10 text-primary hover:bg-primary/20 group ${isCollapsed ? 'justify-center' : ''}`}
                    >
                      <div className="p-1.5 rounded-lg bg-primary/20 group-hover:bg-primary/30 transition-colors duration-200">
                        <Bot className="h-4 w-4 flex-shrink-0" />
                      </div>
                      {!isCollapsed && <span>Dash</span>}
                    </button>
                  }
                />
              </div>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right" className="bg-popover text-popover-foreground border">
                Dash Command Center
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
