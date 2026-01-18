
import React from 'react';

const AdminReadme: React.FC = () => {
    return (
        <div className="max-w-5xl mx-auto py-20 px-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-40">
            <header className="mb-16 border-b-8 border-slate-900 pb-10">
                <h1 className="text-7xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Global Architecture & Governance</h1>
                <p className="text-slate-500 text-lg mt-4 font-black uppercase tracking-[0.3em] text-xs">Administrative Standard Operating Procedures</p>
            </header>

            <div className="space-y-16">
                {/* User Instructions (Mirrored) */}
                <section className="space-y-8 bg-slate-50 p-12 rounded-[3.5rem] border border-slate-200">
                    <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">Personnel Instructions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <h3 className="text-xl font-black uppercase tracking-widest text-indigo-600">Technician Tracks</h3>
                            <p className="text-slate-600 font-medium leading-relaxed">Technicians use the 'My Track' console to manage their curriculum. They can self-enroll from the Registry Library or resume assigned tasks. All progress is synchronized in real-time with the local database.</p>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-xl font-black uppercase tracking-widest text-amber-600">Technical Audits</h3>
                            <p className="text-slate-600 font-medium leading-relaxed">Successful mastery requires passing end-of-module quizzes. These audits verify industrial understanding and award XP/Rank progression.</p>
                        </div>
                    </div>
                </section>

                {/* Admin/Instructor Instructions */}
                <section className="space-y-10">
                    <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter border-l-8 border-indigo-600 pl-8">Executive Governance</h2>
                    <div className="grid grid-cols-1 gap-8">
                        <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-4">
                            <div className="flex items-center gap-4">
                                <span className="text-3xl">🤖</span>
                                <h3 className="text-2xl font-black uppercase italic tracking-tight">Course Architect</h3>
                            </div>
                            <p className="text-slate-600 font-medium">Use the AI-driven architect to generate high-fidelity curriculum paths. Provide a title, and the system will generate modules, lessons, and compliance questions automatically.</p>
                        </div>
                        <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-4">
                            <div className="flex items-center gap-4">
                                <span className="text-3xl">👥</span>
                                <h3 className="text-2xl font-black uppercase italic tracking-tight">Workforce Registry</h3>
                            </div>
                            <p className="text-slate-600 font-medium">Manage personnel access levels. Admins can promote Technicians to Instructors, approve new signups (Governance Mode), or specifically assign training tracks to individuals.</p>
                        </div>
                        <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-4">
                            <div className="flex items-center gap-4">
                                <span className="text-3xl">📸</span>
                                <h3 className="text-2xl font-black uppercase italic tracking-tight">Visual Sync</h3>
                            </div>
                            <p className="text-slate-600 font-medium">Synchronize the visual identity of the global registry. Bulk Visual Sync triggers the AI engine to generate unique industrial thumbnails for every course, replacing placeholder metadata with high-fidelity imagery.</p>
                        </div>
                    </div>
                </section>

                {/* Technical Specifications */}
                <section className="space-y-8 p-12 bg-slate-900 text-white rounded-[4rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-10 text-9xl font-black select-none italic uppercase">TECH</div>
                    <h2 className="text-4xl font-black uppercase italic tracking-tighter relative z-10">System Architecture</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
                        <div className="space-y-6">
                            <h3 className="text-indigo-400 font-black uppercase tracking-widest text-xs">Network Ingress</h3>
                            <ul className="space-y-4 font-mono text-sm">
                                <li className="flex justify-between border-b border-white/10 pb-2"><span>Frontend Gateway:</span> <span className="text-emerald-400">Port 3180</span></li>
                                <li className="flex justify-between border-b border-white/10 pb-2"><span>API Nexus (Backend):</span> <span className="text-emerald-400">Port 3185</span></li>
                                <li className="flex justify-between border-b border-white/10 pb-2"><span>Local Loopback:</span> <span className="text-emerald-400">127.0.0.1</span></li>
                            </ul>
                        </div>
                        <div className="space-y-6">
                            <h3 className="text-indigo-400 font-black uppercase tracking-widest text-xs">Security Protocol</h3>
                            <p className="text-slate-400 text-sm leading-relaxed font-medium">The platform uses JWT-based authentication for personnel sessions. For secure remote access (LMS Tunneling), a self-signed certificate can be generated for the Node.js ingress to enable high-clearance SSL communication during development.</p>
                        </div>
                    </div>
                </section>

                <section className="p-12 border-2 border-dashed border-slate-200 rounded-[3.5rem] space-y-6">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">🔒 SSL Configuration (Development Only)</h2>
                    <p className="text-slate-500 font-medium text-sm">To enable secure browser tunneling with self-signed certificates, execute the following in the server nexus:</p>
                    <code className="block bg-slate-100 p-6 rounded-2xl font-mono text-xs text-indigo-600">
                        openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
                    </code>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Note: Ensure local certificate trust is enabled for high-clearance browser access.</p>
                </section>
            </div>
        </div>
    );
};

export default AdminReadme;
