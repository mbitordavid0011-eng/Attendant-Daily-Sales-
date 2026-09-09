import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Calendar,
  Clock,
  Fuel,
  Plus,
  CheckCircle2,
  AlertCircle,
  Phone,
  UserCheck,
  UserX,
  Edit2,
  Trash2,
  X,
  Save,
  ShieldCheck,
  Building2,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  MapPin,
  Tag,
} from 'lucide-react';
import { UserProfile, StationConfig, AuthUser } from '../../types';
import {
  getAllAccounts,
  getAttendantsByStationId,
  updateAttendantRosterDetails,
  createAttendantBySupervisor,
  deleteAccount,
  formatPhoneNumber,
  syncUsersFromFirestore,
  subscribeToUsers,
} from '../../services/auth';

interface TeamRosterViewProps {
  profile: UserProfile;
  stations: StationConfig[];
}

export const TeamRosterView: React.FC<TeamRosterViewProps> = ({ profile, stations }) => {
  // Resolve supervisor's station ID
  const supervisorStationId = useMemo(() => {
    if (profile.stationId) return profile.stationId;
    const matchByCode = stations.find(
      (s) => profile.stationCode && s.stationCode && s.stationCode.trim().toLowerCase() === profile.stationCode.trim().toLowerCase()
    );
    if (matchByCode) return matchByCode.id;
    const matchByName = stations.find(
      (s) => profile.station && s.name.toLowerCase() === profile.station.toLowerCase()
    );
    if (matchByName) return matchByName.id;
    return 'st_tema_main';
  }, [profile, stations]);

  const activeStation = useMemo(() => {
    return stations.find((s) => s.id === supervisorStationId) || stations[0];
  }, [stations, supervisorStationId]);

  const [accountsVersion, setAccountsVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<'all' | 'day' | 'night' | 'standby'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingAttendant, setDeletingAttendant] = useState<AuthUser | null>(null);
  const [editingAttendant, setEditingAttendant] = useState<AuthUser | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state for Edit / Add
  const [formData, setFormData] = useState({
    fullName: '',
    staffId: '',
    phone: '',
    email: '',
    shiftGroup: 'Shift A (Day)',
    shiftHours: '06:00 - 18:00',
    assignedPumps: '',
    dutyStatus: 'active' as 'active' | 'scheduled' | 'standby',
    attendanceRate: '100%',
  });

  // Reload accounts when storage changes (e.g. new registration in another tab or component)
  useEffect(() => {
    // Background sync from centralized Firestore
    syncUsersFromFirestore().then((synced) => {
      if (synced && synced.length > 0) {
        setAccountsVersion((v) => v + 1);
      }
    });

    // Real-time Firestore listener for multi-device sync
    const unsubscribeUsers = subscribeToUsers(() => {
      setAccountsVersion((v) => v + 1);
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'staroil_auth_accounts' || e.key === 'staroil_auth_current_user') {
        setAccountsVersion((v) => v + 1);
      }
    };
    const handleCustomUpdate = () => {
      setAccountsVersion((v) => v + 1);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('staroil_team_roster_updated', handleCustomUpdate);
    window.addEventListener('staroil_join_requests_updated', handleCustomUpdate);

    return () => {
      unsubscribeUsers();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('staroil_team_roster_updated', handleCustomUpdate);
      window.removeEventListener('staroil_join_requests_updated', handleCustomUpdate);
    };
  }, []);

  // Fetch attendants belonging to the active station
  const stationAttendants = useMemo(() => {
    // accountsVersion dependency ensures reload on updates
    const _ = accountsVersion;
    return getAttendantsByStationId(
      activeStation.id,
      activeStation.stationCode,
      activeStation.name
    );
  }, [activeStation, accountsVersion]);

  // Filter by tab and search
  const filteredAttendants = useMemo(() => {
    return stationAttendants.filter((att) => {
      // Tab filter
      const shiftLower = (att.shiftGroup || '').toLowerCase();

      if (activeTab === 'day' && !shiftLower.includes('day') && !shiftLower.includes('a')) return false;
      if (activeTab === 'night' && !shiftLower.includes('night') && !shiftLower.includes('b')) return false;
      if (activeTab === 'standby' && att.dutyStatus !== 'standby' && !shiftLower.includes('relief') && !shiftLower.includes('c')) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const nameMatch = att.fullName.toLowerCase().includes(query);
        const staffMatch = att.staffId?.toLowerCase().includes(query);
        const phoneMatch = (att.phone || att.identifier || '').toLowerCase().includes(query);
        const pumpMatch = (att.assignedPumps || '').toLowerCase().includes(query);
        return nameMatch || staffMatch || phoneMatch || pumpMatch;
      }
      return true;
    });
  }, [stationAttendants, activeTab, searchQuery]);

  const activeCount = useMemo(() => {
    return stationAttendants.filter((a) => {
      const s = (a.shiftGroup || '').toLowerCase();
      return s.includes('day') || s.includes('shift a') || s.includes('a');
    }).length;
  }, [stationAttendants]);

  const nightCount = useMemo(() => {
    return stationAttendants.filter((a) => {
      const s = (a.shiftGroup || '').toLowerCase();
      return s.includes('night') || s.includes('shift b') || s.includes('b');
    }).length;
  }, [stationAttendants]);

  const standbyCount = useMemo(() => {
    return stationAttendants.filter((a) => a.dutyStatus === 'standby' || (a.shiftGroup || '').toLowerCase().includes('relief')).length;
  }, [stationAttendants]);

  const handleOpenAdd = () => {
    setFormData({
      fullName: '',
      staffId: `SO-ATT-${Math.floor(100 + Math.random() * 900)}`,
      phone: '',
      email: '',
      shiftGroup: 'Shift A (Day)',
      shiftHours: '06:00 - 18:00',
      assignedPumps: '',
      dutyStatus: 'active',
      attendanceRate: '100%',
    });
    setStatusMessage(null);
    setIsAddingNew(true);
  };

  const handleOpenEdit = (att: AuthUser) => {
    setEditingAttendant(att);
    setFormData({
      fullName: att.fullName,
      staffId: att.staffId || '',
      phone: att.phone || (att.authType === 'phone' ? att.identifier : ''),
      email: att.email || (att.authType === 'email' ? att.identifier : ''),
      shiftGroup: att.shiftGroup || 'Shift A (Day)',
      shiftHours: att.shiftHours || '06:00 - 18:00',
      assignedPumps: att.assignedPumps || '',
      dutyStatus: att.dutyStatus || 'active',
      attendanceRate: att.attendanceRate || '100%',
    });
    setStatusMessage(null);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter attendant full name.' });
      return;
    }

    if (editingAttendant) {
      const res = updateAttendantRosterDetails(editingAttendant.id, {
        fullName: formData.fullName.trim(),
        staffId: formData.staffId.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        shiftGroup: formData.shiftGroup,
        shiftHours: formData.shiftHours,
        assignedPumps: formData.assignedPumps,
        dutyStatus: formData.dutyStatus,
        attendanceRate: formData.attendanceRate,
      });

      if (res.success) {
        setAccountsVersion((v) => v + 1);
        setEditingAttendant(null);
        setStatusMessage({ type: 'success', text: `Updated ${formData.fullName}'s roster assignments.` });
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Failed to update attendant.' });
      }
    } else {
      const res = createAttendantBySupervisor({
        fullName: formData.fullName.trim(),
        staffId: formData.staffId.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        stationId: activeStation.id,
        shiftGroup: formData.shiftGroup,
        shiftHours: formData.shiftHours,
        assignedPumps: formData.assignedPumps,
        dutyStatus: formData.dutyStatus,
        attendanceRate: formData.attendanceRate,
        supervisorName: profile.supervisor || profile.attendant,
      });

      if (res.success) {
        setAccountsVersion((v) => v + 1);
        setIsAddingNew(false);
        setStatusMessage({
          type: 'success',
          text: `Attendant ${formData.fullName} added and assigned to ${activeStation.name} (${activeStation.stationCode}).`,
        });
      } else {
        setStatusMessage({ type: 'error', text: res.message || 'Failed to register attendant.' });
      }
    }
  };

  const handleDeleteConfirm = () => {
    if (!deletingAttendant) return;
    const res = deleteAccount(deletingAttendant.id);
    if (res.success) {
      setAccountsVersion((v) => v + 1);
      setStatusMessage({ type: 'success', text: res.message });
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
    setDeletingAttendant(null);
  };

  return (
    <div id="team-roster-view-container" className="space-y-4 pb-12">
      {/* Station Context & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#191b1d] p-4 rounded-xl border border-[#333739]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#e8b93b]/10 text-[#e8b93b] border border-[#e8b93b]/20">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#ece8e0] flex items-center gap-2">
                <span>{activeStation.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#e8b93b] text-[#15171a] font-black font-mono">
                  {activeStation.stationCode}
                </span>
              </h2>
              <p className="text-xs text-[#8d9195] flex items-center gap-2 mt-0.5">
                <span className="font-mono text-[11px] text-[#e8b93b]">ID: {activeStation.id}</span>
                <span>•</span>
                <span>{activeStation.locationName || 'Ghana'}</span>
                <span>•</span>
                <span>Supervisor: <strong className="text-[#ece8e0]">{profile.supervisor || 'Kofi Asare'}</strong></span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#23262a] border border-[#333739] text-[#8d9195] text-xs">
            <MapPin className="w-3.5 h-3.5 text-[#e8b93b]" />
            <span>Assigned Station:</span>
            <strong className="text-[#ece8e0] font-semibold">{activeStation.name}</strong>
          </div>

          <button
            onClick={() => setAccountsVersion((v) => v + 1)}
            title="Refresh Roster"
            className="p-1.5 rounded-lg bg-[#23262a] border border-[#333739] text-[#8d9195] hover:text-[#ece8e0] transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-3 py-1.5 rounded-lg bg-[#e8b93b] hover:bg-[#e8b93b]/90 text-[#15171a] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Attendant</span>
          </button>
        </div>
      </div>

      {/* Automated Station Assignment Banner */}
      <div className="p-3 rounded-xl bg-[#23262a]/70 border border-[#e8b93b]/30 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#e8b93b] shrink-0 mt-0.5" />
        <div className="text-xs space-y-0.5">
          <span className="font-bold text-[#ece8e0] block">
            Station Membership & Automated Roster Sync
          </span>
          <p className="text-[#8d9195] leading-relaxed">
            Attendants who register via the mobile app using Station Code{' '}
            <strong className="text-[#e8b93b] font-mono">{activeStation.stationCode}</strong> are automatically assigned
            to Station ID <strong className="text-[#e8b93b] font-mono">{activeStation.id}</strong> and immediately appear in this Team Roster.
          </p>
        </div>
      </div>

      {/* Feedback Toast */}
      {statusMessage && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/70 border-rose-800 text-rose-300'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="opacity-70 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#191b1d] border border-[#333739]">
          <span className="text-[10px] text-[#8d9195] uppercase font-bold tracking-wider block">Total Station Staff</span>
          <span className="text-2xl font-bold font-mono text-[#ece8e0]">{stationAttendants.length}</span>
          <span className="text-[10px] text-[#8d9195] block mt-0.5">Assigned to {activeStation.stationCode}</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#191b1d] border border-emerald-900/60">
          <span className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider block">Shift A (Day)</span>
          <span className="text-2xl font-bold font-mono text-emerald-400">{activeCount}</span>
          <span className="text-[10px] text-[#8d9195] block mt-0.5">06:00 - 18:00 Duty</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#191b1d] border border-blue-900/60">
          <span className="text-[10px] text-blue-400 uppercase font-bold tracking-wider block">Shift B (Night)</span>
          <span className="text-2xl font-bold font-mono text-blue-400">{nightCount}</span>
          <span className="text-[10px] text-[#8d9195] block mt-0.5">18:00 - 06:00 Duty</span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#191b1d] border border-purple-900/60">
          <span className="text-[10px] text-purple-400 uppercase font-bold tracking-wider block">Standby & Relief</span>
          <span className="text-2xl font-bold font-mono text-purple-400">{standbyCount}</span>
          <span className="text-[10px] text-[#8d9195] block mt-0.5">Relief & Lubes</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-b border-[#333739] pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: `All Attendants (${stationAttendants.length})` },
            { id: 'day', label: `Shift A Day (${activeCount})` },
            { id: 'night', label: `Shift B Night (${nightCount})` },
            { id: 'standby', label: `Standby (${standbyCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#e8b93b] text-[#15171a] font-bold shadow-xs'
                  : 'bg-[#23262a] text-[#8d9195] hover:text-[#ece8e0] border border-[#333739]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[#8d9195] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, pump..."
            className="w-full bg-[#15171a] border border-[#333739] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#ece8e0] focus:border-[#e8b93b] focus:outline-hidden"
          />
        </div>
      </div>

      {/* Attendant Roster List */}
      {filteredAttendants.length === 0 ? (
        <div className="p-10 text-center bg-[#191b1d] rounded-xl border border-[#333739] text-[#8d9195] space-y-3">
          <Users className="w-10 h-10 mx-auto opacity-40 text-[#e8b93b]" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-[#ece8e0]">
              {searchQuery ? 'No attendants match your search query' : 'No attendants assigned to this shift'}
            </p>
            <p className="text-xs text-[#8d9195]">
              Attendants who enter Station Code <span className="font-mono text-[#e8b93b]">{activeStation.stationCode}</span> during sign up will appear here automatically.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="mt-2 px-3 py-1.5 rounded-lg bg-[#23262a] border border-[#333739] hover:border-[#e8b93b] text-xs text-[#e8b93b] font-bold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Attendant Manually</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredAttendants.map((att) => {
            const isNight = (att.shiftGroup || '').toLowerCase().includes('night') || (att.shiftGroup || '').toLowerCase().includes('b');
            const isRelief = att.dutyStatus === 'standby' || (att.shiftGroup || '').toLowerCase().includes('relief');

            return (
              <div
                key={att.id}
                id={`attendant-card-${att.id}`}
                className="p-4 rounded-xl bg-[#191b1d] border border-[#333739] hover:border-[#8d9195] transition-all space-y-3 relative group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#23262a] border border-[#333739] flex items-center justify-center font-bold text-sm text-[#e8b93b]">
                      {att.fullName[0] || 'A'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs sm:text-sm text-[#ece8e0]">{att.fullName}</h4>
                        {att.isVerified && (
                          <span title="Verified Account">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#8d9195] font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[#ece8e0] font-semibold">{att.staffId || 'SO-ATT'}</span>
                        <span>•</span>
                        <span>{formatPhoneNumber(att.phone || att.identifier)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        att.dutyStatus === 'active'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : att.dutyStatus === 'scheduled'
                          ? 'bg-blue-950 text-blue-300 border border-blue-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {att.dutyStatus || 'active'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(att)}
                      className="p-1 rounded text-[#8d9195] hover:text-[#ece8e0] hover:bg-[#23262a] transition-colors cursor-pointer"
                      title="Edit attendant details"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingAttendant(att)}
                      className="p-1 rounded text-[#8d9195] hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                      title="Delete attendant account"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#15171a] border border-[#333739] space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-[#8d9195]">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-[#8d9195]" />
                      <span>Shift Group:</span>
                    </span>
                    <strong className="text-[#ece8e0]">
                      {att.shiftGroup || 'Shift A (Day)'}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-[#8d9195]">
                    <span className="flex items-center gap-1">
                      <Fuel size={12} className="text-[#e8b93b]" />
                      <span>Assigned Bay:</span>
                    </span>
                    <strong className="text-[#e8b93b] font-medium">
                      {att.assignedPumps || 'Pump Island 1 (PMS/AGO)'}
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-[#8d9195] pt-1 border-t border-[#23262a]">
                    <span className="text-[10px] text-[#8d9195] font-mono">
                      Station ID: <strong className="text-emerald-400">{att.stationId || activeStation.id}</strong>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold">
                      Attendance: {att.attendanceRate || '100%'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Attendant Modal */}
      {(isAddingNew || editingAttendant) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1d2023] border border-[#333739] rounded-xl p-5 max-w-lg w-full shadow-2xl text-[#ece8e0] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#333739]">
              <h3 className="font-bold text-sm tracking-wide uppercase font-['Space_Grotesk'] text-[#ece8e0] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#e8b93b]" />
                <span>{editingAttendant ? 'Edit Attendant Profile & Assignment' : 'Register Attendant for Station'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddingNew(false);
                  setEditingAttendant(null);
                }}
                className="p-1 text-[#8d9195] hover:text-white rounded cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-[#15171a] border border-[#333739] text-xs text-[#8d9195]">
              Station Assignment:{' '}
              <strong className="text-[#ece8e0]">{activeStation.name}</strong> ({activeStation.stationCode}) • ID:{' '}
              <strong className="text-[#e8b93b] font-mono">{activeStation.id}</strong>
            </div>

            <form onSubmit={handleSaveForm} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#8d9195] mb-1">
                  Attendant Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Kwame Mensah"
                  className="w-full bg-[#15171a] border border-[#333739] rounded-lg px-3 py-2 text-xs text-[#ece8e0] focus:border-[#e8b93b] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#8d9195] mb-1">
                    Staff ID
                  </label>
                  <input
                    type="text"
                    value={formData.staffId}
                    onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                    placeholder="SO-ATT-101"
                    className="w-full bg-[#15171a] border border-[#333739] rounded-lg px-3 py-2 text-xs text-[#ece8e0] focus:border-[#e8b93b] focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#8d9195] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="024 123 4567"
                    className="w-full bg-[#15171a] border border-[#333739] rounded-lg px-3 py-2 text-xs text-[#ece8e0] focus:border-[#e8b93b] focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#8d9195] mb-1">
                    Shift Group
                  </label>
                  <select
                    value={formData.shiftGroup}
                    onChange={(e) => {
                      const grp = e.target.value;
                      let hours = '';
                      if (grp.includes('Night')) hours = '18:00 - 06:00';
                      else if (grp.includes('Day')) hours = '06:00 - 18:00';
                      else if (grp.includes('Relief')) hours = '08:00 - 17:00';
                      setFormData({ ...formData, shiftGroup: grp, shiftHours: hours });
                    }}
                    className="w-full bg-[#15171a] border border-[#333739] rounded-lg px-3 py-2 text-xs text-[#ece8e0] focus:border-[#e8b93b] focus:outline-hidden"
                  >
                    <option value="Shift A (Day)">Shift A (Day: 06:00 - 18:00)</option>
                    <option value="Shift B (Night)">Shift B (Night: 18:00 - 06:00)</option>
                    <option value="Shift C (Relief & Lubes)">Shift C (Relief & Lubes)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#8d9195] mb-1">
                    Duty Status
                  </label>
                  <select
                    value={formData.dutyStatus}
                    onChange={(e) => setFormData({ ...formData, dutyStatus: e.target.value as any })}
                    className="w-full bg-[#15171a] border border-[#333739] rounded-lg px-3 py-2 text-xs text-[#ece8e0] focus:border-[#e8b93b] focus:outline-hidden"
                  >
                    <option value="active">Active (On Duty)</option>
                    <option value="scheduled">Scheduled (Next Shift)</option>
                    <option value="standby">Standby / Off</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8d9195] mb-1">
                  Assigned Pump Island / Dispensers
                </label>
                <input
                  type="text"
                  value={formData.assignedPumps}
                  onChange={(e) => setFormData({ ...formData, assignedPumps: e.target.value })}
                  placeholder="e.g. Pump Island 1 (PMS 1 & AGO 1)"
                  className="w-full bg-[#15171a] border border-[#333739] rounded-lg px-3 py-2 text-xs text-[#ece8e0] focus:border-[#e8b93b] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#333739]">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingAttendant(null);
                  }}
                  className="px-3 py-2 rounded-lg bg-[#23262a] hover:bg-[#2e3237] text-[#ece8e0] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#e8b93b] hover:bg-[#e8b93b]/90 text-[#15171a] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Save size={13} />
                  <span>{editingAttendant ? 'Save Changes' : 'Register Attendant'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAttendant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1d2023] border border-rose-900/60 rounded-xl p-5 max-w-md w-full shadow-2xl text-[#ece8e0] space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-extrabold text-[#ece8e0] font-['Space_Grotesk'] uppercase tracking-wide">
                Remove Attendant Account?
              </h3>
              <p className="text-xs text-[#8d9195] leading-relaxed">
                Are you sure you want to remove <strong className="text-[#e8b93b]">{deletingAttendant.fullName}</strong> ({deletingAttendant.staffId || 'Attendant'}) from Station{' '}
                <strong className="text-[#ece8e0]">{activeStation.name}</strong>?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAttendant(null)}
                className="py-2.5 px-3 rounded-lg border border-[#333739] bg-[#23262a] hover:bg-[#2e3237] text-[#ece8e0] font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="py-2.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-md flex items-center justify-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>Yes, Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
