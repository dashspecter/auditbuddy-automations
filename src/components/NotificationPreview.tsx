import { Info, Check, AlertTriangle, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface NotificationPreviewProps {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'announcement';
  targetRoles?: string[];
  targetEmployees?: Array<{ id: string; name: string }>;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <Check className="h-4 w-4 text-success" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case 'announcement':
      return <Megaphone className="h-4 w-4 text-primary" />;
    default:
      return <Info className="h-4 w-4 text-info" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-success/10 border-success/20';
    case 'warning':
      return 'bg-warning/10 border-warning/20';
    case 'announcement':
      return 'bg-primary/10 border-primary/20';
    default:
      return 'bg-info/10 border-info/20';
  }
};

export const NotificationPreview = ({ title, message, type, targetRoles = [], targetEmployees = [] }: NotificationPreviewProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2">Preview as Notification Bell Dropdown</h4>
        <Card className="border-2">
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "rounded-full p-2 border",
                  getNotificationColor(type)
                )}
              >
                {getNotificationIcon(type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold leading-tight">
                    {title || "Notification Title"}
                  </p>
                  <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                </div>
                {message ? (
                  <div 
                    className="text-xs text-muted-foreground leading-relaxed prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: message }}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Your notification message will appear here...
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Just now
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Target Audience</h4>
        <div className="flex flex-wrap gap-2">
          {targetEmployees.length > 0 ? (
            targetEmployees.map((employee) => (
              <Badge key={employee.id} variant="secondary">
                {employee.name}
              </Badge>
            ))
          ) : targetRoles.length > 0 ? (
            targetRoles.map((role) => (
              <Badge key={role} variant="secondary">
                {role.charAt(0).toUpperCase() + role.slice(1)}s
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No recipients selected</p>
          )}
        </div>
      </div>

      <style>{`
        .prose h1, .prose h2, .prose h3 {
          margin-top: 0.5em;
          margin-bottom: 0.25em;
          font-weight: 600;
        }
        .prose h1 { font-size: 1em; }
        .prose h2 { font-size: 0.95em; }
        .prose h3 { font-size: 0.9em; }
        .prose ul, .prose ol {
          margin-top: 0.25em;
          margin-bottom: 0.25em;
          padding-left: 1.5em;
        }
        .prose p {
          margin-top: 0.25em;
          margin-bottom: 0.25em;
        }
        .prose a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        .prose strong {
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};