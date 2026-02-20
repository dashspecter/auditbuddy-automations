import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Copy, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useMessagingChannel, useUpsertMessagingChannel } from '@/hooks/useWhatsApp';
import { toast } from 'sonner';

export function WhatsAppChannelSettings() {
  const { data: channel, isLoading } = useMessagingChannel();
  const upsert = useUpsertMessagingChannel();

  const [form, setForm] = useState({
    twilio_account_sid: '',
    phone_number_e164: '',
    display_name: '',
    status: 'pending' as string,
  });

  useEffect(() => {
    if (channel) {
      setForm({
        twilio_account_sid: channel.twilio_account_sid || '',
        phone_number_e164: channel.phone_number_e164 || '',
        display_name: channel.display_name || '',
        status: channel.status || 'pending',
      });
    }
  }, [channel]);

  const webhookUrl = channel?.webhook_url || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;

  const handleSave = () => {
    upsert.mutate({ ...form, webhook_url: webhookUrl });
  };

  const statusIcon = form.status === 'active' ? <CheckCircle className="h-4 w-4 text-green-500" /> :
                     form.status === 'disconnected' ? <AlertCircle className="h-4 w-4 text-destructive" /> :
                     <Loader2 className="h-4 w-4 text-yellow-500" />;

  if (isLoading) return <Card><CardContent className="py-8 text-center">Loading...</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <CardTitle>WhatsApp Configuration</CardTitle>
        </div>
        <CardDescription>Configure your Twilio WhatsApp channel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          {statusIcon}
          <Badge variant={form.status === 'active' ? 'default' : 'secondary'}>{form.status}</Badge>
        </div>

        <div className="space-y-2">
          <Label>Twilio Account SID</Label>
          <Input value={form.twilio_account_sid} onChange={e => setForm(f => ({ ...f, twilio_account_sid: e.target.value }))} placeholder="AC..." />
        </div>

        <div className="space-y-2">
          <Label>WhatsApp Phone Number (E.164)</Label>
          <Input value={form.phone_number_e164} onChange={e => setForm(f => ({ ...f, phone_number_e164: e.target.value }))} placeholder="+14155238886" />
        </div>

        <div className="space-y-2">
          <Label>Display Name</Label>
          <Input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="Company WhatsApp" />
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <select className="w-full border rounded-md p-2 bg-background" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="disconnected">Disconnected</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>Webhook URL (paste in Twilio console)</Label>
          <div className="flex gap-2">
            <Input value={webhookUrl} readOnly className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!'); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button onClick={handleSave} disabled={upsert.isPending}>
          {upsert.isPending ? 'Saving...' : 'Save Configuration'}
        </Button>
      </CardContent>
    </Card>
  );
}
