import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ExtractedField {
  key: string;
  label: string;
  value: string;
  currentValue: string;
  selected: boolean;
}

interface ScanIdDocumentButtonProps {
  formData: Record<string, any>;
  onApplyFields: (fields: Record<string, string | boolean>) => void;
}

const FIELD_LABELS: Record<string, string> = {
  full_name: "Nume Complet",
  cnp: "CNP",
  domiciliu: "Domiciliu",
  localitate: "Localitate",
  serie_id: "Serie CI",
  numar_id: "Număr CI",
  emisa_de: "Emisă de",
  valabila_de_la: "Valabilă de la",
  valabilitate_id: "Valabilitate",
  is_foreign: "Angajat Străin",
  nr_permis_sedere: "Nr. Permis Ședere",
  permis_institutie_emitenta: "Instituție Emitentă",
  permis_data_eliberare: "Data Eliberare Permis",
  permis_data_expirare: "Data Expirare Permis",
  numar_aviz: "Număr Aviz",
  aviz_institutie: "Instituție Aviz",
  aviz_data_eliberare: "Data Eliberare Aviz",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  carte_identitate: "Carte de Identitate",
  pasaport: "Pașaport",
  permis_sedere: "Permis de Ședere",
  aviz_munca: "Aviz de Muncă",
};

export function ScanIdDocumentButton({ formData, onApplyFields }: ScanIdDocumentButtonProps) {
  const [scanning, setScanning] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [documentType, setDocumentType] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (!file.type.startsWith("image/") && !file.name.toLowerCase().endsWith(".heic")) {
      toast.error("Vă rugăm selectați o imagine (JPG, PNG sau HEIC)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imaginea este prea mare. Maxim 10MB.");
      return;
    }

    setScanning(true);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("scan-id-document", {
        body: { image_base64: base64 },
      });

      if (error) {
        throw new Error(error.message || "Eroare la scanare");
      }

      if (!data?.success || !data?.data) {
        throw new Error(data?.error || "Nu s-au putut extrage datele");
      }

      const extracted = data.data;
      setDocumentType(extracted.document_type || "");

      // Build fields for review, excluding document_type
      const fields: ExtractedField[] = [];
      for (const [key, value] of Object.entries(extracted)) {
        if (key === "document_type" || value === undefined || value === null || value === "") continue;

        const currentValue = formData[key];
        const stringValue = String(value);
        const currentString = currentValue !== undefined && currentValue !== null ? String(currentValue) : "";

        // Auto-select if current field is empty
        fields.push({
          key,
          label: FIELD_LABELS[key] || key,
          value: stringValue,
          currentValue: currentString,
          selected: !currentString || currentString === "false",
        });
      }

      if (fields.length === 0) {
        toast.error("Nu s-au putut extrage date din imagine. Încercați o imagine mai clară.");
        return;
      }

      setExtractedFields(fields);
      setReviewOpen(true);
    } catch (err: any) {
      console.error("Scan error:", err);
      if (err.message?.includes("429") || err.message?.includes("Rate limit")) {
        toast.error("Prea multe cereri. Încercați din nou în câteva secunde.");
      } else if (err.message?.includes("402")) {
        toast.error("Credite AI epuizate. Contactați administratorul.");
      } else {
        toast.error(err.message || "Eroare la scanarea documentului");
      }
    } finally {
      setScanning(false);
    }
  };

  const toggleField = (index: number) => {
    setExtractedFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, selected: !f.selected } : f))
    );
  };

  const handleApply = () => {
    const fieldsToApply: Record<string, string | boolean> = {};
    for (const field of extractedFields) {
      if (field.selected) {
        if (field.key === "is_foreign") {
          fieldsToApply[field.key] = field.value === "true";
        } else {
          fieldsToApply[field.key] = field.value;
        }
      }
    }

    onApplyFields(fieldsToApply);
    setReviewOpen(false);
    toast.success(`${Object.keys(fieldsToApply).length} câmpuri completate din document`);
  };

  const selectedCount = extractedFields.filter((f) => f.selected).length;

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={scanning}
          className="w-full"
        >
          {scanning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Se scanează documentul...
            </>
          ) : (
            <>
              <Camera className="mr-2 h-4 w-4" />
              Scanează Buletin / Permis de Ședere
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Date Extrase din Document</DialogTitle>
            <DialogDescription>
              {documentType && (
                <span className="font-medium text-foreground">
                  {DOCUMENT_TYPE_LABELS[documentType] || documentType}
                </span>
              )}
              {" — "}Selectați câmpurile pe care doriți să le completați automat.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 pr-3">
              {extractedFields.map((field, index) => (
                <div
                  key={field.key}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    field.selected
                      ? "bg-primary/5 border-primary/30"
                      : "bg-muted/20 border-border"
                  }`}
                  onClick={() => toggleField(index)}
                >
                  <Checkbox
                    checked={field.selected}
                    onCheckedChange={() => toggleField(index)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <Label className="text-xs font-medium text-muted-foreground">
                      {field.label}
                    </Label>
                    <p className="text-sm font-medium text-foreground truncate">
                      {field.key === "is_foreign"
                        ? field.value === "true"
                          ? "Da"
                          : "Nu"
                        : field.value}
                    </p>
                    {field.currentValue && field.currentValue !== "false" && field.currentValue !== "" && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Actual: <span className="line-through">{field.currentValue}</span>
                      </p>
                    )}
                  </div>
                  {field.selected ? (
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Anulează
            </Button>
            <Button onClick={handleApply} disabled={selectedCount === 0}>
              Aplică {selectedCount} câmpuri
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
