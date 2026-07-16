import React from 'react';

const Header = ({ activeDrivers, isLive }) => {
    return (
        <header
            role="banner"
            style={{
                background: 'var(--bg-surface)',
                borderBottom: '1px solid var(--border)',
                padding: '0 24px',
                height: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}
        >
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span aria-hidden="true" style={{ fontSize: '24px' }}>🚗</span>
                <h1 style={{
                    fontSize: '20px',
                    fontWeight: '800',
                    background: 'linear-gradient(135deg, #e94560, #f5a623)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.02em',
                }}>
                    Rapido
                </h1>
                <span style={{
                    fontSize: '10px',
                    background: 'var(--bg-card)',
                    color: 'var(--text-muted)',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    border: '1px solid var(--border)',
                    fontWeight: '600',
                    letterSpacing: '0.05em',
                }}>
                    DISPATCH
                </span>
            </div>

            {/* Status indicators */}
            <nav
                aria-label="System status"
                style={{ display: 'flex', alignItems: 'center', gap: '20px' }}
            >
                {/* Live indicator */}
                <div
                    role="status"
                    aria-label={isLive ? 'System is live' : 'System is offline'}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isLive ? 'var(--accent-teal)' : 'var(--accent-red)',
                        boxShadow: isLive ? '0 0 8px var(--accent-teal)' : 'none',
                        animation: isLive ? 'pulse 2s infinite' : 'none',
                        display: 'inline-block',
                    }} aria-hidden="true" />
                    <span style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: isLive ? 'var(--accent-teal)' : 'var(--accent-red)',
                    }}>
                        {isLive ? 'LIVE' : 'OFFLINE'}
                    </span>
                </div>

                {/* Active drivers */}
                <div
                    aria-label={`${activeDrivers} active drivers`}
                    style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        borderRadius: '20px',
                        padding: '6px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <span aria-hidden="true" style={{ fontSize: '14px' }}>👤</span>
                    <span style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        color: 'var(--accent-teal)',
                    }}>
                        {activeDrivers}
                    </span>
                    <span style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                    }}>
                        drivers online
                    </span>
                </div>
            </nav>

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
        </header>
    );
};

export default Header;