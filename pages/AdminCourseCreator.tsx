import React, { useState } from 'react';
import { generateCourseOutline, generateUnitContent, generateQuizOnly } from '../geminiService';
import { Course, CourseStatus, Module } from '../types';
import { useNavigate } from 'react-router-dom';
import { TallmanAPI } from '../backend-server';

const AdminCourseCreator: React.FC = () => {
  const navigate = useNavigate();
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [topic, setTopic] = useState('');
  const [unitCount, setUnitCount] = useState(6);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [includeTests, setIncludeTests] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  const startGeneration = async () => {
    if (!topic.trim()) return;
    setIsBusy(true);
    setError(null);

    const courseId = `c_${Date.now()}`;

    try {
      let titles: string[] = [];

      if (mode === 'auto') {
        // AUTO: LLM generates titles
        setStatus('Architecting curriculum structure...');
        const outline = await generateCourseOutline(topic, unitCount);
        titles = (outline.titles || []).slice(0, unitCount);
      } else {
        // MANUAL: Create blank titled units
        titles = Array.from({ length: unitCount }, (_, i) => `Unit ${i + 1}`);
      }

      const total = titles.length;
      setProgress({ current: 0, total });

      const newCourse: Course = {
        course_id: courseId,
        course_name: topic,
        short_description: `Enterprise technical track for ${topic}. Built for Tallman Equipment Co.`,
        thumbnail_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop',
        category_id: 'tech',
        instructor_id: 'ai_architect',
        status: CourseStatus.PUBLISHED,
        enrolled_count: 0,
        rating: 5.0,
        difficulty: 'Advanced',
        modules: []
      };

      for (let i = 0; i < total; i++) {
        const moduleId = `m_${courseId}_${i}`;
        let manualContent = '';
        let quizQuestions: any[] = [];

        if (mode === 'auto') {
          // AUTO: Generate content from LLM
          if (i > 0) {
            setStatus('Cooling down AI engines...');
            await new Promise(r => setTimeout(r, 3000));
          }

          setStatus(`Drafting Unit ${i + 1}: ${titles[i]}...`);

          if (includeTests) {
            // Generate content + quiz together
            const unitData = await generateUnitContent(topic, titles[i]);
            manualContent = unitData.content || '';
            quizQuestions = unitData.quiz || [];
          } else {
            // Generate content only (no quiz call)
            const unitData = await generateUnitContent(topic, titles[i]);
            manualContent = unitData.content || '';
          }
        } else {
          // MANUAL: Blank content
          manualContent = `# ${titles[i]}\n\n_Enter your course content here..._`;

          if (includeTests) {
            // Generate quiz from LLM even in manual mode
            setStatus(`Generating test for Unit ${i + 1}...`);
            if (i > 0) await new Promise(r => setTimeout(r, 2000));
            try {
              quizQuestions = await generateQuizOnly(topic, titles[i]);
            } catch {
              quizQuestions = [
                { question: 'Sample question 1', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
                { question: 'Sample question 2', options: ['A', 'B', 'C', 'D'], correctIndex: 1 },
                { question: 'Sample question 3', options: ['A', 'B', 'C', 'D'], correctIndex: 2 }
              ];
            }
          }
        }

        const lessons: any[] = [
          {
            lesson_id: `l_${moduleId}_doc`,
            module_id: moduleId,
            lesson_title: `${titles[i]}: Manual`,
            lesson_type: 'document',
            duration_minutes: 45,
            content: manualContent
          }
        ];

        if (includeTests) {
          lessons.push({
            lesson_id: `l_${moduleId}_quiz`,
            module_id: moduleId,
            lesson_title: `${titles[i]}: Audit`,
            lesson_type: 'quiz',
            duration_minutes: 15,
            quiz_questions: quizQuestions
          });
        }

        const module: Module = {
          module_id: moduleId,
          course_id: courseId,
          module_title: titles[i],
          position: i,
          lessons
        };

        newCourse.modules!.push(module);
        setProgress(p => ({ ...p, current: i + 1 }));
      }

      setStatus('Committing to Registry...');
      await TallmanAPI.updateCourse(newCourse);
      navigate(`/teacher/edit/${courseId}`);
    } catch (err: any) {
      console.error("Course Generation Error:", err);
      if ((err.status === 401 || err.status === 403) && !err.message?.toLowerCase().includes('gemini')) {
        TallmanAPI.logout();
        window.location.reload();
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
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">Course Creator</h1>
      </header>

      {isBusy ? (
        <div className="bg-white rounded-xl p-8 text-center border shadow-sm">
          <div className="mb-4">
             <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${(progress.current / (progress.total || 1)) * 100}%` }}></div>
             </div>
          </div>
          <h2 className="text-xl font-bold mb-2">{status}</h2>
          <p className="text-slate-500 font-medium">Unit {progress.current} / {progress.total}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-8 border shadow-sm">
          <div className="space-y-8">
            {/* Topic Input */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Topic</label>
              <input
                type="text"
                placeholder="e.g. Selling ropes and swivels"
                className="w-full px-4 py-3 rounded-lg bg-slate-50 border outline-none text-lg transition-all focus:ring-2 focus:ring-blue-500"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            {/* Unit Count Slider */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                Number of Units: <span className="text-blue-600 text-lg">{unitCount}</span>
              </label>
              <input
                type="range"
                min={1}
                max={20}
                value={unitCount}
                onChange={(e) => setUnitCount(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>1</span>
                <span>5</span>
                <span>10</span>
                <span>15</span>
                <span>20</span>
              </div>
            </div>

            {/* Mode Toggle: Auto vs Manual */}
            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-4 border">
              <div>
                <p className="font-bold text-slate-700">Content Mode</p>
                <p className="text-sm text-slate-500">
                  {mode === 'auto'
                    ? 'AI generates unit titles and full content'
                    : 'Creates empty framework ready to edit'}
                </p>
              </div>
              <div className="flex bg-slate-200 rounded-lg p-1">
                <button
                  onClick={() => setMode('auto')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                    mode === 'auto' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Auto
                </button>
                <button
                  onClick={() => setMode('manual')}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                    mode === 'manual' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Manual
                </button>
              </div>
            </div>

            {/* Test Toggle: Test vs No Test */}
            <div className="flex items-center justify-between bg-slate-50 rounded-lg p-4 border">
              <div>
                <p className="font-bold text-slate-700">Quiz Questions</p>
                <p className="text-sm text-slate-500">
                  {includeTests
                    ? (mode === 'auto' ? 'AI generates quiz questions per unit' : 'AI generates quiz questions for blank units')
                    : 'No test questions will be added'}
                </p>
              </div>
              <div className="flex bg-slate-200 rounded-lg p-1">
                <button
                  onClick={() => setIncludeTests(true)}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                    includeTests ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Test
                </button>
                <button
                  onClick={() => setIncludeTests(false)}
                  className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                    !includeTests ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  No Test
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm font-bold">
                {error}
              </div>
            )}
            <button
              onClick={startGeneration}
              disabled={!topic.trim()}
              className="w-full py-4 bg-blue-600 text-white rounded-lg font-bold text-lg shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {mode === 'auto' ? 'Generate Course' : 'Create Framework'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourseCreator;