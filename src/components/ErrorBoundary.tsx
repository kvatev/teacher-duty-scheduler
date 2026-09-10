import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught application error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetSession = () => {
    try {
      localStorage.removeItem("teacher_duty_admin_session");
      localStorage.removeItem("teacher_duty_admin_logged_in");
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border rounded-2xl p-6 sm:p-8 shadow-xl text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-foreground">Възникна непредвидена грешка</h2>
              <p className="text-sm text-muted-foreground">
                Приложението срещна проблем при зареждане. Можете да презаредите страницата или да нулирате сесията.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-muted/60 p-3 rounded-lg text-left text-xs font-mono text-muted-foreground overflow-x-auto max-h-32 border">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="default"
                onClick={this.handleReload}
                className="flex-1 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Презареди страницата
              </Button>
              <Button
                variant="outline"
                onClick={this.handleResetSession}
                className="flex-1 gap-2 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4" />
                Изход от профил
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
