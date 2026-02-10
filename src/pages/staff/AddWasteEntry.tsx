import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export default function AddWasteEntry() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { data: company } = useCompany();
  const goBack = useSmartBack({ 
    staffFallback: "/staff/waste",
    adminFallback: "/admin/waste/entries" 
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products, isLoading: productsLoading } = useWasteProducts();
  const { data: reasons } = useWasteReasons();
  const { data: locations } = useLocations();
  const createEntry = useCreateWasteEntry();
  const updateEntry = useUpdateWasteEntry();

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  
  // Get locationId from navigation state (passed from StaffHome when on duty)
  const passedLocationId = (location.state as { locationId?: string })?.locationId;
  
  const [formData, setFormData] = useState({
    location_id: passedLocationId || "",
    waste_product_id: "",
    waste_reason_id: "",
    weight_kg: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-select location if only one, or use passed location
  useEffect(() => {
    if (passedLocationId && !formData.location_id) {
      setFormData(prev => ({ ...prev, location_id: passedLocationId }));
    } else if (locations?.length === 1 && !formData.location_id) {
      setFormData(prev => ({ ...prev, location_id: locations[0].id }));
    }
  }, [locations, formData.location_id, passedLocationId]);

  const handlePhotoCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!formData.location_id || !formData.waste_product_id || !formData.weight_kg) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!photoFile) {
      toast({
        title: "Photo Required",
        description: "Please take a photo of the waste item",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create entry first to get ID
      const entry = await createEntry.mutateAsync({
        location_id: formData.location_id,
        waste_product_id: formData.waste_product_id,
        waste_reason_id: formData.waste_reason_id || undefined,
        weight_kg: parseFloat(formData.weight_kg),
        notes: formData.notes || undefined,
      });

      // Upload photo and update entry with photo_path
      if (company?.id && photoFile) {
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
            photo_path: photoPath 
          });
        } catch (photoError) {
          console.error('Photo upload failed:', photoError);
          toast({
            title: "Warning",
            description: "Entry saved but photo upload failed. You can retry from My Entries.",
          });
        }
      }

      toast({
        title: "Success",
        description: "Waste entry recorded",
      });

      // Reset form
      setFormData({
        location_id: locations?.length === 1 ? locations[0].id : "",
        waste_product_id: "",
        waste_reason_id: "",
        weight_kg: "",
        notes: "",
      });
      setPhotoFile(null);
      setPhotoPreview(null);

    } catch (error: any) {
      console.error('Failed to create waste entry:', error);
      const msg = error?.message || "Unknown error";
      toast({
        title: "Error",
        description: `Failed to record waste entry: ${msg}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group products by category
  const productsByCategory = products?.reduce((acc, product) => {
    const cat = product.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {} as Record<string, typeof products>) || {};

  const selectedProduct = products?.find(p => p.id === formData.waste_product_id);

  return (
    <ModuleGate module="wastage">
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Add Waste Entry</h1>
          </div>
        </div>

        <div className="p-4 space-y-4 pb-24">
          {/* Photo Capture */}
          <Card>
            <CardContent className="p-4">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Waste photo"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={handlePhotoCapture}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Retake
                  </Button>
                </div>
              ) : (
                <button
                  onClick={handlePhotoCapture}
                  className="w-full h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-colors"
                >
                  <Camera className="h-10 w-10 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Take photo of waste item
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Include scale readout if available
                  </span>
                </button>
              )}
            </CardContent>
          </Card>

          {/* Location Selector - hide if passed from on-duty state or only one location */}
          {locations && locations.length > 1 && !passedLocationId && (
            <div className="space-y-2">
              <Label>Location *</Label>
              <Select
                value={formData.location_id}
                onValueChange={(v) => setFormData({ ...formData, location_id: v })}
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
          
          {/* Show selected location when auto-set */}
          {passedLocationId && (
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              📍 Recording at: {locations?.find(l => l.id === passedLocationId)?.name || 'Your current location'}
            </div>
          )}

          {/* Product Selector */}
          <div className="space-y-2">
            <Label>Product *</Label>
            {productsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : products?.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-4 text-center">
                  <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No products configured. Ask an admin to add waste products.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Select
                value={formData.waste_product_id}
                onValueChange={(v) => setFormData({ ...formData, waste_product_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(productsByCategory).map(([category, prods]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {category}
                      </div>
                      {prods?.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Reason Selector */}
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Select
              value={formData.waste_reason_id}
              onValueChange={(v) => setFormData({ ...formData, waste_reason_id: v })}
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

          {/* Weight Input */}
          <div className="space-y-2">
            <Label>Weight (kg) *</Label>
            <div className="relative">
              <Scale className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                inputMode="decimal"
                step="0.001"
                placeholder="Enter weight in kg"
                value={formData.weight_kg}
                onChange={(e) => setFormData({ ...formData, weight_kg: e.target.value })}
                className="pl-10"
              />
            </div>
            {selectedProduct && formData.weight_kg && (
              <p className="text-sm text-muted-foreground">
                Estimated cost: {(parseFloat(formData.weight_kg) * selectedProduct.unit_cost).toFixed(2)} RON
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              placeholder="Any additional details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <Button
            className="w-full h-12 text-base"
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.waste_product_id || !formData.weight_kg || !photoFile}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-5 w-5 mr-2" />
                Record Waste
              </>
            )}
          </Button>
        </div>
      </div>
    </ModuleGate>
  );
}
