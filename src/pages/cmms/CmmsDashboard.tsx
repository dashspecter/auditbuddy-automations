import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCmmsMetrics, useRecentWorkOrders } from '@/hooks/useCmmsMetrics';
import { 
  Wrench, AlertTriangle, CheckCircle, Clock, 
  Package, Users, Calendar, TrendingUp, ArrowRight,
  Settings, Truck, ClipboardList
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function CmmsDashboard() {
  const { t } = useTranslation();
  const { data: metrics, isLoading } = useCmmsMetrics();
  const { data: recentWorkOrders } = useRecentWorkOrders(5);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500';
      case 'in_progress': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'on_hold': return 'bg-orange-500';
      default: return 'bg-muted';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">{t('cmms.dashboard.title')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('cmms.dashboard.title')}</h1>
        <Button asChild>
          <Link to="/cmms/work-orders/new">
            <Wrench className="h-4 w-4 mr-2" />
            {t('cmms.dashboard.newWorkOrder')}
          </Link>
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('cmms.dashboard.openWorkOrders')}</p>
                <p className="text-3xl font-bold">{metrics?.workOrders.open || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.workOrders.inProgress || 0} {t('cmms.dashboard.inProgress')}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <Wrench className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('cmms.dashboard.overdue')}</p>
                <p className="text-3xl font-bold text-destructive">
                  {metrics?.workOrders.overdue || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.workOrders.highPriorityOpen || 0} {t('cmms.dashboard.highPriority')}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('cmms.dashboard.completed30d')}</p>
                <p className="text-3xl font-bold text-green-600">
                  {metrics?.workOrders.completedThisMonth || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.workOrders.preventive || 0} {t('cmms.dashboard.preventive')}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('cmms.dashboard.assetHealth')}</p>
                <p className="text-3xl font-bold">
                  {metrics?.assets.total ? 
                    Math.round((metrics.assets.operational / metrics.assets.total) * 100) : 0}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics?.assets.down || 0} {t('cmms.dashboard.assetsDown')}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('cmms.dashboard.pmDueSoon')}</p>
                <p className="text-2xl font-bold">{metrics?.pm.upcoming || 0}</p>
                <p className="text-xs text-destructive">
                  {metrics?.pm.overdue || 0} {t('cmms.dashboard.overdueCount')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-full">
                <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('cmms.dashboard.lowStockParts')}</p>
                <p className="text-2xl font-bold">{metrics?.parts.lowStock || 0}</p>
                <p className="text-xs text-muted-foreground">{t('cmms.dashboard.needReorder')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-100 dark:bg-cyan-900 rounded-full">
                <Settings className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('cmms.dashboard.totalAssets')}</p>
                <p className="text-2xl font-bold">{metrics?.assets.total || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {metrics?.assets.operational || 0} {t('cmms.dashboard.operational')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Work Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t('cmms.dashboard.recentWorkOrders')}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/cmms/work-orders">
                {t('cmms.dashboard.viewAll')} <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentWorkOrders?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t('cmms.dashboard.noWorkOrdersYet')}
                </p>
              )}
              {recentWorkOrders?.map((wo: any) => (
                <Link 
                  key={wo.id} 
                  to={`/cmms/work-orders/${wo.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(wo.status)}`} />
                    <div>
                      <p className="font-medium text-sm">
                        WO-{wo.wo_number}: {wo.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {wo.cmms_assets?.name || wo.locations?.name || t('cmms.workOrders.noLocation')}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getPriorityColor(wo.priority)}>
                    {wo.priority}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('cmms.dashboard.quickActions')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to="/cmms/work-orders">
                  <Wrench className="h-5 w-5 mb-2" />
                  <span>{t('cmms.workOrders')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to="/cmms/assets">
                  <Settings className="h-5 w-5 mb-2" />
                  <span>{t('cmms.assets')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to="/cmms/pm-schedules">
                  <Calendar className="h-5 w-5 mb-2" />
                  <span>{t('cmms.dashboard.pmSchedules')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to="/cmms/parts">
                  <Package className="h-5 w-5 mb-2" />
                  <span>{t('cmms.parts')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to="/cmms/procedures">
                  <ClipboardList className="h-5 w-5 mb-2" />
                  <span>{t('cmms.dashboard.procedures')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to="/cmms/vendors">
                  <Truck className="h-5 w-5 mb-2" />
                  <span>{t('cmms.vendors')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to="/cmms/teams">
                  <Users className="h-5 w-5 mb-2" />
                  <span>{t('cmms.dashboard.teams')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex-col" asChild>
                <Link to="/cmms/purchase-orders">
                  <Clock className="h-5 w-5 mb-2" />
                  <span>{t('cmms.dashboard.purchaseOrders')}</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
