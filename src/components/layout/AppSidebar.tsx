import { 
  Home, Users, MapPin, ClipboardCheck, ListTodo, 
  Wrench, Package, FileText, Lightbulb, Plug, 
  CreditCard, Building2, ChevronDown, Bell, BarChart, Activity
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompany } from "@/hooks/useCompany";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect } from "react";

const navigationItems = [
  { 
    title: "Home", 
    url: "/dashboard", 
    icon: Home,
    module: null // Always visible
  },
  { 
    title: "Workforce", 
    url: "/workforce", 
    icon: Users,
    module: "workforce",
    subItems: [
      { title: "Staff", url: "/workforce/staff", requiresManager: true },
      { title: "Shifts", url: "/workforce/shifts" },
      { title: "Attendance", url: "/workforce/attendance" },
      { title: "Time Off", url: "/workforce/time-off" },
      { title: "Payroll", url: "/workforce/payroll", requiresManager: true },
    ]
  },
  { 
    title: "Locations", 
    url: "/admin/locations", 
    icon: MapPin,
    module: null, // Always visible
    requiresManager: true
  },
  { 
    title: "Audits", 
    url: "/audits", 
    icon: ClipboardCheck,
    module: "location_audits",
    subItems: [
      { title: "Perform Audit", url: "/audits" },
      { title: "Template Library", url: "/audits/templates", requiresManager: true },
      { title: "Audit Calendar", url: "/audits-calendar" },
      { title: "Schedules", url: "/recurring-schedules", requiresManager: true },
    ]
  },
  { 
    title: "Tasks", 
    url: "/tasks", 
    icon: ListTodo,
    module: null // Always visible
  },
  { 
    title: "Equipment", 
    url: "/equipment", 
    icon: Wrench,
    module: "equipment_management"
  },
  { 
    title: "Notifications", 
    url: "/notifications", 
    icon: Bell,
    module: "notifications",
    requiresManager: true
  },
  { 
    title: "Reports", 
    url: "/reports", 
    icon: BarChart,
    module: "reports",
    requiresManager: true
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
    requiresManager: true
  },
  { 
    title: "Insights", 
    url: "/insights", 
    icon: Lightbulb,
    module: "insights",
    requiresManager: true
  },
  { 
    title: "Integrations", 
    url: "/integrations", 
    icon: Plug,
    module: "integrations",
    requiresAdmin: true
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
    title: "System Health", 
    url: "/system-health", 
    icon: Activity,
    requiresAdmin: true
  },
  { 
    title: "Debug Data", 
    url: "/debug/system-health", 
    icon: Activity,
    requiresAdmin: true
  },
];

export function AppSidebar() {
  const location = useLocation();
  const { hasModule } = useCompanyContext();
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

  const shouldShowItem = (item: any) => {
    // Check module access
    if (item.module && !hasModule(item.module)) {
      return false;
    }

    // Check role requirements
    if (item.requiresAdmin && !roleData?.isAdmin) {
      return false;
    }
    if (item.requiresManager && !(roleData?.isAdmin || roleData?.isManager)) {
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
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0">
      {/* Header */}
      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <img 
            src="/dashspect-logo-512.png" 
            alt="DashSpect" 
            className="h-8 w-8 rounded-lg"
          />
          <span className="text-lg font-bold text-sidebar-foreground">DashSpect</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {/* Main Navigation */}
        <div className="mb-6">
          <div className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
            Navigation
          </div>
          <nav className="space-y-1">
            {navigationItems.filter(shouldShowItem).map((item) => (
              <div key={item.title}>
                {item.subItems ? (
                  <Collapsible
                    open={expandedGroups[item.title] ?? false}
                    onOpenChange={() => toggleGroup(item.title)}
                  >
                    <CollapsibleTrigger className={`
                      w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                      transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
                      ${isParentActive(item) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground'}
                    `}>
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="flex-1 text-left">{item.title}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedGroups[item.title] ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ml-7 mt-1 space-y-1">
                      {item.subItems.filter((subItem: any) => {
                        // Check if subitem has manager requirement
                        if (subItem.requiresManager && !(roleData?.isAdmin || roleData?.isManager)) {
                          return false;
                        }
                        return true;
                      }).map((subItem: any) => (
                        <NavLink
                          key={subItem.url}
                          to={subItem.url}
                          className="flex items-center px-3 py-2 text-sm rounded-md hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        >
                          {subItem.title}
                        </NavLink>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <NavLink
                    to={item.url}
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground"
                    activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.title}</span>
                  </NavLink>
                )}
              </div>
            ))}
          </nav>
        </div>

        {/* Settings Section */}
        {settingsItems.some(shouldShowItem) && (
          <div>
            <div className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-wider">
              Settings
            </div>
            <nav className="space-y-1">
              {settingsItems.filter(shouldShowItem).map((item) => (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground text-sidebar-foreground"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
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
