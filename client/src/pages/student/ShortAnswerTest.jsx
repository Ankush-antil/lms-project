import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import {
    Info, ClipboardList, Clock, MoreVertical,
    ChevronUp, Mic, Languages, Bot, Volume2, ToggleLeft, ChevronDown, Video, Square, Play
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import LoadingPlaceholder from '../../components/common/LoadingPlaceholder';

const ShortAnswerTest = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showInfo, setShowInfo] = useState(false);
    const [answers, setAnswers] = useState({});
    const [isListening, setIsListening] = useState(null);
    const [recordingStatus, setRecordingStatus] = useState({});
    const [recordedURLs, setRecordedURLs] = useState({});
    const [submittedAnswers, setSubmittedAnswers] = useState({}); // idx -> { text, audioData, videoData }
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Refs for MediaRecorder instances and streams per question
    const mediaRecorderRef = useRef({});
    const mediaStreamRef = useRef({});
    const chunksRef = useRef({});
    const videoPreviewRef = useRef({});
    const blobsRef = useRef({}); // idx -> Blob (for base64 conversion on submit)

    // Speech Recognition setup
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = SpeechRecognition ? new SpeechRecognition() : null;

    if (recognition) {
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
    }

    useEffect(() => {
        const fetchTest = async () => {
            try {
                const userInfo = JSON.parse(localStorage.getItem('userInfo'));
                if (!userInfo) return;
                const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
                const res = await axios.get(`/api/tests/${id}`, config);
                setTest(res.data);
                const initialAnswers = {};
                res.data.questions.forEach((q, idx) => {
                    initialAnswers[idx] = "";
                });
                setAnswers(initialAnswers);
                setLoading(false);
            } catch (error) {
                console.error("[TakeTest] Error fetching test:", error);
                setLoading(false);
            }
        };
        if (id) fetchTest();
    }, [id]);

    const handleTextChange = (idx, val) => {
        setAnswers(prev => ({ ...prev, [idx]: val }));
    };

    const toggleVoiceTyping = (idx) => {
        if (!recognition) {
            toast.error("Speech recognition is not supported in this browser.");
            return;
        }

        if (isListening === idx) {
            recognition.stop();
            setIsListening(null);
        } else {
            if (isListening !== null) recognition.stop();

            setIsListening(idx);
            recognition.start();

            recognition.onresult = (event) => {
                let transcript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript;
                }
                setAnswers(prev => ({
                    ...prev,
                    [idx]: (prev[idx] || "") + " " + transcript
                }));
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                recognition.stop();
                setIsListening(null);
            };

            recognition.onend = () => {
                setIsListening(null);
            };
        }
    };

    // ─── Real MediaRecorder Recording ─────────────────────────────────────
    const startRecording = async (idx, type) => {
        try {
            const constraints = type === 'video'
                ? { video: true, audio: true }
                : { audio: true };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            mediaStreamRef.current[idx] = stream;

            // Live preview for video
            if (type === 'video' && videoPreviewRef.current[idx]) {
                videoPreviewRef.current[idx].srcObject = stream;
                videoPreviewRef.current[idx].play();
            }

            chunksRef.current[idx] = [];
            const recorder = new MediaRecorder(stream);
            mediaRecorderRef.current[idx] = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current[idx].push(e.data);
            };

            recorder.onstop = () => {
                const mimeType = type === 'video' ? 'video/webm' : 'audio/webm';
                const blob = new Blob(chunksRef.current[idx], { type: mimeType });
                blobsRef.current[idx] = { blob, type }; // store blob for base64 conversion
                const url = URL.createObjectURL(blob);
                setRecordedURLs(prev => ({ ...prev, [idx]: { url, type } }));

                // Stop all tracks
                stream.getTracks().forEach(t => t.stop());
                if (type === 'video' && videoPreviewRef.current[idx]) {
                    videoPreviewRef.current[idx].srcObject = null;
                }
            };

            recorder.start();
            setRecordingStatus(prev => ({ ...prev, [idx]: 'recording' }));
        } catch (err) {
            console.error('Media access error:', err);
            toast.error(`Could not access ${type === 'video' ? 'camera/microphone' : 'microphone'}. Please allow permissions and try again.`);
        }
    };

    const stopRecording = (idx) => {
        const recorder = mediaRecorderRef.current[idx];
        if (recorder && recorder.state !== 'inactive') {
            recorder.stop();
        }
        setRecordingStatus(prev => ({ ...prev, [idx]: 'stopped' }));
    };

    const deleteRecording = (idx) => {
        if (recordedURLs[idx]) URL.revokeObjectURL(recordedURLs[idx].url);
        setRecordedURLs(prev => { const n = { ...prev }; delete n[idx]; return n; });
        setRecordingStatus(prev => { const n = { ...prev }; delete n[idx]; return n; });
        delete blobsRef.current[idx];
    };

    // ─── Per-question Submit ─────────────────────────────────────────────────
    const blobToBase64 = (blob) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });

    const submitQuestion = async (idx, question) => {
        try {
            const type = question.type?.toLowerCase();
            const isAudio = type?.includes('voice') || type?.includes('audio') || type?.includes('mic');
            const isVideo = type?.includes('video') || type?.includes('cam');

            let audioData = '';
            let videoData = '';

            if (isAudio && blobsRef.current[idx]) {
                audioData = await blobToBase64(blobsRef.current[idx].blob);
            }
            if (isVideo && blobsRef.current[idx]) {
                videoData = await blobToBase64(blobsRef.current[idx].blob);
            }

            setSubmittedAnswers(prev => ({
                ...prev,
                [idx]: {
                    questionId: question.id || `q${idx}`,
                    questionText: question.text || question.questionText || `Question ${idx + 1}`,
                    questionType: question.type,
                    textAnswer: answers[idx] || '',
                    audioData,
                    videoData
                }
            }));
            toast.success('Answer saved!');
        } catch (err) {
            console.error('Error submitting question:', err);
            toast.error('Failed to submit question. Please try again.');
        }
    };

    // ─── Final Submit All ────────────────────────────────────────────────────
    const submitAll = async () => {
        if (!test) return;

        // Build final answers array — use submittedAnswers where available, else current state
        const finalAnswers = await Promise.all(
            test.questions.map(async (q, idx) => {
                if (submittedAnswers[idx]) return submittedAnswers[idx];
                // Auto-submit unsubmitted text questions
                return {
                    questionId: q.id || `q${idx}`,
                    questionText: q.text || q.questionText || `Question ${idx + 1}`,
                    questionType: q.type,
                    textAnswer: answers[idx] || '',
                    audioData: '',
                    videoData: ''
                };
            })
        );

        try {
            setSubmitting(true);
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
            await axios.post('/api/submissions', { testId: id, answers: finalAnswers }, config);
            setSubmitted(true);
            toast.success('Test submitted successfully!');
        } catch (err) {
            console.error('Submit error:', err);
            toast.error(err.response?.data?.message || 'Error submitting test. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };
    // ─────────────────────────────────────────────────────────────────────────

    if (loading) return (
        <LoadingPlaceholder type="test" />
    );

    if (!test) return <div className="p-10 text-center">Test not found.</div>;

    // ✅ Success screen
    if (submitted) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="bg-white rounded-3xl shadow-xl p-12 max-w-md w-full text-center border border-slate-100">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">✅</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Test Submitted!</h2>
                <p className="text-slate-500 mb-8">Your answers have been submitted successfully. Your teacher will evaluate and share the results soon.</p>
                <button
                    onClick={() => navigate('/student/tests')}
                    className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-md"
                >
                    Back to My Tests
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-[#6F42C1] px-4 md:px-6 py-4 flex flex-col md:flex-row items-center justify-between shadow-md z-10 gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <span className="text-white/80 font-bold text-lg">1.</span>
                    <h2 className="text-white font-bold text-lg truncate">{test.title}</h2>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowInfo(!showInfo)}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all shadow-sm ${showInfo ? 'bg-white text-indigo-600' : 'bg-white/20 text-white border border-white/30 hover:bg-white/30'}`}
                    >
                        <Info size={14} /> Relevant Information
                    </button>
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-white shadow-sm cursor-pointer">
                        {test.studentName?.[0] || 'S'}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6 space-y-6 pb-24 max-w-5xl mx-auto w-full">

                {showInfo && (
                    <div className="bg-white rounded-xl shadow-lg border-l-4 border-indigo-500 p-6 animate-fade-in grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Created Date</span>
                            <span className="text-slate-900 font-bold">{new Date(test.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Institute</span>
                            <span className="text-slate-900 font-bold">{test.institute}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Subject</span>
                            <span className="text-slate-900 font-bold">{test.subject}</span>
                        </div>
                    </div>
                )}

                <div className="space-y-8">
                    {test.questions.map((q, idx) => {
                        const type = q.type?.toLowerCase();
                        const isTextType = type?.includes('answer') || type?.includes('para') || type === 'text';
                        const isAudio = type?.includes('voice') || type?.includes('audio') || type?.includes('mic');
                        const isVideo = type?.includes('video') || type?.includes('cam');

                        return (
                            <div key={idx} className={`bg-white rounded-2xl shadow-sm border overflow-hidden flex flex-col md:flex-row transition-all ${submittedAnswers[idx] ? 'border-emerald-300 shadow-emerald-100' : 'border-slate-200'
                                }`}>
                                <div className={`w-full md:w-2 ${submittedAnswers[idx] ? 'bg-emerald-500' : 'bg-[#00A36C]'}`}></div>

                                <div className="flex-1 p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <h3 className="text-xl font-bold text-slate-800">Q{idx + 1}. {q.text || q.questionText}</h3>
                                        <div className="flex items-center gap-2">
                                            {submittedAnswers[idx] && (
                                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-wider">✓ Submitted</span>
                                            )}
                                            <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wider">{q.type}</span>
                                        </div>
                                    </div>

                                    {/* Question Inputs based on Type */}
                                    <div className="mb-6">
                                        {(isTextType || (!isAudio && !isVideo)) && (
                                            <div className="relative group">
                                                <textarea
                                                    disabled={!!submittedAnswers[idx]}
                                                    value={answers[idx] || ""}
                                                    onChange={(e) => handleTextChange(idx, e.target.value)}
                                                    className={`w-full p-5 border border-slate-200 rounded-xl bg-slate-50/50 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium text-slate-700 ${submittedAnswers[idx] ? 'opacity-60 cursor-not-allowed' : ''} ${type?.includes('long') || type?.includes('para') ? 'h-64' : 'h-32'}`}
                                                    placeholder="Type your answer here or use voice typing..."
                                                ></textarea>
                                                <button
                                                    disabled={!!submittedAnswers[idx]}
                                                    onClick={() => toggleVoiceTyping(idx)}
                                                    className={`absolute bottom-4 right-4 p-3 rounded-full shadow-lg transition-all ${isListening === idx ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-600 text-white hover:bg-indigo-700'} ${submittedAnswers[idx] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    title="Voice Typing"
                                                >
                                                    <Mic size={20} />
                                                </button>
                                            </div>
                                        )}

                                        {isAudio && (
                                            <div className="border-2 border-dashed border-indigo-100 rounded-2xl bg-indigo-50/20 overflow-hidden">
                                                <div className="p-10 flex flex-col items-center gap-4">
                                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${recordingStatus[idx] === 'recording' ? 'bg-red-100 text-red-600 animate-pulse ring-4 ring-red-200' : 'bg-indigo-100 text-indigo-600'} ${submittedAnswers[idx] ? 'opacity-50' : ''}`}>
                                                        <Mic size={32} />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-bold text-slate-700">{recordingStatus[idx] === 'recording' ? '🔴 Recording Audio...' : recordedURLs[idx] ? '✅ Recording Saved' : 'Audio Recording Question'}</p>
                                                        <p className="text-xs text-slate-500 mt-1">Microphone will activate to record your response</p>
                                                    </div>

                                                    {recordingStatus[idx] === 'recording' ? (
                                                        <button onClick={() => stopRecording(idx)} className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-red-700 transition-all">
                                                            <Square size={18} fill="currentColor" /> Stop Recording
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled={!!submittedAnswers[idx]}
                                                            onClick={() => startRecording(idx, 'audio')}
                                                            className={`px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-indigo-700 transition-all ${submittedAnswers[idx] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <Mic size={18} /> Start Audio Record
                                                        </button>
                                                    )}

                                                    {/* Playback after stop */}
                                                    {recordedURLs[idx]?.type === 'audio' && (
                                                        <div className="w-full mt-2 bg-white rounded-xl p-4 border border-indigo-100 shadow-sm">
                                                            <p className="text-xs font-bold text-slate-500 mb-2">🎵 Your Recording</p>
                                                            <audio controls src={recordedURLs[idx].url} className="w-full" />
                                                            {!submittedAnswers[idx] && (
                                                                <button onClick={() => deleteRecording(idx)} className="mt-2 text-xs text-red-400 hover:text-red-600 font-semibold">✕ Delete & Re-record</button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {isVideo && (
                                            <div className="border-2 border-dashed border-purple-100 rounded-2xl bg-purple-50/20 overflow-hidden">
                                                {/* Live Camera Preview */}
                                                <video
                                                    ref={el => videoPreviewRef.current[idx] = el}
                                                    className={`w-full max-h-64 object-cover bg-black rounded-b-none transition-all ${recordingStatus[idx] === 'recording' ? 'block' : 'hidden'}`}
                                                    muted
                                                    playsInline
                                                />

                                                <div className="p-10 flex flex-col items-center gap-4">
                                                    <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${recordingStatus[idx] === 'recording' ? 'bg-red-100 text-red-600 animate-pulse ring-4 ring-red-200' : 'bg-purple-100 text-purple-600'} ${submittedAnswers[idx] ? 'opacity-50' : ''}`}>
                                                        <Video size={32} />
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-bold text-slate-700">{recordingStatus[idx] === 'recording' ? '🔴 Recording Video...' : recordedURLs[idx] ? '✅ Recording Saved' : 'Video Recording Question'}</p>
                                                        <p className="text-xs text-slate-500 mt-1">Camera will activate to record your response</p>
                                                    </div>

                                                    {recordingStatus[idx] === 'recording' ? (
                                                        <button onClick={() => stopRecording(idx)} className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-red-700 transition-all">
                                                            <Square size={18} fill="currentColor" /> Stop Capture
                                                        </button>
                                                    ) : (
                                                        <button
                                                            disabled={!!submittedAnswers[idx]}
                                                            onClick={() => startRecording(idx, 'video')}
                                                            className={`px-8 py-3 bg-purple-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-purple-700 transition-all ${submittedAnswers[idx] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <Video size={18} /> Start Video Record
                                                        </button>
                                                    )}

                                                    {/* Playback after stop */}
                                                    {recordedURLs[idx]?.type === 'video' && (
                                                        <div className="w-full mt-2 bg-white rounded-xl p-4 border border-purple-100 shadow-sm">
                                                            <p className="text-xs font-bold text-slate-500 mb-2">🎬 Your Recording</p>
                                                            <video controls src={recordedURLs[idx].url} className="w-full rounded-lg max-h-48" />
                                                            {!submittedAnswers[idx] && (
                                                                <button onClick={() => deleteRecording(idx)} className="mt-2 text-xs text-red-400 hover:text-red-600 font-semibold">✕ Delete & Re-record</button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action bar */}
                                    <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                                        <div className="flex gap-3">
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest self-center">{idx + 1} of {test.questions.length}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {submittedAnswers[idx] ? (
                                                <div className="flex gap-2">
                                                    <span className="px-6 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold rounded-lg flex items-center gap-2">
                                                        ✓ Answer Submitted
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            setSubmittedAnswers(prev => {
                                                                const n = { ...prev };
                                                                delete n[idx];
                                                                return n;
                                                            });
                                                            toast.success('You can now edit your answer');
                                                        }}
                                                        className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200 transition-all border border-slate-200"
                                                    >
                                                        Re-attempt
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => submitQuestion(idx, q)}
                                                    disabled={recordingStatus[idx] === 'recording'}
                                                    className="px-6 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                                                >
                                                    Submit Answer
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex items-center justify-between px-8 z-50">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500">
                        {Object.keys(submittedAnswers).length} / {test.questions.length} Questions Submitted
                    </span>
                    <div className="mt-1 w-40 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${(Object.keys(submittedAnswers).length / test.questions.length) * 100}%` }}
                        />
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={submitAll}
                        disabled={submitting}
                        className="px-8 py-2 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 shadow-md disabled:opacity-60 flex items-center gap-2"
                    >
                        {submitting ? 'Submitting...' : '🎯 Submit Test'}
                    </button>
                </div>
            </div>

            <style>{`
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default ShortAnswerTest;
