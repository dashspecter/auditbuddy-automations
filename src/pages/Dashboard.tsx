import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, Users, TrendingUp, FileText, Plus, MapPin, Calendar } from "lucide-react";
import { Header } from "@/components/Header";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { CheckerDashboard } from "@/components/dashboard/CheckerDashboard";
import { RoleBasedView } from "@/components/RoleBasedView";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { Link } from "react-router-dom";
import { useLocationAudits } from "@/hooks/useAudits";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { PullToRefresh } from "@/components/PullToRefresh";
import { BackToTop } from "@/components/BackToTop";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { data: audits, isLoading: auditsLoading, refetch } = useLocationAudits();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('dashspect_onboarding_completed');
    if (!hasCompletedOnboarding) {
      // Show onboarding after a short delay for better UX
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleRefresh = async () => {
    await refetch();
    await queryClient.invalidateQueries({ queryKey: ['location_audits'] });
    toast({
      title: "Refreshed",
      description: "Dashboard data has been updated.",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'in_progress':
        return 'bg-warning text-warning-foreground';
      case 'draft':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <OnboardingDialog open={showOnboarding} onOpenChange={setShowOnboarding} />
      
      <PullToRefresh onRefresh={handleRefresh}>
        <main className="container mx-auto px-4 py-8">
          <RoleBasedView
            admin={<AdminDashboard />}
            manager={<ManagerDashboard />}
            checker={<CheckerDashboard />}
          />
        </main>
      </PullToRefresh>
      
      <BackToTop />
    </div>
  );
};

export default Dashboard;
