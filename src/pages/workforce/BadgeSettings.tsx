import { BadgeManagement } from "@/components/workforce/BadgeManagement";
import { Settings2 } from "lucide-react";

const BadgeSettings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings2 className="h-7 w-7" />
          Badge Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage performance badge thresholds, toggle badges on or off, and create custom rewards.
        </p>
      </div>
      <BadgeManagement />
    </div>
  );
};

export default BadgeSettings;
