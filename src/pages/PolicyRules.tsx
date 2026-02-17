import { useState } from "react";
import { 
  usePolicyRules, 
  useCreatePolicyRule, 
  useTogglePolicyRule, 
  useDeletePolicyRule,
  usePolicyEvaluations,
  ConditionType, 
  EnforcementType 
} from "@/hooks/usePolicyRules";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShieldAlert, Plus, Trash2, Clock, Lock, UserCheck, 
  CheckCircle, AlertTriangle, XCircle, FileText
} from "lucide-react";
import { format } from "date-fns";

const RESOURCES = [
  'employees', 'shifts', 'attendance', 'audits', 'locations',
  'equipment', 'documents', 'notifications', 'reports', 'tests',
  'integrations', 'company_settings', 'billing', 'users'
];

const ACTIONS = ['view', 'create', 'update', 'delete', 'manage', 'approve'];

const CONDITION_TYPES: { value: ConditionType; label: string; icon: typeof Clock; description: string }[] = [
  { value: 'time_lock', label: 'Time Lock', icon: Clock, description: 'Block action outside specific hours or after a deadline' },
  { value: 'state_lock', label: 'State Lock', icon: Lock, description: 'Block action when resource is in a specific state (e.g. locked, published)' },
  { value: 'role_required', label: 'Role Required', icon: UserCheck, description: 'Require a specific role template to perform this action' },
  { value: 'approval_required', label: 'Approval Required', icon: CheckCircle, description: 'Require approval from a higher role before action completes' },
  { value: 'custom', label: 'Custom', icon: FileText, description: 'Custom condition with JSON configuration' },
];

const ENFORCEMENT_TYPES: { value: EnforcementType; label: string; color: string }[] = [
  { value: 'block', label: 'Block', color: 'text-red-600' },
  { value: 'warn', label: 'Warn', color: 'text-yellow-600' },
  { value: 'log', label: 'Log Only', color: 'text-blue-600' },
];

const formatName = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const PolicyRules = () => {
  const { data: rules = [], isLoading } = usePolicyRules();
  const { data: evaluations = [] } = usePolicyEvaluations();
  const toggleRule = useTogglePolicyRule();
  const deleteRule = useDeletePolicyRule();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" />
            Policy Rules
          </h1>
          <p className="text-muted-foreground mt-1">
            Define who can edit what and when
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Rule</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <CreatePolicyRuleForm onClose={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Active Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="log">Evaluation Log ({evaluations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4">
          {isLoading ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Loading...</CardContent></Card>
          ) : rules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No policy rules defined yet</p>
                <p className="text-sm mt-1">Create rules to control who can do what and when</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => {
                const condType = CONDITION_TYPES.find(c => c.value === rule.condition_type);
                const CondIcon = condType?.icon || FileText;

                return (
                  <Card key={rule.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-muted">
                            <CondIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{rule.name}</h3>
                              <Badge variant={rule.enforcement === 'block' ? 'destructive' : rule.enforcement === 'warn' ? 'default' : 'secondary'}>
                                {rule.enforcement}
                              </Badge>
                            </div>
                            {rule.description && (
                              <p className="text-sm text-muted-foreground mt-0.5">{rule.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">{formatName(rule.resource)}</Badge>
                              <Badge variant="outline" className="text-xs">{formatName(rule.action)}</Badge>
                              <Badge variant="outline" className="text-xs">{condType?.label || rule.condition_type}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.is_active}
                            onCheckedChange={(checked) => toggleRule.mutate({ ruleId: rule.id, isActive: checked })}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteRule.mutate(rule.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="log" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Evaluations</CardTitle>
              <CardDescription>Last 50 policy rule evaluations</CardDescription>
            </CardHeader>
            <CardContent>
              {evaluations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No evaluations yet</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-1">
                    {evaluations.map((ev) => {
                      const ResultIcon = ev.result === 'allowed' ? CheckCircle : ev.result === 'blocked' ? XCircle : AlertTriangle;
                      const resultColor = ev.result === 'allowed' ? 'text-green-600' : ev.result === 'blocked' ? 'text-red-600' : 'text-yellow-600';

                      return (
                        <div key={ev.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                          <ResultIcon className={`h-4 w-4 ${resultColor}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium capitalize">{ev.action}</span> on <span className="font-medium">{formatName(ev.resource)}</span>
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs capitalize">{ev.result}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(ev.evaluated_at), 'MMM d, HH:mm')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const CreatePolicyRuleForm = ({ onClose }: { onClose: () => void }) => {
  const createRule = useCreatePolicyRule();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [resource, setResource] = useState("shifts");
  const [action, setAction] = useState("update");
  const [conditionType, setConditionType] = useState<ConditionType>("time_lock");
  const [enforcement, setEnforcement] = useState<EnforcementType>("block");
  const [configJson, setConfigJson] = useState("{}");

  const handleSubmit = () => {
    if (!name.trim()) return;
    let config: Record<string, any> = {};
    try { config = JSON.parse(configJson); } catch { /* empty */ }

    createRule.mutate({
      name,
      description: description || undefined,
      resource,
      action,
      condition_type: conditionType,
      condition_config: config,
      enforcement,
    }, { onSuccess: onClose });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Policy Rule</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <Input placeholder="Rule name" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block">Resource</label>
            <Select value={resource} onValueChange={setResource}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RESOURCES.map(r => <SelectItem key={r} value={r}>{formatName(r)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Action</label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIONS.map(a => <SelectItem key={a} value={a}>{formatName(a)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Condition Type</label>
          <Select value={conditionType} onValueChange={(v) => setConditionType(v as ConditionType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONDITION_TYPES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {CONDITION_TYPES.find(c => c.value === conditionType)?.description}
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Enforcement</label>
          <Select value={enforcement} onValueChange={(v) => setEnforcement(v as EnforcementType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ENFORCEMENT_TYPES.map(e => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Condition Config (JSON)</label>
          <Textarea 
            value={configJson} 
            onChange={(e) => setConfigJson(e.target.value)} 
            rows={3}
            className="font-mono text-xs"
            placeholder='{"after_hours": "18:00", "before_hours": "06:00"}'
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={!name.trim() || createRule.isPending}>Create Rule</Button>
      </DialogFooter>
    </>
  );
};

export default PolicyRules;
