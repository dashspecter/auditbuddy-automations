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
              <div className="bg-primary rounded-full p-2">
                <ClipboardCheck className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Dashspect</span>
            </div>
            <Link to="/auth">
              <Button>Sign In</Button>
            </Link>
          </div>
        </nav>
      )}

      {/* Hero Section */}
      <section className="container mx-auto px-4 px-safe py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            {user ? `Welcome Back!` : `Complete Compliance & Audit Management Platform`}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {user 
              ? `Track your audit performance and manage compliance with ease across all your locations.`
              : `Streamline inspections, audits, staff assessments, and compliance management across restaurants, retail, healthcare, and any location-based business.`
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

      {/* Quick Stats Section - Only for authenticated users */}
      {user && (
        <section className="bg-muted/30 py-12 md:py-16">
          <div className="container mx-auto px-4 px-safe">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Your Performance at a Glance
              </h2>
              <p className="text-muted-foreground">
                Quick overview of your audit activity
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <StatsCard
                title="Total Audits"
                value={auditsLoading ? "..." : stats.totalAudits.toString()}
                icon={ClipboardCheck}
                description="All time"
              />
              <StatsCard
                title="Completed"
                value={auditsLoading ? "..." : stats.completedAudits.toString()}
                icon={Shield}
                description="Finished audits"
              />
              <StatsCard
                title="Average Score"
                value={auditsLoading ? "..." : `${stats.avgScore}%`}
                icon={Target}
                description="Performance"
              />
              <StatsCard
                title="This Month"
                value={auditsLoading ? "..." : stats.thisMonth.toString()}
                icon={Calendar}
                description="Audits completed"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <div className="bg-primary/10 rounded-lg p-3 w-fit mb-4">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Quick Actions</h3>
                  <p className="text-muted-foreground mb-4">
                    Jump right into your workflow
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link to="/location-audit">
                      <Button className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        New Audit
                      </Button>
                    </Link>
                    <Link to="/audits">
                      <Button variant="outline" className="w-full">
                        View All Audits
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="bg-primary/10 rounded-lg p-3 w-fit mb-4">
                    <TrendingUp className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Latest Updates</h3>
                  <p className="text-muted-foreground mb-4">
                    Stay on top of your compliance
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link to="/reports">
                      <Button variant="outline" className="w-full">
                        View Reports
                      </Button>
                    </Link>
                    <Link to="/notifications">
                      <Button variant="outline" className="w-full">
                        <Bell className="h-4 w-4 mr-2" />
                        Check Notifications
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Core Functionalities */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 px-safe">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Complete Audit & Compliance Solution
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage locations, staff, audits, and compliance in one platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <Card className="border-2">
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-4 text-foreground">Location Audits</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Create custom audit templates with sections and scoring systems</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Conduct digital inspections with photo evidence capture</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Schedule recurring audits automatically</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Track audit history with full revision logs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Generate PDF reports with scores and findings</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-4 text-foreground">Staff Management</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Employee database with location assignment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Staff performance audits and assessments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Training tests with auto-generated questions from documents</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Track staff compliance scores and trends</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Performance leaderboards and analytics</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-4 text-foreground">Analytics & Reports</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Real-time dashboards with compliance metrics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Location performance comparison and trends</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Section-based performance breakdown</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Identify best and worst performing locations</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Export detailed compliance reports</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold mb-4 text-foreground">Communication & Workflow</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Bell className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Notification system with role-based targeting</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Bell className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Recurring notifications for regular tasks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Bell className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Document management with categorization</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Bell className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Calendar view for scheduled audits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Bell className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>Activity logs and audit trails</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4 px-safe">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Perfect for Any Location-Based Business
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Our platform adapts to your industry's unique compliance and audit requirements
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
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

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24">
        <div className="container mx-auto px-4 px-safe">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Powerful Features Built for Scale
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Enterprise-grade tools designed to help teams maintain standards across multiple locations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mb-4">
                  <ClipboardCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Custom Templates</h3>
                <p className="text-muted-foreground">
                  Build unlimited audit templates with custom sections, fields, and scoring systems tailored to your standards.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mb-4">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Real-Time Analytics</h3>
                <p className="text-muted-foreground">
                  Track compliance trends, compare locations, and make data-driven decisions with live dashboards.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Role-Based Access</h3>
                <p className="text-muted-foreground">
                  Admin, manager, and checker roles ensure everyone has the right access level and responsibilities.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">PDF Reports</h3>
                <p className="text-muted-foreground">
                  Generate professional PDF reports with scores, photos, notes, and compliance documentation instantly.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mb-4">
                  <Bell className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart Notifications</h3>
                <p className="text-muted-foreground">
                  Automated alerts, recurring reminders, and role-based notifications keep teams informed and on schedule.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Audit History</h3>
                <p className="text-muted-foreground">
                  Complete revision tracking, change logs, and historical data for regulatory compliance and documentation.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4 px-safe">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Designed for Every Team Member
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              From single locations to enterprise operations with hundreds of sites
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-primary rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Administrators</h3>
              <p className="text-muted-foreground">
                Full control over templates, users, locations, and system-wide settings. View comprehensive analytics across all operations.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Managers</h3>
              <p className="text-muted-foreground">
                Oversee multiple locations, assign audits, monitor team performance, and send notifications to keep operations running smoothly.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <ClipboardCheck className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Checkers/Inspectors</h3>
              <p className="text-muted-foreground">
                Conduct audits on-site with mobile-friendly checklists, capture photos, and submit findings in real-time from any device.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 px-safe">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Simple setup process with immediate results
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="text-lg font-semibold mb-2">Add Locations</h3>
                <p className="text-sm text-muted-foreground">
                  Set up your sites, assign managers, and organize by region or type.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="text-lg font-semibold mb-2">Create Templates</h3>
                <p className="text-sm text-muted-foreground">
                  Build custom checklists or use pre-made templates for your industry.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="text-lg font-semibold mb-2">Conduct Audits</h3>
                <p className="text-sm text-muted-foreground">
                  Schedule or start audits instantly, capture photos, and score performance.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  4
                </div>
                <h3 className="text-lg font-semibold mb-2">Monitor & Improve</h3>
                <p className="text-sm text-muted-foreground">
                  Track trends, identify issues, and drive continuous improvement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4 px-safe">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Get Started Today
              </h2>
              <p className="text-muted-foreground text-lg">
                Ready to transform your compliance process? Get in touch with us.
              </p>
            </div>

            <Card className="bg-card border-border">
              <CardContent className="py-12">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="flex flex-col items-center text-center p-6 rounded-lg bg-muted/50">
                    <div className="bg-primary rounded-full p-4 mb-4">
                      <Mail className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Email Us</h3>
                    <a 
                      href="mailto:alex@grecea.work" 
                      className="text-primary hover:underline text-lg"
                    >
                      alex@grecea.work
                    </a>
                  </div>

                  <div className="flex flex-col items-center text-center p-6 rounded-lg bg-muted/50">
                    <div className="bg-primary rounded-full p-4 mb-4">
                      <Phone className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Call Us</h3>
                    <a 
                      href="tel:+40741427777" 
                      className="text-primary hover:underline text-lg"
                    >
                      0741 427 777
                    </a>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    Already have an account?
                  </p>
                  <Link to="/auth">
                    <Button size="lg" className="min-h-[48px]">
                      Sign In
                    </Button>
                  </Link>
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
