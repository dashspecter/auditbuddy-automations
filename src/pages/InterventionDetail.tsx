import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, Save } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useEquipmentInterventionById, useUpdateEquipmentIntervention, useCreateEquipmentIntervention } from "@/hooks/useEquipmentInterventions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { optimizeFile } from "@/lib/fileOptimization";

const updateInterventionSchema = z.object({
  performed_at: z.string().optional(),
  status: z.enum(["scheduled", "completed", "overdue"]),
  description: z.string().optional(),
  notes: z.string().optional(),
  next_check_date: z.string().optional(),
  performed_by_user_id: z.string().min(1, "Performer is required"),
  supervised_by_user_id: z.string().optional(),
});

type UpdateInterventionFormValues = z.infer<typeof updateInterventionSchema>;

export default function InterventionDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [beforePhoto, setBeforePhoto] = useState<File | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: intervention, isLoading } = useEquipmentInterventionById(id || "");
  const updateIntervention = useUpdateEquipmentIntervention();
  const createNextIntervention = useCreateEquipmentIntervention();

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
  });

  const form = useForm<UpdateInterventionFormValues>({
    resolver: zodResolver(updateInterventionSchema),
    values: intervention ? {
      performed_at: intervention.performed_at || "",
      status: intervention.status,
      description: intervention.description || "",
      notes: intervention.notes || "",
      next_check_date: intervention.next_check_date || "",
      performed_by_user_id: intervention.performed_by_user_id,
      supervised_by_user_id: intervention.supervised_by_user_id || "none",
    } : undefined,
  });

  const uploadPhoto = async (file: File, type: "before" | "after") => {
    // Optimize file before upload
    const optimized = await optimizeFile(file);
    
    const fileExt = file.name.split(".").pop();
    const fileName = `${id}/${type}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(fileName, optimized.file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("photos")
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const onSubmit = async (data: UpdateInterventionFormValues) => {
    try {
      setUploading(true);

      let beforePhotoUrl = intervention?.before_photo_url;
      let afterPhotoUrl = intervention?.after_photo_url;

      if (beforePhoto) {
        beforePhotoUrl = await uploadPhoto(beforePhoto, "before");
      }

      if (afterPhoto) {
        afterPhotoUrl = await uploadPhoto(afterPhoto, "after");
      }

      // Update current intervention
      await updateIntervention.mutateAsync({
        id: id!,
        ...data,
        supervised_by_user_id: data.supervised_by_user_id && data.supervised_by_user_id !== "none" ? data.supervised_by_user_id : null,
        before_photo_url: beforePhotoUrl,
        after_photo_url: afterPhotoUrl,
        performed_at: data.status === "completed" ? (data.performed_at || new Date().toISOString()) : data.performed_at,
      });

      // If next check date is set and intervention is completed, create next intervention
      if (data.next_check_date && data.status === "completed" && intervention) {
        await createNextIntervention.mutateAsync({
          equipment_id: intervention.equipment_id,
          location_id: intervention.location_id,
          title: `Follow-up: ${intervention.title}`,
          scheduled_for: new Date(data.next_check_date).toISOString(),
          performed_by_user_id: data.performed_by_user_id,
          supervised_by_user_id: data.supervised_by_user_id && data.supervised_by_user_id !== "none" ? data.supervised_by_user_id : null,
          status: "scheduled",
          description: data.description || null,
          next_check_date: null,
        } as any);
      }

      toast.success("Intervention updated successfully");
    } catch (error) {
      console.error("Error updating intervention:", error);
      toast.error("Failed to update intervention");
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-4 md:p-6">
          <Skeleton className="h-10 w-48 mb-6" />
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!intervention) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto p-4 md:p-6">
          <p className="text-center text-muted-foreground">Intervention not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4 md:p-6 space-y-6">
        <Button variant="ghost" onClick={() => navigate(`/equipment/${intervention.equipment_id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Equipment
        </Button>

        <div>
          <h1 className="text-3xl font-bold">{intervention.title}</h1>
          <p className="text-muted-foreground">
            {intervention.equipment?.name} - {intervention.locations?.name}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Intervention Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Scheduled For</p>
                <p className="font-medium">{format(new Date(intervention.scheduled_for), "MMMM d, yyyy HH:mm")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant={
                    intervention.status === "completed"
                      ? "default"
                      : intervention.status === "overdue"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {intervention.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Performed By</p>
                <p className="font-medium">
                  {intervention.performed_by?.full_name || intervention.performed_by?.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Supervised By</p>
                <p className="font-medium">
                  {intervention.supervised_by
                    ? intervention.supervised_by.full_name || intervention.supervised_by.email
                    : "-"}
                </p>
              </div>
              {intervention.performed_at && (
                <div>
                  <p className="text-sm text-muted-foreground">Performed At</p>
                  <p className="font-medium">{format(new Date(intervention.performed_at), "MMMM d, yyyy HH:mm")}</p>
                </div>
              )}
            </div>

            {intervention.description && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Description</p>
                <p className="text-sm bg-muted p-3 rounded">{intervention.description}</p>
              </div>
            )}

            {intervention.notes && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm bg-muted p-3 rounded">{intervention.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {(intervention.before_photo_url || intervention.after_photo_url) && (
          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {intervention.before_photo_url && (
                  <div>
                    <p className="text-sm font-medium mb-2">Before</p>
                    <img
                      src={intervention.before_photo_url}
                      alt="Before"
                      className="rounded-lg w-full h-64 object-cover"
                    />
                  </div>
                )}
                {intervention.after_photo_url && (
                  <div>
                    <p className="text-sm font-medium mb-2">After</p>
                    <img
                      src={intervention.after_photo_url}
                      alt="After"
                      className="rounded-lg w-full h-64 object-cover"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Update Intervention</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="performed_by_user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Performed By *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users?.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name || user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="supervised_by_user_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supervised By</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select supervisor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {users?.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.full_name || user.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="overdue">Overdue</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="performed_at"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Performed At</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder="What was checked/changed..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder="Additional notes..." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Before Photo</label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setBeforePhoto(e.target.files?.[0] || null)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">After Photo</label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAfterPhoto(e.target.files?.[0] || null)}
                    />
                  </div>
                </div>

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

                <Button type="submit" disabled={updateIntervention.isPending || uploading}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
