import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { LoginView } from './components/auth/LoginView';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { LeadManagement } from './components/admin/LeadManagement';
import { UserManagement } from './components/admin/UserManagement';
import { TeamManagement } from './components/admin/TeamManagement';
import { ProjectsCenter } from './components/projects/ProjectsCenter';
import { TeamLeadPanel } from './components/teamlead/TeamLeadPanel';
import { EmployeePanel } from './components/employee/EmployeePanel';
import { DiscussionsCenter } from './components/discussions/DiscussionsCenter';
import { AuditLogViewer } from './components/admin/AuditLogViewer';
import {
  Lead,
  UserProfile,
  Team,
  Project,
  AuditLog,
} from './types';
import { db } from './lib/firebase';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

type NavTab =
  | 'dashboard'
  | 'leads'
  | 'teams'
  | 'users'
  | 'projects'
  | 'teamlead'
  | 'employee'
  | 'discussions'
  | 'audit';

function MainAppContent() {
  const { user, profile, role, loading, isAdmin, isTeamLead } = useAuth();
  const { info } = useToast();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Collections state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);

  // Trigger modals from dashboard or navbar
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);

  // Firestore Real-time Subscriptions
  useEffect(() => {
    if (!user && !profile) return;

    // Leads subscription — scoped by role. Admins see everything; a team
    // lead sees only their own team's leads; an employee sees only leads
    // they've been individually assigned to. Firestore's security rules
    // enforce this same scoping server-side, so these queries must match
    // the rule's where-clause exactly or the read will be denied outright.
    const leadsQuery = isAdmin
      ? collection(db, 'leads')
      : role === 'TEAM_LEAD'
      ? query(collection(db, 'leads'), where('assignedTeamId', '==', profile?.teamId || '__none__'))
      : query(collection(db, 'leads'), where('assignedEmployeeIds', 'array-contains', profile?.id || '__none__'));

    const unsubLeads = onSnapshot(
      leadsQuery,
      (snap) => {
        const items: Lead[] = [];
        const seen = new Set<string>();
        snap.forEach((d) => {
          const data = d.data() as Lead;
          const canonicalId = data.id || d.id;
          if (!seen.has(canonicalId)) {
            seen.add(canonicalId);
            items.push({ ...data, id: canonicalId });
          }
        });
        setLeads(items);
      },
      (err) => console.warn('Leads snapshot error', err)
    );

    // Users subscription - deduplicate by unique user ID and email
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const items: UserProfile[] = [];
        const seenIds = new Set<string>();
        const seenEmails = new Set<string>();

        snap.forEach((d) => {
          const data = d.data() as UserProfile;
          const canonicalId = data.id || d.id;
          const emailLower = (data.email || '').toLowerCase().trim();

          // Skip if already tracked by ID or Email
          if (seenIds.has(canonicalId)) return;
          if (emailLower && seenEmails.has(emailLower)) return;

          seenIds.add(canonicalId);
          if (emailLower) seenEmails.add(emailLower);
          items.push({ ...data, id: canonicalId });
        });

        setUsersList(items);
      },
      (err) => console.warn('Users snapshot error', err)
    );

    // Teams subscription
    const unsubTeams = onSnapshot(
      collection(db, 'teams'),
      (snap) => {
        const items: Team[] = [];
        const seen = new Set<string>();
        snap.forEach((d) => {
          const data = d.data() as Team;
          const canonicalId = data.id || d.id;
          if (!seen.has(canonicalId)) {
            seen.add(canonicalId);
            items.push({ ...data, id: canonicalId });
          }
        });
        setTeams(items);
      },
      (err) => console.warn('Teams snapshot error', err)
    );

    // Projects subscription — same role scoping as leads, matched to
    // assignedTeamId / assignedEmployees so the query stays provably
    // compatible with the Firestore security rules.
    const projectsQuery = isAdmin
      ? collection(db, 'projects')
      : role === 'TEAM_LEAD'
      ? query(collection(db, 'projects'), where('assignedTeamId', '==', profile?.teamId || '__none__'))
      : query(collection(db, 'projects'), where('assignedEmployees', 'array-contains', profile?.id || '__none__'));

    const unsubProjects = onSnapshot(
      projectsQuery,
      (snap) => {
        const items: Project[] = [];
        const seen = new Set<string>();
        snap.forEach((d) => {
          const data = d.data() as Project;
          const canonicalId = data.id || d.id;
          if (!seen.has(canonicalId)) {
            seen.add(canonicalId);
            items.push({ ...data, id: canonicalId });
          }
        });
        setProjects(items);
      },
      (err) => console.warn('Projects snapshot error', err)
    );

    // Audits subscription (admin only per firestore.rules)
    let unsubAudits = () => {};
    if (isAdmin) {
      const auditsQuery = query(
        collection(db, 'audits'),
        orderBy('timestamp', 'desc'),
        limit(100)
      );
      unsubAudits = onSnapshot(
        auditsQuery,
        (snap) => {
          const items: AuditLog[] = [];
          const seen = new Set<string>();
          snap.forEach((d) => {
            const id = d.id;
            if (!seen.has(id)) {
              seen.add(id);
              items.push({ id, ...(d.data() as any) } as AuditLog);
            }
          });
          setAudits(items);
        },
        (err) => console.warn('Audits snapshot error', err)
      );
    }

    return () => {
      unsubLeads();
      unsubUsers();
      unsubTeams();
      unsubProjects();
      unsubAudits();
    };
  }, [user, profile, role, isAdmin]);

  // Adjust default landing tab based on role or simulated role
  useEffect(() => {
    if (role === 'EMPLOYEE') {
      setActiveTab('employee');
    } else if (role === 'TEAM_LEAD') {
      setActiveTab('teamlead');
    } else {
      setActiveTab('dashboard');
    }
  }, [role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Initializing StudioAdsPro Enterprise CRM...
        </p>
      </div>
    );
  }

  if (!user && !profile) {
    return <LoginView />;
  }

  const counts = {
    leads: leads.length,
    projects: projects.length,
    teams: teams.length,
    discussions: 0,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        searchTerm={globalSearch}
        onSearchChange={setGlobalSearch}
        onOpenCreateLead={() => {
          setActiveTab('leads');
          setLeadModalOpen(true);
        }}
        onOpenCreateProject={() => {
          setActiveTab('projects');
          setProjectModalOpen(true);
        }}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      {/* Body Layout: Sidebar + Main Stage */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab as NavTab)}
          counts={counts}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Dynamic Workspace Container */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeTab === 'dashboard' && (
              <AdminDashboard
                leads={leads}
                projects={projects}
                users={usersList}
                teams={teams}
                audits={audits}
                onNavigate={(tab) => setActiveTab(tab)}
                onOpenCreateLead={() => {
                  setActiveTab('leads');
                  setLeadModalOpen(true);
                }}
                onOpenCreateUser={() => {
                  setActiveTab('users');
                  setUserModalOpen(true);
                }}
                onOpenCreateTeam={() => {
                  setActiveTab('teams');
                  setTeamModalOpen(true);
                }}
                onOpenCreateProject={() => {
                  setActiveTab('projects');
                  setProjectModalOpen(true);
                }}
              />
            )}

            {activeTab === 'leads' && (
              <LeadManagement
                leads={leads}
                users={usersList}
                teams={teams}
                searchTerm={globalSearch}
                initialCreateOpen={leadModalOpen}
                onCloseCreateModal={() => setLeadModalOpen(false)}
              />
            )}

            {activeTab === 'teams' && (
              <TeamManagement
                teams={teams}
                users={usersList}
                projects={projects}
                initialCreateOpen={teamModalOpen}
                onCloseCreateModal={() => setTeamModalOpen(false)}
              />
            )}

            {activeTab === 'users' && (
              <UserManagement
                users={usersList}
                teams={teams}
                initialCreateOpen={userModalOpen}
                onCloseCreateModal={() => setUserModalOpen(false)}
              />
            )}

            {activeTab === 'projects' && (
              <ProjectsCenter
                projects={projects}
                teams={teams}
                users={usersList}
                leads={leads}
                initialCreateOpen={projectModalOpen}
                onCloseCreateModal={() => setProjectModalOpen(false)}
              />
            )}

            {activeTab === 'teamlead' && (
              <TeamLeadPanel
                teams={teams}
                users={usersList}
                projects={projects}
                leads={leads}
              />
            )}

            {activeTab === 'employee' && (
              <EmployeePanel
                projects={projects}
                teams={teams}
                users={usersList}
                leads={leads}
              />
            )}

            {activeTab === 'discussions' && (
              <DiscussionsCenter
                teams={teams}
                projects={projects}
                users={usersList}
              />
            )}

            {activeTab === 'audit' && <AuditLogViewer audits={audits} />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
