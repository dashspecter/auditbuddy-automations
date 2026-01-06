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
import { useTranslation } from "react-i18next";

const Landing = () => {
  const { t } = useTranslation();
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
      title: t('landing.industries.foodService.title'),
      description: t('landing.industries.foodService.desc'),
      color: "text-orange-500"
    },
    {
      icon: ShoppingBag,
      title: t('landing.industries.retail.title'),
      description: t('landing.industries.retail.desc'),
      color: "text-blue-500"
    },
    {
      icon: Building,
      title: t('landing.industries.hospitality.title'),
      description: t('landing.industries.hospitality.desc'),
      color: "text-purple-500"
    },
    {
      icon: Stethoscope,
      title: t('landing.industries.healthcare.title'),
      description: t('landing.industries.healthcare.desc'),
      color: "text-red-500"
    },
    {
      icon: Factory,
      title: t('landing.industries.manufacturing.title'),
      description: t('landing.industries.manufacturing.desc'),
      color: "text-slate-500"
    },
    {
      icon: HardHat,
      title: t('landing.industries.construction.title'),
      description: t('landing.industries.construction.desc'),
      color: "text-yellow-600"
    },
    {
      icon: Home,
      title: t('landing.industries.propertyManagement.title'),
      description: t('landing.industries.propertyManagement.desc'),
      color: "text-emerald-500"
    },
    {
      icon: GraduationCap,
      title: t('landing.industries.education.title'),
      description: t('landing.industries.education.desc'),
      color: "text-indigo-500"
    }
  ];

  const features = [
    {
      icon: ClipboardCheck,
      title: t('landing.features.customTemplates.title'),
      description: t('landing.features.customTemplates.desc')
    },
    {
      icon: BarChart3,
      title: t('landing.features.realTimeAnalytics.title'),
      description: t('landing.features.realTimeAnalytics.desc')
    },
    {
      icon: Users,
      title: t('landing.features.roleBasedAccess.title'),
      description: t('landing.features.roleBasedAccess.desc')
    },
    {
      icon: Calendar,
      title: t('landing.features.automatedScheduling.title'),
      description: t('landing.features.automatedScheduling.desc')
    },
    {
      icon: Camera,
      title: t('landing.features.photoDocumentation.title'),
      description: t('landing.features.photoDocumentation.desc')
    },
    {
      icon: FileText,
      title: t('landing.features.professionalReports.title'),
      description: t('landing.features.professionalReports.desc')
    },
    {
      icon: Bell,
      title: t('landing.features.smartNotifications.title'),
      description: t('landing.features.smartNotifications.desc')
    },
    {
      icon: Wrench,
      title: t('landing.features.equipmentManagement.title'),
      description: t('landing.features.equipmentManagement.desc')
    },
    {
      icon: Lock,
      title: t('landing.features.auditTrail.title'),
      description: t('landing.features.auditTrail.desc')
    }
  ];

  const teamMembers = [
    {
      icon: Shield,
      title: t('landing.teamMembers.administrators.title'),
      shortDesc: t('landing.teamMembers.administrators.shortDesc'),
      description: t('landing.teamMembers.administrators.desc')
    },
    {
      icon: Users,
      title: t('landing.teamMembers.managers.title'),
      shortDesc: t('landing.teamMembers.managers.shortDesc'),
      description: t('landing.teamMembers.managers.desc')
    },
    {
      icon: ClipboardCheck,
      title: t('landing.teamMembers.checkers.title'),
      shortDesc: t('landing.teamMembers.checkers.shortDesc'),
      description: t('landing.teamMembers.checkers.desc')
    },
    {
      icon: UserCheck,
      title: t('landing.teamMembers.hrTeams.title'),
      shortDesc: t('landing.teamMembers.hrTeams.shortDesc'),
      description: t('landing.teamMembers.hrTeams.desc')
    },
    {
      icon: Award,
      title: t('landing.teamMembers.staffMembers.title'),
      shortDesc: t('landing.teamMembers.staffMembers.shortDesc'),
      description: t('landing.teamMembers.staffMembers.desc')
    }
  ];

  const steps = [
    {
      number: "1",
      title: t('landing.howItWorks.step1.title'),
      shortTitle: t('landing.howItWorks.step1.shortTitle'),
      description: t('landing.howItWorks.step1.desc')
    },
    {
      number: "2",
      title: t('landing.howItWorks.step2.title'),
      shortTitle: t('landing.howItWorks.step2.shortTitle'),
      description: t('landing.howItWorks.step2.desc')
    },
    {
      number: "3",
      title: t('landing.howItWorks.step3.title'),
      shortTitle: t('landing.howItWorks.step3.shortTitle'),
      description: t('landing.howItWorks.step3.desc')
    },
    {
      number: "4",
      title: t('landing.howItWorks.step4.title'),
      shortTitle: t('landing.howItWorks.step4.shortTitle'),
      description: t('landing.howItWorks.step4.desc')
    },
    {
      number: "5",
      title: t('landing.howItWorks.step5.title'),
      shortTitle: t('landing.howItWorks.step5.shortTitle'),
      description: t('landing.howItWorks.step5.desc')
    },
    {
      number: "6",
      title: t('landing.howItWorks.step6.title'),
      shortTitle: t('landing.howItWorks.step6.shortTitle'),
      description: t('landing.howItWorks.step6.desc')
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Header />

      {/* Hero Section */}
      <section className="container mx-auto px-4 px-safe py-8 md:py-16 lg:py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6">
            {user ? t('landing.welcomeBack') : t('landing.heroTitle')}
          </h1>
          <p className="text-base md:text-xl text-muted-foreground mb-6 md:mb-8 max-w-2xl mx-auto">
            {user ? t('landing.welcomeBackDesc') : t('landing.heroDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {user ? (
              <>
                <Link to="/location-audit">
                  <Button size="lg" className="min-h-[48px] w-full sm:w-auto">
                    <Plus className="h-5 w-5 mr-2" />
                    {t('landing.newAudit')}
                  </Button>
                </Link>
                <Link to="/dashboard">
                  <Button size="lg" variant="outline" className="min-h-[48px] w-full sm:w-auto">
                    {t('landing.viewDashboard')}
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button size="lg" className="min-h-[48px] w-full sm:w-auto">
                    {t('landing.getStartedFree')}
                  </Button>
                </Link>
                <a href="#features">
                  <Button size="lg" variant="outline" className="min-h-[48px] w-full sm:w-auto">
                    {t('landing.learnMore')}
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
              {t('landing.coreFeatures.title')}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              {t('landing.coreFeatures.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 md:gap-8 max-w-6xl mx-auto">
            <Card className="border-2">
              <CardContent className="pt-4 md:pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">{t('landing.locationAudits.title')}</h3>
                </div>
                <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t('landing.locationAudits.customTemplates')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t('landing.locationAudits.photoDoc')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t('landing.locationAudits.recurringSchedules')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t('landing.locationAudits.pdfReports')}</span>
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
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">{t('landing.workforceManagement.title')}</h3>
                </div>
                <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t('landing.workforceManagement.shiftScheduling')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t('landing.workforceManagement.qrClockIn')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t('landing.workforceManagement.timeOffRequests')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t('landing.workforceManagement.leaderboards')}</span>
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
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">{t('landing.equipmentAssets.title')}</h3>
                </div>
                <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t('landing.equipmentAssets.inventory')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t('landing.equipmentAssets.maintenance')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t('landing.equipmentAssets.qrTracking')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t('landing.equipmentAssets.interventionHistory')}</span>
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
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">{t('landing.analyticsInsights.title')}</h3>
                </div>
                <ul className="space-y-2 md:space-y-3 text-sm md:text-base text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t('landing.analyticsInsights.realTimeDashboards')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t('landing.analyticsInsights.locationComparison')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t('landing.analyticsInsights.aiInsights')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-primary mt-0.5 flex-shrink-0" />
                    <span>{t('landing.analyticsInsights.trendAnalysis')}</span>
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
              {t('landing.industries.title')}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              {t('landing.industries.subtitle')}
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
              {t('landing.features.title')}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              {t('landing.features.subtitle')}
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
              {t('landing.teamMembers.title')}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              {t('landing.teamMembers.subtitle')}
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
              {t('landing.howItWorks.title')}
            </h2>
            <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              {t('landing.howItWorks.subtitle')}
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
                {t('landing.cta.startFreeTrial')}
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-2">{t('landing.cta.noCreditCard')}</p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-8 md:py-16 lg:py-24 bg-muted/30">
        <div className="container mx-auto px-4 px-safe">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6 md:mb-12">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2 md:mb-4">
                {t('landing.contact.title')}
              </h2>
              <p className="text-sm md:text-base md:text-lg text-muted-foreground">
                {t('landing.contact.subtitle')}
              </p>
            </div>

            <Card className="bg-card border-border">
              <CardContent className="py-6 md:py-12">
                <div className="grid md:grid-cols-2 gap-4 md:gap-8">
                  <div className="flex flex-col items-center text-center p-4 md:p-6 rounded-lg bg-muted/50">
                    <div className="bg-primary rounded-full p-3 md:p-4 mb-2 md:mb-4">
                      <Mail className="h-6 w-6 md:h-8 md:w-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-base md:text-lg font-semibold mb-1 md:mb-2">{t('landing.contact.emailUs')}</h3>
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
                    <h3 className="text-base md:text-lg font-semibold mb-1 md:mb-2">{t('landing.contact.callUs')}</h3>
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
                      {t('landing.contact.readyToStart')}
                    </p>
                    <Link to="/auth">
                      <Button size="lg" className="min-h-[44px] md:min-h-[48px]">
                        {t('landing.contact.signUpFree')}
                      </Button>
                    </Link>
                  </div>
                  <div>
                    <p className="text-sm md:text-base text-muted-foreground mb-3 md:mb-4">
                      {t('landing.contact.alreadyHaveAccount')}
                    </p>
                    <Link to="/auth">
                      <Button size="lg" variant="outline" className="min-h-[44px] md:min-h-[48px]">
                        {t('landing.signIn')}
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
          <p>{t('landing.footer.copyright', { year: new Date().getFullYear() })}</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
