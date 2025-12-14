import { AlertCircle, Lock, CreditCard, WifiOff, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { UserFriendlyError } from "@/lib/errorMessages";
import { cn } from "@/lib/utils";

interface ErrorDisplayProps {
  error: UserFriendlyError;
  onRetry?: () => void;
  onAction?: () => void;
  actionLabel?: string;
  className?: string;
}

const iconMap = {
  permission: Lock,
  validation: AlertCircle,
  payment: CreditCard,
  network: WifiOff,
  system: AlertTriangle,
};

const variantMap = {
  permission: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800",
  validation: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
  payment: "bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800",
  network: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
  system: "bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800",
};

const iconColorMap = {
  permission: "text-amber-600 dark:text-amber-400",
  validation: "text-red-600 dark:text-red-400",
  payment: "text-purple-600 dark:text-purple-400",
  network: "text-blue-600 dark:text-blue-400",
  system: "text-gray-600 dark:text-gray-400",
};

export const ErrorDisplay = ({
  error,
  onRetry,
  onAction,
  actionLabel,
  className,
}: ErrorDisplayProps) => {
  const Icon = iconMap[error.type];
  
  return (
    <Alert className={cn(variantMap[error.type], "border", className)}>
      <Icon className={cn("h-5 w-5", iconColorMap[error.type])} />
      <AlertTitle className="text-foreground font-semibold">{error.title}</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-muted-foreground">{error.message}</p>
        {error.action && (
          <p className="text-sm text-muted-foreground/80">{error.action}</p>
        )}
        {(onRetry || onAction) && (
          <div className="flex gap-2 pt-1">
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                Try Again
              </Button>
            )}
            {onAction && (
              <Button variant="default" size="sm" onClick={onAction}>
                {actionLabel || "Take Action"}
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};
