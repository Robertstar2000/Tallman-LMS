
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Course, Enrollment } from '../types';
import { TallmanAPI } from '../backend-server';

const LearnerDashboard: React.FC<{ user: User; refreshUser: () => void }> = ({ user: initialUser, refreshUser }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User>(initialUser);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const refreshData = async () => {
      const [u, c, e] = await Promise.all([
        TallmanAPI.getCurrentSession(),
        TallmanAPI.getCourses(),
        TallmanAPI.getEnrollments(initialUser.user_id)
      ]);
      if (u) setUser(u);
      setCourses(c);
      setEnrollments(e);
      setHasLoaded(true);
    };
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [initialUser.user_id]);

  const activeCourses = useMemo(() => {
    return enrollments
      .filter(e => e.status !== 'completed' && e.progress_percent < 100)
      .map(e => {
        const course = courses.find(c => c.course_id === e.course_id);
        return course ? { ...course, progress: e.progress_percent } : null;
      })
      .filter(Boolean) as (Course & { progress: number })[];
  }, [courses, enrollments]);

  const completedCourses = useMemo(() => {
    return enrollments
      .filter(e => e.status === 'completed' || e.progress_percent === 100)
      .map(e => {
        const course = courses.find(c => c.course_id === e.course_id);
        return course ? { ...course, progress: 100 } : null;
      })
      .filter(Boolean) as (Course & { progress: number })[];
  }, [courses, enrollments]);

  const availableCatalog = useMemo(() => {
    const enrolledIds = new Set(enrollments.map(e => e.course_id));
    return courses.filter(c => !enrolledIds.has(c.course_id));
  }, [courses, enrollments]);

  const handleStartCourse = async (courseId: string) => {
    try {
      await TallmanAPI.enroll(initialUser.user_id, courseId);
      await refreshUser();
      // Data will refresh via the interval or we can force it
      window.location.reload();
    } catch (err) {
      alert("Registration failure. Check network integrity.");
    }
  };

  if (!hasLoaded) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-20 text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full mb-4"></div>
        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Synchronizing Path Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none italic uppercase">Personnel Console</h1>
          <p className="text-slate-500 mt-4 font-medium text-lg">&gt; Hello, <span className="text-indigo-600 font-black">{user.display_name}</span>. Resuming your professional mastering sequence.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border text-center min-w-[140px]">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">XP Points</p>
            <p className="text-4xl font-black text-indigo-600">{user.points}</p>
          </div>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border text-center min-w-[140px]">
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Rank Level</p>
            <p className="text-4xl font-black text-amber-500">{user.level}</p>
          </div>
        </div>
      </header>

      {/* Active Tracks */}
      <section className="relative">
        <div className="flex items-center justify-between mb-8 px-2">
          <div className="flex items-baseline gap-4">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Current Tracks</h2>
            <span className="text-indigo-400 font-black uppercase text-xs tracking-widest">{activeCourses.length} ACTIVE</span>
          </div>
        </div>

        <div className="flex gap-8 overflow-x-auto pb-12 pt-4 px-2 snap-x hide-scrollbar">
          {activeCourses.map((course) => (
            <Link
              key={course.course_id}
              to={`/player/${course.course_id}`}
              className="group relative flex-none w-[380px] h-[600px] bg-white rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden hover:shadow-[0_48px_80px_-20px_rgba(0,0,0,0.15)] hover:-translate-y-4 transition-all duration-700 snap-start"
            >
              <div className="absolute inset-0">
                <img src={course.thumbnail_url} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-[2s] ease-out" alt="" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
              </div>

              <div className="absolute top-8 left-8">
                <div className="px-5 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full font-black text-white text-[10px] uppercase tracking-widest">
                  {course.progress}% Complete
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-10 space-y-6">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Industrial Path</p>
                  <h3 className="text-3xl font-black text-white leading-none tracking-tighter italic">{course.course_name}</h3>
                </div>

                <div className="pt-4 space-y-4">
                  <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden backdrop-blur-md">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>

                  <button className="w-full py-5 bg-white text-slate-900 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    Resume Calibration
                  </button>
                </div>
              </div>
            </Link>
          ))}

          {activeCourses.length === 0 && (
            <div className="w-full bg-slate-100/50 rounded-[3.5rem] p-20 border-4 border-dashed border-slate-200 text-center flex flex-col items-center justify-center">
              <p className="text-2xl font-black text-slate-300 uppercase italic">No Active Tracks Assigned</p>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Initialize a selection from the library below.</p>
            </div>
          )}
        </div>
      </section>

      {/* Available for Initialization */}
      <section className="space-y-8">
        <div className="flex items-baseline gap-4 px-2">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Registry Library</h2>
          <span className="text-slate-400 font-black uppercase text-xs tracking-widest">{availableCatalog.length} AVAILABLE</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-2">
          {availableCatalog.map(course => (
            <div key={course.course_id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between h-[300px]">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="px-3 py-1 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">{course.difficulty}</span>
                  <span className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-xl">⚙️</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">{course.course_name}</h3>
                <p className="text-slate-500 text-xs font-medium line-clamp-2">{course.short_description}</p>
              </div>
              <button
                onClick={() => handleStartCourse(course.course_id)}
                className="w-full py-4 border-2 border-indigo-600 text-indigo-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
              >
                Initialize Track
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Accomplishment Records */}
      {completedCourses.length > 0 && (
        <section className="space-y-8">
          <div className="flex items-baseline gap-4 px-2">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic opacity-50">Mastery Records</h2>
            <span className="text-emerald-400 font-black uppercase text-xs tracking-widest">{completedCourses.length} ARCHIVED</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-2">
            {completedCourses.map(course => (
              <div key={course.course_id} className="bg-slate-50 p-8 rounded-[3rem] border border-slate-200 flex items-center gap-6 opacity-60 hover:opacity-100 transition-opacity">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl shadow-inner">🏆</div>
                <div>
                  <h4 className="font-black text-slate-900 italic uppercase">{course.course_name}</h4>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Mastery Achieved</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default LearnerDashboard;
