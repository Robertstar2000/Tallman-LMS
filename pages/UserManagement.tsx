
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, User, Course, Enrollment } from '../types';
import { TallmanAPI } from '../backend-server';
import { INITIAL_BRANCHES as branches } from '../backend-data';

const UserManagement: React.FC = () => {
  const [activeBranchFilter, setActiveBranchFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshData = async () => {
    setLoading(true);
    const [u, e, c] = await Promise.all([
      TallmanAPI.getUsers(),
      TallmanAPI.getEnrollments(),
      TallmanAPI.getCourses()
    ]);
    setUsers(u);
    setEnrollments(e);
    setCourses(c);
    setLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    roles: [UserRole.LEARNER],
    branchId: branches[0].branch_id,
    password: 'password123'
  });

  const handleAssignCourse = async (courseId: string) => {
    if (!selectedUser) return;
    await TallmanAPI.enroll(selectedUser.user_id, courseId);
    await refreshData();
    alert(`Path provisioned successfully.`);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const user: User = {
      user_id: `u_${Date.now()}`,
      display_name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      roles: newUser.roles,
      branch_id: newUser.branchId,
      avatar_url: `https://picsum.photos/seed/${newUser.name}/200`,
      points: 0,
      level: 1
    };
    await TallmanAPI.upsertUser(user);
    await refreshData();
    setIsModalOpen(false);
  };

  const filteredUsers = useMemo(() => {
    return activeBranchFilter === 'all' ? users : users.filter(u => u.branch_id === activeBranchFilter);
  }, [users, activeBranchFilter]);

  if (loading) return <div className="p-20 text-center font-black uppercase text-slate-400">Syncing Registry...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase italic underline decoration-indigo-200 decoration-4 underline-offset-4">Workforce Registry</h1>
          <p className="text-slate-500 font-medium mt-3">Identity management and technical path provisioning.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all">
          + Provision Identity
        </button>
      </header>

      <div className="bg-white rounded-[3.5rem] border-2 border-slate-100 shadow-xl overflow-hidden">
        <div className="p-10 border-b bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between">
           <select 
             className="px-6 py-4 rounded-2xl border-2 bg-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-600"
             value={activeBranchFilter}
             onChange={(e) => setActiveBranchFilter(e.target.value)}
           >
              <option value="all">Global Workforce</option>
              {branches.map(b => (
                <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
              ))}
           </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
             <thead className="bg-white text-slate-400 text-[10px] uppercase font-black tracking-[0.2em] border-b">
                <tr>
                   <th className="px-10 py-6">Identity</th>
                   <th className="px-10 py-6">Roles</th>
                   <th className="px-10 py-6 text-right">Actions</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {filteredUsers.map(u => (
                  <tr key={u.user_id} className="hover:bg-slate-50/50">
                     <td className="px-10 py-8">
                        <div>
                           <p className="font-black text-slate-900 text-lg leading-none">{u.display_name}</p>
                           <p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5">{u.email}</p>
                        </div>
                     </td>
                     <td className="px-10 py-8">
                        <div className="flex gap-2">
                          {u.roles.map(r => <span key={r} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase">{r}</span>)}
                        </div>
                     </td>
                     <td className="px-10 py-8 text-right">
                        <button onClick={() => { setSelectedUser(u); setIsAssignModalOpen(true); }} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all">Assign Track</button>
                     </td>
                  </tr>
                ))}
             </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-[3.5rem] shadow-2xl p-10">
            <h3 className="text-2xl font-black text-slate-900 uppercase italic mb-8">Provision Identity</h3>
            <form onSubmit={handleAddUser} className="space-y-6">
              <input required placeholder="Full Name" className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 outline-none focus:border-indigo-600 font-bold" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
              <input required type="email" placeholder="Enterprise Email" className="w-full px-6 py-4 rounded-2xl border-2 bg-slate-50 outline-none focus:border-indigo-600 font-bold" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-900 transition-all">Confirm Provisioning</button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="w-full py-3 text-slate-400 font-black uppercase text-[10px]">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {isAssignModalOpen && selectedUser && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl p-10 max-h-[80vh] overflow-y-auto">
              <h3 className="text-2xl font-black text-slate-900 uppercase italic mb-8">Provision Path for {selectedUser.display_name}</h3>
              <div className="space-y-4">
                {courses.map(course => (
                  <button key={course.course_id} onClick={() => { handleAssignCourse(course.course_id); setIsAssignModalOpen(false); }} className="w-full text-left p-6 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-600 transition-all flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-900">{course.course_name}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{course.modules?.length || 0} Units</p>
                    </div>
                    <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase">Assign</span>
                  </button>
                ))}
              </div>
              <button onClick={() => setIsAssignModalOpen(false)} className="w-full mt-8 py-3 text-slate-400 font-black uppercase text-[10px]">Close</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
