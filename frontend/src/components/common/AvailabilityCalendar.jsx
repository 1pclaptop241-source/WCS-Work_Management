import React, { useState, useEffect } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { availabilityAPI } from '@/services/api';
import { Loader2 } from "lucide-react";

const AvailabilityCalendar = ({ userId }) => {
    const [date, setDate] = useState(new Date());
    const [availability, setAvailability] = useState([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    // Fetch availability for the current month
    const fetchAvailability = async (currentDate) => {
        setLoading(true);
        try {
            // Get first and last day of month
            const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            const response = await availabilityAPI.get(start.toISOString(), end.toISOString(), userId);
            setAvailability(response.data);
        } catch (error) {
            console.error("Failed to fetch availability", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAvailability(date);
    }, [date, userId]);

    // Handle date selection to toggle availability
    const handleSelect = async (selectedDate) => {
        if (!selectedDate) return;

        // Find status for this date
        const existingEntry = availability.find(a =>
            new Date(a.date).toDateString() === selectedDate.toDateString()
        );

        const newStatus = existingEntry?.status === 'available' ? 'unavailable' : 'available';

        try {
            await availabilityAPI.set({
                date: selectedDate,
                status: newStatus,
                hours: newStatus === 'available' ? 8 : 0
            });

            // Refresh
            fetchAvailability(date);

            toast({
                title: "Updated",
                description: `Marked as ${newStatus}`,
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to update availability",
            });
        }
    };

    // Custom modifiers for the calendar
    const availableDays = availability
        .filter(a => a.status === 'available')
        .map(a => new Date(a.date));

    const unavailableDays = availability
        .filter(a => a.status === 'unavailable')
        .map(a => new Date(a.date));

    return (
        <Card className="w-full max-w-md">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    Availability
                    {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
                <div className="flex gap-4 mb-4 text-sm">
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-green-100 border border-green-500"></div>
                        <span>Available</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <div className="w-3 h-3 rounded-full bg-red-100 border border-red-500"></div>
                        <span>Unavailable</span>
                    </div>
                </div>

                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    onDayClick={handleSelect}
                    className="rounded-md border"
                    modifiers={{
                        available: availableDays,
                        unavailable: unavailableDays
                    }}
                    modifiersClassNames={{
                        available: "bg-green-900/30 text-green-400 font-bold hover:bg-green-900/50",
                        unavailable: "bg-red-900/30 text-red-400 line-through hover:bg-red-900/50"
                    }}
                />

                <p className="text-xs text-muted-foreground mt-4 text-center">
                    Click a date to toggle availability.
                </p>
            </CardContent>
        </Card>
    );
};

export default AvailabilityCalendar;
