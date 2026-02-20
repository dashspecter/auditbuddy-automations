import { useState } from 'react';
import { ProtectedLayout } from '@/components/layout/ProtectedLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Megaphone, Send } from 'lucide-react';
import { useWaTemplates } from '@/hooks/useWhatsApp';
import { useCompanyContext } from '@/contexts/CompanyContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function WhatsAppBroadcast() {
  const { company } = useCompanyContext();
  const { data: templates = [] } = useWaTemplates();
  const approvedTemplates = templates.filter((t: any) => t.approval_status === 'approved');

  const [templateId, setTemplateId] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-broadcast`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ company_id: company?.id, template_id: templateId, variables: {}, scope: {} }),
        }
      );
      const result = await res.json();
      if (res.ok) {
        toast.success(`Broadcast sent to ${result.inserted} recipients`);
      } else {
        toast.error(result.error || 'Broadcast failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Megaphone className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">WhatsApp Broadcast</h1>
            <p className="text-muted-foreground">Send announcements to opted-in employees</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Send Broadcast</CardTitle>
            <CardDescription>Select an approved template and send to all opted-in employees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Select approved template" /></SelectTrigger>
                <SelectContent>
                  {approvedTemplates.length === 0 ? (
                    <SelectItem value="_none" disabled>No approved templates</SelectItem>
                  ) : approvedTemplates.map((t: any) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.language})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => setConfirmOpen(true)} disabled={!templateId || sending}>
              <Send className="h-4 w-4 mr-2" />{sending ? 'Sending...' : 'Send Broadcast'}
            </Button>
          </CardContent>
        </Card>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Broadcast</AlertDialogTitle>
              <AlertDialogDescription>
                This will send a WhatsApp message to all opted-in employees. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSend}>Send Now</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedLayout>
  );
}
