import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { X, Loader2, Printer, Eye, Video, Volume2, Calendar, ShieldCheck, Mail, Phone, FileText, Globe } from 'lucide-react';

const PublicResponseModal = ({ isOpen, onClose, submission }) => {
    const [testDetails, setTestDetails] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && submission?.test?._id) {
            setLoading(true);
            setTestDetails(null);
            axios.get(`/api/tests/${submission.test._id}`)
                .then(res => {
                    setTestDetails(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error("Error fetching test details:", err);
                    setLoading(false);
                });
        }
    }, [isOpen, submission]);

    if (!isOpen || !submission) return null;

    const totalMarks = testDetails?.questions?.reduce((sum, q) => sum + (q.marks || 1), 0) || submission.answers?.reduce((sum, a) => sum + (Number(a.marks) || 0), 0) || 10;

    const handlePrint = () => {
        const testName = testDetails?.title || submission.test?.title || 'Test';
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error("Popup blocker prevented opening the print page.");
            return;
        }

        const questionsList = testDetails?.questions || submission.answers || [];
        const questionsHtml = questionsList.map((item, idx) => {
            // If item is a question from testDetails:
            const isTestQuestion = !!item.text;
            const qId = isTestQuestion ? item.id : item.questionId;
            const qText = isTestQuestion ? item.text : item.questionText;
            const qType = isTestQuestion ? item.type : item.questionType;
            const totalQMarks = isTestQuestion ? (item.marks || 1) : 1;

            const subAns = submission.answers?.find(a => a.questionId === qId);
            const marksEarned = subAns?.marks || 0;

            let answerContent = '';
            if (isTestQuestion && ['multiple choice', 'dropdown', 'checkboxes'].includes(qType?.toLowerCase())) {
                answerContent = `
                    <ul style="list-style: none; padding-left: 0; font-size: 13px;">
                        ${item.options?.map(opt => {
                            let isSelected = false;
                            if (qType?.toLowerCase() === 'checkboxes') {
                                let textAnswers = [];
                                if (Array.isArray(subAns?.textAnswer)) {
                                    textAnswers = subAns.textAnswer;
                                } else if (typeof subAns?.textAnswer === 'string') {
                                    if (subAns.textAnswer.startsWith('[')) {
                                        try { textAnswers = JSON.parse(subAns.textAnswer); } catch (e) { textAnswers = subAns.textAnswer.split(','); }
                                    } else {
                                        textAnswers = subAns.textAnswer.split(',');
                                    }
                                }
                                isSelected = textAnswers.map(t => t?.trim()?.toLowerCase()).includes(opt.text?.trim()?.toLowerCase());
                            } else {
                                isSelected = subAns?.textAnswer?.trim()?.toLowerCase() === opt.text?.trim()?.toLowerCase();
                            }
                            const isCorrect = opt.isCorrect;

                            let marker = qType?.toLowerCase() === 'checkboxes' ? '□' : '○';
                            let style = 'color: #475569;';
                            if (isSelected && isCorrect) {
                                style = 'color: #16a34a; font-weight: bold; background-color: #f0fdf4; padding: 4px; border-radius: 4px;';
                                marker = qType?.toLowerCase() === 'checkboxes' ? '☑' : '●';
                            } else if (isSelected && !isCorrect) {
                                style = 'color: #dc2626; font-style: italic; background-color: #fef2f2; padding: 4px; border-radius: 4px;';
                                marker = qType?.toLowerCase() === 'checkboxes' ? '☒' : '●';
                            } else if (isCorrect) {
                                style = 'color: #16a34a; font-weight: bold;';
                            }

                            return `<li style="margin-bottom: 6px; ${style}">${marker} ${opt.text} ${isSelected ? '<strong>(Selected)</strong>' : ''} ${isCorrect ? '<span style="font-size: 10px; color: #16a34a; margin-left: 6px;">✓ Correct</span>' : ''}</li>`;
                        }).join('')}
                    </ul>
                `;
            } else {
                if (subAns?.audioData) {
                    answerContent = `<p style="font-style: italic; color: #475569;">[Audio Recording Answered]</p>`;
                } else if (subAns?.videoData) {
                    answerContent = `<p style="font-style: italic; color: #475569;">[Video Recording Answered]</p>`;
                } else {
                    answerContent = `<p style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; white-space: pre-wrap; font-size: 13px;">${subAns?.textAnswer || 'No answer submitted'}</p>`;
                }
            }

            return `
                <div style="margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 10px; font-size: 14px;">
                        <span>Q${idx + 1}. ${qText}</span>
                        <span style="font-size: 12px; color: #4f46e5; background: #eeebff; padding: 2px 8px; border-radius: 4px;">Score: ${marksEarned} / ${totalQMarks} pts</span>
                    </div>
                    <div style="margin-top: 6px;">${answerContent}</div>
                    ${subAns?.feedback ? `<div style="margin-top: 8px; font-size: 12px; color: #7c3aed; background: #f5f3ff; padding: 8px; border-radius: 6px; border-left: 3px solid #7c3aed;"><strong>Feedback:</strong> ${subAns.feedback}</div>` : ''}
                </div>
            `;
        }).join('') || '';

        printWindow.document.write(`
            <html>
            <head>
                <title>${testName} - Response by ${submission.name}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; line-height: 1.5; }
                    h1 { color: #0b1329; margin-bottom: 5px; font-size: 24px; font-weight: 800; }
                    .meta-box { border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 24px 0; background: #f8fafc; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px; }
                    .meta-item { display: flex; flex-direction: column; }
                    .meta-label { font-weight: bold; color: #64748b; font-size: 11px; text-transform: uppercase; tracking-wider; margin-bottom: 2px; }
                    .meta-value { color: #1e293b; font-weight: 605; }
                    .score-badge { grid-column: span 2; background: #e0e7ff; color: #4338ca; font-weight: 900; text-align: center; padding: 12px; border-radius: 12px; font-size: 18px; margin-top: 8px; }
                    h2 { font-size: 18px; margin-top: 36px; margin-bottom: 20px; color: #0b1329; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; font-weight: 700; }
                </style>
            </head>
            <body>
                <h1>${testName}</h1>
                <p style="color: #64748b; font-size: 12px; margin-top: 4px;">Submitted on: ${new Date(submission.submittedAt).toLocaleString()}</p>
                
                <div class="meta-box">
                    <div class="meta-item"><span class="meta-label">Candidate Name</span><span class="meta-value">${submission.name}</span></div>
                    <div class="meta-item"><span class="meta-label">Email</span><span class="meta-value" style="font-family: monospace;">${submission.email}</span></div>
                    <div class="meta-item"><span class="meta-label">Phone</span><span class="meta-value">${submission.phone || 'N/A'}</span></div>
                    <div class="meta-item"><span class="meta-label">Organization</span><span class="meta-value">${submission.organization || 'N/A'}</span></div>
                    <div class="meta-item"><span class="meta-label">IP Address</span><span class="meta-value">${submission.ipAddress || 'N/A'}</span></div>
                    <div class="meta-item"><span class="meta-label">Device</span><span class="meta-value">${submission.deviceInfo || 'N/A'}</span></div>
                    <div class="score-badge">TOTAL SCORE: ${submission.score} / ${totalMarks} pts</div>
                </div>
                
                <h2>Response Details</h2>
                ${questionsHtml}
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 font-sans animate-fade-in">
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-[30px] shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col animate-slide-up">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-150 bg-white">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Eye size={20} className="text-indigo-600" />
                            <span>Response: {submission.name}</span>
                        </h3>
                        <p className="text-xs text-slate-405 mt-1">
                            Assessment: <span className="font-bold text-slate-600">{testDetails?.title || submission.test?.title || 'Public Test'}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-150 rounded-xl transition-all flex items-center gap-1.5 text-xs font-bold bg-white cursor-pointer"
                            title="Print Response"
                        >
                            <Printer size={15} />
                            <span>Print</span>
                        </button>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-50 rounded-full transition-colors cursor-pointer">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24 gap-3">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            <span className="text-sm font-semibold text-slate-400">Loading assessment details...</span>
                        </div>
                    ) : (
                        <>
                            {/* Metadata Card */}
                            <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 text-xs font-semibold text-slate-600">
                                    <div>
                                        <span className="text-[10px] font-black text-slate-405 uppercase tracking-widest block mb-1">Candidate Details</span>
                                        <span className="text-slate-800 font-bold block">{submission.name}</span>
                                        <span className="text-[11px] text-slate-400 font-mono block mt-0.5">{submission.email}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-slate-405 uppercase tracking-widest block mb-1">Phone & Org</span>
                                        <span className="text-slate-800 block">{submission.phone || 'N/A'}</span>
                                        <span className="text-[11px] text-slate-400 block mt-0.5">{submission.organization || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black text-slate-405 uppercase tracking-widest block mb-1">IP & Device</span>
                                        <span className="text-slate-800 block truncate" title={submission.deviceInfo}>{submission.ipAddress || 'N/A'}</span>
                                        <span className="text-[10px] text-slate-400 block truncate mt-0.5" title={submission.deviceInfo}>
                                            {submission.deviceInfo ? submission.deviceInfo.split(')')[0].replace('Mozilla/5.0 (', '') : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        <span className="text-[10px] font-black text-slate-405 uppercase tracking-widest block mb-1">Sub Total Score</span>
                                        <span className="text-sm font-black text-indigo-605 bg-indigo-50/70 border border-indigo-100 px-3.5 py-1.5 rounded-xl font-mono text-center">
                                            {submission.score} / {totalMarks} pts
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-4 text-[11px] font-bold text-slate-450">
                                    <span className="flex items-center gap-1.5"><Calendar size={14} /> Submitted: {formatDate(submission.submittedAt)}</span>
                                    <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Status: <span className="text-emerald-600 font-extrabold capitalize">{submission.status || 'submitted'}</span></span>
                                </div>
                            </div>

                            {/* Response details */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Response Questions</h3>
                                
                                {(() => {
                                    const questionsList = testDetails?.questions || submission.answers || [];
                                    if (questionsList.length === 0) {
                                        return (
                                            <div className="bg-white p-6 rounded-2xl border border-slate-150 text-center text-slate-400 text-xs font-semibold">
                                                No question details or answers found in this response.
                                            </div>
                                        );
                                    }

                                    return questionsList.map((item, idx) => {
                                        const isTestQuestion = !!item.text;
                                        const qId = isTestQuestion ? item.id : item.questionId;
                                        const qText = isTestQuestion ? item.text : item.questionText;
                                        const qType = isTestQuestion ? item.type : item.questionType;
                                        const totalQMarks = isTestQuestion ? (item.marks || 1) : 1;

                                        const ans = submission.answers?.find(a => a.questionId === qId);
                                        const marksEarned = ans?.marks || 0;
                                        const isCorrect = Number(marksEarned) > 0;
                                        const isChoice = ['multiple choice', 'dropdown', 'checkboxes'].includes(qType?.toLowerCase());

                                        return (
                                            <div 
                                                key={qId || idx} 
                                                className={`bg-white p-5 border rounded-2xl shadow-sm space-y-4 transition-all ${
                                                    isChoice 
                                                        ? isCorrect 
                                                            ? 'border-emerald-150 bg-emerald-50/5' 
                                                            : 'border-rose-150 bg-rose-50/5'
                                                        : 'border-slate-150'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start gap-4">
                                                    <div>
                                                        <h4 className="text-sm font-bold text-slate-800">
                                                            <span className="text-slate-450 mr-1.5 font-bold">Q{idx + 1}.</span> {qText}
                                                        </h4>
                                                        <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                                            {qType || 'Answer'}
                                                        </span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border ${
                                                            isCorrect 
                                                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                                                : 'bg-rose-50 border-rose-100 text-rose-605'
                                                        }`}>
                                                            {marksEarned} / {totalQMarks} pts
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Answer rendering */}
                                                {isChoice && isTestQuestion ? (
                                                    <div className="space-y-2 pt-1.5">
                                                        {item.options?.map((opt, oIdx) => {
                                                            let isSelected = false;
                                                            if (qType.toLowerCase() === 'checkboxes') {
                                                                let textAnswers = [];
                                                                if (Array.isArray(ans?.textAnswer)) {
                                                                    textAnswers = ans.textAnswer;
                                                                } else if (typeof ans?.textAnswer === 'string') {
                                                                    if (ans.textAnswer.startsWith('[')) {
                                                                        try { textAnswers = JSON.parse(ans.textAnswer); } catch (e) { textAnswers = ans.textAnswer.split(','); }
                                                                    } else {
                                                                        textAnswers = ans.textAnswer.split(',');
                                                                    }
                                                                }
                                                                isSelected = textAnswers.map(t => t?.trim()?.toLowerCase()).includes(opt.text?.trim()?.toLowerCase());
                                                            } else {
                                                                isSelected = ans?.textAnswer?.trim()?.toLowerCase() === opt.text?.trim()?.toLowerCase();
                                                            }

                                                            const optCorrect = opt.isCorrect;

                                                            let containerClass = 'border-slate-150 bg-slate-50/50 text-slate-600';
                                                            let icon = <div className="w-4 h-4 rounded-full border border-slate-300" />;

                                                            if (isSelected && optCorrect) {
                                                                containerClass = 'border-emerald-250 bg-emerald-50 text-emerald-900';
                                                                icon = (
                                                                    <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-bold">
                                                                        ✓
                                                                    </div>
                                                                );
                                                            } else if (isSelected && !optCorrect) {
                                                                containerClass = 'border-rose-250 bg-rose-50 text-rose-900';
                                                                icon = (
                                                                    <div className="w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold">
                                                                        ✗
                                                                    </div>
                                                                );
                                                            } else if (optCorrect) {
                                                                containerClass = 'border-emerald-150 bg-emerald-50/30 text-emerald-850';
                                                                icon = (
                                                                    <div className="w-4 h-4 rounded-full border border-emerald-400 flex items-center justify-center text-[10px] text-emerald-600 font-bold">
                                                                        ✓
                                                                    </div>
                                                                );
                                                            }

                                                            return (
                                                                <div key={oIdx} className={`flex items-center gap-3 p-3 border rounded-xl text-xs font-semibold ${containerClass}`}>
                                                                    {icon}
                                                                    <span className="flex-1">{opt.text}</span>
                                                                    {isSelected && <span className="text-[9px] font-black uppercase tracking-wider bg-black/5 px-1.5 py-0.5 rounded">Selected</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="pt-1 text-xs">
                                                        {ans?.audioData ? (
                                                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Volume2 size={13} /> Voice Recording Response</span>
                                                                <audio src={ans.audioData} controls className="w-full max-w-md h-8" />
                                                            </div>
                                                        ) : ans?.videoData ? (
                                                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Video size={13} /> Video Recording Response</span>
                                                                <video src={ans.videoData} controls className="w-full max-w-md rounded-xl border border-slate-300" />
                                                            </div>
                                                        ) : (
                                                            <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Text Response</span>
                                                                <p className="text-slate-700 font-medium whitespace-pre-wrap">{ans?.textAnswer || 'No response submitted'}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Answer feedback */}
                                                {ans?.feedback && (
                                                    <div className="mt-3 text-xs text-indigo-650 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 border-l-4 border-l-indigo-550 font-semibold">
                                                        <span className="font-extrabold uppercase tracking-wide text-[10px] block mb-0.5">Evaluation Feedback</span>
                                                        <p className="font-medium text-indigo-700">{ans.feedback}</p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </>
                    )}
                </div>

                <style>{`
                    .animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
                    .animate-slide-up { animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes slideUp { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                `}</style>
            </div>
        </div>,
        document.body
    );
};

export default PublicResponseModal;
