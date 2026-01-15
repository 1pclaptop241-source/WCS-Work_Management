import React from 'react';
import CountUp from 'react-countup';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, CheckCircle, Users, CircleDollarSign, CalendarDays } from 'lucide-react';

const DashboardStats = ({ projects, clients, editors }) => {
    // 1. Project Counts
    const activeProjects = projects.filter(p => !p.closed).length;
    const completedProjects = projects.filter(p => p.closed).length;

    // 2. Urgent Deadlines (Active projects due within 3 days)
    const urgentProjects = projects.filter(p => {
        if (p.closed) return false;
        const deadline = new Date(p.deadline);
        const now = new Date();
        const diffDays = (deadline - now) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 3;
    }).length;

    // 3. Revenue Calculation Helper
    const calculateRevenue = (projList) => {
        return projList.reduce((acc, curr) => {
            const currency = curr.currency || 'INR';
            const amount = Number(curr.clientAmount) || 0;
            acc[currency] = (acc[currency] || 0) + amount;
            return acc;
        }, {});
    };

    const totalRevenue = calculateRevenue(projects);

    // Revenue This Month
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const revenueThisMonth = calculateRevenue(projects.filter(p => {
        const d = new Date(p.createdAt);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }));

    // Render Helper
    const renderCurrencyValues = (revenueObj) => {
        const entries = Object.entries(revenueObj);
        if (entries.length === 0) return <CountUp end={0} duration={2} prefix="₹" />;

        return entries.map(([curr, amount], index) => {
            const symbol = curr === 'INR' ? '₹' : (curr === 'USD' ? '$' : (curr === 'EUR' ? '€' : curr + ' '));
            return (
                <span key={curr} className="whitespace-nowrap font-bold text-2xl">
                    <CountUp
                        end={amount}
                        duration={2.5}
                        prefix={symbol}
                        separator=","
                        decimals={2}
                    />
                    {index < entries.length - 1 && <span className="mx-2 text-muted-foreground">|</span>}
                </span>
            );
        });
    };

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Active Projects */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                    <Flame className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        <CountUp end={activeProjects} duration={2} />
                    </div>
                    {urgentProjects > 0 && (
                        <p className="text-xs font-medium text-destructive mt-1">
                            {urgentProjects} Urgent Deadlines
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Completed Projects */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Completed</CardTitle>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        <CountUp end={completedProjects} duration={2} />
                    </div>
                </CardContent>
            </Card>

            {/* Team Stats */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Team Total</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between text-sm mt-2">
                        <div className="flex flex-col">
                            <span className="font-bold text-2xl"><CountUp end={clients.length} duration={2} /></span>
                            <span className="text-muted-foreground text-xs">Clients</span>
                        </div>
                        <div className="flex flex-col text-right">
                            <span className="font-bold text-2xl"><CountUp end={editors.length} duration={2} /></span>
                            <span className="text-muted-foreground text-xs">Editors</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Monthly Revenue */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">This Month</CardTitle>
                    <CalendarDays className="h-4 w-4 text-teal-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold truncate">
                        {renderCurrencyValues(revenueThisMonth)}
                    </div>
                </CardContent>
            </Card>

            {/* Total Revenue - Spanning full width on mobile or specific layout if needed. For now standard card. */}
            <Card className="col-span-full lg:col-span-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-200 dark:border-yellow-900">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-500">Total Revenue</CardTitle>
                    <CircleDollarSign className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">
                        {renderCurrencyValues(totalRevenue)}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default DashboardStats;
