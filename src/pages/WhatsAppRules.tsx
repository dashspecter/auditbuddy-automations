import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings2, Plus, Pencil } from 'lucide-react';
import { useNotificationRules, useUpsertNotificationRule, useWaTemplates } from '@/hooks/useWhatsApp';

const EVENT_TYPES = [
  'shift_published', 'shift_changed', 'task_assigned', 'task_overdue',
  'audit_failed', 'corrective_action', 'incident', 'points_earned', 'announcement',
];

export default function WhatsAppRules() {
  const { data: rules = [], isLoading } = useNotificationRules();
  const { data: templates = [] } = useWaTemplates();
  const upsertRule = useUpsertNotificationRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>({
    id: null, event_type: '', channel: 'whatsapp', template_id: '',
    is_active: true, throttle_max_per_day: 20, target_roles: ['staff'],
    escalation_after_minutes: null, escalation_channel: null,
  });

  const openCreate = () => {
    setForm({ id: null, event_type: '', channel: 'whatsapp', template_id: '', is_active: true, throttle_max_per_day: 20, target_roles: ['staff'], escalation_after_minutes: null, escalation_channel: null });
    setDialogOpen(true);
  };

  const openEdit = (r: any) => {
    setForm({ id: r.id, event_type: r.event_type, channel: r.channel, template_id: r.template_id || '', is_active: r.is_active, throttle_max_per_day: r.throttle_max_per_day, target_roles: r.target_roles || ['staff'], escalation_after_minutes: r.escalation_after_minutes, escalation_channel: r.escalation_channel });
    setDialogOpen(true);
  };

  const handleSave = () => {
    const { id, ...values } = form;
    upsertRule.mutate({ id, ...values }, { onSuccess: () => setDialogOpen(false) });
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Notification Rules</h1>
              <p className="text-muted-foreground">Configure which events trigger WhatsApp messages</p>
            </div>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Rule</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event Type</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Throttle</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : rules.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No rules configured</TableCell></TableRow>
                ) : rules.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.event_type}</TableCell>
                    <TableCell><Badge variant="outline">{r.channel}</Badge></TableCell>
                    <TableCell>{r.wa_message_templates?.name || '—'}</TableCell>
                    <TableCell>{(r.target_roles || []).join(', ')}</TableCell>
                    <TableCell>{r.throttle_max_per_day}/day</TableCell>
                    <TableCell><Badge className={r.is_active ? 'bg-green-500/20 text-green-700' : 'bg-muted'}>{r.is_active ? 'Yes' : 'No'}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{form.id ? 'Edit Rule' : 'Create Rule'}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={form.event_type} onValueChange={v => setForm((f: any) => ({ ...f, event_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map(e => <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Template</Label>
                <Select value={form.template_id} onValueChange={v => setForm((f: any) => ({ ...f, template_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
                  <SelectContent>{templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.approval_status})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max messages per day</Label>
                <Input type="number" value={form.throttle_max_per_day} onChange={e => setForm((f: any) => ({ ...f, throttle_max_per_day: parseInt(e.target.value) || 20 }))} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={v => setForm((f: any) => ({ ...f, is_active: v }))} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.event_type}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
