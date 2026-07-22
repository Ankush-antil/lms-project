import React from 'react';
import { ArrowLeft, ShieldCheck, Lock, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

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
                        <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.01em' }}>DS Notebook & LMS Portal</span>
                    </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                    Legal Terms & Privacy Policy
                </div>
            </header>

            {/* Document Container */}
            <div style={{ maxWidth: '860px', margin: '30px auto 0', padding: '0 16px' }}>
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', padding: '40px 48px' }}>
                    
                    {/* Document Header */}
                    <div style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '24px', marginBottom: '32px' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                            Official Legal Document
                        </div>
                        <h1 style={{ fontSize: '1.9rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                            Privacy Policy & Terms of Service
                        </h1>
                        <div style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                            Application Name: <strong>DS Notebook / LMS Portal</strong> • Effective Date: July 22, 2026 • Version: 1.0.0
                        </div>
                    </div>

                    {/* Table of Contents Box */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px 20px', marginBottom: '32px' }}>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#334155', textTransform: 'uppercase', tracking: '0.05em', marginBottom: '10px' }}>
                            Table of Contents
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '6px', fontSize: '0.82rem', color: '#4f46e5', fontWeight: 600 }}>
                            <div>1. Core Purpose & Paperless Education</div>
                            <div>2. Information We Collect</div>
                            <div>3. Mobile Device Permissions</div>
                            <div>4. User Content & Abuse Prohibition</div>
                            <div>5. Data Use & Security Controls</div>
                            <div>6. Children & Student Privacy</div>
                            <div>7. Data Sharing & Third Parties</div>
                            <div>8. Account Termination & Rights</div>
                        </div>
                    </div>

                    {/* Document Body */}
                    <div style={{ fontSize: '0.88rem', lineHeight: '1.75', color: '#334155', display: 'flex', flexDirection: 'column', gap: '28px' }}>

                        {/* Section 1 */}
                        <section>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', margin: '0 0 12px' }}>
                                1. Core Purpose & Paperless Education Initiative
                            </h2>
                            <p>
                                <strong>DS Notebook (LMS Portal)</strong> is an educational management software application operating across Android mobile devices and web browsers. The primary purpose of this platform is strictly educational: facilitating paperless study ("Save Paper"), digital note-taking, online test evaluation, attendance management, fee tracking, and institute communication.
                            </p>
                            <p>
                                The platform is intended solely for verified academic activities conducted by students, teachers, parents, institute managers, and authorized administrators.
                            </p>
                        </section>

                        {/* Section 2 */}
                        <section>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', margin: '0 0 12px' }}>
                                2. Comprehensive Information We Collect
                            </h2>
                            <p>
                                To ensure secure authentication and proper delivery of educational services, we collect the following categories of data:
                            </p>
                            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                                <li><strong>Personal Identity Data:</strong> Full Name, Email Address, Mobile Phone Number, Admission/ID Number, Assigned Academic Role (Student, Teacher, Parent, Admin, Staff), and Institute Name.</li>
                                <li><strong>Academic & Attendance Records:</strong> Daily physical and LMS online attendance logs, test builder responses, assignment submissions, digital notes, teacher notes, and fee transaction logs.</li>
                                <li><strong>Technical & Session Data:</strong> Device model, operating system, IP address, login timestamps, active app usage duration, and session tokens.</li>
                            </ul>
                        </section>

                        {/* Section 3 */}
                        <section>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', margin: '0 0 12px' }}>
                                3. Mobile Device Permissions & Justification
                            </h2>
                            <p>
                                To enable essential portal functionality, the Android app requests access to device features. Each permission is requested explicitly and used strictly for academic operations:
                            </p>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #6366f1' }}>
                                    <strong style={{ color: '#0f172a' }}>• Location Access (GPS / Network Location):</strong> Used strictly for verifying institute geo-attendance marking, ensuring staff/students are on campus when recording physical attendance. Location data is never tracked continuously in the background.
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #6366f1' }}>
                                    <strong style={{ color: '#0f172a' }}>• Camera Access:</strong> Required for scanning attendance QR codes, uploading student profile avatars, taking photos of handwritten assignment sheets, and conducting video calling/live interactive study sessions.
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #6366f1' }}>
                                    <strong style={{ color: '#0f172a' }}>• Microphone Access:</strong> Required for live classroom voice interaction, submitting voice notes for oral tests, and web calling tools within the study portal.
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #6366f1' }}>
                                    <strong style={{ color: '#0f172a' }}>• Photos, Gallery & Media Storage Access:</strong> Required for saving study notebooks, downloading digital course PDFs, and uploading assignment solution files.
                                </div>
                                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', borderLeft: '3px solid #6366f1' }}>
                                    <strong style={{ color: '#0f172a' }}>• Phone State & Notifications:</strong> Used for account multi-factor authentication, security alerts, class schedule updates, and fee receipt push notifications.
                                </div>
                            </div>
                        </section>

                        {/* Section 4 */}
                        <section>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#dc2626', borderBottom: '1px solid #fee2e2', paddingBottom: '6px', margin: '0 0 12px' }}>
                                4. User-Generated Content (UGC) Policy & Strict Misuse Prohibition
                            </h2>
                            <p style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '14px 16px', borderRadius: '8px', color: '#991b1b', fontWeight: 600 }}>
                                ⚠️ <strong>Zero Tolerance Policy:</strong> DS Notebook is exclusively a study platform. Uploading, sharing, or transmitting any non-educational, inappropriate, offensive, vulgar, political, or illegal content is strictly forbidden.
                            </p>
                            <p>
                                All users (Students, Teachers, Staff, Admins) must comply with the following mandatory conduct rules:
                            </p>
                            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                                <li><strong>Prohibited Uploads:</strong> You may NOT upload, post, or send sexually explicit content, violent media, hateful messages, abusive language, copyright-infringed materials, spam, or unlawful files.</li>
                                <li><strong>Content Moderation:</strong> Platform administrators reserve the absolute right to inspect, filter, block, or delete any content uploaded to the portal that violates these terms.</li>
                                <li><strong>Immediate Account Termination:</strong> Any user found posting inappropriate videos, images, or messages will face immediate, permanent account termination without prior warning.</li>
                                <li><strong>Legal & Police Reporting:</strong> Illegal uploads, harassment, or severe violations will be reported directly to law enforcement agencies along with user IP logs and identity information.</li>
                                <li><strong>Platform Limitation of Liability:</strong> DS Notebook is an educational software provider. The platform bears no legal liability for unauthorized user-submitted content posted in breach of this policy.</li>
                            </ul>
                        </section>

                        {/* Section 5 */}
                        <section>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', margin: '0 0 12px' }}>
                                5. Data Protection, Encryption & Storage
                            </h2>
                            <p>
                                All data transmitted between the Android mobile application, web browser, and backend servers is encrypted using standard SSL/TLS (HTTPS) encryption protocols.
                            </p>
                            <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                                <li>Passwords are securely hashed using bcrypt encryption before storage.</li>
                                <li>We do <strong>NOT</strong> sell, trade, or rent user data, contact numbers, or student academic records to third-party commercial advertisers.</li>
                                <li>Database infrastructure is protected by firewalls, restricted IP access rules, and automated backup routines.</li>
                            </ul>
                        </section>

                        {/* Section 6 */}
                        <section>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', margin: '0 0 12px' }}>
                                6. Children's & Student Data Protection (COPPA / FERPA Compliance)
                            </h2>
                            <p>
                                Student accounts under the age of 18 are managed in strict coordination with educational institutes and registered parents. Parent accounts are linked to student profiles to provide transparent visibility over attendance logs, fee receipts, and test progress. No student personal information is collected for commercial profiling.
                            </p>
                        </section>

                        {/* Section 7 */}
                        <section>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', margin: '0 0 12px' }}>
                                7. Third-Party Service Providers
                            </h2>
                            <p>
                                We may utilize trusted third-party cloud infrastructure providers (such as Google Play Services, MongoDB Atlas, Cloud Storage servers) strictly for hosting app binaries, database management, and delivering push notifications. All third-party providers adhere to standard industry data protection compliance.
                            </p>
                        </section>

                        {/* Section 8 */}
                        <section>
                            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', margin: '0 0 12px' }}>
                                8. User Rights, Account Deletion & Contact Information
                            </h2>
                            <p>
                                Users have the right to request access to their stored personal profile data, request corrections, or request complete account and data deletion.
                            </p>
                            <p>
                                To submit a data deletion request or query regarding this legal policy, please contact our Data Protection Office:
                            </p>

                            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '16px 20px', borderRadius: '8px', marginTop: '12px' }}>
                                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>DS Notebook Legal & Privacy Support Team</div>
                                <div style={{ fontSize: '0.85rem', color: '#4f46e5', fontWeight: 700 }}>
                                    Email: <a href="mailto:support@digitalstudyacademy.com" style={{ color: '#4f46e5', textDecoration: 'underline' }}>support@digitalstudyacademy.com</a>
                                </div>
                                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '4px' }}>
                                    Portal Website: <a href="https://www.digitalstudyacademy.com" target="_blank" rel="noreferrer" style={{ color: '#64748b', textDecoration: 'underline' }}>www.digitalstudyacademy.com</a>
                                </div>
                            </div>
                        </section>

                    </div>

                    {/* Document Footer */}
                    <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
                        © 2026 DS Notebook / LMS Portal. All Rights Reserved. Official Legal Terms & Play Store Privacy Statement.
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
