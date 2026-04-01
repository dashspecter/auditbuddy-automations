import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyContext } from "@/contexts/CompanyContext";
import LandingNFX from "./LandingNFX";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCompany } from "@/hooks/useCompany";

const Index = () => {
  const { t } = useTranslation();
  const { user, loading, isStaff, staffCheckComplete } = useAuth();
  const { isAccountPaused, isLoading: companyLoading } = useCompanyContext();
  const { data: company } = useCompany();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [loadingTooLong, setLoadingTooLong] = useState(false);

  // For anonymous visitors, only wait for auth loading
  const isLoading = user
    ? loading || companyLoading || !staffCheckComplete
    : loading;

  const redirectTarget = useMemo(() => {
    if (!user || isAccountPaused) return null;
    const isOwnerOrAdmin = company?.userRole === 'company_owner' || company?.userRole === 'company_admin';
    return isStaff
      ? '/staff'
      : isOwnerOrAdmin
      ? (isMobile ? '/command' : '/dash')
      : '/dashboard';
  }, [user, isAccountPaused, isStaff, company?.userRole, isMobile]);

  useEffect(() => {
    if (!isLoading && redirectTarget) {
      navigate(redirectTarget, { replace: true });
    }
  }, [isLoading, redirectTarget, navigate]);

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
                  window.location.href = '/?resetApp=1';
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

  // Show account paused state (only when user exists and company data loaded)
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

  // Redirect fires in useEffect above — return null while effect is pending
  if (!isLoading && redirectTarget) return null;

  // Otherwise show landing
  return <LandingNFX />;
};

export default Index;
