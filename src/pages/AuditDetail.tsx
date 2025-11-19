import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock, ArrowLeft, MapPin, User, Calendar, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { generateAuditPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";
import { useLocationAudit, useLocationAudits } from "@/hooks/useAudits";
import { format } from "date-fns";
import { useSwipeable } from "react-swipeable";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";

const COMPLIANCE_THRESHOLD = 80;

const AuditDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: audit, isLoading } = useLocationAudit(id || '');
  const { data: allAudits } = useLocationAudits();
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);

  // Find adjacent audits for navigation
  const { prevAuditId, nextAuditId } = useMemo(() => {
    if (!allAudits || !id) return { prevAuditId: null, nextAuditId: null };
    
    const currentIndex = allAudits.findIndex(a => a.id === id);
    if (currentIndex === -1) return { prevAuditId: null, nextAuditId: null };

    return {
      prevAuditId: currentIndex > 0 ? allAudits[currentIndex - 1].id : null,
      nextAuditId: currentIndex < allAudits.length - 1 ? allAudits[currentIndex + 1].id : null,
    };
  }, [allAudits, id]);

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      const progress = Math.abs(eventData.deltaX) / 100;
      setSwipeProgress(Math.min(progress, 1));
      
      if (eventData.deltaX > 0 && prevAuditId) {
        setSwipeDirection('right');
      } else if (eventData.deltaX < 0 && nextAuditId) {
        setSwipeDirection('left');
      }
    },
    onSwiped: (eventData) => {
      if (Math.abs(eventData.deltaX) > 100) {
        if (eventData.dir === 'Right' && prevAuditId) {
          navigate(`/audits/${prevAuditId}`);
        } else if (eventData.dir === 'Left' && nextAuditId) {
          navigate(`/audits/${nextAuditId}`);
        }
      }
      setSwipeDirection(null);
      setSwipeProgress(0);
    },
    trackMouse: false,
    trackTouch: true,
    delta: 10,
  });

  const handleDownloadPDF = () => {
    if (!audit) return;
    
    try {
      const pdfData = {
        id: audit.id,
        type: "location",
        location: audit.location,
        checker: "Audit User",
        date: format(new Date(audit.audit_date || audit.created_at), 'yyyy-MM-dd'),
        status: (audit.overall_score || 0) >= COMPLIANCE_THRESHOLD ? "compliant" : "non-compliant",
        score: audit.overall_score || 0,
        sections: [
          { name: "Compliance", score: Math.round(((audit.compliance_licenses || 0) + (audit.compliance_permits || 0) + (audit.compliance_signage || 0) + (audit.compliance_documentation || 0)) / 4), items: [] },
          { name: "Back of House", score: Math.round(((audit.boh_storage || 0) + (audit.boh_temperature || 0) + (audit.boh_preparation || 0) + (audit.boh_equipment || 0)) / 4), items: [] },
          { name: "Cleaning", score: Math.round(((audit.cleaning_surfaces || 0) + (audit.cleaning_floors || 0) + (audit.cleaning_equipment || 0) + (audit.cleaning_waste || 0)) / 4), items: [] },
          { name: "Front of House", score: Math.round(((audit.foh_customer_areas || 0) + (audit.foh_restrooms || 0) + (audit.foh_menu_boards || 0) + (audit.foh_seating || 0)) / 4), items: [] },
        ],
        notes: audit.notes || ""
      };

      generateAuditPDF(pdfData);
      toast({
        title: "PDF Generated",
        description: "Your audit report has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF report.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
              <p className="text-muted-foreground">Loading audit details...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Audit Not Found</h2>
            <p className="text-muted-foreground mb-4">The requested audit could not be found.</p>
            <Link to="/audits">
              <Button>Back to Audits</Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  const isCompliant = (audit.overall_score || 0) >= COMPLIANCE_THRESHOLD;
  const sections = [
    {
      name: "Compliance",
      fields: [
        { label: "Licenses", score: audit.compliance_licenses },
        { label: "Permits", score: audit.compliance_permits },
        { label: "Signage", score: audit.compliance_signage },
        { label: "Documentation", score: audit.compliance_documentation },
      ]
    },
    {
      name: "Back of House",
      fields: [
        { label: "Storage", score: audit.boh_storage },
        { label: "Temperature Control", score: audit.boh_temperature },
        { label: "Food Preparation", score: audit.boh_preparation },
        { label: "Equipment", score: audit.boh_equipment },
      ]
    },
    {
      name: "Cleaning & Sanitation",
      fields: [
        { label: "Surfaces", score: audit.cleaning_surfaces },
        { label: "Floors", score: audit.cleaning_floors },
        { label: "Equipment", score: audit.cleaning_equipment },
        { label: "Waste Management", score: audit.cleaning_waste },
      ]
    },
    {
      name: "Front of House",
      fields: [
        { label: "Customer Areas", score: audit.foh_customer_areas },
        { label: "Restrooms", score: audit.foh_restrooms },
        { label: "Menu Boards", score: audit.foh_menu_boards },
        { label: "Seating", score: audit.foh_seating },
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div {...handlers} className="relative">
        {/* Swipe indicators */}
        {swipeDirection === 'right' && prevAuditId && (
          <div 
            className="fixed left-4 top-1/2 -translate-y-1/2 z-40 transition-opacity duration-200"
            style={{ opacity: swipeProgress }}
          >
            <div className="bg-primary/90 backdrop-blur-sm rounded-full p-4 shadow-lg animate-pulse">
              <ChevronLeft className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
        )}
        {swipeDirection === 'left' && nextAuditId && (
          <div 
            className="fixed right-4 top-1/2 -translate-y-1/2 z-40 transition-opacity duration-200"
            style={{ opacity: swipeProgress }}
          >
            <div className="bg-primary/90 backdrop-blur-sm rounded-full p-4 shadow-lg animate-pulse">
              <ChevronRight className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
        )}

        <main 
          className={cn(
            "container mx-auto px-4 py-8 transition-transform duration-200",
            swipeDirection === 'right' && `translate-x-[${swipeProgress * 20}px]`,
            swipeDirection === 'left' && `-translate-x-[${swipeProgress * 20}px]`
          )}
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link to="/audits">
                  <Button variant="outline" size="icon" className="min-h-[44px] min-w-[44px]">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-foreground">Audit Details</h1>
                  <p className="text-muted-foreground mt-1">Detailed information about this audit</p>
                </div>
              </div>
              
              {/* Navigation arrows for desktop */}
              <div className="hidden md:flex gap-2">
                {prevAuditId && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate(`/audits/${prevAuditId}`)}
                    className="min-h-[44px] min-w-[44px]"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}
                {nextAuditId && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate(`/audits/${nextAuditId}`)}
                    className="min-h-[44px] min-w-[44px]"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>

          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full p-3">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-semibold text-foreground">{audit.location}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full p-3">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Auditor</p>
                  <p className="font-semibold text-foreground">User ID: {audit.user_id.substring(0, 8)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full p-3">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-semibold text-foreground">
                    {format(new Date(audit.audit_date || audit.created_at), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full p-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="font-semibold text-foreground text-2xl">{audit.overall_score || 0}%</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">Status:</span>
              {isCompliant ? (
                <Badge className="bg-success text-success-foreground gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Compliant
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Non-Compliant
                </Badge>
              )}
              <Badge variant="outline" className="ml-auto">
                Location Audit
              </Badge>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Audit Sections</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sections.map((section, index) => {
                const sectionScore = Math.round(
                  section.fields.reduce((sum, field) => sum + (field.score || 0), 0) / section.fields.length
                );

                return (
                  <Card key={index} className="p-4 bg-secondary/30">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-foreground">{section.name}</h3>
                      <span className="text-lg font-bold text-primary">{sectionScore}%</span>
                    </div>
                    <div className="space-y-2">
                      {section.fields.map((field, fieldIndex) => (
                        <div key={fieldIndex} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{field.label}</span>
                          <span className="font-medium text-foreground">
                            {field.score !== null && field.score !== undefined ? `${field.score}/5` : 'N/A'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>

          {audit.notes && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-foreground mb-3">Notes</h2>
              <p className="text-muted-foreground">{audit.notes}</p>
            </Card>
          )}

          <div className="flex gap-3">
            <Link to="/audits" className="flex-1">
              <Button variant="outline" className="w-full">
                Back to Audits
              </Button>
            </Link>
            <Button className="flex-1 gap-2" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          </div>
        </div>
        </main>
      </div>
    </div>
  );
};

export default AuditDetail;
