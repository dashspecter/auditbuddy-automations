import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";

interface Employee {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: string;
  hire_date?: string;
  contract_type?: string;
  base_salary?: number;
  hourly_rate?: number;
  annual_vacation_days?: number;
  locations?: { name: string };
}

interface ContractTemplate {
  id: string;
  title: string;
  file_url: string;
}

interface GenerateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export function GenerateContractDialog({
  open,
  onOpenChange,
  employee,
}: GenerateContractDialogProps) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Extra contract fields
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [workingDays, setWorkingDays] = useState("Monday - Friday");
  const [workingHours, setWorkingHours] = useState("9:00 AM - 5:00 PM");

  useEffect(() => {
    if (open && user) {
      fetchTemplates();
    }
  }, [open, user]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data: companyUser } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", user!.id)
        .single();

      if (!companyUser) return;

      const { data, error } = await supabase
        .from("documents")
        .select("id, title, file_url")
        .eq("company_id", companyUser.company_id)
        .eq("document_type", "contract_template")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
      if (data && data.length > 0) {
        setSelectedTemplateId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateContract = async () => {
    if (!employee || !selectedTemplateId) {
      toast.error("Please select a template");
      return;
    }

    const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
    if (!selectedTemplate) {
      toast.error("Template not found");
      return;
    }

    setGenerating(true);
    try {
      // Fetch the template file
      const response = await fetch(selectedTemplate.file_url);
      if (!response.ok) throw new Error("Failed to fetch template");

      const arrayBuffer = await response.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
      });

      // Prepare data for placeholders
      const data = {
        full_name: employee.full_name || "",
        email: employee.email || "",
        phone: employee.phone || "",
        role: employee.role || "",
        location: employee.locations?.name || "",
        hire_date: employee.hire_date
          ? format(new Date(employee.hire_date), "MMMM dd, yyyy")
          : "",
        contract_type: employee.contract_type || "Full-time",
        base_salary: employee.base_salary
          ? `$${employee.base_salary.toLocaleString()}`
          : "",
        hourly_rate: employee.hourly_rate
          ? `$${employee.hourly_rate.toFixed(2)}/hour`
          : "",
        vacation_days: employee.annual_vacation_days?.toString() || "25",
        start_date: format(new Date(startDate), "MMMM dd, yyyy"),
        working_days: workingDays,
        working_hours: workingHours,
        current_date: format(new Date(), "MMMM dd, yyyy"),
      };

      // Render the document
      doc.render(data);

      // Generate the output
      const out = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // Save as DOCX (for now, PDF conversion requires server-side processing)
      const fileName = `Contract_${employee.full_name.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.docx`;
      saveAs(out, fileName);

      toast.success("Contract generated and downloaded!");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error generating contract:", error);
      toast.error(error.message || "Failed to generate contract");
    } finally {
      setGenerating(false);
    }
  };

  if (!employee) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Contract</DialogTitle>
          <DialogDescription>
            Generate a contract for {employee.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No contract templates found.</p>
              <p className="text-sm mt-1">
                Please upload a contract template first.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Contract Template</Label>
                <Select
                  value={selectedTemplateId}
                  onValueChange={setSelectedTemplateId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4 space-y-4">
                <h4 className="font-medium text-sm">Contract Details</h4>

                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workingDays">Working Days</Label>
                  <Input
                    id="workingDays"
                    value={workingDays}
                    onChange={(e) => setWorkingDays(e.target.value)}
                    placeholder="e.g., Monday - Friday"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workingHours">Working Hours</Label>
                  <Input
                    id="workingHours"
                    value={workingHours}
                    onChange={(e) => setWorkingHours(e.target.value)}
                    placeholder="e.g., 9:00 AM - 5:00 PM"
                  />
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-1">Employee Info Preview:</p>
                <div className="text-muted-foreground text-xs space-y-0.5">
                  <p>Name: {employee.full_name}</p>
                  <p>Role: {employee.role}</p>
                  <p>Location: {employee.locations?.name || "N/A"}</p>
                  {employee.base_salary && (
                    <p>Salary: ${employee.base_salary.toLocaleString()}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={generateContract} disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileDown className="mr-2 h-4 w-4" />
                      Download Contract
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
