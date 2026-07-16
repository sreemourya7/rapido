import React from 'react';
import StatsCard from './StatsCard';
import EventLog from './EventLog';

const Dashboard = ({ drivers, stats, events, onClearEvents }) => {
    return (
        <aside
            aria-label="System dashboard"
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                height: '100%',
                overflowY: 'auto',
            }}
        >
            <h2 style={{
                fontSize: '13px',
                fontWeight: '700',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
            }}>
                System Dashboard
            </h2>

            {/* Stats grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
            }}
                role="region"
                aria-label="System statistics"
            >
                <StatsCard
                    label="Active Drivers"
                    value={drivers.length}
                    color="teal"
                    icon="👤"
                    description="Within 10km radius"
                />
                <StatsCard
                    label="Total Rides"
                    value={stats.totalRides}
                    color="blue"
                    icon="🚗"
                    description="This session"
                />
                <StatsCard
                    label="Matched"
                    value={stats.matched}
                    color="teal"
                    icon="✅"
                    description="Successfully assigned"
                />
                <StatsCard
                    label="No Drivers"
                    value={stats.noDrivers}
                    color="red"
                    icon="❌"
                    description="All drivers rejected"
                />
            </div>

            {/* Driver list */}
            <section
                aria-label="Nearby drivers list"
                style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '16px',
                }}
            >
                <h3 style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '12px',
                }}>
                    Nearby Drivers
                </h3>

                {drivers.length === 0 ? (
                    <p style={{
                        fontSize: '13px',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        padding: '16px 0',
                    }}>
                        No drivers online — start the simulator
                    </p>
                ) : (
                    <ul
                        style={{
                            listStyle: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            maxHeight: '160px',
                            overflowY: 'auto',
                        }}
                        aria-label={`${drivers.length} nearby drivers`}
                    >
                        {drivers.map((driver, index) => (
                            <li
                                key={driver.driver_id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '8px 10px',
                                    background: 'var(--bg-surface)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '13px',
                                }}
                                aria-label={`${driver.driver_id}, ${driver.distance_km} kilometers away`}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: 'var(--accent-teal)',
                                        display: 'inline-block',
                                        flexShrink: 0,
                                    }} aria-hidden="true" />
                                    <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                                        {driver.driver_id}
                                    </span>
                                    {index === 0 && (
                                        <span style={{
                                            fontSize: '9px',
                                            background: 'rgba(0, 212, 170, 0.15)',
                                            color: 'var(--accent-teal)',
                                            padding: '2px 6px',
                                            borderRadius: '20px',
                                            fontWeight: '700',
                                            border: '1px solid rgba(0, 212, 170, 0.3)',
                                        }}>
                                            NEAREST
                                        </span>
                                    )}
                                </div>
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                    {driver.distance_km} km
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Event log */}
            <EventLog events={events} onClear={onClearEvents} />
        </aside>
    );
};

export default Dashboard;