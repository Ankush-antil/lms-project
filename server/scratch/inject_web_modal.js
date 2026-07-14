const fs = require('fs');
const path = require('path');

const filePath = 'c:\\lms-project\\client\\src\\components\\common\\ChangeRoleModal.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Declare state variables at the beginning of ChangeRoleModal
const targetState = `    const [switchingToRole, setSwitchingToRole] = useState('');
    const [rolePassword, setRolePassword] = useState('');`;

const replacementState = `    const [switchingToRole, setSwitchingToRole] = useState('');
    const [rolePassword, setRolePassword] = useState('');
    const [institutes, setInstitutes] = useState([]);
    const [selectedInst, setSelectedInst] = useState('');
    const [selectedSectionContext, setSelectedSectionContext] = useState('A');
    const [selectedCoursesContext, setSelectedCoursesContext] = useState([]);
    const [selectedSectionsContext, setSelectedSectionsContext] = useState(['A']);
    const [showConfigForRole, setShowConfigForRole] = useState('');`;

content = content.replace(targetState, replacementState);

// 2. Update hasAdminPrivilege to include Institute role
const targetAdminPriv = `    const hasAdminPrivilege = user?.role === 'Admin' || (user?.allowedRoles && user.allowedRoles.includes('Admin'));`;
const replacementAdminPriv = `    const hasAdminPrivilege = user?.role === 'Admin' || user?.role === 'Institute' || (user?.allowedRoles && (user.allowedRoles.includes('Admin') || user.allowedRoles.includes('Institute')));`;

content = content.replace(targetAdminPriv, replacementAdminPriv);

// 3. Update useEffect to fetch institutes
const targetEffect = `            fetchCourses();
            fetchUserRequests();
        }
    }, [isOpen]);`;

const replacementEffect = `            fetchCourses();
            fetchUserRequests();
            if (hasAdminPrivilege) {
                const fetchInstitutes = async () => {
                    try {
                        const { data } = await axios.get('/api/setup/institutes');
                        setInstitutes(data || []);
                    } catch (error) {
                        console.error("Failed to load institutes:", error);
                    }
                };
                fetchInstitutes();
            }
        }
    }, [isOpen, hasAdminPrivilege]);`;

content = content.replace(targetEffect, replacementEffect);

// 4. Update handleSwitchRole method to accept options
const targetSwitch = `    const handleSwitchRole = async (targetRole, passwordVal = '') => {
        if (targetRole === user.role) return;
        setSubmitting(true);
        try {
            const { data } = await axios.put('/api/users/switch-role', { 
                newRole: targetRole,
                password: passwordVal || undefined
            });`;

const replacementSwitch = `    const handleSwitchRole = async (targetRole, passwordVal = '', options = {}) => {
        if (targetRole === user.role) return;
        setSubmitting(true);
        try {
            const { data } = await axios.put('/api/users/switch-role', { 
                newRole: targetRole,
                password: passwordVal || undefined,
                ...options
            });`;

content = content.replace(targetSwitch, replacementSwitch);

// 5. Update Allowed Roles click handler in the grid button
const targetGridClick = `                                        onClick={() => {
                                            if (user?.role === 'Student') {
                                                setSwitchingToRole(roleName);
                                                setRolePassword('');
                                            } else {
                                                handleSwitchRole(roleName);
                                            }
                                        }}`;

const replacementGridClick = `                                        onClick={() => {
                                            if (hasAdminPrivilege && roleName !== 'Admin') {
                                                setShowConfigForRole(roleName);
                                                setSelectedInst(user.institute?._id || user.institute || '');
                                                setSelectedCourse('');
                                                setSelectedSectionContext('A');
                                                setSelectedCoursesContext([]);
                                                setSelectedSectionsContext(['A']);
                                            } else if (user?.role === 'Student') {
                                                setSwitchingToRole(roleName);
                                                setRolePassword('');
                                            } else {
                                                handleSwitchRole(roleName);
                                            }
                                        }}`;

content = content.replace(targetGridClick, replacementGridClick);

