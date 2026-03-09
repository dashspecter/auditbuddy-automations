import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileDown, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
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
  localitate?: string;
  serie_id?: string;
  numar_id?: string;
  valabilitate_id?: string;
  cnp?: string;
  domiciliu?: string;
  emisa_de?: string;
  valabila_de_la?: string;
  ocupatia?: string;
  cod_cor?: string;
  valoare_tichet?: number;
  perioada_proba_end?: string;
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

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-fill-contract", {
        body: {
          employee_id: employee.id,
          template_id: selectedTemplateId,
        },
      });

      if (error) {
        // Try to parse the error body for a meaningful message
        const errorBody = typeof error === 'object' && 'context' in error 
          ? (error as any).context?.body 
          : null;
        let message = "Failed to generate contract";
        if (errorBody) {
          try {
            const parsed = typeof errorBody === 'string' ? JSON.parse(errorBody) : errorBody;
            if (parsed?.error) message = parsed.error;
          } catch {}
        } else if (error.message) {
          message = error.message;
        }
        throw new Error(message);
      }

      if (!data?.success || !data?.docx_base64) {
        throw new Error(data?.error || "Failed to generate contract");
      }

      // Convert base64 to blob and download
      const binaryString = atob(data.docx_base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const fileName = data.file_name || 
        `Contract_${employee.full_name?.replace(/\s+/g, "_") || "Employee"}_${format(new Date(), "yyyy-MM-dd")}.docx`;
      saveAs(blob, fileName);

      toast.success(
        `Contract generat! ${data.applied_count}/${data.total_replacements} câmpuri completate.`
      );
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error generating contract:", err);
      if (err.message?.includes("429") || err.message?.includes("Rate limit")) {
        toast.error("Prea multe cereri. Încercați din nou în câteva secunde.");
      } else if (err.message?.includes("402")) {
        toast.error("Credite AI epuizate. Contactați administratorul.");
      } else {
        toast.error(err.message || "Failed to generate contract");
      }
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
                  <p><span className="font-medium">Ocupația:</span> {employee.ocupatia || "N/A"}</p>
                  <p><span className="font-medium">Cod COR:</span> {employee.cod_cor || "N/A"}</p>
                  <p><span className="font-medium">Valoare tichet:</span> {employee.valoare_tichet || "N/A"}</p>
                  {employee.spor_weekend && (
                    <p><span className="font-medium">Spor Weekend:</span> {employee.spor_weekend}</p>
                  )}
                  {employee.is_foreign ? (
                    <>
                      <p className="col-span-2 font-medium mt-2 text-foreground">Permis Ședere:</p>
                      <p><span className="font-medium">Nr. Permis:</span> {employee.nr_permis_sedere || "N/A"}</p>
                      <p><span className="font-medium">Instituție:</span> {employee.permis_institutie_emitenta || "N/A"}</p>
                      <p><span className="font-medium">Data eliberare:</span> {employee.permis_data_eliberare || "N/A"}</p>
                      <p><span className="font-medium">Data expirare:</span> {employee.permis_data_expirare || "N/A"}</p>
                      <p className="col-span-2 font-medium mt-2 text-foreground">Aviz de Muncă:</p>
                      <p><span className="font-medium">Nr. Aviz:</span> {employee.numar_aviz || "N/A"}</p>
                      <p><span className="font-medium">Instituție:</span> {employee.aviz_institutie || "N/A"}</p>
                      <p><span className="font-medium">Data eliberare:</span> {employee.aviz_data_eliberare || "N/A"}</p>
                    </>
                  ) : (
                    <>
                      <p><span className="font-medium">Localitate:</span> {employee.localitate || "N/A"}</p>
                      <p><span className="font-medium">Serie CI:</span> {employee.serie_id || "N/A"}</p>
                      <p><span className="font-medium">Număr CI:</span> {employee.numar_id || "N/A"}</p>
                      <p><span className="font-medium">Emisă de:</span> {employee.emisa_de || "N/A"}</p>
                      <p><span className="font-medium">Valabilă de la:</span> {employee.valabila_de_la || "N/A"}</p>
                      <p><span className="font-medium">Până la:</span> {employee.valabilitate_id || "N/A"}</p>
                    </>
                  )}
                </div>
              </div>

              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-medium">Completare inteligentă cu AI</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  AI-ul va analiza template-ul și va completa automat datele angajatului în contract.
                </p>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={generateContract} disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      AI completează contractul...
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
