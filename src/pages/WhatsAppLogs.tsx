import { Fragment } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollText, Send, CheckCheck, Eye, AlertTriangle } from 'lucide-react';
import { useOutboundMessages, useMessageStats } from '@/hooks/useWhatsApp';
import { maskPhone } from '@/lib/phoneUtils';
import { format } from 'date-fns';

const statusConfig: Record<string, { color: string; icon: any }> = {
  queued: { color: 'bg-muted text-muted-foreground', icon: null },
  sending: { color: 'bg-blue-500/20 text-blue-700', icon: Send },
  sent: { color: 'bg-blue-500/20 text-blue-700', icon: Send },
  delivered: { color: 'bg-green-500/20 text-green-700', icon: CheckCheck },
  read: { color: 'bg-green-600/20 text-green-800', icon: Eye },
  failed: { color: 'bg-destructive/20 text-destructive', icon: AlertTriangle },
};

export default function WhatsAppLogs() {
  const { data: messages = [], isLoading } = useOutboundMessages({ limit: 200 });
  const { data: stats } = useMessageStats();

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ScrollText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Delivery Log</h1>
            <p className="text-muted-foreground">Track WhatsApp message delivery status</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardDescription>Total Sent</CardDescription></CardHeader>
            <CardContent><p className="text-2xl font-bold">{stats?.total || 0}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Delivered</CardDescription></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600">{stats?.deliveredPct || 0}%</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Read</CardDescription></CardHeader>
            <CardContent><p className="text-2xl font-bold text-blue-600">{stats?.readPct || 0}%</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Failed</CardDescription></CardHeader>
            <CardContent><p className="text-2xl font-bold text-destructive">{stats?.failedPct || 0}%</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : messages.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No messages yet</TableCell></TableRow>
                ) : messages.map((m: any) => {
                  const sc = statusConfig[m.status] || statusConfig.queued;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">{m.created_at ? format(new Date(m.created_at), 'MMM d, HH:mm') : '—'}</TableCell>
                      <TableCell className="font-mono text-sm">{maskPhone(m.recipient_phone_e164)}</TableCell>
                      <TableCell>{m.wa_message_templates?.name || '—'}</TableCell>
                      <TableCell><Badge variant="outline">{m.event_type}</Badge></TableCell>
                      <TableCell><Badge className={sc.color}>{m.status}</Badge></TableCell>
                      <TableCell className="text-sm text-destructive max-w-[200px] truncate">{m.error_message || ''}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
