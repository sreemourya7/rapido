import React, { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const SAN_JOSE = [37.3382, -121.8863];

// Fixes Leaflet marker icon issue with webpack
const fixLeafletIcons = () => {
    const L = require('leaflet');
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
        iconUrl: require('leaflet/dist/images/marker-icon.png'),
        shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
    });
};

// Auto-centers map when pickup changes
const MapController = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.flyTo(center, 14, { duration: 1.2 });
    }, [center, map]);
    return null;
};

const LiveMap = ({ drivers, currentRide, pickupLocation }) => {
    useEffect(() => { fixLeafletIcons(); }, []);

    const getDriverColor = (driverId) => {
        if (!currentRide) return '#00d4aa';
        if (currentRide.driver_id === driverId) return '#e94560';
        return '#00d4aa';
    };

    return (
        <section
            aria-label="Live driver map"
            style={{
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                border: '1px solid var(--border)',
                height: '100%',
                position: 'relative',
            }}
        >
            {/* Map accessibility text alternative */}
            <div className="sr-only" aria-live="polite">
                {drivers.length === 0
                    ? 'No drivers currently available nearby.'
                    : `${drivers.length} drivers available nearby. 
             Nearest driver is ${drivers[0]?.driver_id} 
             at ${drivers[0]?.distance_km} km away.`
                }
            </div>

            <MapContainer
                center={SAN_JOSE}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
                aria-label="Map showing live driver locations"
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
                />

                <MapController center={pickupLocation} />

                {/* Driver dots */}
                {drivers.map((driver) => (
                    <CircleMarker
                        key={driver.driver_id}
                        center={[driver.lat, driver.lng]}
                        radius={10}
                        pathOptions={{
                            color: getDriverColor(driver.driver_id),
                            fillColor: getDriverColor(driver.driver_id),
                            fillOpacity: 0.9,
                            weight: 2,
                        }}
                    >
                        <Popup>
                            <div style={{
                                fontFamily: 'inherit',
                                fontSize: '13px',
                                minWidth: '140px',
                            }}>
                                <strong style={{ display: 'block', marginBottom: '4px' }}>
                                    {driver.driver_id}
                                </strong>
                                <span style={{ color: '#666' }}>
                                    {driver.distance_km} km away
                                </span>
                                {currentRide?.driver_id === driver.driver_id && (
                                    <span style={{
                                        display: 'block',
                                        marginTop: '4px',
                                        color: '#e94560',
                                        fontWeight: '600',
                                    }}>
                                        ✓ Your driver
                                    </span>
                                )}
                            </div>
                        </Popup>
                    </CircleMarker>
                ))}

                {/* Pickup pin */}
                {pickupLocation && (
                    <CircleMarker
                        center={pickupLocation}
                        radius={12}
                        pathOptions={{
                            color: '#f5a623',
                            fillColor: '#f5a623',
                            fillOpacity: 1,
                            weight: 3,
                        }}
                    >
                        <Popup>
                            <strong>Your pickup location</strong>
                        </Popup>
                    </CircleMarker>
                )}
            </MapContainer>

            {/* Map legend */}
            <div
                role="complementary"
                aria-label="Map legend"
                style={{
                    position: 'absolute',
                    bottom: '16px',
                    left: '16px',
                    background: 'rgba(15, 15, 26, 0.92)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                }}
            >
                <p style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '2px',
                }}>
                    Legend
                </p>
                {[
                    { color: '#00d4aa', label: 'Available driver' },
                    { color: '#e94560', label: 'Your driver' },
                    { color: '#f5a623', label: 'Pickup point' },
                ].map(({ color, label }) => (
                    <div key={label} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        <span style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: color,
                            flexShrink: 0,
                            display: 'inline-block',
                        }} aria-hidden="true" />
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {label}
                        </span>
                    </div>
                ))}
            </div>
        </section>
    );
};

export default LiveMap;  