import React, { useState, useMemo } from 'react';
import {
  Project,
  ProjectStatus,
  Profession,
  PROFESSION_LABELS,
  PROFESSION_COLORS,
  Team,
  UserProfile,
  Lead,
  formatINR,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { logAuditEvent } from '../../lib/audit';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  Plus,
  FolderKanban,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Users,
  Edit2,
  Trash2,
  X,
  Layers,
  FileCheck,
  Calendar,
} from 'lucide-react';

interface ProjectsCenterProps {
  projects: Project[];
  teams: Team[];
  users: UserProfile[];
  leads: Lead[];
  initialCreateOpen?: boolean;
  onCloseCreateModal?: () => void;
}

const ALL_PROFESSIONS: Profession[] = [
  'MOBILE_APP',
  'WEBSITE',
  'MARKETING',
  'SOCIAL_MEDIA_HANDLING',
  'VIDEO_SHOOT_EDIT',
];

export const ProjectsCenter: React.FC<ProjectsCenterProps> = ({
  projects,
  teams,
  users,
  leads,
  initialCreateOpen = false,
  onCloseCreateModal,
}) => {
  const { profile, isAdmin, isTeamLead } = useAuth();
  const { success, error } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [professionFilter, setProfessionFilter] = useState<string>('ALL');

  // Modal states
  const [modalOpen, setModalOpen] = useState(initialCreateOpen);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deliverablesModalProject, setDeliverablesModalProject] = useState<Project | null>(null);
  const [newDeliverableInput, setNewDeliverableInput] = useState('');

  // Form states
  const [projectName, setProjectName] = useState('');
  const [leadId, setLeadId] = useState('');
  const [assignedTeamId, setAssignedTeamId] = useState('');
  const [assignedEmployees, setAssignedEmployees] = useState<string[]>([]);
  const [profession, setProfession] = useState<Profession>('WEBSITE');
  const [status, setStatus] = useState<ProjectStatus>('NOT_STARTED');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [progress, setProgress] = useState<number>(0);
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setProjectName('');
    setLeadId('');
    setAssignedTeamId('');
    setAssignedEmployees([]);
    setProfession('WEBSITE');
    setStatus('NOT_STARTED');
    setStartDate(new Date().toISOString().slice(0, 10));
    setDueDate(new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10));
    setProgress(0);
    setNotes('');
    setEditingProject(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setProjectName(p.projectName);
    setLeadId(p.leadId || '');
    setAssignedTeamId(p.assignedTeamId || '');
    setAssignedEmployees(p.assignedEmployees || []);
    setProfession(p.profession);
    setStatus(p.status);
    setStartDate(p.startDate || '');
    setDueDate(p.dueDate || '');
    setProgress(p.progress || 0);
    setNotes(p.notes || '');
    setModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) {
      error('Project Name is required.');
      return;
    }

    try {
      if (editingProject) {
        const pRef = doc(db, 'projects', editingProject.id);
        const updates: Partial<Project> = {
          projectName: projectName.trim(),
          leadId: leadId || undefined,
          assignedTeamId: assignedTeamId || undefined,
          assignedEmployees,
          profession,
          status,
          startDate,
          dueDate,
          progress: Number(progress) || 0,
          notes: notes.trim(),
        };
        await updateDoc(pRef, updates);
        await logAuditEvent('PROJECT_UPDATED', profile?.email || 'User', `Updated project "${projectName}"`);
        success('Project updated successfully.');
      } else {
        const newProj: Omit<Project, 'id'> = {
          projectName: projectName.trim(),
          leadId: leadId || undefined,
          assignedTeamId: assignedTeamId || undefined,
          assignedEmployees,
          profession,
          status,
          startDate,
          dueDate,
          progress: Number(progress) || 0,
          notes: notes.trim(),
          createdAt: new Date().toISOString(),
          deliverables: ['Scope definition & kickoff', 'Core technical implementation', 'Quality review & testing', 'Final deployment'],
        };
        await addDoc(collection(db, 'projects'), newProj);
        await logAuditEvent('PROJECT_CREATED', profile?.email || 'User', `Created project "${projectName}"`);
        success('Project launched successfully.');
      }
      setModalOpen(false);
      resetForm();
      onCloseCreateModal?.();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'projects');
      error('Failed to save project.');
    }
  };

  const handleDeleteProject = async (p: Project) => {
    if (!window.confirm(`Delete project "${p.projectName}"?`)) return;
    try {
      await deleteDoc(doc(db, 'projects', p.id));
      await logAuditEvent('PROJECT_DELETED', profile?.email || 'Admin', `Deleted project "${p.projectName}"`);
      success(`Project "${p.projectName}" deleted.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `projects/${p.id}`);
      error('Failed to delete project.');
    }
  };

  const handleQuickStatusChange = async (p: Project, newStatus: ProjectStatus) => {
    try {
      const updates: Partial<Project> = { status: newStatus };
      if (newStatus === 'COMPLETED') updates.progress = 100;
      await updateDoc(doc(db, 'projects', p.id), updates);
      await logAuditEvent('PROJECT_STATUS_UPDATE', profile?.email || 'User', `Set project "${p.projectName}" to ${newStatus}`);
      success(`Project status changed to ${newStatus}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${p.id}`);
      error('Failed to update project status.');
    }
  };

  const handleAddDeliverable = async () => {
    if (!deliverablesModalProject || !newDeliverableInput.trim()) return;
    try {
      const updatedDeliverables = [...(deliverablesModalProject.deliverables || []), newDeliverableInput.trim()];
      await updateDoc(doc(db, 'projects', deliverablesModalProject.id), {
        deliverables: updatedDeliverables,
      });
      setDeliverablesModalProject({ ...deliverablesModalProject, deliverables: updatedDeliverables });
      setNewDeliverableInput('');
      success('Deliverable added.');
    } catch (err) {
      error('Failed to add deliverable.');
    }
  };

  const handleRemoveDeliverable = async (index: number) => {
    if (!deliverablesModalProject) return;
    try {
      const updated = [...(deliverablesModalProject.deliverables || [])];
      updated.splice(index, 1);
      await updateDoc(doc(db, 'projects', deliverablesModalProject.id), {
        deliverables: updated,
      });
      setDeliverablesModalProject({ ...deliverablesModalProject, deliverables: updated });
      success('Deliverable removed.');
    } catch (err) {
      error('Failed to remove deliverable.');
    }
  };

  const toggleEmployee = (uid: string) => {
    setAssignedEmployees((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const term = search.toLowerCase();
      const matchesSearch =
        p.projectName.toLowerCase().includes(term) ||
        (p.notes && p.notes.toLowerCase().includes(term));

      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      const matchesProf = professionFilter === 'ALL' || p.profession === professionFilter;

      return matchesSearch && matchesStatus && matchesProf;
    });
  }, [projects, search, statusFilter, professionFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Agency Project Deliveries</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track milestones, employee allocations, deliverable checkpoints, and progress percentages.
          </p>
        </div>
        {(isAdmin || isTeamLead) && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/50"
            >
              <option value="ALL">All Statuses</option>
              <option value="NOT_STARTED">Not Started</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REVIEW">Review</option>
              <option value="COMPLETED">Completed</option>
              <option value="ON_HOLD">On Hold</option>
            </select>
          </div>

          <div>
            <select
              value={professionFilter}
              onChange={(e) => setProfessionFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/50"
            >
              <option value="ALL">All Professions</option>
              {ALL_PROFESSIONS.map((p) => (
                <option key={p} value={p}>
                  {PROFESSION_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Projects Cards Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs space-y-3">
          <FolderKanban className="w-8 h-8 mx-auto text-slate-600" />
          <p className="font-semibold text-slate-400">No active projects found.</p>
          {(isAdmin || isTeamLead) && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
            >
              <Plus className="w-3.5 h-3.5" />
              Launch New Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((p) => {
            const team = teams.find((t) => t.id === p.assignedTeamId);
            const assignedStaff = users.filter((u) => (p.assignedEmployees || []).includes(u.id));
            const colors = PROFESSION_COLORS[p.profession] || PROFESSION_COLORS.WEBSITE;

            return (
              <div
                key={p.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${colors.bg} ${colors.text} border ${colors.border}`}
                    >
                      {PROFESSION_LABELS[p.profession]}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                        title="Edit Project"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteProject(p)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white tracking-tight mb-2">{p.projectName}</h3>

                  {p.notes && <p className="text-xs text-slate-400 line-clamp-2 mb-3">{p.notes}</p>}

                  {/* Status Selector */}
                  <div className="flex items-center justify-between gap-2 my-3 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs">
                    <span className="text-slate-400 text-[11px] font-medium">Status:</span>
                    <select
                      value={p.status}
                      onChange={(e) => handleQuickStatusChange(p, e.target.value as ProjectStatus)}
                      className="bg-slate-900 text-xs font-semibold rounded-lg px-2 py-1 border border-slate-700 text-white focus:outline-none"
                    >
                      <option value="NOT_STARTED">NOT STARTED</option>
                      <option value="IN_PROGRESS">IN PROGRESS</option>
                      <option value="REVIEW">REVIEW</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="ON_HOLD">ON HOLD</option>
                    </select>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Delivery Completion</span>
                      <span className="font-semibold text-white">{p.progress || 0}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${p.progress || 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Team & Dates */}
                  <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        {team ? team.teamName : 'No Team Assigned'}
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        Due: {p.dueDate || 'Open'}
                      </span>
                    </div>

                    {/* Assigned Personnel */}
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1">
                        Assigned Personnel ({assignedStaff.length})
                      </div>
                      {assignedStaff.length === 0 ? (
                        <span className="text-[11px] text-slate-500 italic">No members assigned yet</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {assignedStaff.map((u) => (
                            <span
                              key={u.id}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-medium"
                            >
                              {u.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Deliverables button */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setDeliverablesModalProject(p)}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300"
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    Deliverables ({p.deliverables?.length || 0})
                  </button>
                  <span className="text-[10px] text-slate-500">
                    Started: {p.startDate || p.createdAt?.slice(0, 10)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deliverables Checklist Modal */}
      {deliverablesModalProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Project Deliverables</h3>
                <p className="text-[11px] text-slate-400">{deliverablesModalProject.projectName}</p>
              </div>
              <button
                type="button"
                onClick={() => setDeliverablesModalProject(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {(deliverablesModalProject.deliverables || []).length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-4">No deliverables listed yet.</div>
              ) : (
                deliverablesModalProject.deliverables?.map((deliv, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{deliv}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeliverable(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add new deliverable */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newDeliverableInput}
                onChange={(e) => setNewDeliverableInput(e.target.value)}
                placeholder="e.g. Figma UI prototypes v1"
                className="flex-1 bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddDeliverable}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 cursor-pointer"
              >
                Add
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeliverablesModalProject(null)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Project Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">
                {editingProject ? 'Edit Project' : 'Launch New Project'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  onCloseCreateModal?.();
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. Apex Multi-Platform iOS & Android App"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Linked Client Lead</label>
                  <select
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">None (Independent Scope)</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.clientName} ({formatINR(l.budget)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Profession *</label>
                  <select
                    value={profession}
                    onChange={(e) => setProfession(e.target.value as Profession)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    {ALL_PROFESSIONS.map((p) => (
                      <option key={p} value={p}>
                        {PROFESSION_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assigned Team</label>
                  <select
                    value={assignedTeamId}
                    onChange={(e) => setAssignedTeamId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select Team...</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teamName} ({t.profession})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Project Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="NOT_STARTED">NOT STARTED</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="REVIEW">REVIEW</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ON_HOLD">ON HOLD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Progress Slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                  <span>Progress ({progress}%)</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Assigned Employees */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Assign Staff Members
                </label>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1.5">
                  {users.map((u) => {
                    const isSelected = assignedEmployees.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleEmployee(u.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                          isSelected
                            ? 'bg-blue-600/20 text-blue-200 border border-blue-500/40'
                            : 'text-slate-400 hover:bg-slate-900'
                        }`}
                      >
                        <span className="font-semibold text-slate-200">{u.name}</span>
                        <span className="text-[10px] text-slate-400">{u.role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Notes / Scope Summary</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key milestones, repository links, stakeholder notes..."
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-3 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setModalOpen(false);
                    onCloseCreateModal?.();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 cursor-pointer"
                >
                  {editingProject ? 'Update Project' : 'Launch Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
