
import React, { useState, useMemo, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, useParams } from 'react-router-dom';
import { UserRole, User } from './types';
import { TallmanAPI } from './backend-server';
import LearnerDashboard from './pages/LearnerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CourseCatalog from './pages/CourseCatalog';
import CoursePlayer from './pages/CoursePlayer';
import AdminCourseCreator from './pages/AdminCourseCreator';
import AdminCourseEditor from './pages/AdminCourseEditor';
import UserManagement from './pages/WorkforceRegistry';
import Reports from './pages/Reports';
import Achievements from './pages/Achievements';
import Community from './pages/Community';
import Auth from './pages/Auth';
import AdminSettings from './pages/AdminSettings';
import Help from './pages/Help';
import AdminReadme from './pages/AdminReadme';
import MentorshipTracker from './pages/MentorshipTracker';

const HoldScreen: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center p-10">
    <div className="max-w-md w-full text-center space-y-10 animate-in fade-in zoom-in duration-700">
      <div className="relative inline-block">
        <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center text-5xl animate-pulse">⏳</div>
        <div className="absolute -bottom-2 -right-2 bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-xl border-4 border-slate-900">Hold</div>
      </div>
      <div className="space-y-4">
        <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Identity Verified</h2>
        <p className="text-slate-400 font-bold leading-relaxed text-lg">
          You’re enrolled. Your instructor will assign class materials to start.
        </p>
      </div>
      <div className="pt-8 flex flex-col gap-4">
        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest">
          Technician: {user.display_name} <br />
          Status: Access Restricted (Pending Registry Audit)
        </div>
        <button
          onClick={onLogout}
          className="w-full py-4 bg-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-rose-500 transition-all"
        >
          Sign Out & Return
        </button>
      </div>
    </div>
  </div>
);

