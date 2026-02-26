import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Scale, Package, Check, ArrowLeft, Loader2 } from "lucide-react";
import { useWasteProducts, useWasteReasons, useCreateWasteEntry, useUpdateWasteEntry, uploadWastePhoto } from "@/hooks/useWaste";
import { useLocations } from "@/hooks/useLocations";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import { ModuleGate } from "@/components/ModuleGate";
import { useSmartBack } from "@/hooks/useSmartBack";

export default function AdminAddWasteEntry() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { data: company } = useCompany();
  const goBack = useSmartBack({ adminFallback: "/admin/waste/entries" });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products, isLoading: productsLoading } = useWasteProducts();
  const { data: reasons } = useWasteReasons();
  const { data: locations } = useLocations();
  const createEntry = useCreateWasteEntry();
  const updateEntry = useUpdateWasteEntry();

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    location_id: "",
    waste_product_id: "",
    waste_reason_id: "",
    weight_kg: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-select location if only one
  useEffect(() => {
    if (locations?.length === 1 && !formData.location_id) {
      setFormData(prev => ({ ...prev, location_id: locations[0].id }));
    }
  }, [locations, formData.location_id]);

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.location_id || !formData.waste_product_id || !formData.weight_kg || !formData.waste_reason_id || !photoFile) {
      toast({
        title: "Missing required fields",
        description: "Please select a location, product, reason, enter the weight, and attach a photo",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the waste entry
      const entry = await createEntry.mutateAsync({
        location_id: formData.location_id,
        waste_product_id: formData.waste_product_id,
        waste_reason_id: formData.waste_reason_id,
        weight_kg: parseFloat(formData.weight_kg.replace(',', '.')),
        notes: formData.notes || null,
      });

      // Upload photo if present
      if (photoFile && company?.id && entry?.id) {
        try {
          const photoPath = await uploadWastePhoto(
            company.id,
            formData.location_id,
            entry.id,
            photoFile
          );
          
          // Update entry with photo path
          await updateEntry.mutateAsync({
            id: entry.id,
            photo_path: photoPath,
          });
        } catch (photoError) {
          console.error("Photo upload failed:", photoError);
          toast({
            title: "Entry saved",
            description: "Waste logged but photo upload failed. You can retry from entries list.",
          });
        }
      }

      toast({
        title: "Waste logged",
        description: "Entry has been recorded successfully",
      });
      
      // Navigate based on current context (pathname), not viewport
      if (location.pathname.startsWith('/admin')) {
        navigate("/admin/waste/entries", { replace: true });
      } else {
        navigate("/staff/waste", { replace: true });
      }
    } catch (error: any) {
      console.error("Failed to create waste entry:", error);
      const msg = error?.message || "Unknown error";
      toast({
        title: "Error",
        description: `Failed to log waste entry: ${msg}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProduct = products?.find(p => p.id === formData.waste_product_id);
  const estimatedCost = selectedProduct && formData.weight_kg 
    ? (selectedProduct.unit_cost * parseFloat(formData.weight_kg.replace(',', '.'))).toFixed(2)
    : null;

  return (
    <ModuleGate module="wastage">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Add Waste Entry</h1>
            <p className="text-muted-foreground">Record a new waste entry</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Location */}
              {locations && locations.length > 1 && (
                <div className="space-y-2">
                  <Label>Location *</Label>
                  <Select
                    value={formData.location_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, location_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Product */}
              <div className="space-y-2">
                <Label>Product *</Label>
                {productsLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading products...
                  </div>
                ) : products && products.length > 0 ? (
                  <Select
                    value={formData.waste_product_id}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, waste_product_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span>{product.name}</span>
                            {product.category && (
                              <span className="text-muted-foreground text-xs">({product.category})</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="text-muted-foreground text-sm p-3 bg-muted rounded-md">
                    No waste products configured. Add products in Wastage → Products.
                  </div>
                )}
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Select
                  value={formData.waste_reason_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, waste_reason_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {reasons?.map((reason) => (
                      <SelectItem key={reason.id} value={reason.id}>{reason.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Weight */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Weight (kg) *
                </Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formData.weight_kg}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.,]/g, '');
                    setFormData(prev => ({ ...prev, weight_kg: val }));
                  }}
                  placeholder="e.g. 1,50"
                />
                <p className="text-xs text-muted-foreground">
                  💡 100 grams = 0,1 kg · 500 grams = 0,5 kg · 1000 grams = 1 kg
                </p>
                {estimatedCost && (
                  <p className="text-sm text-muted-foreground">
                    Estimated cost: <span className="font-medium">{estimatedCost} RON</span>
                  </p>
                )}
              </div>

              {/* Photo */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Photo *
                </Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoCapture}
                  className="hidden"
                />
                {photoPreview ? (
                  <div className="relative">
                    <img 
                      src={photoPreview} 
                      alt="Waste preview" 
                      className="w-full max-w-sm rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Replace
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Add Photo
                  </Button>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes about this waste entry"
                  rows={3}
                />
              </div>

              {/* Submit */}
              <Button 
                type="submit" 
                className="w-full"
                disabled={isSubmitting || !formData.waste_product_id || !formData.weight_kg || !formData.waste_reason_id || !photoFile}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Log Waste
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ModuleGate>
  );
}
