import { useState, useMemo, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, Users, TrendingUp, FileText, Plus, MapPin, Calendar, BookOpen } from "lucide-react";
import { Header } from "@/components/Header";
import { AdminDashboard } from "@/components/dashboard/AdminDashboard";
import { ManagerDashboard } from "@/components/dashboard/ManagerDashboard";
import { CheckerDashboard } from "@/components/dashboard/CheckerDashboard";
import { ModuleGuides } from "@/components/dashboard/ModuleGuides";
import { RoleBasedView } from "@/components/RoleBasedView";
import { OnboardingDialog } from "@/components/OnboardingDialog";
import { TrialBanner } from "@/components/TrialBanner";
import { Link } from "react-router-dom";
import { useLocationAudits } from "@/hooks/useAudits";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { PullToRefresh } from "@/components/PullToRefresh";
import { BackToTop } from "@/components/BackToTop";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("guides");
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
        <main className="container mx-auto px-4 px-safe py-8 pb-safe">
          <TrialBanner />
          
          <Tabs defaultValue="guides" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="guides">
                <BookOpen className="h-4 w-4 mr-2" />
                Getting Started
              </TabsTrigger>
              <TabsTrigger value="dashboard">
                <TrendingUp className="h-4 w-4 mr-2" />
                Dashboard
              </TabsTrigger>
            </TabsList>

            <TabsContent value="guides">
              <ModuleGuides />
            </TabsContent>

            <TabsContent value="dashboard">
              <RoleBasedView
                admin={<AdminDashboard />}
                manager={<ManagerDashboard />}
                checker={<CheckerDashboard />}
              />
            </TabsContent>
          </Tabs>
        </main>
      </PullToRefresh>
      
      <BackToTop />
    </div>
  );
};

export default Dashboard;
