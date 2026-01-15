import React, { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';
import { ChartLine, User } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EditorPerformanceView = () => {
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const res = await usersAPI.getEditorStats();
            setStats(res.data);
        } catch (err) {
            setError('Failed to load editor statistics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading editor stats...</div>;
    if (error) return <div className="p-4 text-destructive bg-destructive/10 rounded-md">{error}</div>;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                <CardTitle className="text-xl font-bold">Editor Performance Overview</CardTitle>
                <Button variant="outline" size="sm" onClick={loadStats}>Refresh Data</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Editor</TableHead>
                            <TableHead>Active Tasks</TableHead>
                            <TableHead>Completed</TableHead>
                            <TableHead>On-Time Rate</TableHead>
                            <TableHead>Avg. Revisions</TableHead>
                            <TableHead>Workload</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stats.map(editor => {
                            const completedTotal = editor.completedTasks || 0;
                            const totalFinished = completedTotal + (editor.lateSubmissions || 0);
                            const onTimeRate = totalFinished > 0
                                ? Math.round((completedTotal / totalFinished) * 100)
                                : 100;

                            const workloadColor = editor.activeTasks > 5 ? 'bg-red-500' : editor.activeTasks > 3 ? 'bg-amber-500' : 'bg-emerald-500';

                            return (
                                <TableRow key={editor._id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarFallback>{editor.name.charAt(0).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{editor.name}</span>
                                                <span className="text-xs text-muted-foreground">{editor.email}</span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-mono text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-300">
                                            {editor.activeTasks}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-mono text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-300">
                                            {editor.completedTasks}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-16 bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${onTimeRate > 80 ? 'bg-green-500' : onTimeRate > 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                    style={{ width: `${onTimeRate}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-medium">{onTimeRate}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <ChartLine className="h-3 w-3" />
                                            <span>{editor.avgVersions}x / task</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span className={`h-2.5 w-2.5 rounded-full ${workloadColor}`} />
                                            <span>{editor.activeTasks > 5 ? 'High' : editor.activeTasks > 3 ? 'Medium' : 'Low'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {editor.activeTasks === 0 ? (
                                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900 dark:text-emerald-300">Available</Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-300">Busy</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default EditorPerformanceView;
