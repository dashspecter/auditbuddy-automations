import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Wallet, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const ScoutsPayouts = () => {
  const { data: company } = useCompany();
  const companyId = company?.id;
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");

  const { data: payouts = [], isLoading } = useQuery({
    queryKey: ["scout-payouts", companyId, statusFilter],
    queryFn: async () => {
      if (!companyId) return [];
      let q = supabase
        .from("scout_payouts")
        .select("*, scouts(full_name), scout_jobs!inner(title, company_id)")
        .eq("scout_jobs.company_id", companyId)
        .order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!companyId,
  });

  const markPaid = useMutation({
    mutationFn: async (payoutId: string) => {
      const { error } = await supabase
        .from("scout_payouts")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", payoutId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scout-payouts"] });
      toast.success("Payout marked as paid");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalPending = payouts
    .filter((p: any) => p.status === "pending")
    .reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Scout Payouts</h1>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Pending</p>
            <p className="text-2xl font-bold text-primary">{totalPending.toFixed(2)} RON</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending Count</p>
            <p className="text-2xl font-bold">{payouts.filter((p: any) => p.status === "pending").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Records</p>
            <p className="text-2xl font-bold">{payouts.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scout</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Paid At</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : payouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No payouts found
                  </TableCell>
                </TableRow>
              ) : (
                payouts.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.scouts?.full_name ?? "—"}
                    </TableCell>
                    <TableCell>{p.scout_jobs?.title ?? "—"}</TableCell>
                    <TableCell className="font-semibold">
                      {p.amount} {p.currency}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.created_at ? format(new Date(p.created_at), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.paid_at ? format(new Date(p.paid_at), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      {p.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markPaid.mutate(p.id)}
                          disabled={markPaid.isPending}
                        >
                          {markPaid.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Mark Paid"
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScoutsPayouts;
