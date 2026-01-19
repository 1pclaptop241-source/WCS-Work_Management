import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ProjectProgress = ({ progress, className }) => {
    return (
        <Card className={className}>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Overall Progress</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center gap-4">
                    <div className="flex-1 h-3 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-600 transition-all duration-500 ease-out"
                            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        />
                    </div>
                    <div className="font-bold text-lg min-w-[3rem] text-right">{Math.round(progress)}%</div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ProjectProgress;
