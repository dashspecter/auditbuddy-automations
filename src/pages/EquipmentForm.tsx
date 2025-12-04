import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationSelector } from "@/components/LocationSelector";
import { useEquipmentById, useCreateEquipment, useUpdateEquipment } from "@/hooks/useEquipment";
import { useUploadEquipmentDocument, useEquipmentDocuments, useDeleteEquipmentDocument } from "@/hooks/useEquipmentDocuments";
import { useEquipmentStatusHistory } from "@/hooks/useEquipmentStatusHistory";
import { useCreateEquipmentIntervention } from "@/hooks/useEquipmentInterventions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const equipmentSchema = z.object({
  location_id: z.string().min(1, "Location is required"),
  name: z.string().min(1, "Name is required"),
  model_type: z.string().optional(),
  power_supply_type: z.string().optional(),
  power_consumption: z.string().optional(),
  date_added: z.string(),
  last_check_date: z.string().optional(),
  next_check_date: z.string().optional(),
  last_check_notes: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type EquipmentFormValues = z.infer<typeof equipmentSchema>;

export default function EquipmentForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [equipmentPhoto, setEquipmentPhoto] = useState<File | null>(null);
  const [equipmentPhotoPreview, setEquipmentPhotoPreview] = useState<string | null>(null);

  const { data: equipment, isLoading } = useEquipmentById(id || "");
  const { data: documents } = useEquipmentDocuments(id || "");
  const { data: statusHistory } = useEquipmentStatusHistory(id || "");
  const createEquipment = useCreateEquipment();
  const updateEquipment = useUpdateEquipment();
  const uploadDocument = useUploadEquipmentDocument();
  const deleteDocument = useDeleteEquipmentDocument();
  const createIntervention = useCreateEquipmentIntervention();

  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      location_id: "",
      name: "",
      model_type: "",
      power_supply_type: "",
      power_consumption: "",
      date_added: new Date().toISOString().split("T")[0],
      last_check_date: "",
      next_check_date: "",
      last_check_notes: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (equipment) {
      form.reset({
        location_id: equipment.location_id,
        name: equipment.name,
        model_type: equipment.model_type || "",
        power_supply_type: equipment.power_supply_type || "",
        power_consumption: equipment.power_consumption || "",
        date_added: equipment.date_added,
        last_check_date: equipment.last_check_date || "",
        next_check_date: equipment.next_check_date || "",
        last_check_notes: equipment.last_check_notes || "",
        status: equipment.status as "active" | "inactive",
      });
    }
  }, [equipment, form]);

  const onSubmit = async (data: EquipmentFormValues) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let equipmentId = id;

      // Clean up empty date fields to send null instead of empty strings
      const cleanedData = {
        ...data,
        last_check_date: data.last_check_date || null,
        next_check_date: data.next_check_date || null,
      };

      if (isEditing) {
        await updateEquipment.mutateAsync({ id: id!, ...cleanedData });
      } else {
        const result = await createEquipment.mutateAsync(cleanedData as any);
        equipmentId = result.id;
      }

      // Upload equipment photo first
      if (equipmentPhoto && equipmentId) {
        await uploadDocument.mutateAsync({ 
          equipmentId, 
          file: new File([equipmentPhoto], `photo_${equipmentPhoto.name}`, { type: equipmentPhoto.type })
        });
      }

      // Upload documents
      if (selectedFiles.length > 0 && equipmentId) {
        for (const file of selectedFiles) {
          await uploadDocument.mutateAsync({ equipmentId, file });
        }
      }

      // Auto-schedule maintenance intervention if next_check_date is set
      if (cleanedData.next_check_date && equipmentId) {
        const nextCheckDate = new Date(cleanedData.next_check_date);
        nextCheckDate.setHours(9, 0, 0, 0); // Set to 9:00 AM
        
        await createIntervention.mutateAsync({
          equipment_id: equipmentId,
          location_id: cleanedData.location_id,
          title: `Scheduled Maintenance - ${cleanedData.name}`,
          description: "Automatically scheduled maintenance check",
          scheduled_for: nextCheckDate.toISOString(),
          performed_by_user_id: user.id,
          supervised_by_user_id: null,
          status: "scheduled",
          performed_at: null,
          before_photo_url: null,
          after_photo_url: null,
          notes: null,
          next_check_date: null,
        });
      }

      navigate("/equipment");
    } catch (error) {
      console.error("Error saving equipment:", error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles([...selectedFiles, ...Array.from(e.target.files)]);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEquipmentPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEquipmentPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = () => {
    setEquipmentPhoto(null);
    setEquipmentPhotoPreview(null);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  if (isLoading && isEditing) {
    return (
      <div className="container mx-auto p-4 md:p-6">
        <Skeleton className="h-10 w-48 mb-6" />
        <Card>
          <CardContent className="p-6 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate("/equipment")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Equipment List
        </Button>

        <div>
          <h1 className="text-3xl font-bold">{isEditing ? "Edit Equipment" : "Add Equipment"}</h1>
          <p className="text-muted-foreground">
            {isEditing ? "Update equipment information" : "Add new equipment to a location"}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Equipment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="location_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location *</FormLabel>
                      <FormControl>
                        <LocationSelector
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipment Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Fryer 1, Oven, Refrigerator" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="model_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model / Type</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Industrial Deep Fryer" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="power_supply_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Power Supply Type</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 220V, Gas, Electric" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="power_consumption"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Power Consumption</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 5kW, 15000 BTU/hr" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="date_added"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Added</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="last_check_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Check Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="next_check_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next Check Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="last_check_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Check Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder="Notes from the last maintenance check..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="transferred">Transferred</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Equipment Photo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="cursor-pointer">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
                      {equipmentPhotoPreview ? (
                        <div className="relative">
                          <img 
                            src={equipmentPhotoPreview} 
                            alt="Equipment preview" 
                            className="max-h-48 mx-auto rounded"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-2 right-2"
                            onClick={(e) => {
                              e.preventDefault();
                              handleRemovePhoto();
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Click to upload equipment photo
                          </p>
                        </>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        onChange={handlePhotoSelect}
                        accept="image/*"
                      />
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>"How to Use" Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="cursor-pointer">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors">
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to upload manuals, SOPs, or instructions
                      </p>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileSelect}
                        accept=".pdf,.doc,.docx,.txt"
                      />
                    </div>
                  </label>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Selected Files:</p>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm truncate">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {isEditing && documents && documents.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Existing Documents:</p>
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline truncate"
                        >
                          {doc.file_name}
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteDocument.mutateAsync({ id: doc.id, fileUrl: doc.file_url, equipmentId: id! })}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {isEditing && statusHistory && statusHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Status Change History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {statusHistory.map((history) => (
                      <div key={history.id} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {history.old_status && (
                              <>
                                <Badge variant="outline">{history.old_status}</Badge>
                                <span className="text-muted-foreground">→</span>
                              </>
                            )}
                            <Badge variant={history.new_status === 'active' ? 'default' : 'secondary'}>
                              {history.new_status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {format(new Date(history.changed_at), "MMM dd, yyyy 'at' HH:mm")}
                          </p>
                          {history.notes && (
                            <p className="text-sm mt-2">{history.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4">
              <Button type="submit" disabled={createEquipment.isPending || updateEquipment.isPending}>
                {isEditing ? "Update Equipment" : "Add Equipment"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate("/equipment")}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
    </div>
  );
}