const Layout: React.FC<{
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
  isLearnerMode: boolean;
  setIsLearnerMode: (val: boolean) => void;
}> = ({ children, user, onLogout, isLearnerMode, setIsLearnerMode }) => {
  const location = useLocation();
  const isAdmin = user.roles.includes(UserRole.ADMIN);
  const isInstructor = user.roles.includes(UserRole.INSTRUCTOR);
  const isManager = user.roles.includes(UserRole.MANAGER);

  const hasAdminNav = isAdmin || isInstructor || isManager;

  const navigation = useMemo(() => {
    if (hasAdminNav && !isLearnerMode) {
      const navItems = [
        { name: 'Console Home', path: '/admin', icon: '🏢' },
        { name: 'Mentorship Hub', path: '/admin/mentorship', icon: '🤝' },
        { name: 'Reports', path: '/admin/reports', icon: '📊' },
      ];
      if (isAdmin || isInstructor) navItems.push({ name: 'Course Architect', path: '/admin/courses', icon: '🤖' });
      if (isAdmin) {
        navItems.push({ name: 'Workforce Registry', path: '/admin/users', icon: '👥' });
        navItems.push({ name: 'System Settings', path: '/admin/settings', icon: '⚙️' });
        navItems.push({ name: 'Governance Registry', path: '/admin/readme', icon: '📜' });
      }
      navItems.push({ name: 'Master Manual', path: '/help', icon: '📖' });
      return navItems;
    }
    return [
      { name: 'My Track', path: '/', icon: '🏠' },
      { name: 'Course Catalog', path: '/catalog', icon: '🔍' },
      { name: 'My Achievements', path: '/achievements', icon: '🏆' },
      { name: 'Team Hub', path: '/community', icon: '💬' },
      { name: 'Help Manual', path: '/help', icon: '❓' },
    ];
  }, [hasAdminNav, isLearnerMode, isAdmin, isInstructor]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 selection:bg-indigo-100">
      <aside className="hidden md:flex md:w-64 flex-col fixed inset-y-0 bg-slate-900 text-white z-50">
        <div className="p-6 flex flex-col space-y-3 mb-4">
          <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQfAo_vinwmvZoyER2jOBXcta82wntkUlhiqNCIFFHtJg&s=10" className="h-12 w-auto object-contain bg-white rounded-lg p-1" alt="Tallman LMS" />
          <span className="text-xl font-black tracking-tighter uppercase italic">Tallman LMS</span>
        </div>

        {hasAdminNav && (
          <div className="px-4 mb-8">
            <button
              onClick={() => setIsLearnerMode(!isLearnerMode)}
              className={`w-full py-4 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-2 transition-all flex flex-col items-center justify-center gap-2 ${isLearnerMode ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-indigo-600/10 border-indigo-600/30 text-indigo-400'
                }`}
            >
              <span>{isLearnerMode ? '🛡️ EXIT SIMULATION' : '🎓 STUDY AS LEARNER'}</span>
            </button>
          </div>
        )}

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => (
            <Link key={item.name} to={item.path} className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${location.pathname === item.path ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <span className="text-lg">{item.icon}</span> {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 bg-slate-800/50 p-3 rounded-2xl border border-slate-800 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-xs font-black text-white shadow-lg border border-indigo-500/50">
              {user.display_name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-black truncate">{user.display_name}</p>
              <p className="text-[9px] text-slate-500 uppercase font-black">{user.roles.join(' / ')}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full py-3 bg-rose-500/10 text-rose-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-colors">Sign Out</button>
        </div>
      </aside>
      <main className="flex-1 md:ml-64 p-4 md:p-10 min-h-screen relative">{children}</main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [isLearnerMode, setIsLearnerMode] = useState(false);

  const refreshUser = async () => {
    try {
      const liveUser = await TallmanAPI.getProfile();
      setUser(liveUser);
      localStorage.setItem('tallman_user_session', JSON.stringify(liveUser));
    } catch (e) {
      console.error("Profile sync failure", e);
    }
  };

  useEffect(() => {
    const startup = async () => {
      await TallmanAPI.bootstrap();
      const token = localStorage.getItem('tallman_auth_token');
      if (token) {
        await refreshUser();
      }
      setBootstrapped(true);
    };
    startup();
  }, []);

  const handleLogin = (newUser: User) => setUser(newUser);
  const handleLogout = () => {
    TallmanAPI.logout();
    setUser(null);
  };

  if (!bootstrapped) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-10">
      <div className="w-20 h-20 border-4 border-indigo-500 border-t-transparent animate-spin rounded-full mb-8"></div>
      <p className="font-black uppercase tracking-[0.5em] text-xs animate-pulse">Initializing Tallman Core Architecture</p>
    </div>
  );

  if (!user) return <Auth onLogin={handleLogin} />;

  const isOnlyHold = user.roles.length === 1 && user.roles[0] === UserRole.HOLD;
  if (isOnlyHold) return <HoldScreen user={user} onLogout={handleLogout} />;

  const effectiveAdmin = (user.roles.some(r => [UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.MANAGER].includes(r))) && !isLearnerMode;

  return (
    <HashRouter>
      <Layout user={user} onLogout={handleLogout} isLearnerMode={isLearnerMode} setIsLearnerMode={setIsLearnerMode}>
        <Routes>
          <Route path="/" element={<LearnerDashboard user={user} refreshUser={refreshUser} />} />
          <Route path="/catalog" element={<CourseCatalog />} />
          <Route path="/player/:courseId" element={<CoursePlayer refreshUser={refreshUser} />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/community" element={<Community />} />
          <Route path="/admin" element={<AdminRoute user={user} effectiveAdmin={effectiveAdmin}><AdminDashboard user={user} /></AdminRoute>} />
          <Route path="/admin/courses" element={<AdminRoute user={user} effectiveAdmin={effectiveAdmin}><AdminCourseCreator /></AdminRoute>} />
          <Route path="/admin/edit/:courseId" element={<AdminRoute user={user} effectiveAdmin={effectiveAdmin}><AdminCourseEditor /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute user={user} effectiveAdmin={effectiveAdmin}><UserManagement /></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute user={user} effectiveAdmin={effectiveAdmin}><Reports /></AdminRoute>} />
          <Route path="/admin/mentorship" element={<AdminRoute user={user} effectiveAdmin={effectiveAdmin}><MentorshipTracker user={user} /></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute user={user} effectiveAdmin={effectiveAdmin}><AdminSettings /></AdminRoute>} />
          <Route path="/admin/readme" element={<AdminRoute user={user} effectiveAdmin={effectiveAdmin}><AdminReadme /></AdminRoute>} />
          <Route path="/help" element={<Help />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

const AdminRoute: React.FC<{ children: React.ReactNode; user: User; effectiveAdmin: boolean }> = ({ children, user, effectiveAdmin }) => {
  return effectiveAdmin ? <>{children}</> : <Navigate to="/" />;
};
