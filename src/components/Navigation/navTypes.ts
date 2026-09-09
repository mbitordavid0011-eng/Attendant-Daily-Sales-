import { LucideIcon } from 'lucide-react';
import { UserRole } from '../../types';

export type AttendantTabId = 'home' | 'shifts' | 'tasks' | 'profile' | 'settings';
export type SupervisorTabId = 'home' | 'roster' | 'approvals' | 'reports' | 'settings';

export type AppViewTab = AttendantTabId | SupervisorTabId | 'records' | 'wizard' | 'detail' | 'success';

export interface NavItemConfig<T extends string = string> {
  id: T;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  badge?: number | string | null;
  badgeColor?: 'red' | 'amber' | 'emerald' | 'blue';
  ariaLabel: string;
}
