import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIntegrations, useCreateIntegration } from "@/hooks/useIntegrations";
import { useNavigate } from "react-router-dom";
import { Plus, Settings, Plug, ShoppingCart, FileText, Users, Mail, Eye, Calendar, ChevronRight } from "lucide-react";
import { ModuleGate } from "@/components/ModuleGate";
import { EmptyState } from "@/components/EmptyState";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const INTEGRATION_TYPES = [
  {
    type: "pos",
    name: "Point of Sale",
    description: "Connect to POS systems for sales data",
    icon: ShoppingCart,
    color: "text-blue-500",
  },
  {
    type: "invoicing",
    name: "Invoicing",
    description: "Sync invoices and payment data",
    icon: FileText,
    color: "text-green-500",
  },
  {
    type: "workforce",
    name: "Workforce Management",
    description: "Connect external workforce systems",
    icon: Users,
    color: "text-purple-500",
  },
  {
    type: "messaging",
    name: "Messaging",
    description: "Email, SMS, and WhatsApp integration",
    icon: Mail,
    color: "text-orange-500",
  },
  {
    type: "ai_vision",
    name: "AI Vision",
    description: "Photo analysis and computer vision",
    icon: Eye,
    color: "text-pink-500",
  },
  {
    type: "calendar",
    name: "Calendar",
    description: "Google/Microsoft calendar sync",
    icon: Calendar,
    color: "text-indigo-500",
  },
];

const Integrations = () => {
  const { data: integrations, isLoading } = useIntegrations();
  const createIntegration = useCreateIntegration();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [integrationName, setIntegrationName] = useState("");

  const handleCreateIntegration = () => {
    if (!selectedType || !integrationName) return;
    
    const typeConfig = INTEGRATION_TYPES.find(t => t.type === selectedType);
    createIntegration.mutate({
      name: integrationName,
      integrationType: selectedType,
      description: typeConfig?.description,
    });
    setDialogOpen(false);
    setIntegrationName("");
    setSelectedType("");
  };

  const getIntegrationIcon = (type: string) => {
    const config = INTEGRATION_TYPES.find(t => t.type === type);
    return config?.icon || Plug;
  };

  const getIntegrationColor = (type: string) => {
    const config = INTEGRATION_TYPES.find(t => t.type === type);
    return config?.color || "text-gray-500";
  };

  return (
    <ModuleGate module="integrations">
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Integrations</h1>
            <p className="text-muted-foreground mt-1">
              Connect external systems and APIs
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Integration
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Integration</DialogTitle>
                <DialogDescription>Select an integration type and configure it</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Integration Type</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {INTEGRATION_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.type}
                          onClick={() => setSelectedType(type.type)}
                          className={`p-3 border rounded-lg text-left hover:bg-accent transition-colors ${
                            selectedType === type.type ? "border-primary bg-accent" : ""
                          }`}
                        >
                          <Icon className={`h-5 w-5 mb-2 ${type.color}`} />
                          <div className="font-medium text-sm">{type.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Integration Name</Label>
                  <Input
                    placeholder="My POS System"
                    value={integrationName}
                    onChange={(e) => setIntegrationName(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreateIntegration} disabled={!selectedType || !integrationName}>
                  Create Integration
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Available Integration Types */}
        <Card>
          <CardHeader>
            <CardTitle>Available Integrations</CardTitle>
            <CardDescription>Connect these systems to DashSpect</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {INTEGRATION_TYPES.map((type) => {
                const Icon = type.icon;
                const existing = integrations?.filter(i => i.integration_type === type.type).length || 0;
                return (
                  <div key={type.type} className="border rounded-lg p-4 hover:bg-accent transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <Icon className={`h-8 w-8 ${type.color}`} />
                      {existing > 0 && (
                        <Badge variant="secondary">{existing} active</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold mb-1">{type.name}</h3>
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Active Integrations */}
        <Card>
          <CardHeader>
            <CardTitle>Your Integrations</CardTitle>
            <CardDescription>Manage configured integrations</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading integrations...</div>
            ) : !integrations || integrations.length === 0 ? (
              <EmptyState
                icon={Plug}
                title="No Integrations"
                description="No integrations configured yet. Add your first integration to get started."
                action={{
                  label: "Add Integration",
                  onClick: () => setDialogOpen(true)
                }}
              />
            ) : (
              <div className="space-y-2">
                {integrations.map((integration) => {
                  const Icon = getIntegrationIcon(integration.integration_type);
                  const colorClass = getIntegrationColor(integration.integration_type);
                  return (
                    <div
                      key={integration.id}
                      className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => navigate(`/integrations/${integration.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Icon className={`h-6 w-6 ${colorClass}`} />
                          <div>
                            <h3 className="font-medium">{integration.name}</h3>
                            <p className="text-sm text-muted-foreground capitalize">
                              {integration.integration_type.replace(/_/g, " ")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={integration.status === "active" ? "default" : "secondary"}>
                            {integration.status}
                          </Badge>
                          <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
    </ModuleGate>
  );
};

export default Integrations;
