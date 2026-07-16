import { useState, useEffect, useCallback } from 'react';
import { getNearbyDrivers } from '../services/api';

const DEFAULT_LAT = 37.3382;
const DEFAULT_LNG = -121.8863;

export const useDrivers = () => {
    const [drivers, setDrivers] = useState([]);
    const [error, setError] = useState(null);

    const fetchDrivers = useCallback(async () => {
        try {
            const data = await getNearbyDrivers(DEFAULT_LAT, DEFAULT_LNG, 10);
            setDrivers(data.nearby_drivers || []);
            setError(null);
        } catch (err) {
            setError('Failed to fetch drivers');
        }
    }, []);

    useEffect(() => {
        fetchDrivers();
        const interval = setInterval(fetchDrivers, 2000);
        return () => clearInterval(interval);
    }, [fetchDrivers]);

    return { drivers, error };
};