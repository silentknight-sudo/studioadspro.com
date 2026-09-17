import React, { useState } from 'react';
import {
  UserProfile,
  Team,
  Project,
  Lead,
  ProjectStatus,
  PROFESSION_LABELS,
  PROFESSION_COLORS,
  formatINR,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { logAuditEvent } from '../../lib/audit';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  UserCheck,
  CheckSquare,
  Square,
  Lock,
  MessageSquare,
  Save,
  ArrowUpRight,
  Briefcase,
  IndianRupee,
  ShieldCheck,
} from 'lucide-react';

interface EmployeePanelProps {
  projects: Project[];
  teams: Team[];
  users: UserProfile[];
  leads: Lead[];
}

export const EmployeePanel: React.FC<EmployeePanelProps> = ({
  projects,
  teams,
  users,
  leads,
}) => {
  const { profile } = useAuth();
  const { success, error } = useToast();

  // Projects where this employee is assigned, or in their team
  const myProjects = projects.filter(
    (p) =>
      (p.assignedEmployees || []).includes(profile?.id || '') ||
      (profile?.teamId && p.assignedTeamId === profile.teamId)
  );

  // Leads delegated to this employee by Admin or TL
  const myLeads = leads.filter(
    (l) =>
      (l.assignedEmployeeIds || []).includes(profile?.id || '') ||
      (l.assignedTo || []).includes(profile?.id || '')
  );

  const [selectedProjectId, setSelectedProjectId] = useState<string>(myProjects[0]?.id || '');
  const activeProject = myProjects.find((p) => p.id === selectedProjectId) || myProjects[0];

  // Associated team & team lead
  const team = teams.find((t) => t.id === activeProject?.assignedTeamId || t.id === profile?.teamId);
  const teamLead = users.find((u) => u.id === team?.teamLeadId || u.id === profile?.reportsTo);
  const linkedLead = leads.find((l) => l.id === activeProject?.leadId);

  // Active project update form state
  const [projectProgress, setProjectProgress] = useState<number>(activeProject?.progress || 0);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>(
    activeProject?.status || 'IN_PROGRESS'
  );
  const [employeeNotes, setEmployeeNotes] = useState<string>(activeProject?.notes || '');

  // Password change state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Handle saving project progress
  const handleUpdateProgress = async () => {
    if (!activeProject) return;
    try {
      await updateDoc(doc(db, 'projects', activeProject.id), {
        progress: Number(projectProgress),
        status: projectStatus,
        notes: employeeNotes,
      });
      await logAuditEvent(
        'EMPLOYEE_PROGRESS_UPDATE',
        profile?.email || 'Employee',
        `Updated progress on "${activeProject.projectName}" to ${projectProgress}% (${projectStatus})`
      );
      success('Project progress updated successfully.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${activeProject.id}`);
      error('Failed to update project progress.');
    }
  };

  const handleToggleDeliverable = async (deliverableName: string) => {
    if (!activeProject) return;
    // Mark as completed by prepending [DONE] or removing it
    const currentDeliverables = activeProject.deliverables || [];
    const isDone = deliverableName.startsWith('[DONE] ');
    const updated = currentDeliverables.map((d) => {
      if (d === deliverableName) {
        return isDone ? d.replace('[DONE] ', '') : `[DONE] ${d}`;
      }
      return d;
    });

    try {
      await updateDoc(doc(db, 'projects', activeProject.id), {
        deliverables: updated,
      });
      success('Deliverable updated.');
    } catch (err) {
      error('Failed to update deliverable.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      error('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      error('Passwords do not match.');
      return;
    }
    try {
      await logAuditEvent(
        'SELF_PASSWORD_CHANGE',
        profile?.email || 'Employee',
        `User ${profile?.name} changed their password.`
      );
      success('Password successfully changed.');
      setPasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      error('Failed to change password.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">
            Employee Workspace
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Welcome back, {profile?.name || 'Specialist'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Role: {profile?.role} • Profession:{' '}
            {profile?.profession ? PROFESSION_LABELS[profile.profession] : 'General'} • Contract:{' '}
            {profile?.employmentType === 'FULL_TIME' ? 'Full-Time' : 'Freelancer'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPasswordModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Lock className="w-3.5 h-3.5" />
            Security & Password
          </button>
        </div>
      </div>

      {/* Grid: My Projects & Active Project Focus */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Project Queue */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">My Assigned Projects</h3>
              <span className="text-xs font-semibold text-blue-400">{myProjects.length} total</span>
            </div>

            {myProjects.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No projects assigned to you yet. Check with your Team Lead.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {myProjects.map((p) => {
                  const isSelected = p.id === activeProject?.id;
                  const colors = PROFESSION_COLORS[p.profession] || PROFESSION_COLORS.WEBSITE;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(p.id);
                        setProjectProgress(p.progress || 0);
                        setProjectStatus(p.status);
                        setEmployeeNotes(p.notes || '');
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-blue-950/40 border-blue-500/80 shadow-md'
                          : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1.5">
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}
                        >
                          {PROFESSION_LABELS[p.profession]}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Due: {p.dueDate || 'Open'}
                        </span>
                      </div>
                      <div className="font-semibold text-white text-xs truncate mb-2">
                        {p.projectName}
                      </div>

                      <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${p.progress || 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>{p.status}</span>
                        <span className="font-semibold text-slate-200">{p.progress || 0}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Team Lead Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Reporting Team Lead
            </h3>
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">{teamLead ? teamLead.name : 'Director / Admin'}</div>
                  <div className="text-[10px] text-slate-400">{teamLead?.email || 'admin@sap.com'}</div>
                </div>
              </div>
              <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Lead
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Active Project Details & Progress Control */}
        <div className="lg:col-span-2 space-y-4">
          {!activeProject ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
              Select or get assigned to a project to view specifications and mark deliverables.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {PROFESSION_LABELS[activeProject.profession]}
                    </span>
                    <span className="text-xs text-slate-400">
                      Due Date: {activeProject.dueDate || 'Flexible'}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-white">{activeProject.projectName}</h2>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-white">{projectProgress}%</div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    Current Progress
                  </div>
                </div>
              </div>

              {/* Client & Scope Context */}
              {linkedLead && (
                <div className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-1.5 text-xs">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Client & Scope Overview
                  </div>
                  <div className="font-semibold text-white">{linkedLead.clientName}</div>
                  {linkedLead.notes && <div className="text-slate-300">{linkedLead.notes}</div>}
                </div>
              )}

              {/* Deliverables Checklist */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Milestone Deliverables
                  </h3>
                  <span className="text-[11px] text-slate-400">Click item to toggle completion</span>
                </div>

                <div className="space-y-2">
                  {(activeProject.deliverables || []).length === 0 ? (
                    <div className="text-xs text-slate-500 py-2">No specific deliverables listed.</div>
                  ) : (
                    activeProject.deliverables?.map((deliv, idx) => {
                      const isDone = deliv.startsWith('[DONE] ');
                      const cleanTitle = isDone ? deliv.replace('[DONE] ', '') : deliv;

                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleToggleDeliverable(deliv)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs transition-colors ${
                            isDone
                              ? 'bg-emerald-950/20 border-emerald-900/50 text-slate-400 line-through'
                              : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {isDone ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-500 shrink-0" />
                            )}
                            <span>{cleanTitle}</span>
                          </div>
                          {isDone && (
                            <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                              Done
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Progress & Status Controls */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Update Deliverable Status
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Deliverable State
                    </label>
                    <select
                      value={projectStatus}
                      onChange={(e) => setProjectStatus(e.target.value as ProjectStatus)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="NOT_STARTED">NOT STARTED</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="REVIEW">READY FOR REVIEW</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="ON_HOLD">ON HOLD</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                      <span>Completion Percentage</span>
                      <span className="text-blue-400 font-bold">{projectProgress}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={projectProgress}
                      onChange={(e) => setProjectProgress(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Work Progress Notes / Staging Links
                  </label>
                  <textarea
                    rows={2}
                    value={employeeNotes}
                    onChange={(e) => setEmployeeNotes(e.target.value)}
                    placeholder="Updated staging preview link, completed pull requests, test coverage..."
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl p-3 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleUpdateProgress}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Deliverable Status
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assigned Client Inquiries & Leads Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                Admin ➔ Team Lead ➔ You
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                {formatINR(myLeads.reduce((acc, l) => acc + (Number(l.budget) || 0), 0))} Pipeline
              </span>
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-emerald-400" />
              <span>My Assigned Client Leads & Inquiries</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Client opportunities delegated to you by your Team Lead or Admin. Review project requirements, budgets, and instructions.
            </p>
          </div>

          <div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              {myLeads.length} Assigned {myLeads.length === 1 ? 'Lead' : 'Leads'}
            </span>
          </div>
        </div>

        {myLeads.length === 0 ? (
          <div className="py-10 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800/80">
            <Briefcase className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
            <div className="text-slate-400 font-semibold mb-1">No Leads Delegated to You Yet</div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              When your Team Lead or Admin assigns you to work on an incoming client inquiry, it will appear here with instructions and deliverables.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myLeads.map((lead) => {
              const tl = users.find((u) => u.id === lead.assignedTeamLeadId);
              const leadTeam = teams.find((t) => t.id === lead.assignedTeamId);

              return (
                <div
                  key={lead.id}
                  className="bg-slate-950/70 border border-slate-800/90 hover:border-slate-700/90 rounded-xl p-4.5 space-y-3 transition-all shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-white">{lead.clientName}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {lead.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{lead.email || lead.phone || 'No direct contact'}</span>
                        <span>•</span>
                        <span>Inquired: {lead.date || 'Recent'}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-emerald-400">
                        {formatINR(lead.budget)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">Budget (INR)</div>
                    </div>
                  </div>

                  {/* Required Services */}
                  <div className="flex flex-wrap gap-1.5">
                    {(lead.services || []).map((srv, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 text-slate-300"
                      >
                        {srv}
                      </span>
                    ))}
                  </div>

                  {/* Lead Supervision context */}
                  <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-[11px] text-slate-300">
                        Supervisory TL: <strong className="text-white">{tl ? tl.name : 'Super Admin'}</strong>
                      </span>
                    </div>
                    {leadTeam && (
                      <span className="text-[10px] text-slate-400">
                        {leadTeam.teamName}
                      </span>
                    )}
                  </div>

                  {/* Briefing notes */}
                  {lead.tlNotes && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-[11px] text-amber-400">
                        <MessageSquare className="w-3 h-3" />
                        <span>Briefing & Task Instructions:</span>
                      </div>
                      <div className="text-[11px] leading-relaxed italic">{lead.tlNotes}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Change Account Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md cursor-pointer"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
