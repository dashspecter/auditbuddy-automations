import { Button } from "@/components/ui/button";
import { ClipboardCheck, LogOut, User, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Header = () => {
  const { user, signOut } = useAuth();
  const { data: roleData, isLoading } = useUserRole();
  
  // Debug logging
  console.log('Header - User:', user?.email);
  console.log('Header - Role Data:', roleData);
  console.log('Header - Is Loading:', isLoading);
  
  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-header text-header-foreground border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="bg-primary rounded-full p-2">
              <ClipboardCheck className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">QSR Audit Platform</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="hover:text-accent transition-colors">
              Dashboard
            </Link>
            <Link to="/audits" className="hover:text-accent transition-colors">
              Audits
            </Link>
            <Link to="/reports" className="hover:text-accent transition-colors">
              Reports
            </Link>
            {roleData?.isAdmin && (
              <Link to="/admin/templates" className="hover:text-accent transition-colors">
                Admin
              </Link>
            )}
            <Button variant="outline" size="sm" className="border-header-foreground/20 hover:bg-primary/10">
              Export Data
            </Button>
            
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
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-sm text-muted-foreground">
                  {user?.email}
                </DropdownMenuItem>
                {roleData?.isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin/templates" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Admin Settings
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
};
