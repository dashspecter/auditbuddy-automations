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
import expressions from "angular-expressions";

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
  // ID Document fields (Romanian)
  localitate?: string;
  serie_id?: string;
  numar_id?: string;
  valabilitate_id?: string;
  cnp?: string;
  // Additional contract fields
  domiciliu?: string;
  emisa_de?: string;
  valabila_de_la?: string;
  ocupatia?: string;
  cod_cor?: string;
  valoare_tichet?: number;
  perioada_proba_end?: string;
  // Foreign employee fields
  is_foreign?: boolean;
  nr_permis_sedere?: string;
  permis_institutie_emitenta?: string;
  permis_data_eliberare?: string;
  permis_data_expirare?: string;
  numar_aviz?: string;
  aviz_data_eliberare?: string;
  aviz_institutie?: string;
  spor_weekend?: number;
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
      // Refetch employee data to ensure we have all fields
      const { data: freshEmployee, error: employeeError } = await supabase
        .from("employees")
        .select(`
          full_name, localitate, serie_id, numar_id, valabilitate_id, cnp,
          domiciliu, emisa_de, valabila_de_la, ocupatia, cod_cor, 
          valoare_tichet, perioada_proba_end, hire_date, base_salary,
          is_foreign, nr_permis_sedere, permis_institutie_emitenta,
          permis_data_eliberare, permis_data_expirare, numar_aviz,
          aviz_data_eliberare, aviz_institutie, spor_weekend,
          locations(name)
        `)
        .eq("id", employee.id)
        .single();

      if (employeeError || !freshEmployee) {
        throw new Error("Failed to fetch employee data");
      }

      console.log("Fresh employee data from DB:", freshEmployee);

      // Fetch the template file
      const response = await fetch(selectedTemplate.file_url);
      if (!response.ok) throw new Error("Failed to fetch template");

      const arrayBuffer = await response.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      
      // Create angular-expressions parser that handles missing values gracefully
      const angularParser = (tag: string) => {
        // Check if tag is empty or only whitespace
        if (!tag || tag.trim() === '') {
          return {
            get: () => ""
          };
        }
        
        try {
          const expr = expressions.compile(tag.replace(/'/g, "'"));
          return {
            get: (scope: any) => {
              try {
                const result = expr(scope);
                return result !== undefined && result !== null ? result : "";
              } catch {
                return "";
              }
            }
          };
        } catch {
          // If expression compilation fails, return empty string
          return {
            get: () => ""
          };
        }
      };

      // Configure docxtemplater with error handling for missing placeholders
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "{{", end: "}}" },
        parser: angularParser,
      });

      // Format dates if they're date strings
      const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return "";
        if (dateStr.includes('-')) {
          return format(new Date(dateStr), "dd.MM.yyyy");
        }
        return String(dateStr);
      };

      const data = {
        // Employee name variants used in the document
        "nume angajat": freshEmployee.full_name ?? "",
        "nume salariat": freshEmployee.full_name ?? "",
        "nume complet": freshEmployee.full_name ?? "",
        
        // Address and location
        "domiciliu": freshEmployee.domiciliu ?? "",
        "localitate": freshEmployee.localitate ?? "",
        "punct de lucru": (freshEmployee.locations as any)?.name ?? "",
        
        // ID Document fields (Romanian)
        "seria ci": freshEmployee.serie_id ?? "",
        "nr ci": freshEmployee.numar_id ?? "",
        "emisa de": freshEmployee.emisa_de ?? "",
        "valabila de la": formatDate(freshEmployee.valabila_de_la),
        "pana la": formatDate(freshEmployee.valabilitate_id),
        "CNP": freshEmployee.cnp ?? "",
        "cnp": freshEmployee.cnp ?? "",
        
        // Foreign employee - Residence Permit
        "nr permis sedere": freshEmployee.nr_permis_sedere ?? "",
        "institutie emitenta": freshEmployee.permis_institutie_emitenta ?? "",
        "data eliberare": formatDate(freshEmployee.permis_data_eliberare),
        "data expirare": formatDate(freshEmployee.permis_data_expirare),
        
        // Foreign employee - Work Permit (Aviz)
        "numar aviz": freshEmployee.numar_aviz ?? "",
        "institutie": freshEmployee.aviz_institutie ?? "",
        
        // Job details
        "ocupatia": freshEmployee.ocupatia ?? "",
        "cod cor": freshEmployee.cod_cor ?? "",
        
        // Dates
        "data incepere activitate": formatDate(freshEmployee.hire_date),
        "perioada de proba": formatDate(freshEmployee.perioada_proba_end),
        
        // Salary details
        "valoare salariu": freshEmployee.base_salary?.toString() ?? "",
        "valoare spor weekend": freshEmployee.spor_weekend?.toString() ?? "",
        "valoare tichet": freshEmployee.valoare_tichet?.toString() ?? "",
        
        // Legacy field names for compatibility
        "serie id": freshEmployee.serie_id ?? "",
        "numar id": freshEmployee.numar_id ?? "",
        "valabilitate id": formatDate(freshEmployee.valabilitate_id),
      };

      console.log("Template data being used:", data);

      // Render the document
      try {
        doc.render(data);
      } catch (renderError: any) {
        console.error("Render error details:", renderError);
        if (renderError.properties && renderError.properties.errors) {
          const errors = renderError.properties.errors;
          console.error("Template errors:", errors);
          const errorMessages = errors
            .slice(0, 3) // Show first 3 errors
            .map((e: any) => {
              const id = e.properties?.id || e.properties?.xtag || 'Unknown placeholder';
              return `"${id}"`;
            })
            .join(", ");
          const moreCount = errors.length > 3 ? ` (+${errors.length - 3} more)` : "";
          throw new Error(`Template has invalid placeholders: ${errorMessages}${moreCount}`);
        }
        throw renderError;
      }

      // Generate the output
      const out = doc.getZip().generate({
        type: "blob",
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      // Save as DOCX
      const fileName = `Contract_${freshEmployee.full_name?.replace(/\s+/g, "_") || "Employee"}_${format(new Date(), "yyyy-MM-dd")}.docx`;
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

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-2">Date Angajat:</p>
                <div className="text-muted-foreground text-xs grid grid-cols-2 gap-x-4 gap-y-1">
                  <p><span className="font-medium">Nume:</span> {employee.full_name}</p>
                  <p><span className="font-medium">CNP:</span> {employee.cnp || "N/A"}</p>
                  <p><span className="font-medium">Domiciliu:</span> {employee.domiciliu || "N/A"}</p>
                  <p><span className="font-medium">Localitate:</span> {employee.localitate || "N/A"}</p>
                  <p><span className="font-medium">Serie CI:</span> {employee.serie_id || "N/A"}</p>
                  <p><span className="font-medium">Număr CI:</span> {employee.numar_id || "N/A"}</p>
                  <p><span className="font-medium">Emisă de:</span> {employee.emisa_de || "N/A"}</p>
                  <p><span className="font-medium">Valabilă de la:</span> {employee.valabila_de_la || "N/A"}</p>
                  <p><span className="font-medium">Până la:</span> {employee.valabilitate_id || "N/A"}</p>
                  <p><span className="font-medium">Ocupația:</span> {employee.ocupatia || "N/A"}</p>
                  <p><span className="font-medium">Cod COR:</span> {employee.cod_cor || "N/A"}</p>
                  <p><span className="font-medium">Valoare tichet:</span> {employee.valoare_tichet || "N/A"}</p>
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
