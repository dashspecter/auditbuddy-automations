import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface SectionFollowUpDisplayProps {
  followUpNeeded: boolean;
  followUpNotes?: string | null;
  sectionName: string;
}

export default function SectionFollowUpDisplay({
  followUpNeeded,
  followUpNotes,
  sectionName,
}: SectionFollowUpDisplayProps) {
  if (!followUpNeeded) {
    return (
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-900 dark:text-green-100">
              No follow-up actions required
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-orange-500">
      <CardContent className="pt-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-orange-900 dark:text-orange-100">
                Follow-up Actions Required
              </span>
              <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700">
                Action Needed
              </Badge>
            </div>
            {followUpNotes && (
              <p className="text-sm text-orange-800 dark:text-orange-200 whitespace-pre-wrap">
                {followUpNotes}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
