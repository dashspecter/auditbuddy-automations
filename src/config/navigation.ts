/**
 * Unified Navigation Registry
 * 
 * SINGLE SOURCE OF TRUTH for all navigation items in Dashspect.
 * This file consolidates navigation configuration to prevent:
 * - Desktop/mobile drift
 * - Missing menu items due to scattered definitions
 * - Inconsistent permission/module checks
 * 
 * IMPORTANT: Do not reorder items without updating NAVIGATION_ORDER comment.
 * IMPORTANT: Do not add/remove items without updating both desktop and mobile renderers.
 */

import {
  Home, Users, MapPin, ClipboardCheck, ListTodo,
  Wrench, Package, FileText, Lightbulb, Plug,
  CreditCard, Building2, Bell, BarChart, Activity,
  GraduationCap, UserCog, Bug, Shield, Store, Bot, Settings2,
  Cog, Trash2, History, ShieldCheck, ShieldAlert, QrCode, LucideIcon,
  MessageSquare, UserSearch, Download
} from "lucide-react";

import type { CompanyPermission } from "@/hooks/useCompanyPermissions";

// ============================================
// Type Definitions
// ============================================

export type PlatformRole = 'admin' | 'manager' | 'checker' | 'hr';

export interface NavigationSubItem {
  id: string;
  titleKey: string;
  url: string;
  /** Platform roles that can access this item (empty = all) */
  allowedRoles?: PlatformRole[];
  /** Company permission required */
  companyPermission?: CompanyPermission;
  /** Module required for this sub-item */
  module?: string;
  /** Nested items (third level) */
  nestedItems?: Array<{
    titleKey: string;
    url: string;
  }>;
}

export interface NavigationItem {
  id: string;
  titleKey: string;
  url: string;
  icon: LucideIcon;
  /** Module required for this item to be visible */
  module: string | null;
  /** Platform roles that can access this item (empty = all) */
  allowedRoles?: PlatformRole[];
  /** Company permission required */
  companyPermission?: CompanyPermission;
  /** Sub-navigation items */
  subItems?: NavigationSubItem[];
  /** Whether this is a settings item (rendered in settings section) */
  isSettings?: boolean;
  /** Requires company owner role */
  requiresOwner?: boolean;
  /** Requires company owner or admin */
  requiresOwnerOrAdmin?: boolean;
  /** Requires platform admin (user_roles.role = 'admin') */
  requiresPlatformAdmin?: boolean;
}

// ============================================
// Navigation Order Reference
// ============================================

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
 * 10. Wastage
 * 11. Inventory
 * 12. Documents
 * 13. Tests
 * 14. Insights
 * 15. Integrations
 * 16. Template Marketplace
 * 17. Operations
 * 
 * SETTINGS SECTION:
 * 1. Billing & Modules
 * 2. Company Settings
 * 3. User Management
 * 4. Platform Admin
 * 5. System Health
 * 6. Debug Data
 * 7. AI Agents
 */

// ============================================
// Main Navigation Items
// ============================================

