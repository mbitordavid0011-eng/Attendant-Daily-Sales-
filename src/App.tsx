import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { SupervisorDashboard } from './components/SupervisorDashboard';
import { HistoryList } from './components/HistoryList';
import { ReportsView } from './components/ReportsView';
import { StationSettings } from './components/StationSettings';
import { WizardContainer } from './components/Wizard/WizardContainer';
import { RecordDetail } from './components/RecordDetail';
import { SuccessView } from './components/SuccessView';
import { AuthScreen } from './components/Auth/AuthScreen';
import { MyShiftsView } from './components/Attendant/MyShiftsView';
import { TasksChecklistView } from './components/Attendant/TasksChecklistView';
import { ProfileView } from './components/Attendant/ProfileView';
import { TeamRosterView } from './components/Supervisor/TeamRosterView';
import { ApprovalsView } from './components/Supervisor/ApprovalsView';
import { SupervisorSalesAccountView } from './components/Supervisor/SupervisorSalesAccountView';
import { UnassignedAttendantView } from './components/Attendant/UnassignedAttendantView';
import { PullToRefresh } from './components/PullToRefresh';
import { ShiftRecord, StationConfig, UserProfile, AuthUser } from './types';
import {
  getProfile,
  saveProfile,
  getStations,
  saveStations,
  getAllRecords,
  deleteRecord,
  saveRecord,
  syncRecordsFromFirestore,
  subscribeToShiftRecords,
} from './services/storage';
import { getCurrentUser, setCurrentUser, logoutCurrentUser, getAllAccounts, saveAccounts, initAuthListener, ensureFirebaseAuthSession } from './services/auth';
import { createNewRecord, generateId } from './utils/calculations';
import { getRecordById } from './services/storage';

export type AppView =
  | 'dashboard'
  | 'records'
  | 'reports'
  | 'settings'
  | 'wizard'
  | 'detail'
  | 'success'
  | 'shifts'
  | 'tasks'
  | 'profile'
  | 'roster'
  | 'approvals'
  | 'supervisor_sales'
  | 'excel';

const VALID_VIEWS: AppView[] = [
  'dashboard',
  'records',
  'reports',
  'settings',
  'wizard',
  'detail',
  'success',
  'shifts',
  'tasks',
  'profile',
  'roster',
  'approvals',
  'supervisor_sales',
  'excel',
];

