import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, ArrowLeft, MapPin, User, Calendar, Download, ChevronLeft, ChevronRight, Edit, History } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { generateAuditPDF } from "@/lib/pdfExport";
import { useToast } from "@/hooks/use-toast";
import { useLocationAudit, useLocationAudits } from "@/hooks/useAudits";
import { format } from "date-fns";
import { useSwipeable } from "react-swipeable";
import { useState, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import { SectionScoreBreakdown } from "@/components/SectionScoreBreakdown";
import { supabase } from "@/integrations/supabase/client";
import { UserAvatar } from "@/components/UserAvatar";
import { EditAuditDialog } from "@/components/EditAuditDialog";
import { AuditRevisionHistory } from "@/components/AuditRevisionHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";

const COMPLIANCE_THRESHOLD = 80;

const AuditDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: audit, isLoading } = useLocationAudit(id || '');
  const { data: allAudits } = useLocationAudits();
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [templateSections, setTemplateSections] = useState<any[]>([]);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  // Load template data for section breakdown
  // Load template data for section breakdown
  useEffect(() => {
    if (audit?.template_id && audit?.custom_data) {
      loadTemplateSections(audit.template_id);
    }
  }, [audit]);

  const loadTemplateSections = async (templateId: string) => {
    setLoadingTemplate(true);
    try {
      const { data: sections, error } = await supabase
        .from('audit_sections')
        .select(`
          id,
          name,
          description,
          display_order,
          audit_fields (
            id,
            name,
            field_type,
            is_required,
            display_order,
            options
          )
        `)
        .eq('template_id', templateId)
        .order('display_order', { ascending: true });

      if (error) throw error;

      if (sections) {
        const formattedSections = sections.map(section => ({
          id: section.id,
          name: section.name,
          description: section.description,
          fields: (section.audit_fields || [])
            .sort((a: any, b: any) => a.display_order - b.display_order)
            .map((field: any) => ({
              id: field.id,
              name: field.name,
              field_type: field.field_type,
              is_required: field.is_required,
              options: field.options
            }))
        }));
        setTemplateSections(formattedSections);
      }
    } catch (error) {
      console.error('Error loading template sections:', error);
    } finally {
      setLoadingTemplate(false);
    }
  };

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

  // Show swipe hint on mobile after component mounts (only if there are audits to navigate to)
  useEffect(() => {
    const hasSeenHint = localStorage.getItem('audit-swipe-hint-seen');
    const isMobile = window.innerWidth < 768;
    const hasNavigation = prevAuditId || nextAuditId;
    
    if (!hasSeenHint && isMobile && hasNavigation) {
      const timer = setTimeout(() => {
        setShowSwipeHint(true);
        // Hide after 3 seconds
        setTimeout(() => {
          setShowSwipeHint(false);
          localStorage.setItem('audit-swipe-hint-seen', 'true');
        }, 3000);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [prevAuditId, nextAuditId]);

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      // Lower threshold for easier mobile swiping (80px instead of 100px)
      const progress = Math.abs(eventData.deltaX) / 80;
      setSwipeProgress(Math.min(progress, 1));
      
      if (eventData.deltaX > 0 && prevAuditId) {
        setSwipeDirection('right');
      } else if (eventData.deltaX < 0 && nextAuditId) {
        setSwipeDirection('left');
      } else {
        setSwipeDirection(null);
      }
    },
    onSwiped: (eventData) => {
      // Lower threshold for easier mobile swiping
      if (Math.abs(eventData.deltaX) > 80) {
        if (eventData.dir === 'Right' && prevAuditId) {
          // Add subtle haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
          navigate(`/audits/${prevAuditId}`);
        } else if (eventData.dir === 'Left' && nextAuditId) {
          // Add subtle haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
          navigate(`/audits/${nextAuditId}`);
        }
      }
      setSwipeDirection(null);
      setSwipeProgress(0);
    },
    trackMouse: false,
    trackTouch: true,
    delta: 5,
    preventScrollOnSwipe: false,
    touchEventOptions: { passive: false },
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div {...handlers} className="relative touch-pan-y">
        {/* Swipe hint for first-time mobile users */}
        {showSwipeHint && (prevAuditId || nextAuditId) && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 md:hidden animate-in slide-in-from-bottom-5 fade-in">
            <div className="bg-primary/95 backdrop-blur-sm text-primary-foreground px-6 py-3 rounded-full shadow-xl flex items-center gap-3">
              <ChevronLeft className="h-5 w-5 animate-pulse" />
              <span className="text-sm font-medium">Swipe to navigate</span>
              <ChevronRight className="h-5 w-5 animate-pulse" />
            </div>
          </div>
        )}
        
        {/* Swipe indicators with progress ring */}
        {swipeDirection === 'right' && prevAuditId && (
          <div 
            className="fixed left-4 top-1/2 -translate-y-1/2 z-40 transition-all duration-150 md:hidden"
            style={{ 
              opacity: swipeProgress,
              transform: `translateY(-50%) scale(${0.8 + swipeProgress * 0.2})`
            }}
          >
            <div className="relative">
              <div className="bg-primary/95 backdrop-blur-sm rounded-full p-4 shadow-xl">
                <ChevronLeft className="h-8 w-8 text-primary-foreground" />
              </div>
              {/* Progress ring */}
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-primary/30"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-primary-foreground"
                  strokeDasharray={`${swipeProgress * 289} 289`}
                  style={{ transition: 'stroke-dasharray 0.1s ease-out' }}
                />
              </svg>
            </div>
          </div>
        )}
        {swipeDirection === 'left' && nextAuditId && (
          <div 
            className="fixed right-4 top-1/2 -translate-y-1/2 z-40 transition-all duration-150 md:hidden"
            style={{ 
              opacity: swipeProgress,
              transform: `translateY(-50%) scale(${0.8 + swipeProgress * 0.2})`
            }}
          >
            <div className="relative">
              <div className="bg-primary/95 backdrop-blur-sm rounded-full p-4 shadow-xl">
                <ChevronRight className="h-8 w-8 text-primary-foreground" />
              </div>
              {/* Progress ring */}
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-primary/30"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="46"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4"
                  className="text-primary-foreground"
                  strokeDasharray={`${swipeProgress * 289} 289`}
                  style={{ transition: 'stroke-dasharray 0.1s ease-out' }}
                />
              </svg>
            </div>
          </div>
        )}

        <main 
          className="container mx-auto px-4 py-8 transition-transform duration-150 ease-out"
          style={{
            transform: swipeDirection 
              ? `translateX(${swipeDirection === 'right' ? swipeProgress * 30 : -swipeProgress * 30}px)`
              : 'translateX(0)'
          }}
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
                  <div className="flex items-center gap-2">
                    <UserAvatar 
                      avatarUrl={audit.profiles?.avatar_url}
                      userName={audit.profiles?.full_name}
                      userEmail={audit.profiles?.email}
                      size="sm"
                    />
                    <p className="font-semibold text-foreground">
                      {audit.profiles?.full_name || audit.profiles?.email || `User ${audit.user_id.substring(0, 8)}`}
                    </p>
                  </div>
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
                {audit.audit_templates?.name || 'Location Audit'}
              </Badge>
            </div>
          </Card>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Audit Details</TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                Revision History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="details" className="space-y-6">
              {/* Section Score Breakdown */}
              {audit?.custom_data && templateSections.length > 0 && (
                <SectionScoreBreakdown 
                  sections={templateSections}
                  customData={audit.custom_data as Record<string, any>}
                />
              )}

              {audit.notes && (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold text-foreground mb-3">Notes</h2>
                  <p className="text-muted-foreground">{audit.notes}</p>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history">
              <AuditRevisionHistory auditId={audit.id} />
            </TabsContent>
          </Tabs>

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
            <Button 
              className="flex-1 gap-2" 
              variant="outline"
              onClick={() => setEditDialogOpen(true)}
            >
              <Edit className="h-4 w-4" />
              Edit Audit
            </Button>
          </div>
        </div>
        </main>
      </div>

      {audit && (
        <EditAuditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          audit={audit}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['location_audit', id] });
            queryClient.invalidateQueries({ queryKey: ['location_audits'] });
            queryClient.invalidateQueries({ queryKey: ['audit_revisions', id] });
          }}
        />
      )}
    </div>
  );
};

export default AuditDetail;
