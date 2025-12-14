import { Home, ClipboardCheck, Users, Wrench, Menu } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompany } from "@/hooks/useCompany";
import { Link } from "react-router-dom";
import { 
  MapPin, ListTodo, Package, FileText, Lightbulb, 
  Plug, Bell, BarChart, CreditCard, Building2, Store, Settings2, GraduationCap
} from "lucide-react";

const mainNavItems = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Workforce", url: "/workforce", icon: Users },
  { title: "Audits", url: "/audits", icon: ClipboardCheck },
  { title: "Equipment", url: "/equipment", icon: Wrench },
];

const moreNavItems = [
  { title: "Locations", url: "/admin/locations", icon: MapPin },
  { title: "Tasks", url: "/tasks", icon: ListTodo },
  { title: "Notifications", url: "/notifications", icon: Bell },
  { title: "Reports", url: "/reports", icon: BarChart },
  { title: "Inventory", url: "/inventory", icon: Package },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Training", url: "/training", icon: GraduationCap },
  { title: "Insights", url: "/insights", icon: Lightbulb },
  { title: "Integrations", url: "/integrations", icon: Plug },
  { title: "Marketplace", url: "/marketplace", icon: Store },
  { title: "Operations", url: "/operations/daily", icon: Settings2 },
  { title: "Billing", url: "/pricing", icon: CreditCard },
  { title: "Settings", url: "/settings/company", icon: Building2 },
];

export function MobileBottomNav() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { hasModule, canAccessModule } = useCompanyContext();
  const { data: roleData } = useUserRole();
  const { data: company } = useCompany();

  const isOwner = company?.userRole === 'company_owner';
  const isCompanyAdmin = company?.userRole === 'company_admin';

  const isActive = (url: string) => {
    return location.pathname === url || location.pathname.startsWith(url + '/');
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-pb">
        <div className="flex items-center justify-around h-16">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.url);
            return (
              <NavLink
                key={item.url}
                to={item.url}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[64px] min-h-[44px]",
                  "transition-colors",
                  active 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "text-primary")} />
                <span className="text-[10px] font-medium">{item.title}</span>
              </NavLink>
            );
          })}

          {/* More Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[64px] min-h-[44px]",
                  "transition-colors text-muted-foreground hover:text-foreground"
                )}
              >
                <Menu className="h-5 w-5" />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[70vh] rounded-t-xl">
              <SheetHeader>
                <SheetTitle>More Options</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-4 py-6 overflow-y-auto">
                {moreNavItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.url);
                  return (
                    <Link
                      key={item.url}
                      to={item.url}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-4 rounded-xl min-h-[80px]",
                        "transition-colors",
                        active 
                          ? "bg-primary/10 text-primary" 
                          : "bg-muted/50 text-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-xs font-medium text-center">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Spacer for fixed bottom nav - prevents content from being hidden behind nav */}
      <div className="md:hidden h-16" />
    </>
  );
}
