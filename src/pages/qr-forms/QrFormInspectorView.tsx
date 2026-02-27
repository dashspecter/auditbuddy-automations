import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, MapPin, FileText } from "lucide-react";

export default function QrFormInspectorView() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ["qr-form-public-view", token],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("qr-form-public-view", {
        body: { token },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as {
        templateName: string;
        templateType: string;
        templateCategory: string;
        locationName: string;
        schema: any;
        version: number;
        overrides: any;
        submissions: any[];
      };
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold">Form Not Found</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {(error as any)?.message || "This link may be invalid or the form is inactive."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const latestSubmission = data.submissions?.[0];
  const schema = data.schema;
  const subData = latestSubmission?.data as any;

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8">
      {/* Inspector Banner */}
      <div className="max-w-4xl mx-auto mb-4">
        <div className="bg-accent border border-border rounded-lg px-4 py-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium text-foreground">Inspector View — Read Only</span>
        </div>
      </div>

      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {data.templateName}
              </CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {data.locationName}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline">v{data.version}</Badge>
              <Badge variant="outline" className="capitalize">
                {data.templateType === "monthly_grid" ? "Grid" : "Log"}
              </Badge>
              {latestSubmission && (
                <Badge variant={latestSubmission.status === "locked" ? "destructive" : "secondary"} className="capitalize">
                  {latestSubmission.status}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!latestSubmission || !subData ? (
            <p className="text-muted-foreground text-center py-8">No submissions for the current period.</p>
          ) : data.templateType === "monthly_grid" && schema?.gridConfig ? (
            <GridView schema={schema} data={subData} />
          ) : schema?.columns ? (
            <LogView schema={schema} data={subData} />
          ) : (
            <pre className="text-xs overflow-auto bg-muted p-4 rounded">{JSON.stringify(subData, null, 2)}</pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GridView({ schema, data }: { schema: any; data: any }) {
  const checkpoints = schema.gridConfig.checkpoints || [];
  const cellFields = schema.gridConfig.cellFields || [];

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Day</TableHead>
            {checkpoints.map((cp: any) =>
              cellFields.map((f: any) => (
                <TableHead key={`${cp.time}-${f.key}`} className="text-center text-xs">
                  {cp.label}<br />
                  <span className="text-muted-foreground">{f.label}</span>
                </TableHead>
              ))
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
            <TableRow key={day}>
              <TableCell className="font-medium">{day}</TableCell>
              {checkpoints.map((cp: any) =>
                cellFields.map((f: any) => (
                  <TableCell key={`${day}-${cp.time}-${f.key}`} className="text-center text-sm">
                    {data?.grid?.[day]?.[cp.time]?.[f.key] ?? "-"}
                  </TableCell>
                ))
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function LogView({ schema, data }: { schema: any; data: any }) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">#</TableHead>
            {schema.columns.map((col: any) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {(data.rows || []).map((row: any, idx: number) => (
            <TableRow key={idx}>
              <TableCell>{idx + 1}</TableCell>
              {schema.columns.map((col: any) => (
                <TableCell key={col.key}>{row[col.key] ?? "-"}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
