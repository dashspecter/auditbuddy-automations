import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { StaffLeaderboard } from "@/components/StaffLeaderboard";
import { EmployeeLeaderboard } from "@/components/dashboard/EmployeeLeaderboard";
import { useStaffAudits, useCreateStaffAudit } from "@/hooks/useStaffAudits";
import { useEmployees } from "@/hooks/useEmployees";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { LocationSelector } from "@/components/LocationSelector";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function StaffAudits() {
  const navigate = useNavigate();
  const { data: audits, isLoading } = useStaffAudits();
  const createStaffAudit = useCreateStaffAudit();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    location_id: "",
    employee_id: "",
    audit_date: new Date().toISOString().split("T")[0],
    score: 70,
    notes: "",
  });

  const { data: employees } = useEmployees(
    formData.location_id && formData.location_id !== "__all__" 
      ? formData.location_id 
      : undefined
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.location_id) {
      toast.error("Please select a location");
      return;
    }

    if (!formData.employee_id) {
      toast.error("Please select an employee");
      return;
    }

    createStaffAudit.mutate(
      {
        location_id: formData.location_id,
        employee_id: formData.employee_id,
        audit_date: formData.audit_date,
        score: formData.score,
        notes: formData.notes || null,
        template_id: null,
        custom_data: null,
      },
      {
        onSuccess: () => {
          toast.success("Performance audit submitted successfully");
          setIsFormOpen(false);
          setFormData({
            location_id: "",
            employee_id: "",
            audit_date: new Date().toISOString().split("T")[0],
            score: 70,
            notes: "",
          });
        },
      }
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-3 sm:p-6 space-y-3 sm:space-y-6 px-safe">
        <div className="space-y-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-foreground leading-tight">Employee Performance</h1>
            <p className="text-xs sm:text-base text-muted-foreground mt-0.5 sm:mt-2">
              Track and evaluate employee performance
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => navigate('/staff-audit/new')} 
              className="gap-1.5 w-full sm:w-auto text-sm h-9"
            >
              <Plus className="h-4 w-4" />
              New Staff Audit
            </Button>
            <Button 
              onClick={() => setIsFormOpen(!isFormOpen)} 
              variant="outline" 
              className="gap-1.5 w-full sm:w-auto text-sm h-9"
            >
              {isFormOpen ? <ChevronUp className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              New Performance Review
            </Button>
          </div>
        </div>

        <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen}>
          <CollapsibleContent>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Submit Performance Review</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <LocationSelector
                      id="location"
                      value={formData.location_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, location_id: value, employee_id: "" })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employee">Employee</Label>
                    <Select
                      value={formData.employee_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, employee_id: value })
                      }
                      disabled={!formData.location_id || !employees || employees.length === 0}
                    >
                      <SelectTrigger id="employee">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.full_name} - {employee.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="audit_date">Review Date</Label>
                    <Input
                      type="date"
                      id="audit_date"
                      value={formData.audit_date}
                      onChange={(e) =>
                        setFormData({ ...formData, audit_date: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Performance Score: {formData.score}%</Label>
                    <Slider
                      value={[formData.score]}
                      onValueChange={(value) =>
                        setFormData({ ...formData, score: value[0] })
                      }
                      min={0}
                      max={100}
                      step={1}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any observations or comments..."
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      rows={6}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={createStaffAudit.isPending}
                      className="w-full sm:w-auto"
                    >
                      {createStaffAudit.isPending ? "Submitting..." : "Submit Review"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EmployeeLeaderboard />
          <StaffLeaderboard />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Staff Performance Records</CardTitle>
            <CardDescription>
              Complete history of all staff performance audits
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : audits && audits.length > 0 ? (
              <div className="space-y-3">
                {audits.map((audit) => (
                  <div
                    key={audit.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-foreground">
                          {audit.employees?.full_name}
                        </h3>
                        <Badge variant="outline">{audit.employees?.role}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{audit.locations?.name}</span>
                        <span>•</span>
                        <span>{format(new Date(audit.audit_date), "MMM dd, yyyy")}</span>
                      </div>
                      {audit.notes && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {audit.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getScoreColor(audit.score)}>
                        {audit.score}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No staff performance records found. Create your first one above!
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
