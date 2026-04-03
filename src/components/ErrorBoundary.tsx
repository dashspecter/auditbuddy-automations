import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  showErrorUI: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  private delayTimer: ReturnType<typeof setTimeout> | null = null;

  public state: State = {
    hasError: false,
    showErrorUI: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);

    // Delay showing the error UI — transient chunk/DOM errors often resolve on reload
    this.delayTimer = setTimeout(() => {
      if (this.state.hasError) {
        this.setState({ showErrorUI: true });
      }
    }, 2000);
  }

  public componentWillUnmount() {
    if (this.delayTimer) clearTimeout(this.delayTimer);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, showErrorUI: false });
    window.location.href = '/dashboard';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (!this.state.showErrorUI) {
        // Show nothing for 2s while we wait to see if the error is transient
        return null;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-md w-full">
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="ml-2">Something went wrong</AlertTitle>
              <AlertDescription className="mt-2 ml-7">
                {this.state.error?.message || 'An unexpected error occurred'}
              </AlertDescription>
            </Alert>

            <div className="bg-card p-6 rounded-lg border shadow-sm">
              <h2 className="text-lg font-semibold mb-2">What happened?</h2>
              <p className="text-sm text-muted-foreground mb-4">
                The application encountered an error and couldn't continue. This has been logged and we'll look into it.
              </p>

              <div className="space-y-2">
                <Button onClick={this.handleReset} className="w-full" variant="default">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
                <Button onClick={this.handleReload} className="w-full" variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reload Page
                </Button>
              </div>

              {import.meta.env.DEV && this.state.error && (
                <details className="mt-4 text-xs">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Technical Details
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-40">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
