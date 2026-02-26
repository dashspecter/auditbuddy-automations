import { useState } from "react";
import { User, MapPin, Phone, Car, Save, Loader2, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useScoutAuth } from "@/hooks/useScoutAuth";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function ScoutProfile() {
  const { scoutId } = useScoutAuth();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();

  const { data: scout, isLoading } = useQuery({
    queryKey: ["scout-profile", scoutId],
    queryFn: async () => {
      if (!scoutId) return null;
      const { data, error } = await supabase
        .from("scouts")
        .select("*")
        .eq("id", scoutId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!scoutId,
  });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [transport, setTransport] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Initialize form when data loads
  if (scout && !initialized) {
    setFullName(scout.full_name || "");
    setPhone(scout.phone || "");
    setCity(scout.city || "");
    setTransport(scout.transport || "");
    setInitialized(true);
  }

  const updateProfile = useMutation({
    mutationFn: async () => {
      if (!scoutId) throw new Error("No scout profile");
      const { error } = await supabase
        .from("scouts")
        .update({
          full_name: fullName,
          phone: phone || null,
          city: city || null,
          transport: transport || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", scoutId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scout-profile"] });
      toast.success("Profile updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    active: "bg-green-500/10 text-green-600 border-green-200",
    pending: "bg-amber-500/10 text-amber-600 border-amber-200",
    inactive: "bg-muted text-muted-foreground",
    suspended: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        </div>
        {scout && (
          <Badge variant="outline" className={statusColors[scout.status] ?? ""}>
            {scout.status}
          </Badge>
        )}
      </div>

      {/* Stats */}
      {scout && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Jobs Done</p>
              <p className="text-lg font-bold">{scout.completed_jobs_count ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Rating</p>
              <p className="text-lg font-bold">{scout.rating?.toFixed(1) ?? "—"}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Reliability</p>
              <p className="text-lg font-bold">
                {scout.reliability_score != null
                  ? `${(scout.reliability_score * 100).toFixed(0)}%`
                  : "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Separator />

      {/* Edit Form */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm">Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> Phone
            </Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+40..." />
          </div>
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> City
            </Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Bucharest" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-1">
              <Car className="h-3.5 w-3.5" /> Transport
            </Label>
            <Select value={transport} onValueChange={setTransport}>
              <SelectTrigger>
                <SelectValue placeholder="Select transport" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="motorcycle">Motorcycle</SelectItem>
                <SelectItem value="bicycle">Bicycle</SelectItem>
                <SelectItem value="public_transport">Public Transport</SelectItem>
                <SelectItem value="walking">Walking</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full"
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Button
        variant="outline"
        className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
        onClick={() => signOut()}
      >
        <LogOut className="h-4 w-4 mr-2" /> Sign Out
      </Button>
    </div>
  );
}
