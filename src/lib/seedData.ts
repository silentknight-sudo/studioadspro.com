import { doc, setDoc, getDocs, collection, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, Team, Lead, Project, Discussion } from '../types';

export async function cleanupDuplicateUsers(): Promise<void> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const seenIds = new Set<string>();
    const seenEmails = new Set<string>();

    for (const docSnap of snap.docs) {
      const data = docSnap.data() as UserProfile;
      const canonicalId = data.id || docSnap.id;
      const emailLower = (data.email || '').toLowerCase().trim();

      // If document was an alias/cleanEmailKey index where doc ID is not the actual canonical user.id
      if (data.id && docSnap.id !== data.id) {
        await deleteDoc(doc(db, 'users', docSnap.id));
        continue;
      }

      if (seenIds.has(canonicalId) || (emailLower && seenEmails.has(emailLower))) {
        await deleteDoc(doc(db, 'users', docSnap.id));
      } else {
        seenIds.add(canonicalId);
        if (emailLower) seenEmails.add(emailLower);
      }
    }
  } catch (err) {
    console.warn('Duplicate user cleanup warning:', err);
  }
}

export async function seedInitialDatabaseIfEmpty(): Promise<boolean> {
  try {
    await cleanupDuplicateUsers();

    const leadsSnap = await getDocs(collection(db, 'leads'));
    if (!leadsSnap.empty) {
      // Database already has content
      return false;
    }

    await forceSeedDatabase();
    return true;
  } catch (err) {
    console.error('Auto seed check error:', err);
    return false;
  }
}

