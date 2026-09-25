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
import { db, auth, handleFirestoreError, OperationType, createUserOnSecondaryApp } from '../../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
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
  Pencil,
  Mail,
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
  const [gmail, setGmail] = useState('');
  const [password, setPassword] = useState('Pass@SAP2026');
  const [role, setRole] = useState<UserRole>('EMPLOYEE');
  const [profession, setProfession] = useState<Profession>('WEBSITE');
  const [employmentType, setEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [teamId, setTeamId] = useState<string>('');
  const [phone, setPhone] = useState('');

  // Form states for editing existing user
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGmail, setEditGmail] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('EMPLOYEE');
  const [editProfession, setEditProfession] = useState<Profession>('WEBSITE');
  const [editEmploymentType, setEditEmploymentType] = useState<EmploymentType>('FULL_TIME');
  const [editTeamId, setEditTeamId] = useState<string>('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState<UserStatus>('ACTIVE');
  const [editSaving, setEditSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setEmail('');
    setGmail('');
    setPassword('Pass@SAP2026');
    setRole('EMPLOYEE');
    setProfession('WEBSITE');
    setEmploymentType('FULL_TIME');
    setTeamId('');
    setPhone('');
  };

  const handleStartEdit = (u: UserProfile) => {
    setEditingUser(u);
    setEditName(u.name || '');
    setEditEmail(u.email || '');
    setEditGmail(u.gmail || '');
    setEditRole(u.role || 'EMPLOYEE');
    setEditProfession(u.profession || 'WEBSITE');
    setEditEmploymentType(u.employmentType || 'FULL_TIME');
    setEditTeamId(u.teamId || '');
    setEditPhone(u.phone || '');
    setEditStatus(u.status || 'ACTIVE');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editName.trim() || !editEmail.trim()) {
      error('Full Name and Corporate Email are required.');
      return;
    }

    const normalizedEmail = editEmail.trim().toLowerCase();
    const normalizedGmail = editGmail.trim().toLowerCase();

    if (normalizedGmail && !normalizedGmail.includes('@')) {
      error('Please enter a valid Gmail address (e.g. name@gmail.com).');
      return;
    }

    setEditSaving(true);
    try {
      const updates: Partial<UserProfile> = {
        name: editName.trim(),
        email: normalizedEmail,
        gmail: normalizedGmail || undefined,
        role: editRole,
        profession: editProfession,
        employmentType: editEmploymentType,
        teamId: editTeamId || undefined,
        phone: editPhone.trim() || undefined,
        status: editStatus,
      };

      await updateDoc(doc(db, 'users', editingUser.id), updates);

      if (editRole === 'ADMIN') {
        await setDoc(
          doc(db, 'admins', editingUser.id),
          {
            email: normalizedEmail,
            gmail: normalizedGmail || undefined,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      await logAuditEvent(
        'USER_UPDATED',
        profile?.email || 'Admin',
        `Updated user "${editName.trim()}" (${normalizedEmail}). Linked Gmail: ${normalizedGmail || 'None'}`
      );

      success(`User "${editName.trim()}" updated successfully!`);
      setEditingUser(null);
    } catch (err: any) {
      console.error('Error updating user profile:', err);
      handleFirestoreError(err, OperationType.UPDATE, `users/${editingUser.id}`);
      error(err?.message || 'Failed to update user profile.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      error('Full Name and Email are required.');
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedGmail = gmail.trim().toLowerCase();

    if (normalizedGmail && !normalizedGmail.includes('@')) {
      error('Please enter a valid Gmail address (e.g. name@gmail.com).');
      return;
    }

    if (password.trim().length < 6) {
      error('Password must be at least 6 characters (Firebase requirement).');
      return;
    }

    try {
      // Real Firebase Authentication account — created on a throwaway secondary
      // app instance so it never displaces the signed-in admin's own session.
      let uid: string;
      let isSecondaryAuthCreated = false;
      try {
        uid = await createUserOnSecondaryApp(normalizedEmail, password.trim());
        isSecondaryAuthCreated = true;
      } catch (authErr: any) {
        if (authErr?.code === 'auth/operation-not-allowed') {
          // If email/password provider is not yet enabled in Firebase Console,
          // create a profile record in Firestore so the employee can be assigned to teams/leads.
          // When they sign in with Google using this email, AuthContext will auto-link the profile.
          uid = 'uid_' + Math.random().toString(36).substring(2, 12);
        } else {
          throw authErr;
        }
      }

      const newUser: UserProfile = {
        id: uid,
        email: normalizedEmail,
        gmail: normalizedGmail || undefined,
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

      await setDoc(doc(db, 'users', uid), newUser);
      if (role === 'ADMIN') {
        await setDoc(doc(db, 'admins', uid), {
          email: normalizedEmail,
          gmail: normalizedGmail || undefined,
          createdAt: new Date().toISOString(),
        });
      }

      await logAuditEvent(
        'USER_CREATED',
        profile?.email || 'Admin',
        `Created user "${name}" (${normalizedEmail}) with role ${role} and profession ${profession}. Linked Gmail: ${normalizedGmail || 'None'}`
      );

      if (isSecondaryAuthCreated) {
        success(`User ${name} created successfully! Temporary password: ${password}`);
      } else {
        success(
          `User ${name} added! They can sign in directly with Google using ${normalizedGmail || normalizedEmail}.`
        );
      }
      setModalOpen(false);
      resetForm();
      onCloseCreateModal?.();
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        error('An account with this email already exists.');
      } else {
        console.warn('Account creation warning:', err);
        error(err?.message || 'Failed to create user account.');
      }
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
    if (!passwordModalUser) return;
    try {
      // Real password resets go through Firebase's own secure email flow —
      // nobody, including an admin, can see or set another user's password.
      await sendPasswordResetEmail(auth, passwordModalUser.email);
      await logAuditEvent(
        'PASSWORD_RESET',
        profile?.email || 'Admin',
        `Admin triggered a password reset email for user "${passwordModalUser.email}"`
      );
      success(`Password reset email sent to ${passwordModalUser.email}.`);
      setPasswordModalUser(null);
    } catch (err: any) {
      if (err?.code === 'auth/operation-not-allowed') {
        error('Email/Password provider is disabled in Firebase Console.');
      } else {
        console.warn('Password reset warning:', err);
        error('Failed to send password reset email.');
      }
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
                            <div className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                              <span>{u.name}</span>
                              {u.gmail && (
                                <span
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  title={`Direct Google login enabled: ${u.gmail}`}
                                >
                                  <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z" />
                                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.92l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1C3.26 21.3 7.3 24 12 24z" />
                                    <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78z" />
                                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.3 0 3.26 2.7 1.28 6.61l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75z" />
                                  </svg>
                                  Google Login
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                              <span>{u.email}</span>
                              {u.gmail && (
                                <span className="text-emerald-400/90 font-mono text-[9px]">({u.gmail})</span>
                              )}
                            </div>
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
                                onClick={() => handleStartEdit(u)}
                                className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors cursor-pointer"
                                title="Edit User & Link Gmail"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
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
                                onClick={() => setPasswordModalUser(u)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                                title="Send Password Reset Email"
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
                  <label className="block text-xs font-semibold text-emerald-300 mb-1 flex items-center justify-between">
                    <span>Gmail ID (Google Login)</span>
                    <span className="text-[10px] text-emerald-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="email"
                    value={gmail}
                    onChange={(e) => setGmail(e.target.value)}
                    placeholder="m.vance@gmail.com"
                    className="w-full bg-slate-950 border border-emerald-500/40 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder-slate-500"
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

      {/* Edit User Modal with Direct Gmail ID Support */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Edit Personnel Profile</h3>
                  <p className="text-[11px] text-slate-400">
                    Update profile details and link Gmail ID for direct Google login
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Linked Gmail ID Feature Card */}
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z" />
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.92l-3.88-3c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.94H1.28v3.1C3.26 21.3 7.3 24 12 24z" />
                    <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78z" />
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.94 1.19 15.24 0 12 0 7.3 0 3.26 2.7 1.28 6.61l4.01 3.1C6.23 6.86 8.88 4.75 12 4.75z" />
                  </svg>
                  <span className="text-xs font-semibold text-emerald-300">Direct Google Login (Gmail ID)</span>
                </div>
                <p className="text-[11px] text-emerald-200/90 leading-relaxed">
                  Enter the user's personal or work Gmail address below. This allows the user to click{' '}
                  <strong className="text-white">"Sign in with Google"</strong> on the login page using their Gmail account to sign in directly without a password.
                </p>
                <div>
                  <label className="block text-[11px] font-medium text-emerald-200 mb-1">
                    Google / Gmail Account ID
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-emerald-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      value={editGmail}
                      onChange={(e) => setEditGmail(e.target.value)}
                      placeholder="e.g. employee.name@gmail.com"
                      className="w-full bg-slate-950 border border-emerald-500/50 text-white rounded-xl pl-8 pr-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Corporate Email / Login ID *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">System Role *</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
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
                    value={editProfession}
                    onChange={(e) => setEditProfession(e.target.value as Profession)}
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
                    value={editEmploymentType}
                    onChange={(e) => setEditEmploymentType(e.target.value as EmploymentType)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="FULL_TIME">Full-time</option>
                    <option value="FREELANCER">Freelancer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Team Alignment</label>
                  <select
                    value={editTeamId}
                    onChange={(e) => setEditTeamId(e.target.value)}
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

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Account Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                    <option value="ON_LEAVE">ON LEAVE</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 cursor-pointer disabled:opacity-50"
                >
                  {editSaving ? 'Saving Changes...' : 'Save User Profile'}
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
                <h3 className="text-sm font-bold text-white">Reset Password</h3>
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
              This sends a secure password-reset link to{' '}
              <span className="text-white font-semibold">{passwordModalUser.name}</span>'s email (
              {passwordModalUser.email}). Nobody, including admins, can see or set their password directly.
            </p>

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
                Send Reset Email
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
