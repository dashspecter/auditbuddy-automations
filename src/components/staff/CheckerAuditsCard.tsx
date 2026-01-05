import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Plus, ArrowRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLocationAudits } from "@/hooks/useAudits";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

export const CheckerAuditsCard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: allAudits = [], isLoading } = useLocationAudits();

  // Filter audits for current user only
  const myAudits = useMemo(() => {
    if (!allAudits || !user) return [];
    return allAudits.filter(audit => audit.user_id === user.id);
  }, [allAudits, user]);

  const stats = useMemo(() => {
    const total = myAudits.length;
    const completed = myAudits.filter(a => a.status === 'compliant').length;
    const drafts = myAudits.filter(a => a.status === 'draft' || !a.status).length;
    return { total, completed, drafts };
  }, [myAudits]);

  const recentAudits = useMemo(() => {
    return [...myAudits]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }, [myAudits]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'compliant':
        return 'bg-success/20 text-success border-success/30';
      case 'pending':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'non-compliant':
        return 'bg-destructive/20 text-destructive border-destructive/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-4">
      {/* Create Audit Card */}
      <Card className="p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <ClipboardCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{t('staffHome.checker.audits', 'Audits')}</h3>
            <p className="text-xs text-muted-foreground">{t('staffHome.checker.createAndManage', 'Create and manage location audits')}</p>
          </div>
          <Badge variant="outline" className="text-xs">
            {stats.total} {t('common.total', 'total')}
          </Badge>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-background rounded-md p-2 text-center">
            <div className="text-lg font-bold text-success">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">{t('common.completed', 'Completed')}</div>
          </div>
          <div className="bg-background rounded-md p-2 text-center">
            <div className="text-lg font-bold text-warning">{stats.drafts}</div>
            <div className="text-xs text-muted-foreground">{t('common.drafts', 'Drafts')}</div>
          </div>
        </div>

        <Button 
          className="w-full" 
          onClick={() => navigate("/staff/location-audit")}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('staffHome.checker.createAudit', 'Create Audit')}
        </Button>
      </Card>

      {/* Recent Audits */}
      {recentAudits.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">{t('staffHome.checker.recentAudits', 'Recent Audits')}</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7"
              onClick={() => navigate("/audits")}
            >
              {t('common.viewAll', 'View All')} <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-2">
              {recentAudits.map((audit) => (
                <div 
                  key={audit.id} 
                  className="flex items-center justify-between p-2 rounded-md bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate(`/audits/${audit.id}`)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{audit.location}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(audit.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {audit.overall_score !== null && audit.overall_score !== undefined && (
                      <span className="text-sm font-semibold">{audit.overall_score}%</span>
                    )}
                    <Badge variant="outline" className={`text-xs ${getStatusColor(audit.status || 'draft')}`}>
                      {audit.status || 'draft'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
