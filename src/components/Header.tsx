import { Button } from "@/components/ui/button";
import { ClipboardCheck, LogOut, User, Settings, Download } from "lucide-react";
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
        a.download = `dashspect-${name}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      });

      setExportDialogOpen(false);
      toast({
        title: "Data exported successfully",
        description: `Exported ${exports.length} file(s).`,
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };
  
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
            <span className="text-xl font-bold">Dashspect</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="hover:text-accent transition-colors">
              Dashboard
            </Link>
            <Link to="/audits" className="hover:text-accent transition-colors">
              Audits
            </Link>
            <Link to="/admin/templates" className="hover:text-accent transition-colors">
              Templates
            </Link>
            <Link to="/reports" className="hover:text-accent transition-colors">
              Reports
            </Link>
            <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export Data
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>From Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !dateFrom && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateFrom ? format(dateFrom, "PP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
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
                                "w-full justify-start text-left font-normal",
                                !dateTo && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dateTo ? format(dateTo, "PP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
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
                  <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleExportData} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export Selected Data
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
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
