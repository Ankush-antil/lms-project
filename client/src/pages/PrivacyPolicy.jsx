import React from 'react';
import { ArrowLeft, ShieldCheck, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    const handlePrint = () => {
        window.print();
    };

    return (
        <div style={{ minHeight: '100vh', background: '#ffffff', color: '#0f172a', fontFamily: 'Georgia, Times, "Times New Roman", serif', paddingBottom: '100px' }}>
            
            {/* Top Navigation Bar - Clean & Minimal */}
            <header className="no-print" style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', borderRadius: '6px', padding: '6px 14px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'sans-serif' }}
                    >
                        <ArrowLeft size={16} /> Back
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'sans-serif' }}>
                        <ShieldCheck size={20} color="#0f172a" />
                        <span style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>Digital Study Academy — Master Legal Documentation</span>
                    </div>
                </div>
                <button
                    onClick={handlePrint}
                    style={{ background: '#0f172a', color: '#ffffff', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'sans-serif' }}
                >
                    <Printer size={16} /> Print Official Document
                </button>
            </header>

            {/* Main Single Page Document Container */}
            <main style={{ maxWidth: '900px', margin: '40px auto 0', padding: '0 24px', lineHeight: '1.85', fontSize: '1rem' }}>
                
                {/* Official Header */}
                <div style={{ borderBottom: '3px double #0f172a', paddingBottom: '28px', marginBottom: '40px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.12em', fontFamily: 'sans-serif', marginBottom: '8px' }}>
                        Digital Study Academy • Official Enterprise Documentation
                    </div>
                    <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0f172a', margin: '0 0 12px', letterSpacing: '-0.02em' }}>
                        MASTER PRIVACY POLICY, TERMS OF SERVICE & CODE OF CONDUCT
                    </h1>
                    <div style={{ fontSize: '0.9rem', color: '#334155', fontStyle: 'italic' }}>
                        Governing Software Application: <strong>DS Notebook</strong> | Ecosystem: <strong>LMS Portal</strong><br />
                        Supported Platforms: Android App, iOS App, Web Application, Desktop Client, REST API Services<br />
                        Effective Date: July 22, 2026 • Document Control ID: DSA-LEGAL-2026-V10
                    </div>
                </div>

                {/* Document Table of Index */}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '24px 32px', marginBottom: '40px', fontFamily: 'sans-serif', borderRadius: '4px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px' }}>
                        Comprehensive Document Index
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '8px', fontSize: '0.85rem', color: '#1e293b', fontWeight: 600 }}>
                        <div>1. Platform Purpose & Paperless Education Initiative</div>
                        <div>2. Statutory Basis & International Legal Mapping</div>
                        <div>3. Detailed Data Collection & Scope</div>
                        <div>4. Hardware Permissions & Sensor Access</div>
                        <div>5. User Roles & Access Hierarchy</div>
                        <div>6. Strict User-Generated Content (UGC) Policy</div>
                        <div>7. Prohibited Conduct & Forbidden Actions</div>
                        <div>8. Enforcement Process & Violation Penalties</div>
                        <div>9. Intellectual Property & Source Code Ownership</div>
                        <div>10. Anti-Cloning, Anti-Piracy & Reverse Engineering</div>
                        <div>11. Technical Cyber Security Architecture</div>
                        <div>12. Data Retention Schedule & Backup Protocols</div>
                        <div>13. Mandatory Account & Data Deletion Mechanism</div>
                        <div>14. Children & Student Data Safeguards (COPPA/FERPA)</div>
                        <div>15. Third-Party Infrastructure & Analytics</div>
                        <div>16. Service Level Agreement (SLA) & Maintenance</div>
                        <div>17. Limitation of Liability & Legal Disclaimers</div>
                        <div>18. Indemnification & Legal Hold Policy</div>
                        <div>19. Governing Law, Arbitration & Jurisdiction</div>
                        <div>20. Statutory Grievance Redressal Mechanism</div>
                    </div>
                </div>

                {/* SECTION 1 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        1. PLATFORM PURPOSE & PAPERLESS EDUCATION INITIATIVE
                    </h2>
                    <p>
                        1.1. <strong>DS Notebook</strong> and the <strong>LMS Portal</strong> are proprietary educational technology software systems developed, owned, and operated by <strong>Digital Study Academy</strong> (hereinafter referred to as the "Company", "We", "Us", or "Our").
                    </p>
                    <p>
                        1.2. <strong>Core Academic Objective:</strong> The primary, singular purpose of this software platform across all deployed environments (Android mobile app, iOS mobile app, web portal, desktop client, and API integrations) is strictly educational. The platform is designed to provide digital study notebooks, course distribution, automated paperless exam evaluation, physical and online attendance tracking, student progress metrics, institute fee logging, and academic communication ("Save Paper Initiative").
                    </p>
                    <p>
                        1.3. <strong>Exclusivity of Use:</strong> All software tools, communication channels, file uploads, live video classes, and student workspaces within the application must be used exclusively for legitimate academic study and institutional administration. Use of the software for personal social networking, non-educational entertainment, commercial advertising, or unauthorized messaging is strictly prohibited.
                    </p>
                </section>

                {/* SECTION 2 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        2. STATUTORY BASIS & INTERNATIONAL LEGAL MAPPING
                    </h2>
                    <p>
                        2.1. This policy constitutes a binding legal agreement between Digital Study Academy and all users (including Students, Teachers, Parents, Institute Directors, Content Editors, Accountants, Marketers, Staff Members, and Visitors).
                    </p>
                    <p>
                        2.2. Data processing and platform operations strictly comply with the following statutory frameworks:
                    </p>
                    <ul>
                        <li><strong>Digital Personal Data Protection Act 2023 (DPDP Act - India):</strong> Mandating lawful consent, data minimization, purpose limitation, user data rights, and stringent penalties for data breaches.</li>
                        <li><strong>Information Technology Act 2000 (IT Act - India):</strong> Including Sections 43, 65, 66, 66B, 66C, 66D, 66E, 67, 67A, and Section 79 governing intermediary liability and cyber offenses.</li>
                        <li><strong>Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021:</strong> Regulating content moderation, mandatory due diligence, and statutory grievance redressal.</li>
                        <li><strong>General Data Protection Regulation (EU GDPR 2016/679):</strong> Enforcing cross-border data transfer safeguards, data portability, and the right to be forgotten.</li>
                        <li><strong>Family Educational Rights and Privacy Act (FERPA - 20 U.S.C. § 1232g):</strong> Protecting the privacy of student educational records and institutional transcripts.</li>
                        <li><strong>Children’s Online Privacy Protection Act (COPPA - 15 U.S.C. §§ 6501–6506):</strong> Regulating the collection of personal information from minors under the age of 13.</li>
                    </ul>
                </section>

                {/* SECTION 3 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        3. DETAILED DATA COLLECTION & TECHNICAL SCOPE
                    </h2>
                    <p>
                        3.1. To deliver secure educational services, Digital Study Academy collects and processes specific data categories:
                    </p>
                    <p>
                        <strong>A. Personal Identity & Profile Data:</strong> Full legal name, email address, mobile phone number, residential address, profile photograph, admission/registration number, assigned role, institute designation, and encrypted account credentials. Passwords are processed exclusively using salted bcrypt cryptographic hashing (`saltRounds = 10`) and are never stored or logged in plain text.
                    </p>
                    <p>
                        <strong>B. Academic Records & Evaluation Telemetry:</strong> Physical attendance logs, active LMS portal time spent logs, test scripts, multiple-choice question responses, short answer test evaluations, digital notebook entries, teacher remark notes, course progress meters, certificate issuances, and fee transaction logs.
                    </p>
                    <p>
                        <strong>C. System & Device Telemetry:</strong> Device hardware model, operating system architecture, unique device identifiers (UUID), IP address, browser user-agent string, active session duration, crash log traces, and push notification device tokens.
                    </p>
                </section>

                {/* SECTION 4 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        4. HARDWARE PERMISSIONS & SENSOR ACCESS EXPLANATION
                    </h2>
                    <p>
                        4.1. The Android and iOS mobile applications require access to hardware sensors for specific operational features. Every permission is requested explicitly with runtime user consent and is used strictly for academic verification:
                    </p>
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '16px 20px', margin: '12px 0', borderRadius: '4px', fontFamily: 'sans-serif', fontSize: '0.9rem' }}>
                        <p style={{ margin: '0 0 8px' }}><strong>• GPS & Network Location Access:</strong> Required strictly to verify physical institute campus geofencing when marking physical attendance. Location telemetry is captured only during the explicit action of marking attendance and is never continuously tracked in the background.</p>
                        <p style={{ margin: '0 0 8px' }}><strong>• Camera Access:</strong> Required to scan student attendance QR codes, capture student/staff profile pictures, upload handwritten test paper photos, and participate in live video classrooms.</p>
                        <p style={{ margin: '0 0 8px' }}><strong>• Microphone Access:</strong> Required for submitting audio test responses, recording voice study notes, participating in oral exams, and conducting web audio calls within the LMS portal.</p>
                        <p style={{ margin: '0 0 8px' }}><strong>• Storage, Photos & File Gallery Access:</strong> Required to save digital study notebooks offline, download PDF syllabus guides, and upload PDF/image assignment solutions.</p>
                        <p style={{ margin: 0 }}><strong>• Phone State & Push Notifications:</strong> Required for multi-factor authentication, critical account security alerts, exam schedule reminders, and fee receipt push alerts.</p>
                    </div>
                </section>

                {/* SECTION 5 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        5. USER ROLES & ACCESS CONTROL HIERARCHY
                    </h2>
                    <p>
                        5.1. System permissions are governed by strict Role-Based Access Control (RBAC) across 9 distinct user tiers:
                    </p>
                    <ol style={{ paddingLeft: '20px' }}>
                        <li><strong>Super Administrator (Admin):</strong> Complete administrative control over system configuration, user management, staff management, fee audits, subject creation, and overall system logs.</li>
                        <li><strong>Institute Director / Manager:</strong> Administrative oversight restricted to their specific educational institute branch, staff, enrolled students, fee records, and courses.</li>
                        <li><strong>Teacher:</strong> Access to assigned subjects, student rosters, physical attendance marking, test building, assignment grading, and teacher notes.</li>
                        <li><strong>Student:</strong> Access to enrolled courses, digital notebooks, test taking interface, attendance history, performance analytics, and fee status.</li>
                        <li><strong>Parent:</strong> Read-only access to linked student profiles, attendance records, test score cards, teacher feedback, and fee receipt logs.</li>
                        <li><strong>Editor:</strong> Access to course content creation, video uploading, syllabus editing, and test question bank creation.</li>
                        <li><strong>Accountant:</strong> Access to fee collection portals, asset management logs, salary payout tracking, and expense auditing.</li>
                        <li><strong>Marketer:</strong> Access to lead management, referral marketing tracking, affiliate statistics, and ad campaign dashboards.</li>
                        <li><strong>Staff:</strong> Access to task assignment portals, internal staff attendance registers, and workplace records.</li>
                    </ol>
                </section>

                {/* SECTION 6 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        6. STRICT USER-GENERATED CONTENT (UGC) POLICY
                    </h2>
                    <p>
                        6.1. <strong>Zero-Tolerance Abuse Mandate:</strong> Digital Study Academy enforces a zero-tolerance policy against any form of platform misuse, vulgarity, harassment, or unlawful content submission.
                    </p>
                    <p>
                        6.2. All user-generated content (including assignment attachments, chat messages, profile avatars, discussion posts, audio notes, and live video streams) must conform to academic standards.
                    </p>
                    <p>
                        6.3. <strong>Intermediary Due Diligence:</strong> In accordance with Rule 3(1)(b) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021, users are strictly warned NOT to host, display, upload, modify, publish, transmit, store, update, or share any information that is grossly harmful, harassing, blasphemous, defamatory, obscene, pornographic, pedophilic, invasive of another's privacy, hateful, racially or ethnically objectionable, or unlawful in any manner.
                    </p>
                </section>

                {/* SECTION 7 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        7. PROHIBITED CONDUCT & FORBIDDEN ACTIONS
                    </h2>
                    <p>
                        7.1. Users are strictly prohibited from engaging in any of the following activities on the website, mobile applications, or backend APIs:
                    </p>
                    <ul>
                        <li><strong>Sexually Explicit or Vulgar Uploads:</strong> Uploading pornographic images, adult content, nudity, or sexually suggestive media.</li>
                        <li><strong>Cyber Bullying & Harassment:</strong> Sending abusive, threatening, derogatory, or harassing messages to students, teachers, staff, or institute personnel.</li>
                        <li><strong>Academic Dishonesty & Fraud:</strong> Submitting plagiarized work, attempting to hack online test answer keys, impersonating another student during exams, or fabricating attendance data.</li>
                        <li><strong>Malicious Code Injection:</strong> Uploading files containing viruses, Trojans, worms, ransomware, spyware, or malicious JavaScript code designed to disrupt server operations.</li>
                        <li><strong>Unauthorized Advertising & Spam:</strong> Posting promotional links, affiliate spam, political content, or commercial advertisements in student study rooms or chat feeds.</li>
                        <li><strong>Credential Theft & Phishing:</strong> Attempting to steal login passwords, session tokens, or financial records of other users.</li>
                    </ul>
                </section>

                {/* SECTION 8 */}
                <section style={{ marginBottom: '44px', background: '#fff5f5', border: '2px solid #ef4444', padding: '28px', borderRadius: '4px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#991b1b', borderBottom: '2px solid #991b1b', paddingBottom: '6px', margin: '0 0 16px', textTransform: 'uppercase' }}>
                        8. ENFORCEMENT PROCESS & SEVERE VIOLATION PENALTIES
                    </h2>
                    <p style={{ fontWeight: 700, color: '#7f1d1d' }}>
                        8.1. Any user found violating the terms of service, UGC policy, or code of conduct will be subject to immediate, non-negotiable legal and technical penalties enforced by Digital Study Academy:
                    </p>
                    
                    <div style={{ margin: '16px 0', display: 'flex', flexDirection: 'column', gap: '14px', fontFamily: 'sans-serif', fontSize: '0.9rem' }}>
                        <div style={{ background: '#ffffff', border: '1px solid #fca5a5', padding: '14px', borderRadius: '4px' }}>
                            <strong style={{ color: '#991b1b' }}>PENALTY 1: Immediate Account Revocation & Deletion:</strong> The offending user's account will be instantly suspended, locked, and permanently deleted from production systems without advance notice or opportunity for refund.
                        </div>
                        <div style={{ background: '#ffffff', border: '1px solid #fca5a5', padding: '14px', borderRadius: '4px' }}>
                            <strong style={{ color: '#991b1b' }}>PENALTY 2: Permanent IP & Hardware ID Blacklisting:</strong> The user's device UUID, hardware MAC fingerprint, and network IP range will be permanently blacklisted from accessing DS Notebook, LMS Portal, and associated APIs.
                        </div>
                        <div style={{ background: '#ffffff', border: '1px solid #fca5a5', padding: '14px', borderRadius: '4px' }}>
                            <strong style={{ color: '#991b1b' }}>PENALTY 3: Forfeiture of Fees & Subscriptions:</strong> All paid course subscriptions, fee balances, and access privileges associated with the account will be immediately forfeited without right of recovery.
                        </div>
                        <div style={{ background: '#ffffff', border: '1px solid #fca5a5', padding: '14px', borderRadius: '4px' }}>
                            <strong style={{ color: '#991b1b' }}>PENALTY 4: Criminal Police Reporting (Cyber Crime Cell):</strong> Illegal content, cyber offenses, severe harassment, or security hacking attempts will be reported immediately to the <strong>National Cyber Crime Reporting Portal (cybercrime.gov.in)</strong> and local police authorities. All forensic evidence—including user IP logs, registration phone numbers, location telemetry, and database records—will be surrendered to law enforcement officers for statutory prosecution under Sections 43, 65, 66, 66B, 66C, 66D, 66E, 67, and 67A of the Indian Information Technology Act 2000 and the Bharatiya Nyaya Sanhita (BNS).
                        </div>
                        <div style={{ background: '#ffffff', border: '1px solid #fca5a5', padding: '14px', borderRadius: '4px' }}>
                            <strong style={{ color: '#991b1b' }}>PENALTY 5: Civil Suit for Damages (up to ₹5 Crore):</strong> Digital Study Academy reserves the right to file civil legal claims in competent Indian courts for recovery of liquidated damages, statutory compensation, brand reputation damage, and legal costs up to ₹5,00,00,000 (Rupees Five Crore).
                        </div>
                    </div>
                </section>

                {/* SECTION 9 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        9. INTELLECTUAL PROPERTY & SOURCE CODE OWNERSHIP
                    </h2>
                    <p>
                        9.1. <strong>Exclusive Proprietary Rights:</strong> All intellectual property rights in **DS Notebook**, **LMS Portal**, and **Digital Study Academy** are the sole and exclusive property of Digital Study Academy.
                    </p>
                    <p>
                        9.2. Protected assets include, without limitation:
                    </p>
                    <ul>
                        <li><strong>Software Source Code:</strong> All React frontend code, React Native mobile components, Expo application layers, Node.js server scripts, Express routing logic, REST API specs, and database controllers.</li>
                        <li><strong>Database Schemas & Data Models:</strong> MongoDB collection architectures, index definitions, and user profile schemas.</li>
                        <li><strong>UI/UX Design Tokens:</strong> Visual layouts, color tokens, responsive CSS classes, custom illustrations, icons, and page workflows.</li>
                        <li><strong>Educational Assets:</strong> Digital study notebooks, question banks, syllabus blueprints, evaluation algorithms, and audio/video lectures.</li>
                        <li><strong>Brand Assets:</strong> The company name "Digital Study Academy", application name "DS Notebook", portal name "LMS Portal", logos, slogans, and domain names.</li>
                    </ul>
                </section>

                {/* SECTION 10 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        10. ANTI-CLONING, ANTI-PIRACY & REVERSE ENGINEERING PROHIBITION
                    </h2>
                    <p>
                        10.1. Users, competitor companies, software developers, or third parties are strictly prohibited from copying, cloning, decompiling, disassembling, reverse engineering, scraping, or extracting any part of the software, database, or API infrastructure.
                    </p>
                    <p>
                        10.2. <strong>Legal Notice:</strong> Creating unauthorized clone applications, cracked APKs, private API endpoints, or derivative software products based on DS Notebook or LMS Portal constitutes a direct criminal offense under Sections 51, 63, and 63A of the Indian Copyright Act 1957 and Section 66 of the IT Act 2000, punishable by mandatory imprisonment and severe financial fines.
                    </p>
                </section>

                {/* SECTION 11 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        11. TECHNICAL CYBER SECURITY ARCHITECTURE
                    </h2>
                    <p>
                        11.1. Digital Study Academy implements enterprise cyber security controls aligned with ISO 27001, SOC 2 Type II, and OWASP Top 10 guidelines:
                    </p>
                    <ul>
                        <li><strong>Transport Layer Security:</strong> All data transmitted between mobile clients, web applications, and servers is encrypted using modern TLS 1.3 / HTTPS encryption. Plain HTTP requests are automatically redirected to HTTPS.</li>
                        <li><strong>Data Encryption at Rest:</strong> Database records, user media files, backups, and cloud storage volumes are encrypted using AES-256 bit military-grade encryption algorithms.</li>
                        <li><strong>Password Cryptography:</strong> Passwords are hashed using bcrypt with custom salt rounds (`saltRounds = 10`). Plain text passwords never exist in memory or log files.</li>
                        <li><strong>Session Token Security:</strong> API requests require cryptographically signed JSON Web Tokens (JWT) with strict expiration limits and secure HTTP-only cookies.</li>
                        <li><strong>DDoS & Rate Limiting Defense:</strong> Automated rate-limiting algorithms monitor API traffic to block brute-force password attempts, credential stuffing, and botnet attacks.</li>
                    </ul>
                </section>

                {/* SECTION 12 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        12. DATA RETENTION SCHEDULE & BACKUP PROTOCOLS
                    </h2>
                    <p>
                        12.1. Active student records, attendance logs, and fee registers are retained for the duration of the student's active enrollment at their educational institute plus statutory compliance audit windows (3 to 7 years for financial and tax records).
                    </p>
                    <p>
                        12.2. Automated database backups are generated daily and stored in geographically redundant, encrypted cloud backup locations. Backup restoration routines are audited regularly to guarantee business continuity.
                    </p>
                </section>

                {/* SECTION 13 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        13. MANDATORY ACCOUNT & DATA DELETION MECHANISM
                    </h2>
                    <p>
                        13.1. In strict compliance with Google Play Console policies, Apple App Store Guidelines, and Section 12 of the DPDP Act 2023, every registered user has the right to request the permanent deletion of their account and personal data.
                    </p>
                    <p>
                        13.2. <strong>Account Deletion Procedure:</strong>
                    </p>
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '16px 20px', margin: '12px 0', borderRadius: '4px', fontFamily: 'sans-serif', fontSize: '0.9rem' }}>
                        <p style={{ margin: '0 0 8px' }}><strong>Option 1 (In-App Request):</strong> Navigate to Profile Page -&gt; Security Settings -&gt; Click "Request Account Deletion".</p>
                        <p style={{ margin: '0 0 8px' }}><strong>Option 2 (Direct Email Request):</strong> Send an email to <strong>support@digitalstudyacademy.com</strong> with the subject line "PERMANENT ACCOUNT DELETION REQUEST" including your registered Name, Mobile Number, and Institute Name.</p>
                        <p style={{ margin: 0 }}><strong>Execution Window:</strong> Verified account deletion requests are completed within 30 days. All profile records, avatars, and session tokens are wiped from active databases. Anonymized data may be retained solely for mandatory tax and accounting compliance.</p>
                    </div>
                </section>

                {/* SECTION 14 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        14. CHILDREN & STUDENT DATA SAFEGUARDS (COPPA / FERPA)
                    </h2>
                    <p>
                        14.1. Student profiles under 18 years of age are registered exclusively under institutional agreement and verified parent oversight. Linked parent accounts have transparent access to student attendance registers, exam report cards, and fee receipts.
                    </p>
                    <p>
                        14.2. We strictly prohibit commercial profiling, data mining, or advertising targeted at minor students.
                    </p>
                </section>

                {/* SECTION 15 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        15. THIRD-PARTY INFRASTRUCTURE & ANALYTICS
                    </h2>
                    <p>
                        15.1. Digital Study Academy utilizes trusted enterprise cloud infrastructure providers (including MongoDB Atlas, Google Cloud Platform, AWS, Firebase Cloud Messaging) strictly for hosting app binaries, databases, and push notification delivery. All third-party providers adhere to ISO 27001 and GDPR data processor standards.
                    </p>
                </section>

                {/* SECTION 16 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        16. SERVICE LEVEL AGREEMENT (SLA) & MAINTENANCE
                    </h2>
                    <p>
                        16.1. We strive to maintain a 99.9% server uptime for active LMS services. Scheduled maintenance windows are communicated in advance. Digital Study Academy is not liable for temporary service delays caused by Internet service provider outages or third-party cloud failures.
                    </p>
                </section>

                {/* SECTION 17 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        17. LIMITATION OF LIABILITY & LEGAL DISCLAIMERS
                    </h2>
                    <p>
                        17.1. To the maximum extent permitted by applicable law, Digital Study Academy, its directors, officers, employees, and software engineers shall not be liable for any indirect, incidental, special, exemplary, or consequential damages resulting from platform use, examination performance, internet disconnection, or unauthorized account access by third parties.
                    </p>
                </section>

                {/* SECTION 18 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        18. INDEMNIFICATION & LEGAL HOLD POLICY
                    </h2>
                    <p>
                        18.1. Users agree to indemnify, defend, and hold harmless Digital Study Academy from and against any claims, liabilities, damages, losses, or legal fees arising out of the user's breach of these terms, unauthorized content submissions, or violation of any law.
                    </p>
                </section>

                {/* SECTION 19 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        19. GOVERNING LAW, ARBITRATION & JURISDICTION
                    </h2>
                    <p>
                        19.1. This agreement shall be governed by, construed, and enforced in accordance with the laws of <strong>India</strong>.
                    </p>
                    <p>
                        19.2. <strong>Arbitration:</strong> Any dispute or claim arising out of or in connection with this agreement shall be settled through final and binding arbitration under the Indian Arbitration and Conciliation Act 1996 by a sole arbitrator appointed by Digital Study Academy.
                    </p>
                    <p>
                        19.3. <strong>Jurisdiction:</strong> The competent civil courts of India shall have exclusive jurisdiction over any judicial proceedings arising from this platform.
                    </p>
                </section>

                {/* SECTION 20 */}
                <section style={{ marginBottom: '44px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', borderBottom: '2px solid #0f172a', paddingBottom: '6px', margin: '0 0 16px' }}>
                        20. STATUTORY GRIEVANCE REDRESSAL MECHANISM
                    </h2>
                    <p>
                        20.1. In accordance with Rule 3(2) of the Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules 2021 and the DPDP Act 2023, the details of the designated Grievance Officer for Digital Study Academy are provided below:
                    </p>
                    <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '20px 24px', borderRadius: '4px', fontFamily: 'sans-serif', fontSize: '0.9rem' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1rem', marginBottom: '6px' }}>
                            Grievance & Legal Compliance Cell
                        </div>
                        <div style={{ color: '#334155', lineHeight: '1.6' }}>
                            <strong>Company:</strong> Digital Study Academy<br />
                            <strong>Software Application:</strong> DS Notebook | LMS Portal<br />
                            <strong>Grievance Support Email:</strong> <a href="mailto:support@digitalstudyacademy.com" style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'underline' }}>support@digitalstudyacademy.com</a> | <a href="mailto:admin@dsnotebook.com" style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'underline' }}>admin@dsnotebook.com</a><br />
                            <strong>Official Portal Web Address:</strong> <a href="https://www.digitalstudyacademy.com" target="_blank" rel="noreferrer" style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'underline' }}>https://www.digitalstudyacademy.com</a><br />
                            <strong>Statutory Response Window:</strong> Grievance complaints are acknowledged within 24 hours and resolved within 15 working days as per Indian IT Law guidelines.
                        </div>
                    </div>
                </section>

                {/* Document Footer Notice */}
                <div style={{ marginTop: '60px', paddingTop: '24px', borderTop: '2px solid #0f172a', textAlign: 'center', fontSize: '0.85rem', color: '#475569', fontFamily: 'sans-serif' }}>
                    <p style={{ margin: '0 0 8px', color: '#0f172a', fontWeight: 800, lineHeight: '1.6' }}>
                        DS Notebook and Digital Study Academy are proprietary educational software and brands. Unauthorized copying, reproduction, reverse engineering, redistribution, or commercial use is strictly prohibited.
                    </p>
                    <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 600 }}>
                        © 2026 Digital Study Academy. All Rights Reserved. Official Master Legal Policy Document.
                    </span>
                </div>

            </main>
        </div>
    );
};

export default PrivacyPolicy;
