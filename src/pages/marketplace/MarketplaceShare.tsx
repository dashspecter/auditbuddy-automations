import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useMarketplaceTemplateByToken } from "@/hooks/useMarketplace";

export default function MarketplaceShare() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: template, isLoading, error } = useMarketplaceTemplateByToken(token || "");

  useEffect(() => {
    if (template) {
      // Redirect to the actual template page
      navigate(`/marketplace/template/${template.slug}`, { replace: true });
    }
  }, [template, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading template...</p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Template Not Found</h1>
          <p className="text-muted-foreground">
            This shared link may be invalid or the template has been removed.
          </p>
          <button
            onClick={() => navigate("/marketplace")}
            className="text-primary hover:underline"
          >
            Browse Marketplace
          </button>
        </div>
      </div>
    );
  }

  return null;
}
