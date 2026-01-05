import { useNavigate, useLocation } from "react-router-dom";
import { Home, Calendar, Repeat, Umbrella, User, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

export const StaffBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: roleData } = useUserRole();
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    const checkManagerRole = async () => {
      if (!user) return;
      
      // Check platform roles
      const platformManager = roleData?.isManager || roleData?.isAdmin;
      
      // Check company role
      const { data: empData } = await supabase
        .from("employees")
        .select("company_id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (empData) {
        const { data: companyUserData } = await supabase
          .from("company_users")
          .select("company_role")
          .eq("user_id", user.id)
          .eq("company_id", empData.company_id)
          .maybeSingle();
        
        const companyManager = companyUserData?.company_role === 'company_admin' || 
                               companyUserData?.company_role === 'company_owner';
        
        setIsManager(platformManager || companyManager);
      } else {
        setIsManager(platformManager || false);
      }
    };

    checkManagerRole();
  }, [user, roleData]);

  // Checker role - focused on audits but still an employee
  const isChecker = roleData?.isChecker && !isManager;

  // All users get the same staff nav - checkers just see audits content on the home page
  const staffNavItems = [
    { id: "home", path: "/staff", icon: Home, label: "Home" },
    { id: "schedule", path: "/staff/schedule", icon: Calendar, label: "Schedule" },
    { id: "shifts", path: "/staff/shifts", icon: Repeat, label: "Shifts" },
    { id: "time-off", path: "/staff/time-off", icon: Umbrella, label: "Time Off" },
    { id: "profile", path: "/staff/profile", icon: User, label: "Profile" },
  ];

  const managerNavItems = [
    { id: "home", path: "/staff", icon: Home, label: "Home" },
    { id: "who-working", path: "/staff/manager-schedule", icon: Users, label: "Who's Working" },
    { id: "schedule", path: "/staff/schedule", icon: Calendar, label: "My Schedule" },
    { id: "time-off", path: "/staff/time-off", icon: Umbrella, label: "Time Off" },
    { id: "profile", path: "/staff/profile", icon: User, label: "Profile" },
  ];

  const navItems = isManager ? managerNavItems : staffNavItems;

  const isActive = (path: string) => {
    if (path === "/staff") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border pb-safe z-50 shadow-lg">
      <div className="flex items-center justify-around px-2 h-16">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all touch-target ${
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? "scale-110" : ""} transition-transform`} />
              <span className={`text-[10px] font-medium ${active ? "font-semibold" : ""}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
