import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Layers,
  MessageSquare,
  BarChart3,
  ShieldAlert,
  UserCheck,
  CheckCircle2,
  FolderKanban,
  FileSpreadsheet,
} from 'lucide-react';

export type NavTab =
  | 'admin_dashboard'
  | 'leads'
  | 'users'
  | 'teams'
  | 'projects'
  | 'reports'
  | 'audit'
  | 'teamlead_dashboard'
  | 'my_team'
  | 'team_projects'
  | 'employee_dashboard'
  | 'employee_projects'
  | 'employee_profile'
  | 'discussions';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
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
                onClick={() => onTabChange('admin_dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'admin_dashboard'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Executive Dashboard
              </button>

              <button
                type="button"
                onClick={() => onTabChange('leads')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'leads'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Lead Management
              </button>

              <button
                type="button"
                onClick={() => onTabChange('users')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'users'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Users className="w-4 h-4" />
                User Management & RBAC
              </button>

              <button
                type="button"
                onClick={() => onTabChange('teams')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'teams'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Layers className="w-4 h-4" />
                Teams by Profession
              </button>

              <button
                type="button"
                onClick={() => onTabChange('projects')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'projects'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <FolderKanban className="w-4 h-4" />
                Agency Projects
              </button>

              <button
                type="button"
                onClick={() => onTabChange('reports')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'reports'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Reports & Conversion
              </button>

              <button
                type="button"
                onClick={() => onTabChange('audit')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'audit'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                Security & Audit Trail
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
                onClick={() => onTabChange('teamlead_dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'teamlead_dashboard'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Team Lead Dashboard
              </button>

              <button
                type="button"
                onClick={() => onTabChange('my_team')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'my_team'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Users className="w-4 h-4" />
                Team Members & IDs
              </button>

              <button
                type="button"
                onClick={() => onTabChange('team_projects')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'team_projects'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                Project Assignments
              </button>

              <button
                type="button"
                onClick={() => onTabChange('leads')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'leads'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Assigned Leads
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
                onClick={() => onTabChange('employee_dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'employee_dashboard'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                My Dashboard
              </button>

              <button
                type="button"
                onClick={() => onTabChange('employee_projects')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'employee_projects'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                My Projects & Deliverables
              </button>

              <button
                type="button"
                onClick={() => onTabChange('employee_profile')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'employee_profile'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                My Profile & Contract
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
            onClick={() => onTabChange('discussions')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'discussions'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Discussions & Groups
          </button>
        </div>
      </div>

      {/* Footer info */}
      <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
        <div className="font-semibold text-slate-300">StudioAdsPro v1.0</div>
        <div className="text-[10px]">Real-time Firestore CRM</div>
      </div>
    </aside>
  );
};
