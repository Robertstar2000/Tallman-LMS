
import React, { useState, useEffect } from 'react';
import { TallmanAPI } from '../backend-server';

const AdminSettings: React.FC = () => {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await TallmanAPI.adminGetSettings();
            setSettings(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setStatus('Synchronizing System Architecture...');
        try {
            await TallmanAPI.adminUpdateSettings(settings);
            setStatus('Registry Updated Successfully.');
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            setStatus('Synchronization Failure.');
        } finally {
            setIsSaving(false);
        }
    };

    const toggle = (key: string) => {
        setSettings(prev => ({
            ...prev,
            [key]: prev[key] === 'true' ? 'false' : 'true'
        }));
    };

    return (
        <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-6xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Core Configuration</h1>
                    <p className="text-slate-500 text-lg mt-4 font-black uppercase tracking-[0.3em] text-xs">High-Clearance Platform Governance</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-2xl hover:bg-slate-900 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    {isSaving ? 'Syncing...' : 'Commit Changes'}
                </button>
            </header>

            {status && (
                <div className="p-6 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-center text-xs animate-pulse">
                    {status}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* External URL Governance */}
                <div className="bg-white rounded-[3.5rem] p-12 border-2 border-slate-100 shadow-xl space-y-8">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl">🌐</div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase italic">External Protocol</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Public Internet Exposure</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl">
                            <div>
                                <p className="font-black text-slate-900 uppercase text-xs">Public Gateway</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Enable tunnel to public URL</p>
                            </div>
                            <button
                                onClick={() => toggle('external_url_active')}
                                className={`w-16 h-8 rounded-full transition-all relative ${settings.external_url_active === 'true' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.external_url_active === 'true' ? 'left-9' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-3xl space-y-4">
                            <div>
                                <p className="font-black text-slate-900 uppercase text-xs">Tunnel PIN #</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Global Access Credential</p>
                            </div>
                            <input
                                type="text"
                                value={settings.tunnel_password || ''}
                                onChange={(e) => setSettings(prev => ({ ...prev, tunnel_password: e.target.value }))}
                                placeholder="Set Tunnel PIN"
                                className="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-3 font-black text-slate-900 outline-none focus:border-indigo-600 transition-all font-mono tracking-widest text-sm"
                            />
                        </div>

                        {settings.external_url_active === 'true' && (
                            <div className="p-6 bg-indigo-50 border-2 border-indigo-100 rounded-3xl animate-in slide-in-from-top-4 duration-500">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Active Public Link</p>
                                <p className="font-black text-indigo-900 text-lg break-all italic underline cursor-pointer">
                                    https://tallman-industrial-registry-{(Math.random() * 10000).toFixed(0)}.localtunnel.me
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Safety Analytics */}
                <div className="bg-white rounded-[3.5rem] p-12 border-2 border-slate-100 shadow-xl space-y-8">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-2xl">🛡️</div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase italic">AI Governance</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Safety & Generation Guards</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl">
                            <div>
                                <p className="font-black text-slate-900 uppercase text-xs">Safety Filter</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Enforce strict output audits</p>
                            </div>
                            <button
                                onClick={() => toggle('ai_safety_mode')}
                                className={`w-16 h-8 rounded-full transition-all relative ${settings.ai_safety_mode === 'true' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            >
                                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.ai_safety_mode === 'true' ? 'left-9' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-3xl">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Registry Sync Frequency</label>
                            <select
                                value={settings.governance_level}
                                onChange={(e) => setSettings(prev => ({ ...prev, governance_level: e.target.value }))}
                                className="w-full bg-transparent font-black text-slate-900 uppercase outline-none"
                            >
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                                <option>Critical</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Simulation Mode */}
                <div className="bg-slate-900 rounded-[3.5rem] p-12 shadow-2xl space-y-8 md:col-span-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6 text-white">
                            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">⚡</div>
                            <div>
                                <h2 className="text-2xl font-black uppercase italic">Simulated Training Environment</h2>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Sandbox Control</p>
                            </div>
                        </div>
                        <button
                            onClick={() => toggle('simulation_mode')}
                            className={`w-20 h-10 rounded-full transition-all relative ${settings.simulation_mode === 'true' ? 'bg-indigo-500' : 'bg-white/10'}`}
                        >
                            <div className={`absolute top-1.5 w-7 h-7 bg-white rounded-full transition-all ${settings.simulation_mode === 'true' ? 'left-11' : 'left-1.5'}`} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
