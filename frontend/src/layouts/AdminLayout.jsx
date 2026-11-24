import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  FolderEdit,
  Users,
  LogOut,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminLayout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-[#0C1E3C] text-white'
        : 'text-slate-700 hover:bg-slate-100 hover:text-[#0C1E3C]'
    }`;

  const roleLabels = {
    super_admin: 'Super Administrator',
    admissions_officer: 'Admissions Officer',
    content_editor: 'Content Editor',
  };

  const navContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-slate-200">
        <Link to="/admin" className="font-serif text-lg font-bold text-[#0C1E3C] block">
          NAVS Admin Portal
        </Link>
        <p className="text-xs text-slate-500 mt-1">
          {user?.roles.map((r) => roleLabels[r] || r).join(', ')}
        </p>
      </div>

      <nav aria-label="Administrator Navigation" className="flex-1 p-4 space-y-1">
        <NavLink to="/admin" end className={linkClass} onClick={() => setSidebarOpen(false)}>
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>Overview</span>
        </NavLink>

        {hasPermission('admissions:read') && (
          <NavLink to="/admin/admissions" className={linkClass} onClick={() => setSidebarOpen(false)}>
            <FileText className="w-4 h-4 shrink-0" />
            <span>Admissions Queue</span>
          </NavLink>
        )}

        {hasPermission('content:write') && (
          <NavLink to="/admin/content" className={linkClass} onClick={() => setSidebarOpen(false)}>
            <FolderEdit className="w-4 h-4 shrink-0" />
            <span>Website Content</span>
          </NavLink>
        )}

        {hasPermission('users:manage') && (
          <NavLink to="/admin/users" className={linkClass} onClick={() => setSidebarOpen(false)}>
            <Users className="w-4 h-4 shrink-0" />
            <span>Staff &amp; Audit Logs</span>
          </NavLink>
        )}
      </nav>

      <div className="p-4 border-t border-slate-200 space-y-2">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-[#0C1E3C] rounded-md hover:bg-slate-100"
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          <span>View Public Website</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-md"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Sign Out ({user?.fullName})</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F6F8] flex">
      <aside className="hidden lg:block w-64 bg-white border-r border-slate-200 shrink-0">
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-64 bg-white h-full border-r border-slate-200 relative z-10">{navContent}</div>
          <button
            type="button"
            aria-label="Close sidebar"
            className="flex-1 bg-slate-950/40"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Toggle admin sidebar"
              onClick={() => setSidebarOpen((p) => !p)}
              className="lg:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <span className="text-sm font-medium text-slate-700 truncate">
              NAVS Senior High School · Administration
            </span>
          </div>
          <div className="text-xs text-slate-500 hidden sm:block truncate">
            Signed in as <strong className="text-slate-800">{user?.email}</strong>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
