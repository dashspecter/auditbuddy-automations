import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClipboardCheck, Users, TrendingUp, Shield, FileText, Bell, Mail, Phone } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
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

      {/* Hero Section */}
      <section className="container mx-auto px-4 px-safe py-16 md:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Restaurant Compliance Made Simple
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline your health inspections, audit processes, and compliance management with Dashspect's intuitive platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4 px-safe">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need for Compliance
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help restaurant teams maintain health and safety standards
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mb-4">
                  <ClipboardCheck className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Custom Audit Templates</h3>
                <p className="text-muted-foreground">
                  Create and customize audit templates tailored to your specific requirements and standards.
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
                  Track compliance trends, identify issues early, and make data-driven decisions.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
                <p className="text-muted-foreground">
                  Role-based access for admins, managers, and checkers ensures everyone stays aligned.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="bg-primary/10 rounded-lg p-3 w-fit mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Comprehensive Reports</h3>
                <p className="text-muted-foreground">
                  Generate detailed PDF reports with scores, notes, and actionable insights.
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
                  Automated alerts and reminders keep your team informed and compliant.
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
                  Complete revision tracking and historical data for compliance documentation.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Who It's For Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 px-safe">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Built for Restaurant Teams
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Whether you're a single location or multi-unit operation, Dashspect scales with your needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-primary rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Restaurant Managers</h3>
              <p className="text-muted-foreground">
                Oversee multiple locations, monitor compliance, and ensure standards are met across your operations.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <ClipboardCheck className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Health Inspectors</h3>
              <p className="text-muted-foreground">
                Conduct efficient audits with digital checklists, capture evidence, and generate reports instantly.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary rounded-full p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Compliance Officers</h3>
              <p className="text-muted-foreground">
                Track trends, identify risks, and maintain audit trails for regulatory compliance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-muted/30 py-16 md:py-24">
        <div className="container mx-auto px-4 px-safe">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Simple. Efficient. Effective.
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes with our streamlined process
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">Create Templates</h3>
                <p className="text-muted-foreground">
                  Build custom audit templates or use our pre-built library to get started quickly.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">Conduct Audits</h3>
                <p className="text-muted-foreground">
                  Perform inspections with mobile-friendly checklists and capture findings in real-time.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">Track & Improve</h3>
                <p className="text-muted-foreground">
                  Monitor trends, generate reports, and drive continuous improvement across locations.
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
