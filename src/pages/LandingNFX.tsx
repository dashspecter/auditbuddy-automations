import { useState, useEffect, useCallback } from "react";
import { BookDemoModal } from "@/components/landing/BookDemoModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ClipboardCheck,
  ListTodo,
  Wrench,
  GraduationCap,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  Zap,
  MapPin,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Clock,
  Menu,
  X,
  Users,
  Trash2,
  QrCode,
  Package,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// STICKY NAV
// ============================================================================

const navLinks = [
  { label: "Problem", href: "#problem" },
  { label: "How It Works", href: "#ops-loop" },
  { label: "Modules", href: "#modules" },
  { label: "Steps", href: "#steps" },
  { label: "Why Us", href: "#differentiation" },
  { label: "Results", href: "#results" },
  { label: "FAQ", href: "#faq" },
];

const StickyNav = ({ onBookDemo }: { onBookDemo: () => void }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <a href="#hero" className="flex items-center gap-2">
          <img src="/dashspect-logo-512.png" alt="Dashspect" className="h-9 w-9" />
          <span className="text-xl font-bold text-foreground tracking-tight">
            Dash<span className="text-primary">Spect</span>
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a href="/auth" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            Sign In
          </a>
          <Button variant="orange" size="sm" onClick={onBookDemo}>
              Book a Demo
            </Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-background border-b border-border px-4 pb-4 space-y-2">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
          <a href="/auth" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-foreground">
            Sign In
          </a>
          <Button variant="orange" size="sm" className="w-full mt-2" onClick={() => { setMobileOpen(false); onBookDemo(); }}>
              Book a Demo
            </Button>
        </div>
      )}
    </nav>
  );
};

// ============================================================================
// SECTION WRAPPER
// ============================================================================

const Section = ({
  id,
  children,
  className,
  dark,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) => (
  <section
    id={id}
    className={cn(
      "scroll-mt-20 py-20 sm:py-28 px-4 sm:px-6",
      dark ? "bg-foreground text-background" : "bg-background text-foreground",
      className
    )}
  >
    <div className="max-w-6xl mx-auto">{children}</div>
  </section>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary mb-3">
    {children}
  </p>
);

const SectionTitle = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h2
    className={cn(
      "text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight tracking-tight",
      className
    )}
  >
    {children}
  </h2>
);

// ============================================================================
// 1. HERO
// ============================================================================

const Hero = ({ onBookDemo }: { onBookDemo: () => void }) => (
  <section
    id="hero"
    className="relative scroll-mt-20 min-h-[90vh] flex items-center px-4 sm:px-6 pt-24 pb-20 overflow-hidden"
  >
    {/* Subtle gradient bg */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />

    <div className="relative max-w-6xl mx-auto w-full">
      <div className="max-w-3xl">
        <SectionLabel>For Multi-Location Operators</SectionLabel>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.08] tracking-tight text-foreground">
          Be in 2+ locations
          <br />
          <span className="text-primary">at once.</span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl leading-relaxed">
          Go to the gym while your coffee shop runs right. DashSpect gives
          multi-location operators a closed-loop system that audits, assigns,
          tracks, and learns—so every site hits the same standard without you
          being there.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Button variant="orange" size="lg" className="text-base px-8" onClick={onBookDemo}>
              Book a Demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          <a href="#ops-loop">
            <Button variant="outline" size="lg" className="text-base px-8">
              See How It Works
            </Button>
          </a>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Live in 72 hours
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            No per-user fees
          </span>
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Works on any device
          </span>
        </div>
      </div>
    </div>
  </section>
);

// ============================================================================
// 2. PROBLEM
// ============================================================================

const problems = [
  {
    icon: AlertTriangle,
    text: "You close up one location, drive to the next, and find the same mistake you fixed yesterday.",
  },
  {
    icon: Clock,
    text: "Your best manager leaves and suddenly a whole site forgets how things should be done.",
  },
  {
    icon: Eye,
    text: "You only discover problems when a customer complains—or worse, when an inspector shows up.",
  },
  {
    icon: MapPin,
    text: "Every location runs on its own tribal knowledge. No standard. No proof. No learning across sites.",
  },
  {
    icon: RotateCcw,
    text: "You audit, write a list, email it out—and nothing changes. The loop never closes.",
  },
  {
    icon: Zap,
    text: "Your team wastes hours on spreadsheets and WhatsApp threads instead of actually improving operations.",
  },
];

