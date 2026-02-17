import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, QrCode, MapPin, Download, Copy, Trash2, ExternalLink, Clock, X, Search } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

export default function QrFormAssignments() {
  const { data: company } = useCompany();
  const queryClient = useQueryClient();
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [checkpointTimes, setCheckpointTimes] = useState<string[]>([]);
  const [newTime, setNewTime] = useState("");
  const [locationFilter, setLocationFilter] = useState<string>("all");

  // Fetch assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["location-form-templates", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("location_form_templates")
        .select(`
          *,
          form_templates(name, category, type),
          locations!location_form_templates_location_id_fkey(name)
        `)
        .eq("company_id", company.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  // Fetch templates for select
  const { data: templates } = useQuery({
    queryKey: ["form-templates-select", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("form_templates")
        .select("id, name, form_template_versions(id, version)")
        .eq("company_id", company.id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      // Only show templates that have at least one published version
      return (data || []).filter((t: any) => t.form_template_versions && t.form_template_versions.length > 0);
    },
    enabled: !!company?.id,
  });

  // Fetch locations
  const { data: locations } = useQuery({
    queryKey: ["locations-select", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("locations")
        .select("id, name")
        .eq("company_id", company.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user || !company?.id) throw new Error("Not authenticated");
      if (!selectedTemplate) throw new Error("Select a template");

      // Fetch the latest version directly from DB to avoid stale/RLS cache issues
      const { data: latestVersion, error: vErr } = await supabase
        .from("form_template_versions")
        .select("id, version")
        .eq("template_id", selectedTemplate)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (vErr) throw vErr;
      if (!latestVersion) throw new Error("Template has no published versions. Please publish a version first.");

      const parsedOverrides: Record<string, any> = {};
      if (checkpointTimes.length > 0) {
        parsedOverrides.checkpointTimes = checkpointTimes;
      }

      const { error } = await supabase.from("location_form_templates").insert({
        company_id: company.id,
        location_id: selectedLocation,
        template_id: selectedTemplate,
        template_version_id: latestVersion.id,
        overrides: parsedOverrides,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-form-templates"] });
      setAssignOpen(false);
      setSelectedTemplate("");
      setSelectedLocation("");
      setCheckpointTimes([]);
      setNewTime("");
      toast.success("Template assigned to location");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("location_form_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["location-form-templates"] });
      toast.success("Assignment removed");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const baseUrl = window.location.origin;

  const copyQrUrl = (token: string) => {
    navigator.clipboard.writeText(`${baseUrl}/qr/forms/${token}`);
    toast.success("QR URL copied to clipboard");
  };

  const downloadQr = (token: string, label: string, templateName: string, locationName: string) => {
    const svg = document.getElementById(`qr-${token}`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const qrImg = new Image();

    // Also load the logo
    const logoImg = new Image();
    let logoLoaded = false;
    logoImg.onload = () => { logoLoaded = true; };
    logoImg.onerror = () => { logoLoaded = false; };
    logoImg.src = '/dashspect-logo-512.png';

    qrImg.onload = () => {
      const W = 480;
      const headerH = 72;
      const qrSize = 320;
      const qrPad = (W - qrSize) / 2;
      const footerH = 48;
      const totalH = headerH + qrSize + 24 + footerH;

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = totalH;
      const ctx = canvas.getContext("2d")!;

      // Background
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, totalH);

      // Header bar (orange brand)
      ctx.fillStyle = "#F97316";
      ctx.fillRect(0, 0, W, headerH);
      // Darker accent line
      ctx.fillStyle = "#EA580C";
      ctx.fillRect(0, headerH - 4, W, 4);

      // Logo circle in header
      if (logoLoaded) {
        ctx.save();
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(40, headerH / 2, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.clip();
        ctx.drawImage(logoImg, 18, headerH / 2 - 22, 44, 44);
        ctx.restore();
      }

      // Template name
      const textX = logoLoaded ? 70 : 20;
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 16px Helvetica, Arial, sans-serif";
      ctx.textBaseline = "middle";
      // Truncate if needed
      let displayName = templateName;
      while (ctx.measureText(displayName).width > W - textX - 20 && displayName.length > 3) {
        displayName = displayName.slice(0, -4) + "...";
      }
      ctx.fillText(displayName, textX, headerH / 2 - 10);

      // Location name
      ctx.font = "13px Helvetica, Arial, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText("📍 " + locationName, textX, headerH / 2 + 12);

      // QR code
      const qrY = headerH + 12;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(qrPad - 8, qrY - 8, qrSize + 16, qrSize + 16);
      ctx.drawImage(qrImg, qrPad, qrY, qrSize, qrSize);

      // Footer
      const footerY = totalH - footerH;
      ctx.fillStyle = "#F8F9FA";
      ctx.fillRect(0, footerY, W, footerH);
      ctx.strokeStyle = "#E5E7EB";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, footerY);
      ctx.lineTo(W, footerY);
      ctx.stroke();

      ctx.fillStyle = "#6B7280";
      ctx.font = "11px Helvetica, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Powered by Dashspect", W / 2, footerY + 20);
      ctx.font = "9px Helvetica, Arial, sans-serif";
      ctx.fillStyle = "#9CA3AF";
      ctx.fillText("Scan to access form", W / 2, footerY + 35);

      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-${label.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
    };
    qrImg.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Location Assignments
          </h1>
          <p className="text-muted-foreground mt-1">
            Assign form templates to locations and generate QR codes
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations?.map((l: any) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Assign Template
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Template to Location</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location..." />
                  </SelectTrigger>
                  <SelectContent>
                    {locations?.map((l: any) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Checkpoint Times (optional)
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Add specific times when checkpoints should be completed
                </p>
                <div className="flex gap-2 mb-2">
                  <Input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!newTime || checkpointTimes.includes(newTime)}
                    onClick={() => {
                      if (newTime && !checkpointTimes.includes(newTime)) {
                        setCheckpointTimes(prev => [...prev, newTime].sort());
                        setNewTime("");
                      }
                    }}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
                {checkpointTimes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {checkpointTimes.map((t) => (
                      <Badge key={t} variant="secondary" className="gap-1 pr-1">
                        {t}
                        <button
                          type="button"
                          onClick={() => setCheckpointTimes(prev => prev.filter(x => x !== t))}
                          className="rounded-full hover:bg-muted p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button
                className="w-full"
                onClick={() => assignMutation.mutate()}
                disabled={
                  !selectedTemplate || !selectedLocation || assignMutation.isPending
                }
              >
                {assignMutation.isPending ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {(() => {
        const filtered = assignments?.filter((a: any) =>
          locationFilter === "all" || a.location_id === locationFilter
        );
        return isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : !filtered?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <QrCode className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No assignments yet</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Assign a template to a location to generate QR codes
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a: any) => {
            const label = `${(a as any).locations?.name || "Location"} - ${(a as any).form_templates?.name || "Template"}`;
            return (
              <Card key={a.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {(a as any).form_templates?.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {(a as any).locations?.name}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!a.is_active && <Badge variant="destructive">Inactive</Badge>}
                      <Badge variant="outline" className="capitalize">
                        {(a as any).form_templates?.type === "monthly_grid" ? "Grid" : "Log"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* QR Code */}
                  <div className="flex justify-center p-4 bg-white rounded-lg border">
                    <QRCodeSVG
                      id={`qr-${a.public_token}`}
                      value={`${baseUrl}/qr/forms/${a.public_token}`}
                      size={160}
                      level="M"
                      includeMargin
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => downloadQr(a.public_token, label, (a as any).form_templates?.name || "Template", (a as any).locations?.name || "Location")}
                    >
                      <Download className="h-3 w-3 mr-1" /> Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => copyQrUrl(a.public_token)}
                    >
                      <Copy className="h-3 w-3 mr-1" /> Copy URL
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        window.open(`/qr/forms/${a.public_token}`, "_blank")
                      }
                    >
                      <ExternalLink className="h-3 w-3 mr-1" /> Open
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm("Remove this assignment?")) {
                          deleteMutation.mutate(a.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
      })()}
    </div>
  );
}
