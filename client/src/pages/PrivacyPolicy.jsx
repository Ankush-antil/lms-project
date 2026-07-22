import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, Lock, Mail, FileText, Server, Smartphone, Eye, CheckCircle, AlertTriangle, Key, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('privacy');

    return (
        <div style={{ minHeight: '100vh', background: '#f1f5f9', color: '#1e293b', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', paddingBottom: '80px' }}>
            
            {/* Top Navigation Header */}
            <header style={{ background: '#0f172a', color: '#fff', padding: '14px 24px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '8px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <ArrowLeft size={15} /> Back
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShieldCheck size={18} color="#6366f1" />
                        <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.01em' }}>Digital Study Academy — Legal & Security Hub</span>
                    </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                    App: <strong>DS Notebook</strong> | Platform: <strong>LMS Portal</strong>
                </div>
            </header>

            {/* Main Document Container */}
            <div style={{ maxWidth: '960px', margin: '24px auto 0', padding: '0 16px' }}>
                
                {/* Header Title Card */}
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', padding: '28px 36px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                                Enterprise Legal Documentation & Regulatory Compliance Suite
                            </div>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                                Digital Study Academy Legal Center
                            </h1>
                            <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                                Official Terms, Cyber Security Protocols, IP Safeguards & Privacy Rules for DS Notebook / LMS Portal
                            </div>
                        </div>
                        <div style={{ background: '#eef2ff', padding: '8px 14px', borderRadius: '10px', border: '1px solid #c7d2fe', fontSize: '0.75rem', fontWeight: 800, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Lock size={14} /> Play Store & App Store Verified
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', overflowX: 'auto' }}>
                        {[
                            { id: 'privacy', label: '1. Privacy & DPDP Policy', icon: ShieldCheck },
                            { id: 'terms', label: '2. Terms of Service & EULA', icon: FileText },
                            { id: 'ip', label: '3. Intellectual Property', icon: Key },
                            { id: 'ugc', label: '4. UGC & Abuse Prohibition', icon: AlertTriangle },
                            { id: 'security', label: '5. Cyber Security Controls', icon: Server },
                            { id: 'deletion', label: '6. Account Deletion Portal', icon: Trash2 }
                        ].map(tab => {
                            const Icon = tab.icon;
                            const isSelected = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '8px 14px', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 800,
                                        border: 'none', background: isSelected ? '#0f172a' : '#f8fafc',
                                        color: isSelected ? '#ffffff' : '#64748b', cursor: 'pointer',
                                        transition: 'all 0.15s ease', whiteSpace: 'nowrap',
                                        boxShadow: isSelected ? '0 2px 8px rgba(15,23,42,0.15)' : 'none'
                                    }}
                                >
                                    <Icon size={14} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content Box */}
                <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', padding: '36px 40px' }}>
                    
                    {/* TAB 1: PRIVACY POLICY */}
                    {activeTab === 'privacy' && (
                        <div style={{ fontSize: '0.88rem', lineHeight: '1.75', color: '#334155', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                                1. Privacy Policy & Compliance Framework
                            </h2>

                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>1.1 Statutory Basis & Compliance Mapping</h3>
                                <p>
                                    This policy is drafted in compliance with the <strong>Digital Personal Data Protection Act 2023 (DPDP Act - India)</strong>, <strong>Information Technology Act 2000</strong> (and 2021 Intermediary Guidelines), <strong>EU GDPR 2016/679</strong>, <strong>FERPA (U.S.)</strong>, and <strong>COPPA</strong>. It governs all data operations on <strong>DS Notebook</strong> and the <strong>LMS Portal</strong> by <strong>Digital Study Academy</strong>.
                                </p>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>1.2 Data We Collect</h3>
                                <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
                                    <li><strong>Account Profile Data:</strong> Full Name, Email Address, Mobile Phone Number, Admission/ID Code, User Role (Student, Teacher, Parent, Admin, Editor, Accountant, Marketer, Staff, Guest), and Institute association.</li>
                                    <li><strong>Academic & Evaluation Data:</strong> Daily physical & LMS attendance logs, digital notebook submissions, exam answer scripts, test metrics, fee payments, and teacher notes.</li>
                                    <li><strong>Mobile Hardware Access Permissions:</strong>
                                        <div style={{ margin: '8px 0', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #6366f1' }}>
                                            • <strong>Location Access:</strong> Used strictly for verifying institute campus attendance geofencing. Continuous background tracking is disabled.<br />
                                            • <strong>Camera Access:</strong> Used for scanning attendance QR codes, uploading profile avatars, snapping solution papers, and live interactive video classes.<br />
                                            • <strong>Microphone Access:</strong> Used for oral exam submissions, voice notes, web calling tools, and virtual classroom audio.<br />
                                            • <strong>Storage & Gallery Access:</strong> Used for saving digital study notes, course PDFs, and submitting PDF assignments.
                                        </div>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>1.3 Children & Student Privacy Protection</h3>
                                <p>
                                    Minor accounts (under 18) are operated under institutional authority and parental registration. Parents can view attendance, test scores, and fee records. We strictly enforce a policy of <strong>never selling, trading, or monetizing student data</strong> to third-party commercial advertisers.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: TERMS OF SERVICE */}
                    {activeTab === 'terms' && (
                        <div style={{ fontSize: '0.88rem', lineHeight: '1.75', color: '#334155', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                                2. Terms of Service & End User License Agreement (EULA)
                            </h2>

                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>2.1 License & Software Usage Rights</h3>
                                <p>
                                    Digital Study Academy grants users a revocable, non-exclusive, non-transferable license to access <strong>DS Notebook</strong> and <strong>LMS Portal</strong> exclusively for educational and institute management activities. Commercial resale or unauthorized distribution is prohibited.
                                </p>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>2.2 User Account Responsibilities</h3>
                                <p>
                                    Users are responsible for safeguarding login credentials. Sharing accounts across unauthorized individuals or attempting multi-device credential abuse is forbidden and subject to account locking.
                                </p>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>2.3 Limitation of Liability & Indemnification</h3>
                                <p>
                                    Digital Study Academy provides software services on an "as-is" basis. To the extent permitted by law, Digital Study Academy is not liable for indirect, incidental, or consequential losses stemming from network interruptions or unauthorized third-party access.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: INTELLECTUAL PROPERTY */}
                    {activeTab === 'ip' && (
                        <div style={{ fontSize: '0.88rem', lineHeight: '1.75', color: '#334155', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                                3. Intellectual Property, Source Code & Anti-Piracy Policy
                            </h2>

                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>3.1 Proprietary Ownership Statement</h3>
                                <p>
                                    All source code (React, React Native, Expo, Node.js, Express), database structures (MongoDB schemas), APIs, UI/UX designs, trademarks ("Digital Study Academy", "DS Notebook", "LMS Portal"), digital notebooks, test question banks, and lecture media are the exclusive property of <strong>Digital Study Academy</strong>.
                                </p>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626', margin: '0 0 6px' }}>3.2 Reverse Engineering & Anti-Cloning Prohibition</h3>
                                <p style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', color: '#991b1b', fontWeight: 600 }}>
                                    🚫 Reverse engineering, decompiling, disassembling, extracting source code, cloning UI layouts, or scraping database content is strictly illegal under Sections 65 and 66 of the Indian IT Act 2000 and Indian Copyright Act 1957.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: UGC & CONTENT MODERATION */}
                    {activeTab === 'ugc' && (
                        <div style={{ fontSize: '0.88rem', lineHeight: '1.75', color: '#334155', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                                4. User-Generated Content (UGC) & Abuse Prevention Policy
                            </h2>

                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#dc2626', margin: '0 0 6px' }}>4.1 Zero Tolerance Abuse Policy</h3>
                                <p style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', color: '#991b1b', fontWeight: 600 }}>
                                    ⚠️ <strong>DS Notebook is exclusively a paperless educational system.</strong> Uploading, sending, or publishing non-educational, explicit, vulgar, violent, offensive, or illegal videos, images, messages, or files is strictly prohibited.
                                </p>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>4.2 Administrative Enforcement & Law Enforcement Reporting</h3>
                                <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
                                    <li><strong>Immediate Deletion:</strong> Any non-study or abusive content will be deleted immediately without prior warning.</li>
                                    <li><strong>Permanent Banning:</strong> Violators face instant account revocation and permanent banning across the network.</li>
                                    <li><strong>Police Escalation:</strong> Criminal abuse or illegal content will be reported directly to law enforcement authorities alongside user telemetry, mobile numbers, and IP logs.</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* TAB 5: CYBER SECURITY */}
                    {activeTab === 'security' && (
                        <div style={{ fontSize: '0.88rem', lineHeight: '1.75', color: '#334155', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                                5. Cyber Security, Encryption & System Control Policies
                            </h2>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '10px' }}>
                                    <div style={{ fontWeight: 800, color: '#0f172a' }}>🔒 Encryption Standards</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>TLS 1.3 in transit, AES-256 for cloud assets & databases. Passwords hashed using bcrypt (10 rounds).</div>
                                </div>
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '10px' }}>
                                    <div style={{ fontWeight: 800, color: '#0f172a' }}>🛡️ Role-Based Access (RBAC)</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Enforced across 9 user roles with strict JWT token signatures and audit log tracking.</div>
                                </div>
                                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '10px' }}>
                                    <div style={{ fontWeight: 800, color: '#0f172a' }}>⚡ Rate Limiting & Defense</div>
                                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Automatic rate-limiting and bot-protection to prevent brute-force attacks and DDoS abuse.</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 6: ACCOUNT DELETION PORTAL */}
                    {activeTab === 'deletion' && (
                        <div style={{ fontSize: '0.88rem', lineHeight: '1.75', color: '#334155', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                                6. Mandatory Account & Data Deletion Portal
                            </h2>

                            <p>
                                In accordance with Google Play Console, Apple App Store, and DPDP Act 2023 requirements, users have the full right to request the deletion of their account and associated data.
                            </p>

                            <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', padding: '20px', borderRadius: '12px' }}>
                                <div style={{ fontWeight: 800, color: '#3730a3', fontSize: '0.95rem', marginBottom: '6px' }}>
                                    📩 Submit Account Deletion Request
                                </div>
                                <p style={{ margin: '0 0 10px', fontSize: '0.82rem', color: '#475569' }}>
                                    To permanently erase your account, email our Data Protection Office with your registered details:
                                </p>
                                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4f46e5' }}>
                                    Email: <a href="mailto:support@digitalstudyacademy.com?subject=ACCOUNT%20DELETION%20REQUEST" style={{ color: '#4f46e5', textDecoration: 'underline' }}>support@digitalstudyacademy.com</a>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '6px' }}>
                                    Processing Time: Verified deletion requests are executed within 30 days. Anonymized data may be retained solely for financial tax compliance.
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Legal Notice */}
                    <div style={{ marginTop: '36px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
                        <p style={{ margin: '0 0 6px', fontSize: '0.78rem', color: '#0f172a', fontWeight: 700 }}>
                            DS Notebook and Digital Study Academy are proprietary educational software and brands. Unauthorized copying, reproduction, reverse engineering, redistribution, or commercial use is strictly prohibited.
                        </p>
                        <span style={{ color: '#94a3b8', fontSize: '0.72rem', fontWeight: 600 }}>
                            © 2026 Digital Study Academy. All Rights Reserved. Enterprise Compliance & Legal Center.
                        </span>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
