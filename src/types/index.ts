export type UserRole = 'ADMIN' | 'TEAM_LEAD' | 'EMPLOYEE';

export type Profession =
  | 'MOBILE_APP'
  | 'WEBSITE'
  | 'MARKETING'
  | 'SOCIAL_MEDIA_HANDLING'
  | 'VIDEO_SHOOT_EDIT';

export type EmploymentType = 'FULL_TIME' | 'FREELANCER';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profession: Profession;
  teamId?: string;
  employmentType: EmploymentType;
  reportsTo?: string; // teamLeadId or adminId
  createdBy: string;
  createdAt: string;
  status: UserStatus;
  phone?: string;
  avatar?: string;
}

export interface Team {
  id: string;
  teamName: string;
  profession: Profession;
  teamLeadId: string;
  members: string[]; // array of userIds
  createdAt: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export type LeadStatus = 'NEW' | 'QUALIFIED' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';

export interface Lead {
  id: string;
  clientName: string;
  email: string;
  phone: string;
  budget: number; // in INR (₹)
  date: string;
  servicesRequired: Profession[];
  assignedTo: string[]; // array of userIds or teamIds (for comprehensive compatibility)
  status: LeadStatus;
  notes?: string;
  createdAt: string;
  createdBy: string;
  lastModified: string;
  sourceChannel: string;
  assignedTeamId?: string; // Team assigned by Admin
  assignedTeamLeadId?: string; // Team Lead assigned by Admin
  assignedEmployeeIds?: string[]; // Employees assigned by Team Lead or Admin
  delegatedBy?: string; // Email/Name of the TL or Admin who assigned employees
  delegatedAt?: string; // ISO timestamp of employee delegation
  tlNotes?: string; // Specific instructions added by TL for assigned employees
}

export const formatINR = (amount: number | string | undefined | null): string => {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
};

export type ProjectStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'ON_HOLD';

export interface Project {
  id: string;
  projectName: string;
  leadId?: string;
  assignedTeamId?: string;
  assignedEmployees: string[]; // array of userIds
  profession: Profession;
  status: ProjectStatus;
  startDate: string;
  dueDate: string;
  progress: number; // 0-100
  createdAt: string;
  deliverables: string[];
  notes?: string;
}

export type DiscussionType = 'PRIVATE' | 'GROUP' | 'TEAM' | 'PROJECT' | 'GENERAL';

export interface Discussion {
  id: string;
  title: string;
  type: DiscussionType;
  participants: string[]; // userIds
  createdBy: string;
  createdAt: string;
  isActive?: boolean;
  lastMessageAt?: string;
  lastActivity?: string;
  lastMessage?: string;
  teamId?: string;
  projectId?: string;
}

export interface Message {
  id: string;
  discussionId?: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  senderRole?: string;
  message?: string;
  content: string;
  timestamp: string;
  edited?: boolean;
  editedAt?: string;
  isPinned?: boolean;
  attachments?: string[];
  mentions?: string[];
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface Invitation {
  id: string;
  discussionId: string;
  invitedUserId: string;
  invitedBy: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  details: string;
  timestamp: string;
}

export const PROFESSION_LABELS: Record<Profession, string> = {
  MOBILE_APP: 'Mobile App Development',
  WEBSITE: 'Website & Web App',
  MARKETING: 'Digital Marketing & Ads',
  SOCIAL_MEDIA_HANDLING: 'Social Media Management',
  VIDEO_SHOOT_EDIT: 'Video Production & Editing',
};

export const PROFESSION_COLORS: Record<Profession, { bg: string; text: string; border: string }> = {
  MOBILE_APP: { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  WEBSITE: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  MARKETING: { bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  SOCIAL_MEDIA_HANDLING: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  VIDEO_SHOOT_EDIT: { bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
};
