import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Building2,
  User,
  Menu,
  Star,
  Fuel,
  Plus,
  ShieldCheck,
  Users,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Settings,
  CheckCircle2,
  ChevronDown,
  LogOut,
  RefreshCw,
  FileSpreadsheet,
  X,
  Clock,
  Layers,
  ArrowRightLeft,
  IdCard,
  Banknote,
} from 'lucide-react';
import { UserProfile } from '../types';
import { AppView } from '../App';

interface NavbarProps {
  profile: UserProfile;
  activeTab?: AppView;
  onNavigate?: (view: AppView) => void;
  onOpenSettings?: () => void;
  onOpenMobileMenu?: () => void;
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  onNewRecord?: () => void;
  onToggleRole?: (newRole: 'attendant' | 'supervisor') => void;
  onOpenSwitchAttendant?: () => void;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  onLogout?: () => void;
  draftCount?: number;
  title?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  activeTab = 'dashboard',
  onNavigate,
  onOpenSettings,
  onOpenMobileMenu,
  onToggleSidebar,
  isSidebarCollapsed,
  onNewRecord,
  onToggleRole,
  onOpenSwitchAttendant,
  onRefresh,
  isRefreshing = false,
  onLogout,
  draftCount = 0,
  title,
}) => {
  const isSupervisor = profile.role === 'supervisor';
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleNavClick = (view: AppView) => {
    setIsDropdownOpen(false);
    if (onNavigate) {
      onNavigate(view);
    }
  };

  const navMenuItems: { id: AppView; label: string; icon: React.ElementType; badge?: string | number | null }[] = isSupervisor
    ? [
        { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
        { id: 'roster', label: 'Team', icon: Users },
        { id: 'supervisor_sales', label: 'Supervisor Sales Account', icon: Banknote },
        {
          id: 'approvals',
          label: 'Approvals',
          icon: CheckCircle2,
          badge: draftCount > 0 ? draftCount : null,
        },
        { id: 'reports', label: 'Reports', icon: BarChart3 },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    : [
        { id: 'dashboard', label: 'Attendant Dashboard', icon: LayoutDashboard },
        { id: 'shifts', label: 'My Shift History', icon: Clock },
        { id: 'records', label: 'Shift Records & Audits', icon: ClipboardList },
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
        { id: 'profile', label: 'Personal Information', icon: User },
        { id: 'settings', label: 'Station Settings', icon: Settings },
      ];

  const handleMenuButtonClick = () => {
    // Open drawer on mobile or toggle sidebar on desktop
    if (window.innerWidth < 768) {
      if (onOpenMobileMenu) onOpenMobileMenu();
    } else {
      if (onToggleSidebar) {
        onToggleSidebar();
      } else if (onOpenMobileMenu) {
        onOpenMobileMenu();
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 w-full max-w-full bg-stone-900 text-stone-100 border-b border-stone-800 shadow-md no-print overflow-hidden">
      {/* Primary Top Bar */}
      <div className="w-full max-w-full px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Left: Menu Button & Branding */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Universal Menu Button (Visible on all screen sizes) */}
          <button
            type="button"
            onClick={handleMenuButtonClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 hover:text-white border border-stone-700/80 transition-all cursor-pointer shadow-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            aria-label="Toggle navigation menu"
            title="Toggle Navigation Menu Bar & Sidebar"
            id="navbar-menu-toggle-btn"
          >
            <Menu className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold tracking-tight">Menu</span>
          </button>

          {/* StarOil Crest & Station Info */}
          <div
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-amber-500 via-red-500 to-emerald-600 p-[1.5px] shadow-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-stone-950 rounded-[10px] flex items-center justify-center relative">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <Fuel className="w-2 h-2 text-white absolute" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 font-bold text-sm tracking-tight text-white leading-none">
                <span>Star<span className="text-amber-400">Oil</span></span>
                <span className="hidden sm:inline text-[11px] font-normal text-stone-400">· {title || 'Forecourt'}</span>
                {isSupervisor ? (
                  <span className="inline-flex items-center gap-1 text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <ShieldCheck className="w-2.5 h-2.5 text-amber-400" /> Supervisor
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-400" /> Attendant
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-stone-400 font-medium mt-0.5">
                <Building2 className="w-3 h-3 text-amber-400/80 shrink-0" />
                {profile.stationCode && (
                  <span className="font-mono text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                    {profile.stationCode}
                  </span>
                )}
                <span className="truncate max-w-[110px] xs:max-w-[160px] sm:max-w-[260px]">
                  {profile.station || 'Tema Main Station'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions, Role Switcher, Menu Dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick Refresh Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={() => onRefresh()}
              disabled={isRefreshing}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700/80 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Refresh Data & Records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : 'text-stone-300'}`} />
              <span className="hidden md:inline">Refresh</span>
            </button>
          )}

          {/* Quick Role Switcher Button */}
          {onToggleRole && (
            <button
              type="button"
              onClick={() => onToggleRole(isSupervisor ? 'attendant' : 'supervisor')}
              className={`flex items-center gap-1.5 py-1.5 px-2 sm:px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isSupervisor
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                  : 'bg-stone-800 border-stone-700 text-stone-300 hover:text-white hover:bg-stone-700'
              }`}
              title={isSupervisor ? 'Switch to Attendant Mode' : 'Switch to Supervisor Mode'}
            >
              {isSupervisor ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Supervisor</span>
                </>
              ) : (
                <>
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Attendant</span>
                </>
              )}
            </button>
          )}

          {/* New Record Button for Attendant & Supervisor */}
          {onNewRecord && (
            <button
              type="button"
              onClick={onNewRecord}
              className={`flex items-center gap-1.5 py-1.5 px-2.5 sm:px-3 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
                isSupervisor
                  ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-amber-500/10'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/10'
              }`}
              title={isSupervisor ? "Create New Supervisor's Sales Account" : "Create New Daily Shift Record"}
              id="navbar-new-daily-record-btn"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span className="hidden xs:inline">New Daily Record</span>
            </button>
          )}

          {/* Profile & Navigation Menu Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-semibold text-stone-200 transition-colors cursor-pointer"
              title="Open Navigation Menu & Profile"
              id="navbar-profile-menu-btn"
              aria-expanded={isDropdownOpen}
            >
              <div
                className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shadow-xs ${
                  isSupervisor ? 'bg-amber-500 text-stone-950' : 'bg-emerald-600 text-white'
                }`}
              >
                {isSupervisor
                  ? (profile.supervisor ? profile.supervisor[0].toUpperCase() : 'S')
                  : (profile.attendant ? profile.attendant[0].toUpperCase() : 'A')}
              </div>
              <div className="text-left hidden lg:block">
                <span className="block text-[11px] font-bold text-white leading-tight truncate max-w-[90px]">
                  {isSupervisor ? (profile.supervisor || 'Supervisor') : (profile.attendant || 'Attendant')}
                </span>
                <span className={`block text-[9px] font-mono ${isSupervisor ? 'text-amber-300' : 'text-emerald-400'}`}>
                  {isSupervisor ? 'Supervisor' : 'Attendant'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform ${isDropdownOpen ? 'rotate-180 text-amber-400' : ''}`} />
            </button>

            {/* Dropdown Menu Flyout */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-stone-900 border border-stone-700/90 shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                {/* User Summary Header */}
                <div className="px-3.5 py-2.5 border-b border-stone-800 mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl font-black text-sm flex items-center justify-center shrink-0 ${
                      isSupervisor ? 'bg-amber-500 text-stone-950' : 'bg-emerald-600 text-white'
                    }`}>
                      {isSupervisor
                        ? (profile.supervisor ? profile.supervisor[0].toUpperCase() : 'S')
                        : (profile.attendant ? profile.attendant[0].toUpperCase() : 'A')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {isSupervisor ? (profile.supervisor || 'Station Supervisor') : (profile.attendant || 'Station Attendant')}
                      </p>
                      <p className="text-[10px] text-stone-400 font-mono truncate">
                        {profile.staffId || (isSupervisor ? 'SUP-001' : 'ATT-001')} · {isSupervisor ? 'Supervisor' : 'Attendant'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Navigation Links in Menu */}
                <div className="px-1.5 space-y-0.5 max-h-64 overflow-y-auto">
                  <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                    Application Menu
                  </div>
                  {navMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleNavClick(item.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-amber-500 text-stone-950'
                            : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-stone-950' : 'text-stone-400'}`} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                            isActive ? 'bg-stone-950 text-amber-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Role Switcher & Sign Out */}
                <div className="border-t border-stone-800 mt-2 pt-1.5 px-1.5 space-y-1">
                  {isSupervisor && onToggleRole && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        onToggleRole('attendant');
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
                    >
                      <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                      <span>Switch to Attendant Mode</span>
                    </button>
                  )}

                  {onLogout && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setShowLogoutModal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Sign Out Account</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Horizontal Quick-Menu Navigation Bar (Desktop & Tablet) */}
      <nav aria-label="Quick Menu Bar" className="w-full max-w-full bg-stone-950/80 px-3 border-t border-stone-800/80 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 py-1 w-max max-w-none">
          {navMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'text-stone-400 hover:text-stone-100 hover:bg-stone-850'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-stone-950' : 'text-stone-400'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    isActive ? 'bg-stone-950 text-amber-300' : 'bg-amber-500/30 text-amber-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Logout Confirmation Dialog */}
      {showLogoutModal && onLogout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
              <LogOut className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              Sign Out from Account?
            </h3>
            <p className="text-xs text-stone-400 mb-5">
              You will be logged out of your session on station <strong className="text-stone-200">{profile.station}</strong>. Unsaved drafts in progress are preserved in storage.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-300 hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  onLogout();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
