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
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, counts }) => {
  const { role } = useAuth();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
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
                onClick={() => onTabChange('dashboard')}
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
                onClick={() => onTabChange('leads')}
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
                onClick={() => onTabChange('users')}
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
                onClick={() => onTabChange('teams')}
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
                onClick={() => onTabChange('projects')}
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
                onClick={() => onTabChange('audit')}
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
                onClick={() => onTabChange('teamlead')}
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
                onClick={() => onTabChange('leads')}
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
                onClick={() => onTabChange('teams')}
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
                onClick={() => onTabChange('projects')}
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
                onClick={() => onTabChange('employee')}
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
                onClick={() => onTabChange('projects')}
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
            onClick={() => onTabChange('discussions')}
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
        <div className="font-semibold text-slate-300">StudioAdsPro CRM</div>
        <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
          Live Firestore Sync
        </div>
      </div>
    </aside>
  );
};
