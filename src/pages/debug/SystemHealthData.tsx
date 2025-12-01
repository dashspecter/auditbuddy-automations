import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Database, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TableData {
  tableName: string;
  count: number;
  records: any[];
  error?: string;
}

const SystemHealthData = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState<TableData[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const tables = [
    { name: "locations", columns: "id, name, city, status, company_id" },
    { name: "audit_templates", columns: "id, name, template_type, is_active, company_id, is_global" },
    { name: "location_audits", columns: "id, location, audit_date, overall_score, status, company_id" },
    { name: "audits", columns: "id, status, total_score, company_id, location_id" },
    { name: "equipment", columns: "id, name, status, company_id, location_id" },
    { name: "employees", columns: "id, full_name, role, status, company_id" },
    { name: "notifications", columns: "id, title, type, status" },
    { name: "alerts", columns: "id, title, severity, resolved, company_id" },
    { name: "insight_summaries", columns: "id, summary_type, period_start, period_end, company_id" },
    { name: "companies", columns: "id, name, status, subscription_tier" },
    { name: "company_users", columns: "id, user_id, company_id, company_role" },
  ];

  const fetchTableData = async () => {
    setLoading(true);
    const results: TableData[] = [];

    for (const table of tables) {
      try {
        // Get count - using any to avoid type issues with dynamic table names
        const { count, error: countError } = await supabase
          .from(table.name as any)
          .select("*", { count: "exact", head: true });

        if (countError) {
          results.push({
            tableName: table.name,
            count: 0,
            records: [],
            error: countError.message,
          });
          continue;
        }

        // Get first 5 records
        const { data, error } = await supabase
          .from(table.name as any)
          .select(table.columns)
          .limit(5);

        results.push({
          tableName: table.name,
          count: count || 0,
          records: data || [],
          error: error?.message,
        });
      } catch (err: any) {
        results.push({
          tableName: table.name,
          count: 0,
          records: [],
          error: err.message,
        });
      }
    }

    setTableData(results);
    setLoading(false);
  };

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user) return;

      // Check if user is admin
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      setIsAdmin(!!data);
    };

    checkAdminAccess();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchTableData();
    }
  }, [isAdmin]);

  const handleRefresh = () => {
    toast.info("Refreshing data...");
    fetchTableData();
  };

  if (!user) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Please log in to view system health</p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              This page is only accessible to platform administrators.
            </p>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="h-8 w-8" />
              System Health & Data
            </h1>
            <p className="text-muted-foreground mt-1">
              Database tables overview and data inspection
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {tableData.map((table) => (
              <Card key={table.tableName}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {table.tableName}
                        {table.error ? (
                          <XCircle className="h-5 w-5 text-destructive" />
                        ) : (
                          <CheckCircle2 className="h-5 w-5 text-success" />
                        )}
                      </CardTitle>
                      <CardDescription>
                        {table.error ? (
                          <span className="text-destructive">{table.error}</span>
                        ) : (
                          `${table.count} record${table.count !== 1 ? "s" : ""}`
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant={table.count > 0 ? "default" : "secondary"}>
                      {table.count} rows
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {table.records.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {Object.keys(table.records[0]).map((key) => (
                              <TableHead key={key}>{key}</TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {table.records.map((record, idx) => (
                            <TableRow key={idx}>
                              {Object.entries(record).map(([key, value]) => (
                                <TableCell key={key} className="font-mono text-xs max-w-[200px] truncate">
                                  {value === null ? (
                                    <span className="text-muted-foreground italic">null</span>
                                  ) : typeof value === "boolean" ? (
                                    <Badge variant={value ? "default" : "secondary"}>
                                      {value.toString()}
                                    </Badge>
                                  ) : (
                                    String(value)
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Database className="h-12 w-12 mx-auto mb-2 opacity-20" />
                      <p>No records found in this table</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SystemHealthData;
