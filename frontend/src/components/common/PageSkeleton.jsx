import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";

const PageSkeleton = () => {
    return (
        <div className="flex h-screen w-full bg-background overflow-hidden">
            {/* Sidebar Skeleton */}
            <div className="hidden md:flex w-64 flex-col gap-4 border-r p-4">
                <div className="flex items-center gap-2 mb-6">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                </div>
                <div className="space-y-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                    ))}
                </div>
                <div className="mt-auto">
                    <Skeleton className="h-12 w-full" />
                </div>
            </div>

            {/* Main Content Skeleton */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header Skeleton */}
                <div className="h-16 border-b flex items-center justify-between px-6">
                    <Skeleton className="h-6 w-48" />
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                </div>

                {/* Body Skeleton */}
                <div className="flex-1 p-6 space-y-6 overflow-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Skeleton className="h-32 rounded-xl" />
                        <Skeleton className="h-32 rounded-xl" />
                        <Skeleton className="h-32 rounded-xl" />
                    </div>

                    <Skeleton className="h-[400px] w-full rounded-xl" />
                </div>
            </div>
        </div>
    );
};

export default PageSkeleton;
