import { Button } from "@/components/ui/button";
import { ClipboardCheck, LogOut, User, Settings, Menu, Megaphone, FileText, History, Smartphone, BookOpen, GraduationCap, ChevronDown, MapPin, Repeat, Users, Award, TrendingUp, Wrench, Calendar as CalendarMaintenance, BarChart3, FileBarChart, Building2, Shield, Calendar as CalendarIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { useCompany } from "@/hooks/useCompany";
import { RoleBadges } from "@/components/RoleBadges";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export const Header = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const isPublicPage = location.pathname === '/' || location.pathname === '/auth' || location.pathname.startsWith('/equipment/');
  
  // Only fetch user role for authenticated pages
  const { data: roleData, isLoading } = useUserRole();
  const { data: fullRoleData } = useUserRoles();
  const { data: company } = useCompany();
  const { hasModule, isLoading: modulesLoading } = useCompanyContext();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Role data is available via roleData object

  const handleInstallApp = async () => {
    const success = await promptInstall();
    if (success) {
      toast({
        title: "Installing App",
        description: "Dashspect is being installed to your device.",
      });
    } else {
      // Show instructions for iOS or already installed
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        toast({
          title: "Install on iOS",
          description: "Tap the Share button and select 'Add to Home Screen'",
          duration: 5000,
        });
      } else if (isInstalled) {
        toast({
          title: "Already Installed",
          description: "Dashspect is already installed on your device.",
        });
      } else {
        toast({
          title: "Install Not Available",
          description: "Your browser doesn't support app installation or it's already installed.",
          variant: "destructive",
        });
      }
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const isAuthPage = location.pathname === '/auth';

  // Simplified public header for landing and auth pages
  if (isPublicPage) {
    return (
      <header className="bg-background text-foreground border-b border-border sticky top-0 z-50 pt-safe">
        <div className="container mx-auto px-4 px-safe py-2.5 md:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 md:gap-3">
            <img 
              src="/dashspect-logo-512.png?v=2" 
              alt="DashSpect" 
              className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-primary p-1"
            />
            <span className="text-base md:text-xl font-bold">Dashspect</span>
          </Link>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" className="min-h-[44px]">
                    Dashboard
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </Link>
              </>
            ) : !isAuthPage ? (
              <Link to="/auth">
                <Button className="min-h-[44px]">
                  Sign In
                </Button>
              </Link>
            ) : (
              <Link to="/">
                <Button variant="outline" className="min-h-[44px]">
                  Home
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>
    );
  }

  // Full authenticated header for dashboard and app pages
  return (
    <header className="bg-header text-header-foreground border-b border-border sticky top-0 z-50 pt-safe">
      <div className="container mx-auto px-4 px-safe py-2.5 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2 md:gap-3">
            <img 
              src="/dashspect-logo-512.png?v=2" 
              alt="DashSpect" 
              className="h-8 w-8 md:h-10 md:w-10 rounded-xl bg-primary p-1"
            />
            <span className="text-base md:text-xl font-bold">Dashspect</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/dashboard" className="hover:text-accent transition-colors min-h-[44px] flex items-center">
              Dashboard
            </Link>
            
            {/* Audits Dropdown */}
            {(hasModule('location_audits') || hasModule('staff_performance')) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hover:text-accent hover:bg-transparent p-0 h-auto font-normal flex items-center gap-1">
                    Audits
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 z-50 bg-background">
                  {hasModule('location_audits') && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin/template-library" className="cursor-pointer min-h-[44px] flex items-center" data-tour="templates-menu">
                        <ClipboardCheck className="mr-2 h-4 w-4" />
                        Location Audits
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {hasModule('staff_performance') && (roleData?.isAdmin || roleData?.isManager) && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link to="/staff-audits" className="cursor-pointer min-h-[44px] flex items-center" data-tour="staff-audits-link">
                          <Users className="mr-2 h-4 w-4" />
                          Employee Audits
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/manual-metrics" className="cursor-pointer min-h-[44px] flex items-center">
                          <TrendingUp className="mr-2 h-4 w-4" />
                          Manual Metrics
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/test-management" className="cursor-pointer min-h-[44px] flex items-center">
                          <GraduationCap className="mr-2 h-4 w-4" />
                          Tests
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {/* Calendar Dropdown */}
            {(hasModule('location_audits') || hasModule('equipment_management')) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="hover:text-accent hover:bg-transparent p-0 h-auto font-normal flex items-center gap-1">
                    Calendar
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 z-50 bg-background">
                  {hasModule('location_audits') && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer min-h-[44px]">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        Audit Calendar
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem asChild>
                          <Link to="/audits-calendar" className="cursor-pointer min-h-[44px] flex items-center">
                            Calendar View
                          </Link>
                        </DropdownMenuItem>
                        {(roleData?.isAdmin || roleData?.isManager) && (
                          <DropdownMenuItem asChild>
                            <Link to="/recurring-schedules" className="cursor-pointer min-h-[44px] flex items-center">
                              <Repeat className="mr-2 h-4 w-4" />
                              Recurring Schedules
                            </Link>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
                  {hasModule('equipment_management') && (roleData?.isAdmin || roleData?.isManager) && (
                    <DropdownMenuItem asChild>
                      <Link to="/maintenance-calendar" className="cursor-pointer min-h-[44px] flex items-center" data-tour="maintenance-calendar">
                        <CalendarMaintenance className="mr-2 h-4 w-4" />
                        Maintenance Calendar
                      </Link>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {(roleData?.isAdmin || roleData?.isManager) && (
              <>
                <Link to="/documents" className="hover:text-accent transition-colors min-h-[44px] flex items-center">
                  Documents
                </Link>

                {/* Reports Dropdown */}
                {hasModule('reports') && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="hover:text-accent hover:bg-transparent p-0 h-auto font-normal flex items-center gap-1">
                        Reports
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 z-50 bg-background">
                      {hasModule('staff_performance') && (
                        <DropdownMenuItem asChild>
                          <Link to="/staff-audits" className="cursor-pointer min-h-[44px] flex items-center">
                            <Award className="mr-2 h-4 w-4" />
                            Staff Performance
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {hasModule('location_audits') && (
                        <DropdownMenuItem asChild>
                          <Link to="/reports" className="cursor-pointer min-h-[44px] flex items-center" data-tour="reports-link">
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Location Performance
                          </Link>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Settings Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="hover:text-accent hover:bg-transparent p-0 h-auto font-normal flex items-center gap-1">
                      Settings
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 z-50 bg-background">
                    {hasModule('notifications') && (
                      <DropdownMenuItem asChild>
                        <Link to="/notifications" className="cursor-pointer min-h-[44px] flex items-center" data-tour="notifications-page">
                          <Megaphone className="mr-2 h-4 w-4" />
                          Notifications
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {hasModule('location_audits') && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin/templates" className="cursor-pointer min-h-[44px] flex items-center">
                          <FileText className="mr-2 h-4 w-4" />
                          Audit Templates
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {hasModule('equipment_management') && (
                      <DropdownMenuItem asChild>
                        <Link to="/equipment" className="cursor-pointer min-h-[44px] flex items-center">
                          <Wrench className="mr-2 h-4 w-4" />
                          Equipment
                        </Link>
                      </DropdownMenuItem>
                    )}
                    {roleData?.isAdmin && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/locations" className="cursor-pointer min-h-[44px] flex items-center">
                            <MapPin className="mr-2 h-4 w-4" />
                            Locations
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/users" className="cursor-pointer min-h-[44px] flex items-center">
                            <User className="mr-2 h-4 w-4" />
                            Users
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/platform" className="cursor-pointer min-h-[44px] flex items-center">
                            <Building2 className="mr-2 h-4 w-4" />
                            Platform Admin
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    {hasModule('staff_performance') && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin/employees" className="cursor-pointer min-h-[44px] flex items-center" data-tour="employees-menu">
                          <Users className="mr-2 h-4 w-4" />
                          Employees
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            {roleData?.isAdmin && (
              <Link to="/admin/platform">
                <Button 
                  size="sm" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 min-h-[44px]"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden lg:inline">Platform Admin</span>
                  <span className="lg:hidden">Admin</span>
                </Button>
              </Link>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4 pr-2">
          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden min-h-[44px] min-w-[44px]">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px] overflow-y-auto">
              <nav className="flex flex-col gap-4 mt-8 pb-8">
                <Link 
                  to="/dashboard" 
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ClipboardCheck className="h-5 w-5" />
                  <span className="text-base font-medium">Dashboard</span>
                </Link>

                {/* Audits Section */}
                {(hasModule('location_audits') || hasModule('staff_performance')) && (
                  <>
                    <div className="border-t border-border my-2"></div>
                    <div className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Audits
                    </div>
                  </>
                )}
                {hasModule('location_audits') && (
                  <Link 
                    to="/admin/template-library" 
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ClipboardCheck className="h-5 w-5" />
                    <span className="text-base font-medium">Location Audits</span>
                  </Link>
                )}
                {hasModule('staff_performance') && (roleData?.isAdmin || roleData?.isManager) && (
                  <>
                    <Link 
                      to="/staff-audits" 
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Users className="h-5 w-5" />
                      <span className="text-base font-medium">Employee Audits</span>
                    </Link>
                    <Link 
                      to="/manual-metrics" 
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <TrendingUp className="h-5 w-5" />
                      <span className="text-base font-medium">Manual Metrics</span>
                    </Link>
                    <Link 
                      to="/test-management" 
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <GraduationCap className="h-5 w-5" />
                      <span className="text-base font-medium">Tests</span>
                    </Link>
                  </>
                )}

                {/* Calendar Section */}
                {(hasModule('location_audits') || hasModule('equipment_management')) && (
                  <>
                    <div className="border-t border-border my-2"></div>
                    <div className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Calendar
                    </div>
                  </>
                )}
                {hasModule('location_audits') && (
                  <div className="px-2">
                    <div className="text-xs font-semibold text-muted-foreground pl-2 mb-2">Audit Calendar</div>
                    <Link 
                      to="/audits-calendar" 
                      className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <CalendarIcon className="h-5 w-5" />
                      <span className="text-base font-medium">Calendar View</span>
                    </Link>
                    {(roleData?.isAdmin || roleData?.isManager) && (
                      <Link 
                        to="/recurring-schedules" 
                        className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Repeat className="h-5 w-5" />
                        <span className="text-base font-medium">Recurring Schedules</span>
                      </Link>
                    )}
                  </div>
                )}
                {hasModule('equipment_management') && (roleData?.isAdmin || roleData?.isManager) && (
                  <Link 
                    to="/maintenance-calendar" 
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <CalendarMaintenance className="h-5 w-5" />
                    <span className="text-base font-medium">Maintenance Calendar</span>
                  </Link>
                )}
                
                {(roleData?.isAdmin || roleData?.isManager) && (
                  <>
                    {/* Documents */}
                    <div className="border-t border-border my-2"></div>
                    <Link 
                      to="/documents" 
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <BookOpen className="h-5 w-5" />
                      <span className="text-base font-medium">Documents</span>
                    </Link>

                    {/* Reports Section */}
                    {hasModule('reports') && (
                      <>
                        <div className="border-t border-border my-2"></div>
                        <div className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          Reports
                        </div>
                        {hasModule('staff_performance') && (
                          <Link 
                            to="/staff-audits" 
                            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Award className="h-5 w-5" />
                            <span className="text-base font-medium">Staff Performance</span>
                          </Link>
                        )}
                        {hasModule('location_audits') && (
                          <Link 
                            to="/reports" 
                            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <BarChart3 className="h-5 w-5" />
                            <span className="text-base font-medium">Location Performance</span>
                          </Link>
                        )}
                      </>
                    )}

                    {/* Settings Section */}
                    <div className="border-t border-border my-2"></div>
                    <div className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Settings
                    </div>
                    {hasModule('notifications') && (
                      <Link 
                        to="/notifications" 
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Megaphone className="h-5 w-5" />
                        <span className="text-base font-medium">Notifications</span>
                      </Link>
                    )}
                    {hasModule('location_audits') && (
                      <Link 
                        to="/admin/templates" 
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <FileText className="h-5 w-5" />
                        <span className="text-base font-medium">Audit Templates</span>
                      </Link>
                    )}
                    {hasModule('equipment_management') && (
                      <Link 
                        to="/equipment" 
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Wrench className="h-5 w-5" />
                        <span className="text-base font-medium">Equipment</span>
                      </Link>
                    )}
                    {roleData?.isAdmin && (
                      <Link 
                        to="/admin/locations" 
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <MapPin className="h-5 w-5" />
                        <span className="text-base font-medium">Locations</span>
                      </Link>
                    )}
                    {roleData?.isAdmin && (
                      <Link 
                        to="/admin/platform" 
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Building2 className="h-5 w-5" />
                        <span className="text-base font-medium">Platform Admin</span>
                      </Link>
                    )}
                    {hasModule('staff_performance') && (
                      <Link 
                        to="/admin/employees" 
                        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Users className="h-5 w-5" />
                        <span className="text-base font-medium">Employees</span>
                      </Link>
                    )}
                  </>
                )}
                
                <div className="border-t border-border my-2"></div>
                {(roleData?.isAdmin || company?.userRole === 'company_owner' || company?.userRole === 'company_admin') && (
                  <Link 
                    to="/settings/company" 
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-5 w-5" />
                    <span className="text-base font-medium">Company Settings</span>
                  </Link>
                )}
                <Link
                  to="/settings" 
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="h-5 w-5" />
                  <span className="text-base font-medium">Account Settings</span>
                </Link>
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors text-left min-h-[44px]"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="text-base font-medium">Sign Out</span>
                </button>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Notifications */}
          <div data-tour="notifications-dropdown">
            <NotificationDropdown />
          </div>

          {/* Desktop User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 min-h-[44px] hidden md:flex">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden lg:inline">{user?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 z-50">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-2">
                  <p className="text-sm font-medium leading-none">{user?.email}</p>
                  {!isLoading && fullRoleData && (
                    <RoleBadges 
                      platformRole={fullRoleData.platformRole} 
                      companyRole={fullRoleData.companyRole}
                      size="sm"
                    />
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {roleData?.isAdmin && (
                <DropdownMenuItem asChild>
                  <Link to="/admin/users" className="cursor-pointer min-h-[44px] flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    User Management
                  </Link>
                </DropdownMenuItem>
              )}
              {(roleData?.isAdmin || roleData?.isManager) && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/notifications" className="cursor-pointer min-h-[44px] flex items-center">
                      <Megaphone className="mr-2 h-4 w-4" />
                      Manage Notifications
                    </Link>
                  </DropdownMenuItem>
                  {roleData?.isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/notification-templates" className="cursor-pointer min-h-[44px] flex items-center">
                        <FileText className="mr-2 h-4 w-4" />
                        Notification Templates
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {roleData?.isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/notification-audit-logs" className="cursor-pointer min-h-[44px] flex items-center">
                        <History className="mr-2 h-4 w-4" />
                        Notification Logs
                      </Link>
                    </DropdownMenuItem>
                  )}
                </>
              )}
              {!isInstalled && (
                <DropdownMenuItem onClick={handleInstallApp} className="min-h-[44px] flex items-center cursor-pointer">
                  <Smartphone className="mr-2 h-4 w-4" />
                  Install App
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {(roleData?.isAdmin || company?.userRole === 'company_owner' || company?.userRole === 'company_admin') && (
                <DropdownMenuItem asChild>
                  <Link to="/settings/company" className="cursor-pointer min-h-[44px] flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Company Settings
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer min-h-[44px] flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Account Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="min-h-[44px] flex items-center text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
