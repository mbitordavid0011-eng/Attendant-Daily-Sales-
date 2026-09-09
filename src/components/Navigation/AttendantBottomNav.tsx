import React from 'react';
import { Home, CalendarClock, CheckSquare, User, Settings } from 'lucide-react';
import { AttendantTabId, NavItemConfig } from './navTypes';

interface AttendantBottomNavProps {
  activeTab: AttendantTabId | string;
  onChangeTab: (tab: AttendantTabId) => void;
  pendingTasksCount?: number;
  activeShiftRunning?: boolean;
  isMenuOpen?: boolean;
}

export const ATTENDANT_NAV_ITEMS: NavItemConfig<AttendantTabId>[] = [
  {
    id: 'home',
    label: 'Home',
    sublabel: 'Dashboard overview',
    icon: Home,
    ariaLabel: 'Attendant Dashboard Home',
  },
  {
    id: 'shifts',
    label: 'Shifts',
    sublabel: 'Personal schedule & clock-in',
    icon: CalendarClock,
    ariaLabel: 'Personal Schedule and Clock In Out',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    sublabel: 'Daily checklists',
    icon: CheckSquare,
    ariaLabel: 'Forecourt Daily Task Checklists',
  },
  {
    id: 'profile',
    label: 'Profile',
    sublabel: 'Personal settings',
    icon: User,
    ariaLabel: 'Attendant Personal Profile and Settings',
  },
  {
    id: 'settings',
    label: 'Settings',
    sublabel: 'Station & app preferences',
    icon: Settings,
    ariaLabel: 'App and Station Settings',
  },
];

export const AttendantBottomNav: React.FC<AttendantBottomNavProps> = ({
  activeTab,
  onChangeTab,
  pendingTasksCount = 0,
  activeShiftRunning = false,
  isMenuOpen = false,
}) => {
  return (
    <nav
      aria-label="Attendant navigation bar"
      className={`fixed bottom-0 left-0 right-0 bg-[#191b1d]/95 backdrop-blur-md border-t border-[#333739] shadow-2xl md:hidden no-print transition-all duration-300 ease-in-out ${
        isMenuOpen
          ? 'translate-y-full opacity-0 pointer-events-none invisible -z-10'
          : 'translate-y-0 opacity-100 pointer-events-auto visible z-40'
      }`}
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-center px-1 py-1.5 safe-area-bottom">
        {ATTENDANT_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'home' && activeTab === 'dashboard') ||
            (item.id === 'shifts' && activeTab === 'records');

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeTab(item.id)}
              aria-label={item.ariaLabel}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'text-[#e8b93b] font-bold'
                  : 'text-[#8d9195] hover:text-[#ece8e0] font-medium'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-transform duration-150 ${
                    isActive ? 'scale-110 text-[#e8b93b]' : 'text-[#8d9195]'
                  }`}
                />

                {/* Status badges */}
                {item.id === 'tasks' && pendingTasksCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                    {pendingTasksCount}
                  </span>
                )}

                {item.id === 'shifts' && activeShiftRunning && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-[#191b1d] animate-pulse" />
                )}
              </div>

              <span className="text-[10px] mt-1 tracking-tight truncate w-full text-center">
                {item.label}
              </span>

              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-[#e8b93b] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
