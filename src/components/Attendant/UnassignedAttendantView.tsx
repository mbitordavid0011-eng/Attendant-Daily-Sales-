import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Search,
  ArrowRight,
  Clock,
  Send,
  ShieldCheck,
  MapPin,
  User,
  Phone,
  Mail,
  KeyRound,
  Sparkles,
  RefreshCw,
  FileText,
  Check,
  ChevronRight,
  HelpCircle,
  Briefcase,
  Layers,
} from 'lucide-react';
import { AuthUser, StationConfig, StationJoinRequest } from '../../types';
import {
  findStationByExactCode,
  joinStationByCode,
  submitStationJoinRequest,
  getAttendantJoinRequests,
  syncStationsFromFirestore,
} from '../../services/stationJoinService';
import { syncCurrentUserDataFromFirestore, getCurrentUser } from '../../services/auth';

interface UnassignedAttendantViewProps {
  currentUser: AuthUser;
  stations: StationConfig[];
  onStationAssigned: (updatedUser: AuthUser) => void;
  onLogout: () => void;
}

export const UnassignedAttendantView: React.FC<UnassignedAttendantViewProps> = ({
  currentUser,
  stations: initialStations,
  onStationAssigned,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'options' | 'code' | 'request' | 'my_requests'>('options');
  
  // Option 1: Station Code state
  const [inputCode, setInputCode] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [codeVerificationResult, setCodeVerificationResult] = useState<{
    status: 'idle' | 'valid' | 'not_found' | 'error';
    station?: StationConfig;
    message?: string;
  }>({ status: 'idle' });
  const [isJoiningWithCode, setIsJoiningWithCode] = useState(false);

  // Option 2: Request to Join state
  const [availableStations, setAvailableStations] = useState<StationConfig[]>(initialStations);
  const [stationSearchQuery, setStationSearchQuery] = useState('');
  const [selectedStationForRequest, setSelectedStationForRequest] = useState<StationConfig | null>(null);
  const [isCustomStation, setIsCustomStation] = useState(false);
  const [customStationName, setCustomStationName] = useState('');
  const [customStationLocation, setCustomStationLocation] = useState('');
  const [customCompanyName, setCustomCompanyName] = useState('');
  const [requestNotes, setRequestNotes] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [requestSuccessMessage, setRequestSuccessMessage] = useState<string | null>(null);

  // Attendant Requests state
  const [myRequests, setMyRequests] = useState<StationJoinRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [isCheckingApproval, setIsCheckingApproval] = useState(false);

  // General notification
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load latest stations from Firestore & attendant's join requests
  useEffect(() => {
    const loadData = async () => {
      setIsLoadingRequests(true);
      try {
        const synced = await syncStationsFromFirestore();
        if (synced && synced.length > 0) {
          setAvailableStations(synced);
        }
      } catch (e) {
        console.warn('Stations sync notice:', e);
      }

      try {
        const reqs = await getAttendantJoinRequests(currentUser.id);
        setMyRequests(reqs);
      } catch (e) {
        console.warn('Join requests load notice:', e);
      } finally {
        setIsLoadingRequests(false);
      }
    };

    loadData();

    // Listen for updates
    const handleUpdate = () => {
      getAttendantJoinRequests(currentUser.id).then(setMyRequests);
    };
    window.addEventListener('staroil_join_requests_updated', handleUpdate);
    return () => window.removeEventListener('staroil_join_requests_updated', handleUpdate);
  }, [currentUser.id]);

  // Periodic poll to check if supervisor approved the attendant
  useEffect(() => {
    const interval = setInterval(async () => {
      const updated = await syncCurrentUserDataFromFirestore(currentUser.id);
      if (
        updated &&
        updated.station &&
        updated.station !== 'Unassigned' &&
        updated.stationId
      ) {
        onStationAssigned(updated);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [currentUser.id, onStationAssigned]);

  // Verify Station Code in Centralized Firestore Database
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputCode.trim();
    if (!clean) {
      setCodeVerificationResult({
        status: 'error',
        message: 'Please enter the official Station Code provided by your manager.',
      });
      return;
    }

    setIsVerifyingCode(true);
    setCodeVerificationResult({ status: 'idle' });
    setFeedback(null);

    try {
      const result = await findStationByExactCode(clean);
      if (result.found && result.station) {
        setCodeVerificationResult({
          status: 'valid',
          station: result.station,
          message: result.message,
        });
      } else {
        setCodeVerificationResult({
          status: 'not_found',
          message: result.message,
        });
      }
    } catch (err: any) {
      setCodeVerificationResult({
        status: 'error',
        message: err.message || 'Error searching centralized station registry.',
      });
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // Confirm and Join Station via Code
  const handleConfirmJoinByCode = async () => {
    if (!codeVerificationResult.station) return;
    setIsJoiningWithCode(true);
    setFeedback(null);

    try {
      const res = await joinStationByCode(
        currentUser.id,
        codeVerificationResult.station.stationCode
      );

      if (res.success && res.user) {
        setFeedback({ type: 'success', message: res.message });
        setTimeout(() => {
          onStationAssigned(res.user!);
        }, 800);
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to complete station assignment.',
      });
    } finally {
      setIsJoiningWithCode(false);
    }
  };

  // Submit Request to Join a Station
  const handleSubmitJoinRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingRequest(true);
    setRequestSuccessMessage(null);
    setFeedback(null);

    try {
      let targetStationId: string;
      let targetStationName: string;
      let targetStationCode: string;
      let targetCompanyName: string;

      if (isCustomStation) {
        if (!customStationName.trim()) {
          setFeedback({ type: 'error', message: 'Please enter the name of your station branch.' });
          setIsSubmittingRequest(false);
          return;
        }
        targetStationId = `stn_custom_${Date.now()}`;
        targetStationName = customStationName.trim();
        targetStationCode = 'PENDING-SETUP';
        targetCompanyName = customCompanyName.trim() || 'Independent Station';
      } else {
        if (!selectedStationForRequest) {
          setFeedback({ type: 'error', message: 'Please select a station from the list below.' });
          setIsSubmittingRequest(false);
          return;
        }
        targetStationId = selectedStationForRequest.id;
        targetStationName = selectedStationForRequest.name;
        targetStationCode = selectedStationForRequest.stationCode;
        targetCompanyName = selectedStationForRequest.companyName || 'Fuel Station';
      }

      const res = await submitStationJoinRequest({
        userId: currentUser.id,
        attendantName: currentUser.fullName,
        attendantIdentifier: currentUser.identifier,
        attendantPhone: currentUser.phone,
        attendantEmail: currentUser.email,
        staffId: currentUser.staffId,
        stationId: targetStationId,
        stationName: targetStationName,
        stationCode: targetStationCode,
        companyName: targetCompanyName,
        notes: requestNotes.trim(),
      });

      if (res.success) {
        setRequestSuccessMessage(res.message);
        const updated = await getAttendantJoinRequests(currentUser.id);
        setMyRequests(updated);
        setActiveTab('my_requests');
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to submit join request. Please try again.',
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Check approval status manually
  const handleCheckApprovalStatus = async () => {
    setIsCheckingApproval(true);
    try {
      const updated = await syncCurrentUserDataFromFirestore(currentUser.id);
      if (
        updated &&
        updated.station &&
        updated.station !== 'Unassigned' &&
        updated.stationId
      ) {
        setFeedback({
          type: 'success',
          message: `Station assignment approved! Connecting to ${updated.station}...`,
        });
        setTimeout(() => {
          onStationAssigned(updated);
        }, 1000);
        return;
      }

      const reqs = await getAttendantJoinRequests(currentUser.id);
      setMyRequests(reqs);

      const hasApproved = reqs.find((r) => r.status === 'approved');
      if (hasApproved) {
        // Direct local sync if request is approved
        const refreshedUser = getCurrentUser();
        if (refreshedUser && refreshedUser.stationId) {
          onStationAssigned(refreshedUser);
          return;
        }
      }

      setFeedback({
        type: 'success',
        message: 'Checked with Centralized Database: Your request is currently pending supervisor review.',
      });
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: 'Could not sync with centralized database right now. Please try again.',
      });
    } finally {
      setIsCheckingApproval(false);
    }
  };

  // Filter available stations for request tab
  const filteredStations = availableStations.filter((s) => {
    if (!stationSearchQuery.trim()) return true;
    const q = stationSearchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.locationName && s.locationName.toLowerCase().includes(q)) ||
      (s.companyName && s.companyName.toLowerCase().includes(q)) ||
      (s.stationCode && s.stationCode.toLowerCase().includes(q))
    );
  });

  const pendingRequestsCount = myRequests.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col items-center justify-start p-3 sm:p-6 md:p-8">
      {/* Container with constrained width and luxury contrast */}
      <div className="w-full max-w-3xl space-y-6">
        
        {/* Top Header & Attendant Identity Badge */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-4 sm:p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg">
                {currentUser.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                    {currentUser.fullName}
                  </h1>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Pump Attendant
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified Account
                  </span>
                </div>
                <p className="text-xs text-stone-400 flex items-center gap-3 mt-1 flex-wrap">
                  <span className="font-mono text-stone-300 font-semibold">ID: {currentUser.staffId}</span>
                  <span>•</span>
                  <span>{currentUser.identifier}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-800 border border-stone-700/60 text-xs font-bold text-stone-300 hover:text-white transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>

          {/* Operational Status Notice */}
          <div className="mt-5 p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-stone-300 space-y-1">
              <p className="font-bold text-amber-300">
                Station Assignment Required
              </p>
              <p className="text-stone-400 leading-relaxed text-[11.5px]">
                Your attendant account is active and verified. To access forecourt pumps, shift sales records, and cash accountability, connect to your station branch using an official Station Code or by submitting a join request below.
              </p>
            </div>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-200'
                : 'bg-rose-950/60 border-rose-500/60 text-rose-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs flex-1">
              <p className="font-bold">{feedback.message}</p>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-stone-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-2 bg-stone-900/60 p-1.5 rounded-2xl border border-stone-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('code')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'code'
                ? 'bg-amber-500 text-stone-950 font-black shadow-md'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/40'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span className="hidden sm:inline">Option 1:</span>
            <span>Station Code</span>
          </button>

          <button
            onClick={() => setActiveTab('request')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'request'
                ? 'bg-amber-500 text-stone-950 font-black shadow-md'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/40'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Option 2:</span>
            <span>Request to Join</span>
          </button>

          <button
            onClick={() => setActiveTab('my_requests')}
            className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
              activeTab === 'my_requests'
                ? 'bg-amber-500 text-stone-950 font-black shadow-md'
                : 'text-stone-400 hover:text-white hover:bg-stone-800/40'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>My Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-stone-950 text-[9px] font-black">
                {pendingRequestsCount}
              </span>
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: OPTION 1 — JOIN VIA OFFICIAL STATION CODE */}
        {/* ========================================================================= */}
        {(activeTab === 'options' || activeTab === 'code') && (
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-7 space-y-5 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Option 1
                </span>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  Enter Official Station Code
                </h2>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                If your Station Manager gave you an official Station Code (e.g. <span className="font-mono text-amber-300">SO-ACC-004</span>, <span className="font-mono text-amber-300">SO-TMA-001</span>), enter it below. The system will search the centralized database and instantly connect your account to that station.
              </p>
            </div>

            <form onSubmit={handleVerifyCode} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-stone-300 uppercase tracking-wider">
                  Station Code
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => {
                      setInputCode(e.target.value.toUpperCase());
                      setCodeVerificationResult({ status: 'idle' });
                    }}
                    placeholder="e.g. SO-ACC-012, SO-TMA-001"
                    className="flex-1 bg-stone-950 border border-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-2xl px-4 py-3 text-xs font-mono font-bold uppercase tracking-wider text-white placeholder-stone-600 outline-hidden transition-all"
                  />
                  <button
                    type="submit"
                    disabled={isVerifyingCode || !inputCode.trim()}
                    className="py-3 px-5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isVerifyingCode ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Searching Database...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Search Database</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Validation Result Box */}
            {codeVerificationResult.status === 'valid' && codeVerificationResult.station && (
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/50 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-black px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      {codeVerificationResult.station.stationCode}
                    </span>
                    <span className="text-sm font-black text-white">
                      {codeVerificationResult.station.name}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Exact Match Found
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-200/90 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Company: {codeVerificationResult.station.companyName || 'Fuel Station'}</span>
                  </div>
                  {codeVerificationResult.station.locationName && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Location: {codeVerificationResult.station.locationName}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-[11px] text-emerald-300/80">
                    Assigning will permanently register you to this station's Team Roster.
                  </p>
                  <button
                    type="button"
                    onClick={handleConfirmJoinByCode}
                    disabled={isJoiningWithCode}
                    className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isJoiningWithCode ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Connecting Account...</span>
                      </>
                    ) : (
                      <>
                        <span>Join This Station Now</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {codeVerificationResult.status === 'not_found' && (
              <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Station Code Not Found</span>
                </div>
                <p className="text-rose-200/80 leading-relaxed text-[11.5px]">
                  {codeVerificationResult.message || `Station Code "${inputCode.trim()}" was not found in the centralized database.`}
                </p>
                <div className="pt-2 border-t border-rose-900/40 flex items-center gap-2">
                  <span className="text-[11px] text-stone-400">Don't have the right code?</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('request')}
                    className="text-[11px] font-bold text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    Use Option 2: Request to Join a Station <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: OPTION 2 — REQUEST TO JOIN A STATION */}
        {/* ========================================================================= */}
        {(activeTab === 'options' || activeTab === 'request') && (
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-7 space-y-5 shadow-xl">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Option 2
                </span>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  Request to Join a Station
                </h2>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                If you don't have a Station Code or your manager hasn't set up the code yet, select your station from the list or enter your station details. A join request will be stored in the centralized database for your supervisor to approve.
              </p>
            </div>

            {/* Switch between Listed Stations vs Custom Station */}
            <div className="flex rounded-xl bg-stone-950 p-1 border border-stone-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsCustomStation(false)}
                className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer text-center ${
                  !isCustomStation ? 'bg-amber-500 text-stone-950 font-black' : 'text-stone-400 hover:text-white'
                }`}
              >
                Select from Station Directory
              </button>
              <button
                type="button"
                onClick={() => setIsCustomStation(true)}
                className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer text-center ${
                  isCustomStation ? 'bg-amber-500 text-stone-950 font-black' : 'text-stone-400 hover:text-white'
                }`}
              >
                Enter Station Details (Manual Request)
              </button>
            </div>

            <form onSubmit={handleSubmitJoinRequest} className="space-y-4">
              {!isCustomStation ? (
                /* Select from existing stations */
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={stationSearchQuery}
                      onChange={(e) => setStationSearchQuery(e.target.value)}
                      placeholder="Search stations by name, OMC, or location..."
                      className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-stone-600 outline-hidden"
                    />
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {filteredStations.length === 0 ? (
                      <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800/80 text-center text-xs text-stone-500">
                        No matching stations found. Switch to "Enter Station Details" to submit a manual request.
                      </div>
                    ) : (
                      filteredStations.map((st) => {
                        const isSelected = selectedStationForRequest?.id === st.id;
                        return (
                          <div
                            key={st.id}
                            onClick={() => setSelectedStationForRequest(st)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-amber-950/40 border-amber-500 text-white ring-1 ring-amber-500'
                                : 'bg-stone-950 border-stone-800/80 text-stone-300 hover:border-stone-700'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-white">{st.name}</span>
                                <span className="text-[10px] font-mono text-stone-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                                  {st.companyName || 'Station'}
                                </span>
                              </div>
                              {st.locationName && (
                                <p className="text-[11px] text-stone-400 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-stone-500" />
                                  {st.locationName}
                                </p>
                              )}
                            </div>

                            <div className="shrink-0">
                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? 'border-amber-400 bg-amber-500 text-stone-950'
                                    : 'border-stone-700 bg-stone-900'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ) : (
                /* Manual Custom Station input */
                <div className="space-y-3 p-4 rounded-2xl bg-stone-950 border border-stone-800">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-stone-400">
                      Station Branch Name *
                    </label>
                    <input
                      type="text"
                      value={customStationName}
                      onChange={(e) => setCustomStationName(e.target.value)}
                      placeholder="e.g. StarOil Spintex Express, GOIL Airport, Total Liberation Rd"
                      required={isCustomStation}
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-600 outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-400">
                        Oil Marketing Company (OMC)
                      </label>
                      <input
                        type="text"
                        value={customCompanyName}
                        onChange={(e) => setCustomCompanyName(e.target.value)}
                        placeholder="e.g. GOIL, Shell, Total, StarOil, Allied"
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-600 outline-hidden"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-400">
                        Station Location / City
                      </label>
                      <input
                        type="text"
                        value={customStationLocation}
                        onChange={(e) => setCustomStationLocation(e.target.value)}
                        placeholder="e.g. Accra, Tema, Kumasi"
                        className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-600 outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Optional Notes for Manager */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-400">
                  Message / Staff Identification for Manager (Optional)
                </label>
                <input
                  type="text"
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="e.g. Attendant on Day Shift, hired May 2026, employee ID #42"
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-white placeholder-stone-600 outline-hidden"
                />
              </div>

              {/* Submit Request Button */}
              <button
                type="submit"
                disabled={
                  isSubmittingRequest ||
                  (!isCustomStation && !selectedStationForRequest) ||
                  (isCustomStation && !customStationName.trim())
                }
                className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isSubmittingRequest ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Submitting to Centralized Database...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Station Join Request</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: MY REQUESTS & LIVE APPROVAL MONITOR */}
        {/* ========================================================================= */}
        {activeTab === 'my_requests' && (
          <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-7 space-y-5 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  My Station Join Requests
                </h2>
                <p className="text-xs text-stone-400 mt-0.5">
                  Live status of station membership requests stored in Centralized Firestore.
                </p>
              </div>

              <button
                onClick={handleCheckApprovalStatus}
                disabled={isCheckingApproval}
                className="py-1.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingApproval ? 'animate-spin' : ''}`} />
                <span>Check Status</span>
              </button>
            </div>

            {requestSuccessMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{requestSuccessMessage}</span>
              </div>
            )}

            {myRequests.length === 0 ? (
              <div className="p-8 rounded-2xl bg-stone-950 border border-stone-800 text-center space-y-2">
                <Building2 className="w-8 h-8 text-stone-600 mx-auto" />
                <p className="text-xs font-bold text-stone-400">No requests submitted yet</p>
                <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                  Submit a request under Option 2 to connect your attendant account with your station.
                </p>
                <button
                  onClick={() => setActiveTab('request')}
                  className="mt-2 py-2 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer transition-all"
                >
                  Submit Join Request
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {myRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl bg-stone-950 border border-stone-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="text-xs font-black text-white">{req.stationName}</h3>
                        <p className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
                          <span>{req.companyName || 'Fuel Station'}</span>
                          <span>•</span>
                          <span>Submitted {new Date(req.requestDate).toLocaleDateString()}</span>
                        </p>
                      </div>

                      <div>
                        {req.status === 'pending' && (
                          <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending Supervisor Review
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                      </div>
                    </div>

                    {req.notes && (
                      <p className="text-[11px] text-stone-400 italic bg-stone-900/60 p-2 rounded-xl border border-stone-800/60">
                        "{req.notes}"
                      </p>
                    )}

                    {req.status === 'rejected' && req.rejectionReason && (
                      <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-[11px] text-rose-300">
                        <span className="font-bold">Supervisor note:</span> {req.rejectionReason}
                      </div>
                    )}

                    {req.status === 'pending' && (
                      <p className="text-[10.5px] text-stone-500 flex items-center gap-1 pt-1 border-t border-stone-800/60">
                        <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                        Station sales and financial data remain private until approved by your Station Manager.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Attendant Safety Guidelines Card (Safe Unassigned Resource) */}
        <div className="bg-stone-900/60 border border-stone-800/80 rounded-3xl p-5 space-y-3">
          <h3 className="text-xs font-bold text-stone-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Standard Forecourt Attendant Guidelines
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-stone-400">
            <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800/60 space-y-1">
              <p className="font-bold text-stone-200">1. PPE Compliance</p>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Always wear official high-visibility station uniform, anti-static safety boots, and personal eye protection on the pump island.
              </p>
            </div>
            <div className="p-3 rounded-xl bg-stone-950/60 border border-stone-800/60 space-y-1">
              <p className="font-bold text-stone-200">2. Zero Deviation Fuel Policy</p>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Confirm vehicle fuel type (PMS Petrol vs AGO Diesel) with customer twice before lifting nozzle and dispensing.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
