import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Trash2, Clock, Upload, Camera, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { useMyWasteEntries, getWastePhotoUrl, uploadWastePhoto, useUpdateWasteEntry } from "@/hooks/useWaste";
import { useCompany } from "@/hooks/useCompany";
import { ModuleGate } from "@/components/ModuleGate";
import { EmptyState } from "@/components/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useSmartBack } from "@/hooks/useSmartBack";

export default function AdminWasteEntries() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { data: company } = useCompany();
  const { data: entries, isLoading } = useMyWasteEntries();
  const updateEntry = useUpdateWasteEntry();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const goBack = useSmartBack({ adminFallback: "/dashboard" });
  
  const [selectedEntry, setSelectedEntry] = useState<typeof entries extends (infer T)[] ? T : never | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleViewEntry = async (entry: NonNullable<typeof selectedEntry>) => {
    setSelectedEntry(entry);
    setDialogOpen(true);
    setPhotoUrl(null);
    
    if (entry.photo_path) {
      const url = await getWastePhotoUrl(entry.photo_path);
      setPhotoUrl(url);
    }
  };

  const handleRetryUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEntry || !company?.id) return;
    
    setIsUploading(true);
    try {
      const photoPath = await uploadWastePhoto(
        company.id,
        selectedEntry.location_id,
        selectedEntry.id,
        file
      );
      
      await updateEntry.mutateAsync({
        id: selectedEntry.id,
        photo_path: photoPath,
      });
      
      const url = await getWastePhotoUrl(photoPath);
      setPhotoUrl(url);
      
      toast({
        title: "Photo uploaded",
        description: "The photo has been added to this entry.",
      });
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        title: "Upload failed",
        description: "Could not upload photo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ModuleGate module="wastage">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={goBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Waste Entries</h1>
              <p className="text-muted-foreground">View logged waste entries</p>
            </div>
          </div>
          <Button onClick={() => navigate("/admin/waste/add", { state: { from: location.pathname } })}>
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : entries && entries.length > 0 ? (
          <div className="grid gap-4">
            {entries.map((entry) => (
              <Card 
                key={entry.id} 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleViewEntry(entry)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                      <Trash2 className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {entry.waste_products?.name || "Unknown Product"}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {format(new Date(entry.created_at), "MMM d, HH:mm")}
                        {entry.waste_reasons && (
                          <>
                            <span>•</span>
                            <span>{entry.waste_reasons.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{entry.weight_kg?.toFixed(2)} kg</p>
                    <p className="text-sm text-muted-foreground">
                      {entry.cost_total?.toFixed(2) || "0.00"} RON
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Trash2}
            title="No waste entries"
            description="Start logging waste to track and reduce food costs"
            action={{
              label: "Add Entry",
              onClick: () => navigate("/admin/waste/add", { state: { from: location.pathname } })
            }}
          />
        )}

        {/* Entry Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Waste Entry Details</DialogTitle>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Product</p>
                    <p className="font-medium">{selectedEntry.waste_products?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{selectedEntry.waste_products?.category || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Weight</p>
                    <p className="font-medium">{selectedEntry.weight_kg?.toFixed(2)} kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cost</p>
                    <p className="font-medium">{selectedEntry.cost_total?.toFixed(2) || "0.00"} RON</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">{selectedEntry.waste_reasons?.name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">
                      {format(new Date(selectedEntry.created_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                </div>
                
                {selectedEntry.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="font-medium">{selectedEntry.notes}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Photo</p>
                  {photoUrl ? (
                    <img 
                      src={photoUrl} 
                      alt="Waste entry" 
                      className="w-full rounded-lg object-cover max-h-64"
                    />
                  ) : selectedEntry.photo_path ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                      Loading photo...
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-6 bg-muted rounded-lg">
                      <ImageOff className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No photo attached</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleRetryUpload}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Add Photo
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ModuleGate>
  );
}
