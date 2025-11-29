import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  CheckCircle2, 
  XCircle, 
  Home, 
  Eye, 
  MapPin, 
  Calendar, 
  Clock,
  FileText,
  TrendingUp
} from 'lucide-react';
import { SectionScoreBreakdown } from '@/components/SectionScoreBreakdown';
import AuditResponsesSummary from '@/components/audit/AuditResponsesSummary';
import { cn } from '@/lib/utils';

interface AuditData {
  id: string;
  location: string;
  audit_date: string;
  overall_score: number | null;
  status: string | null;
  time_start: string | null;
  time_end: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  notes: string | null;
  custom_data: any;
  template_id: string | null;
  locations?: {
    name: string;
    city: string | null;
  } | null;
  audit_templates?: {
    name: string;
  } | null;
  profiles?: {
    full_name: string | null;
    email: string;
  } | null;
}

interface TemplateSection {
  id: string;
  name: string;
  description: string | null;
  fields: any[];
}

const COMPLIANCE_THRESHOLD = 80;

const AuditSummary = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [sections, setSections] = useState<TemplateSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadAudit();
    }
  }, [id]);

  const loadAudit = async () => {
    try {
      const { data, error } = await supabase
        .from('location_audits')
        .select(`
          *,
          locations(name, city),
          audit_templates(name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Fetch user profile separately
      let profileData = null;
      if (data.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', data.user_id)
          .single();
        
        profileData = profile;
      }
      
      const auditWithProfile = {
        ...data,
        profiles: profileData
      } as AuditData;
      
      setAudit(auditWithProfile);

      // Load template sections if custom_data exists
      if (data.template_id && data.custom_data) {
        await loadTemplateSections(data.template_id);
      }
    } catch (error) {
      console.error('Error loading audit:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateSections = async (templateId: string) => {
    try {
      const { data: sectionsData, error } = await supabase
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

      if (sectionsData) {
        const formattedSections = sectionsData.map(section => ({
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
        setSections(formattedSections);
      }
    } catch (error) {
      console.error('Error loading template sections:', error);
    }
  };

  const getStatusInfo = (score: number | null, status: string | null) => {
    if (score === null || score === undefined) {
      return {
        icon: FileText,
        color: 'text-muted-foreground',
        bgColor: 'bg-muted',
        label: 'No Score',
        message: 'Audit completed without scoring'
      };
    }

    const isCompliant = score >= COMPLIANCE_THRESHOLD;
    return {
      icon: isCompliant ? CheckCircle2 : XCircle,
      color: isCompliant ? 'text-green-600' : 'text-red-600',
      bgColor: isCompliant ? 'bg-green-50' : 'bg-red-50',
      label: isCompliant ? 'Compliant' : 'Non-Compliant',
      message: isCompliant 
        ? 'Great job! This location meets compliance standards.'
        : 'This location requires attention to meet compliance standards.'
    };
  };

  const formatTime = (time: string | null) => {
    if (!time) return 'N/A';
    return format(new Date(`2000-01-01T${time}`), 'h:mm a');
  };

  const calculateTimeDifference = () => {
    if (!audit?.scheduled_start || !audit?.scheduled_end || !audit?.time_start || !audit?.time_end) {
      return null;
    }

    const scheduledStart = new Date(`${audit.audit_date}T${audit.scheduled_start}`);
    const scheduledEnd = new Date(`${audit.audit_date}T${audit.scheduled_end}`);
    const actualStart = new Date(`${audit.audit_date}T${audit.time_start}`);
    const actualEnd = new Date(`${audit.audit_date}T${audit.time_end}`);

    const scheduledDuration = (scheduledEnd.getTime() - scheduledStart.getTime()) / 60000; // minutes
    const actualDuration = (actualEnd.getTime() - actualStart.getTime()) / 60000; // minutes
    
    const difference = actualDuration - scheduledDuration;
    const isOnTime = Math.abs(difference) <= 15; // Within 15 minutes is considered on time

    return { difference, isOnTime, scheduledDuration, actualDuration };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-4">Audit Not Found</h2>
            <Button onClick={() => navigate('/')}>
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const statusInfo = getStatusInfo(audit.overall_score, audit.status);
  const StatusIcon = statusInfo.icon;
  const timeDiff = calculateTimeDifference();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Success Banner */}
          <Card className={cn("border-2", statusInfo.bgColor)}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-full", statusInfo.bgColor)}>
                  <StatusIcon className={cn("h-8 w-8", statusInfo.color)} />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold mb-1">Audit Completed Successfully!</h1>
                  <p className="text-muted-foreground">{statusInfo.message}</p>
                </div>
                <Badge 
                  variant={audit.overall_score && audit.overall_score >= COMPLIANCE_THRESHOLD ? "default" : "destructive"}
                  className="text-lg px-4 py-2"
                >
                  {statusInfo.label}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Overall Score */}
          {audit.overall_score !== null && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Overall Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-6xl font-bold mb-2" style={{
                    color: audit.overall_score >= COMPLIANCE_THRESHOLD ? 'hsl(142, 76%, 36%)' : 'hsl(0, 84%, 60%)'
                  }}>
                    {audit.overall_score}%
                  </div>
                  <p className="text-muted-foreground">
                    Threshold: {COMPLIANCE_THRESHOLD}%
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Location & Template Info */}
          <Card>
            <CardHeader>
              <CardTitle>Audit Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{audit.locations?.name || audit.location}</p>
                    {audit.locations?.city && (
                      <p className="text-sm text-muted-foreground">{audit.locations.city}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Template</p>
                    <p className="font-medium">{audit.audit_templates?.name || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">{format(new Date(audit.audit_date), 'PPP')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time</p>
                    <p className="font-medium">
                      {formatTime(audit.time_start)} - {formatTime(audit.time_end)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scheduled vs Actual Time */}
          {timeDiff && (
            <Card>
              <CardHeader>
                <CardTitle>Time Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Scheduled Duration</p>
                    <p className="text-2xl font-bold">{timeDiff.scheduledDuration} min</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Actual Duration</p>
                    <p className="text-2xl font-bold">{timeDiff.actualDuration} min</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Difference</p>
                    <p className={cn("text-2xl font-bold", timeDiff.isOnTime ? "text-green-600" : "text-amber-600")}>
                      {timeDiff.difference > 0 ? '+' : ''}{timeDiff.difference.toFixed(0)} min
                    </p>
                    <Badge variant={timeDiff.isOnTime ? "default" : "secondary"} className="mt-2">
                      {timeDiff.isOnTime ? 'On Time' : 'Off Schedule'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Additional Information - Observations, Photos, Attachments, Follow-ups */}
          {sections.length > 0 && (
            <AuditResponsesSummary
              auditId={audit.id}
              sections={sections}
            />
          )}

          {/* Section Scores */}
          {sections.length > 0 && audit.custom_data && (
            <Card>
              <CardHeader>
                <CardTitle>Score per Section</CardTitle>
              </CardHeader>
              <CardContent>
                <SectionScoreBreakdown 
                  sections={sections}
                  customData={audit.custom_data}
                  auditId={audit.id}
                />
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {audit.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{audit.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate('/')} variant="outline">
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button onClick={() => navigate(`/audit/${audit.id}`)} variant="default">
              <Eye className="h-4 w-4 mr-2" />
              View Full Audit
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuditSummary;
