import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { projectsAPI, resetAPI } from '../../services/api';
import { formatDateTime } from '../../utils/formatDate';
import AssignedWorks from './AssignedWorks';
import PaymentInfo from './PaymentInfo'; // Importing PaymentInfo to likely usage in Tabs
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileDown, Trash2 } from 'lucide-react';
import ErrorBoundary from '../common/ErrorBoundary';

const EditorDashboard = () => {
  const { user } = useAuth();
  const { showAlert } = useDialog();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletionReports, setDeletionReports] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadDeletionReports();
  }, []);

  // Removed loadData for projects as it is unused. 
  // AssignedWorks fetches its own data.
  // We can keep a minimal loading state for DeletionReports or just let them load.

  const loadDeletionReports = useCallback(async () => {
    try {
      const response = await resetAPI.getReports();
      setDeletionReports(response.data);
    } catch (err) {
      console.error('Failed to load deletion reports:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownloadReport = async (reportId) => {
    try {
      const response = await resetAPI.downloadReport(reportId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `deletion-report-${reportId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      await showAlert('Failed to download report', 'Error');
    }
  };

  if (loading) {
    // Basic loading state, could be improved with Skeleton
    return <div className="p-8 flex justify-center text-muted-foreground">Loading dashboard...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name || 'Editor'}!</p>
        </div>
        <Button onClick={() => { setRefreshKey(prev => prev + 1); loadDeletionReports(); }} variant="outline" size="sm" className="gap-2">
          Refresh Data
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Deletion Reports Section - Admin Only */}
      {user?.role === 'admin' && deletionReports.length > 0 && (
        <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <CardTitle className="text-yellow-800 dark:text-yellow-300">Data Deletion Notifications</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setDeletionReports([])}>
              <span className="sr-only">Dismiss</span>
              <span className="text-xl">×</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {deletionReports.map((report) => (
              <div key={report._id} className="flex flex-col md:flex-row justify-between items-start md:items-center p-3 bg-white/50 dark:bg-black/20 rounded-lg gap-4">
                <div>
                  <p className="font-medium">Data Deletion Report</p>
                  <p className="text-sm text-muted-foreground">Deleted on: {formatDateTime(report.deletedAt)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Projects: {report.deletedProjects.length} | Payments: {report.deletedPayments.length}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleDownloadReport(report.reportId)} className="gap-2">
                  <FileDown className="h-4 w-4" /> Download PDF
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="works" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="works">Assigned Works</TabsTrigger>
          <TabsTrigger value="payments">Payments & Earnings</TabsTrigger>
        </TabsList>

        <TabsContent value="works" className="space-y-4 mt-6">
          <ErrorBoundary fallbackMessage="Failed to load assigned works.">
            <AssignedWorks key={refreshKey} />
          </ErrorBoundary>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4 mt-6">
          <ErrorBoundary fallbackMessage="Failed to load payment information.">
            <PaymentInfo />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EditorDashboard;

