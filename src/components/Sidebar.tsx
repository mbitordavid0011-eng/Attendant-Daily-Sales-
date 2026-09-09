import React, { useState } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Fuel,
  X,
  User,
  Star,
  Lock,
  CalendarClock,
  CheckSquare,
  Users,
  CheckCircle2,
  ArrowRightLeft,
  Banknote,
} from 'lucide-react';
import { UserProfile } from '../types';

export type AppNavTab =
  | 'dashboard'
  | 'records'
  | 'reports'
  | 'settings'
  | 'shifts'
  | 'tasks'
  | 'profile'
  | 'roster'
  | 'approvals'
  | 'supervisor_sales';

interface SidebarProps {
  activeTab: string;
  onChangeTab: (tab: any) => void;
  onNewRecord: () => void;
  profile: UserProfile;
  draftCount?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  onLogout?: () => void;
  onToggleRole?: (newRole: 'attendant' | 'supervisor') => void;
  onOpenSwitchAttendant?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onChangeTab,
  onNewRecord,
  profile,
  draftCount = 0,
  isCollapsed,
  onToggleCollapse,
  isOpenMobile,
  onCloseMobile,
  onRefresh,
  isRefreshing = false,
  onLogout,
  onToggleRole,
  onOpenSwitchAttendant,
}) => {
  const isSupervisor = profile.role === 'supervisor';
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navItems = isSupervisor
    ? [
        {
          id: 'dashboard' as AppNavTab,
          label: 'Home',
          description: 'Station overview & live KPIs',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'roster' as AppNavTab,
          label: 'Attendance Account Oversight',
          description: 'Attendant accountability & roster',
          icon: Users,
          badge: null,
        },
        {
          id: 'supervisor_sales' as AppNavTab,
          label: 'Supervisor Sales Account',
          description: "Supervisor's own shift & account closing",
          icon: Banknote,
          badge: null,
        },
        {
          id: 'approvals' as AppNavTab,
          label: 'Approvals',
          description: 'Shift sign-offs & claims',
          icon: CheckCircle2,
          badge: draftCount > 0 ? `${draftCount} Pending` : null,
          badgeType: 'amber' as const,
        },
        {
          id: 'reports' as AppNavTab,
          label: 'Reports',
          description: 'Forecourt trends, EOD & dips',
          icon: BarChart3,
          badge: null,
        },
        {
          id: 'settings' as AppNavTab,
          label: 'Settings',
          description: 'Pumps, tanks, prices & profile',
          icon: Settings,
          badge: null,
        },
      ]
    : [
        {
          id: 'dashboard' as AppNavTab,
          label: 'Forecourt Dashboard',
          description: 'Station overview & daily stats',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'shifts' as AppNavTab,
          label: 'Shifts & Schedule',
          description: 'Personal roster & clock in/out',
          icon: CalendarClock,
          badge: null,
        },
        {
          id: 'tasks' as AppNavTab,
          label: 'Daily Task Checklist',
          description: 'Safety, dips & dispenser checks',
          icon: CheckSquare,
          badge: null,
        },
        {
          id: 'records' as AppNavTab,
          label: 'Shift History & Drafts',
          description: 'Shift logs & meter reconciliations',
          icon: ClipboardList,
          badge: draftCount > 0 ? `${draftCount} Draft${draftCount > 1 ? 's' : ''}` : null,
          badgeType: 'amber' as const,
        },
        {
          id: 'profile' as AppNavTab,
          label: 'Attendant Profile',
          description: 'Credentials & personal badge',
          icon: User,
          badge: null,
        },
        {
          id: 'settings' as AppNavTab,
          label: 'Station Settings',
          description: 'Pumps, tanks, prices & profile',
          icon: Settings,
          badge: null,
        },
      ];


  const handleNavClick = (tab: AppNavTab) => {
    onChangeTab(tab);
    if (isOpenMobile) {
      onCloseMobile();
    }
  };

  const handleNewRecordClick = () => {
    onNewRecord();
    if (isOpenMobile) {
      onCloseMobile();
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    if (isOpenMobile) onCloseMobile();
    if (onLogout) onLogout();
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs md:hidden transition-opacity"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-[70] bg-stone-900 text-stone-100 flex flex-col border-r border-stone-800
          transition-all duration-300 ease-in-out shadow-2xl md:shadow-none w-72 max-w-[80vw]
          ${isOpenMobile ? 'translate-x-0 pointer-events-auto' : '-translate-x-full md:translate-x-0 pointer-events-none md:pointer-events-auto'}
          ${isCollapsed ? 'md:w-20' : 'md:w-64 lg:w-72'}
          no-print
        `}
      >
        {/* 1. HEADER SECTION */}
        <div className="p-4 border-b border-stone-800/80 flex items-center justify-between min-h-[70px]">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 overflow-hidden">
            {/* StarOil Custom Branded Crest */}
            <div className="relative shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 via-red-500 to-emerald-600 p-[1.5px] shadow-lg flex items-center justify-center">
              <div className="w-full h-full bg-stone-950 rounded-[14px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 to-emerald-500/20" />
                <div className="relative flex items-center justify-center text-amber-400">
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                  <Fuel className="w-2.5 h-2.5 text-white absolute" />
                </div>
              </div>
            </div>

            {/* Brand Text */}
            {(!isCollapsed || isOpenMobile) && (
              <div className="flex flex-col truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-lg tracking-tight text-white leading-none truncate max-w-[140px]">
                    {profile.companyName || 'Fuel'}<span className="text-amber-400">{profile.companyName ? '' : 'Sync'}</span>
                  </span>
                  <span className="text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    PRO
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-stone-400 tracking-wide mt-0.5 truncate">
                  {profile.station || 'Attendant App'}
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Toggle / Mobile Close Button */}
          <div className="flex items-center">
            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 md:hidden cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Desktop Collapse / Expand Button */}
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-400 hover:text-white border border-stone-700/60 transition-all cursor-pointer shadow-xs"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 text-amber-400" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* 2. PRIMARY ACTION BUTTON */}
        <div className={`p-3.5 border-b border-stone-800/60 ${isCollapsed && !isOpenMobile ? 'px-2.5' : ''}`}>
          <button
            onClick={handleNewRecordClick}
            className={`
              w-full rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2.5 shadow-md cursor-pointer active:scale-98
              ${
                isSupervisor
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 shadow-amber-500/20'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-600/20'
              }
              ${isCollapsed && !isOpenMobile ? 'h-12 w-12 mx-auto p-0 rounded-2xl' : 'py-3 px-4 text-xs tracking-wide'}
            `}
            title={isSupervisor ? "Create New Supervisor's Sales Account" : "Create New Daily Shift Record"}
            id="sidebar-new-daily-record-btn"
          >
            <div
              className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 ${
                isSupervisor ? 'bg-stone-950/20 text-stone-950' : 'bg-white/20 text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            {(!isCollapsed || isOpenMobile) && (
              <div className="text-left truncate">
                <span className="font-extrabold uppercase tracking-wider text-[11px] block leading-tight">
                  + New Daily Record
                </span>
                {isSupervisor && (
                  <span className="text-[9px] font-medium opacity-80 block truncate">
                    Supervisor Sales Account
                  </span>
                )}
              </div>
            )}
          </button>
        </div>

        {/* 3. VERTICAL NAVIGATION LINKS */}
        <div className="flex-1 overflow-y-auto py-3 px-2.5 space-y-1.5 custom-scrollbar">
          {(!isCollapsed || isOpenMobile) && (
            <div className="px-3 pb-1 pt-0.5 text-[10px] font-extrabold uppercase tracking-widest text-stone-500">
              Main Menu
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === 'records' && (activeTab === 'detail' || activeTab === 'success')) ||
              (item.id === 'dashboard' && activeTab === 'wizard');

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`
                  w-full rounded-2xl flex items-center transition-all duration-150 group cursor-pointer text-left relative
                  ${isCollapsed && !isOpenMobile ? 'h-12 w-12 mx-auto justify-center p-0' : 'p-2.5 gap-3'}
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-950/80 to-stone-800/90 text-white font-bold border border-emerald-600/40 shadow-sm'
                      : 'text-stone-300 hover:text-white hover:bg-stone-800/60 font-medium'
                  }
                `}
                title={isCollapsed && !isOpenMobile ? item.label : undefined}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r-full" />
                )}

                {/* Icon */}
                <div
                  className={`
                    w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105
                    ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-stone-800 text-stone-400 group-hover:text-stone-200 group-hover:bg-stone-700'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                </div>

                {/* Text Labels */}
                {(!isCollapsed || isOpenMobile) && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold truncate leading-tight">
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded-md shadow-xs">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-400 truncate mt-0.5">
                      {item.description}
                    </p>
                  </div>
                )}

                {/* Collapsed Badge Dot */}
                {isCollapsed && !isOpenMobile && item.badge && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-stone-900" />
                )}
              </button>
            );
          })}

          {/* Quick Station Branch Badge in Menu */}
          {(!isCollapsed || isOpenMobile) && (
            <div className="pt-4 px-2">
              <div className="p-3 bg-stone-950/60 rounded-2xl border border-stone-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-amber-400" /> Assigned Station
                  </span>
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                  </span>
                </div>
                <div className="font-bold text-xs text-stone-200 flex items-center gap-1.5 flex-wrap">
                  {profile.stationCode && (
                    <span className="font-mono text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {profile.stationCode}
                    </span>
                  )}
                  <span className="truncate">{profile.station || 'Tema Main Station'}</span>
                </div>
                <div className="text-[10px] text-stone-400 truncate">
                  Supv: {profile.supervisor || 'Kofi Asare'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 4. USER PROFILE SECTION */}
        <div className="p-3 border-t border-stone-800/80 bg-stone-950/40 space-y-2">
          <div
            onClick={() => handleNavClick('settings')}
            className={`
              rounded-2xl p-2 bg-stone-800/60 hover:bg-stone-800 border border-stone-700/60 transition-all cursor-pointer flex items-center
              ${isCollapsed && !isOpenMobile ? 'justify-center p-1.5' : 'gap-3'}
            `}
            title="View attendant profile & settings"
          >
            {/* User Avatar */}
            <div className="relative shrink-0">
              <div className={`w-9 h-9 rounded-xl font-black flex items-center justify-center text-xs shadow-xs ${
                isSupervisor
                  ? 'bg-gradient-to-tr from-amber-500 to-amber-300 text-stone-950'
                  : 'bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white'
              }`}>
                {isSupervisor
                  ? (profile.supervisor ? profile.supervisor.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'SV')
                  : (profile.attendant ? profile.attendant.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AT')}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-stone-900 ${
                isSupervisor ? 'bg-amber-400' : 'bg-emerald-500'
              }`} />
            </div>

            {/* User Details */}
            {(!isCollapsed || isOpenMobile) && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white truncate">
                    {isSupervisor ? (profile.supervisor || 'Supervisor') : (profile.attendant || 'Attendant')}
                  </span>
                  <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border flex items-center gap-0.5 ${
                    isSupervisor
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    <ShieldCheck className="w-2.5 h-2.5" />
                    {isSupervisor ? 'Supervisor' : 'Attendant'}
                  </span>
                </div>
                <span className="text-[10px] text-stone-400 truncate block mt-0.5 font-mono">
                  {profile.phone || profile.email || 'Shift Operator'} {profile.staffId ? `• ${profile.staffId}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 5. FOOTER SECTION: UTILITY ACTIONS & COPYRIGHT */}
        <div className="p-3 pb-5 safe-area-bottom border-t border-stone-800 text-stone-400 text-xs bg-stone-950/70 space-y-2">
          <div className="flex items-center gap-1.5 justify-between">
            {/* Quick Refresh Button */}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`
                  flex-1 py-1.5 px-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700/60
                  text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50
                  ${isCollapsed && !isOpenMobile ? 'h-9 w-9 p-0 flex-none mx-auto' : ''}
                `}
                title="Sync station records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
                {(!isCollapsed || isOpenMobile) && <span>Sync</span>}
              </button>
            )}

            {/* Logout / Lock Session Action */}
            <button
              type="button"
              onClick={handleLogoutClick}
              className={`
                flex-1 py-1.5 px-2 rounded-xl bg-stone-800/80 hover:bg-rose-950/50 text-stone-300 hover:text-rose-300 border border-stone-700/60 hover:border-rose-800/50
                text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer
                ${isCollapsed && !isOpenMobile ? 'h-9 w-9 p-0 flex-none mx-auto' : ''}
              `}
              title="Lock Shift & Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              {(!isCollapsed || isOpenMobile) && <span>Logout</span>}
            </button>
          </div>

          {/* Copyright & Version Info */}
          {(!isCollapsed || isOpenMobile) && (
            <div className="pt-1 text-center border-t border-stone-800/60">
              <p className="text-[10px] text-stone-400 font-medium">
                © 2026 {profile.companyName || 'Fuel Station Management'}
              </p>
              <p className="text-[9px] text-stone-400 font-mono">
                Attendant App v2.4 • All Rights Reserved
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* Logout / Session Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-stone-200 overflow-hidden text-stone-900 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-stone-900">Lock Shift &amp; Logout?</h3>
                <p className="text-xs text-stone-500">
                  Attendant: <span className="font-semibold text-stone-800">{profile.attendant || 'Daniel'}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200">
              Your logged shift records and pump calibrations are saved locally. You can log back in or switch attendants anytime.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <LogOut className="w-3.5 h-3.5" /> Confirm Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
