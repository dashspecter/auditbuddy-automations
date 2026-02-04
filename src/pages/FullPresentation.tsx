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
import { Header } from "@/components/Header";
import { BackToTop } from "@/components/BackToTop";
import {
  ClipboardCheck,
  AlertTriangle,
  GraduationCap,
  Users,
  Building2,
  Shield,
  Lock,
  Globe,
  Webhook,
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
  FileBarChart,
} from "lucide-react";
import { ModuleCardV2 } from "@/components/presentation/ModuleCardV2";
import { ModulesFilterBar, type CategoryFilter } from "@/components/presentation/ModulesFilterBar";
import { modulesV2 } from "@/components/presentation/modulesData";

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
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("All");
  const [showRecommended, setShowRecommended] = useState(false);
  
  // Expand/collapse state for cards
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  // Filter modules based on search, category, and recommended
  const filteredModules = useMemo(() => {
    return modulesV2.filter((module) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        module.name.toLowerCase().includes(searchLower) ||
        module.summary.toLowerCase().includes(searchLower) ||
        module.category.toLowerCase().includes(searchLower) ||
        module.highlights.some((h) => h.toLowerCase().includes(searchLower));

      // Category filter
      const matchesCategory =
        activeCategory === "All" || module.category === activeCategory;

      // Recommended filter
      const matchesRecommended = !showRecommended || module.recommended === true;

      return matchesSearch && matchesCategory && matchesRecommended;
    });
  }, [searchQuery, activeCategory, showRecommended]);

  // Toggle single module expansion
  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // Expand all visible modules
  const expandAll = () => {
    setExpandedModules(new Set(filteredModules.map((m) => m.id)));
  };

  // Collapse all modules
  const collapseAll = () => {
    setExpandedModules(new Set());
  };

  // Check if all visible modules are expanded
  const allExpanded =
    filteredModules.length > 0 &&
    filteredModules.every((m) => expandedModules.has(m.id));

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
            MODULES SECTION - FULL WIDTH WITH FILTER BAR
        ================================================================ */}
        <section id="modules" className="w-full py-12 md:py-20 scroll-mt-20">
          <div className="mx-auto w-full max-w-none px-6 lg:px-10 xl:px-12">
            <SectionHeader
              title="Platform Modules"
              subtitle="Choose the modules you need. Start simple, add more as you grow."
            />

            {/* Filter Bar */}
            <ModulesFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
              showRecommended={showRecommended}
              onShowRecommendedChange={setShowRecommended}
              allExpanded={allExpanded}
              onExpandAll={expandAll}
              onCollapseAll={collapseAll}
              resultCount={filteredModules.length}
            />

            {/* Module Cards Grid */}
            <div className="mt-8">
              {filteredModules.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No modules match your filters.</p>
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchQuery("");
                      setActiveCategory("All");
                      setShowRecommended(false);
                    }}
                    className="mt-2"
                  >
                    Clear filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {filteredModules.map((module) => (
                    <ModuleCardV2
                      key={module.id}
                      module={module}
                      isExpanded={expandedModules.has(module.id)}
                      onToggle={() => toggleModule(module.id)}
                    />
                  ))}
                </div>
              )}
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
