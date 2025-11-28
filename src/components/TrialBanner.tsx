import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import { useCompanyContext } from "@/contexts/CompanyContext";

export const TrialBanner = () => {
  const { isTrialExpired, trialDaysRemaining, isAccountPaused, isLoading } = useCompanyContext();

  if (isLoading) return null;

  // Account is paused
  if (isAccountPaused) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Account Paused</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>Your trial has expired. Please upgrade to continue using DashSpect.</span>
          <Link to="/pricing">
            <Button size="sm" variant="secondary">
              <CreditCard className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Trial expiring soon (3 days or less)
  if (!isTrialExpired && trialDaysRemaining > 0 && trialDaysRemaining <= 3) {
    return (
      <Alert className="mb-4 border-warning bg-warning/10">
        <Clock className="h-4 w-4 text-warning" />
        <AlertTitle className="text-warning">Trial Ending Soon</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Your trial expires in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}. Upgrade to continue without interruption.
          </span>
          <Link to="/pricing">
            <Button size="sm" variant="outline">
              View Plans
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Trial expired but not yet paused
  if (isTrialExpired && !isAccountPaused) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Trial Expired</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>Your trial has expired. Your account will be paused soon.</span>
          <Link to="/pricing">
            <Button size="sm" variant="secondary">
              <CreditCard className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};