const ProblemSection = () => (
  <Section id="problem" dark>
    <SectionLabel>The Real Problem</SectionLabel>
    <SectionTitle className="text-background max-w-2xl">
      You can't scale what you can't see.
    </SectionTitle>
    <p className="mt-4 text-background/70 text-lg max-w-xl">
      Multi-location operators hit the same wall: you physically can't be
      everywhere, so standards slip silently.
    </p>

    <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {problems.map((p, i) => (
        <div
          key={i}
          className="flex gap-4 p-5 rounded-xl bg-background/5 border border-background/10 hover:bg-background/10 transition-colors"
        >
          <p.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-background/80 leading-relaxed">{p.text}</p>
        </div>
      ))}
    </div>
  </Section>
);

// ============================================================================
// 3. THE OPS LOOP
// ============================================================================

const loopSteps = [
  {
    num: "01",
    title: "Inspect",
    desc: "Structured audits surface what's actually happening at every location—not what you hope is happening.",
  },
  {
    num: "02",
    title: "Assign",
    desc: "Issues become tasks with owners, deadlines, and photo proof. Nothing falls through the cracks.",
  },
  {
    num: "03",
    title: "Track",
    desc: "Real-time dashboards show completion rates, overdue items, and repeat offenders across all sites.",
  },
  {
    num: "04",
    title: "Learn",
    desc: "AI spots patterns across locations so your best practices spread automatically and weak spots get attention first.",
  },
];

