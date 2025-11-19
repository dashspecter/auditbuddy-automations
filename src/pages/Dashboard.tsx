import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, Users, TrendingUp, FileText, Plus, MapPin, Calendar } from "lucide-react";
import { Header } from "@/components/Header";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { RecentAudits } from "@/components/dashboard/RecentAudits";
import { ComplianceChart } from "@/components/dashboard/ComplianceChart";
import { DraftAudits } from "@/components/dashboard/DraftAudits";
import { Link } from "react-router-dom";
import { useLocationAudits } from "@/hooks/useAudits";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { data: audits, isLoading: auditsLoading } = useLocationAudits();

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
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2">Location Audits</h2>
                  <p className="text-muted-foreground">
                    View and manage location standard audits for all restaurants
                  </p>
                </div>
                <Link to="/audits">
                  <Button>View All Location Audits</Button>
                </Link>
              </div>

              {auditsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
              ) : audits && audits.length > 0 ? (
                <div className="space-y-4">
                  {audits.slice(0, 5).map((audit) => (
                    <Link 
                      key={audit.id} 
                      to={`/audits/${audit.id}`}
                      className="block"
                    >
                      <Card className="p-4 hover:shadow-md transition-all hover:scale-[1.01] cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="bg-primary/10 p-3 rounded-lg">
                              <MapPin className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground">
                                {audit.location || 'Unknown Location'}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {audit.audit_date ? format(new Date(audit.audit_date), 'MMM dd, yyyy') : 'No date'}
                                </span>
                                {audit.overall_score && (
                                  <span className="font-medium text-foreground">
                                    Score: {audit.overall_score}%
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Badge className={getStatusColor(audit.status || 'draft')}>
                            {audit.status || 'Draft'}
                          </Badge>
                        </div>
                      </Card>
                    </Link>
                  ))}
                  {audits.length > 5 && (
                    <Link to="/audits">
                      <Button variant="outline" className="w-full">
                        View All {audits.length} Audits
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-muted/50 rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No audits yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Get started by creating your first location audit
                  </p>
                  <Link to="/location-audit">
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create Your First Audit
                    </Button>
                  </Link>
                </div>
              )}
            </Card>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
};

export default Dashboard;
