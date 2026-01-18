
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Course, Module, Lesson, UserRole } from '../types';
import { TallmanAPI } from '../backend-server';

const AdminCourseEditor: React.FC = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      const data = await TallmanAPI.getCourse(courseId);
      setCourse(data);
      setLoading(false);
    };
    fetchCourse();
  }, [courseId]);

  const handleSave = async () => {
    if (!course) return;
    setSaving(true);
    try {
      await TallmanAPI.updateCourse(course);
      alert("System Integrity Verified: Course Updated.");
      navigate('/admin');
    } catch (err) {
      alert("Save Failed. Check console for details.");
    } finally {
      setSaving(false);
    }
  };

  const addModule = () => {
    if (!course) return;
    const newModule: Module = {
      module_id: `m_${Date.now()}`,
      course_id: course.course_id,
      module_title: 'New Technical Unit',
      position: (course.modules?.length || 0),
      lessons: []
    };
    setCourse({ ...course, modules: [...(course.modules || []), newModule] });
  };

  const deleteModule = (mIdx: number) => {
    if (!course || !course.modules) return;
    const modules = [...course.modules];
    modules.splice(mIdx, 1);
    setCourse({ ...course, modules });
  };

  const addLesson = (mIdx: number, type: 'document' | 'quiz') => {
    if (!course || !course.modules) return;
    const modules = [...course.modules];
    const newLesson: Lesson = {
      lesson_id: `l_${Date.now()}`,
      module_id: modules[mIdx].module_id,
      lesson_title: type === 'quiz' ? 'New Technical Audit' : 'New Technical Manual',
      lesson_type: type,
      duration_minutes: type === 'quiz' ? 15 : 45,
      content: type === 'document' ? 'Enter Tallman SOP details here...' : undefined,
      quiz_questions: type === 'quiz' ? [{ question: 'Verify system integrity?', options: ['Yes', 'No'], correctIndex: 0 }] : undefined
    };
    modules[mIdx].lessons.push(newLesson);
    setCourse({ ...course, modules });
  };

  const deleteLesson = (mIdx: number, lIdx: number) => {
    if (!course || !course.modules) return;
    const modules = [...course.modules];
    modules[mIdx].lessons.splice(lIdx, 1);
    setCourse({ ...course, modules });
  };

  const updateModuleTitle = (mIdx: number, val: string) => {
    if (!course || !course.modules) return;
    const modules = [...course.modules];
    modules[mIdx].module_title = val;
    setCourse({ ...course, modules });
  };

  const updateLessonField = (mIdx: number, lIdx: number, field: keyof Lesson, val: any) => {
    if (!course || !course.modules) return;
    const modules = [...course.modules];
    (modules[mIdx].lessons[lIdx] as any)[field] = val;
    setCourse({ ...course, modules });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full"></div>
    </div>
  );

  if (!course) return <div className="p-20 text-center font-black">COURSE NOT FOUND</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-32">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md p-8 rounded-[2rem] border shadow-xl flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">Master Architect Control</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Editing: {course.course_name}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => navigate('/admin')} className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Discard</button>
          <button onClick={handleSave} disabled={saving} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all">
            {saving ? 'Syncing...' : 'Publish To Core'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {course.modules?.map((mod, mIdx) => (
          <section key={mod.module_id} className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-sm overflow-hidden group">
            <header className="p-8 bg-slate-50 border-b flex items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <span className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xs">{mIdx + 1}</span>
                <input 
                  className="bg-transparent border-none outline-none text-2xl font-black text-slate-900 uppercase italic focus:ring-2 focus:ring-indigo-100 rounded-lg p-2 w-full"
                  value={mod.module_title}
                  onChange={(e) => updateModuleTitle(mIdx, e.target.value)}
                  placeholder="Unit Title..."
                />
              </div>
              <button onClick={() => deleteModule(mIdx)} className="text-rose-500 hover:text-rose-700 p-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </header>

            <div className="p-8 space-y-8">
              {mod.lessons.map((lesson, lIdx) => (
                <div key={lesson.lesson_id} className="p-8 bg-slate-50/50 border rounded-[2rem] space-y-4 relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${lesson.lesson_type === 'quiz' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {lesson.lesson_type}
                      </span>
                      <input 
                        className="bg-transparent font-black text-slate-900 outline-none focus:bg-white px-2 rounded"
                        value={lesson.lesson_title}
                        onChange={(e) => updateLessonField(mIdx, lIdx, 'lesson_title', e.target.value)}
                      />
                    </div>
                    <button onClick={() => deleteLesson(mIdx, lIdx)} className="text-slate-300 hover:text-rose-500 transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>

                  {lesson.lesson_type === 'document' ? (
                    <textarea 
                      className="w-full h-48 p-6 rounded-2xl border bg-white font-medium text-slate-700 outline-none focus:border-indigo-600"
                      value={lesson.content}
                      onChange={(e) => updateLessonField(mIdx, lIdx, 'content', e.target.value)}
                      placeholder="Technical Manual Content..."
                    />
                  ) : (
                    <div className="space-y-4">
                      {lesson.quiz_questions?.map((q, qIdx) => (
                        <div key={qIdx} className="bg-slate-900 p-8 rounded-3xl border border-white/10 shadow-xl space-y-4">
                          <input 
                            className="w-full font-black text-xl text-white mb-4 outline-none bg-transparent border-b-2 border-white/10 focus:border-indigo-500 pb-2"
                            value={q.question}
                            onChange={(e) => {
                              const qs = [...(lesson.quiz_questions || [])];
                              qs[qIdx].question = e.target.value;
                              updateLessonField(mIdx, lIdx, 'quiz_questions', qs);
                            }}
                          />
                          <div className="grid grid-cols-2 gap-4">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex gap-3 items-center">
                                <button 
                                  onClick={() => {
                                    const qs = [...(lesson.quiz_questions || [])];
                                    qs[qIdx].correctIndex = oIdx;
                                    updateLessonField(mIdx, lIdx, 'quiz_questions', qs);
                                  }}
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${q.correctIndex === oIdx ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white/5 border border-white/10 text-white/40'}`}
                                >
                                  {oIdx + 1}
                                </button>
                                <input 
                                  className="flex-1 text-xs font-bold bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
                                  value={opt}
                                  onChange={(e) => {
                                    const qs = [...(lesson.quiz_questions || [])];
                                    qs[qIdx].options[oIdx] = e.target.value;
                                    updateLessonField(mIdx, lIdx, 'quiz_questions', qs);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex gap-4 pt-4">
                <button onClick={() => addLesson(mIdx, 'document')} className="flex-1 py-4 border-2 border-dashed border-indigo-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:border-indigo-600 hover:text-indigo-600 transition-all">
                  + Add Manual
                </button>
                <button onClick={() => addLesson(mIdx, 'quiz')} className="flex-1 py-4 border-2 border-dashed border-amber-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-amber-400 hover:border-amber-600 hover:text-amber-600 transition-all">
                  + Add Audit
                </button>
              </div>
            </div>
          </section>
        ))}

        <button onClick={addModule} className="w-full py-12 border-4 border-dashed border-slate-200 rounded-[3rem] text-slate-300 hover:text-indigo-600 hover:border-indigo-600 transition-all flex flex-col items-center justify-center gap-4 group">
          <svg className="w-12 h-12 group-hover:scale-125 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4"/></svg>
          <span className="font-black uppercase tracking-[0.3em] text-sm">Expand Curriculum Architecture</span>
        </button>
      </div>
    </div>
  );
};

export default AdminCourseEditor;
