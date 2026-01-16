import React from 'react';
import { useAuth } from "@/context/AuthContext";
import AvailabilityCalendar from "@/components/common/AvailabilityCalendar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const SchedulePage = () => {
    const { user } = useAuth();

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold mb-6">Schedule & Availability</h1>

            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>My Availability</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">
                                Manage your availability for the team. Click dates to toggle status.
                            </p>
                            <AvailabilityCalendar userId={user?._id} />
                        </CardContent>
                    </Card>
                </div>

                <div>
                    {/* Future: Team Calendar View */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Team Schedule</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-lg">
                                Team calendar view coming soon.
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default SchedulePage;