function getInitialNavigationState(): { view: AppView; recordId: string | null } {
  try {
    const rawHash = typeof window !== 'undefined' ? window.location.hash : '';
    const hash = rawHash.replace(/^#\/?/, '');
    if (hash) {
      const [viewPart, queryPart] = hash.split('?');
      const cleanView = viewPart.trim().toLowerCase() as AppView;
      const params = new URLSearchParams(queryPart || '');
      const paramId = params.get('id') || params.get('recordId');
      if (VALID_VIEWS.includes(cleanView)) {
        return {
          view: cleanView,
          recordId: paramId || (typeof localStorage !== 'undefined' ? localStorage.getItem('staroil_active_record_id') : null),
        };
      }
    }

    if (typeof localStorage !== 'undefined') {
      const savedView = localStorage.getItem('staroil_active_view') as AppView | null;
      const savedRecordId = localStorage.getItem('staroil_active_record_id');
      if (savedView && VALID_VIEWS.includes(savedView)) {
        return { view: savedView, recordId: savedRecordId || null };
      }
    }
  } catch (e) {
    console.error('Failed to parse initial route:', e);
  }
  return { view: 'dashboard', recordId: null };
}

export default function App() {
  const [currentUser, setCurrentUserState] = useState<AuthUser | null>(() => getCurrentUser());
  
  const initialNav = getInitialNavigationState();
  const [view, setViewState] = useState<AppView>(initialNav.view);
  const [activeRecord, setActiveRecordState] = useState<ShiftRecord | null>(() => {
    if (initialNav.recordId) {
      const found = getRecordById(initialNav.recordId);
      if (found) return found;
    }
    return null;
  });

  const [profile, setProfile] = useState<UserProfile>(getProfile());
  const [stations, setStations] = useState<StationConfig[]>(getStations());
  const [records, setRecords] = useState<ShiftRecord[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [supervisorSalesModalTrigger, setSupervisorSalesModalTrigger] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('staroil_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Clear any legacy app lock states
  useEffect(() => {
    try {
      localStorage.removeItem('staroil_app_is_locked');
      localStorage.removeItem('staroil_app_lock_config');
      localStorage.removeItem('staroil_app_lock_lockout_until');
      localStorage.removeItem('staroil_app_lock_failed_attempts');
      localStorage.removeItem('staroil_app_last_active');
    } catch {}
  }, []);

  // Load records initially and restore active record if needed
  useEffect(() => {
    const loaded = getAllRecords();
    setRecords(loaded);
    
    // If activeRecord is null but we have an active record ID or are in detail/wizard view, restore it
    const storedId = localStorage.getItem('staroil_active_record_id');
    if (storedId && !activeRecord) {
      const rec = loaded.find((r) => r.id === storedId) || getRecordById(storedId);
      if (rec) {
        setActiveRecordState(rec);
      }
    }

    // Firebase Auth session observer
    const unsubscribeAuth = initAuthListener((newUser) => {
      if (newUser) {
        setCurrentUserState(newUser);
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Synchronize authenticated Firestore records for active user
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    let unsubscribeRecords: (() => void) | null = null;

    ensureFirebaseAuthSession(currentUser).then(() => {
      if (!isMounted) return;

      syncRecordsFromFirestore(currentUser).then((remoteRecords) => {
        if (isMounted && remoteRecords && remoteRecords.length > 0) {
          setRecords(remoteRecords);
        }
      });

      unsubscribeRecords = subscribeToShiftRecords((updatedRecords) => {
        if (isMounted && updatedRecords && updatedRecords.length > 0) {
          setRecords(updatedRecords);
        }
      }, currentUser);
    });

    return () => {
      isMounted = false;
      if (unsubscribeRecords) unsubscribeRecords();
    };
  }, [currentUser?.id, currentUser?.station, currentUser?.role]);

  // Synchronize navigation state with URL hash and localStorage
  const navigateTo = (newView: AppView, record?: ShiftRecord | null, options?: { replace?: boolean }) => {
    setViewState(newView);
    try {
      localStorage.setItem('staroil_active_view', newView);
    } catch {}

    let recToSave: ShiftRecord | null = null;
    if (record !== undefined) {
      setActiveRecordState(record);
      recToSave = record;
    } else if (activeRecord) {
      recToSave = activeRecord;
    }

    if (recToSave && recToSave.id) {
      try {
        localStorage.setItem('staroil_active_record_id', recToSave.id);
      } catch {}
    } else if (record === null) {
      try {
        localStorage.removeItem('staroil_active_record_id');
      } catch {}
    }

    // Construct URL hash
    const hashTarget =
      recToSave && (newView === 'wizard' || newView === 'detail' || newView === 'success')
        ? `#/${newView}?id=${recToSave.id}`
        : `#/${newView}`;

    if (window.location.hash !== hashTarget) {
      if (options?.replace) {
        window.history.replaceState(null, '', hashTarget);
      } else {
        window.location.hash = hashTarget;
      }
    }
  };

  // Browser hashchange & popstate listener for back/forward support
  useEffect(() => {
    const handleHashChange = () => {
      const nav = getInitialNavigationState();
      setViewState(nav.view);
      try {
        localStorage.setItem('staroil_active_view', nav.view);
      } catch {}

      if (nav.recordId) {
        const rec = getRecordById(nav.recordId);
        if (rec) {
          setActiveRecordState(rec);
          try {
            localStorage.setItem('staroil_active_record_id', rec.id);
          } catch {}
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    // Ensure hash reflects current view on mount
    const currentHash = window.location.hash.replace(/^#\/?/, '');
    if (!currentHash) {
      const initialHash =
        activeRecord && (view === 'wizard' || view === 'detail' || view === 'success')
          ? `#/${view}?id=${activeRecord.id}`
          : `#/${view}`;
      window.history.replaceState(null, '', initialHash);
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, [view, activeRecord]);

  // Safety fallback for views requiring an active record (wizard/detail)
  useEffect(() => {
    if (view === 'wizard' && !activeRecord) {
      const storedId = localStorage.getItem('staroil_active_record_id');
      if (storedId) {
        const rec = getRecordById(storedId);
        if (rec) {
          setActiveRecordState(rec);
          return;
        }
      }
      // Check for any drafts
      const draft = records.find((r) => r.status === 'draft');
      if (draft) {
        setActiveRecordState(draft);
        return;
      }
      // Create new record as fallback
      const matchedStation =
        stations.find(
          (s) => s.name.trim().toLowerCase() === profile.station.trim().toLowerCase()
        ) || stations[0];
      const newRec = createNewRecord(profile, matchedStation);
      saveRecord(newRec);
      setActiveRecordState(newRec);
    } else if (view === 'detail' && !activeRecord) {
      const storedId = localStorage.getItem('staroil_active_record_id');
      if (storedId) {
        const rec = getRecordById(storedId);
        if (rec) {
          setActiveRecordState(rec);
          return;
        }
      }
      if (records.length > 0) {
        setActiveRecordState(records[0]);
      } else {
        navigateTo('records', null, { replace: true });
      }
    }
  }, [view, activeRecord, records, profile, stations]);

  const handleAuthenticated = (user: AuthUser) => {
    setCurrentUserState(user);
    const updatedProfile = getProfile();
    setProfile(updatedProfile);
    
    // Preserve any existing hash route if valid, otherwise go to dashboard
    const nav = getInitialNavigationState();
    if (nav.view && nav.view !== 'dashboard') {
      navigateTo(nav.view);
    } else {
      navigateTo('dashboard');
    }
  };

  const handleLogout = () => {
    logoutCurrentUser();
    setCurrentUserState(null);
    navigateTo('dashboard', null);
  };

  const handleToggleRole = (newRole: 'attendant' | 'supervisor') => {
    // Security: An attendant cannot switch into supervisor mode
    if (newRole === 'supervisor' && currentUser?.role === 'attendant') {
      return;
    }
    const updated: UserProfile = { ...profile, role: newRole };
    setProfile(updated);
    saveProfile(updated);
    if (currentUser) {
      const updatedUser: AuthUser = { ...currentUser, role: newRole };
      setCurrentUserState(updatedUser);
      setCurrentUser(updatedUser);
    }
  };

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('staroil_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const refreshRecords = () => {
    const loaded = getAllRecords();
    setRecords(loaded);
    setProfile(getProfile());
    setStations(getStations());
    setLastRefreshed(new Date());

    // If activeRecord exists, refresh its data in state without resetting screen
    if (activeRecord) {
      const updatedRec = loaded.find((r) => r.id === activeRecord.id) || getRecordById(activeRecord.id);
      if (updatedRec) {
        setActiveRecordState(updatedRec);
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const remote = await syncRecordsFromFirestore();
      if (remote && remote.length > 0) {
        setRecords(remote);
      }
    } catch (e) {}
    refreshRecords();
    const loadedStations = getStations();
    setStations(loadedStations);
    const loadedProfile = getProfile();
    if (loadedProfile) setProfile(loadedProfile);
    setLastRefreshed(new Date());
    // Micro-delay just for UI animation frame rendering
    await new Promise((resolve) => setTimeout(resolve, 80));
    setIsRefreshing(false);
  };

  const handleSaveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    saveProfile(newProfile);
    if (currentUser) {
      const updatedUser: AuthUser = {
        ...currentUser,
        fullName: newProfile.supervisor || newProfile.attendant || currentUser.fullName,
        station: newProfile.station || currentUser.station,
        stationCode: newProfile.stationCode || currentUser.stationCode,
        supervisor: newProfile.supervisor || currentUser.supervisor,
        staffId: newProfile.staffId || currentUser.staffId,
        identifier: (newProfile.email || newProfile.phone) || currentUser.identifier,
        authType: newProfile.authType || currentUser.authType,
      };
      setCurrentUserState(updatedUser);
      setCurrentUser(updatedUser);
      try {
        const accounts = getAllAccounts();
        const updatedAccounts = accounts.map((a) => (a.id === updatedUser.id ? updatedUser : a));
        saveAccounts(updatedAccounts);
      } catch (err) {
        console.error('Failed to sync accounts list', err);
      }
    }
  };

  const handleSaveStations = (newStations: StationConfig[]) => {
    setStations(newStations);
    saveStations(newStations);
  };

  const handleStartNewRecord = () => {
    if (isSupervisor) {
      if (view !== 'dashboard') {
        navigateTo('dashboard');
      }
      setSupervisorSalesModalTrigger((prev) => prev + 1);
      return;
    }

    const matchedStation = stations.find(
      (s) => s.name.trim().toLowerCase() === profile.station.trim().toLowerCase()
    ) || stations[0];

    const newRec = createNewRecord(profile, matchedStation);
    saveRecord(newRec);
    navigateTo('wizard', newRec);
  };

  const handleResumeDraft = (draft: ShiftRecord) => {
    navigateTo('wizard', draft);
  };

  const handleSelectRecord = (record: ShiftRecord) => {
    navigateTo('detail', record);
  };

  const handleEditRecord = (record: ShiftRecord, mode: 'direct' | 'revision' = 'direct') => {
    if (record.status === 'draft' || mode === 'direct') {
      const updated: ShiftRecord = {
        ...record,
        _step: 1,
      };
      saveRecord(updated);
      navigateTo('wizard', updated);
    } else {
      const revisedCopy: ShiftRecord = {
        ...JSON.parse(JSON.stringify(record)),
        id: generateId(),
        revisionOf: record.id,
        status: 'draft',
        createdAt: new Date().toISOString(),
        submittedAt: undefined,
        _step: 1,
      };
      saveRecord(revisedCopy);
      navigateTo('wizard', revisedCopy);
    }
  };

  const handleDeleteRecord = (id: string) => {
    deleteRecord(id);
    refreshRecords();
    navigateTo('records', null);
  };

  const handleVerifyRecord = (updatedRecord: ShiftRecord) => {
    saveRecord(updatedRecord);
    setActiveRecordState(updatedRecord);
    refreshRecords();
  };

  const handleRecordSubmitted = (submitted: ShiftRecord) => {
    setActiveRecordState(submitted);
    refreshRecords();
    navigateTo('success', submitted);
  };

  // Listen for background updates to current user session (e.g. cross-tab or supervisor approval)
  useEffect(() => {
    if (!currentUser) return;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'staroil_auth_current_user') {
        const u = getCurrentUser();
        if (u) {
          setCurrentUserState(u);
          setProfile(getProfile());
        }
      }
    };
    const handleCustomChange = () => {
      const u = getCurrentUser();
      if (u) {
        setCurrentUserState(u);
        setProfile(getProfile());
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('staroil_auth_user_updated', handleCustomChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('staroil_auth_user_updated', handleCustomChange);
    };
  }, [currentUser]);

  // If user has not created/verified an account, guard the app with AuthScreen
  if (!currentUser || !currentUser.isVerified) {
    return <AuthScreen stations={stations} onAuthenticated={handleAuthenticated} />;
  }

  // If user is an attendant who has not yet joined a station, route to UnassignedAttendantView
  const isUnassignedAttendant =
    currentUser.role === 'attendant' &&
    (!currentUser.station ||
      currentUser.station.trim().toLowerCase() === 'unassigned' ||
      currentUser.station.trim().toLowerCase() === 'pending assignment' ||
      !currentUser.stationCode ||
      currentUser.stationCode.trim() === '');

  if (isUnassignedAttendant) {
    return (
      <UnassignedAttendantView
        currentUser={currentUser}
        stations={stations}
        onStationAssigned={(updatedUser) => {
          setCurrentUserState(updatedUser);
          const updatedProfile = getProfile();
          setProfile(updatedProfile);
          refreshRecords();
          navigateTo('dashboard');
        }}
        onLogout={handleLogout}
      />
    );
  }

  const isSupervisor = profile.role === 'supervisor';
  const draftCount = records.filter((r) => r.status === 'draft').length;

  const getPageTitle = () => {
    switch (view) {
      case 'dashboard':
        return isSupervisor ? 'Supervisor Oversight' : 'Forecourt Dashboard';
      case 'shifts':
        return 'Shifts & Schedule';
      case 'tasks':
        return 'Forecourt Daily Checklist';
      case 'profile':
        return 'Attendant Profile & Credentials';
      case 'roster':
        return 'Station Team Roster';
      case 'approvals':
        return 'Shift Approvals & Timesheets';
      case 'records':
        return isSupervisor ? 'All Attendant Shift Sheets' : 'Shift History & Drafts';
      case 'reports':
        return isSupervisor ? 'Station Analytics & Reports' : 'Analytics & 24h EOD';
      case 'settings':
        return 'Station & System Settings';
      case 'wizard':
        return 'Shift Reconciliation Sheet';
      case 'detail':
        return 'Shift Audit Detail';
      case 'success':
        return 'Shift Submission Completed';
      default:
        return profile.companyName ? `${profile.companyName} Forecourt` : 'Station Forecourt';
    }
  };

  const currentStation = stations.find(
    (s) => s.name.trim().toLowerCase() === profile.station.trim().toLowerCase()
  ) || stations[0];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-stone-100 font-sans text-stone-900 flex flex-col">
      {/* 1. Left-hand Persistent Navigation Sidebar */}
      <Sidebar
        activeTab={view}
        onChangeTab={(tab) => navigateTo(tab)}
        onNewRecord={handleStartNewRecord}
        profile={profile}
        draftCount={draftCount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        onLogout={handleLogout}
        onToggleRole={handleToggleRole}
      />

      {/* 2. Main Content Area with Dynamic Left Padding for Sidebar */}
      <div
        className={`
          flex-1 flex flex-col w-full max-w-full min-w-0 transition-all duration-300 ease-in-out overflow-x-hidden
          ${isSidebarCollapsed ? 'md:pl-20' : 'md:pl-64 lg:pl-72'}
        `}
      >
        {/* Top Navbar Header */}
        {view !== 'wizard' && view !== 'detail' && view !== 'success' && (
          <Navbar
            profile={profile}
            activeTab={view}
            onNavigate={(tab) => navigateTo(tab)}
            onOpenSettings={() => navigateTo('settings')}
            onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
            onToggleSidebar={handleToggleSidebarCollapse}
            isSidebarCollapsed={isSidebarCollapsed}
            onNewRecord={handleStartNewRecord}
            onToggleRole={handleToggleRole}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
            onLogout={handleLogout}
            draftCount={draftCount}
            title={getPageTitle()}
          />
        )}

        {/* View Router with Global Swipe Down to Refresh */}
        <PullToRefresh
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          variant={isSupervisor && view === 'dashboard' ? 'dark' : 'light'}
          disabled={view === 'wizard'}
        >
          <div className={`flex-1 w-full max-w-full ${isSupervisor && view === 'dashboard' ? 'md:max-w-none' : 'md:max-w-7xl'} mx-auto pb-24 md:pb-8 transition-all min-w-0`}>
            {view === 'dashboard' && (
              <main className={`w-full max-w-full min-w-0 ${isSupervisor ? "p-0" : "p-2.5 sm:p-4 md:p-6 lg:p-8"}`}>
                {isSupervisor ? (
                  <SupervisorDashboard
                    records={records}
                    profile={profile}
                    stations={stations}
                    triggerNewSalesAccount={supervisorSalesModalTrigger}
                    onSaveProfile={handleSaveProfile}
                    onSelectRecord={handleSelectRecord}
                    onVerifyRecord={handleVerifyRecord}
                    onSwitchRole={handleToggleRole}
                    onOpenSettings={() => navigateTo('settings')}
                    onOpenSupervisorSales={() => navigateTo('supervisor_sales')}
                    onOpenExcelSheet={() => navigateTo('excel')}
                    onNewRecord={() => navigateTo('supervisor_sales')}
                    onResumeDraft={handleResumeDraft}
                    onViewAllRecords={() => navigateTo('records')}
                  />
                ) : (
                  <Dashboard
                    records={records}
                    profile={profile}
                    onNewRecord={handleStartNewRecord}
                    onResumeDraft={handleResumeDraft}
                    onSelectRecord={handleSelectRecord}
                    onViewAllRecords={() => navigateTo('records')}
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshing}
                    lastRefreshed={lastRefreshed}
                  />
                )}
              </main>
            )}

            {view === 'shifts' && (
              <main className="w-full max-w-full min-w-0 p-2.5 sm:p-4 md:p-6 lg:p-8">
                <MyShiftsView
                  profile={profile}
                  records={records}
                  onStartShift={handleStartNewRecord}
                  onResumeDraft={handleResumeDraft}
                  onSelectRecord={handleSelectRecord}
                />
              </main>
            )}

            {view === 'tasks' && (
              <main className="w-full max-w-full min-w-0 p-2.5 sm:p-4 md:p-6 lg:p-8">
                <TasksChecklistView profile={profile} />
              </main>
            )}

            {view === 'profile' && (
              <main className="w-full max-w-full min-w-0 p-2.5 sm:p-4 md:p-6 lg:p-8">
                <ProfileView
                  profile={profile}
                  onSaveProfile={handleSaveProfile}
                  onSwitchRole={handleToggleRole}
                  stations={stations}
                />
              </main>
            )}

            {isSupervisor && view === 'roster' && (
              <main className="w-full max-w-full min-w-0 p-2.5 sm:p-4 md:p-6 lg:p-8">
                <TeamRosterView profile={profile} stations={stations} />
              </main>
            )}

            {isSupervisor && view === 'supervisor_sales' && (
              <main className="w-full max-w-full min-w-0 p-2.5 sm:p-4 md:p-6 lg:p-8">
                <SupervisorSalesAccountView
                  profile={profile}
                  stations={stations}
                  onBackToHome={() => navigateTo('dashboard')}
                />
              </main>
            )}

            {isSupervisor && view === 'approvals' && (
              <main className="w-full max-w-full min-w-0 p-2.5 sm:p-4 md:p-6 lg:p-8">
                <ApprovalsView
                  profile={profile}
                  records={records}
                  onSelectRecord={handleSelectRecord}
                />
              </main>
            )}

            {view === 'records' && (
              <main className="w-full max-w-full min-w-0 p-2.5 sm:p-4 md:p-6 lg:p-8">
                <HistoryList
                  records={records}
                  profile={profile}
                  onSelectRecord={handleSelectRecord}
                  onRefresh={handleRefresh}
                  isRefreshing={isRefreshing}
                />
              </main>
            )}

            {view === 'reports' && (
              <main className="w-full max-w-full min-w-0 p-2.5 sm:p-4 md:p-6 lg:p-8">
                <ReportsView records={records} />
              </main>
            )}

            {view === 'settings' && (
              <main className="w-full max-w-full min-w-0 p-2.5 sm:p-4 md:p-6 lg:p-8">
                <StationSettings
                  stations={stations}
                  profile={profile}
                  onSaveProfile={handleSaveProfile}
                  onSaveStations={handleSaveStations}
                />
              </main>
            )}

            {view === 'wizard' && activeRecord && (
              <div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
                <WizardContainer
                  initialRecord={activeRecord}
                  stations={stations}
                  profile={profile}
                  onExit={() => {
                    refreshRecords();
                    navigateTo('dashboard', null);
                  }}
                  onSubmitted={handleRecordSubmitted}
                />
              </div>
            )}

            {view === 'detail' && activeRecord && (
              <div className="w-full max-w-4xl mx-auto px-2 sm:px-4">
                <RecordDetail
                  record={activeRecord}
                  allRecords={records}
                  userRole={profile.role}
                  onBack={() => {
                    refreshRecords();
                    navigateTo('records', null);
                  }}
                  onEdit={handleEditRecord}
                  onDelete={handleDeleteRecord}
                  onSelectRecord={handleSelectRecord}
                  onVerifyRecord={handleVerifyRecord}
                />
              </div>
            )}

            {view === 'success' && activeRecord && (
              <div className="w-full max-w-2xl mx-auto px-2 sm:px-4">
                <SuccessView
                  record={activeRecord}
                  onViewRecord={() => navigateTo('detail', activeRecord)}
                  onNewRecord={handleStartNewRecord}
                />
              </div>
            )}
          </div>
        </PullToRefresh>
      </div>

      {/* SINGLE UNIFIED BOTTOM NAVIGATION BAR */}
      {view !== 'wizard' && view !== 'detail' && view !== 'success' && (
        <BottomNav
          activeTab={view}
          onChangeTab={(tab) => navigateTo(tab)}
          profile={profile}
          onNewRecord={handleStartNewRecord}
          draftCount={draftCount}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onLogout={handleLogout}
          onToggleRole={handleToggleRole}
          stations={stations}
          currentStationName={currentStation.name}
          isMenuOpen={isMobileSidebarOpen}
        />
      )}
    </div>
  );
}


