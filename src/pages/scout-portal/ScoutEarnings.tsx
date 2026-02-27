import { useMemo } from "react";
import { Wallet, CheckCircle2, Clock, Banknote, Gift, Tag } from "lucide-react";
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
        .select("*, scout_jobs(title, payout_type, reward_description), vouchers(code, status, expires_at, terms_text, value)")
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

  const activeVouchers = useMemo(
    () => (payouts ?? []).filter((p) => (p as any).vouchers?.status === "active").length,
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
      <div className="grid grid-cols-3 gap-3">
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
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Active Vouchers</p>
            <p className="text-xl font-bold text-primary">{activeVouchers}</p>
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
          {payouts.map((p: any) => {
            const hasVoucher = !!p.vouchers;
            const payoutType = p.scout_jobs?.payout_type || 'cash';
            const isRewardOnly = payoutType === 'discount' || payoutType === 'free_product';

            return (
              <Card key={p.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {p.scout_jobs?.title ?? "Job"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.created_at ? format(new Date(p.created_at), "MMM d, yyyy") : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!isRewardOnly && (
                        <span className="font-semibold text-sm">
                          {p.amount} {p.currency}
                        </span>
                      )}
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
                  </div>

                  {/* Voucher info */}
                  {hasVoucher && (
                    <div className="bg-muted/50 rounded-md p-2 flex items-start gap-2">
                      {payoutType === 'discount' ? (
                        <Tag className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      ) : (
                        <Gift className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground">
                          Voucher: <span className="font-mono">{p.vouchers.code}</span>
                        </p>
                        {p.vouchers.terms_text && (
                          <p className="text-xs text-muted-foreground truncate">{p.vouchers.terms_text}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {p.vouchers.status === 'redeemed' ? 'Redeemed' : `Expires: ${format(new Date(p.vouchers.expires_at), "MMM d, yyyy")}`}
                        </p>
                      </div>
                      <Badge variant="outline" className={
                        p.vouchers.status === 'active' ? 'bg-green-500/10 text-green-600 border-green-200' :
                        p.vouchers.status === 'redeemed' ? 'bg-muted text-muted-foreground' :
                        'bg-red-500/10 text-red-600 border-red-200'
                      }>
                        {p.vouchers.status}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
