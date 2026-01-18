
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../types';
import { TallmanAPI } from '../backend-server';

const CourseCatalog: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [courses, cats] = await Promise.all([
          TallmanAPI.getCourses(),
          TallmanAPI.getCategories()
        ]);
        setAllCourses(courses);
        setCategories(cats);
      } catch (err) {
        console.error("Failed to load catalog data", err);
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, []);

  const featuredCourse = useMemo(() => {
    if (allCourses.length === 0) return null;
    // Prioritize high-rated, published tracks
    return allCourses.find(c => c.rating >= 4.9 && c.thumbnail_url.startsWith('data:')) || allCourses[0];
  }, [allCourses]);

  const filteredCourses = useMemo(() => {
    return allCourses.filter(course => {
      const isFeatured = course.course_id === featuredCourse?.course_id;
      const matchesSearch = course.course_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || course.category_id === selectedCategory;
      const matchesDifficulty = selectedDifficulty === 'all' || course.difficulty === selectedDifficulty;
      return matchesSearch && matchesCategory && matchesDifficulty && !isFeatured;
    });
  }, [allCourses, searchTerm, selectedCategory, selectedDifficulty, featuredCourse]);

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Curriculum Explorer</h1>
          <p className="text-slate-500 text-lg mt-4 font-medium uppercase tracking-[0.2em] text-xs">Technical Library & Professional Development Tracks</p>
        </div>
      </header>

      {/* FEATURED HERO - The "Larger Image" section */}
      {!loading && featuredCourse && (
        <section className="relative group overflow-hidden rounded-[4rem] shadow-2xl border-4 border-white">
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent"></div>
          <img
            src={featuredCourse.thumbnail_url}
            className="w-full h-[600px] object-cover transition-transform duration-[20s] group-hover:scale-110 ease-out"
            alt={featuredCourse.course_name}
          />
          <div className="absolute bottom-0 left-0 z-20 p-12 md:p-20 space-y-6 max-w-4xl">
            <div className="flex gap-3">
              <span className="px-5 py-2 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Featured Path</span>
              <span className="px-5 py-2 bg-white/20 backdrop-blur-md text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Nano-Banana Visual Architecture</span>
            </div>
            <h2 className="text-6xl md:text-7xl font-black text-white tracking-tighter italic leading-none">{featuredCourse.course_name}</h2>
            <p className="text-slate-300 text-xl md:text-2xl font-medium line-clamp-2 leading-relaxed">
              {featuredCourse.short_description}
            </p>
            <div className="flex flex-wrap items-center gap-8 pt-4">
              <Link
                to={`/player/${featuredCourse.course_id}`}
                className="px-12 py-6 bg-white text-slate-900 rounded-[2rem] font-black text-lg uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-2xl active:scale-95"
              >
                Launch Technical Path
              </Link>
              <div className="hidden md:flex items-center gap-10">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                  <p className="text-white font-black text-xl">12h 45m</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Workforce Rated</p>
                  <p className="text-white font-black text-xl">{featuredCourse.rating} / 5.0</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        <aside className="space-y-8">
          <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-50 shadow-sm">
            <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 mb-8 ml-2">SOP Categories</h3>
            <div className="space-y-2">
              <button onClick={() => setSelectedCategory('all')} className={`w-full text-left px-6 py-4 rounded-2xl font-black transition-all flex items-center justify-between group ${selectedCategory === 'all' ? 'bg-indigo-600 text-white shadow-xl' : 'hover:bg-slate-50 text-slate-500'}`}>
                <span>All Domains</span>
                {selectedCategory === 'all' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
              </button>
              {categories.map(cat => (
                <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`w-full text-left px-6 py-4 rounded-2xl font-black transition-all flex items-center justify-between group ${selectedCategory === cat.id ? 'bg-indigo-600 text-white shadow-xl' : 'hover:bg-slate-50 text-slate-500'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl group-hover:scale-125 transition-transform">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </div>
                  {selectedCategory === cat.id && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3 space-y-12">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search the Technical Library..."
              className="w-full pl-20 pr-8 py-8 rounded-[2.5rem] border-2 border-slate-100 focus:border-indigo-600 outline-none transition-all shadow-xl text-2xl font-black placeholder:text-slate-300"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {loading ? (
              <div className="col-span-2 py-40 text-center flex flex-col items-center gap-6">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full"></div>
                <p className="text-slate-400 font-black uppercase italic tracking-[0.4em] text-xs">Initializing Master Index...</p>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="col-span-2 py-40 text-center bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200">
                <p className="text-slate-400 font-black uppercase italic tracking-[0.4em]">No matching tracks found in registry.</p>
              </div>
            ) : filteredCourses.map(course => (
              <div key={course.course_id} className="bg-white rounded-[4rem] border-2 border-slate-50 shadow-sm overflow-hidden flex flex-col group hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] hover:border-indigo-100 transition-all duration-500">
                <div className="relative h-64 overflow-hidden">
                  <img src={course.thumbnail_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s]" alt={course.course_name} />
                  <div className="absolute top-8 left-8 flex gap-3">
                    <span className="bg-slate-900/90 backdrop-blur-md text-white text-[9px] font-black uppercase px-5 py-2.5 rounded-[1rem] shadow-2xl">{course.difficulty || 'Advanced'}</span>
                  </div>
                </div>
                <div className="p-12 flex-1 flex flex-col">
                  <h3 className="text-3xl font-black text-slate-900 mb-4 group-hover:text-indigo-600 transition-colors leading-tight italic">{course.course_name}</h3>
                  <p className="text-slate-500 line-clamp-2 mb-10 leading-relaxed font-medium">{course.short_description}</p>
                  <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-amber-500 text-xl">★</span>
                      <span className="font-black text-slate-900">{course.rating}</span>
                    </div>
                    <Link
                      to={`/player/${course.course_id}`}
                      className="px-10 py-5 bg-slate-900 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 shadow-xl transition-all active:scale-95"
                    >
                      Enroll Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCatalog;
