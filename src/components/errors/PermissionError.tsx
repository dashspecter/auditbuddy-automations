import { Lock, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface PermissionErrorProps {
  title?: string;
  message?: string;
  action?: string;
  showHomeButton?: boolean;
  showContactAdmin?: boolean;
}

export const PermissionError = ({
  title = "Access Restricted",
  message = "You don't have permission to view this page.",
  action = "Contact your administrator if you believe this is a mistake.",
  showHomeButton = true,
  showContactAdmin = false,
}: PermissionErrorProps) => {
  const navigate = useNavigate();
  
  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="text-base">{message}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{action}</p>
          <div className="flex gap-3 justify-center">
            {showHomeButton && (
              <Button variant="outline" onClick={() => navigate("/")}>
                Go Home
              </Button>
            )}
            {showContactAdmin && (
              <Button variant="default" onClick={() => navigate("/settings")}>
                Contact Admin
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
