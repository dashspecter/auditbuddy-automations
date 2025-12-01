import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Upload, FileBarChart, TruckIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { ModuleGate } from "@/components/ModuleGate";
import { EmptyState } from "@/components/EmptyState";
import { useNavigate } from "react-router-dom";

const Inventory = () => {
  const navigate = useNavigate();

  // TODO: Add actual inventory data hook when available
  const hasInventoryData = false;

  const modules = [
    {
      title: "Inventory Items",
      description: "Manage your product catalog and stock items",
      icon: Package,
      link: "/inventory/items",
      action: "View Items",
    },
    {
      title: "Count Snapshots",
      description: "Take and review inventory count sessions",
      icon: FileBarChart,
      link: "/inventory/snapshots",
      action: "View Snapshots",
    },
    {
      title: "Suppliers",
      description: "Manage your supplier directory",
      icon: TruckIcon,
      link: "/inventory/suppliers",
      action: "View Suppliers",
    },
    {
      title: "Invoices",
      description: "Upload and parse supplier invoices with AI",
      icon: Upload,
      link: "/inventory/invoices",
      action: "View Invoices",
    },
  ];

  return (
    <ModuleGate module="inventory">
      <AppLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Inventory Management</h1>
              <p className="text-muted-foreground mt-1">
                Track stock, manage suppliers, and process invoices
              </p>
            </div>
            <Button className="gap-2" onClick={() => navigate("/inventory/snapshots/new")}>
              <Package className="h-4 w-4" />
              Take Count
            </Button>
          </div>

          {!hasInventoryData ? (
            <EmptyState
              icon={Package}
              title="No Inventory Items Yet"
              description="Start managing your inventory by setting up items, taking stock counts, and tracking suppliers."
              action={{
                label: "Add First Item",
                onClick: () => navigate("/inventory/items/new")
              }}
              secondaryAction={{
                label: "Take Inventory Count",
                onClick: () => navigate("/inventory/snapshots/new")
              }}
            />
          ) : (
            <>
              <div className="grid gap-6 md:grid-cols-2">
                {modules.map((module) => (
                  <Card key={module.title} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <module.icon className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{module.title}</CardTitle>
                      </div>
                      <CardDescription>{module.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link to={module.link}>
                        <Button variant="outline" className="w-full">
                          {module.action}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Quick Stats */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Last Count
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">-</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Active Suppliers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      This Month Invoices
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">0</div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </AppLayout>
    </ModuleGate>
  );
};

export default Inventory;