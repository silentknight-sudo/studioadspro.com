import React, { useState, useMemo } from 'react';
import {
  Lead,
  LeadStatus,
  Profession,
  PROFESSION_LABELS,
  UserProfile,
  Team,
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
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  UserPlus,
  X,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Printer,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  Users,
  UserCheck,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface LeadManagementProps {
  leads: Lead[];
  users: UserProfile[];
  teams: Team[];
  searchTerm?: string;
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

export const LeadManagement: React.FC<LeadManagementProps> = ({
  leads,
  users,
  teams,
  searchTerm: externalSearch = '',
  initialCreateOpen = false,
  onCloseCreateModal,
}) => {
  const { profile, isAdmin } = useAuth();
  const { success, error } = useToast();

  const [search, setSearch] = useState(externalSearch);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [serviceFilter, setServiceFilter] = useState<string>('ALL');
  const [budgetFilter, setBudgetFilter] = useState<string>('ALL');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('ALL');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  // Modal states
  const [modalOpen, setModalOpen] = useState(initialCreateOpen);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [assignModalLead, setAssignModalLead] = useState<Lead | null>(null);

  // Form states
  const [clientName, setClientName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [budget, setBudget] = useState<number>(100000);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [servicesRequired, setServicesRequired] = useState<Profession[]>(['WEBSITE']);
  const [sourceChannel, setSourceChannel] = useState('Direct / Website');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<LeadStatus>('NEW');

  // Hierarchy Assignment modal state
  const [assignTeamId, setAssignTeamId] = useState<string>('');
  const [assignTeamLeadId, setAssignTeamLeadId] = useState<string>('');
  const [assignEmployeeIds, setAssignEmployeeIds] = useState<string[]>([]);
  const [assignTlNotes, setAssignTlNotes] = useState<string>('');
  const [staffFilterMode, setStaffFilterMode] = useState<'TEAM_ONLY' | 'ALL_STAFF'>('TEAM_ONLY');

  const resetForm = () => {
    setClientName('');
    setEmail('');
    setPhone('');
    setBudget(100000);
    setDate(new Date().toISOString().slice(0, 10));
    setServicesRequired(['WEBSITE']);
    setSourceChannel('Direct / Website');
    setNotes('');
    setStatus('NEW');
    setEditingLead(null);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (lead: Lead) => {
    setEditingLead(lead);
    setClientName(lead.clientName);
    setEmail(lead.email || '');
    setPhone(lead.phone || '');
    setBudget(lead.budget || 0);
    setDate(lead.date || new Date().toISOString().slice(0, 10));
    setServicesRequired(lead.servicesRequired || []);
    setSourceChannel(lead.sourceChannel || 'Direct');
    setNotes(lead.notes || '');
    setStatus(lead.status);
    setModalOpen(true);
  };

  const openAssign = (lead: Lead) => {
    setAssignModalLead(lead);
    setAssignTeamId(lead.assignedTeamId || '');
    setAssignTeamLeadId(lead.assignedTeamLeadId || '');
    // If assignedEmployeeIds is present, use it; otherwise fallback to employees found in assignedTo
    const initialEmployees = lead.assignedEmployeeIds && lead.assignedEmployeeIds.length > 0
      ? lead.assignedEmployeeIds
      : (lead.assignedTo || []).filter((id) => {
          const u = users.find((user) => user.id === id);
          return u && u.role === 'EMPLOYEE';
        });
    setAssignEmployeeIds(initialEmployees);
    setAssignTlNotes(lead.tlNotes || '');
    setStaffFilterMode('TEAM_ONLY');
  };

  // Toggle service checkbox
  const toggleService = (prof: Profession) => {
    setServicesRequired((prev) =>
      prev.includes(prof) ? prev.filter((p) => p !== prof) : [...prev, prof]
    );
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      error('Client Name is required');
      return;
    }
    if (servicesRequired.length === 0) {
      error('Select at least one required service');
      return;
    }

    try {
      if (editingLead) {
        // Update
        const leadRef = doc(db, 'leads', editingLead.id);
        const updates: Partial<Lead> = {
          clientName: clientName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          budget: Number(budget) || 0,
          date,
          servicesRequired,
          sourceChannel,
          notes,
          status,
          lastModified: new Date().toISOString(),
        };
        await updateDoc(leadRef, updates);
        await logAuditEvent('LEAD_UPDATED', profile?.email || 'Admin', `Updated lead "${clientName}"`);
        success('Lead updated successfully.');
      } else {
        // Create
        const newLead: Omit<Lead, 'id'> = {
          clientName: clientName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          budget: Number(budget) || 0,
          date,
          servicesRequired,
          assignedTo: [],
          status,
          notes,
          sourceChannel,
          createdAt: new Date().toISOString(),
          createdBy: profile?.email || 'Admin',
          lastModified: new Date().toISOString(),
        };
        await addDoc(collection(db, 'leads'), newLead);
        await logAuditEvent('LEAD_CREATED', profile?.email || 'Admin', `Created lead "${clientName}" with budget $${budget}`);
        success('Lead registered successfully.');
      }
      setModalOpen(false);
      resetForm();
      onCloseCreateModal?.();
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, 'leads');
      error('Failed to save lead.');
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    if (!window.confirm(`Are you sure you want to delete lead "${lead.clientName}"?`)) return;
    try {
      await deleteDoc(doc(db, 'leads', lead.id));
      await logAuditEvent('LEAD_DELETED', profile?.email || 'Admin', `Deleted lead "${lead.clientName}"`);
      success(`Lead "${lead.clientName}" deleted.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `leads/${lead.id}`);
      error('Failed to delete lead.');
    }
  };

  const handleSaveAssignment = async () => {
    if (!assignModalLead) return;
    try {
      const leadRef = doc(db, 'leads', assignModalLead.id);
      const combinedAssigned = Array.from(
        new Set([
          ...(assignTeamId ? [assignTeamId] : []),
          ...(assignTeamLeadId ? [assignTeamLeadId] : []),
          ...assignEmployeeIds,
        ])
      );

      const targetTL = users.find((u) => u.id === assignTeamLeadId);
      const targetTeam = teams.find((t) => t.id === assignTeamId);

      await updateDoc(leadRef, {
        assignedTeamId: assignTeamId || '',
        assignedTeamLeadId: assignTeamLeadId || '',
        assignedEmployeeIds: assignEmployeeIds,
        assignedTo: combinedAssigned,
        tlNotes: assignTlNotes || '',
        delegatedBy: profile?.email || profile?.name || 'Admin',
        delegatedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      });

      await logAuditEvent(
        'LEAD_ASSIGNED',
        profile?.email || 'Admin',
        `Assigned lead "${assignModalLead.clientName}" -> Team: ${targetTeam?.teamName || 'None'}, TL: ${targetTL?.name || 'None'}, Staff: ${assignEmployeeIds.length} employee(s)`
      );
      success(
        `Lead hierarchy updated: ${targetTL ? `Assigned to TL ${targetTL.name}` : 'Team Lead'} with ${assignEmployeeIds.length} selected employee(s).`
      );
      setAssignModalLead(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `leads/${assignModalLead.id}`);
      error('Failed to update lead assignment hierarchy.');
    }
  };

  // Status fast switcher
  const handleQuickStatusChange = async (lead: Lead, newStatus: LeadStatus) => {
    try {
      await updateDoc(doc(db, 'leads', lead.id), {
        status: newStatus,
        lastModified: new Date().toISOString(),
      });
      await logAuditEvent('LEAD_STATUS_CHANGED', profile?.email || 'User', `Changed lead "${lead.clientName}" status to ${newStatus}`);
      success(`Status changed to ${newStatus}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `leads/${lead.id}`);
      error('Failed to update status.');
    }
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const term = search.toLowerCase();
      const matchesSearch =
        lead.clientName.toLowerCase().includes(term) ||
        (lead.email && lead.email.toLowerCase().includes(term)) ||
        (lead.phone && lead.phone.toLowerCase().includes(term)) ||
        (lead.sourceChannel && lead.sourceChannel.toLowerCase().includes(term));

      const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
      const matchesService =
        serviceFilter === 'ALL' ||
        (lead.servicesRequired && lead.servicesRequired.includes(serviceFilter as Profession));

      let matchesBudget = true;
      const b = Number(lead.budget) || 0;
      if (budgetFilter === 'UNDER_1L') matchesBudget = b < 100000;
      else if (budgetFilter === '1L_TO_5L') matchesBudget = b >= 100000 && b <= 500000;
      else if (budgetFilter === 'OVER_5L') matchesBudget = b > 500000;

      let matchesAssignment = true;
      if (assignmentFilter === 'UNASSIGNED') {
        matchesAssignment = !lead.assignedTeamLeadId && (!lead.assignedEmployeeIds || lead.assignedEmployeeIds.length === 0);
      } else if (assignmentFilter === 'ASSIGNED_TL') {
        matchesAssignment = Boolean(lead.assignedTeamLeadId);
      } else if (assignmentFilter === 'ASSIGNED_STAFF') {
        matchesAssignment = Boolean(lead.assignedEmployeeIds && lead.assignedEmployeeIds.length > 0);
      }

      return matchesSearch && matchesStatus && matchesService && matchesBudget && matchesAssignment;
    });
  }, [leads, search, statusFilter, serviceFilter, budgetFilter, assignmentFilter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLeads.slice(start, start + pageSize);
  }, [filteredLeads, currentPage, pageSize]);

  // CSV Export
  const handleExportCSV = () => {
    if (leads.length === 0) {
      error('No leads to export.');
      return;
    }
    const headers = [
      'Client Name',
      'Email',
      'Phone',
      'Budget (INR)',
      'Date',
      'Status',
      'Services',
      'Assigned Team',
      'Assigned Team Lead',
      'Assigned Employees',
      'Source',
      'Notes',
    ];
    const rows = leads.map((l) => {
      const tl = users.find((u) => u.id === l.assignedTeamLeadId);
      const team = teams.find((t) => t.id === l.assignedTeamId);
      const staff = users
        .filter((u) => (l.assignedEmployeeIds || []).includes(u.id))
        .map((u) => u.name)
        .join('; ');
      return [
        `"${l.clientName || ''}"`,
        `"${l.email || ''}"`,
        `"${l.phone || ''}"`,
        `"${l.budget || 0}"`,
        `"${l.date || ''}"`,
        `"${l.status || ''}"`,
        `"${(l.servicesRequired || []).join(', ')}"`,
        `"${team?.teamName || ''}"`,
        `"${tl?.name || ''}"`,
        `"${staff}"`,
        `"${l.sourceChannel || ''}"`,
        `"${(l.notes || '').replace(/"/g, '""')}"`,
      ];
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StudioAdsPro_Leads_INR_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    success('Leads exported as CSV file.');
  };

  const handlePrint = () => {
    window.print();
  };

  // Bulk Selection
  const toggleSelectAll = () => {
    if (selectedLeadIds.length === paginatedLeads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(paginatedLeads.map((l) => l.id));
    }
  };

  const toggleSelectLead = (id: string) => {
    setSelectedLeadIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedLeadIds.length} selected leads?`)) return;

    try {
      for (const id of selectedLeadIds) {
        await deleteDoc(doc(db, 'leads', id));
      }
      await logAuditEvent('LEADS_BULK_DELETED', profile?.email || 'Admin', `Deleted ${selectedLeadIds.length} leads in bulk`);
      setSelectedLeadIds([]);
      success(`Successfully removed ${selectedLeadIds.length} leads.`);
    } catch (err) {
      error('Failed to delete some leads.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Client Lead Pipeline</h1>
          <p className="text-xs text-slate-400 mt-1">
            Capture, qualify, price, assign, and track client inquiries across all service lines.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / PDF
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            New Lead
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by client, email, phone, channel..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/50"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* Service Filter */}
          <div>
            <select
              value={serviceFilter}
              onChange={(e) => {
                setServiceFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/50"
            >
              <option value="ALL">All Service Types</option>
              {ALL_PROFESSIONS.map((p) => (
                <option key={p} value={p}>
                  {PROFESSION_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          {/* Budget Filter (INR) */}
          <div>
            <select
              value={budgetFilter}
              onChange={(e) => {
                setBudgetFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/50"
            >
              <option value="ALL">All Budgets (INR)</option>
              <option value="UNDER_1L">Under ₹1,00,000</option>
              <option value="1L_TO_5L">₹1,00,000 - ₹5,00,000</option>
              <option value="OVER_5L">Over ₹5,00,000</option>
            </select>
          </div>

          {/* Assignment Hierarchy Filter */}
          <div>
            <select
              value={assignmentFilter}
              onChange={(e) => {
                setAssignmentFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500/50"
            >
              <option value="ALL">All Assignments</option>
              <option value="UNASSIGNED">Unassigned</option>
              <option value="ASSIGNED_TL">Assigned to TL</option>
              <option value="ASSIGNED_STAFF">Delegated to Staff</option>
            </select>
          </div>
        </div>

        {/* Bulk action toolbar if selected */}
        {selectedLeadIds.length > 0 && (
          <div className="flex items-center justify-between p-2.5 bg-blue-950/40 border border-blue-900/50 rounded-xl text-xs text-blue-200">
            <span>{selectedLeadIds.length} lead(s) selected</span>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Selected
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Leads Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {filteredLeads.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs space-y-3">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-semibold text-slate-400">No client leads found matching the filters.</p>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500"
            >
              <Plus className="w-3.5 h-3.5" />
              Register New Lead
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 uppercase text-[10px] font-semibold text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <button type="button" onClick={toggleSelectAll} className="text-slate-400 hover:text-white">
                      {selectedLeadIds.length === paginatedLeads.length && paginatedLeads.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-blue-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Services Required</th>
                  <th className="px-4 py-3">Budget (INR)</th>
                  <th className="px-4 py-3">Assigned (TL & Staff)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Channel / Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {paginatedLeads.map((lead) => {
                  const isSelected = selectedLeadIds.includes(lead.id);

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => toggleSelectLead(lead.id)}
                          className="text-slate-400 hover:text-white"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{lead.clientName}</div>
                        {lead.notes && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{lead.notes}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-200">{lead.email || '—'}</div>
                        <div className="text-[10px] text-slate-400">{lead.phone || '—'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {lead.servicesRequired?.map((srv) => (
                            <span
                              key={srv}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20"
                            >
                              {PROFESSION_LABELS[srv]}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-400 whitespace-nowrap">
                        {formatINR(lead.budget)}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const tlUser = users.find((u) => u.id === lead.assignedTeamLeadId);
                          const employeeIds = lead.assignedEmployeeIds || [];
                          const employeeUsers = users.filter((u) => employeeIds.includes(u.id));
                          const assignedTeam = teams.find((t) => t.id === lead.assignedTeamId);

                          const legacyPeople = users.filter((u) => (lead.assignedTo || []).includes(u.id));

                          if (!tlUser && employeeUsers.length === 0 && legacyPeople.length === 0) {
                            return (
                              <button
                                type="button"
                                onClick={() => openAssign(lead)}
                                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 hover:border-blue-500/40 transition-colors"
                              >
                                <UserPlus className="w-3 h-3" />
                                Assign TL & Staff
                              </button>
                            );
                          }

                          return (
                            <div
                              className="space-y-1 cursor-pointer group"
                              onClick={() => openAssign(lead)}
                              title="Click to modify hierarchy assignment (Admin -> TL -> Employees)"
                            >
                              {tlUser ? (
                                <div className="flex items-center gap-1 text-[10px]">
                                  <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-semibold">
                                    <UserCheck className="w-2.5 h-2.5" />
                                    TL: {tlUser.name}
                                  </span>
                                  {assignedTeam && (
                                    <span className="text-[9px] text-slate-500 truncate max-w-[85px]">
                                      ({assignedTeam.teamName})
                                    </span>
                                  )}
                                </div>
                              ) : null}

                              {employeeUsers.length > 0 ? (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {employeeUsers.slice(0, 2).map((u) => (
                                    <span
                                      key={u.id}
                                      className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/25"
                                      title={u.email}
                                    >
                                      {u.name}
                                    </span>
                                  ))}
                                  {employeeUsers.length > 2 && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-400">
                                      +{employeeUsers.length - 2} more
                                    </span>
                                  )}
                                </div>
                              ) : !tlUser && legacyPeople.length > 0 ? (
                                <div className="flex items-center gap-1 flex-wrap">
                                  {legacyPeople.map((u) => (
                                    <span
                                      key={u.id}
                                      className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700"
                                      title={u.email}
                                    >
                                      {u.name}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[10px] text-amber-400/70 italic flex items-center gap-1">
                                  <span>Pending employee delegation</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={lead.status}
                          onChange={(e) => handleQuickStatusChange(lead, e.target.value as LeadStatus)}
                          className={`text-[10px] font-semibold rounded-lg px-2 py-1 bg-slate-950 border focus:outline-none ${
                            lead.status === 'NEW'
                              ? 'text-sky-400 border-sky-500/30'
                              : lead.status === 'QUALIFIED'
                              ? 'text-purple-400 border-purple-500/30'
                              : lead.status === 'IN_PROGRESS'
                              ? 'text-amber-400 border-amber-500/30'
                              : lead.status === 'COMPLETED'
                              ? 'text-emerald-400 border-emerald-500/30'
                              : 'text-slate-400 border-slate-700'
                          }`}
                        >
                          <option value="NEW">NEW</option>
                          <option value="QUALIFIED">QUALIFIED</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CLOSED">CLOSED</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-300">{lead.sourceChannel || 'Direct'}</div>
                        <div className="text-[10px] text-slate-500">{lead.date || lead.createdAt?.slice(0, 10)}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(lead)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                            title="Edit Lead"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteLead(lead)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                              title="Delete Lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        {/* Pagination bar */}
        <div className="p-3.5 bg-slate-950/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Showing {paginatedLeads.length} of {filteredLeads.length} leads</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-slate-300"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30 hover:bg-slate-800 text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-30 hover:bg-slate-800 text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h2 className="text-base font-bold text-white">
                {editingLead ? 'Edit Client Lead' : 'Register New Client Lead'}
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

            <form onSubmit={handleSaveLead} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Client / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Apex Global Technologies"
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@apex.com"
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Project Budget (INR ₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={budget}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                    Preview: {formatINR(budget)}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Inquiry Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Source Channel</label>
                  <input
                    type="text"
                    value={sourceChannel}
                    onChange={(e) => setSourceChannel(e.target.value)}
                    placeholder="Website, Referral, LinkedIn..."
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Pipeline Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as LeadStatus)}
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="NEW">NEW</option>
                    <option value="QUALIFIED">QUALIFIED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>

              {/* Services Required Multi-select checkboxes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Services Required *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ALL_PROFESSIONS.map((p) => {
                    const checked = servicesRequired.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => toggleService(p)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs transition-all ${
                          checked
                            ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        {checked ? (
                          <CheckSquare className="w-4 h-4 text-blue-400 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className="font-medium">{PROFESSION_LABELS[p]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Project Notes / Scope</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Key deliverables, client timeline, design references..."
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
                  {editingLead ? 'Update Lead' : 'Create Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hierarchical Lead Assignment Modal (Admin -> TL -> Employees) */}
      {assignModalLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
                    Hierarchical Delegation Workflow
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {formatINR(assignModalLead.budget)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Assign Lead: {assignModalLead.clientName}</span>
                </h3>
                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                  <span>Contact: {assignModalLead.email || assignModalLead.phone || 'No direct contact'}</span>
                  <span>•</span>
                  <span>Channel: {assignModalLead.sourceChannel || 'Direct'}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalLead(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Workflow Visual Hierarchy Bar */}
            <div className="bg-slate-950/70 border-b border-slate-800/80 px-5 py-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-[10px]">
                    1
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Initiator</div>
                    <div className="font-semibold text-white">Admin ({profile?.name || 'Super Admin'})</div>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-600" />

                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-[10px]">
                    2
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Team Lead</div>
                    <div className="font-semibold text-amber-300">
                      {users.find((u) => u.id === assignTeamLeadId)?.name || 'Select TL below'}
                    </div>
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-600" />

                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-[10px]">
                    3
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Assigned Employees</div>
                    <div className="font-semibold text-emerald-300">
                      {assignEmployeeIds.length} Staff Selected
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* Step 1: Team & Team Lead Assignment */}
              <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Step 1: Assign to Operational Team & Team Lead (TL)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Select Team */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Assigned Department / Team
                    </label>
                    <select
                      value={assignTeamId}
                      onChange={(e) => {
                        const newTeamId = e.target.value;
                        setAssignTeamId(newTeamId);
                        const matchedTeam = teams.find((t) => t.id === newTeamId);
                        if (matchedTeam && matchedTeam.teamLeadId) {
                          setAssignTeamLeadId(matchedTeam.teamLeadId);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Select Team --</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.teamName} ({PROFESSION_LABELS[t.profession]})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Team Lead */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Designated Team Lead (TL) *
                    </label>
                    <select
                      value={assignTeamLeadId}
                      onChange={(e) => setAssignTeamLeadId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">-- Select Team Lead --</option>
                      {users
                        .filter((u) => u.role === 'TEAM_LEAD')
                        .map((tl) => {
                          const tlTeam = teams.find((t) => t.teamLeadId === tl.id || t.id === tl.teamId);
                          return (
                            <option key={tl.id} value={tl.id}>
                              {tl.name} ({tlTeam ? tlTeam.teamName : PROFESSION_LABELS[tl.profession]})
                            </option>
                          );
                        })}
                    </select>
                  </div>
                </div>

                {assignTeamLeadId && (
                  <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <UserCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Team Lead <strong>{users.find((u) => u.id === assignTeamLeadId)?.name}</strong> will receive supervisory ownership and can delegate further to squad employees.
                    </span>
                  </div>
                )}
              </div>

              {/* Step 2: Employee Delegation */}
              <div className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Step 2: Delegate to Selected Employees
                    </h4>
                  </div>

                  {/* Filter and selection helpers */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
                      <button
                        type="button"
                        onClick={() => setStaffFilterMode('TEAM_ONLY')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          staffFilterMode === 'TEAM_ONLY'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Team Members
                      </button>
                      <button
                        type="button"
                        onClick={() => setStaffFilterMode('ALL_STAFF')}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          staffFilterMode === 'ALL_STAFF'
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        All Employees
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const available = users.filter((u) => {
                          if (u.role !== 'EMPLOYEE') return false;
                          if (staffFilterMode === 'TEAM_ONLY' && assignTeamId) {
                            return u.teamId === assignTeamId;
                          }
                          return true;
                        });
                        const allIds = available.map((u) => u.id);
                        const isAllSelected = allIds.every((id) => assignEmployeeIds.includes(id));
                        if (isAllSelected) {
                          setAssignEmployeeIds((prev) => prev.filter((id) => !allIds.includes(id)));
                        } else {
                          setAssignEmployeeIds((prev) => Array.from(new Set([...prev, ...allIds])));
                        }
                      }}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20"
                    >
                      Toggle All
                    </button>
                  </div>
                </div>

                {/* Employees List */}
                {(() => {
                  const candidateEmployees = users.filter((u) => {
                    if (u.role !== 'EMPLOYEE') return false;
                    if (staffFilterMode === 'TEAM_ONLY' && assignTeamId) {
                      return u.teamId === assignTeamId;
                    }
                    return true;
                  });

                  if (candidateEmployees.length === 0) {
                    return (
                      <div className="p-6 text-center text-slate-500 text-xs bg-slate-900/50 rounded-xl border border-slate-800">
                        {staffFilterMode === 'TEAM_ONLY' && assignTeamId
                          ? 'No employees mapped to this specific team yet. Switch to "All Employees" to select cross-team staff.'
                          : 'No employees found in the directory.'}
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                      {candidateEmployees.map((emp) => {
                        const isSelected = assignEmployeeIds.includes(emp.id);
                        const empTeam = teams.find((t) => t.id === emp.teamId);

                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => {
                              setAssignEmployeeIds((prev) =>
                                prev.includes(emp.id)
                                  ? prev.filter((id) => id !== emp.id)
                                  : [...prev, emp.id]
                              );
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all ${
                              isSelected
                                ? 'bg-blue-600/20 border-blue-500/80 text-blue-100 shadow-sm'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isSelected
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {emp.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold truncate">{emp.name}</div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {empTeam ? empTeam.teamName : PROFESSION_LABELS[emp.profession]}
                                </div>
                              </div>
                            </div>

                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-400 shrink-0 ml-2" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600 shrink-0 ml-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Step 3: Admin & TL Briefing Instructions */}
              <div className="space-y-2 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
                <label className="block text-xs font-bold text-white uppercase tracking-wider">
                  Step 3: Briefing & Special Instructions (TL & Employees)
                </label>
                <textarea
                  rows={2}
                  value={assignTlNotes}
                  onChange={(e) => setAssignTlNotes(e.target.value)}
                  placeholder="e.g., Client requested priority kickoff call. TL please coordinate architecture review with Alex and provide timeline estimate in INR..."
                  className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-950/60">
              <div className="text-xs text-slate-400">
                <span>Selected: </span>
                <span className="font-semibold text-amber-300">
                  {users.find((u) => u.id === assignTeamLeadId)?.name || 'No TL'}
                </span>
                <span> • </span>
                <span className="font-semibold text-emerald-300">
                  {assignEmployeeIds.length} employee(s)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssignModalLead(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignment}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/20 cursor-pointer flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Save & Deploy Hierarchy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
