import React, { useState, useRef, useEffect } from 'react';
import { generateCourseOutline, generateUnitContent, generateCourseThumbnail } from '../geminiService';
import { Course, CourseStatus, Module } from '../types';
import { useNavigate } from 'react-router-dom';
import { TallmanAPI } from '../backend-server';

const AdminCourseCreator: React.FC = () => {
  const navigate = useNavigate();
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [topic, setTopic] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const startGeneration = async () => {
    if (!topic.trim()) return;
    setIsBusy(true);
    setError(null);
    setStatus('Architecting curriculum structure...');

    try {
      const outline = await generateCourseOutline(topic);
      const { titles } = outline;
      const total = titles.length;
      setProgress({ current: 0, total });

      setStatus('Visualizing technical subject...');
      const thumbnailUrl = await generateCourseThumbnail(topic);

      const courseId = `c_${Date.now()}`;
      const newCourse: Course = {
        course_id: courseId,
        course_name: topic,
        short_description: `Enterprise technical track for ${topic}. Built for Tallman Equipment Co.`,
        thumbnail_url: thumbnailUrl,
        category_id: 'tech',
        instructor_id: 'ai_architect',
        status: CourseStatus.PUBLISHED,
        enrolled_count: 0,
        rating: 5.0,
        difficulty: 'Advanced',
        modules: []
      };

      for (let i = 0; i < total; i++) {
        // Mitigation for 429 RESOURCE_EXHAUSTED
        // Increased delay to 4000ms given the heavy 4000-word manual requirement
        if (i > 0) {
          setStatus('Cooling down AI engines...');
          await new Promise(r => setTimeout(r, 4000));
        }

        setStatus(`Drafting Unit ${i + 1}: ${titles[i]}...`);
        const unitData = await generateUnitContent(topic, titles[i]);

        const moduleId = `m_${courseId}_${i}`;
        const module: Module = {
          module_id: moduleId,
          course_id: courseId,
          module_title: titles[i],
          position: i,
          lessons: [
            {
              lesson_id: `l_${moduleId}_doc`,
              module_id: moduleId,
              lesson_title: `${titles[i]}: Manual`,
              lesson_type: 'document',
              duration_minutes: 45,
              content: unitData.content
            },
            {
              lesson_id: `l_${moduleId}_quiz`,
              module_id: moduleId,
              lesson_title: `${titles[i]}: Audit`,
              lesson_type: 'quiz',
              duration_minutes: 15,
              quiz_questions: unitData.quiz
            }
          ]
        };
        newCourse.modules!.push(module);
        setProgress(p => ({ ...p, current: i + 1 }));
      }

      setStatus('Committing to Registry...');
      await TallmanAPI.updateCourse(newCourse);
      navigate('/admin');
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('403') || err.message?.includes('401') || err.message?.includes('token')) {
        TallmanAPI.logout();
        window.location.reload();
      } else if (err.message?.includes("quota") || err.message?.includes("429")) {
        setError("Rate limit or Storage Quota Exceeded. The 4000-word manuals are processing heavily. Please try again in 60 seconds.");
      } else {
        setError(err.message || 'Architecture failure. System timeout.');
      }
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <header className="text-center mb-12">
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Curriculum Architect</h1>
        <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-4">AI-Driven Industrial Engineering</p>
      </header>

      {isBusy ? (
        <div className="bg-slate-900 rounded-[3rem] p-16 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-slate-800">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}
            />
          </div>
          <div className="mb-8 flex justify-center">
            <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full"></div>
          </div>
          <h2 className="text-2xl font-black uppercase italic mb-4">{status}</h2>
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">
            Unit {progress.current} / {progress.total}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] border-2 border-slate-100 p-12 shadow-xl">
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Target Technical Topic</label>
              <input
                type="text"
                placeholder="e.g. Dielectric Bench Calibration SOP"
                className="w-full px-10 py-6 rounded-[2.5rem] bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none text-2xl font-black transition-all"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            {error && (
              <div className="p-6 bg-rose-50 text-rose-600 rounded-3xl text-sm font-black uppercase tracking-widest text-center border border-rose-100">
                {error}
              </div>
            )}
            <button
              onClick={startGeneration}
              disabled={!topic.trim()}
              className="w-full py-8 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase tracking-[0.2em] text-lg shadow-2xl hover:bg-slate-900 transition-all active:scale-[0.98] disabled:opacity-20"
            >
              Deploy Architect
            </button>
          </div>
        </div>
      )}

      <div className="mt-12 text-center">
        <p className="text-xs text-slate-400 font-medium max-w-lg mx-auto italic">
          Architect-built courses feature serialized units, automated technical audits, and high-density 1500+ word instructional manuals grounded in Tallman ERP and DDIN specifications.
        </p>
      </div>
    </div>
  );
};

export default AdminCourseCreator;