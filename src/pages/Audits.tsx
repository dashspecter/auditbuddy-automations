import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Clock, Search, Plus, ChevronRight, Library, FileEdit, Trash2, MapPin, Users, UserSearch, Gift, Calendar, CalendarClock, Image } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "react-router-dom";
import { useLocationAudits } from "@/hooks/useAudits";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { SwipeableListItem } from "@/components/SwipeableListItem";
import ModuleTourWrapper from "@/components/onboarding/ModuleTourWrapper";
import { MODULE_TOURS } from "@/config/moduleTours";
import { ModuleGate } from "@/components/ModuleGate";
import { EmptyState } from "@/components/EmptyState";

const auditsSubItems = [
  { title: "Location Audits", url: "/audits", icon: MapPin, description: "Location audits", isCurrent: true },
  { title: "Employee Audits", url: "/staff-audits", icon: Users, description: "Staff audits" },
  { title: "Mystery Shopper", url: "/audits/mystery-shopper", icon: UserSearch, description: "Mystery visits" },
  { title: "Templates", url: "/audits/templates", icon: Library, description: "Audit templates" },
  { title: "Calendar", url: "/audits-calendar", icon: Calendar, description: "Audit calendar" },
  { title: "Schedules", url: "/recurring-schedules", icon: CalendarClock, description: "Recurring audits" },
  { title: "Photo Gallery", url: "/photos", icon: Image, description: "All photos" },
];

