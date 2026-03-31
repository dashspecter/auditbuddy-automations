import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class RouteErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Route error boundary caught:', error, errorInfo);
    
    // Auto-recover from chunk load failures (stale deployments)
    if (this.isChunkLoadError(error)) {
      const hasReloaded = sessionStorage.getItem("chunk-reload");
      if (!hasReloaded) {
        sessionStorage.setItem("chunk-reload", "1");
        window.location.reload();
        return;
      }
      sessionStorage.removeItem("chunk-reload");
    }
  }

  private isChunkLoadError(error: Error): boolean {
    const msg = error.message || "";
    return (
      msg.includes("Failed to fetch dynamically imported module") ||
      msg.includes("Loading chunk") ||
      msg.includes("Loading CSS chunk") ||
      msg.includes("Importing a module script failed")
    );
  }

  private handleGoBack = () => {
    this.setState({ hasError: false, error: undefined });
    window.history.back();
  };

  private handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md">
            This page encountered an error. You can go back or reload the page.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={this.handleGoBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Button onClick={this.handleReload}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reload
            </Button>
          </div>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-6 p-3 bg-muted rounded text-xs text-left overflow-auto max-w-lg max-h-32">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
