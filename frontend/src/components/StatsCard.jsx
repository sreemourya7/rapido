import React from 'react';

const StatsCard = ({ label, value, color = 'teal', icon, description }) => {
    const colorMap = {
        teal: 'var(--accent-teal)',
        red: 'var(--accent-red)',
        amber: 'var(--accent-amber)',
        blue: 'var(--accent-blue)',
    };

    return (
        <article
            style={{
                background: 'var(--bg-card)',
                border: `1px solid var(--border)`,
                borderRadius: 'var(--radius)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'background var(--transition)',
            }}
            aria-label={`${label}: ${value}`}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                    style={{ fontSize: '22px' }}
                    role="img"
                    aria-hidden="true"
                >
                    {icon}
                </span>
                <span style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                }}>
                    {label}
                </span>
            </div>

            <p style={{
                fontSize: '36px',
                fontWeight: '800',
                color: colorMap[color],
                lineHeight: 1,
            }}>
                {value}
            </p>

            {description && (
                <p style={{
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                }}>
                    {description}
                </p>
            )}
        </article>
    );
};

export default StatsCard;