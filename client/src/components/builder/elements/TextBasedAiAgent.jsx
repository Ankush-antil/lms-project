const TextChatAIBuilder = ({
    element,
    onUpdateField
}) => {
    return (
        <div className="space-y-4 bg-white p-4 border border-slate-150 rounded-2xl">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Agent Name</label>
                    <input
                        type="text"
                        value={element.agentName || 'AI Assistant'}
                        onChange={(e) => onUpdateField('agentName', e.target.value)}
                        placeholder="AI Support Representative"
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">Greeting Message</label>
                    <input
                        type="text"
                        value={element.greetingMessage || 'Hello! How can I help you today?'}
                        onChange={(e) => onUpdateField('greetingMessage', e.target.value)}
                        placeholder="Greeting dialog text"
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 outline-none"
                    />
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-505 uppercase tracking-wider block">AI System Persona / Prompt Instructions</label>
                <textarea
                    value={element.systemPersona || ''}
                    onChange={(e) => onUpdateField('systemPersona', e.target.value)}
                    placeholder="E.g., Act as a technical recruiter looking to hire a software engineer. Ask 3 tech questions."
                    rows={3}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:bg-white resize-none"
                />
            </div>
        </div>
    );
};

export default TextChatAIBuilder;
