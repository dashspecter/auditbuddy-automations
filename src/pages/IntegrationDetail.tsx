import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useParams, useNavigate } from "react-router-dom";
import { useIntegrations, useUpdateIntegration } from "@/hooks/useIntegrations";
import { useIntegrationSettings, useSaveIntegrationSetting, useDeleteIntegrationSetting } from "@/hooks/useIntegrationSettings";
import { useWebhookLogs, useLogWebhook } from "@/hooks/useWebhookLogs";
import { useApiCallLogs, useLogApiCall } from "@/hooks/useApiCallLogs";
import { ArrowLeft, Plus, Trash2, Send, Webhook } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Textarea } from "@/components/ui/textarea";

const IntegrationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: integrations } = useIntegrations();
  const { data: settings } = useIntegrationSettings(id);
  const { data: webhookLogs } = useWebhookLogs(id);
  const { data: apiLogs } = useApiCallLogs(id);
  const updateIntegration = useUpdateIntegration();
  const saveSetting = useSaveIntegrationSetting();
  const deleteSetting = useDeleteIntegrationSetting();
  const logWebhook = useLogWebhook();
  const logApiCall = useLogApiCall();

  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [isSecret, setIsSecret] = useState(false);
  const [webhookPayload, setWebhookPayload] = useState("{\n  \"event\": \"test\",\n  \"data\": {}\n}");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [apiMethod, setApiMethod] = useState("GET");
  const [apiPayload, setApiPayload] = useState("{}");

  const integration = integrations?.find(i => i.id === id);

  if (!integration) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Integration not found</p>
        </div>
      </AppLayout>
    );
  }

  const handleAddSetting = () => {
    if (!newKey || !newValue) return;
    saveSetting.mutate({
      integrationId: id!,
      key: newKey,
      value: newValue,
      isSecret,
    });
    setNewKey("");
    setNewValue("");
    setIsSecret(false);
  };

  const handleTestWebhook = () => {
    try {
      const payload = JSON.parse(webhookPayload);
      logWebhook.mutate({
        integrationId: id,
        webhookType: "test",
        payload,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      alert("Invalid JSON payload");
    }
  };

  const handleTestApiCall = () => {
    const startTime = Date.now();
    try {
      const payload = apiPayload ? JSON.parse(apiPayload) : null;
      // Simulate API call
      setTimeout(() => {
        logApiCall.mutate({
          integrationId: id,
          endpoint: apiEndpoint,
          method: apiMethod,
          requestPayload: payload,
          responsePayload: { status: "success", message: "Simulated response" },
          statusCode: 200,
          durationMs: Date.now() - startTime,
          success: true,
        });
      }, 500);
    } catch (e) {
      alert("Invalid JSON payload");
    }
  };

  const toggleStatus = () => {
    updateIntegration.mutate({
      id: id!,
      status: integration.status === "active" ? "inactive" : "active",
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/integrations")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{integration.name}</h1>
              <p className="text-muted-foreground mt-1">{integration.integration_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={integration.status === "active" ? "default" : "secondary"}>
              {integration.status}
            </Badge>
            <Button onClick={toggleStatus}>
              {integration.status === "active" ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="api">API Playground</TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Integration Settings</CardTitle>
                <CardDescription>Configure API keys, tokens, and URLs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settings?.map((setting) => (
                  <div key={setting.id} className="flex items-center justify-between border-b pb-4">
                    <div>
                      <div className="font-medium">{setting.key}</div>
                      <div className="text-sm text-muted-foreground">
                        {setting.is_secret ? "••••••••" : setting.value}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSetting.mutate({ id: setting.id, integrationId: id! })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                <div className="space-y-4 pt-4 border-t">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Setting Key</Label>
                      <Input
                        placeholder="api_key"
                        value={newKey}
                        onChange={(e) => setNewKey(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Setting Value</Label>
                      <Input
                        placeholder="your-api-key"
                        type={isSecret ? "password" : "text"}
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch checked={isSecret} onCheckedChange={setIsSecret} />
                      <Label>Mark as secret</Label>
                    </div>
                    <Button onClick={handleAddSetting}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Setting
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Playground</CardTitle>
                <CardDescription>Test inbound webhooks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Webhook Payload (JSON)</Label>
                  <Textarea
                    rows={6}
                    value={webhookPayload}
                    onChange={(e) => setWebhookPayload(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <Button onClick={handleTestWebhook} className="gap-2">
                  <Webhook className="h-4 w-4" />
                  Simulate Webhook
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Webhooks</CardTitle>
                <CardDescription>Last 50 webhook calls</CardDescription>
              </CardHeader>
              <CardContent>
                {!webhookLogs || webhookLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No webhook logs yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {webhookLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{log.webhook_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.created_at))} ago
                          </span>
                        </div>
                        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Playground</CardTitle>
                <CardDescription>Test outbound API calls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <select
                      className="w-full border rounded-md p-2"
                      value={apiMethod}
                      onChange={(e) => setApiMethod(e.target.value)}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Endpoint</Label>
                    <Input
                      placeholder="/api/v1/resource"
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Request Payload (JSON)</Label>
                  <Textarea
                    rows={6}
                    value={apiPayload}
                    onChange={(e) => setApiPayload(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <Button onClick={handleTestApiCall} className="gap-2">
                  <Send className="h-4 w-4" />
                  Send Request
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent API Calls</CardTitle>
                <CardDescription>Last 50 API calls</CardDescription>
              </CardHeader>
              <CardContent>
                {!apiLogs || apiLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No API call logs yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {apiLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{log.method}</Badge>
                            <span className="font-mono text-xs">{log.endpoint}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={log.success ? "default" : "destructive"}>
                              {log.status_code}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {log.duration_ms}ms
                            </span>
                          </div>
                        </div>
                        {log.response_payload && (
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                            {JSON.stringify(log.response_payload, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default IntegrationDetail;
