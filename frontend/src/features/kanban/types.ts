import { Issue } from '@/data/sample';

export interface ColumnData {
  id: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  title: string;
  issues: Issue[];
}

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
