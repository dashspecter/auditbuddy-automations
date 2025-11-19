import { Button } from "@/components/ui/button";
import { ClipboardCheck, LogOut, User, Settings, Download, Menu, Megaphone, FileText, History } from "lucide-react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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
  const { user, signOut } = useAuth();
  const { data: roleData, isLoading } = useUserRole();
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

  return (
    <header className="bg-header text-header-foreground border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2 md:gap-3">
            <div className="bg-primary rounded-full p-1.5 md:p-2">
              <ClipboardCheck className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
            </div>
            <span className="text-lg md:text-xl font-bold">Dashspect</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="hover:text-accent transition-colors min-h-[44px] flex items-center">
              Dashboard
            </Link>
            <Link to="/audits" className="hover:text-accent transition-colors min-h-[44px] flex items-center">
              Audits
            </Link>
            {(roleData?.isAdmin || roleData?.isManager) && (
              <>
                <Link to="/admin/templates" className="hover:text-accent transition-colors min-h-[44px] flex items-center">
                  Templates
                </Link>
                <Link to="/reports" className="hover:text-accent transition-colors min-h-[44px] flex items-center">
                  Reports
                </Link>
                <Link to="/notifications" className="hover:text-accent transition-colors min-h-[44px] flex items-center">
                  Notifications
                </Link>
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
        
        <div className="flex items-center gap-2 md:gap-4">
          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden min-h-[44px] min-w-[44px]">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px]">
              <nav className="flex flex-col gap-4 mt-8">
                <Link 
                  to="/" 
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ClipboardCheck className="h-5 w-5" />
                  <span className="text-base font-medium">Dashboard</span>
                </Link>
                <Link 
                  to="/audits" 
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ClipboardCheck className="h-5 w-5" />
                  <span className="text-base font-medium">Audits</span>
                </Link>
                {(roleData?.isAdmin || roleData?.isManager) && (
                  <>
                    <Link 
                      to="/admin/templates" 
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <ClipboardCheck className="h-5 w-5" />
                      <span className="text-base font-medium">Templates</span>
                    </Link>
                    <Link 
                      to="/reports" 
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Download className="h-5 w-5" />
                      <span className="text-base font-medium">Reports</span>
                    </Link>
                    <Link 
                      to="/notifications" 
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Megaphone className="h-5 w-5" />
                      <span className="text-base font-medium">Notifications</span>
                    </Link>
                  </>
                )}
                {(roleData?.isAdmin || roleData?.isManager) && (
                  <Link 
                    to="/admin/users" 
                    className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-5 w-5" />
                    <span className="text-base font-medium">User Management</span>
                  </Link>
                )}
                <div className="border-t border-border my-2"></div>
                <Link 
                  to="/settings" 
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-base font-medium">Settings</span>
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
          <NotificationDropdown />

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
              {(roleData?.isAdmin || roleData?.isManager) && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/users" className="cursor-pointer min-h-[44px] flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      User Management
                    </Link>
                  </DropdownMenuItem>
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
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer min-h-[44px] flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
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
