import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Building2,
  Bell,
  Search,
  LogOut,
  User,
  Shield,
  Briefcase,
  ChevronDown,
  Check,
  Eye,
  RotateCcw,
  Database,
} from 'lucide-react';
import { UserRole, UserStatus } from '../../types';

interface NavbarProps {
  onSearch?: (term: string) => void;
  onSearchChange?: (term: string) => void;
  searchTerm?: string;
  pendingInvitesCount?: number;
  onOpenInvites?: () => void;
  onOpenCreateLead?: () => void;
  onOpenCreateProject?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearch,
  onSearchChange,
  searchTerm = '',
  pendingInvitesCount = 0,
  onOpenInvites,
}) => {
  const {
    profile,
    role,
    logOut,
    updateProfileData,
    switchRoleSimulation,
    simulatedRole,
    triggerDataSeed,
  } = useAuth();
  const { success, info } = useToast();
  const [seeding, setSeeding] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      await triggerDataSeed();
      success('Sample CRM dataset loaded successfully!');
      setMenuOpen(false);
    } catch (e: any) {
      info(e.message || 'Seed completed.');
    } finally {
      setSeeding(false);
    }
  };

  const handleStatusChange = async (newStatus: UserStatus) => {
    await updateProfileData({ status: newStatus });
    success(`Status updated to ${newStatus}`);
    setMenuOpen(false);
  };

  const handleSearchInput = (val: string) => {
    onSearch?.(val);
    onSearchChange?.(val);
  };

  const handleRoleSimulation = (newRole: UserRole | null) => {
    switchRoleSimulation(newRole);
    if (newRole) {
      success(`Switched role perspective to ${newRole}`);
    } else {
      success('Restored native account role');
    }
    setRoleSwitcherOpen(false);
  };

  const getRoleBadge = () => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Shield className="w-3 h-3" />
            ADMIN
          </span>
        );
      case 'TEAM_LEAD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Briefcase className="w-3 h-3" />
            TEAM LEAD
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <User className="w-3 h-3" />
            EMPLOYEE
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 lg:px-8">
      {/* Brand & Search */}
      <div className="flex items-center gap-6 flex-1 max-w-xl">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-600/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight text-base">StudioAdsPro</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
              CRM
            </span>
          </div>
        </div>

        {/* Global Search */}
        <div className="relative flex-1 hidden md:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search leads, projects, or team members..."
            value={searchTerm}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="w-full bg-slate-950/60 border border-slate-800 text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/40 transition-all"
          />
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Role perspective switcher (great for testing all 3 roles without login issues) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              simulatedRole
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700/80'
            }`}
            title="Switch role view perspective"
          >
            <Eye className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden sm:inline text-[11px] text-slate-400 font-normal">View As:</span>
            <span>{role}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {roleSwitcherOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-1.5 border-b border-slate-800 mb-1">
                <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                  Test Role Perspectives
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Simulate access tiers for testing
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRoleSimulation('ADMIN')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  role === 'ADMIN' && simulatedRole === 'ADMIN'
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-rose-400" />
                  <span>Admin View</span>
                </div>
                {role === 'ADMIN' && <Check className="w-3.5 h-3.5 text-rose-400" />}
              </button>

              <button
                type="button"
                onClick={() => handleRoleSimulation('TEAM_LEAD')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  role === 'TEAM_LEAD'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-amber-400" />
                  <span>Team Lead View</span>
                </div>
                {role === 'TEAM_LEAD' && <Check className="w-3.5 h-3.5 text-amber-400" />}
              </button>

              <button
                type="button"
                onClick={() => handleRoleSimulation('EMPLOYEE')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  role === 'EMPLOYEE'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span>Employee View</span>
                </div>
                {role === 'EMPLOYEE' && <Check className="w-3.5 h-3.5 text-blue-400" />}
              </button>

              {simulatedRole && (
                <div className="pt-1.5 border-t border-slate-800 mt-1">
                  <button
                    type="button"
                    onClick={() => handleRoleSimulation(null)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-400" />
                    Reset to native profile
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Real role badge */}
        <div className="hidden sm:block">{getRoleBadge()}</div>

        {/* Notifications / Invites */}
        <button
          type="button"
          onClick={onOpenInvites}
          className="relative p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          title="Group Invitations & Notifications"
        >
          <Bell className="w-5 h-5" />
          {pendingInvitesCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {pendingInvitesCount}
            </span>
          )}
        </button>

        {/* User profile dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-slate-800 border border-transparent hover:border-slate-700 transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-950 text-blue-300 font-bold border border-blue-800/80 flex items-center justify-center text-xs">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-white truncate max-w-[120px]">
                {profile?.name || 'Studio Member'}
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {profile?.status || 'ACTIVE'}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2.5 border-b border-slate-800 mb-1">
                <div className="text-sm font-semibold text-white truncate">{profile?.name}</div>
                <div className="text-xs text-slate-400 truncate">{profile?.email}</div>
                <div className="text-[10px] text-blue-400 mt-1 uppercase font-medium">
                  {profile?.employmentType} • {profile?.profession?.replace(/_/g, ' ')}
                </div>
              </div>

              {/* Status toggle */}
              <div className="px-2 py-1.5">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1.5">
                  Availability Status
                </span>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => handleStatusChange('ACTIVE')}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      profile?.status === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {profile?.status === 'ACTIVE' && <Check className="w-3 h-3" />}
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('ON_LEAVE')}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      profile?.status === 'ON_LEAVE'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {profile?.status === 'ON_LEAVE' && <Check className="w-3 h-3" />}
                    On Leave
                  </button>
                </div>
              </div>

              <div className="border-t border-slate-800 my-1.5" />

              <button
                type="button"
                onClick={handleSeedData}
                disabled={seeding}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Database className="w-4 h-4" />
                <span>{seeding ? 'Seeding CRM Data...' : 'Seed / Top-Up Sample Data'}</span>
              </button>

              <button
                type="button"
                onClick={logOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
