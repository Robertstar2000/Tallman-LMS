import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { UserRole, User } from './types';
import { TallmanAPI } from './backend-server';
import LearnerDashboardV2 from './pages/LearnerDashboardV2';
import AdminDashboard from './pages/AdminDashboard';
import CoursePlayer from './pages/CoursePlayer';
import AdminCourseCreator from './pages/AdminCourseCreator';
import AdminCourseEditor from './pages/AdminCourseEditor';
import UserManagement from './pages/WorkforceRegistry';
import Auth from './pages/Auth';

const Layout: React.FC<{
  children: React.ReactNode;
  user: User;
  onLogout: () => void;
}> = ({ children, user, onLogout }) => {
  const location = useLocation();
  const isTeacher = user.roles.includes(UserRole.TEACHER);

  const navigation = isTeacher ? [
    { name: 'Dashboard', path: '/teacher' },
    { name: 'Students', path: '/teacher/students' },
  ] : [
    { name: 'My Courses', path: '/student' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 selection:bg-blue-100">
      <aside className="hidden md:flex md:w-64 flex-col fixed inset-y-0 bg-white border-r border-slate-200 z-50">
        <div className="p-6 flex flex-col space-y-3 mb-4">
          <span className="text-2xl font-bold text-blue-600">LMS System</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => (
            <Link key={item.name} to={item.path} className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${location.pathname === item.path ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
              {item.name}
            </Link>
          ))}
          {isTeacher && (
             <Link to="/student" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${location.pathname === '/student' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>
               Student View
             </Link>
          )}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{isTeacher ? 'Teacher' : 'Student'}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors">Sign Out</button>
        </div>
      </aside>
      <main className="flex-1 md:ml-64 p-4 md:p-8 min-h-screen relative">{children}</main>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  const refreshUser = async () => {
    try {
      const liveUser = await TallmanAPI.getProfile();
      setUser(liveUser);
      localStorage.setItem('tallman_user_session', JSON.stringify(liveUser));
    } catch (e: any) {
      console.error("Profile sync failure", e);
      if (e.status === 401 || e.status === 403 || e.status === 404) {
        TallmanAPI.logout();
        setUser(null);
      }
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
    <div className="min-h-screen flex flex-col items-center justify-center text-slate-900 p-10">
      <p className="font-bold">Loading...</p>
    </div>
  );

  if (!user) return <Auth onLogin={handleLogin} />;

  const isTeacher = user.roles?.includes(UserRole.TEACHER);

  return (
    <HashRouter>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Navigate to={isTeacher ? "/teacher" : "/student"} />} />
          <Route path="/student" element={<LearnerDashboardV2 user={user} refreshUser={refreshUser} />} />
          <Route path="/player/:courseId" element={<CoursePlayer refreshUser={refreshUser} />} />
          
          <Route path="/teacher" element={isTeacher ? <AdminDashboard user={user} /> : <Navigate to="/student" />} />
          <Route path="/teacher/courses" element={isTeacher ? <AdminCourseCreator /> : <Navigate to="/student" />} />
          <Route path="/teacher/edit/:courseId" element={isTeacher ? <AdminCourseEditor /> : <Navigate to="/student" />} />
          <Route path="/teacher/students" element={isTeacher ? <UserManagement /> : <Navigate to="/student" />} />
          <Route path="/admin" element={<Navigate to="/teacher" />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
