import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScoutTemplates } from "@/hooks/useScoutTemplates";
import { useCreateScoutJob } from "@/hooks/useScoutJobs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { ArrowLeft } from "lucide-react";

const ScoutsJobNew = () => {
  const navigate = useNavigate();
  const { data: company } = useCompany();
  const companyId = company?.id;
  const { data: templates = [] } = useScoutTemplates();
  const createJob = useCreateScoutJob();
  
  const { data: locations = [] } = useQuery({
    queryKey: ['locations', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from('locations').select('id, name').eq('company_id', companyId).order('name');
      return data || [];
    },
    enabled: !!companyId,
  });

  const [form, setForm] = useState({
    template_id: '',
    location_id: '',
    title: '',
    payout_amount: 50,
    currency: 'RON',
    time_window_start: '',
    time_window_end: '',
    notes_public: '',
    notes_internal: '',
  });

  const handleSubmit = (publish: boolean) => {
    if (!form.template_id || !form.location_id || !form.title) return;
    createJob.mutate({
      ...form,
      payout_amount: Number(form.payout_amount),
      publish,
    }, {
      onSuccess: () => navigate('/scouts/jobs'),
    });
  };

  const activeTemplates = templates.filter(t => t.is_active);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/scouts/jobs')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Create Scout Job</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Template *</Label>
            <Select value={form.template_id} onValueChange={v => setForm(f => ({ ...f, template_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
              <SelectContent>
                {activeTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title} ({t.estimated_duration_minutes} min)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Location *</Label>
            <Select value={form.location_id} onValueChange={v => setForm(f => ({ ...f, location_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
              <SelectContent>
                {locations.map((l: any) => (
                  <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Job Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Cleanliness Check - Store Alpha" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payout Amount</Label>
              <Input type="number" value={form.payout_amount} onChange={e => setForm(f => ({ ...f, payout_amount: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RON">RON</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Time Window Start</Label>
              <Input type="datetime-local" value={form.time_window_start} onChange={e => setForm(f => ({ ...f, time_window_start: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Time Window End</Label>
              <Input type="datetime-local" value={form.time_window_end} onChange={e => setForm(f => ({ ...f, time_window_end: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Public Notes (visible to scout)</Label>
            <Textarea value={form.notes_public} onChange={e => setForm(f => ({ ...f, notes_public: e.target.value }))} placeholder="Instructions visible to the scout..." />
          </div>

          <div className="space-y-2">
            <Label>Internal Notes (private)</Label>
            <Textarea value={form.notes_internal} onChange={e => setForm(f => ({ ...f, notes_internal: e.target.value }))} placeholder="Internal notes, not visible to scout..." />
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => handleSubmit(false)} disabled={createJob.isPending}>
              Save as Draft
            </Button>
            <Button onClick={() => handleSubmit(true)} disabled={createJob.isPending}>
              Publish Job
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScoutsJobNew;
