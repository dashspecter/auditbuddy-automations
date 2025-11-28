import { Button } from "@/components/ui/button";
import { ClipboardCheck, LogOut, User, Settings, Download, Menu, Megaphone, FileText, History, Smartphone, BookOpen, GraduationCap, ChevronDown, MapPin, Repeat, Users, Award, TrendingUp, Wrench, Calendar as CalendarMaintenance, BarChart3, FileBarChart } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useCompanyContext } from "@/contexts/CompanyContext";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Header = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const isPublicPage = location.pathname === '/' || location.pathname === '/auth' || location.pathname.startsWith('/equipment/');
  
  // Only fetch user role for authenticated pages
  const { data: roleData, isLoading } = useUserRole();
  const { hasModule, isLoading: modulesLoading } = useCompanyContext();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const { toast } = useToast();
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedData, setSelectedData] = useState({
    audits: true,
    templates: false,
    users: false,
  });
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

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
  const handleExportData = async () => {
    try {
      const exports: any[] = [];

      // Export Audits
      if (selectedData.audits) {
        let query = supabase
          .from('location_audits')
          .select('*')
          .order('created_at', { ascending: false });

        if (dateFrom) {
          query = query.gte('created_at', dateFrom.toISOString());
        }
        if (dateTo) {
          query = query.lte('created_at', dateTo.toISOString());
        }

        const { data: audits, error } = await query;
        if (error) throw error;
        if (audits && audits.length > 0) {
          exports.push({ name: 'audits', data: audits });
        }
      }

      // Export Templates
      if (selectedData.templates) {
        const { data: templates, error } = await supabase
          .from('audit_templates')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (templates && templates.length > 0) {
          exports.push({ name: 'templates', data: templates });
        }
      }

      // Export Users (if admin)
      if (selectedData.users && roleData?.isAdmin) {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        if (profiles && profiles.length > 0) {
          exports.push({ name: 'users', data: profiles });
        }
      }

      if (exports.length === 0) {
        toast({
          title: "No data to export",
          description: "No data matches your selection criteria.",
          variant: "destructive",
        });
        return;
      }

      // Create and download CSV for each selected data type
      exports.forEach(({ name, data }) => {
        const headers = Object.keys(data[0]).join(',');
        const rows = data.map(item => 
          Object.values(item).map(val => 
            typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val
          ).join(',')
        );
        const csv = [headers, ...rows].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      });

      toast({
        title: "Export completed",
        description: `Successfully exported ${exports.length} file(s).`,
      });

      setExportDialogOpen(false);
      setSelectedData({ audits: true, templates: false, users: false });
      setDateFrom(undefined);
      setDateTo(undefined);
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "An error occurred while exporting data.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  // Simplified public header for landing and auth pages
  if (isPublicPage) {
    return (
      <header className="bg-header text-header-foreground border-b border-border sticky top-0 z-50 pt-safe">
        <div className="container mx-auto px-4 px-safe py-2.5 md:py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 md:gap-3">
            <div className="bg-primary rounded-full p-1 md:p-2">
              <ClipboardCheck className="h-4 w-4 md:h-6 md:w-6 text-primary-foreground" />
            </div>
            <span className="text-base md:text-xl font-bold">Dashspect</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" className="min-h-[44px]">
                Dashboard
              </Button>
            </Link>
            {user ? (
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button className="min-h-[44px]">
                  Sign In
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
            <div className="bg-primary rounded-full p-1 md:p-2">
              <ClipboardCheck className="h-4 w-4 md:h-6 md:w-6 text-primary-foreground" />
            </div>
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
            {(roleData?.isAdmin || roleData?.isManager) && (
              <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 min-h-[44px]"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden lg:inline">Export Data</span>
                  <span className="lg:hidden">Export</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Export Data</DialogTitle>
                  <DialogDescription>
                    Select what data you want to export and optionally filter by date range.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Select Data Types</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="audits" 
                          checked={selectedData.audits}
                          onCheckedChange={(checked) => 
                            setSelectedData(prev => ({ ...prev, audits: checked as boolean }))
                          }
                        />
                        <Label htmlFor="audits" className="cursor-pointer">
                          Location Audits
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="templates" 
                          checked={selectedData.templates}
                          onCheckedChange={(checked) => 
                            setSelectedData(prev => ({ ...prev, templates: checked as boolean }))
                          }
                        />
                        <Label htmlFor="templates" className="cursor-pointer">
                          Audit Templates
                        </Label>
                      </div>
                      {roleData?.isAdmin && (
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="users" 
                            checked={selectedData.users}
                            onCheckedChange={(checked) => 
                              setSelectedData(prev => ({ ...prev, users: checked as boolean }))
                            }
                          />
                          <Label htmlFor="users" className="cursor-pointer">
                            User Profiles (Admin Only)
                          </Label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Date Range (Optional)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>From Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal min-h-[44px]",
                                !dateFrom && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-50" align="start">
                            <Calendar
                              mode="single"
                              selected={dateFrom}
                              onSelect={setDateFrom}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label>To Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal min-h-[44px]",
                                !dateTo && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-50" align="start">
                            <Calendar
                              mode="single"
                              selected={dateTo}
                              onSelect={setDateTo}
                              initialFocus
                              className="pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => setExportDialogOpen(false)}
                    className="min-h-[44px]"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleExportData}
                    disabled={!selectedData.audits && !selectedData.templates && !selectedData.users}
                    className="min-h-[44px]"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                {roleData?.isAdmin && (
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
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.email}</p>
                  {!isLoading && roleData && (
                    <p className="text-xs leading-none text-muted-foreground">
                      {roleData.isAdmin ? 'Admin' : roleData.isManager ? 'Manager' : 'Checker'}
                    </p>
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
              <DropdownMenuItem asChild>
                <Link to="/settings/company" className="cursor-pointer min-h-[44px] flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Company Settings
                </Link>
              </DropdownMenuItem>
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
