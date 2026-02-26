import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Users, Star, Briefcase } from "lucide-react";

const ScoutsRoster = () => {
  const { data: company } = useCompany();
  const companyId = company?.id;

  // Get all scouts who have been assigned to company jobs
  const { data: roster = [], isLoading } = useQuery({
    queryKey: ["scouts-roster", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // Get scout IDs from jobs assigned to this company
      const { data: jobs, error: jErr } = await supabase
        .from("scout_jobs")
        .select("assigned_scout_id")
        .eq("company_id", companyId)
        .not("assigned_scout_id", "is", null);

      if (jErr) throw jErr;

      const scoutIds = [...new Set((jobs ?? []).map((j) => j.assigned_scout_id).filter(Boolean))];
      if (scoutIds.length === 0) return [];

      const { data: scouts, error: sErr } = await supabase
        .from("scouts")
        .select("*")
        .in("id", scoutIds);

      if (sErr) throw sErr;

      // Enrich with job counts
      const enriched = await Promise.all(
        (scouts ?? []).map(async (scout) => {
          const { count: totalJobs } = await supabase
            .from("scout_jobs")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("assigned_scout_id", scout.id);

          const { count: approvedJobs } = await supabase
            .from("scout_jobs")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("assigned_scout_id", scout.id)
            .eq("status", "approved");

          return {
            ...scout,
            totalJobs: totalJobs ?? 0,
            approvedJobs: approvedJobs ?? 0,
          };
        })
      );

      return enriched;
    },
    enabled: !!companyId,
  });

  const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-600 border-green-200",
    pending: "bg-amber-500/10 text-amber-600 border-amber-200",
    inactive: "bg-muted text-muted-foreground",
    suspended: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Scout Roster</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        Scouts who have worked on your company's jobs.
      </p>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Total Jobs</TableHead>
                <TableHead>Approved</TableHead>
                <TableHead>Reliability</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : roster.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No scouts have worked on your jobs yet.
                  </TableCell>
                </TableRow>
              ) : (
                roster.map((scout: any) => (
                  <TableRow key={scout.id}>
                    <TableCell className="font-medium">{scout.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{scout.city ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[scout.status] ?? ""}>
                        {scout.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {scout.rating ? (
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          {scout.rating.toFixed(1)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        {scout.totalJobs}
                      </span>
                    </TableCell>
                    <TableCell>{scout.approvedJobs}</TableCell>
                    <TableCell>
                      {scout.reliability_score != null
                        ? `${(scout.reliability_score * 100).toFixed(0)}%`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScoutsRoster;
