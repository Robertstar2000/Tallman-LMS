import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lesson, Enrollment, Course, User } from '../types';
import { TallmanAPI } from '../backend-server';

const CoursePlayer: React.FC<{ refreshUser: () => void }> = ({ refreshUser }) => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showCompletion, setShowCompletion] = useState(false);
  const [failedAttempt, setFailedAttempt] = useState(false);

  useEffect(() => {
    const initPlayer = async () => {
      if (!courseId) return;
      setLoading(true);
      try {
        const [sessionUser, fetchedCourse] = await Promise.all([
          TallmanAPI.getCurrentSession(),
          TallmanAPI.getCourse(courseId)
        ]);

        if (sessionUser && fetchedCourse) {
          setUser(sessionUser);
          setCourse(fetchedCourse);
          const enroll = await TallmanAPI.enroll(sessionUser.user_id, courseId);
          setEnrollment(enroll);
        }
      } catch (err) {
        console.error("Initialization failure:", err);
      } finally {
        setLoading(false);
      }
    };
    initPlayer();
  }, [courseId]);

  const modules = useMemo(() => course?.modules || [], [course]);
  const flatLessons = useMemo(() => modules.flatMap(m => m.lessons), [modules]);

  useEffect(() => {
    if (flatLessons.length > 0 && enrollment && !activeLessonId && !showCompletion) {
      const completedIds = enrollment.completed_lesson_ids || [];
      const nextToComplete = flatLessons.find(l => !completedIds.includes(l.lesson_id));
      if (nextToComplete) {
        setActiveLessonId(nextToComplete.lesson_id);
      } else if (enrollment.progress_percent === 100) {
        setShowCompletion(true);
      } else {
        setActiveLessonId(flatLessons[0].lesson_id);
      }
    }
  }, [flatLessons, enrollment, activeLessonId, showCompletion]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeLessonId]);

  const currentLesson = useMemo(() =>
    flatLessons.find(l => l.lesson_id === activeLessonId) || null
    , [flatLessons, activeLessonId]);

  const activeLessonIdx = useMemo(() =>
    flatLessons.findIndex(l => l.lesson_id === activeLessonId)
    , [flatLessons, activeLessonId]);

  const isLastLesson = activeLessonIdx !== -1 && activeLessonIdx === flatLessons.length - 1;

  const handleMarkComplete = async (lessonId: string) => {
    if (!enrollment) return;
    try {
      const updatedEnrollment = await TallmanAPI.updateProgress(enrollment.enrollment_id, lessonId);
      setEnrollment(updatedEnrollment);
      refreshUser();
    } catch (err) {
      console.error("Progress Sync Error:", err);
    }
  };

  const handleProceed = useCallback(() => {
    if (activeLessonIdx === -1) return;
    if (isLastLesson) {
      setShowCompletion(true);
    } else {
      const nextLesson = flatLessons[activeLessonIdx + 1];
      if (nextLesson) {
        setQuizScore(null);
        setUserAnswers([]);
        setFailedAttempt(false);
        setActiveLessonId(nextLesson.lesson_id);
      }
    }
  }, [activeLessonIdx, isLastLesson, flatLessons]);

  const handleQuizSubmit = async () => {
    if (!currentLesson?.quiz_questions || !enrollment) return;
    const score = userAnswers.reduce((acc, ans, idx) => {
      return ans === currentLesson.quiz_questions![idx].correctIndex ? acc + 1 : acc;
    }, 0);

    setQuizScore(score);
    const passThreshold = 2; // Required: 2 out of 3
    const passed = score >= passThreshold;

    // Sync attempts with server for mastery calculation
    const updated = await TallmanAPI.recordQuizAttempt(enrollment.enrollment_id, currentLesson.lesson_id, passed);
    setEnrollment(updated);
    refreshUser();

    if (!passed) {
      setFailedAttempt(true);
    }
  };

  const renderDocumentContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-6 text-slate-800">
        {lines.map((line, idx) => {
          if (line.startsWith('# ')) return <h1 key={idx} className="text-4xl font-black tracking-tighter uppercase italic border-b-4 border-indigo-600 pb-4 mb-8">{line.substring(2)}</h1>;
          if (line.startsWith('## ')) return <h2 key={idx} className="text-2xl font-black text-indigo-900 tracking-tight uppercase mt-12 mb-4">{line.substring(3)}</h2>;
          if (line.startsWith('### ')) return <h3 key={idx} className="text-xl font-black text-slate-900 uppercase tracking-widest mt-8 mb-4">{line.substring(4)}</h3>;
          if (line.startsWith('* ')) return <li key={idx} className="ml-6 mb-2 font-bold flex items-start gap-2"><span className="text-indigo-600">▪</span> {line.substring(2)}</li>;
          if (line.includes('|')) {
            const cells = line.split('|').filter(c => c.trim().length > 0);
            if (line.includes('---')) return null;
            return (
              <div key={idx} className="flex border-b border-slate-100 py-4 gap-4 overflow-x-auto">
                {cells.map((cell, cIdx) => (
                  <span key={cIdx} className={`flex-1 min-w-[120px] text-sm font-black uppercase tracking-wider ${cIdx === 0 ? 'text-indigo-600' : 'text-slate-600'}`}>{cell.trim()}</span>
                ))}
              </div>
            );
          }
          return line.trim() === '' ? <div key={idx} className="h-4" /> : <p key={idx} className="leading-[1.8] text-lg font-medium">{line}</p>;
        })}
      </div>
    );
  };

  const finalCourseScore = useMemo(() => {
    if (!enrollment || !flatLessons.length) return 0;
    const quizLessons = flatLessons.filter(l => l.lesson_type === 'quiz');
    if (!quizLessons.length) return 100;
    const passedOnFirstTry = quizLessons.filter(l => {
      const attempts = enrollment.unit_attempts?.[l.lesson_id] || 0;
      const isComplete = enrollment.completed_lesson_ids?.includes(l.lesson_id);
      return attempts === 1 && isComplete;
    }).length;
    return Math.round((passedOnFirstTry / quizLessons.length) * 100);
  }, [enrollment, flatLessons]);

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center p-20 text-center">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full mb-6"></div>
      <p className="font-black text-slate-400 uppercase tracking-widest text-sm">Syncing Technical Core...</p>
    </div>
  );

  if (!course || !enrollment) return (
    <div className="h-full flex flex-col items-center justify-center p-20 text-center">
      <h2 className="text-2xl font-black text-slate-900 mb-6 uppercase tracking-tighter italic">Invalid Path</h2>
      <button onClick={() => navigate('/')} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black">Return Home</button>
    </div>
  );

  return (
    <div className="h-[calc(100vh-12rem)] md:h-[calc(100vh-6rem)] flex flex-col lg:flex-row gap-6 animate-in fade-in duration-500">
      <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] shadow-sm border overflow-hidden relative">
        <div ref={scrollRef} className="p-8 md:p-12 flex-1 overflow-y-auto custom-scrollbar">
          {showCompletion ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="text-9xl mb-8 drop-shadow-2xl">🏆</div>
              <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter italic uppercase">Certification Verified</h1>
              <p className="text-slate-500 text-xl mb-6 max-w-sm font-medium">Credential: <span className="text-indigo-600 font-black">{course.course_name}</span></p>
              <div className="bg-indigo-50 px-8 py-6 rounded-3xl mb-12 border border-indigo-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">First-Attempt Mastery Score</p>
                <p className="text-4xl font-black text-indigo-600">{finalCourseScore}%</p>
              </div>
              <Link to="/" className="px-12 py-6 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-2xl hover:bg-slate-900 transition-all">Finish Path</Link>
            </div>
          ) : !currentLesson ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <h2 className="text-3xl font-black text-slate-900 uppercase italic">Curriculum Ready</h2>
              {flatLessons.length > 0 && (
                <button onClick={() => setActiveLessonId(flatLessons[0].lesson_id)} className="mt-8 px-10 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest">Initialize Sequence</button>
              )}
              {flatLessons.length === 0 && (
                <p className="mt-4 text-slate-400 font-bold uppercase tracking-widest italic">Scanning for architectural units...</p>
              )}
            </div>
          ) : (
            <div key={currentLesson.lesson_id} className="max-w-4xl mx-auto w-full pb-20">
              <header className="mb-12 border-b-2 border-slate-50 pb-8">
                <span className="px-4 py-1.5 bg-indigo-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest mb-4 inline-block">{currentLesson.lesson_type === 'quiz' ? 'Audit' : 'Manual'}</span>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none mt-2">{currentLesson.lesson_title}</h1>
              </header>

              <main>
                {currentLesson.lesson_type === 'document' ? (
                  <div className="space-y-12">
                    <div className="bg-white text-slate-800 whitespace-pre-wrap font-sans">
                      {renderDocumentContent(currentLesson.content || "Archiving error: Material missing.")}
                    </div>
                    <button onClick={() => { handleMarkComplete(currentLesson.lesson_id); handleProceed(); }} className="w-full md:w-auto px-12 py-6 bg-emerald-600 text-white rounded-2xl font-black text-xl hover:bg-emerald-700 shadow-xl transition-all">Accept SOP & Continue</button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {failedAttempt && (
                      <div className="p-8 bg-rose-50 border-2 border-rose-100 rounded-[2.5rem] mb-8 text-center animate-in shake">
                        <h3 className="text-xl font-black text-rose-600 uppercase italic">Technical Audit Failed</h3>
                        <p className="text-rose-500 font-bold mt-2">Score: {quizScore}/3. Required: 2/3. Return to manual to re-verify technical data.</p>
                        <button onClick={() => {
                          const doc = flatLessons[activeLessonIdx - 1];
                          if (doc) setActiveLessonId(doc.lesson_id);
                          setQuizScore(null);
                          setUserAnswers([]);
                          setFailedAttempt(false);
                        }} className="mt-4 px-8 py-3 bg-white border border-rose-200 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all">Review Training Manual</button>
                      </div>
                    )}

                    {currentLesson.quiz_questions?.map((q, qIdx) => (
                      <div key={qIdx} className="p-10 bg-white border-2 border-slate-100 rounded-[3rem] shadow-sm">
                        <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tighter">{qIdx + 1}. {q.question}</h3>
                        <div className="grid grid-cols-1 gap-4">
                          {q.options.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              disabled={quizScore !== null && !failedAttempt}
                              onClick={() => setUserAnswers(prev => { const n = [...prev]; n[qIdx] = oIdx; return n; })}
                              className={`p-6 text-left rounded-2xl border-2 font-bold transition-all ${userAnswers[qIdx] === oIdx ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-indigo-100'}`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}

                    {(quizScore === null || failedAttempt) ? (
                      <button onClick={handleQuizSubmit} disabled={!currentLesson.quiz_questions?.every((_, idx) => userAnswers[idx] !== undefined)} className="w-full py-8 bg-indigo-600 text-white rounded-[2rem] font-black text-2xl shadow-2xl disabled:opacity-30">Commit Audit</button>
                    ) : (
                      <div className="p-16 text-center bg-white rounded-[4rem] border-4 border-indigo-100 shadow-2xl">
                        <div className="text-6xl mb-6">✅</div>
                        <h2 className="text-4xl font-black text-slate-900 mb-8 uppercase italic">Audit Passed: {quizScore}/3</h2>
                        <button onClick={handleProceed} className="w-full py-6 bg-indigo-600 text-white rounded-3xl font-black text-xl">Continue Sequence</button>
                      </div>
                    )}
                  </div>
                )}
              </main>
            </div>
          )}
        </div>
      </div>

      <aside className="w-full lg:w-[400px] bg-white rounded-[3rem] p-8 border shadow-sm flex flex-col overflow-hidden">
        <header className="mb-8">
          <h2 className="text-2xl font-black text-slate-900 uppercase italic">Syllabus</h2>
          <div className="mt-6 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${enrollment.progress_percent}%` }}></div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto space-y-8 custom-scrollbar pr-2">
          {modules.map((mod, mIdx) => (
            <div key={mod.module_id}>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{mIdx + 1}. {mod.module_title}</p>
              <div className="space-y-2">
                {mod.lessons.map(l => {
                  const active = activeLessonId === l.lesson_id;
                  const done = enrollment.completed_lesson_ids?.includes(l.lesson_id);
                  const attempts = enrollment.unit_attempts?.[l.lesson_id] || 0;
                  return (
                    <button key={l.lesson_id} onClick={() => { setActiveLessonId(l.lesson_id); setShowCompletion(false); setQuizScore(null); setUserAnswers([]); setFailedAttempt(false); }} className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${active ? 'bg-indigo-600 border-indigo-600 text-white' : done ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${active ? 'bg-white/20' : done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{done ? (attempts > 1 ? '⚠️' : '✓') : (attempts > 0 ? '❌' : '•')}</div>
                      <span className="text-xs font-black truncate">{l.lesson_title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }`}</style>
    </div>
  );
};

export default CoursePlayer;