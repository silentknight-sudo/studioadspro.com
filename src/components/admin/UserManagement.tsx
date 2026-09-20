import React, { useState, useMemo } from 'react';
import {
  UserProfile,
  UserRole,
  Profession,
  EmploymentType,
  UserStatus,
  Team,
  PROFESSION_LABELS,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { logAuditEvent } from '../../lib/audit';
import { hashPassword } from '../../lib/crypto';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import {
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  Plus,
  Search,
  Users,
  Shield,
  Briefcase,
  User,
  KeyRound,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  Lock,
} from 'lucide-react';

interface UserManagementProps {
  users: UserProfile[];
  teams: Team[];
  initialCreateOpen?: boolean;
  onCloseCreateModal?: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users,
  teams,
  initialCreateOpen = false,
  onCloseCreateModal,
}) => {
  const { profile, isAdmin } = useAuth();
  const { success, error } = useToast();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [professionFilter, setProfessionFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [modalOpen, setModalOpen] = useState(initialCreateOpen);
  const [passwordModalUser, setPasswordModalUser] = useState<UserProfile | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  React.useEffect(() => {
    if (initialCreateOpen) {
      resetForm();
      setModalOpen(true);
      onCloseCreateModal?.();
    }
  }, [initialCreateOpen]);

  // Form states for creating new user
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Pass@SAP2026');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [profession, setProfession] = useState<Profession>('WEBSITE');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [teamId, setTeamId] = useState<string>('');
  const [phone, setPhone] = useState('');

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('Pass@SAP2026');
    setRole('EMPLOYEE');
    setProfession('WEBSITE');
    setEmploymentType('FULL_TIME');
    setTeamId('');
    setPhone('');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      error('Full Name and Email are required.');
      return;
    }

    // Use normalized email as doc ID if offline / pre-created
    const cleanId = email.trim().toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    const newUser: UserProfile = {
      id: cleanId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      role,
      profession,
      employmentType,
      teamId: teamId || undefined,
      createdBy: profile?.email || 'Admin',
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
      phone: phone.trim() || undefined,
    };

    try {
      const passwordHash = await hashPassword(password.trim());
      await setDoc(doc(db, 'users', cleanId), { ...newUser, passwordHash });
      if (role === 'ADMIN') {
        await setDoc(doc(db, 'admins', cleanId), {
          email: email.trim().toLowerCase(),
          createdAt: new Date().toISOString(),
        });
      }

      await logAuditEvent(
        'USER_CREATED',
        profile?.email || 'Admin',
        `Created user "${name}" (${email}) with role ${role} and profession ${profession}`
      );

      success(`User ${name} created successfully with temporary password: ${password}`);
      setModalOpen(false);
      resetForm();
      onCloseCreateModal?.();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${cleanId}`);
      error('Failed to create user profile.');
    }
  };

  const handleToggleStatus = async (targetUser: UserProfile) => {
    const nextStatus: UserStatus = targetUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateDoc(doc(db, 'users', targetUser.id), { status: nextStatus });
      await logAuditEvent(
        'USER_STATUS_CHANGE',
        profile?.email || 'Admin',
        `Changed status of ${targetUser.name} to ${nextStatus}`
      );
      success(`User status updated to ${nextStatus}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.id}`);
      error('Failed to update user status.');
    }
  };

  const handleAssignTeam = async (targetUser: UserProfile, newTeamId: string) => {
    try {
      await updateDoc(doc(db, 'users', targetUser.id), { teamId: newTeamId || null });
      await logAuditEvent(
        'USER_TEAM_REASSIGN',
        profile?.email || 'Admin',
        `Assigned ${targetUser.name} to team ${newTeamId}`
      );
      success('Team assignment updated.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUser.id}`);
      error('Failed to update team assignment.');
    }
  };

  const handleResetPassword = async () => {
    if (!passwordModalUser || !tempPassword.trim()) return;
    try {
      const passwordHash = await hashPassword(tempPassword.trim());
      await updateDoc(doc(db, 'users', passwordModalUser.id), {
        passwordHash,
        password: null,
        lastPasswordReset: new Date().toISOString(),
      });
      await logAuditEvent(
        'PASSWORD_RESET',
        profile?.email || 'Admin',
        `Admin issued temporary password reset for user "${passwordModalUser.email}"`
      );
      success(`Temporary password set for ${passwordModalUser.name}: "${tempPassword}"`);
      setPasswordModalUser(null);
      setTempPassword('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${passwordModalUser.id}`);
      error('Failed to reset password.');
    }
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    const target = userToDelete;
    setUserToDelete(null);

    if (target.id === profile?.id) {
      error('You cannot delete your own account.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', target.id));
      await logAuditEvent(
        'USER_DELETED',
        profile?.email || 'Admin',
        `Removed user "${target.name}" (${target.email})`
      );
      success(`User ${target.name} removed from directory.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${target.id}`);
      error('Failed to delete user.');
    }
  };

  const handleDeleteUser = (targetUser: UserProfile) => {
    if (targetUser.id === profile?.id) {
      error('You cannot delete your own account.');
      return;
    }
    setUserToDelete(targetUser);
  };

  const filteredUsers = useMemo(() => {
    const seen = new Set<string>();
    return users.filter((u) => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);

      const term = search.toLowerCase();
      const matchesSearch =
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.phone && u.phone.includes(term));

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesProf = professionFilter === 'ALL' || u.profession === professionFilter;
      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

      return matchesSearch && matchesRole && matchesProf && matchesStatus;
    });
  }, [users, search, roleFilter, professionFilter, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Personnel Directory & RBAC</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage agency roles (Admin, Team Lead, Employee), profession assignments, and team alignment.
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Create User Account
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/50"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admin</option>
              <option value="TEAM_LEAD">Team Lead</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
          </div>

          {/* Profession Filter */}
          <div>
            <select
              value={professionFilter}
              onChange={(e) => setProfessionFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/50"
            >
              <option value="ALL">All Professions</option>
              <option value="MOBILE_APP">Mobile App</option>
              <option value="WEBSITE">Website</option>
              <option value="MARKETING">Marketing</option>
              <option value="SOCIAL_MEDIA_HANDLING">Social Media</option>
              <option value="VIDEO_SHOOT_EDIT">Video Production</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/50"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ON_LEAVE">On Leave</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-3">
            <Users className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-semibold text-slate-400">No personnel records found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 uppercase text-[10px] font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Profession</th>
                  <th className="px-4 py-3">Contract</th>
                  <th className="px-4 py-3">Team Alignment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredUsers.map((u) => {
                  const currentTeam = teams.find((t) => t.id === u.teamId);

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-300 font-bold border border-blue-800/80 flex items-center justify-center text-xs shrink-0">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-white">{u.name}</div>
                            <div className="text-[10px] text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {u.role === 'ADMIN' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <Shield className="w-3 h-3" />
                            ADMIN
                          </span>
                        )}
                        {u.role === 'TEAM_LEAD' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <Briefcase className="w-3 h-3" />
                            TEAM LEAD
                          </span>
                        )}
                        {u.role === 'EMPLOYEE' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            <User className="w-3 h-3" />
                            EMPLOYEE
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-200 font-medium">
                          {PROFESSION_LABELS[u.profession] || u.profession}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-medium text-slate-400">
                          {u.employmentType === 'FULL_TIME' ? 'Full-time' : 'Freelancer'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isAdmin ? (
                          <select
                            value={u.teamId || ''}
                            onChange={(e) => handleAssignTeam(u, e.target.value)}
                            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none"
                          >
                            <option value="">Unassigned</option>
                            {teams.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.teamName}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-slate-300 font-medium">
                            {currentTeam ? currentTeam.teamName : 'Unassigned'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : u.status === 'ON_LEAVE'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(u)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  u.status === 'ACTIVE'
                                    ? 'text-amber-400 hover:bg-amber-500/10'
                                    : 'text-emerald-400 hover:bg-emerald-500/10'
                                }`}
                                title={u.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
                              >
                                {u.status === 'ACTIVE' ? (
                                  <XCircle className="w-3.5 h-3.5" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPasswordModalUser(u);
                                  setTempPassword('TempPass@2026');
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                                title="Reset Temporary Password"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                title="Delete User"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">Create Personnel ID & Account</h2>
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

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Marcus Vance"
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Corporate Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="m.vance@sap.com"
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Temporary Password</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">System Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="TEAM_LEAD">TEAM LEAD</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Profession Line *</label>
                  <select
                    value={profession}
                    onChange={(e) => setProfession(e.target.value as Profession)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="MOBILE_APP">Mobile App Development</option>
                    <option value="WEBSITE">Website & Web App</option>
                    <option value="MARKETING">Digital Marketing & Ads</option>
                    <option value="SOCIAL_MEDIA_HANDLING">Social Media</option>
                    <option value="VIDEO_SHOOT_EDIT">Video Production</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Employment Type *</label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="FULL_TIME">Full-time</option>
                    <option value="FREELANCER">Freelancer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Team Alignment</label>
                  <select
                    value={teamId}
                    onChange={(e) => setTeamId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">None (Unassigned)</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teamName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-0192"
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
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
                  Save User Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {passwordModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Reset Temporary Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Set a temporary password for <span className="text-white font-semibold">{passwordModalUser.name}</span> ({passwordModalUser.email}).
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">New Temporary Password</label>
              <input
                type="text"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPasswordModalUser(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetPassword}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md cursor-pointer"
              >
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Delete User Account</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-white">{userToDelete.name}</strong> ({userToDelete.email}) from the directory? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 shadow-md cursor-pointer"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
