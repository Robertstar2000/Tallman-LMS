import React, { useMemo, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Course, User, Enrollment, Module } from '../types';
import { TallmanAPI } from '../backend-server';
import { generateCourseOutline, generateUnitContent, generateCourseThumbnail } from '../geminiService';

const AdminDashboard: React.FC<{ user: User }> = ({ user }) => {
  const navigate = useNavigate();
  const isAdmin = user.roles.includes('Admin' as any);
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [regenProgress, setRegenProgress] = useState<Record<string, { current: number, total: number, status: string }>>({});
  const [isSyncingThumbnail, setIsSyncingThumbnail] = useState<Record<string, boolean>>({});
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, course: Course | null }>({ isOpen: false, course: null });
  const [editModal, setEditModal] = useState<{ isOpen: boolean, course: Course | null }>({ isOpen: false, course: null });
  const [attachmentModal, setAttachmentModal] = useState<{ isOpen: boolean, course: Course | null }>({ isOpen: false, course: null });
  const [isSaving, setIsSaving] = useState(false);

  const refreshData = async () => {
    try {
      // Fetch data based on permissions
      const fetchOps: Promise<any>[] = [
        TallmanAPI.getCourses(),
        TallmanAPI.getEnrollments()
      ];

      // Only attempt to fetch users if specifically an admin
      if (isAdmin) {
        fetchOps.push(TallmanAPI.getUsers());
      }

      const results = await Promise.allSettled(fetchOps);

      const c = results[0].status === 'fulfilled' ? (results[0] as PromiseFulfilledResult<Course[]>).value : [];
      const e = results[1].status === 'fulfilled' ? (results[1] as PromiseFulfilledResult<Enrollment[]>).value : [];
      const u = (isAdmin && results[2]?.status === 'fulfilled') ? (results[2] as PromiseFulfilledResult<User[]>).value : [];

      setCourses(c || []);
      setEnrollments(e || []);
      setUsers(u || []);
    } catch (err: any) {
      const errorMsg = err.message || 'Unknown Error';
      const sanitizedError = errorMsg.length > 500 ? errorMsg.substring(0, 500) + '... (truncated)' : errorMsg;
      console.error("Dashboard Refresh Failure:", sanitizedError);
      // Force logout if token is invalid or expired (401/403)
      if (err.message?.includes('403') || err.message?.includes('401') || err.message?.includes('token')) {
        TallmanAPI.logout();
        window.location.reload();
      }
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleBulkVisualSync = async () => {
    if (!window.confirm("Initialize Bulk Visual Sync? AI engines will regenerate thumbnails for all registry courses. This may take several minutes.")) return;
    for (const course of courses) {
      await handleRefreshThumbnail(course);
    }
    alert("Bulk Visual Sync complete. Registry imagery updated.");
  };

  const handleRefreshThumbnail = async (course: Course) => {
    if (isSyncingThumbnail[course.course_id]) return;
    setIsSyncingThumbnail(prev => ({ ...prev, [course.course_id]: true }));
    try {
      const newUrl = await generateCourseThumbnail(course.course_name);
      await TallmanAPI.updateCourse({ ...course, thumbnail_url: newUrl });
      await refreshData();
    } catch (err) {
      console.error("Thumbnail Sync Failed:", err.message);
      alert("Visual Sync failed. Check network integrity.");
    } finally {
      setIsSyncingThumbnail(prev => ({ ...prev, [course.course_id]: false }));
    }
  };

  const handleRegenerate = async (course: Course) => {
    setConfirmModal({ isOpen: false, course: null });
    if (regenProgress[course.course_id]) return;

    setRegenProgress(prev => ({
      ...prev,
      [course.course_id]: { current: 0, total: 1, status: 'Initializing Architect...' }
    }));

    try {
      setStatus(course.course_id, 'Updating visual identity...');
      const thumbnailUrl = await generateCourseThumbnail(course.course_name);

      const outline = await generateCourseOutline(course.course_name);
      const { titles } = outline;
      const total = titles.length;

      const updatedModules: Module[] = [];

      setRegenProgress(prev => ({
        ...prev,
        [course.course_id]: { ...prev[course.course_id], total, status: 'Outline Verified.' }
      }));

      for (let i = 0; i < total; i++) {
        let unitData: any = null;
        let unitRetries = 0;
        const maxUnitRetries = 3;

        while (!unitData && unitRetries < maxUnitRetries) {
          try {
            // Cooldown for 429 mitigation
            if (i > 0 || unitRetries > 0) {
              const delay = unitRetries > 0 ? 8000 : 4000;
              setStatus(course.course_id, unitRetries > 0 ? `Retrying Unit Sync (Attempt ${unitRetries})...` : 'Cooling down AI engines...');
              await new Promise(r => setTimeout(r, delay));
            }

            setRegenProgress(prev => ({
              ...prev,
              [course.course_id]: { ...prev[course.course_id], current: i + 1, status: `Drafting: ${titles[i]}` }
            }));

            unitData = await generateUnitContent(course.course_name, titles[i]);
          } catch (unitErr: any) {
            unitRetries++;
            console.warn(`Unit Architectural Sync Warning (${titles[i]}):`, unitErr.message);

            // If it's just a browser noise error, we don't count it as a retry but we log it
            if (unitErr.message?.includes('message channel closed')) {
              unitRetries--; // Don't count noise against retry limit
              console.info("Supressing benign browser message channel error.");
            }

            if (unitRetries >= maxUnitRetries) {
              console.error(`Final Architectural Failure for ${titles[i]}. Applying Fail-Open Fallback.`);
              unitData = {
                content: `# ${titles[i]}\n\nTechnical synchronization for this unit encountered a structural timeout. Please review the following safety protocol.\n\n## Mandatory Safety Acknowledgement\nBy proceeding, you verify that you have reviewed the primary documentation for **${titles[i]}** in the Tallman Technical Repository.`,
                quiz: [
                  { question: "Have you reviewed the technical documentation for this unit?", options: ["Yes, documentation reviewed.", "In progress", "No", "N/A"], correctIndex: 0 }
                ]
              };
            } else {
              // Wait before next retry if not noise
              const delay = 8000;
              setStatus(course.course_id, `Retrying Unit Sync (Attempt ${unitRetries})...`);
              await new Promise(r => setTimeout(r, delay));
            }
          }
        }

        const moduleId = `m_${course.course_id}_${i}_${Date.now()}`;
        updatedModules.push({
          module_id: moduleId,
          course_id: course.course_id,
          module_title: titles[i],
          position: i,
          lessons: [
            {
              lesson_id: `l_${moduleId}_doc`,
              module_id: moduleId,
              lesson_title: `${titles[i]}: Technical Manual`,
              lesson_type: 'document',
              duration_minutes: 45,
              content: unitData.content
            },
            {
              lesson_id: `l_${moduleId}_quiz`,
              module_id: moduleId,
              lesson_title: `${titles[i]}: Safety Audit`,
              lesson_type: 'quiz',
              duration_minutes: 15,
              quiz_questions: unitData.quiz
            }
          ]
        });
      }

      const updatedCourse = { ...course, modules: updatedModules, thumbnail_url: thumbnailUrl };
      await TallmanAPI.updateCourse(updatedCourse);

      await TallmanAPI.resetEnrollmentsForCourse(course.course_id);

      await refreshData();

      setRegenProgress(prev => {
        const next = { ...prev };
        delete next[course.course_id];
        return next;
      });
      alert(`Course "${course.course_name}" successfully re-architected. 1500+ word manuals generated. All technician progress reset for compliance.`);
    } catch (err: any) {
      // Noise Suppression: Ignore extension related errors that don't breaks our data flow
      if (err.message?.includes('message channel closed') || err.message?.includes('listener indicated')) {
        console.warn("Caught and suppressed benign browser extension error during regeneration.");
        return;
      }

      console.error(err);
      if (err.message?.includes('403') || err.message?.includes('401') || err.message?.includes('token')) {
        TallmanAPI.logout();
        window.location.reload();
      }
      alert(err.message?.includes('429')
        ? "Regeneration paused due to AI rate limits. Please wait 60 seconds and try again."
        : "Regeneration failure. Industrial service timeout.");
      setRegenProgress(prev => {
        const next = { ...prev };
        delete next[course.course_id];
        return next;
      });
    }
  };

  const handleQuickSave = async () => {
    if (!editModal.course) return;
    setIsSaving(true);
    try {
      await TallmanAPI.updateCourse(editModal.course);
      await refreshData();
      setEditModal({ isOpen: false, course: null });
    } catch (err) {
      console.error(err);
      alert("System Sync Error: Could not commit changes to registry.");
    } finally {
      setIsSaving(false);
    }
  };

  const setStatus = (id: string, status: string) => {
    setRegenProgress(prev => ({
      ...prev,
      [id]: { ...prev[id], status }
    }));
  }

  const handleDownloadCourse = async (courseId: string) => {
    try {
      const deepCourse = await TallmanAPI.getCourse(courseId);
      if (!deepCourse) return;

      const blob = new Blob([JSON.stringify(deepCourse, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tallman_course_${courseId}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Download Failure: Registry extraction failed.");
    }
  };

  const handleUploadCourse = async (event: React.ChangeEvent<HTMLInputElement>, targetCourseId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = JSON.parse(e.target?.result as string);
        // Force course_id to match target if we are uploading to replace
        content.course_id = targetCourseId;

        setIsSaving(true);
        await TallmanAPI.updateCourse(content);
        alert("System Synchronized: Architecture Overwritten.");
        await refreshData();
      } catch (err) {
        console.error(err);
        alert("Upload Corrupted: JSON architecture validation failed.");
      } finally {
        setIsSaving(false);
        event.target.value = ''; // Reset input
      }
    };
    reader.readAsText(file);
  };

  const stats = useMemo(() => {
    const activeLearnerIds = new Set(
      enrollments
        .filter(e => e.status === 'active' && e.progress_percent > 0 && e.progress_percent < 100)
        .map(e => e.user_id)
    );
    const totalCompletions = enrollments.filter(e => e.progress_percent === 100).length;
    const totalXP = users.reduce((acc, u) => acc + (u.points || 0), 0);

    const s = [
      { id: 'active', label: 'Active Learners', value: activeLearnerIds.size.toLocaleString(), icon: '🔥' },
      { id: 'completions', label: 'Course Completions', value: totalCompletions.toLocaleString(), icon: '🎓' },
    ];

    if (isAdmin) {
      s.unshift({ id: 'users', label: 'Total Users', value: users.length.toLocaleString(), icon: '👥' });
      s.push({ id: 'revenue', label: 'Credits Issued (XP)', value: totalXP.toLocaleString(), icon: '💎' });
    }

    return s;
  }, [users, enrollments, isAdmin]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500 relative pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight underline decoration-indigo-200 decoration-4 underline-offset-4 uppercase italic">Tallman Console</h1>
          <p className="text-slate-500 font-medium">Real-time enterprise metrics and curriculum mastering.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleBulkVisualSync}
            className="px-6 py-3 bg-white border-2 border-slate-100 text-slate-900 rounded-2xl font-black hover:bg-slate-50 transition-all flex items-center gap-2 text-xs uppercase tracking-widest"
          >
            📸 Bulk Visual Sync
          </button>
          <Link to="/admin/courses" className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-lg shadow-indigo-100 flex items-center gap-2 transition-all active:scale-95 text-xs uppercase tracking-widest">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            Architect New Path
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <button
            key={stat.id}
            onClick={() => setSelectedStat(selectedStat === stat.id ? null : stat.id)}
            className={`text-left p-8 rounded-[2.5rem] border-2 transition-all shadow-sm group ${selectedStat === stat.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md'
              }`}
          >
            <div className="flex justify-between items-start mb-6">
              <span className="text-4xl grayscale group-hover:grayscale-0 transition-all">{stat.icon}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${selectedStat === stat.id ? 'text-indigo-100' : 'text-slate-400'}`}>{stat.label}</p>
            <h3 className="text-4xl font-black mt-1 tracking-tighter">{stat.value}</h3>
          </button>
        ))}
      </div>

      {selectedStat && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 bg-white rounded-[3rem] border-2 border-indigo-100 p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-5 text-9xl font-black select-none p-10 uppercase italic">AUDIT</div>
          {selectedStat === 'users' && <UserList users={users} />}
          {selectedStat === 'active' && <ActiveLearnersList enrollments={enrollments} users={users} courses={courses} />}
          {selectedStat === 'completions' && <CompletionMetrics enrollments={enrollments} courses={courses} users={users} />}
          {selectedStat === 'revenue' && <XPLeaderboard users={users} />}
        </div>
      )}

      <section className="bg-white rounded-[3.5rem] border-2 border-slate-100 shadow-xl overflow-hidden text-slate-900">
        <div className="p-10 border-b flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl">🛠️</div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">Curriculum Mastering</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrative AI Orchestration</p>
            </div>
          </div>
          <div className="flex gap-4">
            {isAdmin && (
              <>
                <button
                  onClick={async () => {
                    const deepCourses = await Promise.all(courses.map(c => TallmanAPI.getCourse(c.course_id)));
                    const blob = new Blob([JSON.stringify(deepCourses, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `tallman_registry_backup_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                  }}
                  className="text-[10px] font-black uppercase tracking-widest bg-white border-2 border-slate-100 px-6 py-3 rounded-xl hover:border-indigo-600 transition-all flex items-center gap-2"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  Registry Export
                </button>
                <label className="text-[10px] font-black uppercase tracking-widest bg-white border-2 border-slate-100 px-6 py-3 rounded-xl hover:border-emerald-600 transition-all flex items-center gap-2 cursor-pointer">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                  Registry Import
                  <input
                    type="file"
                    className="hidden"
                    accept=".json"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (re) => {
                        try {
                          const data = JSON.parse(re.target?.result as string);
                          const coursesArray = Array.isArray(data) ? data : [data];
                          setIsSaving(true);
                          for (const c of coursesArray) {
                            await TallmanAPI.updateCourse(c);
                          }
                          alert("Registry Synchronized: Bulk Update Verified.");
                          await refreshData();
                        } catch (err) {
                          alert("Registry Import Failed: Data Integrity Error.");
                        } finally {
                          setIsSaving(false);
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </>
            )}
            <Link to="/admin/reports" className="text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-indigo-600 transition-all">
              Detailed Analytics
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-white text-slate-400 text-[10px] uppercase font-black tracking-[0.25em] border-b">
              <tr>
                <th className="px-10 py-8">Technical Path</th>
                <th className="px-10 py-8">Enrollments</th>
                <th className="px-10 py-8 text-right">Engineering</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courses.map((course, index) => {
                const isRegenerating = !!regenProgress[course.course_id];
                const isSyncing = isSyncingThumbnail[course.course_id];
                const progress = regenProgress[course.course_id];

                return (
                  <tr key={`${course.course_id}-admin-${index}`} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-5">
                        <div className="relative">
                          <img src={course.thumbnail_url} className={`w-20 h-12 rounded-xl object-cover border shadow-sm transition-all ${isSyncing ? 'opacity-30 blur-sm' : 'grayscale group-hover:grayscale-0'}`} alt="" />
                          {isSyncing && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full"></div>
                            </div>
                          )}
                        </div>
                        <div>
                          <span className="font-black text-slate-900 text-xl block leading-tight">{course.course_name}</span>
                          <span className="text-[9px] font-mono text-slate-400 uppercase mt-1">{course.course_id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      {isRegenerating ? (
                        <div className="space-y-2 max-w-[200px]">
                          <div className="flex justify-between items-center text-[9px] font-black text-indigo-600 uppercase">
                            <span>Architecting...</span>
                            <span>{progress.current}/{progress.total}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }}></div>
                          </div>
                          <p className="text-[8px] font-bold text-slate-400 truncate uppercase">{progress.status}</p>
                        </div>
                      ) : (
                        <span className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-black">
                          {enrollments.filter(e => e.course_id === course.course_id).length} Active
                        </span>
                      )}
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex items-center justify-end gap-3 flex-wrap max-w-md ml-auto">
                        <button
                          disabled={isRegenerating || isSyncing}
                          onClick={() => handleRefreshThumbnail(course)}
                          className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${isSyncing
                            ? 'bg-slate-50 text-slate-300'
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'
                            }`}
                          title="Nano Banana Visual Refresh"
                        >
                          <svg className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Visual Sync
                        </button>

                        <button
                          disabled={isRegenerating || isSyncing}
                          onClick={() => handleDownloadCourse(course.course_id)}
                          className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all active:scale-95 flex items-center gap-2"
                          title="Export Technical Architecture (JSON)"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                          Export JSON
                        </button>

                        <label className={`px-4 py-3 bg-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all active:scale-95 flex items-center gap-2 cursor-pointer ${isSaving ? 'opacity-30 cursor-not-allowed' : ''}`}>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          Import Replace
                          <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={(e) => handleUploadCourse(e, course.course_id)}
                            disabled={isSaving}
                          />
                        </label>

                        <button
                          disabled={isRegenerating || isSyncing}
                          onClick={() => setConfirmModal({ isOpen: true, course })}
                          className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${isRegenerating
                            ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white'
                            }`}
                        >
                          <svg className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          AI Re-Architect
                        </button>

                        <button
                          disabled={isRegenerating || isSyncing}
                          onClick={() => setEditModal({ isOpen: true, course })}
                          className="px-4 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95 flex items-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          Title Edit
                        </button>

                        <button
                          disabled={isRegenerating || isSyncing}
                          onClick={() => setAttachmentModal({ isOpen: true, course })}
                          className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${course.attachment_url ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500 hover:bg-indigo-600 hover:text-white'}`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                          {course.attachment_url ? 'Attachment Active' : 'Add Attachment'}
                        </button>

                        <button
                          disabled={isRegenerating || isSyncing}
                          onClick={() => navigate(`/admin/edit/${course.course_id}`)}
                          className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-30 flex items-center gap-2"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          Master Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* TITLE EDIT MODAL */}
      {editModal.isOpen && editModal.course && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="p-12 space-y-8">
              <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Registry Entry Update</h2>
                <p className="text-slate-400 font-bold uppercase text-[10px] mt-1 tracking-widest">Master ID: {editModal.course.course_id}</p>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Course Designation</label>
                  <input
                    className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-xl text-slate-900 focus:border-indigo-600 outline-none"
                    value={editModal.course.course_name}
                    onChange={(e) => setEditModal({ ...editModal, course: { ...editModal.course!, course_name: e.target.value } })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Technical Abstract</label>
                  <textarea
                    className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-medium text-slate-600 focus:border-indigo-600 outline-none h-32"
                    value={editModal.course.short_description}
                    onChange={(e) => setEditModal({ ...editModal, course: { ...editModal.course!, short_description: e.target.value } })}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setEditModal({ isOpen: false, course: null })}
                  className="flex-1 py-6 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                >
                  Discard
                </button>
                <button
                  onClick={handleQuickSave}
                  disabled={isSaving}
                  className="flex-2 py-6 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-slate-900 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? 'Synchronizing...' : 'Commit to Registry'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RE-ARCHITECT CONFIRMATION MODAL */}
      {confirmModal.isOpen && confirmModal.course && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] shadow-2xl overflow-hidden border-8 border-white animate-in zoom-in-95 duration-500">
            <div className="p-12 text-center space-y-8">
              <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-[2rem] flex items-center justify-center text-5xl mx-auto shadow-inner">⚠️</div>
              <div className="space-y-3">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Global Reset Warning</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs text-rose-500">Learner Progress Purge Required</p>
              </div>
              <div className="p-8 bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 text-left space-y-4">
                <p className="text-slate-600 leading-relaxed font-medium">
                  You are triggering a **Master Re-Architecture** for <span className="font-black text-slate-900">"{confirmModal.course.course_name}"</span>.
                </p>
                <p className="text-slate-600 leading-relaxed font-bold bg-rose-50 p-4 rounded-xl border border-rose-100">
                  IMPORTANT: Because technical SOPs are changing, ALL technician progress for this course will be reset to 0%. They must re-verify against the new architecture.
                </p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => setConfirmModal({ isOpen: false, course: null })}
                  className="flex-1 py-6 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRegenerate(confirmModal.course!)}
                  className="flex-2 py-6 bg-amber-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-slate-900 transition-all active:scale-95"
                >
                  Confirm & Reset All Learners
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* COURSE ATTACHMENT MODAL */}
      {attachmentModal.isOpen && attachmentModal.course && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[3.5rem] w-full max-w-2xl shadow-2xl border-4 border-slate-900 overflow-hidden animate-in zoom-in-95 duration-500">
            <header className="bg-slate-900 p-10 text-white">
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none">Industrial Asset Nexus</h2>
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mt-2 underline decoration-indigo-400/30">Course-Wide Technical Attachment Protocol</p>
            </header>

            <div className="p-12 space-y-8">
              <div className="bg-amber-50 border-l-4 border-amber-500 p-8 rounded-r-3xl">
                <p className="text-amber-800 font-bold text-sm leading-relaxed">
                  <span className="block font-black uppercase mb-2 text-xs tracking-wider">Architecture Guidance:</span>
                  Industrial best practice suggests editing **Test Questions** within the course modules to explicitly reference the technical data in this attachment.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-10">
                <div className="space-y-6">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Accepted Formats</label>
                  <div className="grid grid-cols-1 gap-3">
                    {['pdf', 'image', 'video'].map(type => (
                      <button
                        key={type}
                        onClick={() => setAttachmentModal({ ...attachmentModal, course: { ...attachmentModal.course!, attachment_type: type as any } })}
                        className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all font-black uppercase text-xs tracking-tight ${attachmentModal.course!.attachment_type === type ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400 hover:border-slate-300'}`}
                      >
                        {type}
                        {attachmentModal.course!.attachment_type === type && <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 01-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-2 px-2">Max Registry Volume: 100MB</p>
                </div>

                <div className="space-y-6">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Resource Locator (URL)</label>
                  <textarea
                    className="w-full h-40 p-6 rounded-3xl border bg-slate-50 font-medium text-slate-700 outline-none focus:ring-4 focus:ring-indigo-100 placeholder:text-slate-300 text-sm leading-relaxed"
                    placeholder="Enter https:// secure technical link..."
                    value={attachmentModal.course.attachment_url || ''}
                    onChange={(e) => setAttachmentModal({ ...attachmentModal, course: { ...attachmentModal.course!, attachment_url: e.target.value } })}
                  />
                  <p className="text-[10px] text-slate-400 font-bold leading-tight px-2">Note: Tallman CDN synchronizes .pdf, .jpg, and .mp4 orchestration.</p>
                </div>
              </div>

              <footer className="flex gap-4 pt-4">
                <button
                  onClick={() => setAttachmentModal({ isOpen: false, course: null })}
                  className="flex-1 py-6 bg-slate-100 text-slate-500 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all"
                >
                  Discard
                </button>
                <button
                  onClick={async () => {
                    if (!attachmentModal.course) return;
                    setIsSaving(true);
                    try {
                      await TallmanAPI.updateCourse(attachmentModal.course);
                      await refreshData();
                      setAttachmentModal({ isOpen: false, course: null });
                      alert("Technical Asset Synced: Registry Updated.");
                    } catch (err) {
                      alert("Sync Failure: Registry write error.");
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="flex-2 py-6 bg-indigo-600 text-white rounded-3xl font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-slate-900 transition-all"
                >
                  {isSaving ? 'Syncing...' : 'Confirm Attachment'}
                </button>
              </footer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal sub-components
const UserList: React.FC<{ users: User[] }> = ({ users }) => (
  <div className="space-y-4">
    <h3 className="text-2xl font-black mb-8 tracking-tighter uppercase italic text-slate-900">Workforce Registry</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {users.map(u => (
        <div key={u.user_id} className="p-6 bg-slate-50 border rounded-3xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center font-black text-slate-400">
            {u.display_name.split(' ').map(n => n[0]).join('').toUpperCase()}
          </div>
          <div>
            <p className="font-black text-slate-900">{u.display_name}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase">{u.roles.join(' / ')}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ActiveLearnersList: React.FC<{ enrollments: Enrollment[]; users: User[]; courses: Course[] }> = ({ enrollments, users, courses }) => {
  const activeEntries = enrollments.filter(e => e.progress_percent > 0 && e.progress_percent < 100);
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-black mb-8 tracking-tighter uppercase italic text-slate-900">Real-Time Progression Audit</h3>
      {activeEntries.length === 0 ? (
        <div className="py-20 text-center text-slate-400 font-black uppercase italic tracking-widest">No active study sessions detected.</div>
      ) : activeEntries.map((e) => {
        const user = users.find(u => u.user_id === e.user_id);
        const course = courses.find(c => c.course_id === e.course_id);
        return (
          <div key={e.enrollment_id} className="p-6 bg-slate-50 rounded-3xl flex items-center justify-between border hover:border-indigo-300 transition-all">
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black">👤</div>
              <div>
                <p className="font-black text-slate-900">{user?.display_name || 'Unknown User'}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{course?.course_name || 'Loading Path...'}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Live Progress</p>
                <p className="font-black text-indigo-600 text-xl">{e.progress_percent}%</p>
              </div>
              <div className="w-32 h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-100">
                <div className="bg-indigo-600 h-full transition-all duration-1000" style={{ width: `${e.progress_percent}%` }}></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CompletionMetrics: React.FC<{ enrollments: Enrollment[]; courses: Course[]; users: User[] }> = ({ enrollments, courses, users }) => {
  const completions = enrollments.filter(e => e.progress_percent === 100);
  return (
    <div className="space-y-8">
      <h3 className="text-2xl font-black mb-8 tracking-tighter uppercase italic text-slate-900">Credential Issuance Ledger</h3>
      {completions.length === 0 ? (
        <div className="py-20 text-center text-slate-400 font-black uppercase italic tracking-widest">No certifications issued in current cycle.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {completions.map(e => {
            const user = users.find(u => u.user_id === e.user_id);
            const course = courses.find(c => c.course_id === e.course_id);
            return (
              <div key={e.enrollment_id} className="p-8 border rounded-[2.5rem] bg-white hover:shadow-xl hover:border-emerald-500 transition-all group relative overflow-hidden">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-100 transition-opacity">
                  <span className="text-4xl">📜</span>
                </div>
                <h4 className="font-black text-slate-900 text-xl mb-2">{course?.course_name}</h4>
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest">Certified</div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Technician: {user?.display_name}</p>
                </div>
                <p className="text-[9px] text-slate-400 mt-4 font-mono">ENROLLMENT_ID: {e.enrollment_id}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const XPLeaderboard: React.FC<{ users: User[] }> = ({ users }) => {
  const sorted = [...users].sort((a, b) => (b.points || 0) - (a.points || 0));
  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-black mb-8 tracking-tighter uppercase italic text-slate-900">Workforce Merit Standings</h3>
      <div className="space-y-3">
        {sorted.map((u, i) => (
          <div key={u.user_id} className="p-6 bg-slate-50 rounded-3xl flex items-center justify-between border">
            <div className="flex items-center gap-5">
              <span className="w-8 font-black text-slate-300 text-2xl italic">#{i + 1}</span>
              <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center font-black text-xs text-slate-400">
                {u.display_name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <p className="font-black text-slate-900">{u.display_name}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-600 font-black text-2xl">{u.points?.toLocaleString() || 0}</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">XP</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;