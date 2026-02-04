import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/Header";
import { BackToTop } from "@/components/BackToTop";
import {
  LayoutDashboard,
  ListTodo,
  ClipboardCheck,
  AlertTriangle,
  GraduationCap,
  Users,
  UserSearch,
  Trash2,
  Package,
  Wrench,
  Settings2,
  FileBarChart,
  Bot,
  Building2,
  Shield,
  Lock,
  Globe,
  Webhook,
  CheckCircle2,
  ArrowRight,
  Zap,
  Target,
  TrendingUp,
  Clock,
  ChevronRight,
  Mail,
  Phone,
  UtensilsCrossed,
  ShoppingBag,
  Building,
  Factory,
  Truck,
  Stethoscope,
  LucideIcon,
} from "lucide-react";

// ============================================================================
// MODULE DATA - Single source of truth. Add new modules here.
// ============================================================================

interface Module {
  id: string;
  name: string;
  icon: LucideIcon;
  summary: string;
  features: string[];
  outputs: string[];
  bestFor: string[];
  available: boolean; // false = "Available on request"
}

const modules: Module[] = [
  {
    id: "dashboard",
    name: "Operations Dashboard",
    icon: LayoutDashboard,
    summary: "Your command center for real-time visibility across all locations. See what's happening now, spot issues early, and act fast.",
    features: [
      "View live task completion rates across locations",
      "Monitor overdue items and pending approvals",
      "Track audit scores and compliance trends",
      "Access key performance indicators at a glance",
      "Drill down from summary to detail instantly",
      "Filter by location, date range, or team",
    ],
    outputs: [
      "Daily operations snapshot",
      "Location performance comparison",
      "Overdue items report",
      "Weekly trend summary",
    ],
    bestFor: ["Owner/COO", "Ops Manager", "Area Manager"],
    available: true,
  },
  {
    id: "tasks",
    name: "Tasks & Daily Execution",
    icon: ListTodo,
    summary: "Assign, track, and verify daily tasks. Ensure every shift executes the same standards consistently.",
    features: [
      "Create recurring daily, weekly, or custom tasks",
      "Assign tasks to roles or specific team members",
      "Require photo evidence for completion",
      "Track completion rates by location and role",
      "Set priority levels and due times",
      "Mobile-first task completion for staff",
    ],
    outputs: [
      "Daily completion report by location",
      "Task completion trends over time",
      "Non-compliance alerts",
      "Role-based task performance",
    ],
    bestFor: ["Ops Manager", "Store Manager", "Shift Lead"],
    available: true,
  },
  {
    id: "audits",
    name: "Audits & Checklists",
    icon: ClipboardCheck,
    summary: "Standardize inspections with custom templates. Capture evidence, score performance, and generate instant reports.",
    features: [
      "Build custom audit templates with sections and scoring",
      "Capture photos and notes for each item",
      "Schedule recurring audits automatically",
      "Compare scores across locations and time",
      "Generate PDF reports instantly",
      "Track corrective action completion",
    ],
    outputs: [
      "Audit score trends by location",
      "Section-by-section breakdown",
      "Photo evidence gallery",
      "Corrective action tracker",
      "Monthly compliance report",
    ],
    bestFor: ["QA Manager", "Ops Manager", "Store Manager", "Auditor"],
    available: true,
  },
  {
    id: "incidents",
    name: "Incident Reporting & CAPA",
    icon: AlertTriangle,
    summary: "Capture incidents in real-time, assign corrective actions, and prevent recurrence with structured follow-up.",
    features: [
      "Log incidents with photos and witness info",
      "Assign corrective and preventive actions",
      "Set due dates and track completion",
      "Categorize by type and severity",
      "Analyze recurring issues by location",
      "Escalate overdue items automatically",
    ],
    outputs: [
      "Incident log by location and type",
      "CAPA completion rates",
      "Root cause analysis summary",
      "Recurring issue alerts",
    ],
    bestFor: ["Ops Manager", "Store Manager", "QA", "HR"],
    available: true,
  },
  {
    id: "training",
    name: "Training & Certifications",
    icon: GraduationCap,
    summary: "Assign training modules, track completion, and ensure certifications stay current. Keep your team qualified.",
    features: [
      "Create training modules with quizzes",
      "Assign training by role or individual",
      "Track completion and quiz scores",
      "Set certification expiry reminders",
      "Generate training compliance reports",
      "Mobile-friendly training for staff",
    ],
    outputs: [
      "Training completion by employee",
      "Certification expiry alerts",
      "Quiz score analysis",
      "Compliance gap report",
    ],
    bestFor: ["HR/Training Manager", "Ops Manager", "Store Manager"],
    available: true,
  },
  {
    id: "workforce",
    name: "Workforce & Scheduling",
    icon: Users,
    summary: "Schedule shifts, manage attendance, and track labor costs. Give staff self-service tools for time-off and availability.",
    features: [
      "Build and publish weekly schedules",
      "Track clock-in/out with QR or kiosk",
      "Manage time-off requests and approvals",
      "Monitor late arrivals and absences",
      "Calculate hours and labor costs",
      "Staff self-service mobile app",
    ],
    outputs: [
      "Weekly schedule by location",
      "Attendance summary report",
      "Late/absence alerts",
      "Labor cost breakdown",
      "Time-off balance report",
    ],
    bestFor: ["Ops Manager", "Store Manager", "HR", "Shift Lead"],
    available: true,
  },
  {
    id: "mystery-shopper",
    name: "Mystery Shopper & Experience Quality",
    icon: UserSearch,
    summary: "Capture real guest experiences with anonymous evaluations. Identify service gaps before they become patterns.",
    features: [
      "Create custom mystery shopper forms",
      "Generate unique evaluation links",
      "Collect anonymous feedback with photos",
      "Score locations on service quality",
      "Compare results across locations",
      "Issue vouchers for participation",
    ],
    outputs: [
      "Mystery shop scores by location",
      "Service quality trends",
      "Guest experience breakdown",
      "Voucher redemption report",
    ],
    bestFor: ["Owner/COO", "Ops Manager", "QA"],
    available: true,
  },
  {
    id: "waste",
    name: "Waste & Loss Prevention",
    icon: Trash2,
    summary: "Track waste by category, identify patterns, and reduce losses. Hold teams accountable with clear reporting.",
    features: [
      "Log waste entries by product and reason",
      "Categorize by type (spoilage, prep, customer)",
      "Set waste targets by location",
      "Track variance against sales",
      "Identify top waste items",
      "Generate cost impact reports",
    ],
    outputs: [
      "Daily waste summary",
      "Waste by category and reason",
      "Cost impact analysis",
      "Location comparison",
      "Top 10 waste items",
    ],
    bestFor: ["Ops Manager", "Store Manager", "Kitchen Manager"],
    available: true,
  },
  {
    id: "inventory",
    name: "Inventory Signals & Variance Tracking",
    icon: Package,
    summary: "Monitor stock levels, track variances, and get alerts before issues become problems.",
    features: [
      "Track inventory counts by location",
      "Calculate variance against expected usage",
      "Set low-stock alerts",
      "Log receiving and transfers",
      "Identify shrinkage patterns",
      "Integrate with POS for usage data",
    ],
    outputs: [
      "Inventory count report",
      "Variance analysis",
      "Low-stock alerts",
      "Shrinkage summary",
    ],
    bestFor: ["Ops Manager", "Store Manager", "Kitchen Manager"],
    available: false, // Available on request
  },
  {
    id: "equipment",
    name: "Equipment & Asset Register",
    icon: Wrench,
    summary: "Maintain a complete asset register with QR tracking. Know what you have, where it is, and its maintenance status.",
    features: [
      "Create asset records with photos and specs",
      "Generate and print QR codes for tracking",
      "Track warranty and service contracts",
      "Log maintenance history",
      "Categorize by type and location",
      "Scan QR to access asset details",
    ],
    outputs: [
      "Asset register by location",
      "Warranty expiry alerts",
      "Maintenance history log",
      "Asset utilization report",
    ],
    bestFor: ["Ops Manager", "Maintenance", "Store Manager"],
    available: true,
  },
  {
    id: "maintenance",
    name: "Maintenance & Work Orders (CMMS)",
    icon: Settings2,
    summary: "Schedule preventive maintenance, manage work orders, and reduce equipment downtime with a full CMMS solution.",
    features: [
      "Create and assign work orders",
      "Schedule preventive maintenance cycles",
      "Track parts inventory and usage",
      "Manage external vendors and contractors",
      "Log labor hours and costs",
      "Analyze equipment reliability trends",
    ],
    outputs: [
      "Open work orders by priority",
      "PM schedule compliance",
      "Parts usage report",
      "Downtime analysis",
      "Vendor performance",
    ],
    bestFor: ["Maintenance Manager", "Ops Manager", "Facilities"],
    available: true,
  },
  {
    id: "vendor",
    name: "Vendor & Invoice Insights",
    icon: FileBarChart,
    summary: "Track vendor performance, manage invoices, and gain visibility into spend across locations.",
    features: [
      "Maintain vendor contact database",
      "Log and track invoices by vendor",
      "Analyze spend by category and location",
      "Rate vendor performance",
      "Set contract reminders",
      "Compare pricing across vendors",
    ],
    outputs: [
      "Spend analysis by vendor",
      "Invoice aging report",
      "Vendor scorecard",
      "Contract expiry alerts",
    ],
    bestFor: ["Owner/COO", "Ops Manager", "Finance"],
    available: false, // Available on request
  },
  {
    id: "reporting",
    name: "Reporting & Analytics",
    icon: FileBarChart,
    summary: "Generate cross-module reports and dashboards. Turn data into insights that drive decisions.",
    features: [
      "Build custom reports from any module",
      "Schedule automated report delivery",
      "Export to PDF, Excel, or email",
      "Create location comparison views",
      "Trend analysis with charts",
      "Role-based report access",
    ],
    outputs: [
      "Executive summary dashboard",
      "Location performance scorecard",
      "Custom report templates",
      "Scheduled email reports",
    ],
    bestFor: ["Owner/COO", "Ops Manager", "QA Manager"],
    available: true,
  },
  {
    id: "ai-assistant",
    name: "AI Assistant & Ops Copilot",
    icon: Bot,
    summary: "Ask questions in natural language and get instant answers from your operations data. Your AI-powered operations analyst.",
    features: [
      "Query data using natural language",
      "Get instant insights and summaries",
      "Identify anomalies and patterns",
      "Generate recommendations",
      "Summarize long audit reports",
      "Answer 'what if' scenarios",
    ],
    outputs: [
      "Natural language insights",
      "Anomaly detection alerts",
      "AI-generated summaries",
      "Predictive recommendations",
    ],
    bestFor: ["Owner/COO", "Ops Manager"],
    available: false, // Available on request
  },
  {
    id: "governance",
    name: "Multi-location Governance & Permissions",
    icon: Building2,
    summary: "Control who sees what across locations. Enforce consistent standards while allowing local flexibility.",
    features: [
      "Define roles with granular permissions",
      "Restrict access by location or region",
      "Audit user activity and changes",
      "Enforce approval workflows",
      "Manage company-wide settings centrally",
      "Delegate admin rights safely",
    ],
    outputs: [
      "User access report",
      "Activity audit log",
      "Permission matrix",
      "Change history",
    ],
    bestFor: ["Owner/COO", "IT/Admin", "Ops Manager"],
    available: true,
  },
];

