import React from 'react';
import { Lead, Project, UserProfile, Team, AuditLog, PROFESSION_LABELS, Profession, formatINR } from '../../types';
import {
  Users,
  IndianRupee,
  TrendingUp,
  FolderKanban,
  UserCheck,
  Building2,
  Clock,
  Plus,
  ArrowUpRight,
  Activity,
} from 'lucide-react';

interface AdminDashboardProps {
  leads: Lead[];
  projects: Project[];
  users: UserProfile[];
  teams: Team[];
  audits: AuditLog[];
  onNavigate: (tab: any) => void;
  onOpenCreateLead: () => void;
  onOpenCreateUser: () => void;
  onOpenCreateTeam: () => void;
  onOpenCreateProject: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  leads,
  projects,
  users,
  teams,
  audits,
  onNavigate,
  onOpenCreateLead,
  onOpenCreateUser,
  onOpenCreateTeam,
  onOpenCreateProject,
}) => {
  const totalBudget = leads.reduce((sum, l) => sum + (Number(l.budget) || 0), 0);
  const activeProjects = projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'REVIEW');
  const activeEmployees = users.filter((u) => u.status === 'ACTIVE');

  // Profession breakdown
  const professionsList: Profession[] = [
    'MOBILE_APP',
    'WEBSITE',
    'MARKETING',
    'SOCIAL_MEDIA_HANDLING',
    'VIDEO_SHOOT_EDIT',
  ];

  const professionCounts = professionsList.map((p) => ({
    profession: p,
    label: PROFESSION_LABELS[p],
    count: users.filter((u) => u.profession === p).length,
  }));

  // Conversion rate: (completed + in progress) / total leads
  const qualifiedOrWon = leads.filter((l) => l.status === 'COMPLETED' || l.status === 'IN_PROGRESS').length;
  const conversionRate = leads.length > 0 ? Math.round((qualifiedOrWon / leads.length) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-900/70 p-6 rounded-2xl border border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">StudioAdsPro Executive Suite</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time operations, team allocation, pipeline revenue, and client delivery monitoring.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenCreateLead}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Lead
          </button>
          <button
            type="button"
            onClick={onOpenCreateProject}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </button>
          <button
            type="button"
            onClick={onOpenCreateUser}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add User
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Leads</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{leads.length}</span>
            <span className="text-xs text-emerald-400 font-medium">{conversionRate}% conversion</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>New: {leads.filter((l) => l.status === 'NEW').length}</span>
            <span>In Progress: {leads.filter((l) => l.status === 'IN_PROGRESS').length}</span>
          </div>
        </div>

        {/* Pipeline Revenue */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pipeline Budget (INR)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{formatINR(totalBudget)}</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Across {leads.length} recorded client scopes
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Projects</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{activeProjects.length}</span>
            <span className="text-xs text-slate-400">of {projects.length} total</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Completed: {projects.filter((p) => p.status === 'COMPLETED').length}
          </div>
        </div>

        {/* Total Employees */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Personnel</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{activeEmployees.length}</span>
            <span className="text-xs text-purple-400 font-medium">{teams.length} teams</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Full-time: {users.filter((u) => u.employmentType === 'FULL_TIME').length} • Freelancers: {users.filter((u) => u.employmentType === 'FREELANCER').length}
          </div>
        </div>
      </div>

      {/* Grid: Personnel by Profession & Recent Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personnel by Profession */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white">Personnel by Service</h3>
            <span className="text-[11px] text-slate-400">{users.length} total</span>
          </div>
          <div className="space-y-3">
            {professionCounts.map((item) => (
              <div key={item.profession} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span className="font-medium truncate">{item.label}</span>
                  <span className="font-semibold text-white">{item.count}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{
                      width: users.length > 0 ? `${(item.count / users.length) * 100}%` : '0%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('users')}
            className="mt-5 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 transition-colors"
          >
            Manage All Personnel
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Recent Audit & Activity Trail */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h3 className="text-sm font-bold text-white">System Audit & Activity Trail</h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('audit')}
              className="text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              View Full Log
            </button>
          </div>

          {audits.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs">
              No audit records recorded yet. Any admin actions, user additions, or project assignments will appear here.
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {audits.slice(0, 6).map((audit) => (
                <div
                  key={audit.id}
                  className="flex items-start justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-200">{audit.action}</div>
                    <div className="text-slate-400">{audit.details}</div>
                    <div className="text-[10px] text-slate-500">By {audit.performedBy}</div>
                  </div>
                  <div className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(audit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Leads Quick View */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Client Leads</h3>
            <p className="text-[11px] text-slate-400">Newly captured client opportunities and requested services</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('leads')}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium self-start sm:self-auto"
          >
            View All Leads
          </button>
        </div>

        {leads.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            Zero leads currently in the database. Click "+ New Lead" above to register your first client opportunity.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 uppercase text-[10px] font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-2.5">Client Name</th>
                  <th className="px-4 py-2.5">Services</th>
                  <th className="px-4 py-2.5">Budget</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {leads.slice(0, 5).map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">
                      {lead.clientName}
                      <div className="text-[10px] font-normal text-slate-400">{lead.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {lead.servicesRequired?.map((srv) => (
                          <span
                            key={srv}
                            className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20"
                          >
                            {PROFESSION_LABELS[srv] || srv}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-emerald-400">
                      {formatINR(lead.budget)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          lead.status === 'NEW'
                            ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                            : lead.status === 'QUALIFIED'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : lead.status === 'IN_PROGRESS'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : lead.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                        }`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{lead.date || lead.createdAt?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
