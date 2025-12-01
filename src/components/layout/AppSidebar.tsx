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
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

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
      { title: "Staff", url: "/workforce/staff" },
      { title: "Shifts", url: "/workforce/shifts" },
      { title: "Attendance", url: "/workforce/attendance" },
      { title: "Time Off", url: "/workforce/time-off" },
      { title: "Payroll", url: "/workforce/payroll" },
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
    module: "location_audits"
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
    <Sidebar collapsible="none" side="left" className="border-r">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          <img 
            src="/dashspect-logo-512.png" 
            alt="DashSpect" 
            className="h-8 w-8 rounded-lg"
          />
          <span className="text-lg font-bold">DashSpect</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.filter(shouldShowItem).map((item) => (
                <SidebarMenuItem key={item.title}>
                  {item.subItems ? (
                    <Collapsible
                      open={expandedGroups[item.title] || isParentActive(item)}
                      onOpenChange={() => toggleGroup(item.title)}
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={isParentActive(item) ? "bg-accent text-accent-foreground" : ""}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1">{item.title}</span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${expandedGroups[item.title] ? 'rotate-180' : ''}`} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="ml-6 mt-1 space-y-1">
                        {item.subItems.map((subItem: any) => (
                          <NavLink
                            key={subItem.url}
                            to={subItem.url}
                            className="flex items-center px-3 py-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
                            activeClassName="bg-accent text-accent-foreground font-medium"
                          >
                            {subItem.title}
                          </NavLink>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-accent hover:text-accent-foreground"
                        activeClassName="bg-accent text-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Section */}
        {settingsItems.some(shouldShowItem) && (
          <SidebarGroup className="mt-auto">
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {settingsItems.filter(shouldShowItem).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="hover:bg-accent hover:text-accent-foreground"
                        activeClassName="bg-accent text-accent-foreground font-medium"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}