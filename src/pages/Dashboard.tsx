import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, Users, TrendingUp, FileText, Plus } from "lucide-react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentAudits } from "@/components/dashboard/RecentAudits";
import { ComplianceChart } from "@/components/dashboard/ComplianceChart";
import { DraftAudits } from "@/components/dashboard/DraftAudits";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Audit Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage restaurant audits</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="location">Location</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <DraftAudits />
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Total Audits"
                value="124"
                icon={ClipboardCheck}
                trend="+12%"
                trendLabel="from last month"
              />
              <StatsCard
                title="Locations"
                value="4"
                icon={FileText}
                description="Active locations"
              />
              <StatsCard
                title="Compliance Rate"
                value="87%"
                icon={TrendingUp}
                trend="+5%"
                trendLabel="improvement"
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <ComplianceChart />
              <RecentAudits />
            </div>

            <div className="flex gap-4">
              <Button className="gap-2" onClick={() => window.location.href = "/location-audit"}>
                <Plus className="h-4 w-4" />
                New Location Audit
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="location" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Location Audits</h2>
              <p className="text-muted-foreground mb-4">
                View and manage location standard audits for all LBFC restaurants
              </p>
              <Button>View All Location Audits</Button>
            </Card>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
