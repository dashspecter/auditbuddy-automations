import { useState } from "react";
import { useVouchers, useUpdateVoucherStatus } from "@/hooks/useVouchers";
import { useLocations } from "@/hooks/useLocations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Gift, Calendar, MapPin, Check, Search } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function VouchersManagement() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchCode, setSearchCode] = useState<string>("");
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  
  const { data: vouchers, isLoading } = useVouchers({
    status: statusFilter || undefined,
  });
  const { data: locations } = useLocations();
  const updateStatus = useUpdateVoucherStatus();

  const selectedVoucher = vouchers?.find(v => v.id === selectedVoucherId);

  const filteredVouchers = vouchers?.filter(v => 
    !searchCode || v.code.toLowerCase().includes(searchCode.toLowerCase()) ||
    v.customer_name.toLowerCase().includes(searchCode.toLowerCase())
  );

  const getLocationNames = (locationIds: string[]) => {
    if (!locationIds || locationIds.length === 0) return "All locations";
    return locations?.filter(l => locationIds.includes(l.id)).map(l => l.name).join(", ") || "-";
  };

  const handleRedeem = async (id: string) => {
    await updateStatus.mutateAsync({ id, status: 'redeemed' });
    setSelectedVoucherId(null);
  };

  const stats = {
    total: vouchers?.length || 0,
    active: vouchers?.filter(v => v.status === 'active').length || 0,
    redeemed: vouchers?.filter(v => v.status === 'redeemed').length || 0,
    expired: vouchers?.filter(v => v.status === 'expired').length || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Vouchers</h2>
        <p className="text-muted-foreground">Manage customer reward vouchers from mystery shopper surveys</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Gift className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Check className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.redeemed}</p>
                <p className="text-sm text-muted-foreground">Redeemed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-muted">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expired}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code or customer name..."
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="redeemed">Redeemed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vouchers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Vouchers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredVouchers?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No vouchers found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVouchers?.map((voucher) => {
                  const isExpired = new Date(voucher.expires_at) < new Date() && voucher.status === 'active';
                  return (
                    <TableRow key={voucher.id}>
                      <TableCell>
                        <span className="font-mono font-bold">{voucher.code}</span>
                      </TableCell>
                      <TableCell className="font-medium">{voucher.customer_name}</TableCell>
                      <TableCell>
                        {voucher.value} {voucher.currency}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {getLocationNames(voucher.location_ids)}
                      </TableCell>
                      <TableCell>
                        <span className={isExpired ? "text-destructive" : ""}>
                          {format(new Date(voucher.expires_at), "MMM d, yyyy")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            voucher.status === 'active' && !isExpired ? 'default' : 
                            voucher.status === 'redeemed' ? 'secondary' : 
                            'destructive'
                          }
                        >
                          {isExpired && voucher.status === 'active' ? 'expired' : voucher.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {voucher.status === 'active' && !isExpired && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedVoucherId(voucher.id)}
                          >
                            Redeem
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Redeem Dialog */}
      <Dialog open={!!selectedVoucherId} onOpenChange={() => setSelectedVoucherId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redeem Voucher</DialogTitle>
          </DialogHeader>
          {selectedVoucher && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Voucher Code</p>
                <p className="text-2xl font-mono font-bold">{selectedVoucher.code}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedVoucher.customer_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Value</p>
                  <p className="font-medium">{selectedVoucher.value} {selectedVoucher.currency}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Valid at</p>
                  <p className="font-medium">{getLocationNames(selectedVoucher.location_ids)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedVoucherId(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedVoucher && handleRedeem(selectedVoucher.id)}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirm Redemption
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
