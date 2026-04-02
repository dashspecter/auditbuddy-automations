import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Upload, FileBarChart, TruckIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { ModuleGate } from "@/components/ModuleGate";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Inventory = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const modules = [
    {
      title: t('inventory.items.title'),
      description: t('inventory.items.description'),
      icon: Package,
      link: "/inventory/items",
      action: t('inventory.items.action'),
    },
    {
      title: t('inventory.snapshots.title'),
      description: t('inventory.snapshots.description'),
      icon: FileBarChart,
      link: "/inventory/snapshots",
      action: t('inventory.snapshots.action'),
    },
    {
      title: t('inventory.suppliers.title'),
      description: t('inventory.suppliers.description'),
      icon: TruckIcon,
      link: "/inventory/suppliers",
      action: t('inventory.suppliers.action'),
    },
    {
      title: t('inventory.invoices.title'),
      description: t('inventory.invoices.description'),
      icon: Upload,
      link: "/inventory/invoices",
      action: t('inventory.invoices.action'),
    },
  ];

  return (
    <ModuleGate module="inventory">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('inventory.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('inventory.subtitle')}
            </p>
          </div>
          <Button className="gap-2" onClick={() => navigate("/inventory/items/new")}>
            <Package className="h-4 w-4" />
            {t('inventory.takeCount')}
          </Button>
        </div>

        {/* Module Navigation — always visible */}
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
      </div>
    </ModuleGate>
  );
};

export default Inventory;