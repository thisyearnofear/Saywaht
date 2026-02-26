import React, { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "@/lib/icons";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PreviewErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Preview panel error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-black">
          <div className="max-w-md space-y-4 rounded-lg border border-red-500/20 bg-red-500/5 p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Video Preview Error
              </h3>
              <p className="mt-1 text-xs text-white/60">
                {this.state.error?.message || "Something went wrong rendering the preview"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
              className="w-full"
            >
              <RotateCcw className="mr-2 h-3 w-3" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
