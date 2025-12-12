import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, CheckCircle, XCircle, Gift } from "lucide-react";
import { StaffBottomNav } from "@/components/staff/StaffBottomNav";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";

interface Voucher {
  id: string;
  code: string;
  value: number;
  currency: string;
  customer_name: string;
  expires_at: string;
  status: string;
  redeemed_at: string | null;
  location_ids: string[] | null;
}

const StaffScanVoucher = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [codeInput, setCodeInput] = useState("");
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);

  // Check for URL code parameter
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const codeParam = searchParams.get('code');
    
    if (codeParam) {
      const cleanCode = codeParam.replace(/^VOUCHER:/i, '').toUpperCase();
      setCodeInput(cleanCode);
      lookupVoucher(cleanCode);
      navigate('/staff/scan-voucher', { replace: true });
    }
  }, [location, navigate]);

  const lookupVoucher = async (code: string) => {
    if (!code.trim()) {
      setError("Please enter a voucher code");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setVoucher(null);
    
    try {
      console.log("Looking up voucher with code:", code);
      
      const { data, error: queryError } = await supabase
        .from("vouchers")
        .select("*")
        .eq("code", code.toUpperCase().trim())
        .maybeSingle();
      
      if (queryError) {
        console.error("Voucher lookup error:", queryError);
        setError("Failed to look up voucher: " + queryError.message);
        return;
      }
      
      if (!data) {
        setError("Voucher not found. Please check the code and try again.");
        return;
      }
      
      console.log("Voucher found:", data);
      setVoucher(data as Voucher);
    } catch (err: any) {
      console.error("Unexpected error looking up voucher:", err);
      setError("An error occurred: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    lookupVoucher(codeInput);
  };

  const handleRedeem = async () => {
    if (!voucher) return;
    
    setIsRedeeming(true);
    try {
      console.log("Redeeming voucher:", voucher.id);
      
      const { data, error: updateError } = await supabase
        .from("vouchers")
        .update({
          status: 'redeemed',
          redeemed_at: new Date().toISOString(),
        })
        .eq("id", voucher.id)
        .select()
        .single();
      
      if (updateError) {
        console.error("Redeem error:", updateError);
        toast.error("Failed to redeem voucher: " + updateError.message);
        return;
      }
      
      console.log("Voucher redeemed successfully:", data);
      setVoucher(data as Voucher);
      setRedeemSuccess(true);
      toast.success("Voucher redeemed successfully!");
    } catch (err: any) {
      console.error("Unexpected error redeeming voucher:", err);
      toast.error("Error: " + err.message);
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleReset = () => {
    setCodeInput("");
    setVoucher(null);
    setError(null);
    setRedeemSuccess(false);
  };

  const getLocationNames = (locationIds: string[] | null | undefined) => {
    if (!locationIds || locationIds.length === 0) return "All locations";
    return locationIds.join(", ");
  };

  const isExpired = voucher ? new Date(voucher.expires_at) < new Date() : false;
  const isRedeemed = voucher?.status === 'redeemed';
  const canRedeem = voucher && !isExpired && !isRedeemed && voucher.status === 'active';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-hero text-primary-foreground px-safe pt-safe pb-6">
        <div className="px-4 pt-4 flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => navigate("/staff")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Redeem Voucher</h1>
            <p className="text-sm opacity-90">Enter customer voucher code to redeem</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {!voucher && !redeemSuccess ? (
          // Initial state - show code input form
          <Card className="p-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Gift className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-center mb-2">Enter Voucher Code</h2>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Ask the customer for their voucher code shown on their voucher
            </p>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="e.g. F5E1923860D5"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  className="text-center text-lg font-mono tracking-wider uppercase pr-10"
                  autoComplete="off"
                  autoCapitalize="characters"
                />
              </div>
              
              {error && (
                <div className="text-sm text-destructive text-center bg-destructive/10 p-3 rounded-lg">
                  {error}
                </div>
              )}
              
              <Button 
                type="submit" 
                size="lg" 
                className="w-full"
                disabled={isLoading || !codeInput.trim()}
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    Looking up...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Look Up Voucher
                  </>
                )}
              </Button>
            </form>
          </Card>
        ) : redeemSuccess && voucher ? (
          // Success state - voucher redeemed
          <Card className="p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold text-green-600 mb-2">Voucher Redeemed!</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Successfully redeemed voucher for {voucher.customer_name}
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="text-2xl font-bold text-primary">
                {voucher.value} {voucher.currency}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Code: {voucher.code}
              </div>
            </div>
            <Button onClick={handleReset} className="w-full">
              Redeem Another Voucher
            </Button>
          </Card>
        ) : voucher ? (
          // Voucher found - show details and redeem option
          <Card className="overflow-hidden">
            {/* Voucher header */}
            <div className="bg-primary p-6 text-primary-foreground text-center">
              <Gift className="h-8 w-8 mx-auto mb-2" />
              <div className="text-sm opacity-90">VOUCHER</div>
              <div className="text-3xl font-bold">
                {voucher.value} {voucher.currency}
              </div>
            </div>

            {/* Voucher details */}
            <div className="p-6 space-y-4">
              {/* Status badge */}
              <div className="text-center">
                {isRedeemed ? (
                  <Badge variant="secondary" className="text-sm">
                    Already Redeemed
                  </Badge>
                ) : isExpired ? (
                  <Badge variant="destructive" className="text-sm">
                    Expired
                  </Badge>
                ) : (
                  <Badge className="text-sm bg-green-500 hover:bg-green-600">
                    Active
                  </Badge>
                )}
              </div>

              {/* Customer info */}
              <div className="text-center">
                <div className="text-sm text-muted-foreground">Issued to</div>
                <div className="font-semibold">{voucher.customer_name}</div>
              </div>

              {/* Code */}
              <div className="bg-muted/50 rounded-lg p-3 text-center">
                <div className="text-sm text-muted-foreground mb-1">Voucher Code</div>
                <div className="text-xl font-mono font-bold text-primary">{voucher.code}</div>
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valid until:</span>
                  <span className={isExpired ? "text-destructive" : ""}>
                    {format(new Date(voucher.expires_at), "MMM d, yyyy")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Locations:</span>
                  <span>{getLocationNames(voucher.location_ids)}</span>
                </div>
                {isRedeemed && voucher.redeemed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Redeemed at:</span>
                    <span>{format(new Date(voucher.redeemed_at), "MMM d, yyyy HH:mm")}</span>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="pt-4 space-y-2">
                {canRedeem ? (
                  <Button 
                    onClick={handleRedeem} 
                    className="w-full" 
                    size="lg"
                    disabled={isRedeeming}
                  >
                    {isRedeeming ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                        Redeeming...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Redeem Voucher
                      </>
                    )}
                  </Button>
                ) : (
                  <Button disabled className="w-full" size="lg" variant="secondary">
                    {isRedeemed ? "Already Redeemed" : "Cannot Redeem"}
                  </Button>
                )}
                <Button onClick={handleReset} variant="outline" className="w-full">
                  Enter Different Code
                </Button>
              </div>
            </div>
          </Card>
        ) : null}
      </div>

      <StaffBottomNav />
    </div>
  );
};

export default StaffScanVoucher;
