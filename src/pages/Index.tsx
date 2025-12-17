import { useAuth } from "@/contexts/AuthContext";
import Landing from "./Landing";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const { isAccountPaused, isLoading: companyLoading } = useCompanyContext();

  // Show loading state
  if (loading || companyLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Show account paused state
  if (user && isAccountPaused) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription className="mt-2">
            <h3 className="font-semibold text-lg mb-2">{t('index.accountPaused')}</h3>
            <p className="mb-4">{t('index.trialExpired')}</p>
            <Link to="/pricing">
              <Button className="w-full">
                {t('index.viewPricingPlans')}
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Redirect to dashboard if logged in, otherwise show landing
  return user ? <Navigate to="/dashboard" replace /> : <Landing />;
};

export default Index;
