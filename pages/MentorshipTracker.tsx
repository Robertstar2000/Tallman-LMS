
import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, MentorshipLog } from '../types';
import { TallmanAPI } from '../backend-server';

const MentorshipTracker: React.FC<{ user: User }> = ({ user }) => {
  const [logs, setLogs] = useState<MentorshipLog[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedMenteeId, setSelectedMenteeId] = useState('');
  const [hours, setHours] = useState('');
  const [notes, setNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    const [fetchedLogs, fetchedUsers] = await Promise.all([
      TallmanAPI.getMentorshipLogs(user.user_id),
      TallmanAPI.getUsers()
    ]);
    setLogs(fetchedLogs);
    setAllUsers(fetchedUsers.filter(u => u.user_id !== user.user_id));
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [user.user_id]);

  const currentMonthLogs = useMemo(() => {
    const now = new Date();
    return logs.filter(log => {
      const d = new Date(log.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  }, [logs]);

  const totalHoursThisMonth = useMemo(() => {
    return currentMonthLogs.reduce((acc, l) => acc + l.hours, 0);
  }, [currentMonthLogs]);

  const monthlyTarget = 10;
  const progressPercent = Math.min(100, (totalHoursThisMonth / monthlyTarget) * 100);

  const handleLogMentorship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenteeId || !hours) return;

    setIsLogging(true);
    const mentee = allUsers.find(u => u.user_id === selectedMenteeId);
    
    try {
      await TallmanAPI.addMentorshipLog({
        mentor_id: user.user_id,
        mentee_id: selectedMenteeId,
        mentee_name: mentee?.display_name || 'Unknown Technician',
        hours: parseFloat(hours),
        date: new Date().toISOString(),
        notes: notes.trim()
      });
      setSelectedMenteeId('');
      setHours('');
      setNotes('');
      await fetchLogs();
    } catch (err) {
      alert("System Sync Failure: Could not log mentorship session.");
    } finally {
      setIsLogging(false);
    }
  };

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm("Purge this mentorship record?")) return;
    await TallmanAPI.deleteMentorshipLog(id);
    await fetchLogs();
  };

  if (loading) return (
    <div className="p-20 text-center font-black uppercase tracking-widest text-slate-400 animate-pulse">
      Accessing Mentorship Registry...
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-500 pb-32">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic underline decoration-indigo-200 decoration-4 underline-offset-4">
            Mentorship Hub
          </h1>
          <p className="text-slate-500 font-medium mt-3">People-First Leadership tracking for the {user.branch_id || 'Tallman'} branch.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-1 space-y-8">
          <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl space-y-8">
            <h3 className="text-2xl font-black uppercase italic tracking-tighter text-indigo-400">Monthly Total</h3>
            <div className="space-y-4">
               <div className="flex justify-between items-end">
                  <p className="text-5xl font-black tracking-tighter">{totalHoursThisMonth} <span className="text-lg text-slate-500 uppercase italic">Hrs</span></p>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Target: {monthlyTarget}h</p>
               </div>
               <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden p-1">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                    style={{ width: `${progressPercent}%` }}
                  ></div>
               </div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">
                 {totalHoursThisMonth >= monthlyTarget ? 'QUOTA MET - EXCELLENT STEWARDSHIP' : `${monthlyTarget - totalHoursThisMonth}h remaining for compliance`}
               </p>
            </div>
          </div>

          <form onSubmit={handleLogMentorship} className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-xl space-y-6">
            <h3 className="text-xl font-black uppercase italic text-slate-900">Log Session</h3>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Technician</label>
              <select 
                required
                className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 outline-none focus:border-indigo-600 font-bold transition-all"
                value={selectedMenteeId}
                onChange={e => setSelectedMenteeId(e.target.value)}
              >
                <option value="">Choose Mentee...</option>
                {allUsers.map(u => (
                  <option key={u.user_id} value={u.user_id}>{u.display_name} ({u.email})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration (Hours)</label>
              <input 
                required
                type="number"
                step="0.5"
                min="0.5"
                placeholder="1.5"
                className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 outline-none focus:border-indigo-600 font-bold transition-all"
                value={hours}
                onChange={e => setHours(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Session Notes (Industrial Progress)</label>
              <textarea 
                className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 outline-none focus:border-indigo-600 font-bold transition-all resize-none h-24"
                placeholder="Discussed P21 bin accuracy and dielectric bench safety..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={isLogging}
              className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLogging ? 'Logging...' : 'Commit to Ledger'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white rounded-[3.5rem] border-2 border-slate-100 shadow-xl overflow-hidden">
              <div className="p-8 border-b bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-xl font-black uppercase italic text-slate-900">Activity History</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Log Count: {logs.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {logs.length === 0 ? (
                  <div className="p-20 text-center space-y-4">
                    <span className="text-5xl block grayscale">🤝</span>
                    <p className="font-black text-slate-400 uppercase tracking-widest text-sm">No mentorship sessions on record.</p>
                  </div>
                ) : logs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(log => (
                  <div key={log.id} className="p-8 hover:bg-slate-50/50 transition-all group flex items-start gap-6">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm">
                      {log.hours}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black text-slate-900 text-lg">{log.mentee_name}</h4>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {new Date(log.date).toLocaleDateString()}
                        </span>
                      </div>
                      {log.notes && (
                        <p className="text-sm text-slate-600 mt-2 font-medium leading-relaxed italic border-l-2 border-indigo-100 pl-4 py-1">
                          "{log.notes}"
                        </p>
                      )}
                      <div className="mt-4 flex gap-4">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400">Technical Stewardship Record</span>
                        <button 
                          onClick={() => handleDeleteLog(log.id)}
                          className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-rose-600"
                        >
                          Purge Record
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default MentorshipTracker;
