
import React, { useState, useEffect } from 'react';
import { User, Badge } from '../types';
import { TallmanAPI } from '../backend-server';

const Achievements: React.FC = () => {
   const [user, setUser] = useState<User | null>(null);
   const [earnedBadges, setEarnedBadges] = useState<Badge[]>([]);
   const [loading, setLoading] = useState(true);

   useEffect(() => {
      const loadData = async () => {
         try {
            const session = await TallmanAPI.getCurrentSession();
            if (session) {
               setUser(session);
               const userBadges = await TallmanAPI.getUserBadges(session.user_id);
               setEarnedBadges(userBadges);
            }
         } catch (err) {
            console.error("Achievement Audit Failure:", err);
         } finally {
            setLoading(false);
         }
      };
      loadData();
   }, []);

   if (loading) return (
      <div className="min-h-screen flex items-center justify-center">
         <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full"></div>
      </div>
   );

   if (!user) return null;

   return (
      <div className="space-y-12 animate-in fade-in duration-500">
         <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
               <h1 className="text-4xl font-black text-slate-900 tracking-tight">Wall of Mastery</h1>
               <p className="text-slate-500 text-lg">Your progress toward enterprise technical excellence.</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border text-center min-w-[150px]">
                  <p className="text-[10px] text-slate-400 font-black uppercase mb-1">XP Points</p>
                  <p className="text-4xl font-black text-indigo-600">{user.points}</p>
               </div>
            </div>
         </header>

         <section className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2 space-y-8">
               <div className="bg-white p-10 rounded-[3rem] border shadow-sm">
                  <h2 className="text-2xl font-black mb-8">Earned Certifications</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {earnedBadges.map(b => (
                        <div key={b.badge_id} className="flex items-center gap-6 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 group hover:border-indigo-600 transition-all">
                           <div className="text-5xl group-hover:scale-110 transition-transform">{b.badge_image_url}</div>
                           <div>
                              <h3 className="font-black text-slate-900">{b.badge_name}</h3>
                              <p className="text-xs text-slate-400 font-bold uppercase">{b.criteria}</p>
                           </div>
                        </div>
                     ))}
                     {earnedBadges.length === 0 && (
                        <div className="col-span-full py-10 text-center text-slate-400 font-bold uppercase italic tracking-widest">
                           No certifications earned yet. Complete courses to unlock achievements.
                        </div>
                     )}
                  </div>
               </div>

               <div className="bg-indigo-900 p-12 rounded-[4rem] text-white relative overflow-hidden">
                  <div className="absolute right-0 top-0 opacity-10 text-9xl font-black translate-x-10 translate-y-[-20px]">XP</div>
                  <h3 className="text-3xl font-black mb-4">Milestone Progress</h3>
                  <p className="text-indigo-200 mb-10 max-w-md">Continue mastering industrial SOPs to climb the workforce standings.</p>
                  <div className="w-full bg-white/10 h-4 rounded-full overflow-hidden mb-4">
                     <div className="bg-indigo-400 h-full w-[45%] rounded-full shadow-[0_0_20px_rgba(129,140,248,0.5)]"></div>
                  </div>
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest text-indigo-300">
                     <span>Level {user.level}</span>
                     <span>Level {user.level + 1}</span>
                  </div>
               </div>
            </div>

            <aside className="bg-white p-10 rounded-[3rem] border shadow-sm">
               <h2 className="text-2xl font-black mb-8">Leaderboard</h2>
               <div className="space-y-6">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                     <span className="w-6 text-sm font-black text-indigo-600">01</span>
                     <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-xs text-indigo-400 border border-indigo-100">
                        {user.display_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                     </div>
                     <div className="flex-1">
                        <p className="text-sm font-black text-slate-900">{user.display_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{user.points} PTS</p>
                     </div>
                  </div>
               </div>
               <button className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all">View All Rankings</button>
            </aside>
         </section>
      </div>
   );
};

export default Achievements;
