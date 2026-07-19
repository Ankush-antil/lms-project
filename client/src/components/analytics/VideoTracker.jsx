import React, { useRef, useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const getYoutubeId = (url) => {
    if (!url) return null;
    const reg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(reg);
    return match ? match[1] : null;
};

const VideoTracker = ({ src, material, className }) => {
    const videoRef = useRef(null);
    const iframeRef = useRef(null);
    const playerRef = useRef(null);
    
    const isYoutube = !!getYoutubeId(src);

    // Tracking references
    const prevTimeRef = useRef(0);
    const sessionIdRef = useRef(Math.random().toString(36).substring(2, 11));
    const sessionDurationRef = useRef(0);
    const focusedTimeRef = useRef(0);
    const unfocusedTimeRef = useRef(0);
    const watchedSegmentsRef = useRef(new Set());
    const skipsRef = useRef([]);
    const replaysRef = useRef([]);

    // Advanced event counts for click session details
    const hasStartedRef = useRef(false);
    const pausesRef = useRef(0);
    const resumesRef = useRef(0);
    const returnedRef = useRef(0);
    const forwardRef = useRef(0);
    const rewindRef = useRef(0);
    const tabSwitchRef = useRef(0);
    const leftVideoRef = useRef(0);
    const completedAttemptsRef = useRef(0);
    const hasCompletedCurrentAttemptRef = useRef(false);
    
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
                    if (progress?.lastWatchedPosition > 2) {
                        if (isYoutube) {
                            // Resume for YouTube
                            let tries = 0;
                            const seekYT = () => {
                                if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
                                    playerRef.current.seekTo(progress.lastWatchedPosition, true);
                                    toast.success(`Resumed playback from ${Math.floor(progress.lastWatchedPosition / 60)}m ${Math.floor(progress.lastWatchedPosition % 60)}s`);
                                } else if (tries < 10) {
                                    tries++;
                                    setTimeout(seekYT, 500);
                                }
                            };
                            seekYT();
                        } else if (videoRef.current) {
                            // Resume for HTML5 video
                            videoRef.current.currentTime = progress.lastWatchedPosition;
                            toast.success(`Resumed playback from ${Math.floor(progress.lastWatchedPosition / 60)}m ${Math.floor(progress.lastWatchedPosition % 60)}s`);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch resume position:", err);
            }
        };

        if (material?._id) {
            fetchResumePosition();
        }
    }, [material, isYoutube]);

    // Handle tab focus / browser focus changes
    useEffect(() => {
        const handleFocus = () => {
            setIsFocused(true);
            returnedRef.current += 1;
        };
        const handleBlur = () => {
            setIsFocused(false);
            leftVideoRef.current += 1;
        };
        const handleVisibility = () => {
            const isVisible = document.visibilityState === 'visible';
            setIsFocused(isVisible);
            if (isVisible) {
                returnedRef.current += 1;
            } else {
                tabSwitchRef.current += 1;
            }
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('visibilitychange', handleVisibility);
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

    // Dynamic player script loader for YouTube
    useEffect(() => {
        if (!isYoutube) return;
        if (!document.getElementById('youtube-iframe-api')) {
            const tag = document.createElement('script');
            tag.id = 'youtube-iframe-api';
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
    }, [isYoutube]);

    const logPlay = () => {
        if (!hasStartedRef.current) {
            hasStartedRef.current = true;
        } else {
            resumesRef.current += 1;
        }
        setIsPlaying(true);
    };

    const logPause = () => {
        pausesRef.current += 1;
        setIsPlaying(false);
    };

    // Initialize YouTube Player API tracking
    useEffect(() => {
        if (!isYoutube) return;

        let player = null;
        let checkInterval = null;

        const initPlayer = () => {
            if (window.YT && window.YT.Player && iframeRef.current) {
                player = new window.YT.Player(iframeRef.current, {
                    events: {
                        onStateChange: (event) => {
                            if (event.data === window.YT.PlayerState.PLAYING) {
                                logPlay();
                                prevTimeRef.current = player.getCurrentTime() || 0;
                            } else if (event.data === window.YT.PlayerState.PAUSED) {
                                logPause();
                            }
                        },
                        onPlaybackRateChange: (event) => {
                            setPlaybackSpeed(String(event.data));
                        }
                    }
                });
                playerRef.current = player;
            }
        };

        if (window.YT && window.YT.Player) {
            initPlayer();
        } else {
            checkInterval = setInterval(() => {
                if (window.YT && window.YT.Player) {
                    initPlayer();
                    clearInterval(checkInterval);
                }
            }, 500);
        }

        return () => {
            if (checkInterval) clearInterval(checkInterval);
        };
    }, [isYoutube]);

    const getPlaybackDetails = () => {
        if (isYoutube && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
            return {
                currentTime: playerRef.current.getCurrentTime() || 0,
                duration: playerRef.current.getDuration() || 0,
                paused: playerRef.current.getPlayerState ? playerRef.current.getPlayerState() !== window.YT.PlayerState.PLAYING : true
            };
        } else if (videoRef.current) {
            return {
                currentTime: videoRef.current.currentTime || 0,
                duration: videoRef.current.duration || 0,
                paused: videoRef.current.paused
            };
        }
        return null;
    };

    // Playback state observer loop (500ms interval) to track seeks/rewinds and segments
    useEffect(() => {
        let interval = null;
        if (isPlaying) {
            interval = setInterval(() => {
                const details = getPlaybackDetails();
                if (!details) return;

                const currentTime = details.currentTime;
                const timeDiff = currentTime - prevTimeRef.current;

                if (Math.abs(timeDiff) > 1.5) {
                    if (timeDiff > 0) {
                        forwardRef.current += 1;
                        skipsRef.current.push({
                            skipStart: prevTimeRef.current,
                            skipEnd: currentTime,
                            skippedDuration: timeDiff
                        });
                    } else {
                        rewindRef.current += 1;
                        replaysRef.current.push({
                            replayStart: currentTime,
                            replayEnd: prevTimeRef.current
                        });
                    }
                } else {
                    if (!details.paused) {
                        const currentSegment = Math.floor(currentTime / 5);
                        watchedSegmentsRef.current.add(currentSegment);
                        sessionDurationRef.current += Math.max(0, timeDiff);
                    }
                }

                // Track completion attempts (95% to 100%)
                const duration = details.duration || 0;
                if (duration > 0) {
                    const ratio = currentTime / duration;
                    if (ratio >= 0.95) {
                        if (!hasCompletedCurrentAttemptRef.current) {
                            completedAttemptsRef.current += 1;
                            hasCompletedCurrentAttemptRef.current = true;
                        }
                    } else if (ratio < 0.30) {
                        // Reset when user rewinds/restarts below 30%
                        hasCompletedCurrentAttemptRef.current = false;
                    }
                }

                prevTimeRef.current = currentTime;
            }, 500);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPlaying, isYoutube]);

    // Batch analytics submission loop (5-second tick)
    useEffect(() => {
        let batchInterval = null;
        
        const sendBatchUpdate = async () => {
            const details = getPlaybackDetails();
            if (!details) return;

            const payload = {
                course: material.course || 'General',
                lesson: material.inboxId || 'Inbox 1',
                video: material._id,
                totalDuration: details.duration || 0,
                currentPosition: details.currentTime || 0,
                sessionId: sessionIdRef.current,
                sessionDurationIncrement: sessionDurationRef.current,
                focusTimeIncrement: focusedTimeRef.current,
                unfocusTimeIncrement: unfocusedTimeRef.current,
                playbackSpeed: playbackSpeed,
                watchedSegments: Array.from(watchedSegmentsRef.current),
                skips: skipsRef.current,
                replays: replaysRef.current,

                // Event detail counts
                totalPauses: pausesRef.current,
                totalResumed: resumesRef.current,
                totalReturned: returnedRef.current,
                totalForward: forwardRef.current,
                totalRewind: rewindRef.current,
                tabSwitch: tabSwitchRef.current,
                leftVideo: leftVideoRef.current,
                completionAttempts: completedAttemptsRef.current
            };

            const hasActivity = sessionDurationRef.current > 0 ||
                                watchedSegmentsRef.current.size > 0 ||
                                skipsRef.current.length > 0 ||
                                replaysRef.current.length > 0 ||
                                pausesRef.current > 0 ||
                                resumesRef.current > 0 ||
                                returnedRef.current > 0 ||
                                forwardRef.current > 0 ||
                                rewindRef.current > 0 ||
                                tabSwitchRef.current > 0 ||
                                leftVideoRef.current > 0;

            if (hasActivity) {
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
                sendBatchUpdate(); // flush final state
            }
        };
    }, [isPlaying, material, playbackSpeed]);

    const handlePlay = () => {
        logPlay();
        if (videoRef.current) prevTimeRef.current = videoRef.current.currentTime;
    };

    const handlePause = () => {
        logPause();
    };

    const handleRateChange = (e) => {
        setPlaybackSpeed(String(e.target.playbackRate));
    };

    if (isYoutube) {
        const ytId = getYoutubeId(src);
        const embedUrl = `https://www.youtube.com/embed/${ytId}?enablejsapi=1&origin=${window.location.origin}&autoplay=1`;
        return (
            <iframe
                ref={iframeRef}
                id="youtube-player"
                src={embedUrl}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className={className}
            />
        );
    }

    return (
        <video
            ref={videoRef}
            src={src}
            controls
            autoPlay
            onPlay={handlePlay}
            onPause={handlePause}
            onRateChange={handleRateChange}
            className={className}
        />
    );
};

export default VideoTracker;