// 6. Append dynamic configuration modal overlay at the bottom of JSX (before </div> of component wrapper)
const targetBottom = `            {switchingToRole && (`;
const replacementBottom = `            {showConfigForRole && (
                <div className="fixed inset-0 z-[1000] bg-slate-955/65 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#0b1329] text-white w-full max-w-md rounded-3xl p-6 border border-slate-800 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <h3 className="text-base font-black text-slate-100 mb-1">Configure Context</h3>
                        <p className="text-[11px] text-slate-400 font-bold mb-4">
                            Select parameters to switch to the <span className="text-indigo-400">{showConfigForRole}</span> role.
                        </p>
                        
                        <div className="space-y-4">
                            {/* Institute Selector */}
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Institute *</label>
                                <select
                                    value={selectedInst}
                                    onChange={(e) => setSelectedInst(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2.5 px-4 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    required
                                >
                                    <option value="">Choose campus...</option>
                                    {institutes.map(inst => (
                                        <option key={inst._id} value={inst._id}>{inst.name} ({inst.code})</option>
                                    ))}
                                </select>
                            </div>

                            {/* Student Role Configuration */}
                            {showConfigForRole === 'Student' && (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Course *</label>
                                        <select
                                            value={selectedCourse}
                                            onChange={(e) => setSelectedCourse(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2.5 px-4 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                                            required
                                        >
                                            <option value="">Choose course...</option>
                                            {courses.map(c => (
                                                <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Select Section</label>
                                        <select
                                            value={selectedSectionContext}
                                            onChange={(e) => setSelectedSectionContext(e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2.5 px-4 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        >
                                            {['A', 'B', 'C', 'D', 'E', 'F'].map(sec => (
                                                <option key={sec} value={sec}>Section {sec}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}

                            {/* Teacher Role Configuration */}
                            {showConfigForRole === 'Teacher' && (
                                <>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assigned Courses</label>
                                        <div className="bg-slate-900 border border-slate-850 rounded-xl p-3 max-h-[110px] overflow-y-auto space-y-1">
                                            {courses.map(c => {
                                                const isChecked = selectedCoursesContext.includes(c._id);
                                                return (
                                                    <label key={c._id} className="flex items-center gap-2 text-xs text-slate-300 font-semibold cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => {
                                                                setSelectedCoursesContext(prev =>
                                                                    isChecked ? prev.filter(id => id !== c._id) : [...prev, c._id]
                                                                );
                                                            }}
                                                            className="accent-indigo-650"
                                                        />
                                                        {c.name} ({c.code})
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Assigned Sections</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['A', 'B', 'C', 'D', 'E', 'F'].map(sec => {
                                                const isChecked = selectedSectionsContext.includes(sec);
                                                return (
                                                    <button
                                                        key={sec}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedSectionsContext(prev =>
                                                                isChecked ? prev.filter(s => s !== sec) : [...prev, sec]
                                                            );
                                                        }}
                                                        className={"px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (
                                                            isChecked ? 'bg-indigo-600 text-white' : 'bg-slate-850 text-slate-400 hover:bg-slate-800'
                                                        )}
                                                    >
                                                        {sec}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-5 border-t border-slate-850 mt-5">
                            <button
                                type="button"
                                onClick={() => setShowConfigForRole('')}
                                className="px-4 py-2.5 text-[10px] font-bold text-slate-400 hover:text-white transition-all bg-transparent border border-slate-800 rounded-xl cursor-pointer"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (!selectedInst) {
                                        alert("Please select an institute");
                                        return;
                                    }
                                    if (showConfigForRole === 'Student' && !selectedCourse) {
                                        alert("Please select a course");
                                        return;
                                    }
                                    handleSwitchRole(showConfigForRole, '', {
                                        institute: selectedInst,
                                        courseId: showConfigForRole === 'Student' ? selectedCourse : undefined,
                                        section: showConfigForRole === 'Student' ? selectedSectionContext : undefined,
                                        courseIds: showConfigForRole === 'Teacher' ? selectedCoursesContext : undefined,
                                        sections: showConfigForRole === 'Teacher' ? selectedSectionsContext : undefined
                                    });
                                }}
                                className="px-5 py-2.5 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all rounded-xl cursor-pointer shadow-lg disabled:opacity-50"
                                disabled={submitting}
                            >
                                {submitting ? "Switching..." : "Confirm & Switch"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {switchingToRole && (`;

content = content.replace(targetBottom, replacementBottom);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully injected switch role context suboptions to web ChangeRoleModal!');
