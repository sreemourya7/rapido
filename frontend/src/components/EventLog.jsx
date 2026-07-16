import React from 'react';

const EVENT_COLORS = {
    'ride.requested': 'var(--accent-blue)',
    'ride.offered': 'var(--accent-amber)',
    'ride.offered_to_driver': 'var(--accent-amber)',
    'ride.matched': 'var(--accent-teal)',
    'ride.no_drivers': 'var(--accent-red)',
    'auth': 'var(--text-muted)',
    'error': 'var(--accent-red)',
};

const EVENT_ICONS = {
    'ride.requested': '🚗',
    'ride.offered': '📣',
    'ride.offered_to_driver': '📣',
    'ride.matched': '✅',
    'ride.no_drivers': '❌',
    'auth': '🔐',
    'error': '⚠️',
};

const formatTime = (date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return date.toLocaleTimeString();
};

const EventLog = ({ events, onClear }) => {
    return (
        <section
            aria-label="Live event log"
            style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                height: '280px',
            }}
        >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <h2 style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                }}>
                    Live Event Log
                </h2>
                <button
                    onClick={onClear}
                    aria-label="Clear event log"
                    style={{
                        background: 'none',
                        border: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        fontSize: '11px',
                        transition: 'all var(--transition)',
                    }}
                    onMouseEnter={e => {
                        e.target.style.borderColor = 'var(--accent-red)';
                        e.target.style.color = 'var(--accent-red)';
                    }}
                    onMouseLeave={e => {
                        e.target.style.borderColor = 'var(--border)';
                        e.target.style.color = 'var(--text-muted)';
                    }}
                >
                    Clear
                </button>
            </div>

            {/* Live region for screen readers */}
            <div
                role="log"
                aria-live="polite"
                aria-label="System events"
                style={{
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    flex: 1,
                }}
            >
                {events.length === 0 ? (
                    <p style={{
                        color: 'var(--text-muted)',
                        fontSize: '13px',
                        textAlign: 'center',
                        marginTop: '40px',
                    }}>
                        No events yet — request a ride to see activity
                    </p>
                ) : (
                    events.map((event) => (
                        <div
                            key={event.id}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px',
                                padding: '8px 10px',
                                background: 'var(--bg-surface)',
                                borderRadius: 'var(--radius-sm)',
                                borderLeft: `3px solid ${EVENT_COLORS[event.type] || 'var(--border)'}`,
                            }}
                        >
                            <span aria-hidden="true" style={{ fontSize: '14px', marginTop: '1px' }}>
                                {EVENT_ICONS[event.type] || '📌'}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: EVENT_COLORS[event.type] || 'var(--text-primary)',
                                    marginBottom: '2px',
                                }}>
                                    {event.type}
                                </p>
                                <p style={{
                                    fontSize: '11px',
                                    color: 'var(--text-secondary)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}>
                                    {event.detail}
                                </p>
                            </div>
                            <time
                                dateTime={event.timestamp.toISOString()}
                                style={{
                                    fontSize: '10px',
                                    color: 'var(--text-muted)',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {formatTime(event.timestamp)}
                            </time>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
};

export default EventLog;