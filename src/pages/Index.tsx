import { useAuth } from "@/contexts/AuthContext";
import Dashboard from "./Dashboard";
import Landing from "./Landing";
import { useCompanyContext } from "@/contexts/CompanyContext";
import { TrialBanner } from "@/components/TrialBanner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user, loading } = useAuth();
  const { isAccountPaused, isLoading: companyLoading } = useCompanyContext();

  if (loading || companyLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (user && isAccountPaused) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription className="mt-2">
            <h3 className="font-semibold text-lg mb-2">Account Paused</h3>
            <p className="mb-4">Your free trial has expired. Please upgrade to a paid plan to continue using DashSpect.</p>
            <Link to="/pricing">
              <Button className="w-full">
                View Pricing Plans
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      {user && <TrialBanner />}
      {user ? <Dashboard /> : <Landing />}
    </>
  );
};

export default Index;
