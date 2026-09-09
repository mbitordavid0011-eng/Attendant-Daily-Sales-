import React from 'react';
import { Home, Users, CheckCircle2, BarChart3, Settings } from 'lucide-react';
import { SupervisorTabId, NavItemConfig } from './navTypes';

interface SupervisorBottomNavProps {
  activeTab: SupervisorTabId | string;
  onChangeTab: (tab: SupervisorTabId) => void;
  pendingApprovalsCount?: number;
  urgentAlertsCount?: number;
  isMenuOpen?: boolean;
}

export const SUPERVISOR_NAV_ITEMS: NavItemConfig<SupervisorTabId>[] = [
  {
    id: 'home',
    label: 'Supervisor Sales Account',
    sublabel: 'Team overview & sales oversight',
    icon: Home,
    ariaLabel: 'Supervisor Sales Account & Station Dashboard',
  },
  {
    id: 'roster',
    label: 'Attendance Account Oversight',
    sublabel: 'Master schedule & pump assignments',
    icon: Users,
    ariaLabel: 'Station Attendance Account Oversight and Shift Assignments',
  },
  {
    id: 'approvals',
    label: 'Approvals',
    sublabel: 'Station join & shift authorizations',
    icon: CheckCircle2,
    ariaLabel: 'Attendant Shift Approvals and Claims',
  },
  {
    id: 'reports',
    label: 'Reports',
    sublabel: 'Labor costs & team metrics',
    icon: BarChart3,
    ariaLabel: 'Station Labor Costs and Financial Reports',
  },
  {
    id: 'settings',
    label: 'Settings',
    sublabel: 'Tanks, pumps & system config',
    icon: Settings,
    ariaLabel: 'Station Configuration and Settings',
  },
];

export const SupervisorBottomNav: React.FC<SupervisorBottomNavProps> = ({
  activeTab,
  onChangeTab,
  pendingApprovalsCount = 0,
  urgentAlertsCount = 0,
  isMenuOpen = false,
}) => {
  return (
    <nav
      aria-label="Supervisor navigation bar"
      className={`fixed bottom-0 left-0 right-0 bg-[#16181a]/95 backdrop-blur-md border-t border-[#333739] shadow-2xl md:hidden no-print transition-all duration-300 ease-in-out ${
        isMenuOpen
          ? 'translate-y-full opacity-0 pointer-events-none invisible -z-10'
          : 'translate-y-0 opacity-100 pointer-events-auto visible z-40'
      }`}
    >
      <div className="max-w-md mx-auto grid grid-cols-5 items-center px-1 py-1.5 safe-area-bottom">
        {SUPERVISOR_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'home' && activeTab === 'dashboard') ||
            (item.id === 'approvals' && (activeTab === 'records' || activeTab === 'detail'));

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

                {/* Status Badges */}
                {item.id === 'home' && urgentAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-xs animate-bounce">
                    {urgentAlertsCount}
                  </span>
                )}

                {item.id === 'approvals' && pendingApprovalsCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                    {pendingApprovalsCount}
                  </span>
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
