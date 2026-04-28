import React, { useState, useEffect } from 'react';
import { User, UserRole, Course, Enrollment } from '../types';
import { TallmanAPI } from '../backend-server';

const WorkforceRegistry: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [userData, courseData, enrollData] = await Promise.all([
                TallmanAPI.adminGetUsers(),
                TallmanAPI.getCourses(),
                TallmanAPI.getEnrollments()
            ]);
            setUsers(userData);
            setCourses(courseData);
            setEnrollments(enrollData);
            setLoading(false);
        } catch (err: any) {
            console.error("Registry Access Audit Failure:", err);
            // Only reset to login if it's a Tallman API auth failure (401/403)
            if (err.status === 401 || err.status === 403) {
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
            loadData();
        } catch (err: any) {
            alert(err.message || 'Update failed');
        }
    };

    const handleAssignCourse = async (userId: string, courseId: string) => {
        try {
            await TallmanAPI.enroll(userId, courseId);
            alert("Course assigned.");
            setSelectedUserId(null);
            loadData();
        } catch (err: any) {
            alert(err.message || "Error during assignment.");
        }
    };

    const handleDeleteUser = async (user: User) => {
        if (window.confirm(`CRITICAL ACTION: Are you sure you want to permanently decommission the personnel record for ${user.display_name}? This will remove all progress and history.`)) {
            try {
                await TallmanAPI.adminDeleteUser(user.user_id);
                loadData();
            } catch (err: any) {
                alert(err.message || 'Deletion failed');
            }
        }
    };

    const getEnrollmentStatus = (e: Enrollment) => {
        if (e.status === 'dropped') return 'retry';
        if (e.progress_percent >= 100 || e.status === 'completed') return 'completed';
        return 'in process';
    };

    if (loading) {
        return <div className="p-10 font-bold">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Students & Teachers</h1>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg font-bold">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="px-6 py-4 font-bold text-slate-500">Name</th>
                            <th className="px-6 py-4 font-bold text-slate-500">Roles</th>
                            <th className="px-6 py-4 font-bold text-slate-500">Courses</th>
                            <th className="px-6 py-4 font-bold text-slate-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map(user => {
                            // Enforce visual roles to only be Student or Teacher
                            const visibleRoles = user.roles.filter(r => r === UserRole.STUDENT || r === UserRole.TEACHER);
                            if (visibleRoles.length === 0) visibleRoles.push(UserRole.STUDENT); // Fallback

                            const userEnrollments = enrollments.filter(e => e.user_id === user.user_id);

                            return (
                                <tr key={user.user_id}>
                                    <td className="px-6 py-4 align-top">
                                        <p className="font-bold">{user.display_name}</p>
                                        <p className="text-sm text-slate-500">{user.email}</p>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <div className="flex gap-2">
                                            {visibleRoles.map(role => (
                                                <span key={role} className="px-2 py-1 rounded bg-slate-100 text-sm font-medium">
                                                    {role}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        {userEnrollments.length > 0 ? (
                                            <ul className="space-y-2">
                                                {userEnrollments.map(e => {
                                                    const course = courses.find(c => c.course_id === e.course_id);
                                                    const status = getEnrollmentStatus(e);
                                                    let statusClass = "bg-slate-100 text-slate-600";
                                                    if (status === 'completed') statusClass = "bg-emerald-100 text-emerald-700";
                                                    if (status === 'retry') statusClass = "bg-rose-100 text-rose-700";
                                                    if (status === 'in process') statusClass = "bg-blue-100 text-blue-700";

                                                    return (
                                                        <li key={e.enrollment_id} className="text-sm flex flex-col gap-1">
                                                            <span className="font-medium">{course?.course_name || 'Unknown Course'}</span>
                                                            <span className={`text-xs px-2 py-0.5 rounded w-max font-bold uppercase ${statusClass}`}>
                                                                {status}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : (
                                            <span className="text-slate-400 text-sm italic">No courses</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2 align-top">
                                        <select
                                            className="px-3 py-1.5 bg-slate-50 rounded border"
                                            onChange={(e) => handleUpdateUser(user.user_id, { roles: [e.target.value as UserRole] })}
                                            value={visibleRoles[0] || ''}
                                        >
                                            <option value={UserRole.STUDENT}>Student</option>
                                            <option value={UserRole.TEACHER}>Teacher</option>
                                        </select>
                                        
                                        <div className="flex flex-col gap-2 mt-2">
                                            <button
                                                onClick={() => setSelectedUserId(user.user_id)}
                                                className="px-4 py-1.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 block ml-auto w-full"
                                            >
                                                Assign Course
                                            </button>
                                            
                                            {/* Do not allow deleting the master admin account from here */}
                                            {user.email !== 'robertstar@aol.com' && (
                                                <button
                                                    onClick={() => handleDeleteUser(user)}
                                                    className="px-4 py-1.5 bg-red-50 text-red-600 rounded font-medium hover:bg-red-100 block ml-auto w-full text-sm transition-colors"
                                                >
                                                    Delete Employee
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {selectedUserId && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4">Assign Course</h2>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {courses.map(course => (
                                <button
                                    key={course.course_id}
                                    onClick={() => handleAssignCourse(selectedUserId, course.course_id)}
                                    className="w-full text-left p-3 rounded bg-slate-50 hover:bg-slate-100 font-medium"
                                >
                                    {course.course_name}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setSelectedUserId(null)}
                            className="mt-4 px-4 py-2 bg-slate-200 rounded font-medium w-full"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkforceRegistry;