const OpsLoop = () => (
  <Section id="ops-loop">
    <SectionLabel>The DashSpect Loop</SectionLabel>
    <SectionTitle className="max-w-2xl">
      A closed loop that gets smarter with every location you add.
    </SectionTitle>
    <p className="mt-4 text-muted-foreground text-lg max-w-xl">
      More locations = more signal = smarter priorities. That's the network
      effect traditional checklists can never deliver.
    </p>

    <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {loopSteps.map((s) => (
        <div key={s.num} className="relative group">
          <div className="text-6xl font-black text-primary/10 group-hover:text-primary/20 transition-colors leading-none">
            {s.num}
          </div>
          <h3 className="mt-2 text-xl font-bold text-foreground">{s.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {s.desc}
          </p>
        </div>
      ))}
    </div>

    {/* Loop visual connector */}
    <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <RotateCcw className="h-4 w-4 text-primary" />
      <span>The loop repeats—each cycle raises the bar across every site.</span>
    </div>
  </Section>
);

// ============================================================================
// 4. MODULES
// ============================================================================

const modules = [
  {
    icon: ClipboardCheck,
    title: "Audits",
    outcome: "Know exactly what's happening at every location without being there.",
    bullets: [
      "Custom templates for any inspection type",
      "Photo evidence & scoring built in",
      "Cross-location benchmarking",
    ],
  },
  {
    icon: Users,
    title: "Workforce",
    outcome: "Schedule, track attendance, and manage your team—all in one place.",
    bullets: [
      "Shift scheduling with drag & drop",
      "Clock-in/out with kiosk & QR support",
      "Payroll-ready attendance reports",
    ],
  },
  {
    icon: ListTodo,
    title: "Tasks",
    outcome: "Turn every finding into an accountable action—with proof of completion.",
    bullets: [
      "Auto-generated from audit issues",
      "Deadline tracking with escalation",
      "Mobile-first for frontline teams",
    ],
  },
  {
    icon: Trash2,
    title: "Wastage",
    outcome: "Track, measure, and reduce waste across every location.",
    bullets: [
      "Log waste by product & reason",
      "Cost tracking per entry",
      "Daily & weekly trend reports",
    ],
  },
  {
    icon: QrCode,
    title: "QR Forms",
    outcome: "Digitise compliance records—temperature logs, HACCP, and more.",
    bullets: [
      "Scan-to-fill QR-based forms",
      "Scheduled checkpoint reminders",
      "Immutable audit trail for inspectors",
    ],
  },
  {
    icon: Package,
    title: "Inventory",
    outcome: "Keep stock levels accurate without the guesswork.",
    bullets: [
      "Location-level stock tracking",
      "Low-stock alerts & reorder points",
      "Supplier & purchase management",
    ],
  },
  {
    icon: FileText,
    title: "Documents",
    outcome: "Centralise SOPs, policies, and compliance docs for every site.",
    bullets: [
      "Version-controlled document library",
      "Role-based access & sharing",
      "Read-receipt tracking",
    ],
  },
  {
    icon: Wrench,
    title: "Assets & CMMS",
    outcome: "Stop equipment breakdowns before they cost you a shift.",
    bullets: [
      "QR-based asset tracking",
      "Preventive maintenance schedules",
      "Parts inventory & work orders",
    ],
  },
  {
    icon: GraduationCap,
    title: "Training",
    outcome: "New hires reach full speed in days, not months.",
    bullets: [
      "Role-based learning paths",
      "Video, quiz & certificate support",
      "Completion tracking by location",
    ],
  },
  {
    icon: BarChart3,
    title: "Analytics & AI Guide",
    outcome: "See the truth across all locations—and get told what to fix first.",
    bullets: [
      "Real-time ops dashboard",
      "AI-powered priority recommendations",
      "Natural language data queries",
    ],
  },
];

const ModulesSection = () => (
  <Section id="modules" className="bg-muted/30">
    <div className="text-center">
      <SectionLabel>Platform Modules</SectionLabel>
      <SectionTitle>Ten modules. One system. Zero gaps.</SectionTitle>
      <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
        Each module is powerful alone. Together, they create the closed-loop
        accountability that makes multi-location operations scalable.
      </p>
    </div>

    <div className="mt-14 grid sm:grid-cols-2 gap-6">
      {modules.map((m) => (
        <Card
          key={m.title}
          className="group border-2 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300"
        >
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 rounded-xl p-3 group-hover:bg-primary/15 transition-colors">
                <m.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{m.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed font-medium">
              {m.outcome}
            </p>
            <ul className="space-y-2">
              {m.bullets.map((b, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  </Section>
);

// ============================================================================
// 5. HOW IT WORKS (3 STEPS)
// ============================================================================

const steps = [
  {
    num: "1",
    title: "Connect your locations",
    desc: "Add sites, invite managers, and import your existing checklists. We handle migration—you're live in under 72 hours.",
  },
  {
    num: "2",
    title: "Run your first audit cycle",
    desc: "Your team audits each location using mobile or kiosk mode. Issues auto-generate tasks with owners and deadlines.",
  },
  {
    num: "3",
    title: "Watch the loop compound",
    desc: "As data flows in, DashSpect highlights patterns, surfaces priorities, and spreads best practices across every site.",
  },
];

const HowItWorks = () => (
  <Section id="steps">
    <div className="text-center">
      <SectionLabel>Getting Started</SectionLabel>
      <SectionTitle>Three steps to operational control.</SectionTitle>
    </div>

    <div className="mt-14 grid md:grid-cols-3 gap-10">
      {steps.map((s) => (
        <div key={s.num} className="text-center md:text-left">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg mb-5">
            {s.num}
          </div>
          <h3 className="text-xl font-bold text-foreground">{s.title}</h3>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {s.desc}
          </p>
        </div>
      ))}
    </div>
  </Section>
);

// ============================================================================
// 6. DIFFERENTIATION
// ============================================================================

const competitors = [
  {
    label: "Simple checklists",
    weakness: "No accountability loop. You check a box and nothing changes.",
  },
  {
    label: "Audit-only apps",
    weakness:
      "Great at finding problems, terrible at fixing them. No task tracking, no follow-through.",
  },
  {
    label: "Heavy CMMS platforms",
    weakness:
      "Built for factories, not frontline teams. 6-month onboarding, $50k/year, and your staff still uses WhatsApp.",
  },
];

const diffPoints = [
  {
    icon: RotateCcw,
    title: "Closed-loop accountability",
    desc: "Every audit finding becomes a tracked task. Every task has proof of completion. Nothing dies in an email.",
  },
  {
    icon: MapPin,
    title: "Cross-location learning",
    desc: "Patterns from your best site automatically inform priorities at your weakest. Your whole network gets smarter.",
  },
  {
    icon: Zap,
    title: "Attention prioritization",
    desc: "AI ranks what matters most across all locations so you spend your limited time where it moves the needle.",
  },
];

const Differentiation = () => (
  <Section id="differentiation" dark>
    <SectionLabel>Why DashSpect</SectionLabel>
    <SectionTitle className="text-background max-w-2xl">
      Not another checklist app.
    </SectionTitle>
    <p className="mt-4 text-background/70 text-lg max-w-xl">
      We built what operators actually need: a system that closes the loop between
      finding problems and proving they're fixed.
    </p>

    {/* Competitor comparison */}
    <div className="mt-12 grid sm:grid-cols-3 gap-6">
      {competitors.map((c) => (
        <div
          key={c.label}
          className="p-5 rounded-xl bg-background/5 border border-background/10"
        >
          <p className="text-sm font-semibold text-background/90">{c.label}</p>
          <p className="mt-2 text-sm text-background/60 leading-relaxed">
            {c.weakness}
          </p>
        </div>
      ))}
    </div>

    {/* DashSpect advantages */}
    <div className="mt-14 grid sm:grid-cols-3 gap-8">
      {diffPoints.map((d) => (
        <div key={d.title} className="flex gap-4">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <d.icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-bold text-background">{d.title}</h4>
            <p className="mt-1 text-sm text-background/70 leading-relaxed">
              {d.desc}
            </p>
          </div>
        </div>
      ))}
    </div>
  </Section>
);

// ============================================================================
// 7. MINI CASE / RESULTS
// ============================================================================

const stats = [
  { value: "43%", label: "Fewer repeat audit failures" },
  { value: "6hrs", label: "Saved per manager per week" },
  { value: "72hrs", label: "From signup to fully live" },
  { value: "2.1×", label: "Faster new-hire ramp-up" },
];

const MiniCase = () => (
  <Section id="results" className="bg-muted/30">
    <div className="text-center">
      <SectionLabel>Results</SectionLabel>
      <SectionTitle>What operators see in the first 90 days.</SectionTitle>
      <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
        Based on early adopter data across restaurant, retail, and hospitality
        operators running 3–25 locations.
      </p>
    </div>

    <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((s) => (
        <div
          key={s.label}
          className="text-center p-6 rounded-2xl bg-background border-2 border-border hover:border-primary/30 transition-colors"
        >
          <p className="text-4xl sm:text-5xl font-black text-primary">
            {s.value}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>

    {/* Placeholder quote */}
    <div className="mt-14 max-w-2xl mx-auto text-center">
      <blockquote className="text-lg sm:text-xl italic text-foreground leading-relaxed">
        "I used to drive between four locations every day just to make sure
        things were running. Now I check DashSpect over coffee and only show up
        when something actually needs me."
      </blockquote>
      <p className="mt-4 text-sm text-muted-foreground">
        — Multi-unit operator, 4 locations{" "}
        <span className="text-xs">(name available on request)</span>
      </p>
    </div>
  </Section>
);

// ============================================================================
// 8. FINAL CTA + FAQ
// ============================================================================

const faqs = [
  {
    q: "How long does setup take?",
    a: "Most operators are fully live within 72 hours. We handle template migration, location setup, and team onboarding. You don't need IT.",
  },
  {
    q: "Do I need to buy hardware or install software?",
    a: "No. DashSpect is 100% web-based and works on any device—phone, tablet, or desktop. For shared-device locations, we offer a kiosk mode with PIN/QR sign-in.",
  },
  {
    q: "What if I only have 2–3 locations?",
    a: "DashSpect is built for operators with 2 to 200+ locations. The system scales with you—start small and add sites as you grow. Pricing is per-location, not per-user.",
  },
  {
    q: "How is this different from a Google Form or spreadsheet?",
    a: "Spreadsheets capture data. DashSpect closes the loop: audit → task → proof → analytics → smarter priorities. It's the difference between a snapshot and a system.",
  },
];

const FinalCTA = ({ onBookDemo }: { onBookDemo: () => void }) => (
  <>
    {/* CTA */}
    <section
      id="final-cta"
      className="scroll-mt-20 py-20 sm:py-28 px-4 sm:px-6 bg-gradient-to-br from-primary to-brand-orange-dark text-primary-foreground"
    >
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
          Stop driving between locations.
          <br />
          Start running them all from one screen.
        </h2>
        <p className="mt-6 text-lg text-primary-foreground/80 max-w-xl mx-auto">
          Book a 20-minute demo and see how DashSpect can give you back your
          time while raising the bar at every site.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
          <Button
              size="lg"
              className="bg-background text-foreground hover:bg-background/90 text-base px-8 font-semibold"
              onClick={onBookDemo}
            >
              Book a Demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          <a href="/auth">
            <Button
              size="lg"
              className="bg-white text-primary hover:bg-white/90 text-base px-8 font-semibold"
            >
              Sign In
            </Button>
          </a>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row justify-center gap-6 text-sm text-primary-foreground/70">
          <span className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            No credit card required
          </span>
          <span className="flex items-center justify-center gap-2">
            <Clock className="h-4 w-4" />
            20-minute walkthrough
          </span>
          <span className="flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Cancel anytime
          </span>
        </div>
      </div>
    </section>

    {/* FAQ */}
    <Section id="faq">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <SectionLabel>FAQ</SectionLabel>
          <SectionTitle>Common questions.</SectionTitle>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((f, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="border rounded-xl px-5 data-[state=open]:border-primary/30 transition-colors"
            >
              <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Section>

    {/* Footer */}
    <footer className="py-10 px-4 sm:px-6 border-t border-border">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <span>
          © {new Date().getFullYear()} DashSpect. All rights reserved.
        </span>
        <span>
          Built for multi-location operators who refuse to compromise on
          standards.
        </span>
      </div>
    </footer>
  </>
);

// ============================================================================
// PAGE
// ============================================================================

const LandingNFX = () => {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background antialiased">
      <BookDemoModal open={demoOpen} onOpenChange={setDemoOpen} />
      <StickyNav onBookDemo={() => setDemoOpen(true)} />
      <Hero onBookDemo={() => setDemoOpen(true)} />
      <ProblemSection />
      <OpsLoop />
      <ModulesSection />
      <HowItWorks />
      <Differentiation />
      <MiniCase />
      <FinalCTA onBookDemo={() => setDemoOpen(true)} />
    </div>
  );
};

export default LandingNFX;
