import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Layers,
  MessageSquare,
  ShieldAlert,
  FolderKanban,
  FileSpreadsheet,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'leads'
  | 'teams'
  | 'users'
  | 'projects'
  | 'teamlead'
  | 'employee'
  | 'discussions'
  | 'audit';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  counts?: {
    leads: number;
    projects: number;
    teams: number;
    users: number;
    audits: number;
  };
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, counts, isOpen = false, onClose }) => {
  const { role } = useAuth();

  const handleTabChange = (tab: NavTab) => {
    onTabChange(tab);
    onClose?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`w-72 sm:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0
          fixed inset-y-0 left-0 z-50 h-full overflow-y-auto transition-transform duration-200 ease-out
          lg:static lg:z-auto lg:h-auto lg:min-h-[calc(100vh-4rem)] lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
      <div className="p-4 space-y-6">
        {/* Navigation Sections */}
        {role === 'ADMIN' && (
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Admin Governance
            </div>
            <nav className="space-y-1">
              <button
                type="button"
                id="sidebar-nav-dashboard"
                onClick={() => handleTabChange('dashboard')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Executive Dashboard</span>
                </div>
              </button>

              <button
                type="button"
                id="sidebar-nav-leads"
                onClick={() => handleTabChange('leads')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'leads'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Lead Management</span>
                </div>
                {counts && counts.leads > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {counts.leads}
                  </span>
                )}
              </button>

              <button
                type="button"
                id="sidebar-nav-users"
                onClick={() => handleTabChange('users')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'users'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <span>User Directory & RBAC</span>
                </div>
                {counts && counts.users > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {counts.users}
                  </span>
                )}
              </button>

              <button
                type="button"
                id="sidebar-nav-teams"
                onClick={() => handleTabChange('teams')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'teams'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-4 h-4" />
                  <span>Teams by Profession</span>
                </div>
                {counts && counts.teams > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {counts.teams}
                  </span>
                )}
              </button>

              <button
                type="button"
                id="sidebar-nav-projects"
                onClick={() => handleTabChange('projects')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'projects'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FolderKanban className="w-4 h-4" />
                  <span>Agency Projects</span>
                </div>
                {counts && counts.projects > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {counts.projects}
                  </span>
                )}
              </button>

              <button
                type="button"
                id="sidebar-nav-audit"
                onClick={() => handleTabChange('audit')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'audit'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Security & Audit Trail</span>
                </div>
              </button>
            </nav>
          </div>
        )}

        {role === 'TEAM_LEAD' && (
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Team Operations
            </div>
            <nav className="space-y-1">
              <button
                type="button"
                id="sidebar-nav-teamlead"
                onClick={() => handleTabChange('teamlead')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'teamlead'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Team Lead Console</span>
                </div>
              </button>

              <button
                type="button"
                id="sidebar-nav-tl-leads"
                onClick={() => handleTabChange('leads')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'leads'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Assigned Leads</span>
                </div>
                {counts && counts.leads > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {counts.leads}
                  </span>
                )}
              </button>

              <button
                type="button"
                id="sidebar-nav-tl-teams"
                onClick={() => handleTabChange('teams')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'teams'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <span>My Squad & Staff</span>
                </div>
              </button>

              <button
                type="button"
                id="sidebar-nav-tl-projects"
                onClick={() => handleTabChange('projects')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'projects'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="w-4 h-4" />
                  <span>Squad Projects</span>
                </div>
                {counts && counts.projects > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {counts.projects}
                  </span>
                )}
              </button>
            </nav>
          </div>
        )}

        {role === 'EMPLOYEE' && (
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold tracking-wider uppercase text-slate-400">
              Workspace
            </div>
            <nav className="space-y-1">
              <button
                type="button"
                id="sidebar-nav-employee"
                onClick={() => handleTabChange('employee')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'employee'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Specialist Workspace</span>
                </div>
              </button>

              <button
                type="button"
                id="sidebar-nav-emp-projects"
                onClick={() => handleTabChange('projects')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'projects'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FolderKanban className="w-4 h-4" />
                  <span>My Assigned Projects</span>
                </div>
                {counts && counts.projects > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {counts.projects}
                  </span>
                )}
              </button>
            </nav>
          </div>
        )}

        {/* Global Communications */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold tracking-wider uppercase text-slate-400">
            Communications
          </div>
          <button
            type="button"
            id="sidebar-nav-discussions"
            onClick={() => handleTabChange('discussions')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'discussions'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="w-4 h-4" />
              <span>Team Discussions</span>
            </div>
          </button>
        </div>
      </div>

      {/* Footer info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center p-0.5 overflow-hidden shrink-0 shadow-sm">
            <img
              src="/studioadspro-logo.png"
              alt="SAP"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = 'https://www.studioadspro.com/favicon-512x512.png';
              }}
            />
          </div>
          <div>
            <div className="font-semibold text-slate-200 leading-tight">StudioAdsPro CRM</div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Live Firestore Sync
            </div>
          </div>
        </div>
      </div>
      </aside>
    </>
  );
};
