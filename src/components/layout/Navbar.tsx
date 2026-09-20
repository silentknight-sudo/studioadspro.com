import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Bell,
  Search,
  LogOut,
  User,
  Shield,
  Briefcase,
  ChevronDown,
  Check,
  Menu,
} from 'lucide-react';
import { UserStatus } from '../../types';

interface NavbarProps {
  onSearch?: (term: string) => void;
  onSearchChange?: (term: string) => void;
  searchTerm?: string;
  pendingInvitesCount?: number;
  onOpenInvites?: () => void;
  onOpenCreateLead?: () => void;
  onOpenCreateProject?: () => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearch,
  onSearchChange,
  searchTerm = '',
  pendingInvitesCount = 0,
  onOpenInvites,
  onOpenCreateLead,
  onOpenCreateProject,
  onToggleSidebar,
}) => {
  const { profile, role, logOut, updateProfileData } = useAuth();
  const { success } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleStatusChange = async (newStatus: UserStatus) => {
    await updateProfileData({ status: newStatus });
    success(`Status updated to ${newStatus}`);
    setMenuOpen(false);
  };

  const handleSearchInput = (val: string) => {
    onSearch?.(val);
    onSearchChange?.(val);
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
    <header className="sticky top-0 z-30 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-3 sm:px-4 lg:px-8 gap-2">
      {/* Brand & Search */}
      <div className="flex items-center gap-2 sm:gap-6 flex-1 min-w-0 max-w-xl">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden p-2 -ml-1 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-950 border border-slate-700/60 flex items-center justify-center shadow-md shadow-blue-900/20 p-1">
            <img
              src="/studioadspro-logo.png"
              alt="StudioAdsPro Logo"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback to online URL if needed
                (e.currentTarget as HTMLImageElement).src = 'https://www.studioadspro.com/favicon-512x512.png';
              }}
            />
          </div>
          <div>
            <span className="font-bold text-white tracking-tight text-base">StudioAdsPro</span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-semibold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800/40">
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
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Actions: + Lead & + Project */}
        {onOpenCreateLead && (
          <button
            type="button"
            id="navbar-create-lead-btn"
            onClick={onOpenCreateLead}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <span>+ Lead</span>
          </button>
        )}

        {onOpenCreateProject && (
          <button
            type="button"
            id="navbar-create-project-btn"
            onClick={onOpenCreateProject}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
          >
            <span>+ Project</span>
          </button>
        )}

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
                id="navbar-signout-btn"
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
