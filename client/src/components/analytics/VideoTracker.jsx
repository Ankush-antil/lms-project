import React, { useRef, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const VideoTracker = ({ src, material, className }) => {
    const videoRef = useRef(null);
    
    // Tracking references
    const prevTimeRef = useRef(0);
    const sessionIdRef = useRef(Math.random().toString(36).substring(2, 11));
    const sessionDurationRef = useRef(0);
    const focusedTimeRef = useRef(0);
    const unfocusedTimeRef = useRef(0);
    const watchedSegmentsRef = useRef(new Set());
    const skipsRef = useRef([]);
    const replaysRef = useRef([]);
    
    const [playbackSpeed, setPlaybackSpeed] = useState('1');
    const [isFocused, setIsFocused] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);

    // Fetch and resume playback position
    useEffect(() => {
        const fetchResumePosition = async () => {
            try {
                const { data } = await axios.get(`/api/video-analytics/details/${material._id}`);
                if (data?.records && data.records.length > 0) {
                    const progress = data.records[0].progress;
                    if (progress?.lastWatchedPosition > 2 && videoRef.current) {
                        videoRef.current.currentTime = progress.lastWatchedPosition;
                        toast.success(`Resumed playback from ${Math.floor(progress.lastWatchedPosition / 60)}m ${Math.floor(progress.lastWatchedPosition % 60)}s`);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch resume position:", err);
            }
        };

        if (material?._id) {
            fetchResumePosition();
        }
    }, [material]);

    // Handle tab focus / browser focus changes
    useEffect(() => {
        const handleFocus = () => setIsFocused(true);
        const handleBlur = () => setIsFocused(false);

        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('visibilitychange', () => {
            setIsFocused(document.visibilityState === 'visible');
        });

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    // Focus / Unfocus time increment loop (1-second tick)
    useEffect(() => {
        let interval = null;
        if (isPlaying) {
            interval = setInterval(() => {
                if (isFocused) {
                    focusedTimeRef.current += 1;
                } else {
                    unfocusedTimeRef.current += 1;
                }
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPlaying, isFocused]);

    // Batch analytics submission loop (5-second tick)
    useEffect(() => {
        let batchInterval = null;
        
        const sendBatchUpdate = async () => {
            const video = videoRef.current;
            if (!video) return;

            const payload = {
                course: material.course || 'General',
                lesson: material.inboxId || 'Inbox 1',
                video: material._id,
                totalDuration: video.duration || 0,
                currentPosition: video.currentTime || 0,
                sessionId: sessionIdRef.current,
                sessionDurationIncrement: sessionDurationRef.current,
                focusTimeIncrement: focusedTimeRef.current,
                unfocusTimeIncrement: unfocusedTimeRef.current,
                playbackSpeed: playbackSpeed,
                watchedSegments: Array.from(watchedSegmentsRef.current),
                skips: skipsRef.current,
                replays: replaysRef.current
            };

            // Only send update if student actually watched video or had events in this interval
            if (sessionDurationRef.current > 0 || watchedSegmentsRef.current.size > 0 || skipsRef.current.length > 0 || replaysRef.current.length > 0) {
                try {
                    await axios.post('/api/video-analytics/track', payload);
                    
                    // Reset interval accumulators
                    sessionDurationRef.current = 0;
                    focusedTimeRef.current = 0;
                    unfocusedTimeRef.current = 0;
                    watchedSegmentsRef.current.clear();
                    skipsRef.current = [];
                    replaysRef.current = [];
                } catch (err) {
                    console.error("Failed to send video analytics tick:", err);
                }
            }
        };

        if (isPlaying) {
            batchInterval = setInterval(sendBatchUpdate, 5000);
        }

        return () => {
            if (batchInterval) {
                clearInterval(batchInterval);
                sendBatchUpdate(); // flush final state on unmount or pause
            }
        };
    }, [isPlaying, material, playbackSpeed]);

    const handleTimeUpdate = (e) => {
        const video = e.target;
        const currentTime = video.currentTime;
        const timeDiff = currentTime - prevTimeRef.current;

        // Skip / Replay seeking detection
        if (Math.abs(timeDiff) > 1.5) {
            if (timeDiff > 0) {
                skipsRef.current.push({
                    skipStart: prevTimeRef.current,
                    skipEnd: currentTime,
                    skippedDuration: timeDiff
                });
            } else {
                replaysRef.current.push({
                    replayStart: currentTime,
                    replayEnd: prevTimeRef.current
                });
            }
        } else {
            if (!video.paused) {
                const currentSegment = Math.floor(currentTime / 5);
                watchedSegmentsRef.current.add(currentSegment);
                sessionDurationRef.current += Math.max(0, timeDiff);
            }
        }
        prevTimeRef.current = currentTime;
    };

    const handlePlay = () => {
        setIsPlaying(true);
        if (videoRef.current) prevTimeRef.current = videoRef.current.currentTime;
    };

    const handlePause = () => {
        setIsPlaying(false);
    };

    const handleRateChange = (e) => {
        setPlaybackSpeed(String(e.target.playbackRate));
    };

    return (
        <video
            ref={videoRef}
            src={src}
            controls
            autoPlay
            onPlay={handlePlay}
            onPause={handlePause}
            onTimeUpdate={handleTimeUpdate}
            onRateChange={handleRateChange}
            className={className}
        />
    );
};

export default VideoTracker;
