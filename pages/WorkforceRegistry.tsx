
import React, { useState, useEffect } from 'react';
import { User, UserRole, Course } from '../types';
import { TallmanAPI } from '../backend-server';

const WorkforceRegistry: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [userData, courseData] = await Promise.all([
                TallmanAPI.adminGetUsers(),
                TallmanAPI.getCourses()
            ]);
            setUsers(userData);
            setCourses(courseData);
            setLoading(false);
        } catch (err: any) {
            console.error("Registry Access Audit Failure:", err);
            // Force logout if token is invalid or expired (401/403)
            if (err.message?.includes('403') || err.message?.includes('401') || err.message?.includes('token')) {
                TallmanAPI.logout();
                window.location.reload();
            }
            setError(err.message || 'Failed to load users');
            setLoading(false);
        }
    };

    const handleUpdateUser = async (userId: string, updates: { roles?: UserRole[], status?: string }) => {
        try {
            await TallmanAPI.adminUpdateUser(userId, updates);
            loadData(); // Refresh
        } catch (err: any) {
            alert(err.message || 'Update failed');
        }
    };

    const handleAssignCourse = async (userId: string, courseId: string) => {
        try {
            await TallmanAPI.enroll(userId, courseId);
            alert("Registry Synchronized: Technical track assigned.");
            setSelectedUserId(null);
        } catch (err: any) {
            alert(err.message || "Archive integrity error during assignment.");
        }
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-20">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full mb-4"></div>
                <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Accessing Personnel Registry...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
            <header>
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Workforce Registry</h1>
                <p className="text-slate-500 text-lg mt-4 font-medium uppercase tracking-[0.2em] text-xs">Personnel Oversight & Access Governance</p>
            </header>

            {error && (
                <div className="bg-red-50 text-red-600 p-6 rounded-3xl font-bold border-2 border-red-100 italic">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-[4rem] shadow-xl border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="px-10 py-8 font-black text-[10px] uppercase tracking-widest text-slate-400 border-b">Personnel</th>
                                <th className="px-10 py-8 font-black text-[10px] uppercase tracking-widest text-slate-400 border-b">Division</th>
                                <th className="px-10 py-8 font-black text-[10px] uppercase tracking-widest text-slate-400 border-b">Access Level</th>
                                <th className="px-10 py-8 font-black text-[10px] uppercase tracking-widest text-slate-400 border-b">Status</th>
                                <th className="px-10 py-8 font-black text-[10px] uppercase tracking-widest text-slate-400 border-b text-right">Governance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {users.map(user => (
                                <tr key={user.user_id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex-shrink-0 flex items-center justify-center font-black text-slate-400 border shadow-sm">
                                                {user.display_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 italic">{user.display_name}</p>
                                                <p className="text-slate-400 text-xs font-medium">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 font-bold text-slate-600 text-sm">
                                        {user.branch_id || 'Global'}
                                    </td>
                                    <td className="px-10 py-8">
                                        <div className="flex flex-wrap gap-2">
                                            {user.roles.map(role => (
                                                <span key={role} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${role === 'Admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                                                    {role}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-10 py-8">
                                        <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${user.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {user.status || 'hold'}
                                        </span>
                                    </td>
                                    <td className="px-10 py-8 text-right space-x-4">
                                        {user.status !== 'active' ? (
                                            <button
                                                onClick={() => handleUpdateUser(user.user_id, { status: 'active' })}
                                                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-900 transition-all"
                                            >
                                                Approve Access
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleUpdateUser(user.user_id, { status: 'hold' })}
                                                className="px-6 py-3 bg-white border-2 border-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-red-200 hover:text-red-500 transition-all"
                                            >
                                                Suspend
                                            </button>
                                        )}

                                        <select
                                            className="px-4 py-3 bg-slate-100 rounded-xl font-black text-[10px] uppercase tracking-widest outline-none border-none"
                                            onChange={(e) => {
                                                const newRole = e.target.value as UserRole;
                                                const currentRoles = user.roles;
                                                if (!currentRoles.includes(newRole)) {
                                                    handleUpdateUser(user.user_id, { roles: [...currentRoles, newRole] });
                                                } else if (currentRoles.length > 1) {
                                                    handleUpdateUser(user.user_id, { roles: currentRoles.filter(r => r !== newRole) });
                                                }
                                            }}
                                            value=""
                                        >
                                            <option value="" disabled>Grant Role</option>
                                            <option value="Admin">Admin</option>
                                            <option value="Instructor">Instructor</option>
                                            <option value="Manager">Manager</option>
                                            <option value="Learner">Learner</option>
                                            <option value="Mentor">Mentor</option>
                                            <option value="Hold">Hold</option>
                                        </select>

                                        <button
                                            onClick={async () => {
                                                if (window.confirm(`PERMANENT PURGE: Are you absolutely sure you want to delete all metadata, progress, and authentication for ${user.display_name}? This cannot be undone.`)) {
                                                    try {
                                                        await TallmanAPI.adminDeleteUser(user.user_id);
                                                        loadData();
                                                    } catch (err: any) {
                                                        alert(err.message || "Decommissioning failed.");
                                                    }
                                                }
                                            }}
                                            className="p-3 text-slate-300 hover:text-rose-600 transition-colors"
                                            title="Purge Identity"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>

                                        <button
                                            onClick={() => setSelectedUserId(user.user_id)}
                                            className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-indigo-600 transition-all ml-2"
                                        >
                                            Assign Track
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Assignment Portal Modal */}
            {selectedUserId && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[3.5rem] p-16 shadow-2xl relative space-y-10 animate-in zoom-in-95 duration-500">
                        <button
                            onClick={() => setSelectedUserId(null)}
                            className="absolute top-10 right-10 w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400 hover:bg-rose-500 hover:text-white transition-all"
                        >✕</button>

                        <div>
                            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Assign Track</h2>
                            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-4">For Technician ID: {selectedUserId}</p>
                        </div>

                        <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[400px] pr-4 custom-scrollbar">
                            {courses.map(course => (
                                <button
                                    key={course.course_id}
                                    onClick={() => handleAssignCourse(selectedUserId, course.course_id)}
                                    className="p-8 bg-slate-50 border-2 border-slate-100 rounded-3xl text-left flex items-center justify-between group hover:border-indigo-600 hover:bg-indigo-50 transition-all"
                                >
                                    <div>
                                        <p className="font-black text-slate-900 group-hover:text-indigo-600">{course.course_name}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{course.difficulty} | {course.difficulty}</p>
                                    </div>
                                    <span className="text-lg opacity-0 group-hover:opacity-100 transition-all animate-in slide-in-from-left-2">➕</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkforceRegistry;
