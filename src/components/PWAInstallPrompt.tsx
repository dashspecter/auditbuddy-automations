import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, X, Smartphone } from "lucide-react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useToast } from "@/hooks/use-toast";

export const PWAInstallPrompt = () => {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user has already dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }

    // Show prompt after a short delay if installable and not dismissed
    if (isInstallable && !dismissed && !isInstalled) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      toast({
        title: "App Installing",
        description: "Dashspect is being installed on your device.",
      });
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setIsDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if already installed, dismissed, or not installable
  if (isInstalled || isDismissed || !isInstallable || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 animate-in slide-in-from-bottom-5">
      <Card className="p-4 shadow-lg border-primary/20 bg-card">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-accent transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Install Dashspect</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Install our app for quick access and offline support. Works like a native app!
            </p>
            
            <div className="flex gap-2">
              <Button onClick={handleInstall} size="sm" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Install
              </Button>
              <Button onClick={handleDismiss} variant="outline" size="sm">
                Not Now
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
