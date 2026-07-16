import { useState, useCallback } from 'react';

const MAX_EVENTS = 50;

export const useEvents = () => {
    const [events, setEvents] = useState([]);

    const addEvent = useCallback((type, detail) => {
        const event = {
            id: `${Date.now()}-${Math.random()}`,
            type,
            detail,
            timestamp: new Date(),
        };
        setEvents((prev) => [event, ...prev].slice(0, MAX_EVENTS));
    }, []);

    const clearEvents = useCallback(() => setEvents([]), []);

    return { events, addEvent, clearEvents };
};