// ============================================================================
// SECTION HEADER COMPONENT
// ============================================================================

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  id?: string;
}

const SectionHeader = ({ title, subtitle, id }: SectionHeaderProps) => (
  <div id={id} className="text-center mb-8 md:mb-12 scroll-mt-24">
    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-3">
      {title}
    </h2>
    {subtitle && (
      <p className="text-muted-foreground max-w-2xl mx-auto text-sm md:text-base">
        {subtitle}
      </p>
    )}
  </div>
);

// ============================================================================
// MODULE CARD COMPONENT
// ============================================================================

interface ModuleCardProps {
  module: Module;
}

const ModuleCard = ({ module }: ModuleCardProps) => {
  const Icon = module.icon;
  
  return (
    <Card id={module.id} className="scroll-mt-24 h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 rounded-lg p-2.5 shrink-0">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg md:text-xl">{module.name}</CardTitle>
          </div>
          {!module.available && (
            <Badge variant="secondary" className="text-xs shrink-0">
              Available on request
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm mt-2">{module.summary}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Features */}
        <div>
          <h4 className="font-semibold text-sm mb-2 text-foreground">What you get:</h4>
          <ul className="space-y-1.5">
            {module.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Outputs */}
        <div>
          <h4 className="font-semibold text-sm mb-2 text-foreground">Reports & outputs:</h4>
          <div className="flex flex-wrap gap-1.5">
            {module.outputs.map((output, i) => (
              <Badge key={i} variant="outline" className="text-xs font-normal">
                {output}
              </Badge>
            ))}
          </div>
        </div>

        {/* Best for */}
        <div>
          <h4 className="font-semibold text-sm mb-2 text-foreground">Best for:</h4>
          <div className="flex flex-wrap gap-1.5">
            {module.bestFor.map((role, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// STICKY NAVIGATION (DESKTOP)
// ============================================================================

interface StickyModuleNavProps {
  modules: Module[];
  activeModule: string;
}

const StickyModuleNav = ({ modules, activeModule }: StickyModuleNavProps) => (
  <nav className="hidden lg:block sticky top-20 space-y-1 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-3">
      Modules
    </p>
    {modules.map((module) => {
      const Icon = module.icon;
      const isActive = activeModule === module.id;
      return (
        <a
          key={module.id}
          href={`#${module.id}`}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
            isActive
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{module.name}</span>
          {!module.available && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 ml-auto shrink-0">
              Optional
            </Badge>
          )}
        </a>
      );
    })}
  </nav>
);

// ============================================================================
// MOBILE MODULE NAVIGATION
// ============================================================================

interface MobileModuleNavProps {
  modules: Module[];
  activeModule: string;
  onSelect: (id: string) => void;
}

const MobileModuleNav = ({ modules, activeModule, onSelect }: MobileModuleNavProps) => (
  <div className="lg:hidden sticky top-14 z-30 bg-background/95 backdrop-blur-sm border-b py-3 px-4">
    <Select value={activeModule} onValueChange={onSelect}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Jump to module..." />
      </SelectTrigger>
      <SelectContent>
        {modules.map((module) => (
          <SelectItem key={module.id} value={module.id}>
            {module.name}
            {!module.available && " (Optional)"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

// ============================================================================
// FAQ DATA
// ============================================================================

const faqs = [
  {
    question: "How fast can we roll out to 10 locations?",
    answer:
      "Most teams are live within 1–2 weeks. We provide onboarding support, template libraries, and training materials to accelerate your rollout. Larger deployments typically take 3–4 weeks with a phased approach.",
  },
  {
    question: "Can each location have different checklists but the same governance?",
    answer:
      "Yes. You can create location-specific templates while maintaining company-wide standards and reporting. Admins see everything; managers see only their locations. This gives you consistency where it matters and flexibility where it's needed.",
  },
  {
    question: "Do staff need training to use it?",
    answer:
      "The mobile interface is designed for zero training. Staff can complete tasks, clock in, and submit incidents in seconds. Managers typically need a 30-minute walkthrough. We provide video guides and documentation for all features.",
  },
  {
    question: "Does it work on mobile and kiosk?",
    answer:
      "Yes. Staff access the platform via mobile web (no app download required). Kiosk mode is available for shared devices at locations for clock-in/out and task completion. The full admin experience works on tablet and desktop.",
  },
  {
    question: "How do you prevent 'checkbox theatre'?",
    answer:
      "Three ways: (1) Photo evidence requirements on critical tasks, (2) Manager verification workflows where a second person must confirm completion, and (3) Trend analysis that flags unusual patterns like suspiciously perfect scores or tasks completed too quickly.",
  },
];

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

const FullPresentation = () => {
  const [activeModule, setActiveModule] = useState(modules[0].id);

  // Track active section based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      
      for (let i = modules.length - 1; i >= 0; i--) {
        const element = document.getElementById(modules[i].id);
        if (element && element.offsetTop <= scrollPosition) {
          setActiveModule(modules[i].id);
          break;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleModuleSelect = (id: string) => {
    setActiveModule(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <>
      <Helmet>
        <title>DashSpect Platform Overview | Operations Management for Multi-Location Businesses</title>
        <meta
          name="description"
          content="DashSpect turns daily operations into a system. Standardize execution, reduce losses, and gain real-time control across all your locations with our modular ops platform."
        />
        <meta property="og:title" content="DashSpect Platform Overview" />
        <meta
          property="og:description"
          content="Operations management for multi-location restaurants, retail, and hospitality. Audits, tasks, training, maintenance, and more in one platform."
        />
        <link rel="canonical" href="/full-presentation" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />

        {/* ================================================================
            HERO SECTION
        ================================================================ */}
        <section className="relative overflow-hidden bg-gradient-to-b from-muted/50 to-background py-12 md:py-20 lg:py-28">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6 leading-tight">
                DashSpect turns daily operations into a system — across every location.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                Standardize execution. Drive accountability. Get real-time visibility. Reduce incidents, lower waste, and keep training current — all from one platform.
              </p>
              
              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Link to="/auth">
                  <Button size="lg" className="min-h-[48px] w-full sm:w-auto gap-2">
                    Book a demo
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="mailto:sales@dashspect.com?subject=Pricing%20Request">
                  <Button size="lg" variant="outline" className="min-h-[48px] w-full sm:w-auto">
                    Request pricing
                  </Button>
                </a>
              </div>

              {/* Proof Points */}
              <div className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <Card className="bg-background/80 backdrop-blur">
                  <CardContent className="pt-6 text-center">
                    <Target className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="font-semibold">Standardize execution</p>
                    <p className="text-xs text-muted-foreground mt-1">Same standards, every shift</p>
                  </CardContent>
                </Card>
                <Card className="bg-background/80 backdrop-blur">
                  <CardContent className="pt-6 text-center">
                    <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="font-semibold">Reduce losses</p>
                    <p className="text-xs text-muted-foreground mt-1">Track waste and variances</p>
                  </CardContent>
                </Card>
                <Card className="bg-background/80 backdrop-blur">
                  <CardContent className="pt-6 text-center">
                    <Zap className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="font-semibold">Real-time control</p>
                    <p className="text-xs text-muted-foreground mt-1">Know what's happening now</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            OUTCOMES / ROI SECTION
        ================================================================ */}
        <section id="outcomes" className="py-12 md:py-20 scroll-mt-20">
          <div className="container mx-auto px-4">
            <SectionHeader
              title="Typical Results"
              subtitle="What operators experience after implementing DashSpect"
            />
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 max-w-6xl mx-auto">
              {[
                { icon: Clock, label: "Faster issue resolution", desc: "Real-time alerts, not weekly reports" },
                { icon: ClipboardCheck, label: "Higher audit consistency", desc: "Same standards, every location" },
                { icon: AlertTriangle, label: "Reduced repeat incidents", desc: "Structured follow-up closes the loop" },
                { icon: GraduationCap, label: "Better training compliance", desc: "Visible progress, automatic reminders" },
                { icon: Building2, label: "Stronger governance", desc: "Right access, clear accountability" },
              ].map((item, i) => (
                <Card key={i} className="text-center">
                  <CardContent className="pt-6">
                    <item.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            HOW IT WORKS SECTION
        ================================================================ */}
        <section id="how-it-works" className="py-12 md:py-20 bg-muted/30 scroll-mt-20">
          <div className="container mx-auto px-4">
            <SectionHeader
              title="How It Works"
              subtitle="A simple cycle that drives continuous improvement"
            />
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                { step: "1", title: "Define standards", desc: "Create templates, checklists, and procedures that reflect your operating standards." },
                { step: "2", title: "Assign execution", desc: "Push tasks and audits to the right people at the right time, automatically." },
                { step: "3", title: "Capture evidence", desc: "Staff complete work with photos, notes, and timestamps. No more paper." },
                { step: "4", title: "Analyze & improve", desc: "Review trends, spot issues, and make data-driven decisions to improve." },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className="bg-primary text-primary-foreground rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg mb-4">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                  {i < 3 && (
                    <ChevronRight className="hidden lg:block absolute top-3 -right-3 h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            MODULES SECTION
        ================================================================ */}
        <section id="modules" className="py-12 md:py-20 scroll-mt-20">
          <div className="container mx-auto px-4">
            <SectionHeader
              title="Platform Modules"
              subtitle="Choose the modules you need. Start simple, add more as you grow."
            />

            {/* Mobile Module Navigation */}
            <MobileModuleNav
              modules={modules}
              activeModule={activeModule}
              onSelect={handleModuleSelect}
            />

            <div className="flex gap-8 mt-6">
              {/* Desktop Sticky Nav */}
              <div className="hidden lg:block w-64 shrink-0">
                <StickyModuleNav modules={modules} activeModule={activeModule} />
              </div>

              {/* Module Cards Grid */}
              <div className="flex-1">
                <div className="grid md:grid-cols-2 gap-6">
                  {modules.map((module) => (
                    <ModuleCard key={module.id} module={module} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            SECURITY & GOVERNANCE SECTION
        ================================================================ */}
        <section id="security" className="py-12 md:py-20 bg-muted/30 scroll-mt-20">
          <div className="container mx-auto px-4">
            <SectionHeader
              title="Security & Governance"
              subtitle="Enterprise-grade security with flexible access controls"
            />

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              {[
                { icon: Users, title: "Roles & Permissions", desc: "Granular control over who can view, edit, and approve across every module." },
                { icon: Building2, title: "Location-based Access", desc: "Restrict users to specific locations or regions. Managers see only their sites." },
                { icon: FileBarChart, title: "Audit Logs", desc: "Complete history of every action, change, and login. Exportable for compliance." },
                { icon: Lock, title: "Data Ownership", desc: "Your data stays yours. Export anytime. Delete on request. No lock-in." },
              ].map((item, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <item.icon className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
              <Shield className="inline h-4 w-4 mr-1" />
              SSO available for enterprise plans
            </p>
          </div>
        </section>

        {/* ================================================================
            INTEGRATIONS SECTION
        ================================================================ */}
        <section id="integrations" className="py-12 md:py-20 scroll-mt-20">
          <div className="container mx-auto px-4">
            <SectionHeader
              title="Integrations"
              subtitle="Connect DashSpect to your existing tools and systems"
            />

            <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Globe className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold">POS & ERP</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Connect to point-of-sale and enterprise systems for sales data and inventory sync.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold">HR & Payroll</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sync employee data and export hours to your payroll provider.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Webhook className="h-8 w-8 text-primary mx-auto mb-3" />
                  <h3 className="font-semibold">API & Webhooks</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Build custom integrations with our REST API and real-time webhooks.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* ================================================================
            INDUSTRIES SECTION
        ================================================================ */}
        <section id="industries" className="py-12 md:py-20 bg-muted/30 scroll-mt-20">
          <div className="container mx-auto px-4">
            <SectionHeader
              title="Industries Beyond Restaurants"
              subtitle="DashSpect is built for multi-location operations in any industry"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
              {[
                { icon: UtensilsCrossed, label: "Restaurants", primary: true },
                { icon: ShoppingBag, label: "Retail" },
                { icon: Building, label: "Hospitality" },
                { icon: Factory, label: "Dark Kitchens" },
                { icon: Truck, label: "Logistics Depots" },
                { icon: Stethoscope, label: "Healthcare Facilities" },
              ].map((item, i) => (
                <Card key={i} className={item.primary ? "border-primary" : ""}>
                  <CardContent className="pt-6 text-center">
                    <item.icon className={`h-6 w-6 mx-auto mb-2 ${item.primary ? "text-primary" : "text-muted-foreground"}`} />
                    <p className={`text-sm ${item.primary ? "font-semibold" : ""}`}>{item.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ================================================================
            FAQ SECTION
        ================================================================ */}
        <section id="faqs" className="py-12 md:py-20 scroll-mt-20">
          <div className="container mx-auto px-4">
            <SectionHeader
              title="Frequently Asked Questions"
              subtitle="Common questions from operations leaders"
            />

            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* ================================================================
            FINAL CTA SECTION
        ================================================================ */}
        <section className="py-12 md:py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              Ready to systematize your operations?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
              Book a demo to see how DashSpect can work for your locations. Or request pricing to get started.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="min-h-[48px] w-full sm:w-auto gap-2">
                  Book a demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="mailto:sales@dashspect.com?subject=Pricing%20Request">
                <Button
                  size="lg"
                  variant="outline"
                  className="min-h-[48px] w-full sm:w-auto border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Request pricing
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* ================================================================
            FOOTER
        ================================================================ */}
        <footer className="py-8 border-t bg-background">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/dashspect-logo-512.png?v=2"
                  alt="DashSpect"
                  className="h-8 w-8 rounded-lg bg-primary p-1"
                />
                <span className="font-semibold">DashSpect</span>
              </div>
              
              <nav className="flex items-center gap-6 text-sm text-muted-foreground">
                <Link to="/" className="hover:text-foreground">Home</Link>
                <Link to="/full-presentation" className="hover:text-foreground">Full Presentation</Link>
                <Link to="/auth" className="hover:text-foreground">Sign In</Link>
              </nav>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <a href="mailto:support@dashspect.com" className="hover:text-foreground flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  Contact
                </a>
              </div>
            </div>
            
            <p className="text-center text-xs text-muted-foreground mt-6">
              © {new Date().getFullYear()} DashSpect. All rights reserved.
            </p>
          </div>
        </footer>

        <BackToTop />
      </div>
    </>
  );
};

export default FullPresentation;
