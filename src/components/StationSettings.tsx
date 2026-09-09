import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Navigation,
  Save,
  Check,
  User,
  Fuel,
  Info,
  Landmark,
  ShieldCheck,
  History,
  Users,
  ArrowRightLeft,
  Lock,
  Phone,
  Mail,
  IdCard,
} from 'lucide-react';
import {
  StationConfig,
  CompanyConfig,
  UserProfile,
  FUELS,
  ALL_GHANA_BANKS,
  AuthUser,
} from '../types';
import { generateId, fmtPlain } from '../utils/calculations';
import { useUndoRedo } from '../utils/useUndoRedo';
import { UndoRedoControls } from './UndoRedoControls';
import {
  getStationCodeAuditLogs,
  addStationCodeAuditLog,
  getWorkerAssignmentAuditLogs,
  getAccountClosureAuditLogs,
  getCompanies,
  addCompany,
} from '../services/storage';
import {
  getAllAccounts,
  reassignWorkerStation,
  getCurrentUser,
  deleteAccount,
} from '../services/auth';

interface StationSettingsProps {
  stations: StationConfig[];
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onSaveStations: (stations: StationConfig[]) => void;
}

export const StationSettings: React.FC<StationSettingsProps> = ({
  stations,
  profile,
  onSaveProfile,
  onSaveStations,
}) => {
  const {
    state: profileForm,
    set: setProfileForm,
    undo: undoProfile,
    redo: redoProfile,
    canUndo: canUndoProfile,
    canRedo: canRedoProfile,
  } = useUndoRedo<UserProfile>(profile, { debounceMs: 300 });

  const [activeTab, setActiveTabState] = useState<'stations' | 'workers' | 'audit'>(() => {
    try {
      const saved = localStorage.getItem('staroil_settings_tab');
      if (saved === 'stations' || saved === 'workers' || saved === 'audit') {
        return saved;
      }
    } catch {}
    return 'stations';
  });

  const setActiveTab = (tab: 'stations' | 'workers' | 'audit') => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('staroil_settings_tab', tab);
    } catch {}
  };

  const [profileSaved, setProfileSaved] = useState(false);

  // Companies List & Filter
  const [companiesList, setCompaniesList] = useState<CompanyConfig[]>(() => getCompanies());
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('all');
  const [customCompanyName, setCustomCompanyName] = useState('');
  const [isCustomCompany, setIsCustomCompany] = useState(false);

  // Station Edit / Create State
  const [editingStation, setEditingStation] = useState<StationConfig | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [originalCode, setOriginalCode] = useState<string>('');
  const [codeChangeReason, setCodeChangeReason] = useState<string>('');
  const [capturingGps, setCapturingGps] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [deletingStationId, setDeletingStationId] = useState<string | null>(null);

  // Worker Reassignment Modal State
  const [reassignModalWorker, setReassignModalWorker] = useState<AuthUser | null>(null);
  const [targetStationCode, setTargetStationCode] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');
  const [reassignStatus, setReassignStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Worker Deletion State (Supervisors & Attendants)
  const [deletingWorker, setDeletingWorker] = useState<AuthUser | null>(null);
  const [workerListVersion, setWorkerListVersion] = useState(0);

  // Audit Sub-tab
  const [auditSubTab, setAuditSubTabState] = useState<'codes' | 'workers' | 'closures'>(() => {
    try {
      const saved = localStorage.getItem('staroil_audit_subtab');
      if (saved === 'codes' || saved === 'workers' || saved === 'closures') {
        return saved;
      }
    } catch {}
    return 'codes';
  });

  const setAuditSubTab = (tab: 'codes' | 'workers' | 'closures') => {
    setAuditSubTabState(tab);
    try {
      localStorage.setItem('staroil_audit_subtab', tab);
    } catch {}
  };

  const currentUser = getCurrentUser();
  const userRole = profile.role || currentUser?.role || 'attendant';
  const isAttendant = userRole === 'attendant';
  const effectiveActiveTab = isAttendant ? 'stations' : activeTab;

  // ONLY an authorized Manager or Company Admin can create a new station or edit Station Codes
  const isManagerOrAdmin = userRole === 'station_manager' || userRole === 'company_admin';

  const stationCodeLogs = getStationCodeAuditLogs();
  const workerLogs = getWorkerAssignmentAuditLogs();
  const closureLogs = getAccountClosureAuditLogs();
  const allWorkers = getAllAccounts();

  const handleConfirmDeleteWorker = (worker: AuthUser) => {
    deleteAccount(worker.id);
    setDeletingWorker(null);
    setWorkerListVersion((v) => v + 1);
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(profileForm);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleStartCreate = () => {
    const defaultPumps: Record<string, number> = {};
    const defaultPrices: Record<string, number> = {};
    FUELS.forEach((f) => {
      defaultPumps[f.id] = 2;
      defaultPrices[f.id] = f.defaultPrice;
    });

    const defaultCompName = profile.companyName || companiesList[0]?.name || 'Independent Fuel Station';
    const compMatch = companiesList.find((c) => c.name.toLowerCase() === defaultCompName.toLowerCase()) || companiesList[0];

    // DO NOT automatically generate or assign random Station Codes.
    // Official Station Code must be entered manually by authorized Manager or Admin.
    setEditingStation({
      id: generateId(),
      name: '',
      stationCode: '',
      companyId: compMatch?.id || companiesList[0]?.id || 'comp_general',
      companyName: compMatch?.name || companiesList[0]?.name || 'Independent Fuel Station',
      pumps: defaultPumps,
      prices: defaultPrices,
      banks: ['GCB Bank PLC', 'Ecobank Ghana PLC', 'Fidelity Bank Ghana Limited', 'Absa Bank Ghana PLC', 'Stanbic Bank Ghana Limited'],
      locationName: '',
    });
    setOriginalCode('');
    setCodeChangeReason('');
    setIsCustomCompany(false);
    setCustomCompanyName('');
    setIsCreating(true);
    setGpsStatus(null);
  };

  const handleStartEdit = (station: StationConfig) => {
    const code = station.stationCode || '';
    const compName = station.companyName || profile.companyName || companiesList[0]?.name || 'Independent Fuel Station';
    const compInList = companiesList.find((c) => c.name.toLowerCase() === compName.toLowerCase());

    setEditingStation({
      ...station,
      stationCode: code,
      companyId: station.companyId || compInList?.id || companiesList[0]?.id || 'comp_general',
      companyName: compName,
      banks: station.banks && station.banks.length > 0 ? station.banks : ['GCB Bank PLC', 'Ecobank Ghana PLC', 'Fidelity Bank Ghana Limited'],
    });
    setOriginalCode(code);
    setCodeChangeReason('');
    setIsCustomCompany(!compInList);
    setCustomCompanyName(!compInList ? compName : '');
    setIsCreating(false);
    setGpsStatus(null);
  };

  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStation || !editingStation.name.trim()) {
      alert('Please enter the official station branch name.');
      return;
    }

    if (!editingStation.stationCode || !editingStation.stationCode.trim()) {
      alert('The official Station Code must be entered manually by an authorized Manager or Company Admin.');
      return;
    }

    const newCode = editingStation.stationCode.trim();
    
    // Resolve Company Name & ID
    const targetCompName = isCustomCompany && customCompanyName.trim() 
      ? customCompanyName.trim() 
      : (editingStation.companyName?.trim() || profile.companyName || 'Independent Fuel Station');
    const assignedCompany = addCompany(targetCompName);
    setCompaniesList(getCompanies());

    // The Station Code must uniquely identify a station within its company.
    const duplicate = stations.find(
      (s) =>
        s.id !== editingStation.id &&
        ((s.companyId && s.companyId === assignedCompany.id) ||
         (s.companyName && s.companyName.trim().toLowerCase() === targetCompName.toLowerCase())) &&
        s.stationCode &&
        s.stationCode.trim().toLowerCase() === newCode.toLowerCase()
    );
    if (duplicate) {
      alert(`Station Code "${newCode}" is already registered to station "${duplicate.name}" within ${targetCompName}. Each station must have a unique official Station Code within its company.`);
      return;
    }

    const stationWithCode: StationConfig = {
      ...editingStation,
      stationCode: newCode,
      companyId: assignedCompany.id,
      companyName: assignedCompany.name,
      isActive: editingStation.isActive !== false,
    };

    // If station code changed on existing station or new station created, record in audit log
    if (!isCreating && originalCode && originalCode.trim().toLowerCase() !== newCode.toLowerCase()) {
      addStationCodeAuditLog({
        stationId: stationWithCode.id,
        stationName: stationWithCode.name,
        companyId: stationWithCode.companyId,
        companyName: stationWithCode.companyName,
        oldCode: originalCode.trim(),
        newCode: newCode,
        changedBy: currentUser?.fullName || profile.supervisor || profile.attendant || 'Authorized Manager',
        userRole: userRole,
        reason: codeChangeReason.trim() || 'Official company station code update',
      });
    } else if (isCreating) {
      addStationCodeAuditLog({
        stationId: stationWithCode.id,
        stationName: stationWithCode.name,
        companyId: stationWithCode.companyId,
        companyName: stationWithCode.companyName,
        oldCode: 'NEW_STATION',
        newCode: newCode,
        changedBy: currentUser?.fullName || profile.supervisor || profile.attendant || 'Authorized Manager',
        userRole: userRole,
        reason: codeChangeReason.trim() || 'New station provisioning with official company code',
      });
    }

    let updatedList: StationConfig[];
    if (isCreating) {
      updatedList = [...stations, stationWithCode];
    } else {
      updatedList = stations.map((s) => (s.id === stationWithCode.id ? stationWithCode : s));
    }

    onSaveStations(updatedList);

    // If profile has no station or was empty, set this station
    if (!profile.station || profile.station.trim() === '') {
      const updatedProfile = {
        ...profile,
        station: stationWithCode.name,
        stationCode: stationWithCode.stationCode,
        stationId: stationWithCode.id,
        companyId: stationWithCode.companyId,
        companyName: stationWithCode.companyName,
      };
      onSaveProfile(updatedProfile);
      setProfileForm(updatedProfile);
    }

    setEditingStation(null);
    setIsCreating(false);
    setCodeChangeReason('');
  };

  const confirmDeleteStation = (id: string) => {
    const target = stations.find((s) => s.id === id);
    const updatedList = stations.filter((s) => s.id !== id);
    onSaveStations(updatedList);

    if (target) {
      addStationCodeAuditLog({
        stationId: target.id,
        stationName: target.name,
        oldCode: target.stationCode,
        newCode: 'DECOMMISSIONED',
        changedBy: currentUser?.fullName || profile.supervisor || 'Authorized Manager',
        userRole: userRole,
        reason: 'Station decommissioned from active database',
      });
    }

    if (target && profile.station === target.name) {
      const newDefault = updatedList.length > 0 ? updatedList[0].name : '';
      const updatedProfile = { ...profile, station: newDefault };
      onSaveProfile(updatedProfile);
      setProfileForm(updatedProfile);
    }

    if (editingStation?.id === id) {
      setEditingStation(null);
      setIsCreating(false);
    }
    setDeletingStationId(null);
  };

  const handleExecuteReassign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reassignModalWorker || !targetStationCode.trim()) return;

    const res = reassignWorkerStation({
      workerId: reassignModalWorker.id,
      newStationCode: targetStationCode.trim().toUpperCase(),
      authorizedBy: currentUser || profile,
      reason: reassignReason.trim() || 'Operational rotation requirement',
    });

    setReassignStatus(res);
    if (res.success) {
      setTimeout(() => {
        setReassignModalWorker(null);
        setTargetStationCode('');
        setReassignReason('');
        setReassignStatus(null);
      }, 1500);
    }
  };

  const handleCaptureCurrentGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocation not supported by browser.');
      return;
    }
    setCapturingGps(true);
    setGpsStatus('Acquiring high-precision GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (editingStation) {
          setEditingStation({
            ...editingStation,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        }
        setCapturingGps(false);
        setGpsStatus(`GPS Saved: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
      },
      (err) => {
        setCapturingGps(false);
        setGpsStatus(`GPS Error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Top Header & Role Authority Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-stone-900 text-white flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Role: {userRole.replace('_', ' ')}
            </span>
            <span className="text-xs font-mono text-stone-500 font-bold">
              Station Code: {profile.stationCode || 'SO-TMA-001'}
            </span>
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight mt-1">
            Station & Operations Management
          </h1>
          <p className="text-xs text-stone-600">
            Configure official station codes, manage worker station assignments, and audit historical operations.
          </p>
        </div>

        {/* Navigation Tabs (Supervisors, Managers, and Admins only) */}
        {!isAttendant && (
          <div className="flex bg-stone-200/80 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setActiveTab('stations')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                effectiveActiveTab === 'stations'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Stations ({stations.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('workers')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                effectiveActiveTab === 'workers'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Workers ({allWorkers.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                effectiveActiveTab === 'audit'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit Trail</span>
            </button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: STATIONS & OFFICIAL STATION CODES                      */}
      {/* ------------------------------------------------------------- */}
      {effectiveActiveTab === 'stations' && (
        <div className="space-y-6">
          {/* Station Profile Card */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-stone-800 flex items-center gap-2">
                <User className="w-4 h-4 text-amber-600" /> Active Session Profile
              </h2>
              {profileSaved && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" /> Profile Saved
                </span>
              )}
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    Worker / Attendant Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.attendant}
                    onChange={(e) => setProfileForm({ ...profileForm, attendant: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Daniel Mensah"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    Shift Supervisor Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.supervisor}
                    onChange={(e) => setProfileForm({ ...profileForm, supervisor: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Kofi Asare"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    Assigned Station Branch
                  </label>
                  <div className="p-2 bg-stone-100 rounded-xl border border-stone-200 text-xs font-bold text-stone-800 flex items-center justify-between">
                    <span className="truncate">{profileForm.station || stations[0]?.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                      {profileForm.stationCode || 'SO-TMA-001'}
                    </span>
                  </div>
                  <span className="text-[9.5px] text-stone-400 block mt-0.5">
                    Station assignment is set by verified station code.
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    Staff ID / Employee Code
                  </label>
                  <input
                    type="text"
                    value={profileForm.staffId || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, staffId: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-stone-900 focus:ring-2 focus:ring-emerald-500"
                    placeholder="SO-ATT-001"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={profileForm.phone || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:ring-2 focus:ring-emerald-500"
                    placeholder="024 123 4567"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={profileForm.email || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:ring-2 focus:ring-emerald-500"
                    placeholder="worker@fuelstation.com"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <UndoRedoControls
                  canUndo={canUndoProfile}
                  canRedo={canRedoProfile}
                  onUndo={undoProfile}
                  onRedo={redoProfile}
                  variant="light"
                  size="sm"
                  showLabels={true}
                />
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" /> Save Profile Info
                </button>
              </div>
            </form>
          </div>

          {/* Station Branches List & Management */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-emerald-600" /> Station Records ({stations.length})
                </h2>
                <p className="text-[11px] text-stone-500">
                  Official stations registered in the database. Workers join using these official station codes.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Company Filter */}
                <div className="flex items-center gap-1.5 bg-stone-100 px-2.5 py-1.5 rounded-xl border border-stone-200 text-xs">
                  <span className="text-[10px] font-bold uppercase text-stone-500">Company:</span>
                  <select
                    value={selectedCompanyFilter}
                    onChange={(e) => setSelectedCompanyFilter(e.target.value)}
                    className="bg-transparent font-bold text-stone-800 text-xs focus:outline-none cursor-pointer"
                  >
                    <option value="all">All Companies</option>
                    {companiesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {isManagerOrAdmin && !editingStation && (
                  <button
                    onClick={handleStartCreate}
                    className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Official Station
                  </button>
                )}
              </div>
            </div>

            {/* Create/Edit Station Form */}
            {editingStation && (
              <form
                onSubmit={handleSaveStation}
                className="bg-white rounded-2xl p-5 border-2 border-emerald-500 shadow-lg space-y-4 text-xs animate-in fade-in"
              >
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-extrabold text-sm text-stone-900">
                      {isCreating ? 'Register New Official Station Record' : `Edit Station: ${editingStation.name}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingStation(null)}
                    className="text-xs text-stone-500 hover:text-stone-800 font-bold"
                  >
                    Cancel
                  </button>
                </div>

                {/* Company Selection */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                  <label className="block text-[11px] font-bold text-stone-700">
                    Owning / Operating Fuel Company *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      value={isCustomCompany ? '__custom__' : (editingStation.companyName || companiesList[0]?.name || '')}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomCompany(true);
                        } else {
                          setIsCustomCompany(false);
                          const comp = companiesList.find((c) => c.name === e.target.value);
                          setEditingStation({
                            ...editingStation,
                            companyId: comp?.id || 'comp_general',
                            companyName: e.target.value,
                          });
                        }
                      }}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900"
                    >
                      {companiesList.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                      <option value="__custom__">+ Add Other / New Company...</option>
                    </select>

                    {isCustomCompany && (
                      <input
                        type="text"
                        required
                        value={customCompanyName}
                        onChange={(e) => setCustomCompanyName(e.target.value)}
                        placeholder="Enter Company Name (e.g. Zen Petroleum, TotalEnergies)"
                        className="w-full bg-white border border-emerald-400 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:ring-2 focus:ring-emerald-500"
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Official Station Branch Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingStation.name}
                      onChange={(e) => setEditingStation({ ...editingStation, name: e.target.value })}
                      placeholder="e.g. Tema Main Station (Harbour Rd)"
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Official Station Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingStation.stationCode || ''}
                      onChange={(e) => setEditingStation({ ...editingStation, stationCode: e.target.value })}
                      placeholder="e.g. 004, SO-ACC-012, GH-01, 1024"
                      className="w-full bg-stone-50 border border-amber-400 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-900 focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                      Stored as text (supports numbers, letters, leading zeros, hyphens).
                    </span>
                  </div>
                </div>

                {/* Change Reason for Audit History */}
                {(!isCreating || originalCode !== editingStation.stationCode) && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1.5">
                    <label className="block text-[11px] font-bold text-amber-900 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                      Reason for Station Code / Record Update (Recorded in Audit Log) *
                    </label>
                    <input
                      type="text"
                      required
                      value={codeChangeReason}
                      onChange={(e) => setCodeChangeReason(e.target.value)}
                      placeholder="e.g. Official HQ restructuring or station code standardization"
                      className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                {/* Location Name, GPS & Active Status */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Location / Town / Region
                    </label>
                    <input
                      type="text"
                      value={editingStation.locationName || ''}
                      onChange={(e) => setEditingStation({ ...editingStation, locationName: e.target.value })}
                      placeholder="e.g. Community 1, Tema"
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-semibold text-stone-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      GPS Geolocation Coordinates
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCaptureCurrentGps}
                        disabled={capturingGps}
                        className="py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-800 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{capturingGps ? 'Capturing...' : 'Capture GPS'}</span>
                      </button>
                      <span className="text-[11px] font-mono text-stone-600 truncate">
                        {editingStation.lat && editingStation.lng
                          ? `${editingStation.lat.toFixed(4)}, ${editingStation.lng.toFixed(4)}`
                          : 'No GPS set'}
                      </span>
                    </div>
                    {gpsStatus && <p className="text-[10px] text-emerald-700 mt-0.5">{gpsStatus}</p>}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">
                      Station Operating Status *
                    </label>
                    <select
                      value={editingStation.isActive !== false ? 'active' : 'inactive'}
                      onChange={(e) => setEditingStation({ ...editingStation, isActive: e.target.value === 'active' })}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-900"
                    >
                      <option value="active">Active (Open for worker assignment)</option>
                      <option value="inactive">Inactive / Suspended (Blocks new assignment)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setEditingStation(null)}
                    className="py-2 px-4 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-xs"
                  >
                    Save Station Record
                  </button>
                </div>
              </form>
            )}

            {/* Stations List Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {stations
                .filter((st) => {
                  if (selectedCompanyFilter === 'all') return true;
                  return st.companyId === selectedCompanyFilter || (st.companyName && st.companyName.toLowerCase() === selectedCompanyFilter.toLowerCase());
                })
                .map((st) => (
                <div
                  key={st.id}
                  className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200">
                            {st.companyName || 'Independent Station'}
                          </span>
                          <span className="text-[11px] font-mono font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                            {st.stationCode || 'N/A'}
                          </span>
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            st.isActive !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {st.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-sm text-stone-900 mt-1">{st.name}</h3>
                        <p className="text-[10px] font-mono text-stone-400">ID: {st.id}</p>
                        {st.locationName && (
                          <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                            {st.locationName}
                          </p>
                        )}
                      </div>

                      {isManagerOrAdmin && (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleStartEdit(st)}
                            className="p-1.5 rounded-lg text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 transition-colors"
                            title="Edit Official Station Record"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingStationId(st.id)}
                            className="p-1.5 rounded-lg text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 transition-colors"
                            title="Delete Station"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Fuel Pumps Badges */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {FUELS.map((f) => (
                        <span
                          key={f.id}
                          className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-700"
                        >
                          {f.shortName}: {st.pumps[f.id] || 0} pumps @ GH₵{st.prices[f.id] || f.defaultPrice}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                    <span>Assigned Workers: <b>{allWorkers.filter((w) => w.stationCode === st.stationCode || w.station === st.name).length}</b></span>
                    <span className="font-mono text-[10px]">Active in DB</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: WORKER STATION ASSIGNMENTS & TRANSFERS                 */}
      {/* ------------------------------------------------------------- */}
      {!isAttendant && effectiveActiveTab === 'workers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-600" /> Registered Worker Station Assignments ({allWorkers.length})
              </h2>
              <p className="text-xs text-stone-500">
                Workers are bound to stations by official company station codes. Only Managers / Admins can reassign workers.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Worker Name &amp; Staff ID</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Assigned Station</th>
                    <th className="p-3">Station Code</th>
                    <th className="p-3">Supervisor</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {allWorkers.map((worker) => (
                    <tr key={worker.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="p-3 font-bold text-stone-900">
                        <div>{worker.fullName}</div>
                        <div className="text-[10px] font-mono font-normal text-stone-500">{worker.staffId} · {worker.identifier}</div>
                      </td>
                      <td className="p-3">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                          {worker.role}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-stone-800">
                        {worker.station}
                      </td>
                      <td className="p-3">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                          {worker.stationCode || 'SO-TMA-001'}
                        </span>
                      </td>
                      <td className="p-3 text-stone-600">
                        {worker.supervisor}
                      </td>
                      <td className="p-3 text-right">
                        {isManagerOrAdmin ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setReassignModalWorker(worker);
                                setTargetStationCode(stations[0]?.stationCode || '');
                                setReassignReason('');
                                setReassignStatus(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-black text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Reassign station"
                            >
                              <ArrowRightLeft className="w-3 h-3 text-amber-400" />
                              <span>Reassign</span>
                            </button>
                            <button
                              onClick={() => setDeletingWorker(worker)}
                              className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold flex items-center justify-center cursor-pointer transition-colors"
                              title={`Delete ${worker.role} account`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-stone-400 font-semibold flex items-center gap-1 justify-end">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden p-3.5 space-y-3">
              {allWorkers.map((worker) => (
                <div
                  key={worker.id}
                  className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-stone-900">{worker.fullName}</div>
                      <div className="text-[11px] font-mono text-stone-500">
                        {worker.staffId} · {worker.identifier}
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 shrink-0">
                      {worker.role}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg border border-stone-200">
                    <div>
                      <span className="text-[9.5px] text-stone-400 uppercase font-bold block">Assigned Station</span>
                      <span className="font-semibold text-stone-800 text-xs truncate block">{worker.station}</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-stone-400 uppercase font-bold block">Station Code</span>
                      <span className="font-mono font-bold text-amber-900 text-xs block">
                        {worker.stationCode || 'SO-TMA-001'}
                      </span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-stone-100">
                      <span className="text-[9.5px] text-stone-400 uppercase font-bold block">Supervisor</span>
                      <span className="text-stone-700 text-xs">{worker.supervisor}</span>
                    </div>
                  </div>

                  {isManagerOrAdmin && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => {
                          setReassignModalWorker(worker);
                          setTargetStationCode(stations[0]?.stationCode || '');
                          setReassignReason('');
                          setReassignStatus(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
                        <span>Reassign</span>
                      </button>
                      <button
                        onClick={() => setDeletingWorker(worker)}
                        className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold cursor-pointer"
                        title={`Delete ${worker.role} account`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: AUDIT TRAIL & COMPLIANCE LOGS                         */}
      {/* ------------------------------------------------------------- */}
      {!isAttendant && effectiveActiveTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-stone-800 flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-600" /> System Audit History &amp; Compliance Logs
              </h2>
              <p className="text-xs text-stone-500">
                Immutable records of all station code changes, worker transfers, and attendant account closures.
              </p>
            </div>

            <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                onClick={() => setAuditSubTab('codes')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  auditSubTab === 'codes' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                }`}
              >
                Station Codes ({stationCodeLogs.length})
              </button>
              <button
                onClick={() => setAuditSubTab('workers')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  auditSubTab === 'workers' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                }`}
              >
                Worker Transfers ({workerLogs.length})
              </button>
              <button
                onClick={() => setAuditSubTab('closures')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  auditSubTab === 'closures' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
                }`}
              >
                Account Closures ({closureLogs.length})
              </button>
            </div>
          </div>

          {/* Sub-tab 1: Station Code Changes */}
          {auditSubTab === 'codes' && (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="p-3 bg-stone-50 border-b border-stone-200 font-bold text-xs text-stone-700">
                Official Station Code Modifications Log
              </div>
              {stationCodeLogs.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {stationCodeLogs.map((log) => (
                    <div key={log.id} className="p-3.5 hover:bg-stone-50/60 transition-colors text-xs space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-stone-900">{log.stationName}</span>
                          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-stone-100 line-through text-stone-500">
                            {log.oldCode}
                          </span>
                          <span className="text-stone-400">→</span>
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                            {log.newCode}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-stone-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-600">
                        Reason: <b className="text-stone-800 font-semibold">{log.reason}</b> · Authorized By: <b>{log.changedBy}</b> ({log.userRole})
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-stone-400">
                  No station code modifications recorded yet.
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2: Worker Transfers */}
          {auditSubTab === 'workers' && (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="p-3 bg-stone-50 border-b border-stone-200 font-bold text-xs text-stone-700">
                Worker Station Reassignment Audit Log
              </div>
              {workerLogs.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {workerLogs.map((log) => (
                    <div key={log.id} className="p-3.5 hover:bg-stone-50/60 transition-colors text-xs space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-stone-900">{log.workerName}</span>
                          <span className="text-[10px] text-stone-500">({log.staffId})</span>
                          <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-500">{log.oldStation}</span>
                          <span className="text-stone-400">→</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                            {log.newStation} ({log.newStationCode})
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-stone-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-600">
                        Reason: <b className="text-stone-800 font-semibold">{log.reason}</b> · Authorized By: <b>{log.assignedBy}</b> ({log.userRole})
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-stone-400">
                  No worker transfers recorded yet.
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 3: Account Closures */}
          {auditSubTab === 'closures' && (
            <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="p-3 bg-stone-50 border-b border-stone-200 font-bold text-xs text-stone-700">
                Supervisor Attendant Account Reconciliation &amp; Closure Log
              </div>
              {closureLogs.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {closureLogs.map((log) => (
                    <div key={log.id} className="p-3.5 hover:bg-stone-50/60 transition-colors text-xs space-y-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-stone-900">{log.attendantName}</span>
                          <span className="text-[10px] font-mono text-stone-500">{log.staffId}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-stone-100 font-semibold">
                            {log.startDate} to {log.endDate} ({log.daysOpen} days)
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            log.status === 'accounted' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {log.status.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-stone-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-stone-600">
                        <span>Total Sales: <b>GH₵ {fmtPlain(log.totalSales)}</b></span>
                        <span>Cash Collected: <b>GH₵ {fmtPlain(log.actualCash)}</b></span>
                        <span>Variance: <b className={log.variance < 0 ? 'text-rose-600' : 'text-emerald-600'}>GH₵ {fmtPlain(log.variance)}</b></span>
                        <span>Reconciled By: <b>{log.closedBySupervisor}</b></span>
                      </div>
                      {log.notes && (
                        <p className="text-[10.5px] text-stone-500 italic">"{log.notes}"</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-stone-400">
                  No attendant account closures recorded yet.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* WORKER REASSIGNMENT MODAL                                     */}
      {/* ------------------------------------------------------------- */}
      {reassignModalWorker && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-600" />
                <h3 className="font-extrabold text-sm text-stone-900">
                  Reassign Worker Station
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReassignModalWorker(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1">
              <div className="font-bold text-stone-900">{reassignModalWorker.fullName}</div>
              <div className="text-stone-500">Current Station: <b>{reassignModalWorker.station}</b> ({reassignModalWorker.stationCode})</div>
            </div>

            <form onSubmit={handleExecuteReassign} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Target Station Assignment *
                </label>
                <select
                  value={targetStationCode}
                  onChange={(e) => setTargetStationCode(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs font-bold text-stone-900"
                  required
                >
                  {stations.map((st) => (
                    <option key={st.id} value={st.stationCode}>
                      {st.name} ({st.stationCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  Transfer Authorization Reason (Audit Log) *
                </label>
                <input
                  type="text"
                  required
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="e.g. Forecourt rotation, seasonal relief, manager dispatch"
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs text-stone-900"
                />
              </div>

              {reassignStatus && (
                <div className={`p-2 rounded-lg text-xs font-bold ${
                  reassignStatus.success ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                }`}>
                  {reassignStatus.message}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReassignModalWorker(null)}
                  className="py-2.5 px-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-3 rounded-xl bg-stone-900 hover:bg-black text-white font-bold text-xs"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Worker (Supervisor/Attendant) Confirmation Dialog */}
      {deletingWorker && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-stone-900">
                Delete {deletingWorker.role === 'supervisor' ? 'Supervisor' : 'Worker'} Account?
              </h3>
              <p className="text-xs text-stone-600">
                Are you sure you want to permanently delete the account for{' '}
                <strong className="text-stone-900 font-bold">
                  {deletingWorker.fullName}
                </strong>{' '}
                ({deletingWorker.staffId || deletingWorker.identifier}) assigned to{' '}
                <strong className="text-stone-800 font-semibold">{deletingWorker.station}</strong>?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingWorker(null)}
                className="py-2.5 px-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteWorker(deletingWorker)}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Yes, Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Station Confirmation Dialog */}
      {deletingStationId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-stone-900">
                Delete Station Record?
              </h3>
              <p className="text-xs text-stone-600">
                Are you sure you want to delete{' '}
                <strong className="text-stone-900 font-bold">
                  {stations.find((s) => s.id === deletingStationId)?.name || 'this station'}
                </strong>
                ? This will remove its branch setup from the database.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingStationId(null)}
                className="py-2.5 px-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteStation(deletingStationId)}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
