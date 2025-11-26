import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertCircle, Clock, Search, Plus, ChevronRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useLocationAudits } from "@/hooks/useAudits";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { PullToRefresh } from "@/components/PullToRefresh";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

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

    return audits.filter(audit => {
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <PullToRefresh onRefresh={handleRefresh}>
        <main className="container mx-auto px-4 px-safe py-8 pb-safe">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">All Audits</h1>
              <p className="text-muted-foreground mt-1">View and manage all location and staff audits</p>
            </div>
            <div className="flex gap-2">
              <Link to="/location-audit">
                <Button variant="default" className="gap-2 min-h-[48px]">
                  <Plus className="h-4 w-4" />
                  New Location Audit
                </Button>
              </Link>
              <Link to="/staff-audit/new">
                <Button variant="secondary" className="gap-2 min-h-[48px]">
                  <Plus className="h-4 w-4" />
                  New Staff Performance
                </Button>
              </Link>
            </div>
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
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading audits...</p>
              </div>
            ) : filteredAudits.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {audits?.length === 0 ? "No audits found. Create your first audit!" : "No audits match your filters."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAudits.map((audit) => (
                <div
                  key={audit.id}
                  onClick={() => navigate(`/audits/${audit.id}`)}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors gap-3 cursor-pointer group"
                >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {audit.locations?.name || audit.location || 'Unknown Location'}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {getTemplateType(audit.template_id)}
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
                    <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </div>
                  ))}
                </div>
              )}
            </Card>
        </div>
        </main>
      </PullToRefresh>
    </div>
  );
};

export default Audits;
