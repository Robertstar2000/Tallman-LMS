import React, { useState, useMemo, useEffect } from 'react';
import { ForumPost } from '../types';
import { TallmanAPI } from '../backend-server';

const Community: React.FC = () => {
   const [posts, setPosts] = useState<ForumPost[]>([]);
   const [activeChannel, setActiveChannel] = useState('All');
   const [showModal, setShowModal] = useState(false);
   const [isLoading, setIsLoading] = useState(true);

   // New Post State
   const [newTitle, setNewTitle] = useState('');
   const [newContent, setNewContent] = useState('');
   const [newCategory, setNewCategory] = useState('General');

   useEffect(() => {
      const loadPosts = async () => {
         try {
            const data = await TallmanAPI.getForumPosts();
            setPosts(data);
         } catch (err) {
            console.error("Failed to load forum", err);
         } finally {
            setIsLoading(false);
         }
      };
      loadPosts();
   }, []);

   const channels = ['All', 'General', 'Lineman Rigging', 'HV Testing', 'Management', 'Epicor P21'];

   const filteredPosts = useMemo(() => {
      if (activeChannel === 'All') return posts;
      return posts.filter(p => p.category === activeChannel);
   }, [posts, activeChannel]);

   const handleCreatePost = (e: React.FormEvent) => {
      e.preventDefault();
      const post: ForumPost = {
         id: `p_${Date.now()}`,
         author_name: 'Richard Tallman', // Simulation current user
         author_avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop',
         title: newTitle,
         content: newContent,
         category: newCategory,
         replies: 0,
         timestamp: 'Just now',
         is_pinned: false
      };
      setPosts([post, ...posts]);
      setShowModal(false);
      setNewTitle('');
      setNewContent('');
   };

   return (
      <div className="space-y-8 animate-in fade-in duration-500">
         <header className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
               <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic underline decoration-indigo-600/20 underline-offset-8">Knowledge Exchange</h1>
               <p className="text-slate-500 mt-2 font-medium">Connect with fellow technicians and share technical SOPs.</p>
            </div>
            <button
               onClick={() => setShowModal(true)}
               className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all active:scale-95 text-xs uppercase tracking-widest"
            >
               + Draft New Topic
            </button>
         </header>

         <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <aside className="space-y-6">
               <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-50 shadow-sm">
                  <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-6">Channels</h3>
                  <div className="space-y-2">
                     {channels.map(c => (
                        <button
                           key={c}
                           onClick={() => setActiveChannel(c)}
                           className={`w-full text-left px-5 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-between group ${activeChannel === c ? 'bg-indigo-600 text-white shadow-lg translate-x-1' : 'text-slate-500 hover:bg-slate-50'
                              }`}
                        >
                           <span># {c}</span>
                           {activeChannel === c && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>}
                        </button>
                     ))}
                  </div>
               </div>

               <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Community Stats</p>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400">Total Experts</span>
                        <span className="font-black text-xl">142</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-400">Daily Threads</span>
                        <span className="font-black text-xl">12</span>
                     </div>
                  </div>
               </div>
            </aside>

            <div className="lg:col-span-3 space-y-6">
               {filteredPosts.length === 0 ? (
                  <div className="py-20 text-center bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
                     <p className="font-black text-slate-400 uppercase tracking-widest">No transmissions found in {activeChannel}</p>
                  </div>
               ) : filteredPosts.map(post => (
                  <div key={post.id} className={`bg-white p-10 rounded-[3rem] border-2 hover:border-indigo-600 transition-all shadow-sm ${post.is_pinned ? 'ring-4 ring-indigo-50 border-indigo-100' : 'border-slate-50'}`}>
                     <div className="flex gap-6 items-start mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-black shadow-md">
                           {post.author_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div className="flex-1">
                           <div className="flex items-center gap-3 mb-2">
                              <span className="font-black text-2xl text-slate-900 tracking-tight">{post.title}</span>
                              {post.is_pinned && <span className="text-[9px] bg-indigo-900 text-white px-3 py-1 rounded-full font-black uppercase tracking-tighter shadow-sm">Pinned</span>}
                           </div>
                           <p className="text-slate-600 line-clamp-2 leading-relaxed font-medium">{post.content}</p>
                        </div>
                     </div>
                     <div className="flex flex-wrap items-center justify-between border-t border-slate-50 pt-6 mt-6 gap-4">
                        <div className="flex items-center gap-4">
                           <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-xl border border-indigo-100">{post.category}</span>
                           <div className="h-4 w-px bg-slate-100"></div>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <span className="text-slate-900">{post.author_name}</span> • {post.timestamp}
                           </span>
                        </div>
                        <div className="flex items-center gap-6">
                           <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                              {post.replies} Replies
                           </div>
                           <button className="text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline hover:text-slate-900 transition-all underline-offset-4 decoration-2">View Transmission</button>
                        </div>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         {/* New Topic Modal */}
         {showModal && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
               <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden border-8 border-white animate-in zoom-in-95 duration-500">
                  <header className="p-10 border-b flex items-center justify-between bg-slate-50/50">
                     <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Draft New Topic</h2>
                     <button onClick={() => setShowModal(false)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm hover:bg-rose-500 hover:text-white transition-all text-slate-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                     </button>
                  </header>
                  <form onSubmit={handleCreatePost} className="p-10 space-y-8">
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Header</label>
                        <input
                           required
                           className="w-full px-8 py-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none font-black text-xl text-slate-900 transition-all"
                           placeholder="e.g. Dielectric bench calibration tips..."
                           value={newTitle}
                           onChange={e => setNewTitle(e.target.value)}
                        />
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Channel Assignment</label>
                        <select
                           className="w-full px-8 py-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none font-black text-sm text-slate-600 transition-all uppercase tracking-widest"
                           value={newCategory}
                           onChange={e => setNewCategory(e.target.value)}
                        >
                           {channels.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Context / Discussion Points</label>
                        <textarea
                           required
                           rows={6}
                           className="w-full px-8 py-5 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none font-medium text-slate-600 leading-relaxed transition-all resize-none"
                           placeholder="Share technical findings or ask for expert advice..."
                           value={newContent}
                           onChange={e => setNewContent(e.target.value)}
                        />
                     </div>
                     <div className="pt-4 flex gap-4">
                        <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                        <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 hover:bg-slate-900 transition-all">Publish Topic</button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
};

export default Community;
