import { useNavigate, useLocation } from "react-router-dom";
import { Home, Calendar, Clock, Umbrella, MessageSquare, User, DollarSign, ListTodo } from "lucide-react";

const navItems = [
  { id: "home", path: "/staff", icon: Home, label: "Home" },
  { id: "schedule", path: "/staff/schedule", icon: Calendar, label: "Schedule" },
  { id: "shifts", path: "/staff/shift-pool", icon: Clock, label: "Shifts" },
  { id: "time-off", path: "/staff/time-off", icon: Umbrella, label: "Time Off" },
  { id: "profile", path: "/staff/profile", icon: User, label: "Profile" },
];

export const StaffNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