const Audits = () => {
  const navigate = useNavigate();
  const { data: audits, isLoading, refetch } = useLocationAudits();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all-status");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch user profiles to get checker names
  const { data: profiles } = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email');
      if (error) throw error;
      return data;
    },
  });

  // Get checker name by user_id
  const getCheckerName = (userId: string) => {
    const profile = profiles?.find(p => p.id === userId);
    return profile?.full_name || profile?.email?.split('@')[0] || 'Unknown';
  };

  // Get template type by template_id
  const { data: templates } = useQuery({
    queryKey: ['audit_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_templates')
        .select('id, template_type');
      if (error) throw error;
      return data;
    },
  });

  const getTemplateType = (templateId: string | null | undefined) => {
    if (!templateId) return 'location';
    const template = templates?.find(t => t.id === templateId);
    return template?.template_type || 'location';
  };

  // Filter and search audits
  const filteredAudits = useMemo(() => {
    if (!audits) return [];

    return audits
      .filter(audit => {
        // Search filter
        const searchLower = searchQuery.toLowerCase();
        const checkerName = getCheckerName(audit.user_id).toLowerCase();
        const locationName = audit.locations?.name || audit.location || '';
        const matchesSearch = 
          locationName.toLowerCase().includes(searchLower) ||
          checkerName.includes(searchLower);

        if (!matchesSearch) return false;

        // Type filter
        const auditType = getTemplateType(audit.template_id);
        if (typeFilter !== "all" && auditType !== typeFilter) return false;

        // Status filter
        if (statusFilter !== "all-status" && audit.status !== statusFilter) return false;

        return true;
      })
      .sort((a, b) => {
        // Sort: completed audits first, then drafts
        // Within each group, sort by date (newest first)
        const aIsDraft = a.status === 'draft';
        const bIsDraft = b.status === 'draft';
        
        if (aIsDraft && !bIsDraft) return 1;
        if (!aIsDraft && bIsDraft) return -1;
        
        // If both same type, sort by date
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [audits, searchQuery, typeFilter, statusFilter, profiles, templates]);

  const handleRefresh = async () => {
    await refetch();
    await queryClient.invalidateQueries({ queryKey: ['location_audits'] });
    await queryClient.invalidateQueries({ queryKey: ['profiles'] });
    await queryClient.invalidateQueries({ queryKey: ['audit_templates'] });
    toast({
      title: "Refreshed",
      description: "Audits data has been updated.",
    });
  };

  return (
    <ModuleGate module="location_audits">
      <ModuleTourWrapper
        moduleName="location_audits"
        steps={MODULE_TOURS.location_audits.steps}
        moduleIcon={MODULE_TOURS.location_audits.icon}
      >
        <PullToRefresh onRefresh={handleRefresh}>
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Audits</h1>
                <p className="text-muted-foreground mt-1">View and manage all location and staff audits</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 w-full sm:w-auto" data-tour="templates-menu">
                      <Library className="h-4 w-4" />
                      Templates
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => navigate('/admin/template-library')} className="gap-2 cursor-pointer">
                      <Library className="h-4 w-4" />
                      Template Library
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Link to="/audits/vouchers" className="w-full sm:w-auto">
                  <Button variant="outline" className="gap-2 w-full">
                    <Gift className="h-4 w-4" />
                    Vouchers
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" className="gap-2 w-full sm:w-auto" data-tour="new-audit-button">
                      <Plus className="h-4 w-4" />
                      New Audit
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => navigate('/location-audit')} className="gap-2 cursor-pointer">
                      <MapPin className="h-4 w-4" />
                      Location Audit
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => navigate('/staff-audit/new')} className="gap-2 cursor-pointer">
                      <Users className="h-4 w-4" />
                      Employee Audit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Mobile-first quick navigation to subitems */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {auditsSubItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.url} to={item.url}>
                    <Card className={`hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full ${item.isCurrent ? 'border-primary bg-primary/5' : ''}`}>
                      <CardContent className="p-3 flex flex-col items-center text-center gap-2">
                        <div className={`p-2 rounded-lg ${item.isCurrent ? 'bg-primary/20' : 'bg-primary/10'}`}>
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="font-medium text-xs">{item.title}</div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

          <Card className="p-6">
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by location or checker..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="location">Location</SelectItem>
                  <SelectItem value="staff">Staff Performance</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-status">All Status</SelectItem>
                  <SelectItem value="compliant">Compliant</SelectItem>
                  <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading audits...</p>
              </div>
            ) : filteredAudits.length === 0 ? (
              <EmptyState
                icon={FileEdit}
                title={audits?.length === 0 ? "No Audits Yet" : "No Matching Audits"}
                description={audits?.length === 0 ? "Create your first audit using the button above." : "No audits match your current filters."}
              />
            ) : (
              <div className="space-y-3">
                {filteredAudits.map((audit) => (
                  <SwipeableListItem
                    key={audit.id}
                    onDelete={async () => {
                      try {
                        const { error } = await supabase
                          .from('location_audits')
                          .delete()
                          .eq('id', audit.id);

                        if (error) throw error;

                        toast({
                          title: "Audit deleted",
                          description: "The audit has been successfully deleted.",
                        });
                        
                        // Invalidate queries to refresh the list
                        await queryClient.invalidateQueries({ queryKey: ['location_audits'] });
                      } catch (error) {
                        console.error('Error deleting audit:', error);
                        toast({
                          title: "Error",
                          description: "Failed to delete audit. Please try again.",
                          variant: "destructive",
                        });
                      }
                    }}
                    className="rounded-lg"
                  >
                    <div
                      onClick={() => navigate(`/audits/${audit.id}`)}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors gap-3 cursor-pointer group"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">
                            {audit.locations?.name || audit.location || 'Unknown Location'}
                          </p>
                          <Badge 
                            variant={getTemplateType(audit.template_id) === 'staff' ? 'staff' : 'location'} 
                            className="text-xs"
                          >
                            {getTemplateType(audit.template_id) === 'staff' ? 'Staff Audit' : 'Location Audit'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Checked by {getCheckerName(audit.user_id)} • {format(new Date(audit.audit_date), 'yyyy-MM-dd')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {audit.overall_score !== null && audit.overall_score !== undefined && (
                          <span className="text-lg font-bold text-foreground">
                            {audit.overall_score}%
                          </span>
                        )}
                        {audit.status === "compliant" && (
                          <Badge className="bg-success text-success-foreground gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Compliant
                          </Badge>
                        )}
                        {audit.status === "non-compliant" && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Issues Found
                          </Badge>
                        )}
                        {audit.status === "pending" && (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                        {audit.status === "draft" && (
                          <>
                            <Badge variant="secondary" className="gap-1">
                              <FileEdit className="h-3 w-3" />
                              Draft
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  const { error } = await supabase
                                    .from('location_audits')
                                    .delete()
                                    .eq('id', audit.id);

                                  if (error) throw error;

                                  toast({
                                    title: "Draft deleted",
                                    description: "The draft audit has been deleted.",
                                  });
                                  
                                  await queryClient.invalidateQueries({ queryKey: ['location_audits'] });
                                } catch (error) {
                                  console.error('Error deleting draft:', error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to delete draft.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  </SwipeableListItem>
                ))}
              </div>
            )}
            </Card>
        </div>
      </PullToRefresh>
    </ModuleTourWrapper>
    </ModuleGate>
  );
};

export default Audits;
