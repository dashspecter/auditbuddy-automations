import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Building2, ChevronDown, MapPin, User, LogOut, 
  Plus, ClipboardCheck, ListTodo, Users as UsersIcon, Wrench
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/hooks/useCompany";
import { useLocations } from "@/hooks/useLocations";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export const AppTopBar = () => {
  const { user, signOut } = useAuth();
  const { data: company } = useCompany();
  const { data: locations } = useLocations();
  const navigate = useNavigate();
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  const getInitials = (email: string) => {
    return email?.substring(0, 2).toUpperCase() || "U";
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 sticky top-0 z-40">
      <div className="flex items-center gap-4">
        {/* Company Switcher - Future: support multiple companies */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">{company?.name || "Company"}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-background">
            <DropdownMenuLabel>{company?.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Badge variant="secondary">{company?.subscription_tier}</Badge>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Location Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">
                {selectedLocation === "all" ? "All Locations" : 
                  locations?.find(l => l.id === selectedLocation)?.name || "Location"}
              </span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-background">
            <DropdownMenuLabel>Filter by Location</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setSelectedLocation("all")}>
              All Locations
            </DropdownMenuItem>
            {locations?.map((location) => (
              <DropdownMenuItem 
                key={location.id} 
                onClick={() => setSelectedLocation(location.id)}
              >
                {location.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Quick Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Quick Actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-background">
            <DropdownMenuLabel>Create New</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/tasks/new" className="cursor-pointer">
                <ListTodo className="mr-2 h-4 w-4" />
                Create Task
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/location-audit" className="cursor-pointer">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Create Audit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/workforce/staff/new" className="cursor-pointer">
                <UsersIcon className="mr-2 h-4 w-4" />
                Add Staff
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/equipment/new" className="cursor-pointer">
                <Wrench className="mr-2 h-4 w-4" />
                Add Equipment
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <NotificationDropdown />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-background">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.email}</span>
                <span className="text-xs text-muted-foreground">{company?.name}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/tasks?filter=my-tasks" className="cursor-pointer">
                <ListTodo className="mr-2 h-4 w-4" />
                My Tasks
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};