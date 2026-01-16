import React, { useState, useEffect } from 'react';
import { FaCheck, FaSpinner, FaCircle } from 'react-icons/fa';
import { workBreakdownAPI } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";

const ProjectRoadmap = ({ projectId, currentWorkType, projectTitle }) => {
    const [stages, setStages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (projectId) {
            loadRoadmap();
        }
    }, [projectId]);

    const loadRoadmap = async () => {
        try {
            setLoading(true);
            const response = await workBreakdownAPI.getByProject(projectId);
            setStages(response.data || []);
        } catch (err) {
            console.error("Failed to load project roadmap:", err);
            setError("Could not load roadmap");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4 text-center text-muted-foreground flex items-center justify-center gap-2"><FaSpinner className="animate-spin" /> Loading Roadmap...</div>;
    if (error || !stages || stages.length === 0) return null;

    const getStepStatus = (stage) => {
        if (stage.approved) return 'done';
        const isCurrentContext = currentWorkType &&
            currentWorkType.toLowerCase().replace(/[^a-z]/g, '') === stage.workType.toLowerCase().replace(/[^a-z]/g, '');
        if (isCurrentContext) return 'active';
        if (stage.status === 'in_progress' || stage.status === 'under_review') return 'active';
        return 'pending';
    };

    let lastDoneIndex = -1;
    stages.forEach((stage, index) => {
        if (getStepStatus(stage) === 'done') lastDoneIndex = index;
    });

    let activeIndex = lastDoneIndex;
    const firstActiveIndex = stages.findIndex((s, i) => i > lastDoneIndex && getStepStatus(s) === 'active');
    if (firstActiveIndex !== -1) activeIndex = firstActiveIndex;

    const progressPercentage = stages.length <= 1 ? 0 : (activeIndex / (stages.length - 1)) * 100;

    return (
        <Card className="mb-6">
            <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                    🚀 Roadmap: {projectTitle || 'Project'}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative flex justify-between px-4">
                    {/* Progress Track */}
                    <div className="absolute top-[15px] left-[20px] right-[20px] h-0.5 bg-secondary z-0"></div>

                    {/* Progress Fill */}
                    <div
                        className="absolute top-[15px] left-[20px] h-0.5 bg-green-500 z-0 transition-all duration-500"
                        style={{ width: `calc(${progressPercentage}% - 40px)` }}
                    ></div>
                    {/* Note: The width calc is approximate, typically dynamic widths need careful logic or just relying on flex. 
                        Let's simplify: Use a container for the line that matches the flex distribution. 
                        Actually, flex distribution for stepped progress is hard to absolute position simply.
                        Alternative: Tailwind steps.
                    */}

                    {stages.map((stage, index) => {
                        const status = getStepStatus(stage);
                        const isDone = status === 'done';
                        const isActive = status === 'active';

                        return (
                            <div key={stage._id || index} className="relative z-10 flex flex-col items-center flex-1">
                                <div className={cn(
                                    "w-8 h-8 rounded-full border-2 flex items-center justify-center bg-background transition-all",
                                    isDone ? "border-green-500 bg-green-500 text-white" :
                                        isActive ? "border-blue-500 text-blue-500 ring-4 ring-blue-100" : "border-muted-foreground/30 text-muted-foreground/30"
                                )}>
                                    {isDone ? <FaCheck className="h-3 w-3" /> :
                                        isActive ? <FaSpinner className="h-3 w-3 animate-spin" /> :
                                            <FaCircle className="h-2 w-2" />}
                                </div>
                                <div className={cn(
                                    "mt-2 text-xs font-medium text-center max-w-[80px]",
                                    isDone ? "text-green-600" : isActive ? "text-blue-600 font-bold" : "text-muted-foreground"
                                )}>
                                    {stage.workType}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default ProjectRoadmap;
