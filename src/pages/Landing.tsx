import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ClipboardCheck, Users, TrendingUp, Shield, FileText, Bell, Mail, Phone, Plus, 
  Target, Calendar, MapPin, Camera, Clock, BarChart3, Wrench, Package, 
  UserCheck, Award, Zap, Globe, Lock, Smartphone, CheckCircle2, 
  UtensilsCrossed, ShoppingBag, Building, Stethoscope, Factory, HardHat, Home, GraduationCap
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { useLocationAudits } from "@/hooks/useAudits";
import { useMemo } from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";

const Landing = () => {
  const { user } = useAuth();
  const { data: allAudits, isLoading: auditsLoading } = useLocationAudits();

  // Calculate stats for authenticated users
  const stats = useMemo(() => {
    if (!allAudits || !user) return { 
      totalAudits: 0, 
      completedAudits: 0, 
      avgScore: 0,
      thisMonth: 0 
    };

    const myAudits = allAudits.filter(audit => audit.user_id === user.id);
    const totalAudits = myAudits.length;
    const completedAudits = myAudits.filter(a => a.status === 'compliant').length;
    const totalScore = myAudits.reduce((sum, a) => sum + (a.overall_score || 0), 0);
    const avgScore = totalAudits > 0 ? Math.round(totalScore / totalAudits) : 0;
    
    // Audits from current month
    const now = new Date();
    const thisMonth = myAudits.filter(a => {
      const auditDate = new Date(a.created_at);
      return auditDate.getMonth() === now.getMonth() && 
             auditDate.getFullYear() === now.getFullYear();
    }).length;

    return { totalAudits, completedAudits, avgScore, thisMonth };
  }, [allAudits, user]);

  const industries = [
    {
      icon: UtensilsCrossed,
      title: "Food Service",
      description: "Restaurants, cafes, fast food chains, food trucks, catering services",
      color: "text-orange-500"
    },
    {
      icon: ShoppingBag,
      title: "Retail",
      description: "Store chains, shopping centers, boutiques, supermarkets",
      color: "text-blue-500"
    },
    {
      icon: Building,
      title: "Hospitality",
      description: "Hotels, resorts, vacation rentals, bed & breakfasts",
      color: "text-purple-500"
    },
    {
      icon: Stethoscope,
      title: "Healthcare",
      description: "Clinics, dental offices, care facilities, medical practices",
      color: "text-red-500"
    },
    {
      icon: Factory,
      title: "Manufacturing",
      description: "Production facilities, warehouses, quality control departments",
      color: "text-slate-500"
    },
    {
      icon: HardHat,
      title: "Construction",
      description: "Job sites, safety inspections, contractor management",
      color: "text-yellow-600"
    },
    {
      icon: Home,
      title: "Property Management",
      description: "Building inspections, maintenance audits, facility management",
      color: "text-emerald-500"
    },
    {
      icon: GraduationCap,
      title: "Education",
      description: "Schools, universities, training centers, daycare facilities",
      color: "text-indigo-500"
    }
  ];

  const features = [
    {
      icon: ClipboardCheck,
      title: "Custom Audit Templates",
      description: "Design unlimited templates with custom sections, scoring rules, and field types. Clone and modify templates for different locations or inspection types."
    },
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      description: "Live dashboards with performance trends, location comparisons, and section-level breakdowns. Identify issues before they become problems."
    },
    {
      icon: Users,
      title: "Role-Based Access Control",
      description: "Granular permissions for admins, managers, checkers, and HR. Control who sees what data and who can perform which actions."
    },
    {
      icon: Calendar,
      title: "Automated Scheduling",
      description: "Set up recurring audits that run automatically. Never miss a compliance deadline with smart reminders and calendar integration."
    },
    {
      icon: Camera,
      title: "Photo Documentation",
      description: "Capture and attach photos directly to audit responses. Build a visual history of compliance and issues across all locations."
    },
    {
      icon: FileText,
      title: "Professional Reports",
      description: "Generate branded PDF reports with scores, photos, and detailed findings. Share with stakeholders or archive for compliance records."
    },
    {
      icon: Bell,
      title: "Smart Notifications",
      description: "Role-based alerts keep the right people informed. Recurring reminders, audit completion notices, and escalation workflows."
    },
    {
      icon: Wrench,
      title: "Equipment Management",
      description: "Track equipment across locations, schedule maintenance, and log interventions. Keep your assets running smoothly."
    },
    {
      icon: Lock,
      title: "Complete Audit Trail",
      description: "Every change is logged with full revision history. Demonstrate compliance with complete transparency and accountability."
    }
  ];

  const teamMembers = [
    {
      icon: Shield,
      title: "Administrators",
      shortDesc: "Full system control and analytics",
      description: "Complete control over templates, users, locations, and company-wide settings. Access comprehensive analytics, configure billing, manage modules, and set up integrations. The command center for your entire operation."
    },
    {
      icon: Users,
      title: "Managers",
      shortDesc: "Oversee locations and teams",
      description: "Manage staff schedules, approve time-off requests, and monitor team performance. Conduct audits, assign tasks, and receive real-time notifications about their locations. The bridge between strategy and execution."
    },
    {
      icon: ClipboardCheck,
      title: "Checkers & Inspectors",
      shortDesc: "Conduct audits on-site",
      description: "Mobile-first experience for on-the-ground inspections. Complete checklists, capture photos, add observations, and submit findings in real-time. Works offline and syncs when connected."
    },
    {
      icon: UserCheck,
      title: "HR Teams",
      shortDesc: "Manage workforce compliance",
      description: "Handle employee onboarding, track training completion, manage documents, and ensure workforce compliance. Access payroll data and performance reviews."
    },
    {
      icon: Award,
      title: "Staff Members",
      shortDesc: "Self-service portal",
      description: "View schedules, clock in/out, request time off, and swap shifts. Access training materials, complete assigned tests, and track their own performance."
    }
  ];

  const steps = [
    {
      number: "1",
      title: "Set Up Your Company",
      shortTitle: "Setup",
      description: "Create your account, add your company details, and invite your team. Choose your industry to get pre-configured templates and settings tailored to your needs."
    },
    {
      number: "2",
      title: "Add Locations & Staff",
      shortTitle: "Locations",
      description: "Register your sites with addresses, managers, and operating hours. Import your employee list or add staff manually with their roles and assignments."
    },
    {
      number: "3",
      title: "Create Your Templates",
      shortTitle: "Templates",
      description: "Build custom audit checklists with sections, fields, and scoring. Use the template marketplace to find industry-specific templates or start from scratch."
    },
    {
      number: "4",
      title: "Schedule Audits",
      shortTitle: "Schedule",
      description: "Set up recurring audit schedules or create one-time inspections. Assign checkers, set due dates, and configure automatic reminders."
    },
    {
      number: "5",
      title: "Conduct Inspections",
      shortTitle: "Inspect",
      description: "Your team completes audits on mobile or desktop. Capture photos, add notes, and score each item. Results sync instantly to your dashboard."
    },
    {
      number: "6",
      title: "Analyze & Improve",
      shortTitle: "Improve",
      description: "Review performance trends, identify problem areas, and track improvements over time. Generate reports for stakeholders and regulatory compliance."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation - Show authenticated header if logged in */}
      {user ? (
        <Header />
      ) : (
        <nav className="border-b border-border pt-safe">
          <div className="container mx-auto px-4 px-safe py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/dashspect-logo-512.png?v=2" 
                alt="DashSpect" 
                className="h-8 w-8 rounded-xl bg-primary p-1"
              />
              <span className="text-xl font-bold text-foreground">Dashspect</span>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/auth">
                <Button variant="outline">Sign In</Button>
              </Link>
              <Link to="/auth">
                <Button>Sign Up</Button>
              </Link>
            </div>
          </div>
        </nav>
      )}

      {/* Hero Section */}
      <section className="container mx-auto px-4 px-safe py-8 md:py-16 lg:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6">
            {user ? `Welcome Back!` : `Complete Operations & Compliance Management Platform`}
          </h1>
          <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto">
            {user 
              ? `Track your audit performance and manage compliance with ease.`
              : `Streamline workforce scheduling, location audits, equipment maintenance, and compliance management — all in one powerful platform.`
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <>
                <Link to="/location-audit">
                  <Button size="lg" className="min-h-[48px] w-full sm:w-auto">
                    <Plus className="h-5 w-5 mr-2" />
                    New Audit
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button size="lg" variant="outline" className="min-h-[48px] w-full sm:w-auto">
                    View Dashboard
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button size="lg" className="min-h-[48px] w-full sm:w-auto">
                    Get Started Free
                  </Button>
                </Link>
                <a href="#features">
                  <Button size="lg" variant="outline" className="min-h-[48px] w-full sm:w-auto">
                    Learn More
                  </Button>
                </a>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Core Functionalities */}
      <section className="py-8 md:py-16 lg:py-24">
        <div className="container mx-auto px-4 px-safe">
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 md:mb-4">
              Complete Operations Management Solution
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage locations, workforce, equipment, audits, and compliance
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-8 max-w-6xl mx-auto">
            <Card className="border-2">
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">Location Audits</h3>
                </div>
                <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Custom audit templates with scoring</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Photo documentation for evidence</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Recurring schedules & reminders</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>PDF reports & analytics</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">Workforce Management</h3>
                </div>
                <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Shift scheduling & time tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>QR clock-in/out & attendance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Time-off requests & approvals</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Performance leaderboards</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <Wrench className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">Equipment & Assets</h3>
                </div>
                <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Equipment inventory by location</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Maintenance scheduling</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>QR code tracking</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Intervention history & documents</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">Analytics & Insights</h3>
                </div>
                <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Real-time compliance dashboards</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Location performance comparison</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>AI-powered insights</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Trend analysis & forecasting</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section className="hidden md:block bg-muted/30 py-12 md:py-16 lg:py-24">
        <div className="container mx-auto px-4 px-safe">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 md:mb-4">
              Perfect for Any Location-Based Business
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Our platform adapts to your industry's unique compliance requirements
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-7xl mx-auto">
            {industries.map((industry, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6 text-center">
                  <div className={`mx-auto mb-3 p-3 rounded-xl bg-muted/50 w-fit ${industry.color}`}>
                    <industry.icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{industry.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {industry.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-8 md:py-16 lg:py-24">
        <div className="container mx-auto px-4 px-safe">
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 md:mb-4">
              Powerful Features Built for Scale
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Enterprise-grade tools designed to help teams maintain standards across multiple locations. From single sites to hundreds of locations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-4 md:pt-6">
                  <div className="bg-primary/10 rounded-lg p-2 md:p-3 w-fit mb-2 md:mb-4">
                    <feature.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">{feature.title}</h3>
                  <p className="text-sm md:text-base text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="bg-muted/30 py-8 md:py-16 lg:py-24">
        <div className="container mx-auto px-4 px-safe">
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 md:mb-4">
              Designed for Every Team Member
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              From executives needing oversight to field workers conducting inspections — everyone has the tools they need
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 max-w-7xl mx-auto">
            {teamMembers.map((member, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="bg-primary rounded-full p-3 md:p-4 w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 flex items-center justify-center">
                    <member.icon className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">{member.title}</h3>
                  <p className="text-sm md:text-base text-muted-foreground">
                    <span className="hidden lg:inline">{member.description}</span>
                    <span className="lg:hidden">{member.shortDesc}</span>
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-8 md:py-16 lg:py-24">
        <div className="container mx-auto px-4 px-safe">
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 md:mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              From signup to your first audit in under an hour. Our guided setup walks you through every step.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
              {steps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="bg-primary text-primary-foreground rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center mx-auto mb-2 md:mb-4 text-lg md:text-xl font-bold">
                    {step.number}
                  </div>
                  <h3 className="text-sm md:text-lg font-semibold mb-1 md:mb-2">
                    <span className="hidden md:inline">{step.title}</span>
                    <span className="md:hidden">{step.shortTitle}</span>
                  </h3>
                  <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA after steps */}
          <div className="text-center mt-8 md:mt-12">
            <Link to="/auth">
              <Button size="lg" className="min-h-[48px]">
                <Zap className="h-5 w-5 mr-2" />
                Start Your Free Trial
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-2">No credit card required</p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-8 md:py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4 px-safe">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6 md:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 md:mb-4">
                Get Started Today
              </h2>
              <p className="text-sm md:text-base md:text-lg text-muted-foreground">
                Ready to transform your operations and compliance process?
              </p>
            </div>

            <Card className="bg-card border-border">
              <CardContent className="py-6 md:py-12">
                <div className="grid md:grid-cols-2 gap-4 md:gap-8">
                  <div className="flex flex-col items-center text-center p-4 md:p-6 rounded-lg bg-muted/50">
                    <div className="bg-primary rounded-full p-3 md:p-4 mb-2 md:mb-4">
                      <Mail className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-base md:text-lg font-semibold mb-1 md:mb-2">Email Us</h3>
                    <a 
                      href="mailto:alex@grecea.work" 
                      className="text-primary hover:underline text-sm md:text-lg"
                    >
                      alex@grecea.work
                    </a>
                  </div>

                  <div className="flex flex-col items-center text-center p-4 md:p-6 rounded-lg bg-muted/50">
                    <div className="bg-primary rounded-full p-3 md:p-4 mb-2 md:mb-4">
                      <Phone className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-base md:text-lg font-semibold mb-1 md:mb-2">Call Us</h3>
                    <a 
                      href="tel:+40741427777" 
                      className="text-primary hover:underline text-sm md:text-lg"
                    >
                      0741 427 777
                    </a>
                  </div>
                </div>

                <div className="mt-6 md:mt-8 text-center space-y-4">
                  <div>
                    <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">
                      Ready to get started?
                    </p>
                    <Link to="/auth">
                      <Button size="lg" className="min-h-[44px] md:min-h-[48px]">
                        Sign Up Free
                      </Button>
                    </Link>
                  </div>
                  <div>
                    <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">
                      Already have an account?
                    </p>
                    <Link to="/auth">
                      <Button size="lg" variant="outline" className="min-h-[44px] md:min-h-[48px]">
                        Sign In
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 pb-safe">
        <div className="container mx-auto px-4 px-safe text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Dashspect. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
