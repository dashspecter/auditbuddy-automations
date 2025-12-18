import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, Calendar, MoreVertical, Trash2, Edit, Clock, CheckCircle } from 'lucide-react';
import { useCmmsPmPlans, useDeleteCmmsPmPlan } from '@/hooks/useCmmsPmPlans';
import { NewPmPlanDialog } from '@/components/cmms/NewPmPlanDialog';
import { format, isPast, isToday } from 'date-fns';
import { useTranslation } from 'react-i18next';

export default function PmSchedules() {
  const { t } = useTranslation();
  const { data: pmPlans, isLoading } = useCmmsPmPlans();
  const deletePmPlan = useDeleteCmmsPmPlan();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewDialog, setShowNewDialog] = useState(false);

  const filteredPlans = pmPlans?.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.asset?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.location?.name?.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  const getFrequencyLabel = (type: string, value: number) => value === 1 ? type.charAt(0).toUpperCase() + type.slice(1) : `${t('cmms.pmSchedules.every')} ${value} ${type}`;
  const getDueStatus = (nextDue: string | null) => { if (!nextDue) return null; const d = new Date(nextDue); if (isPast(d) && !isToday(d)) return 'overdue'; if (isToday(d)) return 'today'; return 'upcoming'; };

  return (
    <>
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">{t('cmms.pmSchedules.title')}</h1>
          <Button onClick={() => setShowNewDialog(true)}><Plus className="h-4 w-4 mr-2" />{t('cmms.pmSchedules.newPlan')}</Button>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t('cmms.pmSchedules.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        {isLoading ? <div className="text-center py-12 text-muted-foreground">{t('cmms.pmSchedules.loading')}</div> : filteredPlans.length === 0 ? (
          <Card><CardContent className="flex flex-col items-center justify-center py-12 text-center"><Calendar className="h-12 w-12 text-muted-foreground mb-4" /><h3 className="text-lg font-semibold mb-2">{t('cmms.pmSchedules.noPlans')}</h3><p className="text-muted-foreground mb-4 max-w-sm">{t('cmms.pmSchedules.noPlansDescription')}</p><Button onClick={() => setShowNewDialog(true)}><Plus className="h-4 w-4 mr-2" />{t('cmms.pmSchedules.newPlan')}</Button></CardContent></Card>
        ) : (
          <div className="border rounded-lg"><Table><TableHeader><TableRow><TableHead>{t('cmms.pmSchedules.name')}</TableHead><TableHead>{t('cmms.pmSchedules.scope')}</TableHead><TableHead>{t('cmms.pmSchedules.frequency')}</TableHead><TableHead>{t('cmms.pmSchedules.nextDue')}</TableHead><TableHead>{t('cmms.pmSchedules.autoCreate')}</TableHead><TableHead>{t('cmms.pmSchedules.defaultPriority')}</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader><TableBody>
            {filteredPlans.map((plan) => { const dueStatus = getDueStatus(plan.next_due_at); return (
              <TableRow key={plan.id}><TableCell className="font-medium">{plan.name}</TableCell><TableCell>{plan.scope_type === 'asset' && plan.asset && <span>{plan.asset.name}</span>}{plan.scope_type === 'location' && plan.location && <span>{plan.location.name}</span>}{plan.scope_type === 'category' && plan.category && <span>{t('cmms.pmSchedules.category')}: {plan.category.name}</span>}</TableCell><TableCell><div className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-muted-foreground" />{getFrequencyLabel(plan.frequency_type, plan.frequency_value)}</div></TableCell><TableCell>{plan.next_due_at ? <Badge variant={dueStatus === 'overdue' ? 'destructive' : dueStatus === 'today' ? 'default' : 'secondary'}>{dueStatus === 'overdue' && `${t('cmms.pmSchedules.overdue')}: `}{dueStatus === 'today' && t('cmms.pmSchedules.today')}{dueStatus === 'upcoming' && format(new Date(plan.next_due_at), 'MMM d, yyyy')}{dueStatus === 'overdue' && format(new Date(plan.next_due_at), 'MMM d')}</Badge> : <span className="text-muted-foreground">-</span>}</TableCell><TableCell>{plan.auto_create_work_order ? <CheckCircle className="h-4 w-4 text-green-500" /> : <span className="text-muted-foreground">-</span>}</TableCell><TableCell><Badge variant="outline">{plan.default_priority}</Badge></TableCell><TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem><Edit className="h-4 w-4 mr-2" />{t('common.edit')}</DropdownMenuItem><DropdownMenuItem className="text-destructive" onClick={() => deletePmPlan.mutate(plan.id)}><Trash2 className="h-4 w-4 mr-2" />{t('common.archive')}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>
            ); })}
          </TableBody></Table></div>
        )}
      </div>
      <NewPmPlanDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </>
  );
}
