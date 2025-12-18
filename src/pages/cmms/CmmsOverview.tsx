import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  Cog, 
  ArrowRight, 
  AlertTriangle, 
  Eye, 
  ClipboardCheck, 
  FileText,
  Package,
  Wrench,
  Calendar,
  ClipboardList,
  Boxes,
  FileBox,
  Users,
  Factory,
  BarChart3,
  Building,
  Smartphone,
  Shield,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CmmsOverview() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const problems = [
    {
      title: t("cmms.overview.problems.downtime.title"),
      description: t("cmms.overview.problems.downtime.description"),
      solution: t("cmms.overview.problems.downtime.solution"),
      icon: AlertTriangle,
    },
    {
      title: t("cmms.overview.problems.visibility.title"),
      description: t("cmms.overview.problems.visibility.description"),
      solution: t("cmms.overview.problems.visibility.solution"),
      icon: Eye,
    },
    {
      title: t("cmms.overview.problems.inconsistent.title"),
      description: t("cmms.overview.problems.inconsistent.description"),
      solution: t("cmms.overview.problems.inconsistent.solution"),
      icon: ClipboardCheck,
    },
    {
      title: t("cmms.overview.problems.audits.title"),
      description: t("cmms.overview.problems.audits.description"),
      solution: t("cmms.overview.problems.audits.solution"),
      icon: FileText,
    },
  ];

  const flowSteps = [
    { step: 1, title: t("cmms.overview.flowSteps.assets.title"), description: t("cmms.overview.flowSteps.assets.description"), icon: Package },
    { step: 2, title: t("cmms.overview.flowSteps.workOrders.title"), description: t("cmms.overview.flowSteps.workOrders.description"), icon: Wrench },
    { step: 3, title: t("cmms.overview.flowSteps.procedures.title"), description: t("cmms.overview.flowSteps.procedures.description"), icon: ClipboardList },
    { step: 4, title: t("cmms.overview.flowSteps.pm.title"), description: t("cmms.overview.flowSteps.pm.description"), icon: Calendar },
    { step: 5, title: t("cmms.overview.flowSteps.parts.title"), description: t("cmms.overview.flowSteps.parts.description"), icon: Boxes },
    { step: 6, title: t("cmms.overview.flowSteps.reports.title"), description: t("cmms.overview.flowSteps.reports.description"), icon: BarChart3 },
  ];

  const modules = [
    { icon: Package, title: t("cmms.overview.modulesList.assets.title"), description: t("cmms.overview.modulesList.assets.description"), url: "/cmms/assets" },
    { icon: Wrench, title: t("cmms.overview.modulesList.workOrders.title"), description: t("cmms.overview.modulesList.workOrders.description"), url: "/cmms/work-orders" },
    { icon: Calendar, title: t("cmms.overview.modulesList.pmSchedules.title"), description: t("cmms.overview.modulesList.pmSchedules.description"), url: "/cmms/pm-schedules" },
    { icon: ClipboardList, title: t("cmms.overview.modulesList.procedures.title"), description: t("cmms.overview.modulesList.procedures.description"), url: "/cmms/procedures" },
    { icon: Boxes, title: t("cmms.overview.modulesList.partsInventory.title"), description: t("cmms.overview.modulesList.partsInventory.description"), url: "/cmms/parts" },
    { icon: FileBox, title: t("cmms.overview.modulesList.purchaseOrders.title"), description: t("cmms.overview.modulesList.purchaseOrders.description"), url: "/cmms/purchase-orders" },
    { icon: Users, title: t("cmms.overview.modulesList.teams.title"), description: t("cmms.overview.modulesList.teams.description"), url: "/cmms/teams" },
    { icon: Factory, title: t("cmms.overview.modulesList.vendors.title"), description: t("cmms.overview.modulesList.vendors.description"), url: "/cmms/vendors" },
    { icon: BarChart3, title: t("cmms.overview.modulesList.reports.title"), description: t("cmms.overview.modulesList.reports.description"), url: "/cmms/reports" },
  ];

  const personas = [
    {
      title: t("cmms.overview.personas.opsManagers.title"),
      description: t("cmms.overview.personas.opsManagers.description"),
      icon: Building,
    },
    {
      title: t("cmms.overview.personas.technicians.title"),
      description: t("cmms.overview.personas.technicians.description"),
      icon: Smartphone,
    },
    {
      title: t("cmms.overview.personas.auditors.title"),
      description: t("cmms.overview.personas.auditors.description"),
      icon: Shield,
    },
  ];

  const useCases = [
    t("cmms.overview.useCasesList.hvac"),
    t("cmms.overview.useCasesList.forklift"),
    t("cmms.overview.useCasesList.fire"),
    t("cmms.overview.useCasesList.kitchen"),
    t("cmms.overview.useCasesList.warehouse"),
    t("cmms.overview.useCasesList.franchise"),
  ];

  const differentiators = [
    t("cmms.overview.differentiators.multiLocation"),
    t("cmms.overview.differentiators.mobilFirst"),
    t("cmms.overview.differentiators.auditReady"),
    t("cmms.overview.differentiators.scalable"),
    t("cmms.overview.differentiators.integrates"),
  ];

  return (
    <div className="p-6 space-y-16 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
          <Cog className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          {t("cmms.overview.heroTitle")}
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          {t("cmms.overview.heroSubtitle")}
        </p>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t("cmms.overview.heroDescription")}
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button size="lg" onClick={() => navigate("/cmms")}>
            {t("cmms.overview.goToDashboard")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/cmms/work-orders")}>
            {t("cmms.overview.viewWorkOrders")}
          </Button>
        </div>
      </section>

      {/* Why CMMS Matters */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">{t("cmms.overview.whyMatters")}</h2>
          <p className="text-muted-foreground mt-2">{t("cmms.overview.whyMattersSubtitle")}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, idx) => (
            <Card key={idx} className="border-border/50">
              <CardHeader className="pb-3">
                <div className="p-2 bg-destructive/10 rounded-lg w-fit mb-2">
                  <problem.icon className="h-5 w-5 text-destructive" />
                </div>
                <CardTitle className="text-lg">{problem.title}</CardTitle>
                <CardDescription>{problem.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-primary font-medium">{problem.solution}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How CMMS Works */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">{t("cmms.overview.howWorks")}</h2>
          <p className="text-muted-foreground mt-2">{t("cmms.overview.howWorksSubtitle")}</p>
        </div>
        <div className="relative">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {flowSteps.map((step, idx) => (
              <Card key={idx} className="relative border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {step.step}
                    </span>
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </CardContent>
                {idx < flowSteps.length - 1 && (
                  <ArrowRight className="hidden xl:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/50 z-10" />
                )}
              </Card>
            ))}
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {t("cmms.overview.everyActionLogged")}
        </p>
      </section>

      {/* CMMS Modules */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">{t("cmms.overview.modules")}</h2>
          <p className="text-muted-foreground mt-2">{t("cmms.overview.modulesSubtitle")}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module, idx) => (
            <Card 
              key={idx} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(module.url)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <module.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <CardTitle className="text-base">{module.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{module.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Who CMMS is For */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">{t("cmms.overview.whoFor")}</h2>
          <p className="text-muted-foreground mt-2">{t("cmms.overview.whoForSubtitle")}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {personas.map((persona, idx) => (
            <Card key={idx} className="text-center">
              <CardHeader>
                <div className="mx-auto p-3 bg-primary/10 rounded-full mb-2">
                  <persona.icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle>{persona.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{persona.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Common Use Cases */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">{t("cmms.overview.useCases")}</h2>
          <p className="text-muted-foreground mt-2">{t("cmms.overview.useCasesSubtitle")}</p>
        </div>
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <ul className="grid sm:grid-cols-2 gap-3">
              {useCases.map((useCase, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {useCase}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Why Dashspect CMMS */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">{t("cmms.overview.whyDashspect")}</h2>
          <p className="text-muted-foreground mt-2">{t("cmms.overview.whyDashspectSubtitle")}</p>
        </div>
        <Card className="max-w-2xl mx-auto bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {differentiators.map((item, idx) => (
                <li key={idx} className="flex items-center gap-3">
                  <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Get Started */}
      <section className="space-y-8 pb-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">{t("cmms.overview.getStarted")}</h2>
          <p className="text-muted-foreground mt-2">{t("cmms.overview.getStartedSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" onClick={() => navigate("/cmms")}>
            {t("cmms.overview.viewDashboard")}
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/cmms/assets")}>
            {t("cmms.overview.addFirstAsset")}
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/cmms/work-orders")}>
            {t("cmms.overview.createWorkOrder")}
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/cmms/pm-schedules")}>
            {t("cmms.overview.setupPM")}
          </Button>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {t("cmms.overview.mostTeamsStart")}
        </p>
      </section>
    </div>
  );
}
