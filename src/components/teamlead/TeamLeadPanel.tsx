import React, { useState } from 'react';
import {
  UserProfile,
  Team,
  Project,
  Lead,
  EmploymentType,
  Profession,
  PROFESSION_LABELS,
  formatINR,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { logAuditEvent } from '../../lib/audit';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import {
  Users,
  Briefcase,
  TrendingUp,
  UserPlus,
  CheckCircle2,
  Clock,
  X,
  Plus,
  FolderKanban,
  CheckSquare,
  Square,
  UserCheck,
  ArrowRight,
  UserCog,
  MessageSquare,
  IndianRupee,
  FileSpreadsheet,
} from 'lucide-react';

interface TeamLeadPanelProps {
  teams: Team[];
  users: UserProfile[];
  projects: Project[];
  leads: Lead[];
}

export const TeamLeadPanel: React.FC<TeamLeadPanelProps> = ({
  teams,
  users,
  projects,
  leads,
}) => {
  const { profile } = useAuth();
  const { success, error } = useToast();

  // Find teams led by this user (or if admin, allow selecting team or default to first team)
  const myTeams = teams.filter(
    (t) => t.teamLeadId === profile?.id || profile?.role === 'ADMIN'
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string>(myTeams[0]?.id || teams[0]?.id || '');
  const activeTeam = teams.find((t) => t.id === selectedTeamId) || myTeams[0] || teams[0];

  // Team members
  const teamMembers = users.filter(
    (u) => u.teamId === activeTeam?.id || (activeTeam?.members || []).includes(u.id)
  );
  const fullTimeCount = teamMembers.filter((m) => m.employmentType === 'FULL_TIME').length;
  const freelancerCount = teamMembers.filter((m) => m.employmentType === 'FREELANCER').length;

  // Team projects
  const teamProjects = projects.filter(
    (p) =>
      p.assignedTeamId === activeTeam?.id ||
      teamMembers.some((m) => (p.assignedEmployees || []).includes(m.id))
  );

  // Leads delegated to this TL or team
  const teamLeads = leads.filter(
    (l) =>
      l.assignedTeamLeadId === profile?.id ||
      l.assignedTeamId === activeTeam?.id ||
      (l.assignedTo || []).includes(profile?.id || '') ||
      (profile?.role === 'ADMIN' &&
        (l.assignedTeamLeadId === activeTeam?.teamLeadId || l.assignedTeamId === activeTeam?.id))
  );

  // Modals
  const [createEmployeeModal, setCreateEmployeeModal] = useState(false);
  const [assignProjectModal, setAssignProjectModal] = useState<Project | null>(null);
  const [selectedStaffForProject, setSelectedStaffForProject] = useState<string[]>([]);

  // Lead delegation modal state (Admin -> TL -> Employees)
  const [delegateLeadModal, setDelegateLeadModal] = useState<Lead | null>(null);
  const [selectedStaffForLead, setSelectedStaffForLead] = useState<string[]>([]);
  const [leadTlNotes, setLeadTlNotes] = useState<string>('');

  // New Employee Form State
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPass, setEmpPass] = useState('TempPass@SAP2026');
  const [empContract, setEmpContract] = useState<EmploymentType>('FULL_TIME');
  const [empPhone, setEmpPhone] = useState('');

  const handleCreateTeamEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empEmail.trim()) {
      error('Name and corporate email are required.');
      return;
    }

    const cleanId = empEmail.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const newEmp: UserProfile = {
      id: cleanId,
      email: empEmail.trim().toLowerCase(),
      name: empName.trim(),
      role: 'EMPLOYEE',
      profession: activeTeam ? activeTeam.profession : 'WEBSITE',
      teamId: activeTeam?.id,
      employmentType: empContract,
      reportsTo: profile?.id,
      createdBy: profile?.email || 'Team Lead',
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
      phone: empPhone.trim() || undefined,
    };

    try {
      await setDoc(doc(db, 'users', cleanId), { ...newEmp, password: empPass.trim() });
      // Also add to team members array
      if (activeTeam) {
        const updatedMembers = Array.from(new Set([...(activeTeam.members || []), cleanId]));
        await updateDoc(doc(db, 'teams', activeTeam.id), { members: updatedMembers });
      }

      await logAuditEvent(
        'EMPLOYEE_CREATED_BY_LEAD',
        profile?.email || 'Team Lead',
        `Team Lead created employee "${empName}" (${empEmail}) for team "${activeTeam?.teamName}"`
      );

      success(`Employee created successfully. Initial password: ${empPass}`);
      setCreateEmployeeModal(false);
      setEmpName('');
      setEmpEmail('');
      setEmpPhone('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${cleanId}`);
      error('Failed to create employee account.');
    }
  };

  const openAssignModal = (p: Project) => {
    setAssignProjectModal(p);
    setSelectedStaffForProject(p.assignedEmployees || []);
  };

  const handleSaveProjectAssignment = async () => {
    if (!assignProjectModal) return;
    try {
      await updateDoc(doc(db, 'projects', assignProjectModal.id), {
        assignedEmployees: selectedStaffForProject,
        assignedTeamId: activeTeam?.id || assignProjectModal.assignedTeamId,
      });
      await logAuditEvent(
        'PROJECT_ASSIGNED_BY_LEAD',
        profile?.email || 'Team Lead',
        `Assigned project "${assignProjectModal.projectName}" to ${selectedStaffForProject.length} staff members`
      );
      success('Staff assignments updated.');
      setAssignProjectModal(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${assignProjectModal.id}`);
      error('Failed to update project assignment.');
    }
  };

  const openDelegateLeadModal = (lead: Lead) => {
    setDelegateLeadModal(lead);
    setSelectedStaffForLead(lead.assignedEmployeeIds || []);
    setLeadTlNotes(lead.tlNotes || '');
  };

  const handleSaveLeadDelegation = async () => {
    if (!delegateLeadModal) return;
    try {
      const combinedAssigned = Array.from(
        new Set([
          ...(delegateLeadModal.assignedTeamId ? [delegateLeadModal.assignedTeamId] : [activeTeam?.id || '']),
          ...(delegateLeadModal.assignedTeamLeadId ? [delegateLeadModal.assignedTeamLeadId] : [profile?.id || '']),
          ...selectedStaffForLead,
        ])
      );

      await updateDoc(doc(db, 'leads', delegateLeadModal.id), {
        assignedEmployeeIds: selectedStaffForLead,
        assignedTo: combinedAssigned,
        tlNotes: leadTlNotes,
        lastModified: new Date().toISOString(),
      });

      await logAuditEvent(
        'LEAD_DELEGATED_BY_LEAD',
        profile?.email || 'Team Lead',
        `Team Lead delegated lead "${delegateLeadModal.clientName}" to ${selectedStaffForLead.length} squad employee(s)`
      );
      success(`Lead "${delegateLeadModal.clientName}" delegated to ${selectedStaffForLead.length} squad employee(s).`);
      setDelegateLeadModal(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `leads/${delegateLeadModal.id}`);
      error('Failed to update lead employee delegation.');
    }
  };

  // Team performance: avg progress of team projects
  const avgProgress =
    teamProjects.length > 0
      ? Math.round(teamProjects.reduce((acc, p) => acc + (p.progress || 0), 0) / teamProjects.length)
      : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header with Team Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
            Team Leadership Console
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {activeTeam ? activeTeam.teamName : 'My Operational Squad'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Profession: {activeTeam ? PROFESSION_LABELS[activeTeam.profession] : 'All'} • Managed by {profile?.name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {teams.length > 1 && (
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.teamName}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setCreateEmployeeModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Create Team Member ID
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Team Strength</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-white">{teamMembers.length}</div>
          <div className="mt-2 text-[11px] text-slate-400">
            {fullTimeCount} Full-time • {freelancerCount} Freelancers
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Assigned Projects</span>
            <Briefcase className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-white">{teamProjects.length}</div>
          <div className="mt-2 text-[11px] text-slate-400">
            {teamProjects.filter((p) => p.status === 'IN_PROGRESS').length} currently active
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Client Leads</span>
            <IndianRupee className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-300">{teamLeads.length}</div>
          <div className="mt-2 text-[11px] text-slate-400">
            {formatINR(teamLeads.reduce((acc, l) => acc + (Number(l.budget) || 0), 0))} in pipeline
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Average Progress</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-white">{avgProgress}%</div>
          <div className="mt-2 text-[11px] text-slate-400">
            Across {teamProjects.length} deliverables
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Completed Projects</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-white">
            {teamProjects.filter((p) => p.status === 'COMPLETED').length}
          </div>
          <div className="mt-2 text-[11px] text-slate-400">Successfully finalized</div>
        </div>
      </div>

      {/* Grid: Team Members & Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Members List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Team Members & Workload</h3>
              <p className="text-[11px] text-slate-400">Full-time engineers, creatives, and specialists</p>
            </div>
            <span className="text-xs text-blue-400 font-semibold">{teamMembers.length} staff</span>
          </div>

          {teamMembers.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No employees assigned to this team yet. Use "Create Team Member ID" above.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {teamMembers.map((m) => {
                const assignedProjs = teamProjects.filter((p) =>
                  (p.assignedEmployees || []).includes(m.id)
                );

                return (
                  <div
                    key={m.id}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-300 font-bold border border-blue-800 flex items-center justify-center text-xs">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-white">{m.name}</div>
                        <div className="text-[10px] text-slate-400">{m.email}</div>
                        <div className="text-[10px] text-blue-400 font-medium">
                          {m.employmentType === 'FULL_TIME' ? 'Full-time' : 'Freelancer'} • {m.status}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-200">{assignedProjs.length} Projects</div>
                      <div className="text-[10px] text-slate-500">Active Workload</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Team Projects Assignment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Team Project Deliveries</h3>
              <p className="text-[11px] text-slate-400">Assign members and update deliverable status</p>
            </div>
          </div>

          {teamProjects.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No projects mapped to this team yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {teamProjects.map((p) => {
                const assignedStaff = users.filter((u) => (p.assignedEmployees || []).includes(u.id));

                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-white">{p.projectName}</h4>
                        <div className="text-[10px] text-slate-400">Due: {p.dueDate || 'Open'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAssignModal(p)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 font-semibold text-[11px] transition-colors"
                      >
                        Assign Staff
                      </button>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Progress: {p.status}</span>
                        <span className="font-semibold text-white">{p.progress || 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${p.progress || 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-wrap pt-1">
                      <span className="text-[10px] text-slate-500">Staff:</span>
                      {assignedStaff.length === 0 ? (
                        <span className="text-[10px] text-slate-500 italic">None assigned</span>
                      ) : (
                        assignedStaff.map((u) => (
                          <span
                            key={u.id}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300"
                          >
                            {u.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Assigned Client Leads & Squad Employee Delegation Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                Admin ➔ Team Lead ➔ Employees Flow
              </span>
              <span className="text-xs font-semibold text-emerald-400">
                {formatINR(teamLeads.reduce((acc, l) => acc + (Number(l.budget) || 0), 0))} Pipeline
              </span>
            </div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-amber-400" />
              <span>Assigned Client Leads & Squad Delegation</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Client leads dispatched by Admin to your department. Review requirements and assign specific team employees.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              {teamLeads.length} Assigned {teamLeads.length === 1 ? 'Lead' : 'Leads'}
            </span>
          </div>
        </div>

        {teamLeads.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs bg-slate-950/40 rounded-xl border border-slate-800/80">
            <Briefcase className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
            <div className="text-slate-400 font-semibold mb-1">No Leads Assigned to This Squad Yet</div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              When Super Admin dispatches client inquiries to this department, they will appear here for Team Lead review and employee delegation.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {teamLeads.map((lead) => {
              const assignedStaffList = users.filter((u) =>
                (lead.assignedEmployeeIds || []).includes(u.id)
              );
              const isUnassignedToStaff = assignedStaffList.length === 0;

              return (
                <div
                  key={lead.id}
                  className="bg-slate-950/70 border border-slate-800/90 hover:border-slate-700/90 rounded-xl p-4.5 space-y-3.5 transition-all shadow-sm"
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
                        <span>Date: {lead.date || 'Recent'}</span>
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

                  {/* Admin Briefing / TL Notes */}
                  {lead.tlNotes && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200/90 space-y-1">
                      <div className="flex items-center gap-1.5 font-semibold text-[11px] text-amber-400">
                        <MessageSquare className="w-3 h-3" />
                        <span>Admin Briefing Notes:</span>
                        {lead.delegatedBy && (
                          <span className="text-[10px] text-amber-400/70 font-normal">
                            (via {lead.delegatedBy})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] leading-relaxed italic">{lead.tlNotes}</div>
                    </div>
                  )}

                  {/* Assigned Squad Employees */}
                  <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Assigned Squad Employees:
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isUnassignedToStaff ? (
                          <span className="text-[11px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Pending Staff Delegation
                          </span>
                        ) : (
                          assignedStaffList.map((emp) => (
                            <span
                              key={emp.id}
                              className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-600/20 text-blue-300 border border-blue-500/30 flex items-center gap-1"
                            >
                              <UserCheck className="w-3 h-3 text-blue-400" />
                              {emp.name}
                            </span>
                          ))
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openDelegateLeadModal(lead)}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-center"
                    >
                      <UserCog className="w-3.5 h-3.5" />
                      <span>{isUnassignedToStaff ? 'Assign to Employees' : 'Edit Staff'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Team Member Modal */}
      {createEmployeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Create Employee ID</h3>
                <p className="text-[11px] text-slate-400">Add staff member to {activeTeam?.teamName}</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateEmployeeModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTeamEmployee} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="e.g. Jordan Cruz"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  placeholder="jordan.c@sap.com"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Password</label>
                <input
                  type="text"
                  required
                  value={empPass}
                  onChange={(e) => setEmpPass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Contract Type</label>
                <select
                  value={empContract}
                  onChange={(e) => setEmpContract(e.target.value as EmploymentType)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="FULL_TIME">Full-time</option>
                  <option value="FREELANCER">Freelancer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Phone</label>
                <input
                  type="text"
                  value={empPhone}
                  onChange={(e) => setEmpPhone(e.target.value)}
                  placeholder="+1 (555) 012-4982"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateEmployeeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md cursor-pointer"
                >
                  Create Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Staff to Project Modal */}
      {assignProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Assign Staff to Project</h3>
                <p className="text-[11px] text-slate-400">{assignProjectModal.projectName}</p>
              </div>
              <button
                type="button"
                onClick={() => setAssignProjectModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {teamMembers.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">
                  No members in team yet to assign.
                </div>
              ) : (
                teamMembers.map((m) => {
                  const isChecked = selectedStaffForProject.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedStaffForProject((prev) =>
                          prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                        );
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-colors ${
                        isChecked
                          ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="font-semibold">{m.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {m.employmentType} • {m.profession}
                        </div>
                      </div>
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-600 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAssignProjectModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProjectAssignment}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md cursor-pointer"
              >
                Save Project Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Lead ➔ Employee Lead Delegation Modal */}
      {delegateLeadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                    TL ➔ Squad Delegation
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {formatINR(delegateLeadModal.budget)}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  Delegate Lead: {delegateLeadModal.clientName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDelegateLeadModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Admin briefing if present */}
            {delegateLeadModal.tlNotes && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Admin Briefing Note:</span>
                </div>
                <div className="text-xs text-slate-300 italic">{delegateLeadModal.tlNotes}</div>
              </div>
            )}

            {/* Select squad employees */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white">
                  Select Squad Employees ({selectedStaffForLead.length} selected)
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      const allMemberIds = teamMembers.map((m) => m.id);
                      setSelectedStaffForLead(allMemberIds);
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStaffForLead([])}
                    className="text-[11px] text-slate-400 hover:text-slate-300 font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {teamMembers.length === 0 ? (
                  <div className="text-center text-slate-500 text-xs py-4">
                    No employees currently in this squad. Add members first.
                  </div>
                ) : (
                  teamMembers.map((m) => {
                    const isSelected = selectedStaffForLead.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedStaffForLead((prev) =>
                            prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                          );
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{m.name}</div>
                            <div className="text-[10px] text-slate-400">
                              {PROFESSION_LABELS[m.profession]} • {m.employmentType}
                            </div>
                          </div>
                        </div>

                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* TL Instructions / Updates */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                TL Briefing & Task Notes for Employees
              </label>
              <textarea
                rows={2}
                value={leadTlNotes}
                onChange={(e) => setLeadTlNotes(e.target.value)}
                placeholder="Specific guidance for the selected employees regarding deliverables, budget, client communication..."
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDelegateLeadModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLeadDelegation}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Save Squad Delegation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
