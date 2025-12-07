import { 
  Home, Users, MapPin, ClipboardCheck, ListTodo, 
  Wrench, Package, FileText, Lightbulb, Plug, 
  CreditCard, Building2, ChevronDown, Bell, BarChart, Activity,
  GraduationCap, Image, UserCog, Bug, Shield, Calendar
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompany } from "@/hooks/useCompany";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect } from "react";

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
    allowedRoles: ['admin', 'manager', 'hr'], // Both manager and HR can access workforce
    subItems: [
      { title: "Overview", url: "/workforce" },
      { title: "Staff", url: "/workforce/staff", allowedRoles: ['admin', 'manager', 'hr'] },
      { title: "Shifts", url: "/workforce/shifts", allowedRoles: ['admin', 'manager', 'hr'] },
      { title: "Attendance", url: "/workforce/attendance", allowedRoles: ['admin', 'manager', 'hr'] },
      { title: "Time Off", url: "/workforce/time-off", allowedRoles: ['admin', 'hr'] }, // HR only, not manager
      { title: "Payroll", url: "/workforce/payroll", allowedRoles: ['admin', 'hr'] }, // HR only, not manager
      { title: "Sales", url: "/workforce/sales", allowedRoles: ['admin', 'manager'] }, // Manager only, not HR
      { title: "Performance", url: "/workforce/performance", allowedRoles: ['admin', 'manager', 'hr'] },
    ]
  },
  { 
    title: "Locations", 
    url: "/admin/locations", 
    icon: MapPin,
    module: null,
    allowedRoles: ['admin', 'manager']
  },
  { 
    title: "Audits", 
    url: "/audits", 
    icon: ClipboardCheck,
    module: "location_audits",
    allowedRoles: ['admin', 'manager', 'hr', 'checker'], // All roles can view audits
    subItems: [
      { title: "Perform Audit", url: "/audits" },
      { title: "Template Library", url: "/audits/templates", allowedRoles: ['admin', 'manager', 'hr', 'checker'] },
      { title: "Audit Calendar", url: "/audits-calendar" },
      { title: "Schedules", url: "/recurring-schedules", allowedRoles: ['admin', 'manager', 'hr'] },
      { title: "Manual Metrics", url: "/manual-metrics", allowedRoles: ['admin', 'manager', 'hr'] },
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
    allowedRoles: ['admin', 'manager'], // Manager can manage equipment
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
    allowedRoles: ['admin', 'manager'], // Manager can manage notifications
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
    allowedRoles: ['admin', 'manager', 'hr'], // Manager and HR can view reports
    subItems: [
      { title: "Location Performance", url: "/reports" },
      { title: "Employee Performance", url: "/staff-audits" },
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
    subItems: [
      { title: "All Documents", url: "/documents" },
    ]
  },
  { 
    title: "Tests", 
    url: "/test-management", 
    icon: GraduationCap,
    module: null,
    allowedRoles: ['admin', 'manager'], // Manager can manage tests
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
    allowedRoles: ['admin', 'manager', 'hr'], // Manager and HR can view insights
    subItems: [
      { title: "Overview", url: "/insights" },
      { title: "AI Feed", url: "/ai-feed" },
    ]
  },
  { 
    title: "Integrations", 
    url: "/integrations", 
    icon: Plug,
    module: "integrations",
    allowedRoles: ['admin']
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
    requiresOwner: true
  },
  { 
    title: "User Management", 
    url: "/admin/users", 
    icon: UserCog,
    requiresAdmin: true
  },
  { 
    title: "Platform Admin", 
    url: "/admin/platform", 
    icon: Shield,
    requiresAdmin: true
  },
  { 
    title: "System Health", 
    url: "/system-health", 
    icon: Activity,
    requiresAdmin: true
  },
  { 
    title: "Debug Data", 
    url: "/debug/system-health", 
    icon: Bug,
    requiresAdmin: true
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { hasModule, canAccessModule } = useCompanyContext();
  const { data: roleData } = useUserRole();
  const { data: company } = useCompany();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const currentPath = location.pathname;
  const isOwner = company?.userRole === 'company_owner';

  const isActive = (path: string) => currentPath === path;
  const isParentActive = (item: any) => {
    if (item.subItems) {
      return item.subItems.some((sub: any) => currentPath.startsWith(sub.url));
    }
    return false;
  };

  // Initialize expanded groups based on active parent
  useEffect(() => {
    const activeParents: Record<string, boolean> = {};
    navigationItems.forEach((item) => {
      if (item.subItems && isParentActive(item)) {
        activeParents[item.title] = true;
      }
    });
    setExpandedGroups(prev => ({ ...prev, ...activeParents }));
  }, [currentPath]);

  const hasAllowedRole = (allowedRoles?: string[]) => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (roleData?.isAdmin && allowedRoles.includes('admin')) return true;
    if (roleData?.isManager && allowedRoles.includes('manager')) return true;
    if (roleData?.isChecker && allowedRoles.includes('checker')) return true;
    if (roleData?.isHR && allowedRoles.includes('hr')) return true;
    return false;
  };

  const shouldShowItem = (item: any) => {
    // Check module access (includes tier check)
    if (item.module && !canAccessModule(item.module)) {
      return false;
    }

    // Check role requirements using allowedRoles array
    if (item.allowedRoles && !hasAllowedRole(item.allowedRoles)) {
      return false;
    }

    // Legacy support for requiresAdmin/requiresOwner
    if (item.requiresAdmin && !roleData?.isAdmin) {
      return false;
    }
    if (item.requiresOwner && !isOwner) {
      return false;
    }

    return true;
  };

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <aside className="w-64 h-screen bg-sidebar flex flex-col sticky top-0 border-r border-sidebar-border/50 shadow-[1px_0_0_0_rgba(0,0,0,0.02)]">
      {/* Header with subtle gradient */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img 
              src="/dashspect-logo-512.png" 
              alt="Dashspect" 
              className="h-9 w-9 rounded-xl shadow-sm"
            />
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-sidebar" />
          </div>
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">Dashspect</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
        {/* Main Navigation */}
        <div className="mb-4">
          <div className="px-3 py-2 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-[0.15em]">
            Navigation
          </div>
          <nav className="space-y-0.5">
            {navigationItems.filter(shouldShowItem).map((item) => (
              <div key={item.title}>
                {item.subItems ? (
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
                    <CollapsibleContent className="mt-1 ml-[22px] pl-4 border-l border-sidebar-border/60 space-y-0.5 animate-accordion-down">
                      {item.subItems.filter((subItem: any) => {
                        if (subItem.allowedRoles && !hasAllowedRole(subItem.allowedRoles)) {
                          return false;
                        }
                        return true;
                      }).map((subItem: any) => (
                        <NavLink
                          key={subItem.url}
                          to={subItem.url}
                          className="flex items-center px-3 py-2 text-[13px] rounded-lg transition-all duration-200 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-muted"
                          activeClassName="text-primary font-medium bg-primary/10"
                        >
                          {subItem.title}
                        </NavLink>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <NavLink
                    to={item.url}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ease-out text-sidebar-foreground/80 hover:bg-sidebar-muted hover:text-sidebar-foreground group"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-primary/20"
                  >
                    <div className="p-1.5 rounded-lg transition-colors duration-200 bg-sidebar-muted group-hover:bg-sidebar-border">
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                    </div>
                    <span>{item.title}</span>
                  </NavLink>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Settings Section with divider */}
        {settingsItems.some(shouldShowItem) && (
          <div className="pt-3 border-t border-sidebar-border/40">
            <div className="px-3 py-2 text-[10px] font-semibold text-sidebar-foreground/50 uppercase tracking-[0.15em]">
              Settings
            </div>
            <nav className="space-y-0.5">
              {settingsItems.filter(shouldShowItem).map((item) => (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ease-out text-sidebar-foreground/70 hover:bg-sidebar-muted hover:text-sidebar-foreground group"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground shadow-sm shadow-primary/20"
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  <span>{item.title}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </div>
    </aside>
  );
}
