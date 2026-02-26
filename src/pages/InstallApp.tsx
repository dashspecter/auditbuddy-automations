import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Monitor, Apple, Chrome } from "lucide-react";
import { getDeferredPrompt, triggerInstallPrompt } from "@/lib/pwa";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (navigator as any).standalone === true
  );
}

export default function InstallApp() {
  const platform = detectPlatform();
  const [canInstall, setCanInstall] = useState(!!getDeferredPrompt());
  const [alreadyInstalled, setAlreadyInstalled] = useState(isStandalone());

  useEffect(() => {
    const onInstallable = () => setCanInstall(true);
    const onInstalled = () => {
      setCanInstall(false);
      setAlreadyInstalled(true);
    };
    window.addEventListener("pwa:installable", onInstallable);
    window.addEventListener("pwa:installed", onInstalled);
    return () => {
      window.removeEventListener("pwa:installable", onInstallable);
      window.removeEventListener("pwa:installed", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const accepted = await triggerInstallPrompt();
    if (accepted) setAlreadyInstalled(true);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Install Dashspect</h1>
          <p className="text-muted-foreground mt-1">
            Get the full app experience — faster loading, offline access, and push notifications.
          </p>
        </div>

        {alreadyInstalled && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Download className="h-5 w-5 text-primary" />
                <p className="font-medium text-foreground">
                  Dashspect is already installed on this device!
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Native install button (Chrome/Android) */}
        {canInstall && !alreadyInstalled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Chrome className="h-5 w-5" />
                Quick Install
              </CardTitle>
              <CardDescription>Install with one tap</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handleInstall} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                Install Dashspect
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Platform-specific instructions */}
        {platform === "ios" && !alreadyInstalled && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Apple className="h-5 w-5" />
                Install on iPhone / iPad
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Tap the <strong>Share</strong> button (square with arrow) in Safari</li>
                <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong> in the top right corner</li>
              </ol>
              <p className="text-xs text-muted-foreground">
                Note: This must be done in Safari. Other browsers on iOS don't support PWA install.
              </p>
            </CardContent>
          </Card>
        )}

        {platform === "android" && !alreadyInstalled && !canInstall && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Install on Android
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Tap the <strong>three-dot menu</strong> (⋮) in Chrome</li>
                <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></li>
                <li>Confirm by tapping <strong>"Install"</strong></li>
              </ol>
            </CardContent>
          </Card>
        )}

        {platform === "desktop" && !alreadyInstalled && !canInstall && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Install on Desktop
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Look for the <strong>install icon</strong> (⊕) in the address bar</li>
                <li>Or open Chrome menu → <strong>"Install Dashspect..."</strong></li>
                <li>Click <strong>"Install"</strong> to add to your desktop</li>
              </ol>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Why install?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>⚡ Faster loading — cached assets load instantly</li>
              <li>📱 Full-screen experience — no browser UI clutter</li>
              <li>🔔 Push notifications — stay on top of tasks and alerts</li>
              <li>📶 Offline access — view recent data without connection</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
