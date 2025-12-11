import { useParams } from "react-router-dom";
import { useVoucherByCode } from "@/hooks/useVouchers";
import { useLocations } from "@/hooks/useLocations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Gift, Calendar, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";

export default function VoucherPage() {
  const { code } = useParams<{ code: string }>();
  const { data: voucher, isLoading, error } = useVoucherByCode(code);
  const { data: locations } = useLocations();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Voucher Not Found</h2>
            <p className="text-muted-foreground">
              This voucher code is invalid or has been removed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const validLocations = locations?.filter(l => voucher.location_ids.includes(l.id)) || [];
  const isExpired = new Date(voucher.expires_at) < new Date();
  const isRedeemed = voucher.status === 'redeemed';
  const isActive = voucher.status === 'active' && !isExpired;

  const getStatusBadge = () => {
    if (isRedeemed) {
      return <Badge variant="secondary" className="text-base px-4 py-1">Redeemed</Badge>;
    }
    if (isExpired) {
      return <Badge variant="destructive" className="text-base px-4 py-1">Expired</Badge>;
    }
    return <Badge className="text-base px-4 py-1 bg-green-600">Active</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Thank You Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Thank You!</h1>
          <p className="text-muted-foreground">
            Your feedback has been submitted. Here's your reward!
          </p>
        </div>

        {/* Voucher Card */}
        <Card className="overflow-hidden border-2">
          <CardHeader className="bg-primary text-primary-foreground text-center pb-8">
            {voucher.brand_logo_url && (
              <img 
                src={voucher.brand_logo_url} 
                alt="Brand" 
                className="h-12 w-auto mx-auto mb-4 object-contain brightness-0 invert"
              />
            )}
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gift className="h-6 w-6" />
              <span className="text-lg font-medium">VOUCHER</span>
            </div>
            <CardTitle className="text-4xl font-bold">
              {voucher.value} {voucher.currency}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="pt-6 space-y-6">
            {/* Status */}
            <div className="flex justify-center">
              {getStatusBadge()}
            </div>

            {/* Customer Name */}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Issued to</p>
              <p className="text-lg font-semibold">{voucher.customer_name}</p>
            </div>

            {/* Voucher Code */}
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Voucher Code</p>
              <p className="text-2xl font-mono font-bold tracking-wider text-primary">
                {voucher.code}
              </p>
            </div>

            {/* QR Code */}
            {isActive && (
              <div className="flex justify-center">
                <div className="p-4 bg-white rounded-lg">
                  <QRCodeSVG 
                    value={voucher.code} 
                    size={150}
                    level="H"
                  />
                </div>
              </div>
            )}

            {/* Expiry Date */}
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Valid until: {format(new Date(voucher.expires_at), "MMMM d, yyyy")}
              </span>
            </div>

            {/* Valid Locations */}
            {validLocations.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Valid at:</span>
                </div>
                <ul className="text-sm text-muted-foreground space-y-1 pl-6">
                  {validLocations.map(location => (
                    <li key={location.id}>{location.name}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Terms */}
            {voucher.terms_text && (
              <div className="text-xs text-muted-foreground border-t pt-4">
                <p className="font-medium mb-1">Terms & Conditions:</p>
                <p>{voucher.terms_text}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <p className="text-center text-sm text-muted-foreground">
          Show this voucher to the staff when making your purchase.
        </p>
      </div>
    </div>
  );
}
