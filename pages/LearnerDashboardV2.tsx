import React, { useState, useEffect } from 'react';
import { Course, User, Enrollment } from '../types';
import { TallmanAPI } from '../backend-server';
import { Link, useNavigate } from 'react-router-dom';

const LearnerDashboardV2: React.FC<{ user: User, refreshUser: () => void }> = ({ user, refreshUser }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [coursesData, enrollmentsData] = await Promise.all([
                    TallmanAPI.getCourses(),
                    TallmanAPI.getEnrollments()
                ]);
                setCourses(coursesData);
                setEnrollments(enrollmentsData.filter(e => e.user_id === user.user_id));
            } catch (err) {
                console.error("Dashboard failed to load:", err);
            }
        };
        fetchDashboardData();
    }, [user.user_id]);

    const handleStartCourse = async (courseId: string) => {
        try {
            await TallmanAPI.enroll(user.user_id, courseId);
            refreshUser();
            navigate(`/player/${courseId}`);
        } catch (err) {
            console.error("Enrollment failed:", err);
            alert("Could not enroll in course. Please try again.");
        }
    };

    // Calculate categories
    const enrolledCourseIds = new Set(enrollments.map(e => e.course_id));

    // Available Courses (Not enrolled)
    const availableCatalog = courses.filter(c => !enrolledCourseIds.has(c.course_id));

    // In Progress Courses
    const inProgressEnrollments = enrollments.filter(e => e.status === 'active' && e.progress_percent < 100);
    const inProgressCourses = inProgressEnrollments.map(e => {
        const c = courses.find(course => course.course_id === e.course_id);
        return c ? { ...c, progress: e.progress_percent } : null;
    }).filter(c => c !== null) as (Course & { progress: number })[];

    // Passed Courses
    const passedEnrollments = enrollments.filter(e => e.progress_percent >= 100 || e.status === 'completed');
    const passedCourses = passedEnrollments.map(e => {
        const c = courses.find(course => course.course_id === e.course_id);
        return c ? { ...c, progress: e.progress_percent } : null;
    }).filter(c => c !== null) as (Course & { progress: number })[];

    // Retry (Failed) Courses
    const failedEnrollments = enrollments.filter(e => e.status === 'dropped');
    const failedCourses = failedEnrollments.map(e => {
        const c = courses.find(course => course.course_id === e.course_id);
        return c ? { ...c, progress: e.progress_percent } : null;
    }).filter(c => c !== null) as (Course & { progress: number })[];

    return (
        <div className="space-y-10 max-w-6xl mx-auto">
            <header className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Student Dashboard</h1>
                    <p className="text-slate-500">Welcome back, {user.roles.includes('Teacher' as any) ? 'Teacher' : 'Student'}. Track your classes below.</p>
                </div>
                {user.roles.includes('Teacher' as any) && (
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <Link to="/student" className="px-6 py-2 rounded-md bg-white shadow-sm text-blue-700 font-bold text-sm transition-all">STUDENT</Link>
                        <Link to="/teacher" className="px-6 py-2 rounded-md text-slate-500 hover:text-slate-900 font-bold text-sm transition-all">TEACHER</Link>
                    </div>
                )}
            </header>

            {/* IN PROGRESS */}
            {inProgressCourses.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold mb-4">In Progress</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {inProgressCourses.map(course => (
                            <Link
                                key={course.course_id}
                                to={`/player/${course.course_id}`}
                                className="block bg-white rounded-xl shadow-sm border border-blue-200 overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <img
                                    src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'}
                                    alt={course.course_name}
                                    className="w-full h-48 object-cover"
                                />
                                <div className="p-6">
                                    <h3 className="font-bold text-lg mb-2 text-blue-900">{course.course_name}</h3>
                                    <div className="w-full bg-slate-100 h-2 rounded-full mb-2">
                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${course.progress}%` }}></div>
                                    </div>
                                    <p className="text-sm font-bold text-slate-500">{course.progress}% Complete</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* PASSED */}
            {passedCourses.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold mb-4">Passed (Completed)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {passedCourses.map(course => (
                            <div key={course.course_id} className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 flex items-center gap-4">
                                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xl">🏆</div>
                                <div>
                                    <h4 className="font-bold text-emerald-900">{course.course_name}</h4>
                                    <p className="text-xs text-emerald-600 font-bold uppercase">Passed</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* RETRY / FAIL */}
            {failedCourses.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold mb-4">Retry (Failed)</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {failedCourses.map(course => (
                            <Link
                                key={course.course_id}
                                to={`/player/${course.course_id}`}
                                className="bg-rose-50 rounded-xl p-4 border border-rose-200 flex items-center gap-4 hover:bg-rose-100 transition-colors"
                            >
                                <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-xl">⚠️</div>
                                <div>
                                    <h4 className="font-bold text-rose-900">{course.course_name}</h4>
                                    <p className="text-xs text-rose-600 font-bold uppercase">Needs Retry</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* ENROLL / AVAILABLE */}
            {availableCatalog.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold mb-4">Available to Enroll</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {availableCatalog.map(course => (
                            <div key={course.course_id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                                <img
                                    src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop'}
                                    alt={course.course_name}
                                    className="w-full h-48 object-cover"
                                />
                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="font-bold text-lg mb-2">{course.course_name}</h3>
                                    <p className="text-sm text-slate-600 mb-4 flex-1 line-clamp-2">{course.short_description}</p>
                                    <button
                                        onClick={() => handleStartCourse(course.course_id)}
                                        className="w-full py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-indigo-600 transition-colors"
                                    >
                                        Enroll Now
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default LearnerDashboardV2;
