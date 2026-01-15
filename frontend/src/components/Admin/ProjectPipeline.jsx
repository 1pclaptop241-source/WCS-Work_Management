import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge'; // Assuming this is compatible or needs refactor? It probably returns a badge.
import { Clock, User, CheckCircle, AlertTriangle, IndianRupee, DollarSign, Euro } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const ProjectPipeline = ({ projects }) => {
    const navigate = useNavigate();

    const columns = [
        { title: 'New', status: 'pending', color: 'bg-slate-500', barColor: 'border-slate-500' },
        { title: 'In Production', status: 'in_progress', color: 'bg-blue-500', barColor: 'border-blue-500' },
        { title: 'Internal Review', status: 'submitted', color: 'bg-amber-500', barColor: 'border-amber-500' },
        { title: 'Client Review', status: 'under_review', color: 'bg-purple-500', barColor: 'border-purple-500' },
        { title: 'Completed', status: 'completed', color: 'bg-emerald-500', barColor: 'border-emerald-500' }
    ];

    const getProjectColumn = (project) => {
        if (!project.accepted) return 'pending';
        if (project.closed || project.status === 'completed') return 'completed';
        if (project.status === 'under_review') return 'under_review';
        if (project.status === 'submitted') return 'submitted';
        return 'in_progress';
    };

    const groupedProjects = columns.reduce((acc, col) => {
        acc[col.status] = projects.filter(p => getProjectColumn(p) === col.status);
        return acc;
    }, {});

    const getDeadlineInfo = (deadline) => {
        const now = new Date();
        const dDate = new Date(deadline);
        const diff = dDate - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return { label: 'Overdue', color: 'text-destructive', icon: <AlertTriangle className="h-3 w-3" /> };
        if (days <= 2) return { label: 'Urgent', color: 'text-amber-500', icon: <Clock className="h-3 w-3" /> };
        return { label: `${days}d left`, color: 'text-muted-foreground', icon: <Clock className="h-3 w-3" /> };
    };

    const getCurrencyIcon = (currency) => {
        if (currency === 'USD') return <DollarSign className="h-3 w-3" />;
        if (currency === 'EUR') return <Euro className="h-3 w-3" />;
        return <IndianRupee className="h-3 w-3" />;
    };

    return (
        <div className="flex h-full gap-4 overflow-x-auto pb-4">
            {columns.map(col => (
                <div key={col.status} className="flex h-full w-72 min-w-[18rem] flex-col rounded-lg bg-muted/50 border">
                    <div className={`flex items-center justify-between p-4 border-t-4 bg-card rounded-t-lg ${col.barColor}`}>
                        <h3 className="font-semibold text-sm">{col.title}</h3>
                        <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-xs">
                            {groupedProjects[col.status]?.length || 0}
                        </Badge>
                    </div>

                    <ScrollArea className="flex-1 px-2 py-2">
                        <div className="flex flex-col gap-2 pb-2">
                            {groupedProjects[col.status]?.map(project => {
                                const deadlineInfo = getDeadlineInfo(project.deadline);
                                return (
                                    <Card
                                        key={project._id}
                                        className="cursor-pointer hover:shadow-md transition-shadow"
                                        onClick={() => navigate(`/admin/project/${project._id}`)}
                                    >
                                        <CardContent className="p-3 space-y-2">
                                            <div className="flex justify-between items-start gap-2">
                                                <h4 className="font-medium text-sm line-clamp-2 leading-tight" title={project.title}>
                                                    {project.title}
                                                </h4>

                                            </div>

                                            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    <span className="truncate max-w-[100px]">{project.client?.name || 'No Client'}</span>
                                                </div>
                                                <div className={`flex items-center gap-1 ${deadlineInfo.color}`}>
                                                    {deadlineInfo.icon}
                                                    <span>{deadlineInfo.label}</span>
                                                </div>
                                            </div>
                                        </CardContent>

                                        <CardFooter className="p-3 pt-0 flex justify-between items-center text-xs font-semibold text-muted-foreground">
                                            <div className="flex items-center text-primary">
                                                {getCurrencyIcon(project.currency)}
                                                <span>{project.clientAmount?.toLocaleString() || project.amount?.toLocaleString()}</span>
                                            </div>
                                            {project.assignedEditor && (
                                                <Avatar className="h-6 w-6">
                                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                                        {project.assignedEditor.name.charAt(0).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                        </CardFooter>
                                    </Card>
                                );
                            })}
                            {(!groupedProjects[col.status] || groupedProjects[col.status].length === 0) && (
                                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground opacity-50">
                                    <span className="text-xs">No projects</span>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            ))}
        </div>
    );
};

export default ProjectPipeline;
