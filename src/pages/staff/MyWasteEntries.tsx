import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Trash2, Clock, Upload, Camera, ImageOff } from "lucide-react";
import { format } from "date-fns";
import { useMyWasteEntries, getWastePhotoUrl, uploadWastePhoto, useUpdateWasteEntry } from "@/hooks/useWaste";
import { useCompany } from "@/hooks/useCompany";
import { ModuleGate } from "@/components/ModuleGate";
import { EmptyState } from "@/components/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export default function MyWasteEntries() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: company } = useCompany();
  const { data: entries, isLoading } = useMyWasteEntries();
  const updateEntry = useUpdateWasteEntry();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
      
      // Reload photo URL
      const url = await getWastePhotoUrl(photoPath);
      setPhotoUrl(url);
      
      toast({ title: "Success", description: "Photo uploaded successfully" });
    } catch (error) {
      console.error('Photo upload failed:', error);
      toast({ 
        title: "Error", 
        description: "Failed to upload photo. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ModuleGate module="wastage">
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/staff')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold">My Waste Entries</h1>
            </div>
            <Button size="sm" onClick={() => navigate('/staff/waste/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : entries?.length === 0 ? (
            <EmptyState
              icon={Trash2}
              title="No waste entries"
              description="Record waste to track and reduce food waste"
              action={{
                label: "Add Entry",
                onClick: () => navigate('/staff/waste/new')
              }}
            />
          ) : (
            entries?.map((entry) => (
              <Card 
                key={entry.id} 
                className="cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => handleViewEntry(entry)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{entry.waste_products?.name}</p>
                        {!entry.photo_path && entry.status === 'recorded' && (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <ImageOff className="h-3 w-3" />
                            No Photo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {format(new Date(entry.occurred_at), 'MMM d, HH:mm')}
                      </div>
                      {entry.waste_reasons && (
                        <Badge variant="outline" className="text-xs">
                          {entry.waste_reasons.name}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">{(entry.weight_g / 1000).toFixed(2)} kg</p>
                      <p className="text-sm text-muted-foreground">{entry.cost_total.toFixed(2)} RON</p>
                      {entry.status === 'voided' && (
                        <Badge variant="destructive" className="mt-1">Voided</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Entry Detail Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Waste Entry Details</DialogTitle>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-4">
                {/* Hidden file input for photo retry */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                {/* Photo section */}
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt="Waste photo"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ) : selectedEntry.status === 'recorded' ? (
                  <button
                    onClick={handleRetryUpload}
                    disabled={isUploading}
                    className="w-full h-32 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary/50 transition-colors disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        <span className="text-sm text-muted-foreground">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Tap to add photo</span>
                      </>
                    )}
                  </button>
                ) : null}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Product</p>
                    <p className="font-medium">{selectedEntry.waste_products?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{selectedEntry.locations?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Weight</p>
                    <p className="font-medium">{(selectedEntry.weight_g / 1000).toFixed(2)} kg</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cost</p>
                    <p className="font-medium">{selectedEntry.cost_total.toFixed(2)} RON</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reason</p>
                    <p className="font-medium">{selectedEntry.waste_reasons?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{format(new Date(selectedEntry.occurred_at), 'MMM d, yyyy HH:mm')}</p>
                  </div>
                </div>
                
                {selectedEntry.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{selectedEntry.notes}</p>
                  </div>
                )}

                {selectedEntry.status === 'voided' && (
                  <div className="p-3 bg-destructive/10 rounded-lg">
                    <p className="text-sm font-medium text-destructive">Entry Voided</p>
                    {selectedEntry.void_reason && (
                      <p className="text-sm text-muted-foreground">{selectedEntry.void_reason}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ModuleGate>
  );
}
