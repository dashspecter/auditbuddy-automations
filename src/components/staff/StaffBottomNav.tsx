import { Users, User, MapPin, Calendar, Umbrella, RefreshCw } from "lucide-react";
import { useState } from "react";
import { ColleaguesDialog } from "./ColleaguesDialog";
import { ManagerDetailsDialog } from "./ManagerDetailsDialog";
import { LocationDetailsDialog } from "./LocationDetailsDialog";
import { OpenShiftsDialog } from "./OpenShiftsDialog";
import { VacationDetailsDialog } from "./VacationDetailsDialog";
import { ShiftRequestDialog } from "./ShiftRequestDialog";

export const StaffBottomNav = () => {
  const [activeDialog, setActiveDialog] = useState<string | null>(null);

  const navItems = [
    { id: "colleagues", icon: Users, label: "Colleagues" },
    { id: "manager", icon: User, label: "Manager" },
    { id: "location", icon: MapPin, label: "Location" },
    { id: "shifts", icon: Calendar, label: "Open Shifts" },
    { id: "vacation", icon: Umbrella, label: "Vacation" },
    { id: "request", icon: RefreshCw, label: "Requests" },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border pb-safe z-50">
        <div className="grid grid-cols-6 gap-1 px-2 py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveDialog(item.id)}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-accent/10 active:bg-accent/20 transition-colors touch-target"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-medium leading-tight text-center">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </nav>

      <ColleaguesDialog 
        open={activeDialog === "colleagues"} 
        onOpenChange={(open) => !open && setActiveDialog(null)} 
      />
      <ManagerDetailsDialog 
        open={activeDialog === "manager"} 
        onOpenChange={(open) => !open && setActiveDialog(null)} 
      />
      <LocationDetailsDialog 
        open={activeDialog === "location"} 
        onOpenChange={(open) => !open && setActiveDialog(null)} 
      />
      <OpenShiftsDialog 
        open={activeDialog === "shifts"} 
        onOpenChange={(open) => !open && setActiveDialog(null)} 
      />
      <VacationDetailsDialog 
        open={activeDialog === "vacation"} 
        onOpenChange={(open) => !open && setActiveDialog(null)} 
      />
      <ShiftRequestDialog 
        open={activeDialog === "request"} 
        onOpenChange={(open) => !open && setActiveDialog(null)} 
      />
    </>
  );
};
