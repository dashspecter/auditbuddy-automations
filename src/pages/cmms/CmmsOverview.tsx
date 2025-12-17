import { useNavigate } from "react-router-dom";
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

  const problems = [
    {
      title: "Equipment Downtime",
      description: "Unexpected failures cost time and money.",
      solution: "CMMS helps prevent breakdowns with scheduled maintenance.",
      icon: AlertTriangle,
    },
    {
      title: "No Visibility",
      description: "Without structure, it's impossible to know what's done, overdue, or critical.",
      solution: "CMMS gives real-time visibility across all locations.",
      icon: Eye,
    },
    {
      title: "Inconsistent Work",
      description: "Different people, different standards.",
      solution: "CMMS enforces procedures and checklists every time.",
      icon: ClipboardCheck,
    },
    {
      title: "Audits & Contracts",
      description: '"Show me proof."',
      solution: "CMMS provides history, reports, and evidence for audits and clients.",
      icon: FileText,
    },
  ];

  const flowSteps = [
    { step: 1, title: "Assets", description: "Register all equipment with location, criticality, and QR codes.", icon: Package },
    { step: 2, title: "Work Orders", description: "Create tasks manually, from requests, or automatically from schedules.", icon: Wrench },
    { step: 3, title: "Procedures & Checklists", description: "Guide technicians step-by-step and capture proof of work.", icon: ClipboardList },
    { step: 4, title: "Preventive Maintenance", description: "Automatically generate work orders on a schedule or usage.", icon: Calendar },
    { step: 5, title: "Parts & Inventory", description: "Track spare parts, consumption, and restocking.", icon: Boxes },
    { step: 6, title: "Reports & History", description: "Analyze performance, costs, compliance, and downtime.", icon: BarChart3 },
  ];

  const modules = [
    { icon: Package, title: "Assets", description: "Central registry of all equipment, locations, and QR codes.", url: "/cmms/assets" },
    { icon: Wrench, title: "Work Orders", description: "Create, assign, track, and complete maintenance tasks.", url: "/cmms/work-orders" },
    { icon: Calendar, title: "PM Schedules", description: "Preventive maintenance plans that auto-generate work orders.", url: "/cmms/pm-schedules" },
    { icon: ClipboardList, title: "Procedures", description: "Standard operating procedures and inspection checklists.", url: "/cmms/procedures" },
    { icon: Boxes, title: "Parts Inventory", description: "Track stock levels, consumption, and low-stock alerts.", url: "/cmms/parts" },
    { icon: FileBox, title: "Purchase Orders", description: "Order and receive parts from vendors.", url: "/cmms/purchase-orders" },
    { icon: Users, title: "Teams", description: "Organize technicians and responsibilities.", url: "/cmms/teams" },
    { icon: Factory, title: "Vendors", description: "Manage external contractors and suppliers.", url: "/cmms/vendors" },
    { icon: BarChart3, title: "Reports", description: "Performance, compliance, costs, and audit-ready history.", url: "/cmms/reports" },
  ];

  const personas = [
    {
      title: "Operations Managers",
      description: "Control maintenance, reduce downtime, and see what's happening in real time.",
      icon: Building,
    },
    {
      title: "Technicians & Teams",
      description: "Clear tasks, clear instructions, mobile-first execution.",
      icon: Smartphone,
    },
    {
      title: "Auditors & Management",
      description: "Proof of work, traceability, and reports — without manual effort.",
      icon: Shield,
    },
  ];

  const useCases = [
    "Monthly HVAC inspections",
    "Forklift preventive maintenance",
    "Fire extinguisher checks",
    "Kitchen equipment servicing",
    "Warehouse equipment tracking",
    "Multi-location franchise maintenance",
  ];

  const differentiators = [
    "Built for multi-location operations",
    "Mobile-first for technicians",
    "Audit-ready by default",
    "Designed to scale to enterprise & industrial contracts",
    "Integrates with Dashspect Ops & AI layers",
  ];

  return (
    <div className="p-6 space-y-16 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
          <Cog className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          CMMS — Maintenance & Asset Management System
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Plan, execute, track, and prove maintenance across all your equipment and locations.
        </p>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          CMMS (Computerized Maintenance Management System) helps you prevent breakdowns, 
          standardize work, control costs, and stay compliant — all in one place.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Button size="lg" onClick={() => navigate("/cmms")}>
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/cmms/work-orders")}>
            View Work Orders
          </Button>
        </div>
      </section>

      {/* Why CMMS Matters */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Why CMMS Matters</h2>
          <p className="text-muted-foreground mt-2">The problems that CMMS solves</p>
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
          <h2 className="text-3xl font-bold">How CMMS Works</h2>
          <p className="text-muted-foreground mt-2">End-to-end maintenance workflow</p>
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
          Every action is logged, traceable, and linked to assets and people.
        </p>
      </section>

      {/* CMMS Modules */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold">CMMS Modules</h2>
          <p className="text-muted-foreground mt-2">Everything you need to manage maintenance</p>
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
          <h2 className="text-3xl font-bold">Who CMMS is For</h2>
          <p className="text-muted-foreground mt-2">Built for every role in maintenance operations</p>
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
          <h2 className="text-3xl font-bold">Common Use Cases</h2>
          <p className="text-muted-foreground mt-2">Real-world applications</p>
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
          <h2 className="text-3xl font-bold">Why Dashspect CMMS</h2>
          <p className="text-muted-foreground mt-2">What makes this different</p>
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
          <h2 className="text-3xl font-bold">Get Started</h2>
          <p className="text-muted-foreground mt-2">Choose your starting point</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" onClick={() => navigate("/cmms")}>
            View Dashboard
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/cmms/assets")}>
            Add Your First Asset
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/cmms/work-orders")}>
            Create a Work Order
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/cmms/pm-schedules")}>
            Set Up Preventive Maintenance
          </Button>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Most teams start by adding assets, then creating their first preventive maintenance plan.
        </p>
      </section>
    </div>
  );
}
