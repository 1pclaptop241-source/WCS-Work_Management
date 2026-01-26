import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ error, errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // You can render any custom fallback UI
            return (
                <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
                    <div className="max-w-md w-full space-y-4">
                        <Alert variant="destructive" className="border-2 shadow-lg">
                            <AlertCircle className="h-5 w-5" />
                            <AlertTitle className="text-lg font-bold ml-2">Something went wrong</AlertTitle>
                            <AlertDescription className="mt-2">
                                <p className="mb-2">The application encountered an unexpected error.</p>
                                {process.env.NODE_ENV === 'development' && this.state.error && (
                                    <div className="bg-destructive/10 p-2 rounded text-xs font-mono break-all border border-destructive/20 max-h-[200px] overflow-auto">
                                        {this.state.error.toString()}
                                    </div>
                                )}
                            </AlertDescription>
                        </Alert>

                        <div className="flex justify-center">
                            <Button onClick={this.handleReload} className="gap-2">
                                <RefreshCw className="h-4 w-4" />
                                Reload Application
                            </Button>
                        </div>

                        <div className="text-center">
                            <p className="text-xs text-muted-foreground">
                                If this persists, please contact support or try clearing your browser cache.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
