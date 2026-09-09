import React, { useState } from 'react';
import {
  Home,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  BarChart3,
  Users,
  CheckCircle2,
  Plus,
  MoreHorizontal,
  Settings,
  User,
  UserCheck,
  RefreshCw,
  LogOut,
  X,
  Fuel,
  ShieldAlert,
  Building2,
  Banknote,
} from 'lucide-react';
import { UserProfile, StationConfig } from '../types';
import { AppView } from '../App';

export type NavTab = AppView;

interface BottomNavProps {
  activeTab: string;
  onChangeTab: (tab: AppView) => void;
  profile: UserProfile;
  onNewRecord: () => void;
  draftCount?: number;
  pendingApprovalsCount?: number;
  urgentAlertsCount?: number;
  pendingTasksCount?: number;
  activeShiftRunning?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onLogout?: () => void;
  onToggleRole?: (newRole: 'attendant' | 'supervisor') => void;
  onOpenSwitchAttendant?: () => void;
  stations?: StationConfig[];
  currentStationName?: string;
  isMenuOpen?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  profile,
  onNewRecord,
  draftCount = 0,
  pendingApprovalsCount = 0,
  urgentAlertsCount = 0,
  pendingTasksCount = 0,
  activeShiftRunning = false,
  onRefresh,
  isRefreshing = false,
  onLogout,
  onToggleRole,
  onOpenSwitchAttendant,
  stations = [],
  currentStationName,
  isMenuOpen = false,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const isSupervisor = profile.role === 'supervisor' || profile.role === 'station_manager';
  const isAnyMenuOpen = Boolean(isMenuOpen || isMoreOpen);

  const handleTabClick = (tab: AppView) => {
    setIsMoreOpen(false);
    onChangeTab(tab);
  };

  const handleAction = (callback?: () => void) => {
    setIsMoreOpen(false);
    if (callback) callback();
  };