export const navigationItems: NavigationItem[] = [
  {
    id: 'home',
    titleKey: "nav.home",
    url: "/dashboard",
    icon: Home,
    module: null
  },
  {
    id: 'workforce',
    titleKey: "nav.workforce",
    url: "/workforce",
    icon: Users,
    module: "workforce",
    allowedRoles: ['admin', 'manager', 'hr'],
    companyPermission: 'manage_shifts',
    subItems: [
      { id: 'workforce-staff', titleKey: "nav.staff", url: "/workforce/staff", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_employees' },
      { id: 'workforce-shifts', titleKey: "nav.shifts", url: "/workforce/shifts", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_shifts' },
      { id: 'workforce-training', titleKey: "nav.training", url: "/workforce/training", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_employees' },
      { 
        id: 'workforce-attendance', 
        titleKey: "nav.attendance", 
        url: "/workforce/attendance", 
        allowedRoles: ['admin', 'manager', 'hr'], 
        companyPermission: 'manage_shifts',
        nestedItems: [
          { titleKey: "nav.attendanceGeneral", url: "/workforce/attendance" },
          { titleKey: "nav.attendanceAlerts", url: "/workforce/attendance-alerts" },
        ]
      },
      { id: 'workforce-warnings', titleKey: "nav.warnings", url: "/workforce/warnings", allowedRoles: ['admin', 'manager', 'hr', 'checker'], companyPermission: 'manage_employees' },
      { id: 'workforce-timeoff', titleKey: "nav.timeOff", url: "/workforce/time-off", allowedRoles: ['admin', 'hr'] },
      { 
        id: 'workforce-payroll', 
        titleKey: "nav.payroll", 
        url: "/workforce/payroll", 
        allowedRoles: ['admin', 'hr'],
        nestedItems: [
          { titleKey: "nav.payrollGeneral", url: "/workforce/payroll" },
          { titleKey: "nav.payrollBatches", url: "/workforce/payroll-batches" },
        ]
      },
      { id: 'workforce-badge-settings', titleKey: "nav.badgeSettings", url: "/workforce/badge-settings", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_employees' },
    ]
  },
  {
    id: 'locations',
    titleKey: "nav.locations",
    url: "/admin/locations",
    icon: MapPin,
    module: null,
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_locations',
    subItems: [
      { id: 'locations-general', titleKey: "nav.locationsGeneral", url: "/admin/locations" },
      { id: 'locations-sales', titleKey: "nav.sales", url: "/admin/locations/sales", allowedRoles: ['admin', 'manager'] },
    ]
  },
  {
    id: 'audits',
    titleKey: "nav.audits",
    url: "/audits",
    icon: ClipboardCheck,
    module: "location_audits",
    allowedRoles: ['admin', 'manager', 'hr', 'checker'],
    companyPermission: 'manage_audits',
    subItems: [
      { id: 'audits-location', titleKey: "nav.locationAudits", url: "/audits", allowedRoles: ['admin', 'manager', 'hr', 'checker'], companyPermission: 'manage_audits' },
      {
        id: 'audits-employee',
        titleKey: "nav.employeeAudits",
        url: "/staff-audits/all",
        allowedRoles: ['admin', 'manager', 'hr'],
        companyPermission: 'manage_audits',
        nestedItems: [
          { titleKey: "nav.newStaffAudit", url: "/staff-audits/new" },
          { titleKey: "nav.newPerformanceReview", url: "/staff-audits?review=new" },
        ]
      },
      { 
        id: 'audits-calendar',
        titleKey: "nav.calendar",
        url: "/audits-calendar",
        allowedRoles: ['admin', 'manager', 'hr', 'checker'],
        companyPermission: 'manage_audits',
        nestedItems: [
          { titleKey: "nav.scheduled", url: "/audits-calendar" },
          { titleKey: "nav.recurring", url: "/recurring-schedules" },
        ]
      },
      { id: 'audits-templates', titleKey: "nav.templates", url: "/audits/templates", allowedRoles: ['admin', 'manager', 'hr', 'checker'], companyPermission: 'manage_audits' },
      { id: 'audits-library', titleKey: "nav.templateLibrary", url: "/admin/template-library", allowedRoles: ['admin', 'manager', 'hr', 'checker'], companyPermission: 'manage_audits' },
      { id: 'audits-mystery', titleKey: "nav.mysteryShopper", url: "/audits/mystery-shopper", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_audits' },
      { id: 'audits-photos', titleKey: "nav.photoGallery", url: "/photos", allowedRoles: ['admin', 'manager', 'hr', 'checker'], companyPermission: 'manage_audits' },
      { id: 'audits-tests-management', titleKey: "nav.testManagement", url: "/test-management", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_employees' },
      { id: 'audits-tests-create', titleKey: "nav.createTest", url: "/test-creation", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_employees' },
    ]
  },
  {
    id: 'tasks',
    titleKey: "nav.tasks",
    url: "/tasks",
    icon: ListTodo,
    module: null,
    subItems: [
      { id: 'tasks-all', titleKey: "nav.allTasks", url: "/tasks" },
      { id: 'tasks-calendar', titleKey: "nav.calendar", url: "/tasks/calendar" },
    ]
  },
  {
    id: 'equipment',
    titleKey: "nav.equipment",
    url: "/equipment",
    icon: Wrench,
    module: "equipment_management",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_audits',
    subItems: [
      { id: 'equipment-all', titleKey: "nav.allEquipment", url: "/equipment" },
      { id: 'equipment-calendar', titleKey: "nav.maintenanceCalendar", url: "/maintenance-calendar" },
      { id: 'equipment-recurring', titleKey: "nav.recurringMaintenance", url: "/recurring-maintenance-schedules" },
      { id: 'equipment-qr', titleKey: "nav.bulkQRCodes", url: "/equipment/bulk-qr" },
    ]
  },
  {
    id: 'cmms',
    titleKey: "nav.cmms",
    url: "/cmms",
    icon: Cog,
    module: "cmms",
    allowedRoles: ['admin', 'manager'],
    subItems: [
      { id: 'cmms-overview', titleKey: "nav.overview", url: "/cmms/overview" },
      { id: 'cmms-dashboard', titleKey: "nav.dashboard", url: "/cmms" },
      { id: 'cmms-assets', titleKey: "nav.assets", url: "/cmms/assets" },
      { id: 'cmms-workorders', titleKey: "nav.workOrders", url: "/cmms/work-orders" },
      { id: 'cmms-pm', titleKey: "nav.pmSchedules", url: "/cmms/pm-schedules" },
      { id: 'cmms-parts', titleKey: "nav.partsInventory", url: "/cmms/parts" },
      { id: 'cmms-procedures', titleKey: "nav.procedures", url: "/cmms/procedures" },
      { id: 'cmms-vendors', titleKey: "nav.vendors", url: "/cmms/vendors" },
      { id: 'cmms-teams', titleKey: "nav.teams", url: "/cmms/teams" },
      { id: 'cmms-po', titleKey: "nav.purchaseOrders", url: "/cmms/purchase-orders" },
      { id: 'cmms-reports', titleKey: "nav.reports", url: "/cmms/reports" },
    ]
  },
  {
    id: 'notifications',
    titleKey: "nav.notifications",
    url: "/notifications",
    icon: Bell,
    module: "notifications",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_notifications',
    subItems: [
      { id: 'notifications-send', titleKey: "nav.sendNotifications", url: "/notifications" },
      { id: 'notifications-templates', titleKey: "nav.notificationTemplates", url: "/notification-templates" },
      { id: 'notifications-recurring', titleKey: "nav.recurringNotifications", url: "/recurring-notifications" },
      { id: 'notifications-analytics', titleKey: "nav.analytics", url: "/notification-analytics" },
      { id: 'notifications-logs', titleKey: "nav.auditLogs", url: "/notification-audit-logs" },
    ]
  },
  {
    id: 'reports',
    titleKey: "nav.reports",
    url: "/reports",
    icon: BarChart,
    module: "reports",
    allowedRoles: ['admin', 'manager', 'hr'],
    companyPermission: 'view_reports',
    subItems: [
      { id: 'reports-location', titleKey: "nav.locationPerformance", url: "/reports?tab=location", companyPermission: 'view_reports' },
      { id: 'reports-employee', titleKey: "nav.employeePerformance", url: "/reports?tab=employee", companyPermission: 'view_reports' },
      { id: 'reports-vouchers', titleKey: "nav.vouchers", url: "/audits/vouchers", companyPermission: 'view_reports' },
      { id: 'reports-insights-overview', titleKey: "nav.overview", url: "/insights", companyPermission: 'view_reports' },
      { id: 'reports-insights-ai', titleKey: "nav.aiFeed", url: "/ai-feed", companyPermission: 'view_reports' },
      { id: 'reports-scheduling', titleKey: "nav.schedulingInsights", url: "/workforce/scheduling-insights", companyPermission: 'view_reports' },
    ]
  },
  {
    id: 'wastage',
    titleKey: "nav.wastage",
    url: "/admin/waste/entries",
    icon: Trash2,
    module: "wastage",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'view_reports',
    subItems: [
      { id: 'waste-add', titleKey: "nav.wasteAdd", url: "/admin/waste/add", allowedRoles: ['admin', 'manager'] },
      { id: 'waste-entries', titleKey: "nav.wasteEntries", url: "/admin/waste/entries", allowedRoles: ['admin', 'manager'] },
      { id: 'waste-reports', titleKey: "nav.wasteReports", url: "/reports/waste", companyPermission: 'view_reports' },
      { id: 'waste-products', titleKey: "nav.wasteProducts", url: "/admin/waste/products", allowedRoles: ['admin', 'manager'] },
      { id: 'waste-reasons', titleKey: "nav.wasteReasons", url: "/admin/waste/reasons", allowedRoles: ['admin', 'manager'] },
    ]
  },
  {
    id: 'inventory',
    titleKey: "nav.inventory",
    url: "/inventory",
    icon: Package,
    module: "inventory"
  },
  {
    id: 'documents',
    titleKey: "nav.documents",
    url: "/documents",
    icon: FileText,
    module: "documents",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'view_reports',
    subItems: [
      { id: 'documents-all', titleKey: "nav.allDocuments", url: "/documents" },
    ]
  },
  {
    id: 'integrations',
    titleKey: "nav.integrations",
    url: "/integrations",
    icon: Plug,
    module: "integrations",
    allowedRoles: ['admin']
  },
  {
    id: 'whatsapp',
    titleKey: "nav.whatsapp",
    url: "/whatsapp-templates",
    icon: MessageSquare,
    module: "whatsapp_messaging",
    allowedRoles: ['admin', 'manager'],
    subItems: [
      { id: 'whatsapp-templates', titleKey: "nav.whatsappTemplates", url: "/whatsapp-templates" },
      { id: 'whatsapp-rules', titleKey: "nav.whatsappRules", url: "/whatsapp-rules" },
      { id: 'whatsapp-broadcast', titleKey: "nav.whatsappBroadcast", url: "/whatsapp-broadcast" },
      { id: 'whatsapp-logs', titleKey: "nav.whatsappLogs", url: "/whatsapp-logs" },
    ],
  },
  {
    id: 'qr-forms',
    titleKey: "nav.qrForms",
    url: "/admin/qr-forms/templates",
    icon: QrCode,
    module: "qr_forms",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_audits',
    subItems: [
      { id: 'qr-forms-templates', titleKey: "nav.formTemplates", url: "/admin/qr-forms/templates", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_audits' },
      { id: 'qr-forms-assignments', titleKey: "nav.formAssignments", url: "/admin/qr-forms/assignments", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_audits' },
      { id: 'qr-forms-records', titleKey: "nav.formRecords", url: "/admin/qr-forms/records", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_audits' },
    ]
  },
  {
    id: 'marketplace',
    titleKey: "nav.templateMarketplace",
    url: "/marketplace",
    icon: Store,
    module: null,
    allowedRoles: ['admin', 'manager', 'hr', 'checker']
  },
  {
    id: 'operations',
    titleKey: "nav.operations",
    url: "/operations/daily",
    icon: Settings2,
    module: "operations",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_audits',
    subItems: [
      { id: 'ops-daily', titleKey: "nav.dailyOps", url: "/operations/daily" },
      { id: 'ops-maintenance', titleKey: "nav.maintenanceTasks", url: "/operations/maintenance" },
      { id: 'ops-sla', titleKey: "nav.slaManagement", url: "/operations/slas" },
    ]
  },
  {
    id: 'corrective-actions',
    titleKey: "nav.correctiveActions",
    url: "/corrective-actions",
    icon: ShieldAlert,
    module: "corrective_actions",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_audits',
    subItems: [
      { id: 'ca-list', titleKey: "nav.allCAs", url: "/corrective-actions", allowedRoles: ['admin', 'manager'] },
      { id: 'ca-rules', titleKey: "nav.caRules", url: "/corrective-actions/rules", allowedRoles: ['admin'] },
    ]
  },
  {
    id: 'scouts',
    titleKey: "nav.scouts",
    url: "/scouts",
    icon: UserSearch,
    module: "scouts",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_audits',
    subItems: [
      { id: 'scouts-overview', titleKey: "nav.scoutsOverview", url: "/scouts" },
      { id: 'scouts-jobs', titleKey: "nav.scoutsJobs", url: "/scouts/jobs" },
      { id: 'scouts-review', titleKey: "nav.scoutsReview", url: "/scouts/review" },
      { id: 'scouts-templates', titleKey: "nav.scoutsTemplates", url: "/scouts/templates" },
      { id: 'scouts-payouts', titleKey: "nav.scoutsPayouts", url: "/scouts/payouts", allowedRoles: ['admin', 'manager'] },
      { id: 'scouts-roster', titleKey: "nav.scoutsRoster", url: "/scouts/roster", allowedRoles: ['admin', 'manager'] },
    ]
  },
];

// ============================================
// Settings Navigation Items
// ============================================

export const settingsItems: NavigationItem[] = [
  {
    id: 'settings-activity-log',
    titleKey: "nav.activityLog",
    url: "/activity-log",
    icon: History,
    module: null,
    requiresOwnerOrAdmin: true,
    isSettings: true
  },
  {
    id: 'settings-role-templates',
    titleKey: "nav.roleTemplates",
    url: "/role-templates",
    icon: ShieldCheck,
    module: null,
    requiresOwnerOrAdmin: true,
    isSettings: true
  },
  {
    id: 'settings-policy-rules',
    titleKey: "nav.policyRules",
    url: "/policy-rules",
    icon: ShieldAlert,
    module: null,
    requiresOwnerOrAdmin: true,
    isSettings: true
  },
  {
    id: 'settings-billing',
    titleKey: "nav.billingModules",
    url: "/pricing",
    icon: CreditCard,
    module: null,
    requiresOwner: true,
    isSettings: true
  },
  {
    id: 'settings-company',
    titleKey: "nav.companySettings",
    url: "/settings/company",
    icon: Building2,
    module: null,
    requiresOwnerOrAdmin: true,
    isSettings: true
  },
  {
    id: 'settings-users',
    titleKey: "nav.userManagement",
    url: "/admin/users",
    icon: UserCog,
    module: null,
    requiresOwner: true,
    isSettings: true
  },
  {
    id: 'settings-platform',
    titleKey: "nav.platformAdmin",
    url: "/admin/platform",
    icon: Shield,
    module: null,
    requiresPlatformAdmin: true,
    isSettings: true
  },
  {
    id: 'settings-health',
    titleKey: "nav.systemHealth",
    url: "/system-health",
    icon: Activity,
    module: null,
    requiresPlatformAdmin: true,
    isSettings: true
  },
  {
    id: 'settings-debug',
    titleKey: "nav.debugData",
    url: "/debug/system-health",
    icon: Bug,
    module: null,
    requiresPlatformAdmin: true,
    isSettings: true
  },
  {
    id: 'settings-agents',
    titleKey: "nav.aiAgents",
    url: "/admin/agents",
    icon: Bot,
    module: null,
    requiresPlatformAdmin: true,
    isSettings: true
  },
  {
    id: 'settings-install-app',
    titleKey: "nav.installApp",
    url: "/install",
    icon: Download,
    module: null,
    isSettings: true
  },
];

// ============================================
// Mobile Bottom Nav Items (subset for quick access)
// ============================================

export const mobileMainNavItems: Array<{
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
}> = [
  { id: 'mobile-home', title: "Home", url: "/dashboard", icon: Home },
  { id: 'mobile-workforce', title: "Workforce", url: "/workforce", icon: Users },
  { id: 'mobile-audits', title: "Audits", url: "/audits", icon: ClipboardCheck },
  { id: 'mobile-equipment', title: "Equipment", url: "/equipment", icon: Wrench },
];

export const mobileMoreNavItems: Array<{
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
  module?: string;
}> = [
  { id: 'more-locations', title: "Locations", url: "/admin/locations", icon: MapPin },
  { id: 'more-tasks', title: "Tasks", url: "/tasks", icon: ListTodo },
  { id: 'more-notifications', title: "Notifications", url: "/notifications", icon: Bell },
  { id: 'more-reports', title: "Reports", url: "/reports", icon: BarChart },
  { id: 'more-wastage', title: "Wastage", url: "/admin/waste/entries", icon: Trash2, module: "wastage" },
  { id: 'more-inventory', title: "Inventory", url: "/inventory", icon: Package },
  { id: 'more-documents', title: "Documents", url: "/documents", icon: FileText },
  { id: 'more-training', title: "Training", url: "/workforce/training", icon: GraduationCap },
  { id: 'more-integrations', title: "Integrations", url: "/integrations", icon: Plug },
  { id: 'more-integrations', title: "Integrations", url: "/integrations", icon: Plug },
  { id: 'more-marketplace', title: "Marketplace", url: "/marketplace", icon: Store },
  { id: 'more-operations', title: "Operations", url: "/operations/daily", icon: Settings2 },
  { id: 'more-billing', title: "Billing", url: "/pricing", icon: CreditCard },
  { id: 'more-settings', title: "Settings", url: "/settings/company", icon: Building2 },
];

// ============================================
// Navigation Resolution Types
// ============================================

export type NavigationStatus = 'loading' | 'ready' | 'error';

export interface ResolvedNavigation {
  status: NavigationStatus;
  mainItems: NavigationItem[];
  settingsItems: NavigationItem[];
  error?: string;
}

// ============================================
// Utility: Get all navigation items (flat list for search/routing)
// ============================================

export const getAllNavigationUrls = (): string[] => {
  const urls: string[] = [];
  
  const collectUrls = (items: NavigationItem[]) => {
    items.forEach(item => {
      urls.push(item.url);
      item.subItems?.forEach(sub => {
        urls.push(sub.url);
        sub.nestedItems?.forEach(nested => urls.push(nested.url));
      });
    });
  };
  
  collectUrls(navigationItems);
  collectUrls(settingsItems);
  
  return urls;
};
