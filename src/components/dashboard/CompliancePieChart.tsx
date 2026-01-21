import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { useLocationAudits } from "@/hooks/useAudits";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { startOfDay, endOfDay, format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const COMPLIANCE_THRESHOLD = 80;
const COLORS = {
  compliant: "hsl(var(--success))",
  nonCompliant: "hsl(var(--destructive))",
};

interface CompliancePieChartProps {
  dateFrom?: Date;
  dateTo?: Date;
}

interface AuditItem {
  id: string;
  location: string;
  audit_date: string;
  overall_score: number;
  template_name?: string;
}

export const CompliancePieChart = ({ dateFrom, dateTo }: CompliancePieChartProps) => {
  const { t } = useTranslation();
  const { data: audits, isLoading } = useLocationAudits();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'compliant' | 'nonCompliant' | null>(null);

  const { pieData, averageScore, filteredAuditsCount, compliantAudits, nonCompliantAudits } = useMemo(() => {
    if (!audits || audits.length === 0) return { 
      pieData: [], 
      averageScore: 0, 
      filteredAuditsCount: 0,
      compliantAudits: [],
      nonCompliantAudits: []
    };

    // Filter audits by date range if provided
    let filteredAudits = audits;
    if (dateFrom || dateTo) {
      filteredAudits = audits.filter(audit => {
        const auditDate = new Date(audit.audit_date);
        if (dateFrom && auditDate < startOfDay(dateFrom)) return false;
        if (dateTo && auditDate > endOfDay(dateTo)) return false;
        return true;
      });
    }

    // Filter out 0% audits for consistency with other dashboard stats
    const auditsWithScores = filteredAudits.filter(a => a.overall_score && a.overall_score > 0);

    if (auditsWithScores.length === 0) return { 
      pieData: [], 
      averageScore: 0, 
      filteredAuditsCount: 0,
      compliantAudits: [],
      nonCompliantAudits: []
    };

    const totalScore = auditsWithScores.reduce((sum, audit) => sum + (audit.overall_score || 0), 0);
    const avgScore = Math.round(totalScore / auditsWithScores.length);
    
    const compliantList = auditsWithScores.filter(a => (a.overall_score || 0) >= COMPLIANCE_THRESHOLD);
    const nonCompliantList = auditsWithScores.filter(a => (a.overall_score || 0) < COMPLIANCE_THRESHOLD);

    const mapAudit = (audit: typeof audits[0]): AuditItem => ({
      id: audit.id,
      location: audit.locations?.name || audit.location || t('common.unknown'),
      audit_date: audit.audit_date,
      overall_score: audit.overall_score || 0,
      template_name: audit.audit_templates?.name
    });

    return {
      pieData: [
        { name: t('dashboard.compliance.compliant'), value: compliantList.length },
        { name: t('dashboard.compliance.nonCompliant'), value: nonCompliantList.length },
      ],
      averageScore: avgScore,
      filteredAuditsCount: auditsWithScores.length,
      compliantAudits: compliantList.map(mapAudit),
      nonCompliantAudits: nonCompliantList.map(mapAudit)
    };
  }, [audits, t, dateFrom, dateTo]);

  const handlePieClick = (data: any, index: number) => {
    setSelectedCategory(index === 0 ? 'compliant' : 'nonCompliant');
    setDialogOpen(true);
  };

  const selectedAudits = selectedCategory === 'compliant' ? compliantAudits : nonCompliantAudits;
  const dialogTitle = selectedCategory === 'compliant' 
    ? t('dashboard.compliance.compliant') 
    : t('dashboard.compliance.nonCompliant');

  if (isLoading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('dashboard.compliance.title')}</h3>
        <div className="flex items-center justify-center h-[300px]">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </Card>
    );
  }

  if (!audits || audits.length === 0 || filteredAuditsCount === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('dashboard.compliance.title')}</h3>
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          {t('dashboard.compliance.noData')}
        </div>
      </Card>
    );
  }

  const compliantPercentage = Math.round((pieData[0].value / filteredAuditsCount) * 100);

  return (
    <>
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">{t('dashboard.compliance.title')}</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-4 bg-secondary/50 rounded-lg">
            <span className="text-3xl font-bold">{averageScore}%</span>
            <p className="text-sm text-muted-foreground mt-1">{t('dashboard.stats.averageScore')}</p>
          </div>
          <div className="text-center p-4 bg-secondary/50 rounded-lg">
            <span className="text-3xl font-bold">{compliantPercentage}%</span>
            <p className="text-sm text-muted-foreground mt-1">{t('dashboard.compliance.meetThreshold', { threshold: COMPLIANCE_THRESHOLD })}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              onClick={handlePieClick}
              style={{ cursor: 'pointer' }}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.compliant : COLORS.nonCompliant} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {dialogTitle}
              <Badge variant={selectedCategory === 'compliant' ? 'default' : 'destructive'}>
                {selectedAudits.length} {t('audits.title')}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2">
              {selectedAudits.map((audit) => (
                <div key={audit.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="font-medium">{audit.location}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(audit.audit_date), 'dd MMM yyyy')}
                      {audit.template_name && ` • ${audit.template_name}`}
                    </p>
                  </div>
                  <Badge variant={audit.overall_score >= COMPLIANCE_THRESHOLD ? 'default' : 'destructive'}>
                    {audit.overall_score}%
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
