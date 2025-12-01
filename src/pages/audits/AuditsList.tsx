import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Calendar } from "lucide-react";
import { useAuditsNew } from "@/hooks/useAuditsNew";
import { useLocations } from "@/hooks/useLocations";
import { format } from "date-fns";

const AuditsList = () => {
  const navigate = useNavigate();
  const [locationFilter, setLocationFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: audits, isLoading } = useAuditsNew();
  const { data: locations } = useLocations();

  const filteredAudits = audits?.filter((audit) => {
    const matchesLocation = !locationFilter || audit.location_id === locationFilter;
    const matchesStatus = !statusFilter || audit.status === statusFilter;
    return matchesLocation && matchesStatus;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Audits</h1>
            <p className="text-muted-foreground mt-1">
              View and manage all audits
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/audits/templates")}>
              <Calendar className="mr-2 h-4 w-4" />
              Manage Templates
            </Button>
            <Button onClick={() => navigate("/audits/schedule")}>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Audit
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Audits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{audits?.length || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                In Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {audits?.filter(a => a.status === "in_progress").length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {audits?.filter(a => a.status === "completed").length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg. Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {audits?.filter(a => a.total_score).length 
                  ? Math.round(
                      audits.filter(a => a.total_score).reduce((sum, a) => sum + (a.total_score || 0), 0) /
                      audits.filter(a => a.total_score).length
                    )
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex gap-4">
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Locations</SelectItem>
                  {locations?.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading audits...</div>
            ) : filteredAudits && filteredAudits.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAudits.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell className="font-medium">
                        {audit.audit_templates?.name}
                      </TableCell>
                      <TableCell>{audit.locations?.name}</TableCell>
                      <TableCell>
                        {audit.completed_at 
                          ? format(new Date(audit.completed_at), "PPP")
                          : audit.started_at
                          ? format(new Date(audit.started_at), "PPP")
                          : format(new Date(audit.created_at), "PPP")
                        }
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          audit.status === "completed" ? "default" :
                          audit.status === "in_progress" ? "secondary" :
                          "outline"
                        }>
                          {audit.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {audit.total_score ? `${audit.total_score}%` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (audit.status === "completed") {
                              navigate(`/audits/${audit.id}`);
                            } else {
                              navigate(`/audits/${audit.id}/perform`);
                            }
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {audit.status === "completed" ? "View" : "Continue"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No audits found.</p>
                <p className="text-sm mt-2">Schedule your first audit to get started.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default AuditsList;
