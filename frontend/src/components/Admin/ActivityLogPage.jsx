import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatDateTime } from '../../utils/formatDate';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from 'lucide-react';

const ActivityLogPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchLogs(page);
    }, [page]);

    const fetchLogs = async (pageNum) => {
        try {
            setLoading(true);
            const response = await api.get(`/activity-logs?page=${pageNum}&limit=20`);
            setLogs(response.data.logs);
            setTotalPages(response.data.pages);
        } catch (err) {
            setError('Failed to load activity logs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getActionBadge = (action) => {
        let variant = 'secondary';
        if (action.includes('CREATE')) variant = 'success'; // You might need to define 'success' variant in badge.jsx or use default colors
        if (action.includes('DELETE')) variant = 'destructive';
        if (action.includes('LOGIN')) variant = 'default';
        if (action.includes('PAYMENT')) variant = 'warning'; // Custom warning variant

        // Mapping standard variants for simplicity if custom ones aren't available yet
        if (action.includes('CREATE') || action.includes('ACCEPT') || action.includes('APPROVE')) return <Badge className="bg-green-600 hover:bg-green-700">{action.replace('_', ' ')}</Badge>;
        if (action.includes('DELETE')) return <Badge variant="destructive">{action.replace('_', ' ')}</Badge>;
        if (action.includes('LOGIN')) return <Badge variant="default">{action.replace('_', ' ')}</Badge>;
        if (action.includes('PAYMENT')) return <Badge className="bg-yellow-500 hover:bg-yellow-600">{action.replace('_', ' ')}</Badge>;

        return <Badge variant="secondary">{action.replace('_', ' ')}</Badge>;
    };

    return (
        <div className="container mx-auto p-4 md:p-8 pt-6 space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">System Activity Logs</h1>

            {error && <div className="p-4 text-destructive bg-destructive/10 rounded-md">{error}</div>}

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead className="hidden md:table-cell">IP Address</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">Loading...</TableCell></TableRow>
                            ) : logs.length === 0 ? (
                                <TableRow><TableCell colSpan={5} className="text-center h-24">No activity recorded yet.</TableCell></TableRow>
                            ) : (
                                logs.map(log => (
                                    <TableRow key={log._id}>
                                        <TableCell>
                                            <div className="font-medium">{log.user?.name || 'Unknown'}</div>
                                            <div className="text-xs text-muted-foreground">{log.user?.role}</div>
                                        </TableCell>
                                        <TableCell>
                                            {getActionBadge(log.action)}
                                        </TableCell>
                                        <TableCell className="max-w-md truncate" title={log.description}>{log.description}</TableCell>
                                        <TableCell className="whitespace-nowrap">{formatDateTime(log.createdAt)}</TableCell>
                                        <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                                            {log.ipAddress}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            <div className="flex items-center justify-end space-x-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                </Button>
                <div className="text-sm font-medium">
                    Page {page} of {totalPages}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                >
                    Next
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default ActivityLogPage;
