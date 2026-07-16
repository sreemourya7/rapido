import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import LiveMap from './components/LiveMap';
import Dashboard from './components/Dashboard';
import ActionBar from './components/ActionBar';
import { useDrivers } from './hooks/useDrivers';
import { useRide } from './hooks/useRide';
import { useEvents } from './hooks/useEvents';
import { login, requestRide } from './services/api';

const App = () => {
  const [currentRideId, setCurrentRideId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pickupLocation, setPickupLocation] = useState(null);
  const [stats, setStats] = useState({
    totalRides: 0,
    matched: 0,
    noDrivers: 0,
  });

  const { drivers } = useDrivers();
  const { ride: currentRide } = useRide(currentRideId);
  const { events, addEvent, clearEvents } = useEvents();

  // Track ride status changes for stats + event log
  const prevStatusRef = React.useRef(null);
  React.useEffect(() => {
    if (!currentRide) return;
    if (currentRide.status === prevStatusRef.current) return;
    prevStatusRef.current = currentRide.status;

    // Add to event log
    addEvent(`ride.${currentRide.status.toLowerCase()}`,
      `Ride ${currentRide.id.slice(0, 8)}... → ${currentRide.status}`
    );

    // Update stats
    if (currentRide.status === 'MATCHED') {
      setStats(s => ({ ...s, matched: s.matched + 1 }));
    }
    if (currentRide.status === 'NO_DRIVERS') {
      setStats(s => ({ ...s, noDrivers: s.noDrivers + 1 }));
    }
  }, [currentRide?.status, addEvent]);

  const ensureAuthenticated = async () => {
    let token = localStorage.getItem('rapido_token');
    if (!token) {
      addEvent('auth', 'Logging in as rider-1...');
      const data = await login('rider-1', 'password123');
      token = data.access_token;
      localStorage.setItem('rapido_token', token);
      addEvent('auth', 'Login successful');
    }
    return token;
  };

  const handleRideRequest = useCallback(async (lat, lng) => {
    setIsLoading(true);
    setCurrentRideId(null);
    prevStatusRef.current = null;

    try {
      await ensureAuthenticated();

      setPickupLocation([lat, lng]);
      addEvent('ride.requested', `Pickup at ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

      const data = await requestRide(lat, lng);
      const rideId = data.ride?.id;

      if (rideId) {
        setCurrentRideId(rideId);
        setStats(s => ({ ...s, totalRides: s.totalRides + 1 }));
        addEvent('ride.requested', `Ride ${rideId.slice(0, 8)}... created`);
      }
    } catch (err) {
      addEvent('error', err.message || 'Failed to request ride');
      // Token may have expired — clear and retry next time
      localStorage.removeItem('rapido_token');
    } finally {
      setIsLoading(false);
    }
  }, [addEvent]);

  const isLive = drivers.length > 0;

  return (
    <>
      {/* WCAG: Skip navigation */}
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>

      <div
        lang="en"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          overflow: 'hidden',
          background: 'var(--bg-primary)',
        }}
      >
        {/* Header */}
        <Header
          activeDrivers={drivers.length}
          isLive={isLive}
        />

        {/* Main content */}
        <main
          id="main-content"
          tabIndex={-1}
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr 380px',
            gap: '16px',
            padding: '16px',
            overflow: 'hidden',
            minHeight: 0,
          }}
          aria-label="Rapido dispatch system"
        >
          {/* Left — Live Map */}
          <LiveMap
            drivers={drivers}
            currentRide={currentRide}
            pickupLocation={pickupLocation}
          />

          {/* Right — Dashboard */}
          <Dashboard
            drivers={drivers}
            stats={stats}
            events={events}
            onClearEvents={clearEvents}
          />
        </main>

        {/* Bottom — Action Bar */}
        <ActionBar
          onRideRequest={handleRideRequest}
          currentRide={currentRide}
          isLoading={isLoading}
        />
      </div>
    </>
  );
};

export default App;