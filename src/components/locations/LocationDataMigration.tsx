import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [stats, setStats] = useState<MigrationStats | null>(null);

  const runMigration = async () => {
    setIsRunning(true);
    setCompleted(false);
    setStats(null);

    try {
      toast.info(t('locations.migration.starting'));

      const { data, error } = await supabase.functions.invoke(
        "migrate-location-data",
        {
          body: {},
        }
      );

      if (error) {
        console.error("Migration error:", error);
        throw new Error(error.message || t('locations.migration.failed'));
      }

      

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
      toast.error(`${t('locations.migration.failed')}: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-lg">{t('locations.migration.title')}</CardTitle>
        </div>
        <CardDescription>
          {t('locations.migration.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm space-y-2">
          <p className="font-medium">{t('locations.migration.willDo')}</p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
            <li>{t('locations.migration.findLocations')}</li>
            <li>{t('locations.migration.createEntries')}</li>
            <li>{t('locations.migration.updateAudits')}</li>
            <li>{t('locations.migration.updateTemplates')}</li>
          </ul>
        </div>

        {completed && stats && (
          <div className="space-y-2 p-4 bg-background rounded-lg border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <p className="font-semibold">{t('locations.migration.complete')}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t('locations.migration.locationsFound')}:</span>
                <Badge variant="outline" className="ml-2">
                  {stats.uniqueLocations}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">{t('locations.migration.locationsCreated')}:</span>
                <Badge variant="default" className="ml-2">
                  {stats.locationsCreated}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">{t('locations.migration.auditsUpdated')}:</span>
                <Badge variant="secondary" className="ml-2">
                  {stats.auditsUpdated}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">{t('locations.migration.templatesUpdated')}:</span>
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
                    {t('locations.migration.errors', { count: stats.errors.length })}
                  </span>
                </div>
                <ul className="text-xs space-y-1 text-destructive/80">
                  {stats.errors.slice(0, 5).map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                  {stats.errors.length > 5 && (
                    <li className="italic">
                      ...{t('locations.migration.andMore', { count: stats.errors.length - 5 })}
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
                {t('locations.migration.running')}
              </>
            ) : completed ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t('locations.migration.complete')}
              </>
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                {t('locations.migration.runMigration')}
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('locations.migration.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {t('locations.migration.confirmDesc1')}
              </p>
              <p className="font-medium text-foreground">
                {t('locations.migration.confirmDesc2')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('locations.migration.confirmNote')}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={runMigration}>
              {t('locations.migration.runMigration')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
