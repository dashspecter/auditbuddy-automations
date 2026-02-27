import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { useScoutTemplates } from "@/hooks/useScoutTemplates";
import { useCreateScoutJob } from "@/hooks/useScoutJobs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { ArrowLeft, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const PAYOUT_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "discount", label: "Discount on Products" },
  { value: "free_product", label: "Free Product(s)" },
  { value: "mixed", label: "Mixed (Cash + Reward)" },
] as const;

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
    payout_type: 'cash',
    reward_description: '',
    voucher_expires_at: undefined as Date | undefined,
    time_window_start: '',
    time_window_end: '',
    notes_public: '',
    notes_internal: '',
  });

  const showCashFields = form.payout_type === 'cash' || form.payout_type === 'mixed';
  const showRewardFields = form.payout_type === 'discount' || form.payout_type === 'free_product' || form.payout_type === 'mixed';

  const handleSubmit = (publish: boolean) => {
    if (!form.template_id || !form.location_id || !form.title) return;
    createJob.mutate({
      ...form,
      payout_amount: showCashFields ? Number(form.payout_amount) : 0,
      voucher_expires_at: form.voucher_expires_at ? form.voucher_expires_at.toISOString() : undefined,
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

          {/* Payout Type */}
          <div className="space-y-2">
            <Label>Payout Type</Label>
            <Select value={form.payout_type} onValueChange={v => setForm(f => ({ ...f, payout_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYOUT_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cash fields */}
          {showCashFields && (
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
          )}

          {/* Reward fields */}
          {showRewardFields && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>
                  {form.payout_type === 'discount' ? 'Discount Details' : form.payout_type === 'free_product' ? 'Free Product(s) Details' : 'Reward Details'}
                </Label>
                <Textarea
                  value={form.reward_description}
                  onChange={e => setForm(f => ({ ...f, reward_description: e.target.value }))}
                  placeholder={
                    form.payout_type === 'discount'
                      ? 'e.g. 20% off all brand products'
                      : form.payout_type === 'free_product'
                      ? 'e.g. 1x Coffee + 1x Croissant'
                      : 'Describe the reward...'
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Voucher Expiry Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !form.voucher_expires_at && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.voucher_expires_at ? format(form.voucher_expires_at, "PPP") : "Pick expiry date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.voucher_expires_at}
                      onSelect={d => setForm(f => ({ ...f, voucher_expires_at: d }))}
                      disabled={date => date < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

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