  return (
    <>
      {/* 1. MOBILE BOTTOM NAVIGATION BAR */}
      <nav
        aria-label="Main navigation bar"
        id="app-bottom-navigation"
        className={`fixed bottom-0 left-0 right-0 w-full max-w-full overflow-hidden bg-[#121416]/95 backdrop-blur-xl border-t border-stone-800 shadow-[0_-8px_30px_rgba(0,0,0,0.5)] md:hidden no-print transition-all duration-300 ease-in-out ${
          isAnyMenuOpen
            ? 'translate-y-full opacity-0 pointer-events-none invisible -z-10'
            : 'translate-y-0 opacity-100 pointer-events-auto visible z-40'
        }`}
      >
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between px-2 sm:px-6 py-1.5 safe-area-bottom">
          {/* Attendant Navigation Items */}
          {!isSupervisor ? (
            <>
              {/* Home / Dashboard */}
              <button
                type="button"
                id="btn-nav-dashboard"
                onClick={() => handleTabClick('dashboard')}
                aria-label="Dashboard Overview"
                aria-current={activeTab === 'dashboard' ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'text-amber-400 font-bold'
                    : 'text-stone-400 hover:text-stone-100 font-medium'
                }`}
              >
                <div className="relative">
                  <Home
                    className={`w-5 h-5 transition-transform ${
                      activeTab === 'dashboard' ? 'scale-110 text-amber-400' : 'text-stone-400'
                    }`}
                  />
                  {draftCount > 0 && (
                    <span className="absolute -top-1 -right-2 bg-amber-500 text-stone-950 text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                      {draftCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] mt-1 tracking-tight truncate">Home</span>
                {activeTab === 'dashboard' && (
                  <span className="w-4 h-0.5 bg-amber-400 rounded-full mt-0.5" />
                )}
              </button>

              {/* Shifts */}
              <button
                type="button"
                id="btn-nav-shifts"
                onClick={() => handleTabClick('shifts')}
                aria-label="My Shifts"
                aria-current={activeTab === 'shifts' ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'shifts'
                    ? 'text-amber-400 font-bold'
                    : 'text-stone-400 hover:text-stone-100 font-medium'
                }`}
              >
                <div className="relative">
                  <CalendarClock
                    className={`w-5 h-5 transition-transform ${
                      activeTab === 'shifts' ? 'scale-110 text-amber-400' : 'text-stone-400'
                    }`}
                  />
                  {activeShiftRunning && (
                    <span className="absolute -top-0.5 -right-1 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-stone-900 animate-pulse" />
                  )}
                </div>
                <span className="text-[11px] mt-1 tracking-tight truncate">Shifts</span>
                {activeTab === 'shifts' && (
                  <span className="w-4 h-0.5 bg-amber-400 rounded-full mt-0.5" />
                )}
              </button>

              {/* Center Elevated Action: + New Shift */}
              <div className="flex-1 flex justify-center items-center px-1">
                <button
                  type="button"
                  id="btn-nav-new-shift"
                  onClick={onNewRecord}
                  aria-label="Start New Shift Record"
                  className="flex flex-col items-center justify-center group cursor-pointer focus:outline-none"
                >
                  <div className="w-12 h-12 -mt-5 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-stone-950 flex items-center justify-center shadow-lg shadow-amber-500/30 border-2 border-stone-900 group-hover:scale-105 group-active:scale-95 transition-all">
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 mt-0.5">New Shift</span>
                </button>
              </div>

              {/* Tasks */}
              <button
                type="button"
                id="btn-nav-tasks"
                onClick={() => handleTabClick('tasks')}
                aria-label="Tasks Checklist"
                aria-current={activeTab === 'tasks' ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'tasks'
                    ? 'text-amber-400 font-bold'
                    : 'text-stone-400 hover:text-stone-100 font-medium'
                }`}
              >
                <div className="relative">
                  <CheckSquare
                    className={`w-5 h-5 transition-transform ${
                      activeTab === 'tasks' ? 'scale-110 text-amber-400' : 'text-stone-400'
                    }`}
                  />
                  {pendingTasksCount > 0 && (
                    <span className="absolute -top-1 -right-2 bg-emerald-500 text-stone-950 text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                      {pendingTasksCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] mt-1 tracking-tight truncate">Tasks</span>
                {activeTab === 'tasks' && (
                  <span className="w-4 h-0.5 bg-amber-400 rounded-full mt-0.5" />
                )}
              </button>

              {/* Records History */}
              <button
                type="button"
                id="btn-nav-records"
                onClick={() => handleTabClick('records')}
                aria-label="Shift History Records"
                aria-current={activeTab === 'records' ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'records'
                    ? 'text-amber-400 font-bold'
                    : 'text-stone-400 hover:text-stone-100 font-medium'
                }`}
              >
                <ClipboardList
                  className={`w-5 h-5 transition-transform ${
                    activeTab === 'records' ? 'scale-110 text-amber-400' : 'text-stone-400'
                  }`}
                />
                <span className="text-[11px] mt-1 tracking-tight truncate">History</span>
                {activeTab === 'records' && (
                  <span className="w-4 h-0.5 bg-amber-400 rounded-full mt-0.5" />
                )}
              </button>

              {/* More / Profile Menu */}
              <button
                type="button"
                id="btn-nav-more"
                onClick={() => setIsMoreOpen(!isMoreOpen)}
                aria-label="Open Account and More Settings"
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                  isMoreOpen || activeTab === 'profile' || activeTab === 'settings' || activeTab === 'reports'
                    ? 'text-amber-400 font-bold'
                    : 'text-stone-400 hover:text-stone-100 font-medium'
                }`}
              >
                <MoreHorizontal
                  className={`w-5 h-5 transition-transform ${
                    isMoreOpen ? 'scale-110 text-amber-400' : 'text-stone-400'
                  }`}
                />
                <span className="text-[11px] mt-1 tracking-tight truncate">More</span>
                {(isMoreOpen || activeTab === 'profile' || activeTab === 'settings' || activeTab === 'reports') && (
                  <span className="w-4 h-0.5 bg-amber-400 rounded-full mt-0.5" />
                )}
              </button>
            </>
          ) : (
            /* Supervisor Navigation Items: 1. Home, 2. Team, 3. Supervisor Sales Account, 4. Approvals, 5. Reports, 6. Settings */
            <>
              {/* 1. Home */}
              <button
                type="button"
                id="btn-nav-supervisor-dashboard"
                onClick={() => handleTabClick('dashboard')}
                aria-label="Home Dashboard"
                aria-current={activeTab === 'dashboard' ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'text-amber-400 font-bold'
                    : 'text-stone-400 hover:text-stone-100 font-medium'
                }`}
              >
                <div className="relative">
                  <Home
                    className={`w-5 h-5 transition-transform ${
                      activeTab === 'dashboard' ? 'scale-110 text-amber-400' : 'text-stone-400'
                    }`}
                  />
                  {urgentAlertsCount > 0 && (
                    <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-xs animate-pulse">
                      {urgentAlertsCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] mt-1 tracking-tight truncate">Home</span>
                {activeTab === 'dashboard' && (
                  <span className="w-4 h-0.5 bg-amber-400 rounded-full mt-0.5" />
                )}
              </button>

              {/* 2. Attendance Account Oversight */}
              <button
                type="button"
                id="btn-nav-roster"
                onClick={() => handleTabClick('roster')}
                aria-label="Attendance Account Oversight and Team Roster"
                aria-current={activeTab === 'roster' ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'roster'
                    ? 'text-amber-400 font-bold'
                    : 'text-stone-400 hover:text-stone-100 font-medium'
                }`}
              >
                <Users
                  className={`w-5 h-5 transition-transform ${
                    activeTab === 'roster' ? 'scale-110 text-amber-400' : 'text-stone-400'
                  }`}
                />
                <span className="text-[8.5px] sm:text-[9.5px] mt-1 tracking-tight text-center leading-[1.1] font-semibold line-clamp-2 max-w-[72px]">
                  Attendance Account Oversight
                </span>
                {activeTab === 'roster' && (
                  <span className="w-4 h-0.5 bg-amber-400 rounded-full mt-0.5" />
                )}
              </button>

              {/* 3. Supervisor Sales Account (Direct Primary Action) */}
              <div className="flex-1 flex justify-center items-center px-0.5">
                <button
                  type="button"
                  id="btn-nav-supervisor-sales"
                  onClick={() => handleTabClick('supervisor_sales')}
                  aria-label="Supervisor Sales Account"
                  className="flex flex-col items-center justify-center group cursor-pointer focus:outline-none"
                >
                  <div className={`w-11 h-11 -mt-4 rounded-full flex items-center justify-center shadow-lg transition-all ${
                    activeTab === 'supervisor_sales'
                      ? 'bg-amber-400 text-stone-950 shadow-amber-500/40 border-2 border-amber-300 scale-105'
                      : 'bg-gradient-to-tr from-amber-500 to-amber-400 text-stone-950 shadow-amber-500/30 border-2 border-stone-900 group-hover:scale-105 group-active:scale-95'
                  }`}>
                    <Banknote className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <span className={`text-[8.5px] sm:text-[9.5px] font-bold mt-0.5 tracking-tight text-center leading-[1.1] line-clamp-2 max-w-[76px] ${
                    activeTab === 'supervisor_sales' ? 'text-amber-300' : 'text-amber-400'
                  }`}>Supervisor Sales Account</span>
                </button>
              </div>

              {/* 4. Approvals */}
              <button
                type="button"
                id="btn-nav-approvals"
                onClick={() => handleTabClick('approvals')}
                aria-label="Shift Approvals and Claims"
                aria-current={activeTab === 'approvals' ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'approvals'
                    ? 'text-amber-400 font-bold'
                    : 'text-stone-400 hover:text-stone-100 font-medium'
                }`}
              >
                <div className="relative">
                  <CheckCircle2
                    className={`w-5 h-5 transition-transform ${
                      activeTab === 'approvals' ? 'scale-110 text-amber-400' : 'text-stone-400'
                    }`}
                  />
                  {pendingApprovalsCount > 0 && (
                    <span className="absolute -top-1 -right-2 bg-amber-500 text-stone-950 text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                      {pendingApprovalsCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] mt-1 tracking-tight truncate">Approvals</span>
                {activeTab === 'approvals' && (
                  <span className="w-4 h-0.5 bg-amber-400 rounded-full mt-0.5" />
                )}
              </button>

              {/* 5. Reports */}
              <button
                type="button"
                id="btn-nav-reports"
                onClick={() => handleTabClick('reports')}
                aria-label="Financial and Volume Reports"
                aria-current={activeTab === 'reports' ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'reports'
                    ? 'text-amber-400 font-bold'
                    : 'text-stone-400 hover:text-stone-100 font-medium'
                }`}
              >
                <BarChart3
                  className={`w-5 h-5 transition-transform ${
                    activeTab === 'reports' ? 'scale-110 text-amber-400' : 'text-stone-400'
                  }`}
                />
                <span className="text-[11px] mt-1 tracking-tight truncate">Reports</span>
                {activeTab === 'reports' && (
                  <span className="w-4 h-0.5 bg-amber-400 rounded-full mt-0.5" />
                )}
              </button>

              {/* 6. Settings */}
              <button
                type="button"
                id="btn-nav-settings"
                onClick={() => handleTabClick('settings')}
                aria-label="Station and Account Settings"
                aria-current={activeTab === 'settings' ? 'page' : undefined}
                className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'text-amber-400 font-bold'
                    : 'text-stone-400 hover:text-stone-100 font-medium'
                }`}
              >
                <Settings
                  className={`w-5 h-5 transition-transform ${
                    activeTab === 'settings' ? 'scale-110 text-amber-400' : 'text-stone-400'
                  }`}
                />
                <span className="text-[11px] mt-1 tracking-tight truncate">Settings</span>
                {activeTab === 'settings' && (
                  <span className="w-4 h-0.5 bg-amber-400 rounded-full mt-0.5" />
                )}
              </button>
            </>
          )}
        </div>
      </nav>

      {/* 2. MORE / ACCOUNT POPUP DRAWER */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-[80] flex flex-col justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
          {/* Backdrop Click Dismiss */}
          <div
            className="flex-1"
            onClick={() => setIsMoreOpen(false)}
            aria-label="Close menu backdrop"
          />

          {/* Drawer Sheet */}
          <div
            id="more-menu-sheet"
            className="w-full max-w-xl mx-auto bg-stone-900 border-t border-stone-700 rounded-t-3xl shadow-2xl p-5 pb-8 safe-area-bottom max-h-[85vh] overflow-y-auto relative z-[85]"
          >
            {/* Header / User Profile Badge */}
            <div className="flex items-center justify-between pb-4 border-b border-stone-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-base">
                  {profile.attendant?.[0]?.toUpperCase() || profile.supervisor?.[0]?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-stone-100 font-bold text-base tracking-tight">
                      {profile.attendant || profile.supervisor || 'Forecourt User'}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold uppercase">
                      {isSupervisor ? 'Supervisor' : 'Attendant'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-3.5 h-3.5 text-stone-500" />
                    <span>{currentStationName || profile.station || 'Fuel Forecourt'}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-close-more-sheet"
                onClick={() => setIsMoreOpen(false)}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-4">
              {/* Toggle Role (Supervisors only) */}
              {isSupervisor && onToggleRole && (
                <button
                  type="button"
                  id="btn-sheet-toggle-role"
                  onClick={() => handleAction(() => onToggleRole('attendant'))}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-800/80 hover:bg-stone-800 border border-stone-700/60 text-stone-200 transition-all cursor-pointer group"
                >
                  <ShieldAlert className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform mb-1.5" />
                  <span className="text-xs font-semibold">Switch Portal</span>
                  <span className="text-[10px] text-stone-400">To Attendant</span>
                </button>
              )}

              {/* Station Settings */}
              <button
                type="button"
                id="btn-sheet-settings"
                onClick={() => handleTabClick('settings')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-800/80 hover:bg-stone-800 border border-stone-700/60 text-stone-200 transition-all cursor-pointer group"
              >
                <Settings className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-semibold">Station Settings</span>
                <span className="text-[10px] text-stone-400">Pumps & Tanks</span>
              </button>

              {/* Shift Records / History (if supervisor) */}
              {isSupervisor && (
                <button
                  type="button"
                  id="btn-sheet-history"
                  onClick={() => handleTabClick('records')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-800/80 hover:bg-stone-800 border border-stone-700/60 text-stone-200 transition-all cursor-pointer group"
                >
                  <ClipboardList className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform mb-1.5" />
                  <span className="text-xs font-semibold">Shift History</span>
                  <span className="text-[10px] text-stone-400">Reconciliation Logs</span>
                </button>
              )}

              {/* Reports (if attendant) */}
              {!isSupervisor && (
                <button
                  type="button"
                  id="btn-sheet-reports"
                  onClick={() => handleTabClick('reports')}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-800/80 hover:bg-stone-800 border border-stone-700/60 text-stone-200 transition-all cursor-pointer group"
                >
                  <BarChart3 className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform mb-1.5" />
                  <span className="text-xs font-semibold">Reports</span>
                  <span className="text-[10px] text-stone-400">Sales Summary</span>
                </button>
              )}

              {/* Personal Profile */}
              <button
                type="button"
                id="btn-sheet-profile"
                onClick={() => handleTabClick('profile')}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-800/80 hover:bg-stone-800 border border-stone-700/60 text-stone-200 transition-all cursor-pointer group"
              >
                <User className="w-5 h-5 text-violet-400 group-hover:scale-110 transition-transform mb-1.5" />
                <span className="text-xs font-semibold">My Profile</span>
                <span className="text-[10px] text-stone-400">Credentials</span>
              </button>

              {/* Sync / Refresh */}
              {onRefresh && (
                <button
                  type="button"
                  id="btn-sheet-refresh"
                  onClick={() => {
                    onRefresh();
                    setIsMoreOpen(false);
                  }}
                  className="flex flex-col items-center justify-center p-3 rounded-2xl bg-stone-800/80 hover:bg-stone-800 border border-stone-700/60 text-stone-200 transition-all cursor-pointer group"
                >
                  <RefreshCw
                    className={`w-5 h-5 text-teal-400 group-hover:scale-110 transition-transform mb-1.5 ${
                      isRefreshing ? 'animate-spin text-teal-300' : ''
                    }`}
                  />
                  <span className="text-xs font-semibold">Sync Data</span>
                  <span className="text-[10px] text-stone-400">{isRefreshing ? 'Syncing...' : 'Live Refresh'}</span>
                </button>
              )}
            </div>

            {/* Logout / Sign Out Button */}
            {onLogout && (
              <div className="pt-2 border-t border-stone-800">
                <button
                  type="button"
                  id="btn-sheet-logout"
                  onClick={() => handleAction(onLogout)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 font-semibold text-xs transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Lock & Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
