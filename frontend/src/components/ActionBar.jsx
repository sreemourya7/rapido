import React, { useState } from 'react';

const LOCATIONS = [
    { label: 'San Jose Downtown', lat: 37.3382, lng: -121.8863 },
    { label: 'San Jose Airport', lat: 37.3639, lng: -121.9289 },
    { label: 'Santa Clara', lat: 37.3541, lng: -121.9552 },
    { label: 'Sunnyvale', lat: 37.3688, lng: -122.0363 },
    { label: 'Mountain View', lat: 37.3861, lng: -122.0839 },
];

const STATUS_STEPS = [
    'REQUESTED',
    'OFFERED',
    'MATCHED',
    'ACCEPTED',
    'IN_PROGRESS',
    'COMPLETED',
];

const STATUS_COLORS = {
    REQUESTED: 'var(--accent-blue)',
    OFFERED: 'var(--accent-amber)',
    MATCHED: 'var(--accent-teal)',
    ACCEPTED: 'var(--accent-teal)',
    IN_PROGRESS: 'var(--accent-teal)',
    COMPLETED: 'var(--accent-teal)',
    NO_DRIVERS: 'var(--accent-red)',
    CANCELLED: 'var(--accent-red)',
};

const ActionBar = ({ onRideRequest, currentRide, isLoading }) => {
    const [selectedLocation, setSelectedLocation] = useState(LOCATIONS[0]);

    const handleRequest = () => {
        onRideRequest(selectedLocation.lat, selectedLocation.lng);
    };

    const currentStepIndex = STATUS_STEPS.indexOf(currentRide?.status);

    return (
        <footer
            role="contentinfo"
            aria-label="Ride request controls"
            style={{
                background: 'var(--bg-surface)',
                borderTop: '1px solid var(--border)',
                padding: '16px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
            }}
        >
            {/* Controls row */}
            <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '16px',
                flexWrap: 'wrap',
            }}>

                {/* Location selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
                    <label
                        htmlFor="pickup-location"
                        style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                        }}
                    >
                        📍 Pickup Location
                    </label>
                    <select
                        id="pickup-location"
                        value={selectedLocation.label}
                        onChange={(e) => {
                            const loc = LOCATIONS.find(l => l.label === e.target.value);
                            setSelectedLocation(loc);
                        }}
                        aria-describedby="location-hint"
                        style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            color: 'var(--text-primary)',
                            padding: '10px 14px',
                            fontSize: '14px',
                            cursor: 'pointer',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23a0aec0' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            paddingRight: '32px',
                        }}
                    >
                        {LOCATIONS.map((loc) => (
                            <option key={loc.label} value={loc.label}>
                                {loc.label}
                            </option>
                        ))}
                    </select>
                    <span id="location-hint" className="sr-only">
                        Select your pickup location from the dropdown
                    </span>
                </div>

                {/* Coordinates display */}
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                }}
                    aria-label={`Coordinates: ${selectedLocation.lat}, ${selectedLocation.lng}`}
                >
                    {selectedLocation.lat.toFixed(4)}, {selectedLocation.lng.toFixed(4)}
                </div>

                {/* Request button */}
                <button
                    onClick={handleRequest}
                    disabled={isLoading || (currentRide?.status && !['COMPLETED', 'NO_DRIVERS', 'CANCELLED'].includes(currentRide?.status))}
                    aria-label="Request a ride"
                    aria-busy={isLoading}
                    style={{
                        background: isLoading
                            ? 'var(--border)'
                            : 'linear-gradient(135deg, var(--accent-red), #c73652)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        padding: '10px 28px',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        whiteSpace: 'nowrap',
                        transition: 'all var(--transition)',
                        minHeight: '44px',
                        minWidth: '44px',
                    }}
                >
                    {isLoading ? (
                        <>
                            <span aria-hidden="true">⏳</span>
                            Finding driver...
                        </>
                    ) : (
                        <>
                            <span aria-hidden="true">🚗</span>
                            Request Ride
                        </>
                    )}
                </button>
            </div>

            {/* Ride status tracker */}
            {currentRide && (
                <div
                    role="status"
                    aria-live="polite"
                    aria-label={`Ride status: ${currentRide.status}`}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0',
                        overflowX: 'auto',
                        paddingBottom: '4px',
                    }}
                >
                    {currentRide.status === 'NO_DRIVERS' ? (
                        <div style={{
                            background: 'rgba(233, 69, 96, 0.15)',
                            border: '1px solid var(--accent-red)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '8px 16px',
                            color: 'var(--accent-red)',
                            fontSize: '13px',
                            fontWeight: '600',
                            width: '100%',
                            textAlign: 'center',
                        }}>
                            ❌ No drivers available — please try again
                        </div>
                    ) : (
                        STATUS_STEPS.map((step, index) => {
                            const isCompleted = currentStepIndex > index;
                            const isCurrent = currentStepIndex === index;
                            const isFuture = currentStepIndex < index;

                            return (
                                <React.Fragment key={step}>
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '4px',
                                        minWidth: '80px',
                                    }}>
                                        <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: isCompleted
                                                ? 'var(--accent-teal)'
                                                : isCurrent
                                                    ? STATUS_COLORS[step]
                                                    : 'var(--bg-card)',
                                            border: `2px solid ${isFuture
                                                    ? 'var(--border)'
                                                    : isCompleted
                                                        ? 'var(--accent-teal)'
                                                        : STATUS_COLORS[step]
                                                }`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '12px',
                                            transition: 'all 0.3s ease',
                                            boxShadow: isCurrent
                                                ? `0 0 12px ${STATUS_COLORS[step]}`
                                                : 'none',
                                        }}
                                            aria-current={isCurrent ? 'step' : undefined}
                                        >
                                            {isCompleted ? '✓' : isCurrent ? '●' : ''}
                                        </div>
                                        <span style={{
                                            fontSize: '9px',
                                            fontWeight: '600',
                                            color: isFuture
                                                ? 'var(--text-muted)'
                                                : isCurrent
                                                    ? STATUS_COLORS[step]
                                                    : 'var(--accent-teal)',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em',
                                            whiteSpace: 'nowrap',
                                        }}>
                                            {step}
                                        </span>
                                    </div>

                                    {/* Connector line */}
                                    {index < STATUS_STEPS.length - 1 && (
                                        <div style={{
                                            flex: 1,
                                            height: '2px',
                                            background: isCompleted
                                                ? 'var(--accent-teal)'
                                                : 'var(--border)',
                                            marginBottom: '20px',
                                            transition: 'background 0.3s ease',
                                            minWidth: '20px',
                                        }} aria-hidden="true" />
                                    )}
                                </React.Fragment>
                            );
                        })
                    )}
                </div>
            )}

            {/* Current ride info */}
            {currentRide?.driver_id && (
                <p
                    role="status"
                    aria-live="polite"
                    style={{
                        fontSize: '12px',
                        color: 'var(--accent-teal)',
                        fontWeight: '600',
                    }}
                >
                    ✓ Driver {currentRide.driver_id} assigned to your ride
                </p>
            )}
        </footer>
    );
};

export default ActionBar;