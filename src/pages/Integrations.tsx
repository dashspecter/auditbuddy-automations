import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plug, ShoppingCart, FileText, MessageSquare, Zap, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const Integrations = () => {
  const availableIntegrations = [
    {
      name: "POS Systems",
      description: "Connect your Point of Sale system for real-time data",
      icon: ShoppingCart,
      status: "available",
      providers: ["Square", "Toast", "Clover"],
    },
    {
      name: "Invoicing",
      description: "Sync with invoicing platforms for automated processing",
      icon: FileText,
      status: "available",
      providers: ["QuickBooks", "Xero", "FreshBooks"],
    },
    {
      name: "WhatsApp Business",
      description: "Send notifications and updates via WhatsApp",
      icon: MessageSquare,
      status: "available",
      providers: ["WhatsApp API"],
    },
    {
      name: "AI Services",
      description: "Enhanced AI capabilities for insights and automation",
      icon: Zap,
      status: "active",
      providers: ["Lovable AI"],
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect DashSpect with your existing tools and services
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {availableIntegrations.map((integration) => (
            <Card key={integration.name} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <integration.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{integration.name}</CardTitle>
                  </div>
                  {integration.status === "active" ? (
                    <Badge className="bg-success text-success-foreground">
                      <Check className="mr-1 h-3 w-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline">Available</Badge>
                  )}
                </div>
                <CardDescription>{integration.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Supported providers:</p>
                    <div className="flex flex-wrap gap-2">
                      {integration.providers.map((provider) => (
                        <Badge key={provider} variant="secondary">
                          {provider}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button 
                    variant={integration.status === "active" ? "outline" : "default"} 
                    className="w-full"
                  >
                    {integration.status === "active" ? "Configure" : "Connect"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>API Access</CardTitle>
            <CardDescription>
              Build custom integrations with the DashSpect API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Our REST API allows you to build custom integrations and automate workflows. 
              Perfect for connecting your existing systems or building custom applications.
            </p>
            <div className="flex gap-2">
              <Button variant="outline">View API Documentation</Button>
              <Button variant="outline">Generate API Key</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Integrations;