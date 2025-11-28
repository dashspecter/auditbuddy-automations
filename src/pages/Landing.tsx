import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, Users, TrendingUp, Shield, FileText, Bell, Mail, Phone, Plus, Target, Calendar } from "lucide-react";
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
                src="/dashspect-logo-512.png" 
                alt="DashSpect" 
                className="h-8 w-8"
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
            {user ? `Welcome Back!` : `Complete Compliance & Audit Management Platform`}
          </h1>
          <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto">
            {user 
              ? `Track your audit performance and manage compliance with ease.`
              : `Streamline inspections, audits, and compliance management for location-based businesses.`
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
                <a href="#contact">
                  <Button size="lg" className="min-h-[48px] w-full sm:w-auto">
                    Get Started
                  </Button>
                </a>
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
              Complete Audit & Compliance Solution
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage locations, staff, audits, and compliance
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-8 max-w-6xl mx-auto">
            <Card className="border-2">
              <CardContent className="pt-4 md:pt-6">
                <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-foreground">Location Audits</h3>
                <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <ClipboardCheck className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Custom audit templates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ClipboardCheck className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Digital inspections with photos</span>
                  </li>
                  <li className="flex items-start gap-2 hidden md:flex">
                    <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Schedule recurring audits automatically</span>
                  </li>
                  <li className="flex items-start gap-2 hidden md:flex">
                    <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Track audit history with full revision logs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ClipboardCheck className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>PDF reports & analytics</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-4 md:pt-6">
                <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-foreground">Staff Management</h3>
                <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Employee database</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Performance audits</span>
                  </li>
                  <li className="flex items-start gap-2 hidden md:flex">
                    <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Training tests with auto-generated questions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Compliance tracking</span>
                  </li>
                  <li className="flex items-start gap-2 hidden md:flex">
                    <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Performance leaderboards and analytics</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-4 md:pt-6">
                <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-foreground">Analytics & Reports</h3>
                <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Real-time dashboards</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Performance comparison</span>
                  </li>
                  <li className="flex items-start gap-2 hidden md:flex">
                    <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Section-based performance breakdown</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Trend analysis</span>
                  </li>
                  <li className="flex items-start gap-2 hidden md:flex">
                    <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Export detailed compliance reports</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-4 md:pt-6">
                <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-foreground">Communication & Workflow</h3>
                <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Bell className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Role-based notifications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Bell className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Recurring reminders</span>
                  </li>
                  <li className="flex items-start gap-2 hidden md:flex">
                    <Bell className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Document management with categorization</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Bell className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Calendar & scheduling</span>
                  </li>
                  <li className="flex items-start gap-2 hidden md:flex">
                    <Bell className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Activity logs and audit trails</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Industries Section - Hidden on mobile */}
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
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl mb-3">🍔</div>
                <h3 className="font-semibold text-lg mb-2">Food Service</h3>
                <p className="text-sm text-muted-foreground">
                  Restaurants, cafes, fast food chains, food trucks, catering services
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl mb-3">🏪</div>
                <h3 className="font-semibold text-lg mb-2">Retail</h3>
                <p className="text-sm text-muted-foreground">
                  Store chains, shopping centers, boutiques, supermarkets
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl mb-3">🏨</div>
                <h3 className="font-semibold text-lg mb-2">Hospitality</h3>
                <p className="text-sm text-muted-foreground">
                  Hotels, resorts, vacation rentals, bed & breakfasts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl mb-3">🏥</div>
                <h3 className="font-semibold text-lg mb-2">Healthcare</h3>
                <p className="text-sm text-muted-foreground">
                  Clinics, dental offices, care facilities, medical practices
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl mb-3">🏭</div>
                <h3 className="font-semibold text-lg mb-2">Manufacturing</h3>
                <p className="text-sm text-muted-foreground">
                  Production facilities, warehouses, quality control departments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl mb-3">🏗️</div>
                <h3 className="font-semibold text-lg mb-2">Construction</h3>
                <p className="text-sm text-muted-foreground">
                  Job sites, safety inspections, contractor management
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl mb-3">🏢</div>
                <h3 className="font-semibold text-lg mb-2">Property Management</h3>
                <p className="text-sm text-muted-foreground">
                  Building inspections, maintenance audits, facility management
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-4xl mb-3">🎓</div>
                <h3 className="font-semibold text-lg mb-2">Education</h3>
                <p className="text-sm text-muted-foreground">
                  Schools, universities, training centers, daycare facilities
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section - Condensed on mobile */}
      <section id="features" className="py-8 md:py-16 lg:py-24">
        <div className="container mx-auto px-4 px-safe">
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 md:mb-4">
              Powerful Features Built for Scale
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto hidden md:block">
              Enterprise-grade tools designed to help teams maintain standards across multiple locations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <Card>
              <CardContent className="pt-4 md:pt-6">
                <div className="bg-primary/10 rounded-lg p-2 md:p-3 w-fit mb-2 md:mb-4">
                  <ClipboardCheck className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Custom Templates</h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Build unlimited audit templates with custom sections and scoring.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 md:pt-6">
                <div className="bg-primary/10 rounded-lg p-2 md:p-3 w-fit mb-2 md:mb-4">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Real-Time Analytics</h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Track compliance trends with live dashboards.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 md:pt-6">
                <div className="bg-primary/10 rounded-lg p-2 md:p-3 w-fit mb-2 md:mb-4">
                  <Users className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Role-Based Access</h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Admin, manager, and checker roles with proper access levels.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 md:pt-6">
                <div className="bg-primary/10 rounded-lg p-2 md:p-3 w-fit mb-2 md:mb-4">
                  <FileText className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">PDF Reports</h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Generate professional reports with scores and compliance docs.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 md:pt-6">
                <div className="bg-primary/10 rounded-lg p-2 md:p-3 w-fit mb-2 md:mb-4">
                  <Bell className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Smart Notifications</h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Automated alerts and reminders keep teams informed.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4 md:pt-6">
                <div className="bg-primary/10 rounded-lg p-2 md:p-3 w-fit mb-2 md:mb-4">
                  <Shield className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Audit History</h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Complete tracking and historical data for compliance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Who It's For Section - Simplified on mobile */}
      <section className="bg-muted/30 py-8 md:py-16 lg:py-24">
        <div className="container mx-auto px-4 px-safe">
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 md:mb-4">
              Designed for Every Team Member
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto hidden md:block">
              From single locations to enterprise operations with hundreds of sites
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-primary rounded-full p-3 md:p-4 w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 flex items-center justify-center">
                <Shield className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Administrators</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                <span className="hidden md:inline">Full control over templates, users, locations, and system-wide settings. View comprehensive analytics across all operations.</span>
                <span className="md:hidden">Full system control and analytics</span>
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary rounded-full p-3 md:p-4 w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 flex items-center justify-center">
                <Users className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Managers</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                <span className="hidden md:inline">Oversee multiple locations, assign audits, monitor team performance, and send notifications to keep operations running smoothly.</span>
                <span className="md:hidden">Oversee locations and teams</span>
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary rounded-full p-3 md:p-4 w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 flex items-center justify-center">
                <ClipboardCheck className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
              </div>
              <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2">Checkers/Inspectors</h3>
              <p className="text-sm md:text-base text-muted-foreground">
                <span className="hidden md:inline">Conduct audits on-site with mobile-friendly checklists, capture photos, and submit findings in real-time from any device.</span>
                <span className="md:hidden">Conduct audits on-site</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Simplified on mobile */}
      <section className="py-8 md:py-16 lg:py-24">
        <div className="container mx-auto px-4 px-safe">
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 md:mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto hidden md:block">
              Simple setup process with immediate results
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <div className="text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center mx-auto mb-2 md:mb-4 text-lg md:text-xl font-bold">
                  1
                </div>
                <h3 className="text-sm md:text-lg font-semibold mb-1 md:mb-2">Add Locations</h3>
                <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
                  Set up your sites, assign managers, and organize by region or type.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center mx-auto mb-2 md:mb-4 text-lg md:text-xl font-bold">
                  2
                </div>
                <h3 className="text-sm md:text-lg font-semibold mb-1 md:mb-2">Create Templates</h3>
                <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
                  Build custom checklists or use pre-made templates for your industry.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center mx-auto mb-2 md:mb-4 text-lg md:text-xl font-bold">
                  3
                </div>
                <h3 className="text-sm md:text-lg font-semibold mb-1 md:mb-2">Conduct Audits</h3>
                <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
                  Schedule or start audits instantly, capture photos, and score performance.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center mx-auto mb-2 md:mb-4 text-lg md:text-xl font-bold">
                  4
                </div>
                <h3 className="text-sm md:text-lg font-semibold mb-1 md:mb-2">Monitor & Improve</h3>
                <p className="text-xs md:text-sm text-muted-foreground hidden md:block">
                  Track trends, identify issues, and drive continuous improvement.
                </p>
              </div>
            </div>
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
                Ready to transform your compliance process?
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
                      Don't have an account?
                    </p>
                    <Link to="/auth">
                      <Button size="lg" className="min-h-[44px] md:min-h-[48px]">
                        Sign Up
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
