import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Database, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface MigrationStats {
  uniqueLocations: number;
  locationsCreated: number;
  auditsUpdated: number;
  templatesUpdated: number;
  errors: string[];
}

export const LocationDataMigration = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState<MigrationStats | null>(null);

  const runMigration = async () => {
    setIsRunning(true);
    setCompleted(false);
    setStats(null);

    try {
      toast.info("Starting migration...");

      const { data, error } = await supabase.functions.invoke(
        "migrate-location-data",
        {
          body: {},
        }
      );

      if (error) {
        console.error("Migration error:", error);
        throw new Error(error.message || "Migration failed");
      }

      console.log("Migration result:", data);

      if (data.success) {
        setStats(data.stats);
        setCompleted(true);
        toast.success(data.message);
      } else {
        setStats(data.stats);
        toast.error(data.message);
      }
    } catch (error: any) {
      console.error("Error running migration:", error);
      toast.error(`Migration failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-lg">Data Migration Tool</CardTitle>
        </div>
        <CardDescription>
          Migrate existing location text data to use the new locations table
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm space-y-2">
          <p className="font-medium">This migration will:</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li>Find all unique location names in your audit records</li>
            <li>Create location entries for any that don't exist</li>
            <li>Update all audits to reference the correct location IDs</li>
            <li>Update templates to use location references</li>
          </ul>
        </div>

        {completed && stats && (
          <div className="space-y-2 p-4 bg-background rounded-lg border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="font-semibold">Migration Complete!</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Locations found:</span>
                <Badge variant="outline" className="ml-2">
                  {stats.uniqueLocations}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Locations created:</span>
                <Badge variant="default" className="ml-2">
                  {stats.locationsCreated}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Audits updated:</span>
                <Badge variant="secondary" className="ml-2">
                  {stats.auditsUpdated}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Templates updated:</span>
                <Badge variant="secondary" className="ml-2">
                  {stats.templatesUpdated}
                </Badge>
              </div>
            </div>
            {stats.errors.length > 0 && (
              <div className="mt-2 p-2 bg-destructive/10 rounded border border-destructive/20">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">
                    Errors ({stats.errors.length})
                  </span>
                </div>
                <ul className="text-xs space-y-1 text-destructive/80">
                  {stats.errors.slice(0, 5).map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                  {stats.errors.length > 5 && (
                    <li className="italic">
                      ...and {stats.errors.length - 5} more
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="default"
              className="w-full"
              disabled={isRunning || completed}
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Migration...
                </>
              ) : completed ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Migration Complete
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Run Migration
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Run Location Data Migration?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  This will automatically migrate all existing audit records to
                  use the new locations table.
                </p>
                <p className="font-medium text-foreground">
                  This is a safe operation and can be run multiple times without
                  causing issues.
                </p>
                <p className="text-sm text-muted-foreground">
                  Note: Existing data will not be deleted, only location IDs will
                  be added.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={runMigration}>
                Run Migration
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
