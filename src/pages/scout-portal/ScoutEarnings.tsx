import { useMemo } from "react";
import { Wallet, CheckCircle2, Clock, Banknote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useScoutAuth } from "@/hooks/useScoutAuth";
import { format } from "date-fns";

export default function ScoutEarnings() {
  const { scoutId } = useScoutAuth();

  const { data: payouts, isLoading } = useQuery({
    queryKey: ["scout-earnings", scoutId],
    queryFn: async () => {
      if (!scoutId) return [];
      const { data, error } = await supabase
        .from("scout_payouts")
        .select("*, scout_jobs(title)")
        .eq("scout_id", scoutId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!scoutId,
  });

  const totalEarned = useMemo(
    () => (payouts ?? []).filter((p) => p.status === "paid").reduce((s, p) => s + (p.amount || 0), 0),
    [payouts]
  );

  const totalPending = useMemo(
    () => (payouts ?? []).filter((p) => p.status === "pending").reduce((s, p) => s + (p.amount || 0), 0),
    [payouts]
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Wallet className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Earnings</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Earned</p>
            <p className="text-xl font-bold text-primary">{totalEarned.toFixed(2)} RON</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-xl font-bold text-amber-600">{totalPending.toFixed(2)} RON</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Payout list */}
      {!payouts?.length ? (
        <div className="text-center py-12 text-muted-foreground">
          <Banknote className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No payouts yet. Complete jobs to start earning!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payouts.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {(p.scout_jobs as any)?.title ?? "Job"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.created_at ? format(new Date(p.created_at), "MMM d, yyyy") : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-sm">
                    {p.amount} {p.currency}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      p.status === "paid"
                        ? "bg-green-500/10 text-green-600 border-green-200"
                        : "bg-amber-500/10 text-amber-600 border-amber-200"
                    }
                  >
                    {p.status === "paid" ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : (
                      <Clock className="h-3 w-3 mr-1" />
                    )}
                    {p.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
