import React, { useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Course, User, Enrollment } from '../types';
import { TallmanAPI } from '../backend-server';

const AdminDashboard: React.FC<{ user: User }> = ({ user }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const refreshData = async () => {
      try {
        const [c, e, u] = await Promise.all([
          TallmanAPI.getCourses(),
          TallmanAPI.getEnrollments(),
          TallmanAPI.adminGetUsers()
        ]);
        setCourses(c || []);
        setEnrollments(e || []);
        setUsers(u || []);
      } catch (err: any) {
        console.error("Dashboard Sync Error:", err);
      }
    };
    refreshData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="bg-white p-8 rounded-xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Teacher Dashboard</h1>
          <p className="text-slate-500">Manage courses and monitor student progress.</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <Link to="/student" className="px-6 py-2 rounded-md text-slate-500 hover:text-slate-900 font-bold text-sm transition-all">STUDENT</Link>
            <Link to="/teacher" className="px-6 py-2 rounded-md bg-white shadow-sm text-blue-700 font-bold text-sm transition-all">TEACHER</Link>
          </div>
          <Link to="/teacher/courses" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center">
            + Create New Course
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <p className="text-sm font-bold text-slate-500 uppercase">Total Students</p>
          <p className="text-4xl font-black text-slate-900">{users.filter(u => {
            const visibleRoles = u.roles.filter(r => r === 'Student' || r === 'Teacher');
            if (visibleRoles.length === 0) visibleRoles.push('Student' as any);
            return visibleRoles.includes('Student' as any);
          }).length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <p className="text-sm font-bold text-slate-500 uppercase">Total Courses</p>
          <p className="text-4xl font-black text-slate-900">{courses.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <p className="text-sm font-bold text-slate-500 uppercase">Active Enrollments</p>
          <p className="text-4xl font-black text-slate-900">{enrollments.filter(e => e.status === 'active').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b bg-slate-50">
          <h2 className="text-xl font-bold">Course Management</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 border-b">
              <tr>
                <th className="px-6 py-4 font-bold">Course Name</th>
                <th className="px-6 py-4 font-bold">Enrollments</th>
                <th className="px-6 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map(course => (
                <tr key={course.course_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'}
                        alt={course.course_name}
                        className="w-16 h-12 object-cover rounded"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-lg">{course.course_name}</span>
                        {course.attachment_url && (
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            Asset: {course.attachment_url.split('/').pop()}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-600">
                      {enrollments.filter(e => e.course_id === course.course_id).length} Students
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <Link
                      to={`/teacher/edit/${course.course_id}`}
                      className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-bold"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={async () => {
                        if (window.confirm(`Are you sure you want to remove '${course.course_name}'? Existing student credits will be preserved.`)) {
                          try {
                            await TallmanAPI.deleteCourse(course.course_id);
                            setCourses(courses.filter(c => c.course_id !== course.course_id));
                          } catch (err) {
                            alert("Failed to delete course.");
                          }
                        }
                      }}
                      className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded font-bold transition-colors"
                      title="Decommission Course"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {courses.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500 font-bold">
                    No courses created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;