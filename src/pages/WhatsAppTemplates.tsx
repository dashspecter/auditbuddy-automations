import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, MessageSquare } from 'lucide-react';
import { useWaTemplates, useCreateWaTemplate, useUpdateWaTemplate, useDeleteWaTemplate } from '@/hooks/useWhatsApp';
import { useAuth } from '@/contexts/AuthContext';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-yellow-500/20 text-yellow-700',
  approved: 'bg-green-500/20 text-green-700',
  rejected: 'bg-destructive/20 text-destructive',
};

export default function WhatsAppTemplates() {
  const { user } = useAuth();
  const { data: templates = [], isLoading } = useWaTemplates();
  const createTemplate = useCreateWaTemplate();
  const updateTemplate = useUpdateWaTemplate();
  const deleteTemplate = useDeleteWaTemplate();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState({
    name: '', language: 'en', category: 'utility', body: '',
    header_type: 'none', header_content: '', footer: '',
    provider_template_id: '', approval_status: 'draft',
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', language: 'en', category: 'utility', body: '', header_type: 'none', header_content: '', footer: '', provider_template_id: '', approval_status: 'draft' });
    setDialogOpen(true);
  };

  const openEdit = (t: any) => {
    setEditing(t);
    setForm({
      name: t.name, language: t.language, category: t.category, body: t.body || '',
      header_type: t.header_type || 'none', header_content: t.header_content || '',
      footer: t.footer || '', provider_template_id: t.provider_template_id || '',
      approval_status: t.approval_status || 'draft',
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editing) {
      updateTemplate.mutate({ id: editing.id, ...form }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createTemplate.mutate({ ...form, created_by: user?.id }, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">WhatsApp Templates</h1>
              <p className="text-muted-foreground">Manage message templates for WhatsApp notifications</p>
            </div>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Template</Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : templates.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No templates yet</TableCell></TableRow>
                ) : templates.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell><Badge variant="outline">{t.language?.toUpperCase()}</Badge></TableCell>
                    <TableCell>{t.category}</TableCell>
                    <TableCell><Badge className={statusColors[t.approval_status] || ''}>{t.approval_status}</Badge></TableCell>
                    <TableCell>v{t.version}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleteTarget(t)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Template' : 'Create Template'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name (slug)</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="shift_reminder" />
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={form.language} onValueChange={v => setForm(f => ({ ...f, language: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="ro">Română</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utility">Utility</SelectItem>
                      <SelectItem value="authentication">Authentication</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Approval Status</Label>
                  <Select value={form.approval_status} onValueChange={v => setForm(f => ({ ...f, approval_status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Body</Label>
                <Textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} rows={4} placeholder="Hello {{employee_name}}, your shift on {{date}} has been updated." />
                <p className="text-xs text-muted-foreground">Use named placeholders like {"{{employee_name}}"}, {"{{date}}"}, {"{{start_time}}"} etc.</p>
              </div>
              <div className="space-y-2">
                <Label>Footer (optional)</Label>
                <Input value={form.footer} onChange={e => setForm(f => ({ ...f, footer: e.target.value }))} placeholder="Reply STOP to opt out" />
              </div>
              <div className="space-y-2">
                <Label>Provider Template ID (Twilio Content SID)</Label>
                <Input value={form.provider_template_id} onChange={e => setForm(f => ({ ...f, provider_template_id: e.target.value }))} placeholder="HX..." />
              </div>
              {form.body && (
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
                  <CardContent>
                    <div className="bg-background rounded-lg p-3 max-w-xs">
                      <p className="text-sm whitespace-pre-wrap">{form.body}</p>
                      {form.footer && <p className="text-xs text-muted-foreground mt-2">{form.footer}</p>}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!form.name || !form.body}>{editing ? 'Update' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fix 6: Delete confirmation dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Template</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the template <strong>"{deleteTarget?.name}"</strong>? This action cannot be undone and may break notification rules that reference it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteTarget) {
                    deleteTemplate.mutate(deleteTarget.id);
                    setDeleteTarget(null);
                  }
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
