import { useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

/**
 * Custom hook to track user session duration & click interactions on the LMS.
 * Batches clicks and time spent locally and periodically syncs with the backend.
 */
export const useActivityTracker = () => {
    const { user } = useAuth();
    const sessionStartTimeRef = useRef(Date.now());
    const clickCountRef = useRef(0);
    const pageViewsRef = useRef(1);

    useEffect(() => {
        // Track clicks across the app
        const handleClick = (e) => {
            // Ignore trivial drag or scroll events, count actual clicks
            clickCountRef.current += 1;
        };

        window.addEventListener('click', handleClick);

        // Sync batch data to backend every 45 seconds & on unload
        const syncActivity = async () => {
            const now = Date.now();
            const durationSeconds = Math.round((now - sessionStartTimeRef.current) / 1000);
            const clicks = clickCountRef.current;
            const pageViews = pageViewsRef.current;

            if (durationSeconds < 2 && clicks === 0) return;

            try {
                await axios.post('/api/analytics/track-activity', {
                    userId: user?._id || null,
                    role: user?.role || 'Guest',
                    durationSeconds,
                    clicks,
                    pageViews,
                    lastPath: window.location.pathname
                });

                // Reset batch timer reference
                sessionStartTimeRef.current = Date.now();
                clickCountRef.current = 0;
            } catch (err) {
                // Silently ignore network failures for background tracking
            }
        };

        const intervalId = setInterval(syncActivity, 45000);

        const handleUnload = () => {
            syncActivity();
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            window.removeEventListener('click', handleClick);
            window.removeEventListener('beforeunload', handleUnload);
            clearInterval(intervalId);
            syncActivity();
        };
    }, [user]);
};

export default useActivityTracker;
