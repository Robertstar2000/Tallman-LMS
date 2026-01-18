
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { Course, User, Enrollment, MentorshipLog } from '../types';
import { TallmanAPI } from '../backend-server';

const Reports: React.FC = () => {
  const [data, setData] = useState<{
    allCourses: Course[],
    allUsers: User[],
    allEnrollments: Enrollment[],
    allMentorshipLogs: MentorshipLog[]
  }>({
    allCourses: [],
    allUsers: [],
    allEnrollments: [],
    allMentorshipLogs: []
  });

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);

  const refreshData = async () => {
    try {
      const [u, c, e, m, cats] = await Promise.all([
        TallmanAPI.getUsers(),
        TallmanAPI.getCourses(),
        TallmanAPI.getEnrollments(),
        TallmanAPI.getMentorshipLogs(),
        TallmanAPI.getCategories()
      ]);
      setData({
        allUsers: u,
        allCourses: c,
        allEnrollments: e,
        allMentorshipLogs: m
      });
      setCategories(cats);
    } catch (err: any) {
      console.error("Failed to load report data", err);
      // Force logout if token is invalid or expired (401/403)
      if (err.message?.includes('403') || err.message?.includes('401') || err.message?.includes('token')) {
        TallmanAPI.logout();
        window.location.reload();
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const { allCourses, allUsers, allEnrollments, allMentorshipLogs } = data;

  // KPIs
  const stats = useMemo(() => {
    const totalProgress = allEnrollments.reduce((acc, curr) => acc + curr.progress_percent, 0);
    const avgProgress = allEnrollments.length > 0 ? (totalProgress / allEnrollments.length).toFixed(1) : '0.0';
    const completions = allEnrollments.filter(e => e.progress_percent === 100).length;
    const moduleCount = allCourses.reduce((acc, curr) => acc + (curr.modules?.length || 0), 0);

    return [
      { label: 'Avg Progress Rate', value: `${avgProgress}%`, trend: '+2.4%', icon: '📈' },
      { label: 'Technical Certificates', value: completions.toString(), trend: '+5', icon: '📜' },
      { label: 'Workforce Registered', value: allUsers.length.toLocaleString(), trend: '+1', icon: '👥' },
      { label: 'Catalog Units', value: moduleCount.toLocaleString(), trend: 'Active', icon: '🛠️' },
    ];
  }, [allEnrollments, allUsers, allCourses]);

  // Mentorship over last 12 months
  const mentorshipHistory = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();

      const hours = allMentorshipLogs
        .filter(l => {
          const lDate = new Date(l.date);
          return lDate.getMonth() === month && lDate.getFullYear() === year;
        })
        .reduce((acc, curr) => acc + curr.hours, 0);

      months.push({ name: `${mStr} ${year.toString().slice(-2)}`, hours });
    }
    return months;
  }, [allMentorshipLogs]);

  // Top 10 Mentorship Pairs
  const topPairs = useMemo(() => {
    const pairsMap: Record<string, { mentor: string, mentee: string, hours: number }> = {};

    allMentorshipLogs.forEach(log => {
      const mentorName = allUsers.find(u => u.user_id === log.mentor_id)?.display_name || "Unknown Mentor";
      const key = `${mentorName} -> ${log.mentee_name}`;
      if (!pairsMap[key]) {
        pairsMap[key] = { mentor: mentorName, mentee: log.mentee_name, hours: 0 };
      }
      pairsMap[key].hours += log.hours;
    });

    return Object.values(pairsMap)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);
  }, [allMentorshipLogs, allUsers]);

  // Top 10 Learners by Certifications
  const topCertLearners = useMemo(() => {
    const userCerts = allUsers.map(u => {
      const certs = allEnrollments.filter(e => e.user_id === u.user_id && e.progress_percent === 100).length;
      return { ...u, certCount: certs };
    });

    return userCerts
      .sort((a, b) => b.certCount - a.certCount)
      .slice(0, 10);
  }, [allUsers, allEnrollments]);

  const COLORS = ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'];

  const handlePrint = () => { window.print(); };

  if (loading) return (
    <div className="p-20 text-center font-black uppercase tracking-widest text-slate-400 animate-pulse">
      Compiling Enterprise Intelligence...
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20 print:p-0">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 print:hidden">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic underline decoration-indigo-600/20 underline-offset-8 decoration-4">Intelligence Console</h1>
          <p className="text-slate-500 font-medium mt-4">Audit-ready analytics derived from the Tallman Master Directory.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-indigo-600 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 00-2 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print Workforce Audit
          </button>
        </div>
      </header>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:hidden">
        {stats.map(s => (
          <div key={s.label} className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">{s.icon}</span>
              <span className={`text-[9px] font-black px-3 py-1 rounded-full ${s.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'} uppercase tracking-widest`}>
                {s.trend}
              </span>
            </div>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{s.value}</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* CHARTS ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-50 shadow-sm flex flex-col min-h-[450px]">
          <h3 className="font-black text-xl text-slate-900 tracking-tighter uppercase italic mb-8">Mentorship Velocity (12 Mo)</h3>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mentorshipHistory}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                  minTickGap={10}
                  allowDuplicatedCategory={false}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                  width={40}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', fontWeight: 900 }} />
                <Line type="monotone" dataKey="hours" stroke="#4f46e5" strokeWidth={5} dot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] border-2 border-slate-50 shadow-sm flex flex-col min-h-[450px]">
          <h3 className="font-black text-xl text-slate-900 tracking-tighter uppercase italic mb-8">Top 10 Stewardship Pairs</h3>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="space-y-4 pr-2">
              {topPairs.map((pair, idx) => (
                <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-100 transition-all">
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Mentor / Mentee</p>
                    <p className="font-black text-slate-900 text-sm truncate">{pair.mentor} → {pair.mentee}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-black text-slate-900 leading-none">{pair.hours}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Hours</p>
                  </div>
                </div>
              ))}
              {topPairs.length === 0 && <p className="text-center py-20 text-slate-400 font-black uppercase italic text-xs">No pairs logged</p>}
            </div>
          </div>
        </div>
      </div>

      {/* PROFICIENCY MATRIX (Top 10 Certified) */}
      <section className="bg-white rounded-[3.5rem] border-2 border-slate-100 shadow-xl overflow-hidden">
        <div className="p-10 border-b flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Proficiency Matrix</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top 10 Certification Holders</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] border-b">
              <tr>
                <th className="px-10 py-6">Rank</th>
                <th className="px-10 py-6">Identity</th>
                <th className="px-10 py-6 text-center">Active Paths</th>
                <th className="px-10 py-6 text-right">Technical Certs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topCertLearners.map((u, i) => {
                const enrollments = allEnrollments.filter(e => e.user_id === u.user_id);
                const activeCount = enrollments.filter(e => e.progress_percent > 0 && e.progress_percent < 100).length;
                return (
                  <tr key={u.user_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-10 py-8 font-black text-slate-300 text-2xl italic">#{(i + 1).toString().padStart(2, '0')}</td>
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-400 border">
                          {u.display_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{u.display_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{u.branch_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8 text-center">
                      <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs">{activeCount}</span>
                    </td>
                    <td className="px-10 py-8 text-right font-black text-indigo-600 text-3xl italic">{u.certCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* WORKFORCE PROGRESS AUDIT */}
      <section className="bg-white rounded-[3.5rem] border-2 border-slate-100 shadow-xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
        <div className="p-10 border-b flex items-center justify-between bg-slate-50/50 print:bg-white print:p-0 print:mb-8">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl print:hidden">📋</div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic print:text-4xl">Workforce Progress Audit</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest print:text-xs">Individual Technical Performance Record • {new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-white text-slate-400 text-[10px] uppercase font-black tracking-[0.25em] border-b print:text-slate-900 print:font-bold print:border-slate-900">
              <tr>
                <th className="px-10 py-6 print:px-0">Technician</th>
                <th className="px-10 py-6 print:px-0">Active Path(s)</th>
                <th className="px-10 py-6 print:px-0">Completed Path(s)</th>
                <th className="px-10 py-6 text-right print:px-0">XP Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
              {allUsers.map((user) => {
                const userEnrollments = allEnrollments.filter(e => e.user_id === user.user_id);
                const active = userEnrollments.filter(e => e.progress_percent > 0 && e.progress_percent < 100);
                const completed = userEnrollments.filter(e => e.progress_percent === 100);

                return (
                  <tr key={user.user_id} className="hover:bg-slate-50 transition-colors group print:break-inside-avoid">
                    <td className="px-10 py-8 print:px-0 print:py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-xs text-slate-400 border print:hidden">
                          {user.display_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-slate-900 text-lg print:text-xl">{user.display_name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase print:text-slate-600">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8 print:px-0 print:py-4">
                      {active.length === 0 ? (
                        <span className="text-slate-300 text-[10px] font-black uppercase print:text-slate-400">No active paths</span>
                      ) : (
                        <div className="space-y-2">
                          {active.map(e => {
                            const course = allCourses.find(c => c.course_id === e.course_id);
                            return (
                              <div key={e.enrollment_id} className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500 print:border print:border-slate-900"></span>
                                <span className="text-xs font-bold text-slate-700">{course?.course_name || 'Unmapped Path'} ({e.progress_percent}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-10 py-8 print:px-0 print:py-4">
                      {completed.length === 0 ? (
                        <span className="text-slate-300 text-[10px] font-black uppercase print:text-slate-400">Zero certifications</span>
                      ) : (
                        <div className="space-y-2">
                          {completed.map(e => {
                            const course = allCourses.find(c => c.course_id === e.course_id);
                            return (
                              <div key={e.enrollment_id} className="flex items-center gap-2">
                                <span className="text-xs text-emerald-600 font-black uppercase print:text-slate-900">✓ {course?.course_name}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-10 py-8 text-right font-black text-slate-900 text-lg print:px-0 print:py-4 print:text-xl">
                      {user.points?.toLocaleString() || 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        @media print {
          body { background: white !important; }
          #root { padding: 0 !important; }
          .print-hidden { display: none !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border-bottom: 1px solid #e2e8f0 !important; }
          @page { margin: 2cm; }
        }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
      `}</style>
    </div>
  );
};

export default Reports;
