import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from '@/utils/formatDate';

const ProjectInfoCard = ({ project }) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div className="grid gap-1">
                    <span className="font-semibold text-muted-foreground">Client</span>
                    <div>{project.client?.name}</div>
                    <div className="text-xs text-muted-foreground">{project.client?.email}</div>
                </div>
                <Separator />
                <div className="grid gap-1">
                    <span className="font-semibold text-muted-foreground">Description</span>
                    <p className="whitespace-pre-wrap">{project.description}</p>
                </div>
                <Separator />
                <div className="flex justify-between">
                    <span className="font-semibold text-muted-foreground">Amount</span>
                    <span>{project.currency} {project.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-semibold text-muted-foreground">Deadline</span>
                    <span>{formatDateTime(project.deadline)}</span>
                </div>
                {project.rawFootageLinks?.length > 0 && (
                    <div className="grid gap-2 pt-2">
                        <span className="font-semibold text-muted-foreground">Raw Footage</span>
                        <ul className="list-disc list-inside space-y-1">
                            {project.rawFootageLinks.map((link, i) => (
                                <li key={i}>
                                    <a href={link.url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate inline-block max-w-[200px] align-bottom">
                                        {link.title || link.url}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default ProjectInfoCard;
