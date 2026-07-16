import { useState, useEffect, useCallback } from 'react';
import { getRide } from '../services/api';

export const useRide = (rideId) => {
    const [ride, setRide] = useState(null);
    const [error, setError] = useState(null);

    const fetchRide = useCallback(async () => {
        if (!rideId) return;
        try {
            const data = await getRide(rideId);
            setRide(data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch ride');
        }
    }, [rideId]);

    useEffect(() => {
        if (!rideId) return;
        fetchRide();
        // Poll every 2s until terminal state
        const interval = setInterval(() => {
            if (ride?.status === 'MATCHED' ||
                ride?.status === 'COMPLETED' ||
                ride?.status === 'NO_DRIVERS' ||
                ride?.status === 'CANCELLED') {
                clearInterval(interval);
                return;
            }
            fetchRide();
        }, 2000);
        return () => clearInterval(interval);
    }, [rideId, fetchRide, ride?.status]);

    return { ride, error };
};