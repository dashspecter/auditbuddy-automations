import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lock, Plus, Trash2, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBadgeConfigurations, type BadgeConfigRow } from "@/hooks/useBadgeConfigurations";
import { ICON_MAP, RULE_TYPES } from "@/lib/performanceBadges";
import { AddCustomBadgeDialog } from "./AddCustomBadgeDialog";
import { Skeleton } from "@/components/ui/skeleton";

export function BadgeManagement() {
  const { configs, isLoading, companyId, updateBadge, createBadge, deleteBadge } = useBadgeConfigurations();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" /> Badge Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  const ruleLabel = (type: string) =>
    RULE_TYPES.find(r => r.value === type)?.label || type;

  const handleToggle = (badge: BadgeConfigRow) => {
    updateBadge.mutate({ id: badge.id, is_active: !badge.is_active });
  };

  const handleThresholdSave = (badge: BadgeConfigRow, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      updateBadge.mutate({ id: badge.id, threshold: num });
    }
    setEditingThreshold(null);
  };

  const handleStreakMonthsSave = (badge: BadgeConfigRow, value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 2) {
      updateBadge.mutate({ id: badge.id, streak_months: num });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Badge Settings
            </div>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Badge
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {configs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No badge configurations found.
            </p>
          )}
          {configs.map(badge => {
            const IconComp = ICON_MAP[badge.icon] || ICON_MAP.Award;
            const isEditing = editingThreshold === badge.id;

            return (
              <div
                key={badge.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                  !badge.is_active && "opacity-50"
                )}
              >
                <IconComp className={cn("h-5 w-5 shrink-0", badge.color)} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate">{badge.name}</span>
                    {badge.is_system && (
                      <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{badge.description}</p>
                </div>

                {/* Rule + threshold */}
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                    {ruleLabel(badge.rule_type)}
                  </Badge>
                  {badge.rule_type !== "manual" && (
                    isEditing ? (
                      <Input
                        type="number"
                        defaultValue={badge.threshold}
                        className="w-20 h-8 text-xs"
                        autoFocus
                        onBlur={(e) => handleThresholdSave(badge, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleThresholdSave(badge, (e.target as HTMLInputElement).value);
                          if (e.key === "Escape") setEditingThreshold(null);
                        }}
                      />
                    ) : (
                      <button
                        className="text-xs font-mono bg-muted px-2 py-1 rounded hover:bg-muted/80 cursor-pointer"
                        onClick={() => setEditingThreshold(badge.id)}
                        title="Click to edit threshold"
                      >
                        {badge.threshold}
                      </button>
                    )
                  )}
                  {badge.rule_type === "streak_min" && (
                    <Input
                      type="number"
                      min={2}
                      defaultValue={badge.streak_months ?? 3}
                      className="w-16 h-8 text-xs"
                      onBlur={(e) => handleStreakMonthsSave(badge, e.target.value)}
                      placeholder="months"
                    />
                  )}
                </div>

                {/* Toggle */}
                <Switch
                  checked={badge.is_active}
                  onCheckedChange={() => handleToggle(badge)}
                />

                {/* Delete (custom only) */}
                {!badge.is_system && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => deleteBadge.mutate(badge.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {companyId && (
        <AddCustomBadgeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          companyId={companyId}
          onSave={(badge) => {
            createBadge.mutate(badge);
            setDialogOpen(false);
          }}
          existingKeys={configs.map(c => c.badge_key)}
          nextSortOrder={configs.length}
        />
      )}
    </>
  );
}
