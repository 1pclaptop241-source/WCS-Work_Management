import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from '@/utils/formatDate';

const WorkBreakdownStatusTable = ({ workBreakdown, workSubmissions }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Work Breakdown Status</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Editor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Deadline</TableHead>
                            <TableHead className="text-right">Aprvl</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {workBreakdown.map((work) => {
                            const submissions = workSubmissions[work._id] || [];
                            const hasSubmission = submissions.length > 0;
                            const adminApproved = work.approvals?.admin || false;
                            const clientApproved = work.approvals?.client || false;
                            const bothApproved = adminApproved && clientApproved;

                            let statusBadge;
                            if (bothApproved) statusBadge = <Badge className="bg-green-600 hover:bg-green-700">Completed</Badge>;
                            else if (adminApproved) statusBadge = <Badge className="bg-yellow-500 hover:bg-yellow-600">Client Review</Badge>;
                            else if (hasSubmission) statusBadge = <Badge className="bg-yellow-500 hover:bg-yellow-600">Under Review</Badge>;
                            else if (work.status === 'declined') statusBadge = <Badge variant="destructive">Declined</Badge>;
                            else statusBadge = <Badge variant="secondary">Pending</Badge>;

                            return (
                                <TableRow key={work._id}>
                                    <TableCell className="font-medium">{work.workType}</TableCell>
                                    <TableCell>{work.assignedEditor?.name || 'Unassigned'}</TableCell>
                                    <TableCell>{statusBadge}</TableCell>
                                    <TableCell className="text-xs whitespace-nowrap">{formatDateTime(work.deadline)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <span title="Admin" className={adminApproved ? "text-green-500" : "text-muted-foreground"}>A</span>
                                            <span title="Client" className={clientApproved ? "text-green-500" : "text-muted-foreground"}>C</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {workBreakdown.length === 0 && (
                            <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No work breakdown defined.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export default WorkBreakdownStatusTable;
