import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFleetAvailability, AssetAvailability } from "@/hooks/useFleetAvailability";
import { useUpdateGovAssetReservation, useDeleteGovAssetReservation } from "@/hooks/useGovAssetReservations";
import { ReservationDialog } from "@/components/gov/ReservationDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Truck, CheckCircle2, AlertTriangle, Search, ExternalLink, Clock,
  Wrench, FolderOpen, CalendarDays, Plus, Trash2, BookOpen,
} from "lucide-react";
import { format, parseISO } from "date-fns";

const ASSET_STATUS_COLORS: Record<string, string> = {
  Operational: "bg-green-100 text-green-700",
  "Under Maintenance": "bg-amber-100 text-amber-700",
  "Out of Service": "bg-red-100 text-red-700",
  Retired: "bg-slate-100 text-slate-500",
};

const RES_STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-700",
  tentative: "bg-amber-100 text-amber-700",
  cancelled: "bg-slate-100 text-slate-500",
};

function AssetCard({ asset }: { asset: AssetAvailability }) {
  const navigate = useNavigate();
  const updateReservation = useUpdateGovAssetReservation();
  const deleteReservation = useDeleteGovAssetReservation();
  const [expanded, setExpanded] = useState(false);
  const [reservationDialogOpen, setReservationDialogOpen] = useState(false);

  const statusColor = ASSET_STATUS_COLORS[asset.asset_status] ?? "bg-slate-100 text-slate-700";
  const isBusyOrReserved = asset.is_busy_now || asset.has_reservation;
  const hasActivity = asset.busy_windows.length + asset.reservation_windows.length > 0;

  return (
    <>
      <Card className={`transition-shadow ${isBusyOrReserved ? "border-amber-200" : "border-green-200"}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg shrink-0 ${isBusyOrReserved ? "bg-amber-50" : "bg-green-50"}`}>
              <Truck className={`h-4 w-4 ${isBusyOrReserved ? "text-amber-600" : "text-green-600"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm">{asset.asset_name}</span>
                {asset.asset_code && <span className="text-xs text-muted-foreground font-mono">{asset.asset_code}</span>}
              </div>
              {asset.location_name && (
                <p className="text-xs text-muted-foreground mt-0.5">{asset.location_name}</p>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={`text-xs ${statusColor}`} variant="secondary">{asset.asset_status}</Badge>
                {asset.is_busy_now ? (
                  <Badge className="text-xs bg-amber-100 text-amber-700" variant="secondary">
                    <Clock className="h-3 w-3 mr-1" /> In Use
                  </Badge>
                ) : asset.has_reservation ? (
                  <Badge className="text-xs bg-blue-100 text-blue-700" variant="secondary">
                    <CalendarDays className="h-3 w-3 mr-1" /> Reserved
                  </Badge>
                ) : (
                  <Badge className="text-xs bg-green-100 text-green-700" variant="secondary">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Available
                  </Badge>
                )}
                {asset.free_at && (
                  <span className="text-xs text-muted-foreground">
                    Free by {format(parseISO(asset.free_at), "MMM d")}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                title="Reserve this asset"
                onClick={() => setReservationDialogOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                title="Open in CMMS"
                onClick={() => navigate("/cmms/assets")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              {hasActivity && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setExpanded(e => !e)}>
                  {asset.busy_windows.length + asset.reservation_windows.length}
                </Button>
              )}
            </div>
          </div>

          {expanded && hasActivity && (
            <div className="mt-3 border-t pt-3 space-y-3">
              {/* Active Work Orders */}
              {asset.busy_windows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Wrench className="h-3 w-3" /> Work Orders
                  </p>
                  {asset.busy_windows.map(w => (
                    <div key={w.work_order_id} className="flex items-start gap-2 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-muted-foreground">WO-{w.wo_number}</span>
                          <span className="font-medium">{w.title}</span>
                          <Badge className="text-[10px] py-0" variant="outline">{w.status}</Badge>
                        </div>
                        {w.project_title && (
                          <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                            <FolderOpen className="h-3 w-3" />
                            {w.project_number && <span className="font-mono">{w.project_number}</span>}
                            <span>{w.project_title}</span>
                          </div>
                        )}
                        {w.due_at && (
                          <p className="text-muted-foreground mt-0.5">Due: {format(parseISO(w.due_at), "MMM d, yyyy")}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reservations */}
              {asset.reservation_windows.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> Reservations
                  </p>
                  {asset.reservation_windows.map(r => (
                    <div key={r.reservation_id} className="flex items-start justify-between gap-2">
                      <div className="text-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={`text-[10px] py-0 ${RES_STATUS_COLORS[r.status]}`} variant="secondary">
                            {r.status}
                          </Badge>
                          <span>
                            {format(parseISO(r.start_date), "MMM d")} – {format(parseISO(r.end_date), "MMM d, yyyy")}
                          </span>
                        </div>
                        {r.project_title && (
                          <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                            <FolderOpen className="h-3 w-3" />
                            {r.project_number && <span className="font-mono">{r.project_number}</span>}
                            <span>{r.project_title}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {r.status !== 'cancelled' && (
                          <button
                            className="text-muted-foreground hover:text-red-500 transition-colors"
                            onClick={() => deleteReservation.mutate(r.reservation_id)}
                            title="Cancel reservation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ReservationDialog
        assetId={asset.asset_id}
        assetName={asset.asset_name}
        open={reservationDialogOpen}
        onOpenChange={setReservationDialogOpen}
      />
    </>
  );
}

export default function Fleet() {
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState<"all" | "available" | "busy">("all");
  const { data: assets = [], isLoading } = useFleetAvailability(14);

  const filtered = assets.filter(a => {
    if (search && !a.asset_name.toLowerCase().includes(search.toLowerCase()) && !a.asset_code?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (showFilter === "available" && (a.is_busy_now || a.has_reservation)) return false;
    if (showFilter === "busy" && !a.is_busy_now && !a.has_reservation) return false;
    return true;
  });

  const available = assets.filter(a => !a.is_busy_now && !a.has_reservation).length;
  const busyOrReserved = assets.filter(a => a.is_busy_now || a.has_reservation).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fleet Availability</h1>
          <p className="text-muted-foreground mt-1">Check which assets are available, reserved, or in use</p>
        </div>
        <Button variant="outline" onClick={() => window.location.href = "/cmms/assets"}>
          <ExternalLink className="h-4 w-4 mr-2" /> Manage in CMMS
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card
          className={`cursor-pointer ${showFilter === "all" ? "ring-1 ring-primary" : ""}`}
          onClick={() => setShowFilter("all")}
        >
          <CardContent className="pt-5 pb-4">
            <div className="text-2xl font-bold">{assets.length}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Truck className="h-3.5 w-3.5" /> Total Assets
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer border-green-200 ${showFilter === "available" ? "ring-1 ring-green-400" : ""}`}
          onClick={() => setShowFilter("available")}
        >
          <CardContent className="pt-5 pb-4">
            <div className="text-2xl font-bold text-green-600">{available}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> Available Now
            </div>
          </CardContent>
        </Card>
        <Card
          className={`cursor-pointer border-amber-200 ${showFilter === "busy" ? "ring-1 ring-amber-400" : ""}`}
          onClick={() => setShowFilter("busy")}
        >
          <CardContent className="pt-5 pb-4">
            <div className="text-2xl font-bold text-amber-600">{busyOrReserved}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> In Use or Reserved
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search assets…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Asset grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading fleet data…</div>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <Truck className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No assets found. Add assets in CMMS → Assets.</p>
            <Button className="mt-4" size="sm" onClick={() => window.location.href = "/cmms/assets"}>
              Go to CMMS Assets
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">No assets match your filters.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(asset => (
            <AssetCard key={asset.asset_id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  );
}
