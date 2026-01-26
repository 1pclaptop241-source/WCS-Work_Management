import React from 'react';
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
          <Alert variant="destructive" className="max-w-md text-left">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              {this.props.fallbackMessage || "An unexpected error occurred while rendering this component."}
            </AlertDescription>
          </Alert>
          
          <div className="text-sm text-muted-foreground max-w-md overflow-auto max-h-[200px] text-left bg-muted p-2 rounded text-xs font-mono">
            {this.state.error && this.state.error.toString()}
          </div>

          <Button onClick={this.handleReset} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
