import { 
  Home, Users, MapPin, ClipboardCheck, ListTodo, 
  Wrench, Package, FileText, Lightbulb, Plug, 
  CreditCard, Building2, Bell, BarChart, 
  GraduationCap, UserCog, Bug, Shield, Store, Settings2, Cog,
  AlertTriangle,
  LucideIcon
} from "lucide-react";
import { CompanyPermission } from "@/hooks/useCompanyPermissions";

/**
 * NAVIGATION REGISTRY - Single Source of Truth
 * 
 * This file defines all navigation items for the application.
 * Any changes to navigation should be made here only.
 * 
 * NAVIGATION MENU ORDER:
 * 1. Home
 * 2. Workforce
 * 3. Locations
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

export interface NestedNavItem {
  id: string;
  title: string;
  url: string;
}

export interface SubNavItem {
  id: string;
  title: string;
  url: string;
  allowedRoles?: string[];
  companyPermission?: CompanyPermission;
  nestedItems?: NestedNavItem[];
}

export interface NavItem {
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
  module: string | null;
  allowedRoles?: string[];
  companyPermission?: CompanyPermission;
  subItems?: SubNavItem[];
}

export interface SettingsNavItem {
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
  requiresOwner?: boolean;
  requiresCompanyAdmin?: boolean;
  requiresPlatformAdmin?: boolean;
}

export const navigationItems: NavItem[] = [
  { 
    id: "home",
    title: "Home", 
    url: "/dashboard", 
    icon: Home,
    module: null
  },
  { 
    id: "workforce",
    title: "Workforce", 
    url: "/workforce", 
    icon: Users,
    module: "workforce",
    allowedRoles: ['admin', 'manager', 'hr'],
    companyPermission: 'manage_shifts',
    subItems: [
      { id: "workforce-overview", title: "Overview", url: "/workforce" },
      { id: "workforce-staff", title: "Staff", url: "/workforce/staff", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_employees' },
      { id: "workforce-shifts", title: "Shifts", url: "/workforce/shifts", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_shifts' },
      { id: "workforce-attendance", title: "Attendance", url: "/workforce/attendance", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_shifts' },
      { id: "workforce-warnings", title: "Warnings", url: "/workforce/warnings", allowedRoles: ['admin', 'manager', 'hr', 'checker'], companyPermission: 'manage_employees' },
      { id: "workforce-timeoff", title: "Time Off", url: "/workforce/time-off", allowedRoles: ['admin', 'hr'] },
      { id: "workforce-payroll", title: "Payroll", url: "/workforce/payroll", allowedRoles: ['admin', 'hr'] },
      { id: "workforce-payroll-batches", title: "Payroll Batches", url: "/workforce/payroll-batches", allowedRoles: ['admin', 'hr'] },
      { id: "workforce-alerts", title: "Attendance Alerts", url: "/workforce/attendance-alerts", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_shifts' },
      { id: "workforce-insights", title: "Scheduling Insights", url: "/workforce/scheduling-insights", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'view_reports' },
    ]
  },
  { 
    id: "locations",
    title: "Locations", 
    url: "/admin/locations", 
    icon: MapPin,
    module: null,
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_locations',
    subItems: [
      { id: "locations-all", title: "All Locations", url: "/admin/locations" },
      { id: "locations-sales", title: "Sales", url: "/admin/locations/sales", allowedRoles: ['admin', 'manager'] },
      { id: "locations-clockout", title: "Auto Clock-Out", url: "/admin/locations?tab=auto-clockout", allowedRoles: ['admin'], companyPermission: 'manage_shifts' },
      { id: "locations-presets", title: "Shift Presets", url: "/admin/locations?tab=shift-presets", allowedRoles: ['admin'], companyPermission: 'manage_shifts' },
    ]
  },
  { 
    id: "audits",
    title: "Audits", 
    url: "/audits", 
    icon: ClipboardCheck,
    module: "location_audits",
    allowedRoles: ['admin', 'manager', 'hr', 'checker'],
    companyPermission: 'manage_audits',
    subItems: [
      { id: "audits-location", title: "Location Audits", url: "/audits", allowedRoles: ['admin', 'manager', 'hr', 'checker'], companyPermission: 'manage_audits' },
      { 
        id: "audits-employee",
        title: "Employee Audits", 
        url: "/staff-audits/all", 
        allowedRoles: ['admin', 'manager', 'hr'], 
        companyPermission: 'manage_audits',
        nestedItems: [
          { id: "audits-employee-new", title: "New Staff Audit", url: "/staff-audits/new" },
          { id: "audits-employee-review", title: "New Performance Review", url: "/staff-audits?review=new" },
        ]
      },
      { id: "audits-mystery", title: "Mystery Shopper", url: "/audits/mystery-shopper", allowedRoles: ['admin', 'manager'], companyPermission: 'manage_audits' },
      { id: "audits-templates", title: "Template Library", url: "/admin/template-library", allowedRoles: ['admin', 'manager', 'hr', 'checker'], companyPermission: 'manage_audits' },
      { id: "audits-calendar", title: "Audit Calendar", url: "/audits-calendar", allowedRoles: ['admin', 'manager', 'hr', 'checker'], companyPermission: 'manage_audits' },
      { id: "audits-schedules", title: "Schedules", url: "/recurring-schedules", allowedRoles: ['admin', 'manager', 'hr'], companyPermission: 'manage_audits' },
      { id: "audits-photos", title: "Photo Gallery", url: "/photos", allowedRoles: ['admin', 'manager', 'hr', 'checker'], companyPermission: 'manage_audits' },
    ]
  },
  { 
    id: "tasks",
    title: "Tasks", 
    url: "/tasks", 
    icon: ListTodo,
    module: null,
    subItems: [
      { id: "tasks-all", title: "All Tasks", url: "/tasks" },
      { id: "tasks-calendar", title: "Calendar", url: "/tasks/calendar" },
    ]
  },
  { 
    id: "equipment",
    title: "Equipment", 
    url: "/equipment", 
    icon: Wrench,
    module: "equipment_management",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_audits',
    subItems: [
      { id: "equipment-all", title: "All Equipment", url: "/equipment" },
      { id: "equipment-calendar", title: "Maintenance Calendar", url: "/maintenance-calendar" },
      { id: "equipment-recurring", title: "Recurring Maintenance", url: "/recurring-maintenance" },
      { id: "equipment-qr", title: "Bulk QR Codes", url: "/equipment/bulk-qr" },
    ]
  },
  { 
    id: "cmms",
    title: "CMMS", 
    url: "/cmms", 
    icon: Cog,
    module: null,
    allowedRoles: ['admin', 'manager'],
    subItems: [
      { id: "cmms-overview", title: "Overview", url: "/cmms/overview" },
      { id: "cmms-dashboard", title: "Dashboard", url: "/cmms" },
      { id: "cmms-assets", title: "Assets", url: "/cmms/assets" },
      { id: "cmms-work-orders", title: "Work Orders", url: "/cmms/work-orders" },
      { id: "cmms-pm-schedules", title: "PM Schedules", url: "/cmms/pm-schedules" },
      { id: "cmms-parts", title: "Parts Inventory", url: "/cmms/parts" },
      { id: "cmms-procedures", title: "Procedures", url: "/cmms/procedures" },
      { id: "cmms-vendors", title: "Vendors", url: "/cmms/vendors" },
      { id: "cmms-teams", title: "Teams", url: "/cmms/teams" },
      { id: "cmms-purchase-orders", title: "Purchase Orders", url: "/cmms/purchase-orders" },
      { id: "cmms-reports", title: "Reports", url: "/cmms/reports" },
    ]
  },
  { 
    id: "notifications",
    title: "Notifications", 
    url: "/notifications", 
    icon: Bell,
    module: "notifications",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_notifications',
    subItems: [
      { id: "notifications-send", title: "Send Notifications", url: "/notifications" },
      { id: "notifications-templates", title: "Templates", url: "/notification-templates" },
      { id: "notifications-recurring", title: "Recurring", url: "/recurring-notifications" },
      { id: "notifications-analytics", title: "Analytics", url: "/notification-analytics" },
      { id: "notifications-logs", title: "Audit Logs", url: "/notification-audit-logs" },
    ]
  },
  { 
    id: "reports",
    title: "Reports", 
    url: "/reports", 
    icon: BarChart,
    module: "reports",
    allowedRoles: ['admin', 'manager', 'hr'],
    companyPermission: 'view_reports',
    subItems: [
      { id: "reports-location", title: "Location Performance", url: "/reports?tab=location", companyPermission: 'view_reports' },
      { id: "reports-employee", title: "Employee Performance", url: "/reports?tab=employee", companyPermission: 'view_reports' },
      { id: "reports-vouchers", title: "Vouchers", url: "/audits/vouchers", companyPermission: 'view_reports' },
    ]
  },
  { 
    id: "inventory",
    title: "Inventory", 
    url: "/inventory", 
    icon: Package,
    module: "inventory"
  },
  { 
    id: "documents",
    title: "Documents", 
    url: "/documents", 
    icon: FileText,
    module: "documents",
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'view_reports',
    subItems: [
      { id: "documents-all", title: "All Documents", url: "/documents" },
    ]
  },
  { 
    id: "tests",
    title: "Tests", 
    url: "/test-management", 
    icon: GraduationCap,
    module: null,
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_employees',
    subItems: [
      { id: "tests-management", title: "Test Management", url: "/test-management" },
      { id: "tests-create", title: "Create Test", url: "/test-creation" },
    ]
  },
  { 
    id: "insights",
    title: "Insights", 
    url: "/insights", 
    icon: Lightbulb,
    module: "insights",
    allowedRoles: ['admin', 'manager', 'hr'],
    companyPermission: 'view_reports',
    subItems: [
      { id: "insights-overview", title: "Overview", url: "/insights", companyPermission: 'view_reports' },
      { id: "insights-ai", title: "AI Feed", url: "/ai-feed", companyPermission: 'view_reports' },
    ]
  },
  { 
    id: "integrations",
    title: "Integrations", 
    url: "/integrations", 
    icon: Plug,
    module: "integrations",
    allowedRoles: ['admin']
  },
  { 
    id: "marketplace",
    title: "Template Marketplace", 
    url: "/marketplace", 
    icon: Store,
    module: null,
    allowedRoles: ['admin', 'manager', 'hr', 'checker']
  },
  { 
    id: "operations",
    title: "Operations", 
    url: "/operations/daily", 
    icon: Settings2,
    module: null,
    allowedRoles: ['admin', 'manager'],
    companyPermission: 'manage_audits',
    subItems: [
      { id: "operations-daily", title: "Daily Ops", url: "/operations/daily" },
      { id: "operations-maintenance", title: "Maintenance Tasks", url: "/operations/maintenance" },
      { id: "operations-sla", title: "SLA Management", url: "/operations/slas" },
    ]
  },
];

export const settingsItems: SettingsNavItem[] = [
  { 
    id: "settings-billing",
    title: "Billing & Modules", 
    url: "/pricing", 
    icon: CreditCard,
    requiresOwner: true
  },
  { 
    id: "settings-company",
    title: "Company Settings", 
    url: "/company-settings", 
    icon: Building2,
    requiresOwner: true
  },
  { 
    id: "settings-user-management",
    title: "User Management", 
    url: "/admin/users", 
    icon: UserCog,
    requiresCompanyAdmin: true
  },
  {
    id: "settings-platform-admin",
    title: "Platform Admin",
    url: "/platform-admin",
    icon: Shield,
    requiresPlatformAdmin: true
  },
  {
    id: "settings-ai-agents",
    title: "AI Agents",
    url: "/admin/agents",
    icon: Shield,
    requiresPlatformAdmin: true
  },
  {
    id: "settings-debug",
    title: "Debug",
    url: "/debug",
    icon: Bug,
    requiresPlatformAdmin: true
  },
];

/**
 * Get a navigation item by its ID
 */
export function getNavItemById(id: string): NavItem | SubNavItem | NestedNavItem | undefined {
  for (const item of navigationItems) {
    if (item.id === id) return item;
    if (item.subItems) {
      for (const subItem of item.subItems) {
        if (subItem.id === id) return subItem;
        if (subItem.nestedItems) {
          for (const nestedItem of subItem.nestedItems) {
            if (nestedItem.id === id) return nestedItem;
          }
        }
      }
    }
  }
  return undefined;
}

/**
 * Get all routes defined in navigation config
 */
export function getAllNavigationRoutes(): string[] {
  const routes: string[] = [];
  
  for (const item of navigationItems) {
    routes.push(item.url);
    if (item.subItems) {
      for (const subItem of item.subItems) {
        routes.push(subItem.url);
        if (subItem.nestedItems) {
          for (const nestedItem of subItem.nestedItems) {
            routes.push(nestedItem.url);
          }
        }
      }
    }
  }
  
  for (const item of settingsItems) {
    routes.push(item.url);
  }
  
  return routes;
}
