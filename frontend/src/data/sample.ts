export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string;
  githubRepo: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  reporterId: string;
  version: number;
  branchName?: string;
  prUrl?: string;
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: string;
  userId: string;
  action: string;
  entityType: 'issue' | 'project' | 'branch' | 'pr';
  entityId: string;
  entityName: string;
  details?: string;
  timestamp: string;
}

export const sampleUsers: User[] = [
  {
    id: 'u1',
    name: 'Ali Raza',
    email: 'ali@devsync.io',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'Lead Architect',
  },
  {
    id: 'u2',
    name: 'Sara Khan',
    email: 'sara@devsync.io',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'Frontend Dev',
  },
  {
    id: 'u3',
    name: 'John Doe',
    email: 'john@devsync.io',
    avatarUrl: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'Backend Engineer',
  },
  {
    id: 'u4',
    name: 'Emily Watson',
    email: 'emily@devsync.io',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    role: 'QA Automation',
  },
];

export const sampleProjects: Project[] = [
  {
    id: 'p1',
    name: 'DevSync core',
    slug: 'devsync-core',
    description: 'Main repository containing the coordination platform, API, and frontend client.',
    githubRepo: 'devsync-org/devsync-core',
  },
  {
    id: 'p2',
    name: 'Analytics Service',
    slug: 'analytics-service',
    description: 'Microservice for processing code activity metrics and webhook events.',
    githubRepo: 'devsync-org/analytics-service',
  },
];

export const sampleIssues: Issue[] = [
  {
    id: 'DS-101',
    title: 'Set up JWT authentication middleware',
    description: 'Implement secure login, signup, token refreshing, and endpoint authorization.',
    status: 'in_progress',
    priority: 'high',
    assigneeId: 'u3',
    reporterId: 'u1',
    version: 2,
    branchName: 'feature/jwt-auth',
    labels: ['backend', 'security'],
    createdAt: '2026-07-10T10:00:00Z',
    updatedAt: '2026-07-12T14:30:00Z',
  },
  {
    id: 'DS-102',
    title: 'Design primary dashboard landing layout',
    description: 'Create responsive stats grid, line charts, and recent activity log layout.',
    status: 'todo',
    priority: 'medium',
    assigneeId: 'u2',
    reporterId: 'u1',
    version: 1,
    branchName: 'feat/dashboard-layout',
    labels: ['frontend', 'ux'],
    createdAt: '2026-07-11T09:15:00Z',
    updatedAt: '2026-07-11T09:15:00Z',
  },
  {
    id: 'DS-103',
    title: 'Configure Alembic async migrations',
    description: 'Set up environment to support asyncpg and async operations in alembic env.py.',
    status: 'done',
    priority: 'high',
    assigneeId: 'u3',
    reporterId: 'u3',
    version: 3,
    branchName: 'fix/alembic-async-env',
    prUrl: 'https://github.com/devsync-org/devsync-core/pull/42',
    labels: ['backend', 'db'],
    createdAt: '2026-07-08T11:20:00Z',
    updatedAt: '2026-07-09T18:00:00Z',
  },
  {
    id: 'DS-104',
    title: 'Implement drag-and-drop Kanban interface',
    description: 'Build columns with horizontal scrolling, issue cards, drag states, and visual drop markers.',
    status: 'in_progress',
    priority: 'urgent',
    assigneeId: 'u2',
    reporterId: 'u1',
    version: 5,
    branchName: 'feature/kanban-dnd',
    labels: ['frontend', 'interactivity'],
    createdAt: '2026-07-05T14:00:00Z',
    updatedAt: '2026-07-15T10:00:00Z',
  },
  {
    id: 'DS-105',
    title: 'Add connection manager room routing',
    description: 'Map web sockets to specific project rooms instead of global broadcasting.',
    status: 'review',
    priority: 'high',
    assigneeId: 'u1',
    reporterId: 'u3',
    version: 4,
    branchName: 'feature/ws-rooms',
    prUrl: 'https://github.com/devsync-org/devsync-core/pull/48',
    labels: ['backend', 'real-time'],
    createdAt: '2026-07-09T16:45:00Z',
    updatedAt: '2026-07-14T11:00:00Z',
  },
  {
    id: 'DS-106',
    title: 'Integrate GitHub Webhook validation signature',
    description: 'Verify HMAC hex signature using the configured client webhook secret key.',
    status: 'backlog',
    priority: 'medium',
    reporterId: 'u1',
    version: 1,
    labels: ['backend', 'security', 'github'],
    createdAt: '2026-07-12T08:00:00Z',
    updatedAt: '2026-07-12T08:00:00Z',
  },
  {
    id: 'DS-107',
    title: 'Add visual editor presence indicators',
    description: 'Display avatars of developers currently hovering over or viewing the same issue card.',
    status: 'backlog',
    priority: 'low',
    reporterId: 'u2',
    version: 1,
    labels: ['frontend', 'real-time'],
    createdAt: '2026-07-14T09:00:00Z',
    updatedAt: '2026-07-14T09:00:00Z',
  },
];

export const sampleActivities: Activity[] = [
  {
    id: 'a1',
    userId: 'u3',
    action: 'merged pull request',
    entityType: 'pr',
    entityId: 'pr-42',
    entityName: 'fix/alembic-async-env (#42)',
    details: 'Automatically moved issue DS-103 to Done',
    timestamp: '2026-07-09T18:00:00Z',
  },
  {
    id: 'a2',
    userId: 'u2',
    action: 'moved issue',
    entityType: 'issue',
    entityId: 'DS-104',
    entityName: 'DS-104: Implement drag-and-drop Kanban interface',
    details: 'Moved from "Todo" to "In Progress"',
    timestamp: '2026-07-15T10:00:00Z',
  },
  {
    id: 'a3',
    userId: 'u1',
    action: 'created pull request',
    entityType: 'pr',
    entityId: 'pr-48',
    entityName: 'feature/ws-rooms (#48)',
    details: 'Linked to issue DS-105. Status changed to Review.',
    timestamp: '2026-07-14T11:00:00Z',
  },
  {
    id: 'a4',
    userId: 'u3',
    action: 'started editing issue',
    entityType: 'issue',
    entityId: 'DS-101',
    entityName: 'DS-101: Set up JWT authentication middleware',
    details: 'Acquired optimistic lock version 2',
    timestamp: '2026-07-12T14:30:00Z',
  },
];

export const sampleCommitStats = [
  { day: 'Mon', commits: 12, prs: 3, issuesClosed: 2 },
  { day: 'Tue', commits: 18, prs: 5, issuesClosed: 4 },
  { day: 'Wed', commits: 8, prs: 2, issuesClosed: 1 },
  { day: 'Thu', commits: 25, prs: 7, issuesClosed: 6 },
  { day: 'Fri', commits: 14, prs: 4, issuesClosed: 3 },
  { day: 'Sat', commits: 4, prs: 1, issuesClosed: 0 },
  { day: 'Sun', commits: 6, prs: 2, issuesClosed: 1 },
];

export const sampleContributorStats = [
  { name: 'Ali Raza', commits: 45, prs: 12, reviews: 24 },
  { name: 'Sara Khan', commits: 38, prs: 15, reviews: 10 },
  { name: 'John Doe', commits: 52, prs: 18, reviews: 8 },
  { name: 'Emily Watson', commits: 8, prs: 2, reviews: 30 },
];
