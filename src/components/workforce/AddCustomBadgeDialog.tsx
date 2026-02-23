import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ICON_MAP, AVAILABLE_ICONS, AVAILABLE_COLORS, RULE_TYPES } from "@/lib/performanceBadges";
import type { BadgeConfigRow } from "@/hooks/useBadgeConfigurations";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onSave: (badge: Omit<BadgeConfigRow, "id" | "created_at">) => void;
  existingKeys: string[];
  nextSortOrder: number;
}

export function AddCustomBadgeDialog({ open, onOpenChange, companyId, onSave, existingKeys, nextSortOrder }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("Star");
  const [color, setColor] = useState(AVAILABLE_COLORS[0]);
  const [ruleType, setRuleType] = useState("effective_score_min");
  const [threshold, setThreshold] = useState("90");
  const [streakMonths, setStreakMonths] = useState("3");

  const reset = () => {
    setName("");
    setDescription("");
    setIcon("Star");
    setColor(AVAILABLE_COLORS[0]);
    setRuleType("effective_score_min");
    setThreshold("90");
    setStreakMonths("3");
  };

  const handleSave = () => {
    const key = "custom_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (existingKeys.includes(key)) return;

    onSave({
      company_id: companyId,
      badge_key: key,
      name: name.trim(),
      description: description.trim(),
      icon,
      color,
      rule_type: ruleType,
      threshold: parseFloat(threshold) || 0,
      streak_months: ruleType === "streak_min" ? parseInt(streakMonths) || 3 : null,
      is_active: true,
      is_system: false,
      sort_order: nextSortOrder,
    });
    reset();
  };

  const isValid = name.trim().length > 0 && threshold.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Badge</DialogTitle>
          <DialogDescription>Create a new badge with custom criteria</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Team Player" />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Short description shown to employees" />
          </div>

          {/* Icon picker */}
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <div className="grid grid-cols-10 gap-1.5">
              {AVAILABLE_ICONS.map(iconName => {
                const Ic = ICON_MAP[iconName];
                return (
                  <button
                    key={iconName}
                    type="button"
                    className={cn(
                      "h-8 w-8 flex items-center justify-center rounded-md border transition-colors",
                      icon === iconName ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted"
                    )}
                    onClick={() => setIcon(iconName)}
                    title={iconName}
                  >
                    <Ic className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_COLORS.map(c => {
                const IconComp = ICON_MAP[icon];
                return (
                  <button
                    key={c}
                    type="button"
                    className={cn(
                      "h-8 w-8 flex items-center justify-center rounded-full border-2 transition-colors",
                      color === c ? "border-primary" : "border-transparent"
                    )}
                    onClick={() => setColor(c)}
                  >
                    <IconComp className={cn("h-4 w-4", c)} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rule type */}
          <div className="space-y-1.5">
            <Label>Rule Type</Label>
            <Select value={ruleType} onValueChange={setRuleType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RULE_TYPES.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Threshold */}
          {ruleType !== "manual" && (
            <div className="space-y-1.5">
              <Label>Threshold</Label>
              <Input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} />
            </div>
          )}

          {/* Streak months */}
          {ruleType === "streak_min" && (
            <div className="space-y-1.5">
              <Label>Consecutive Months</Label>
              <Input type="number" min={2} value={streakMonths} onChange={e => setStreakMonths(e.target.value)} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!isValid} onClick={handleSave}>Create Badge</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