export async function forceSeedDatabase(): Promise<void> {
  // 1. SEED USERS
  const seedUsers: (UserProfile & { password?: string })[] = [
    {
      id: 'admin-sap-primary',
      email: 'admin@sap.com',
      password: 'Pass@SAP.com',
      name: 'SAP Executive Director',
      role: 'ADMIN',
      profession: 'WEBSITE',
      employmentType: 'FULL_TIME',
      createdBy: 'SYSTEM',
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'ACTIVE',
      phone: '+1 (555) 010-9901',
    },
    {
      id: 'admin-sap-secondary',
      email: 'admin@sap1.com',
      password: 'Pass@SAP1.com',
      name: 'SAP Operations Admin',
      role: 'ADMIN',
      profession: 'MARKETING',
      employmentType: 'FULL_TIME',
      createdBy: 'SYSTEM',
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'ACTIVE',
      phone: '+1 (555) 010-9902',
    },
    {
      id: 'lead-squad-web',
      email: 'lead@sap.com',
      password: 'password123',
      name: 'Sarah Chen',
      role: 'TEAM_LEAD',
      profession: 'WEBSITE',
      teamId: 'team-web',
      employmentType: 'FULL_TIME',
      createdBy: 'SYSTEM',
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'ACTIVE',
      phone: '+1 (555) 010-4421',
    },
    {
      id: 'lead-squad-mobile',
      email: 'lead_mobile@sap.com',
      password: 'password123',
      name: 'Marcus Vance',
      role: 'TEAM_LEAD',
      profession: 'MOBILE_APP',
      teamId: 'team-mobile',
      employmentType: 'FULL_TIME',
      createdBy: 'SYSTEM',
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'ACTIVE',
      phone: '+1 (555) 010-5532',
    },
    {
      id: 'emp-dev-alex',
      email: 'employee@sap.com',
      password: 'password123',
      name: 'Alex Rivera',
      role: 'EMPLOYEE',
      profession: 'MOBILE_APP',
      teamId: 'team-mobile',
      reportsTo: 'lead-squad-mobile',
      employmentType: 'FULL_TIME',
      createdBy: 'SYSTEM',
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'ACTIVE',
      phone: '+1 (555) 010-8812',
    },
    {
      id: 'emp-dev-emma',
      email: 'emma@sap.com',
      password: 'password123',
      name: 'Emma Watson',
      role: 'EMPLOYEE',
      profession: 'WEBSITE',
      teamId: 'team-web',
      reportsTo: 'lead-squad-web',
      employmentType: 'FULL_TIME',
      createdBy: 'SYSTEM',
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'ACTIVE',
      phone: '+1 (555) 010-7714',
    },
    {
      id: 'emp-mkt-david',
      email: 'david@sap.com',
      password: 'password123',
      name: 'David Kim',
      role: 'EMPLOYEE',
      profession: 'MARKETING',
      teamId: 'team-marketing',
      reportsTo: 'admin-sap-secondary',
      employmentType: 'FREELANCER',
      createdBy: 'SYSTEM',
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'ACTIVE',
      phone: '+1 (555) 010-6619',
    },
    {
      id: 'owner-sid',
      email: 'playsidgaming@gmail.com',
      password: 'admin123',
      name: 'Owner Administrator',
      role: 'ADMIN',
      profession: 'WEBSITE',
      employmentType: 'FULL_TIME',
      createdBy: 'SYSTEM',
      createdAt: '2026-01-01T00:00:00.000Z',
      status: 'ACTIVE',
      phone: '+1 (555) 010-0000',
    },
  ];

  for (const user of seedUsers) {
    await setDoc(doc(db, 'users', user.id), user, { merge: true });
    // Remove any legacy duplicate document indexed under cleanEmailKey
    const cleanEmailKey = user.email.toLowerCase().replace(/[^a-zA-Z0-9]/g, '_');
    if (cleanEmailKey !== user.id) {
      try {
        await deleteDoc(doc(db, 'users', cleanEmailKey));
      } catch {}
    }
  }

  // 2. SEED TEAMS
  const seedTeams: Team[] = [
    {
      id: 'team-web',
      teamName: 'Website & Web Apps Squad',
      profession: 'WEBSITE',
      teamLeadId: 'lead-squad-web',
      members: ['lead-squad-web', 'emp-dev-emma'],
      createdAt: new Date().toISOString(),
      description: 'Full-stack web architecture, client portals, React/TypeScript and enterprise dashboards.',
      status: 'ACTIVE',
    },
    {
      id: 'team-mobile',
      teamName: 'Mobile Apps Engineering',
      profession: 'MOBILE_APP',
      teamLeadId: 'lead-squad-mobile',
      members: ['lead-squad-mobile', 'emp-dev-alex'],
      createdAt: new Date().toISOString(),
      description: 'iOS Swift and Android Flutter applications with secure cloud backend integrations.',
      status: 'ACTIVE',
    },
    {
      id: 'team-marketing',
      teamName: 'Performance Marketing & Ads',
      profession: 'MARKETING',
      teamLeadId: 'admin-sap-secondary',
      members: ['admin-sap-secondary', 'emp-mkt-david'],
      createdAt: new Date().toISOString(),
      description: 'Omni-channel PPC, Google Ads, Meta growth funnels, and programmatic advertising.',
      status: 'ACTIVE',
    },
    {
      id: 'team-social',
      teamName: 'Social Media & Content Squad',
      profession: 'SOCIAL_MEDIA_HANDLING',
      teamLeadId: 'lead-squad-web',
      members: ['lead-squad-web', 'emp-dev-emma'],
      createdAt: new Date().toISOString(),
      description: 'Brand voice, editorial schedules, viral community engagement and influencer management.',
      status: 'ACTIVE',
    },
    {
      id: 'team-video',
      teamName: 'Studio Video & Motion Graphics',
      profession: 'VIDEO_SHOOT_EDIT',
      teamLeadId: 'admin-sap-primary',
      members: ['admin-sap-primary', 'emp-dev-alex'],
      createdAt: new Date().toISOString(),
      description: 'Commercial 4K video capture, Davinci color grading, VFX and promotional reels.',
      status: 'ACTIVE',
    },
  ];

  for (const team of seedTeams) {
    await setDoc(doc(db, 'teams', team.id), team, { merge: true });
  }

  // 3. SEED LEADS (INR Pricing & TL-to-Employee Assignment)
  const seedLeads: Lead[] = [
    {
      id: 'lead-apex',
      clientName: 'Apex Global Logistics',
      email: 'contracts@apexlogistics.com',
      phone: '+91 98200 12345',
      budget: 450000, // ₹4,50,000
      date: '2026-09-15',
      servicesRequired: ['WEBSITE', 'MARKETING'],
      assignedTeamId: 'team-web',
      assignedTeamLeadId: 'lead-squad-web',
      assignedEmployeeIds: ['emp-dev-emma'],
      assignedTo: ['team-web', 'lead-squad-web', 'emp-dev-emma'],
      delegatedBy: 'lead@sap.com',
      delegatedAt: '2026-09-15T11:00:00.000Z',
      tlNotes: 'Emma, prioritize mobile responsive views and cross-browser testing.',
      status: 'IN_PROGRESS',
      notes: 'Complete redesign and optimization of freight management booking portal.',
      createdAt: '2026-09-10T10:00:00.000Z',
      createdBy: 'admin@sap.com',
      lastModified: '2026-09-15T14:30:00.000Z',
      sourceChannel: 'Inbound Corporate RFP',
    },
    {
      id: 'lead-novapay',
      clientName: 'NovaPay Financial Services',
      email: 'product@novapay.io',
      phone: '+91 98450 54321',
      budget: 750000, // ₹7,50,000
      date: '2026-09-12',
      servicesRequired: ['MOBILE_APP'],
      assignedTeamId: 'team-mobile',
      assignedTeamLeadId: 'lead-squad-mobile',
      assignedEmployeeIds: ['emp-dev-alex'],
      assignedTo: ['team-mobile', 'lead-squad-mobile', 'emp-dev-alex'],
      delegatedBy: 'lead_mobile@sap.com',
      delegatedAt: '2026-09-12T10:30:00.000Z',
      tlNotes: 'Alex, build prototype for secure biometric authentication module first.',
      status: 'QUALIFIED',
      notes: 'Biometric micro-lending wallet mobile app for iOS & Android.',
      createdAt: '2026-09-08T09:15:00.000Z',
      createdBy: 'admin@sap.com',
      lastModified: '2026-09-12T11:20:00.000Z',
      sourceChannel: 'Executive Referral',
    },
    {
      id: 'lead-summit',
      clientName: 'Summit Healthcare Systems',
      email: 'growth@summithealth.org',
      phone: '+91 97110 87654',
      budget: 220000, // ₹2,20,000
      date: '2026-09-16',
      servicesRequired: ['MARKETING', 'SOCIAL_MEDIA_HANDLING'],
      assignedTeamId: 'team-marketing',
      assignedTeamLeadId: 'admin-sap-secondary',
      assignedEmployeeIds: ['emp-mkt-david'],
      assignedTo: ['team-marketing', 'admin-sap-secondary', 'emp-mkt-david'],
      delegatedBy: 'admin@sap1.com',
      delegatedAt: '2026-09-16T09:00:00.000Z',
      tlNotes: 'David, prepare campaign creatives and ad copy for 12 clinical branches.',
      status: 'NEW',
      notes: 'Regional patient acquisition campaigns across search and social media channels.',
      createdAt: '2026-09-16T08:00:00.000Z',
      createdBy: 'admin@sap1.com',
      lastModified: '2026-09-16T08:00:00.000Z',
      sourceChannel: 'Google Search Ads',
    },
    {
      id: 'lead-lumina',
      clientName: 'Lumina Media Studios',
      email: 'hello@luminastudios.com',
      phone: '+91 99001 24680',
      budget: 350000, // ₹3,50,000
      date: '2026-09-08',
      servicesRequired: ['VIDEO_SHOOT_EDIT'],
      assignedTeamId: 'team-video',
      assignedTeamLeadId: 'admin-sap-primary',
      assignedEmployeeIds: [],
      assignedTo: ['team-video', 'admin-sap-primary'],
      status: 'COMPLETED',
      notes: 'High-production 4K brand launch cinematic reels delivered and published.',
      createdAt: '2026-09-01T12:00:00.000Z',
      createdBy: 'admin@sap.com',
      lastModified: '2026-09-08T16:45:00.000Z',
      sourceChannel: 'Agency Partner',
    },
  ];

  for (const lead of seedLeads) {
    await setDoc(doc(db, 'leads', lead.id), lead, { merge: true });
  }

  // 4. SEED PROJECTS
  const seedProjects: Project[] = [
    {
      id: 'proj-apex',
      projectName: 'Apex Cloud Customer Portal',
      leadId: 'lead-apex',
      assignedTeamId: 'team-web',
      assignedEmployees: ['lead-squad-web', 'emp-dev-emma'],
      profession: 'WEBSITE',
      status: 'IN_PROGRESS',
      startDate: '2026-09-10',
      dueDate: '2026-10-31',
      progress: 65,
      createdAt: '2026-09-10T10:00:00.000Z',
      deliverables: [
        'High-fidelity Figma wireframes',
        'Microservices database schema',
        'OAuth2 Single Sign-On module',
        'Live shipment GPS tracking map',
        'End-to-end integration testing',
      ],
      notes: 'API endpoints for legacy freight tracking completed. Moving to dashboard UI.',
    },
    {
      id: 'proj-novapay',
      projectName: 'NovaPay Mobile Wallet v2.0',
      leadId: 'lead-novapay',
      assignedTeamId: 'team-mobile',
      assignedEmployees: ['lead-squad-mobile', 'emp-dev-alex'],
      profession: 'MOBILE_APP',
      status: 'IN_PROGRESS',
      startDate: '2026-09-01',
      dueDate: '2026-11-15',
      progress: 40,
      createdAt: '2026-09-01T09:00:00.000Z',
      deliverables: [
        'Biometric authentication face/touch',
        'Peer-to-peer instant funds transfer',
        'Stripe & Plaid payment processor',
        'Push notifications engine',
        'App Store & Play Store submission',
      ],
      notes: 'Sprint 2 biometric verification signed off by security audit team.',
    },
    {
      id: 'proj-summit',
      projectName: 'Summit Q4 Multi-Channel Ad Suite',
      leadId: 'lead-summit',
      assignedTeamId: 'team-marketing',
      assignedEmployees: ['admin-sap-secondary', 'emp-mkt-david'],
      profession: 'MARKETING',
      status: 'REVIEW',
      startDate: '2026-08-25',
      dueDate: '2026-09-30',
      progress: 85,
      createdAt: '2026-08-25T11:00:00.000Z',
      deliverables: [
        'Audience segmentation matrix',
        'Creative variations copywriting',
        'Pixel & conversion tag installation',
        'A/B landing page optimization',
        'Weekly ROAS analytics dashboard',
      ],
      notes: 'Final review with Summit CMO scheduled for this Friday.',
    },
  ];

  for (const project of seedProjects) {
    await setDoc(doc(db, 'projects', project.id), project, { merge: true });
  }

  // 5. SEED DISCUSSIONS
  const seedDiscussions: Discussion[] = [
    {
      id: 'disc-general',
      title: 'Company-Wide General Room',
      type: 'GENERAL',
      participants: ['admin-sap-primary', 'admin-sap-secondary', 'lead-squad-web', 'emp-dev-alex'],
      createdBy: 'admin@sap.com',
      createdAt: '2026-09-01T08:00:00.000Z',
      lastMessage: 'Welcome everyone to StudioAdsPro CRM 2026!',
      lastMessageAt: '2026-09-17T09:00:00.000Z',
    },
    {
      id: 'disc-leads',
      title: 'Lead Ingestion & Pipeline Triage',
      type: 'GROUP',
      participants: ['admin-sap-primary', 'admin-sap-secondary', 'lead-squad-web'],
      createdBy: 'admin@sap.com',
      createdAt: '2026-09-02T10:00:00.000Z',
      lastMessage: 'New NovaPay and Apex logistics RFPs allocated to squads.',
      lastMessageAt: '2026-09-16T15:30:00.000Z',
    },
    {
      id: 'disc-web',
      title: 'Website Squad Sprint Sync',
      type: 'TEAM',
      teamId: 'team-web',
      participants: ['lead-squad-web', 'emp-dev-emma'],
      createdBy: 'lead@sap.com',
      createdAt: '2026-09-05T09:30:00.000Z',
      lastMessage: 'Apex customer portal milestone 2 deployed to staging.',
      lastMessageAt: '2026-09-16T17:00:00.000Z',
    },
  ];

  for (const disc of seedDiscussions) {
    await setDoc(doc(db, 'discussions', disc.id), disc, { merge: true });
    // Add a welcome message in each discussion
    await addDoc(collection(db, 'discussions', disc.id, 'messages'), {
      content: disc.lastMessage,
      senderId: disc.createdBy,
      senderName: 'System Broadcast',
      senderRole: 'ADMIN',
      timestamp: disc.lastMessageAt || new Date().toISOString(),
    });
  }

  // 6. SEED AUDIT LOGS
  const sampleAudits = [
    {
      action: 'SYSTEM_BOOTSTRAP',
      performedBy: 'admin@sap.com',
      details: 'StudioAdsPro CRM system database successfully initialized with core schema and permissions.',
      timestamp: '2026-09-17T00:00:00.000Z',
    },
    {
      action: 'SECURITY_AUDIT',
      performedBy: 'admin@sap1.com',
      details: 'Role-Based Access Control verified for Executive Admin, Team Leads and Employees.',
      timestamp: '2026-09-17T01:15:00.000Z',
    },
  ];

  for (const audit of sampleAudits) {
    await addDoc(collection(db, 'audits'), audit);
  }
}
