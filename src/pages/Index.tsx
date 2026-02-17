import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Landing from "./Landing";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const Index = () => {
  const { t } = useTranslation();
  const { user, loading, isStaff, staffCheckComplete } = useAuth();
  const { isAccountPaused, isLoading: companyLoading } = useCompanyContext();
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  const isLoading = loading || companyLoading || !staffCheckComplete;

  useEffect(() => {
    if (!isLoading) {
      setLoadingTooLong(false);
      return;
    }
    const timer = setTimeout(() => setLoadingTooLong(true), 8000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">{t('common.loading')}</p>
          {loadingTooLong && (
            <div className="mt-6 space-y-2">
              <p className="text-sm text-muted-foreground">{t('common.loadingTooLong', 'Încărcarea durează prea mult?')}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if ('caches' in window) {
                    window.caches.keys().then(keys => Promise.all(keys.map(k => window.caches.delete(k))));
                  }
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
                  }
                  window.location.href = window.location.pathname + '?resetApp=1';
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('common.clearCacheReload', 'Resetează și reîncarcă')}
              </Button>
            </div>
          )}
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

  // Redirect to staff home for staff users, otherwise to dashboard
  if (user) {
    return <Navigate to={isStaff ? "/staff" : "/dashboard"} replace />;
  }

  // Otherwise show landing
  return <Landing />;
};

export default Index;
