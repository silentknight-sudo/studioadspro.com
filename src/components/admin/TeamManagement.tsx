import React, { useState } from 'react';
import {
  Team,
  UserProfile,
  Profession,
  PROFESSION_LABELS,
  PROFESSION_COLORS,
  Project,
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
  Layers,
  UserCheck,
  Users,
  Briefcase,
  X,
  Edit2,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react';

interface TeamManagementProps {
  teams: Team[];
  users: UserProfile[];
  projects: Project[];
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

export const TeamManagement: React.FC<TeamManagementProps> = ({
  teams,
  users,
  projects,
  initialCreateOpen = false,
  onCloseCreateModal,
}) => {
  const { profile, isAdmin } = useAuth();
  const { success, error } = useToast();

  const [modalOpen, setModalOpen] = useState(initialCreateOpen);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamToDelete, setTeamToDelete] = useState<Team | null>(null);

  React.useEffect(() => {
    if (initialCreateOpen) {
      resetForm();
      setModalOpen(true);
      onCloseCreateModal?.();
    }
  }, [initialCreateOpen]);

  // Form state
  const [teamName, setTeamName] = useState('');
  const [profession, setProfession] = useState<Profession>('WEBSITE');
  const [teamLeadId, setTeamLeadId] = useState('');
  const [description, setDescription] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const eligibleTeamLeads = users.filter(
    (u) => u.role === 'TEAM_LEAD' || u.role === 'ADMIN'
  );

  const resetForm = () => {
    setTeamName('');
    setProfession('WEBSITE');
    setTeamLeadId(eligibleTeamLeads[0]?.id || '');
    setDescription('');
    setMembers([]);
    setStatus('ACTIVE');
    setEditingTeam(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (t: Team) => {
    setEditingTeam(t);
    setTeamName(t.teamName);
    setProfession(t.profession);
    setTeamLeadId(t.teamLeadId);
    setDescription(t.description || '');
    setMembers(t.members || []);
    setStatus(t.status);
    setModalOpen(true);
  };

  const toggleMember = (userId: string) => {
    setMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      error('Team Name is required.');
      return;
    }
    if (!teamLeadId) {
      error('Please assign a Team Lead.');
      return;
    }

    try {
      if (editingTeam) {
        const teamRef = doc(db, 'teams', editingTeam.id);
        const updates: Partial<Team> = {
          teamName: teamName.trim(),
          profession,
          teamLeadId,
          description: description.trim(),
          members,
          status,
        };
        await updateDoc(teamRef, updates);
        await logAuditEvent('TEAM_UPDATED', profile?.email || 'Admin', `Updated team "${teamName}"`);
        success('Team updated successfully.');
      } else {
        const newTeam: Omit<Team, 'id'> = {
          teamName: teamName.trim(),
          profession,
          teamLeadId,
          description: description.trim(),
          members,
          status,
          createdAt: new Date().toISOString(),
        };
        await addDoc(collection(db, 'teams'), newTeam);
        await logAuditEvent('TEAM_CREATED', profile?.email || 'Admin', `Created team "${teamName}" for ${profession}`);
        success('Team created successfully.');
      }
      setModalOpen(false);
      resetForm();
      onCloseCreateModal?.();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'teams');
      error('Failed to save team.');
    }
  };

  const confirmDeleteTeam = async () => {
    if (!teamToDelete) return;
    const target = teamToDelete;
    setTeamToDelete(null);

    try {
      await deleteDoc(doc(db, 'teams', target.id));
      await logAuditEvent('TEAM_DELETED', profile?.email || 'Admin', `Deleted team "${target.teamName}"`);
      success(`Team "${target.teamName}" deleted.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `teams/${target.id}`);
      error('Failed to delete team.');
    }
  };

  const handleDeleteTeam = (team: Team) => {
    setTeamToDelete(team);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Teams by Agency Profession</h1>
          <p className="text-xs text-slate-400 mt-1">
            Organize specialized operational units, designate team leadership, and assign projects.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Team
          </button>
        )}
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs space-y-3">
          <Layers className="w-8 h-8 mx-auto text-slate-600" />
          <p className="font-semibold text-slate-400">No teams created yet.</p>
          <p className="text-slate-500">Create specialized teams corresponding to Mobile, Web, Marketing, Social, or Video.</p>
          {isAdmin && (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500"
            >
              <Plus className="w-3.5 h-3.5" />
              Create First Team
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teams.map((t) => {
            const leadUser = users.find((u) => u.id === t.teamLeadId);
            const teamMembers = users.filter((u) => (t.members || []).includes(u.id));
            const activeTeamProjects = projects.filter((p) => p.assignedTeamId === t.id);
            const colors = PROFESSION_COLORS[t.profession] || PROFESSION_COLORS.WEBSITE;

            return (
              <div
                key={t.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold mb-1.5 ${colors.bg} ${colors.text} border ${colors.border}`}
                      >
                        {PROFESSION_LABELS[t.profession]}
                      </span>
                      <h3 className="text-base font-bold text-white tracking-tight">{t.teamName}</h3>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                          title="Edit Team"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTeam(t)}
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                          title="Delete Team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {t.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4">{t.description}</p>
                  )}

                  {/* Team Lead Card */}
                  <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl mb-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Team Lead</div>
                        <div className="font-semibold text-slate-200">
                          {leadUser ? leadUser.name : 'Unassigned'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">{leadUser?.email}</span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-800/80 my-3">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span>{teamMembers.length} Members</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <Briefcase className="w-4 h-4 text-indigo-400" />
                      <span>{activeTeamProjects.length} Projects</span>
                    </div>
                  </div>

                  {/* Members list */}
                  <div>
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Roster ({teamMembers.length})
                    </div>
                    {teamMembers.length === 0 ? (
                      <div className="text-[11px] text-slate-500 italic">No assigned members yet.</div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {teamMembers.slice(0, 5).map((m) => (
                          <span
                            key={m.id}
                            className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-medium"
                            title={m.email}
                          >
                            {m.name}
                          </span>
                        ))}
                        {teamMembers.length > 5 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-500 bg-slate-900 border border-slate-800">
                            +{teamMembers.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
                      t.status === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    ● {t.status}
                  </span>
                  <span>Created {t.createdAt?.slice(0, 10)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Team Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">
                {editingTeam ? 'Edit Team Details' : 'Create Specialized Team'}
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

            <form onSubmit={handleSaveTeam} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Team Name *</label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Apex Mobile Core Squad"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Profession *</label>
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
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Designated Team Lead *</label>
                  <select
                    value={teamLeadId}
                    required
                    onChange={(e) => setTeamLeadId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">Select Team Lead...</option>
                    {eligibleTeamLeads.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Focus Area</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Core responsibilities, technologies, sprint rhythm..."
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl p-3 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Select Team Members
                </label>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5">
                  {users.length === 0 ? (
                    <div className="text-xs text-slate-500">No personnel available to add.</div>
                  ) : (
                    users.map((u) => {
                      const isSelected = members.includes(u.id);
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => toggleMember(u.id)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                            isSelected
                              ? 'bg-blue-600/20 text-blue-200 border border-blue-500/40'
                              : 'text-slate-400 hover:bg-slate-900'
                          }`}
                        >
                          <div className="text-left">
                            <span className="font-semibold text-slate-200">{u.name}</span>
                            <span className="ml-2 text-[10px] text-slate-400">
                              {u.profession} • {u.employmentType}
                            </span>
                          </div>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
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
                  {editingTeam ? 'Update Team' : 'Create Team'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Team Confirmation Modal */}
      {teamToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Delete Team</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete squad <strong className="text-white">"{teamToDelete.teamName}"</strong>? This will detach team members from this unit.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTeamToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteTeam}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-md cursor-pointer"
              >
                Delete Team
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
