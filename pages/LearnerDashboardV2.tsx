import React, { useState, useEffect } from 'react';
import { Course, User, Enrollment } from '../types';
import { TallmanAPI } from '../backend-server';
import { Link, useNavigate } from 'react-router-dom';
import { getCourseBriefLabel, getCourseSummary, getCourseSupportText } from '../coursePresentation';

const LearnerDashboardV2: React.FC<{ user: User, refreshUser: () => void }> = ({ user, refreshUser }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
    const navigate = useNavigate();
    const isTeacher = user.roles.includes('Teacher' as any);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [coursesData, enrollmentsData] = await Promise.all([
                    TallmanAPI.getCourses(),
                    TallmanAPI.getMyEnrollments()
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
            if (isTeacher) {
                await TallmanAPI.assignCourse(user.user_id, courseId);
                refreshUser();
            }
            navigate(`/player/${courseId}`);
        } catch (err) {
            console.error("Course launch failed:", err);
            alert("Could not open course. Please try again.");
        }
    };

    const handlePreviewCourse = async (courseId: string) => {
        try {
            await TallmanAPI.assignCourse(user.user_id, courseId);
            refreshUser();
            navigate(`/player/${courseId}`);
        } catch (err) {
            console.error("Preview enrollment failed:", err);
            alert("Could not prepare course preview. Please try again.");
        }
    };

    const enrolledCourseIds = new Set(enrollments.map(e => e.course_id));
    const readyToStartEnrollments = enrollments.filter(e => e.status === 'active' && e.progress_percent === 0);
    const readyToStartCourses = readyToStartEnrollments.map(e => {
        const c = courses.find(course => course.course_id === e.course_id);
        return c ? { ...c, progress: e.progress_percent } : null;
    }).filter(c => c !== null) as (Course & { progress: number })[];
    const inProgressEnrollments = enrollments.filter(e => e.status === 'active' && e.progress_percent > 0 && e.progress_percent < 100);
    const inProgressCourses = inProgressEnrollments.map(e => {
        const c = courses.find(course => course.course_id === e.course_id);
        return c ? { ...c, progress: e.progress_percent } : null;
    }).filter(c => c !== null) as (Course & { progress: number })[];
    const passedEnrollments = enrollments.filter(e => e.progress_percent >= 100 || e.status === 'completed');
    const passedCourses = passedEnrollments.map(e => {
        const c = courses.find(course => course.course_id === e.course_id);
        return c ? { ...c, progress: e.progress_percent } : null;
    }).filter(c => c !== null) as (Course & { progress: number })[];
    const failedEnrollments = enrollments.filter(e => e.status === 'dropped');
    const failedCourses = failedEnrollments.map(e => {
        const c = courses.find(course => course.course_id === e.course_id);
        return c ? { ...c, progress: e.progress_percent } : null;
    }).filter(c => c !== null) as (Course & { progress: number })[];
    const previewCatalog = isTeacher
        ? courses.filter(c => !enrolledCourseIds.has(c.course_id))
        : [];

    return (
        <div className="space-y-10 max-w-6xl mx-auto">
            <header className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Student Dashboard</h1>
                    <p className="text-slate-500">
                        {isTeacher
                            ? 'Teacher preview mode. Your student progress remains separate from assigned learners.'
                            : 'Only courses assigned to your account appear here, along with your own progress and scores.'}
                    </p>
                </div>
                {isTeacher && (
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                        <Link to="/student" className="px-6 py-2 rounded-md bg-white shadow-sm text-blue-700 font-bold text-sm transition-all">STUDENT</Link>
                        <Link to="/teacher" className="px-6 py-2 rounded-md text-slate-500 hover:text-slate-900 font-bold text-sm transition-all">TEACHER</Link>
                    </div>
                )}
            </header>

            {readyToStartCourses.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold mb-4">Assigned Courses</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {readyToStartCourses.map(course => (
                            <div key={course.course_id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                                <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white space-y-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-black uppercase tracking-widest">
                                            {getCourseBriefLabel(course)}
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">Assigned</span>
                                    </div>
                                    <h3 className="font-bold text-xl leading-tight">{course.course_name}</h3>
                                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2">Course Brief</p>
                                        <p className="text-sm text-slate-100 leading-relaxed">{getCourseSummary(course)}</p>
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <p className="text-sm text-slate-600 mb-4 flex-1">{getCourseSupportText(course)}</p>
                                    <button
                                        onClick={() => handleStartCourse(course.course_id)}
                                        className="w-full py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-indigo-600 transition-colors"
                                    >
                                        Start Course
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

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
                                <div className="p-6 bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 text-white space-y-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-black uppercase tracking-widest">
                                            {getCourseBriefLabel(course)}
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">In Progress</span>
                                    </div>
                                    <h3 className="font-bold text-xl leading-tight">{course.course_name}</h3>
                                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2">Course Brief</p>
                                        <p className="text-sm text-slate-100 leading-relaxed">{getCourseSummary(course)}</p>
                                    </div>
                                </div>
                                <div className="p-6">
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

            {previewCatalog.length > 0 && (
                <section>
                    <h2 className="text-2xl font-bold mb-4">Teacher Preview Catalog</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {previewCatalog.map(course => (
                            <div key={course.course_id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                                <div className="p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white space-y-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-black uppercase tracking-widest">
                                            {getCourseBriefLabel(course)}
                                        </span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">Preview</span>
                                    </div>
                                    <h3 className="font-bold text-xl leading-tight">{course.course_name}</h3>
                                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-2">Course Brief</p>
                                        <p className="text-sm text-slate-100 leading-relaxed">{getCourseSummary(course)}</p>
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <p className="text-sm text-slate-600 mb-4 flex-1">{getCourseSupportText(course)}</p>
                                    <button
                                        onClick={() => handlePreviewCourse(course.course_id)}
                                        className="w-full py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-indigo-600 transition-colors"
                                    >
                                        Preview Course
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
