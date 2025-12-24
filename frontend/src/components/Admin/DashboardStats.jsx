import React from 'react';
import CountUp from 'react-countup';
import './DashboardStats.css';

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
        const d = new Date(p.createdAt); // Or use closedAt/payment date if available, but createdAt is decent proxy for booking
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }));

    // Render Helper
    const renderCurrencyValues = (revenueObj) => {
        const entries = Object.entries(revenueObj);
        if (entries.length === 0) return <CountUp end={0} duration={2} prefix="₹" />;

        return entries.map(([curr, amount], index) => {
            const symbol = curr === 'INR' ? '₹' : (curr === 'USD' ? '$' : (curr === 'EUR' ? '€' : curr + ' '));
            return (
                <span key={curr} style={{ whiteSpace: 'nowrap' }}>
                    <CountUp
                        end={amount}
                        duration={2.5}
                        prefix={symbol}
                        separator=","
                        decimals={2}
                    />
                    {index < entries.length - 1 && <span style={{ margin: '0 8px', color: '#ccc' }}>|</span>}
                </span>
            );
        });
    };

    return (
        <div className="stats-grid">
            {/* Active Projects */}
            <div className="stat-card blue">
                <div className="stat-icon">🔥</div>
                <div className="stat-info">
                    <h3>Active Projects</h3>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                        <span className="stat-value"><CountUp end={activeProjects} duration={2} /></span>
                        {urgentProjects > 0 && <span className="stat-subtext bad" style={{ color: '#ff6b6b', fontWeight: 'bold' }}>{urgentProjects} Urgent</span>}
                    </div>
                </div>
            </div>

            {/* Completed Projects */}
            <div className="stat-card green">
                <div className="stat-icon">✅</div>
                <div className="stat-info">
                    <h3>Completed</h3>
                    <span className="stat-value"><CountUp end={completedProjects} duration={2} /></span>
                </div>
            </div>

            {/* Team Stats */}
            <div className="stat-card purple">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                    <h3>Team</h3>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <span className="stat-subtext"><strong><CountUp end={clients.length} duration={2} /></strong> Clients</span>
                        <span className="stat-subtext"><strong><CountUp end={editors.length} duration={2} /></strong> Editors</span>
                    </div>
                </div>
            </div>

            {/* Total Revenue */}
            <div className="stat-card gold">
                <div className="stat-icon">💰</div>
                <div className="stat-info">
                    <h3>Total Revenue</h3>
                    <div className="stat-value revenue-text" style={{ fontSize: '1.2rem', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {renderCurrencyValues(totalRevenue)}
                    </div>
                </div>
            </div>

            {/* Monthly Revenue - New Card */}
            <div className="stat-card teal">
                <div className="stat-icon">📅</div>
                <div className="stat-info">
                    <h3>This Month</h3>
                    <div className="stat-value revenue-text" style={{ fontSize: '1.2rem', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {renderCurrencyValues(revenueThisMonth)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardStats;
