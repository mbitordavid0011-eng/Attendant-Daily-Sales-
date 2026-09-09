import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileCheck,
  Calendar,
  Clock,
  ChevronRight,
  ShieldCheck,
  User,
  Ticket,
  Building2,
  RefreshCw,
  Search,
  Check,
  X,
  MessageSquare,
} from 'lucide-react';
import { ShiftRecord, UserProfile, StationJoinRequest } from '../../types';
import {
  fetchAllJoinRequests,
  reviewStationJoinRequest,
  subscribeToJoinRequests,
} from '../../services/stationJoinService';

interface ApprovalItem {
  id: string;
  type: 'shift' | 'swap' | 'voucher' | 'variance';
  title: string;
  applicant: string;
  date: string;
  amount?: string;
  details: string;
  status: 'pending' | 'approved' | 'rejected';
}

const DEFAULT_APPROVALS: ApprovalItem[] = [
  {
    id: 'appr-1',
    type: 'shift',
    title: 'Shift A (Day) Reconciliation Sign-Off',
    applicant: 'Kofi Mensah',
    date: '2026-05-18',
    amount: 'GH₵ 8,450.00',
    details: 'Total sales GH₵ 8,450.00, Physical Cash collected GH₵ 7,200.00, MoMo drawings GH₵ 1,250.00. Balanced.',
    status: 'pending',
  },
  {
    id: 'appr-2',
    type: 'voucher',
    title: 'Station Generator Fuel Voucher #V-2026-09',
    applicant: 'Kwame Osei',
    date: '2026-05-18',
    amount: 'GH₵ 350.00',
    details: '25 Litres AGO for station backup genset during GridCo load shedding.',
    status: 'pending',
  },
  {
    id: 'appr-3',
    type: 'swap',
    title: 'Forecourt Shift Swap & Rotation Request',
    applicant: 'Ama Serwaa',
    date: '2026-05-22',
    details: 'Requesting to swap Shift B (Night) on Friday May 22 with Emmanuel Darko on Island 1.',
    status: 'pending',
  },
  {
    id: 'appr-4',
    type: 'variance',
    title: 'Cash Shortage Explanation Review (-GH₵ 15.00)',
    applicant: 'Emmanuel Darko',
    date: '2026-05-17',
    amount: '-GH₵ 15.00',
    details: 'Small change shortage due to customer coin deficit on Pump Island 2. Attendant agrees to salary deduction.',
    status: 'pending',
  },
];

export const ApprovalsView: React.FC<{
  profile: UserProfile;
  records: ShiftRecord[];
  onSelectRecord?: (record: ShiftRecord) => void;
}> = ({ profile, records, onSelectRecord }) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'station_requests' | 'shifts'>('all');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  // Station Join Requests State
  const [joinRequests, setJoinRequests] = useState<StationJoinRequest[]>([]);
  const [isLoadingJoinRequests, setIsLoadingJoinRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [rejectionModalRequest, setRejectionModalRequest] = useState<StationJoinRequest | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Standard Shift/Voucher/Swap approvals
  const [items, setItems] = useState<ApprovalItem[]>(() => {
    try {
      const saved = localStorage.getItem('staroil_supervisor_approvals');
      return saved ? JSON.parse(saved) : DEFAULT_APPROVALS;
    } catch {
      return DEFAULT_APPROVALS;
    }
  });

  // Load join requests from Centralized Firestore Database
  const loadJoinRequests = async () => {
    setIsLoadingJoinRequests(true);
    try {
      const all = await fetchAllJoinRequests();
      // Filter for supervisor's station if specified, or show all if supervisor has broad scope
      const sId = (profile.stationId || '').trim();
      const sCode = (profile.stationCode || '').trim().toLowerCase();
      const sName = (profile.station || '').trim().toLowerCase();

      const matched = all.filter((r) => {
        if (!sId && !sCode && !sName) return true;
        if (sId && r.stationId === sId) return true;
        if (sCode && r.stationCode.trim().toLowerCase() === sCode) return true;
        if (sName && (r.stationName.trim().toLowerCase() === sName || sName.includes(r.stationName.trim().toLowerCase()) || r.stationName.trim().toLowerCase().includes(sName))) return true;
        // If the station was custom entered or general
        return true;
      });

      setJoinRequests(matched);
    } catch (e) {
      console.warn('Failed to load join requests in ApprovalsView', e);
    } finally {
      setIsLoadingJoinRequests(false);
    }
  };

  useEffect(() => {
    loadJoinRequests();

    const unsubscribe = subscribeToJoinRequests((all) => {
      const sId = (profile.stationId || '').trim();
      const sCode = (profile.stationCode || '').trim().toLowerCase();
      const sName = (profile.station || '').trim().toLowerCase();

      const matched = all.filter((r) => {
        if (!sId && !sCode && !sName) return true;
        if (sId && r.stationId === sId) return true;
        if (sCode && r.stationCode.trim().toLowerCase() === sCode) return true;
        if (sName && (r.stationName.trim().toLowerCase() === sName || sName.includes(r.stationName.trim().toLowerCase()) || r.stationName.trim().toLowerCase().includes(sName))) return true;
        return true;
      });

      setJoinRequests(matched);
    });

    const handleUpdate = () => {
      loadJoinRequests();
    };
    window.addEventListener('staroil_join_requests_updated', handleUpdate);
    return () => {
      unsubscribe();
      window.removeEventListener('staroil_join_requests_updated', handleUpdate);
    };
  }, [profile.stationId, profile.stationCode, profile.station]);

  const handleAction = (id: string, action: 'approved' | 'rejected') => {
    const updated = items.map((it) => (it.id === id ? { ...it, status: action } : it));
    setItems(updated);
    try {
      localStorage.setItem('staroil_supervisor_approvals', JSON.stringify(updated));
    } catch {}
  };

  // Process Station Join Request (Approve or Reject)
  const handleReviewJoinRequest = async (
    requestId: string,
    decision: 'approved' | 'rejected',
    reason?: string
  ) => {
    setProcessingRequestId(requestId);
    setStatusMessage(null);

    try {
      const res = await reviewStationJoinRequest({
        requestId,
        decision,
        reviewerName: profile.fullName || 'Station Supervisor',
        reviewerRole: profile.role,
        rejectionReason: reason,
      });

      setStatusMessage({ type: 'success', text: res.message });
      setRejectionModalRequest(null);
      setRejectionReasonInput('');
      await loadJoinRequests();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to update station join request.',
      });
    } finally {
      setProcessingRequestId(null);
    }
  };

  // Filtered lists
  const filteredJoinRequests = joinRequests.filter((r) =>
    filter === 'all' ? true : r.status === filter
  );
  const pendingJoinRequestsCount = joinRequests.filter((r) => r.status === 'pending').length;

  const filteredItems = items.filter((i) => (filter === 'all' ? true : i.status === filter));
  const pendingItemsCount = items.filter((i) => i.status === 'pending').length;

  const totalPending = pendingJoinRequestsCount + pendingItemsCount;

  return (
    <div className="space-y-5 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#ece8e0] flex items-center gap-2">
            <CheckCircle2 className="text-[#e8b93b] w-6 h-6" />
            <span>Supervisor Approvals & Access Authorization</span>
          </h2>
          <p className="text-xs text-[#8d9195] mt-0.5">
            Review attendant station membership requests, shift reconciliations, vouchers, and cash variance claims
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadJoinRequests}
            disabled={isLoadingJoinRequests}
            className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-400 hover:text-white cursor-pointer transition-all"
            title="Refresh database records"
          >
            <RefreshCw size={14} className={isLoadingJoinRequests ? 'animate-spin' : ''} />
          </button>
          <span className="text-xs px-3 py-1.5 rounded-xl bg-[#23262a] border border-[#333739] text-[#ece8e0]">
            Total Pending: <strong className="text-[#e8b93b]">{totalPending}</strong>
          </span>
        </div>
      </div>

      {/* Status Feedback Toast */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs animate-in fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-stone-400 hover:text-white cursor-pointer font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Category Selection Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-stone-900/60 p-1.5 rounded-2xl border border-stone-800 text-xs font-bold">
        <button
          onClick={() => setActiveCategory('all')}
          className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-amber-500 text-stone-950 font-black shadow-md'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <span>All Authorizations</span>
          <span className="px-1.5 py-0.2 rounded-full bg-stone-800 text-stone-300 text-[10px]">
            {totalPending}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory('station_requests')}
          className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeCategory === 'station_requests'
              ? 'bg-amber-500 text-stone-950 font-black shadow-md'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Station Join Requests</span>
          {pendingJoinRequestsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-stone-950 text-[10px] font-black">
              {pendingJoinRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveCategory('shifts')}
          className={`py-2 px-3 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeCategory === 'shifts'
              ? 'bg-amber-500 text-stone-950 font-black shadow-md'
              : 'text-stone-400 hover:text-white'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Shift Reconciliations & Claims</span>
          {pendingItemsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-stone-800 text-stone-300 text-[10px]">
              {pendingItemsCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Status Tabs (Pending / Approved / Rejected / All) */}
      <div className="flex items-center gap-2 border-b border-[#333739] pb-2 text-xs">
        {[
          { id: 'pending', label: 'Pending Action' },
          { id: 'approved', label: 'Approved' },
          { id: 'rejected', label: 'Rejected' },
          { id: 'all', label: 'All Records' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              filter === tab.id
                ? 'bg-[#e8b93b] text-black font-bold'
                : 'text-[#8d9195] hover:text-[#ece8e0]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: STATION JOIN REQUESTS (ATTENDANT APPLICATIONS) */}
      {/* ========================================================================= */}
      {(activeCategory === 'all' || activeCategory === 'station_requests') && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Attendant Station Join Requests ({filteredJoinRequests.length})
            </h3>
            <span className="text-[10.5px] text-stone-400">
              Synced from Centralized Database
            </span>
          </div>

          {filteredJoinRequests.length === 0 ? (
            <div className="p-6 text-center text-[#8d9195] text-xs bg-[#191b1d] rounded-2xl border border-[#333739]">
              <Building2 size={28} className="mx-auto mb-2 opacity-40 text-amber-400" />
              <p className="font-semibold text-[#ece8e0]">No station join requests in this view.</p>
              <p className="mt-0.5 text-stone-500">
                When an attendant requests to join your station, their application will appear here for authorization.
              </p>
            </div>
          ) : (
            filteredJoinRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 sm:p-5 rounded-2xl bg-[#191b1d] border border-[#333739] hover:border-[#8d9195]/80 transition-all space-y-3 shadow-md"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase bg-amber-950 text-amber-300 border border-amber-800">
                        Station Membership Request
                      </span>
                      <h4 className="font-black text-sm text-[#ece8e0]">{req.attendantName}</h4>
                      {req.staffId && (
                        <span className="text-[10px] font-mono text-stone-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                          {req.staffId}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-[#8d9195] flex items-center gap-3 flex-wrap">
                      <span>Contact: <strong className="text-[#ece8e0]">{req.attendantIdentifier}</strong></span>
                      <span>•</span>
                      <span>Target Station: <strong className="text-amber-300">{req.stationName}</strong></span>
                      {req.stationCode && req.stationCode !== 'PENDING-SETUP' && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-stone-400">({req.stationCode})</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Requested: <strong>{new Date(req.requestDate).toLocaleDateString()}</strong></span>
                    </div>
                  </div>

                  <span
                    className={`text-[9.5px] px-2.5 py-1 rounded font-bold uppercase shrink-0 ${
                      req.status === 'approved'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : req.status === 'rejected'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                    }`}
                  >
                    {req.status === 'pending' ? 'Pending Review' : req.status}
                  </span>
                </div>

                {req.notes && (
                  <p className="text-xs text-stone-300 bg-[#15171a] p-3 rounded-xl border border-[#333739]">
                    <span className="font-bold text-stone-400">Attendant Note:</span> "{req.notes}"
                  </p>
                )}

                {req.status === 'rejected' && req.rejectionReason && (
                  <p className="text-xs text-rose-300 bg-rose-950/20 p-2.5 rounded-xl border border-rose-900/40">
                    <span className="font-bold">Rejection Reason:</span> {req.rejectionReason}
                  </p>
                )}

                {/* Supervisor Actions for Station Join Requests */}
                {req.status === 'pending' && (
                  <div className="flex items-center justify-between gap-3 pt-2 border-t border-[#333739] flex-wrap">
                    <p className="text-[11px] text-stone-400 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Approving will permanently assign this attendant to your station roster.
                    </p>

                    <div className="flex items-center gap-2 ml-auto">
                      <button
                        type="button"
                        onClick={() => setRejectionModalRequest(req)}
                        disabled={processingRequestId === req.id}
                        className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all disabled:opacity-50"
                      >
                        <XCircle size={13} />
                        <span>Reject</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleReviewJoinRequest(req.id, 'approved')}
                        disabled={processingRequestId === req.id}
                        className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer transition-all disabled:opacity-50"
                      >
                        {processingRequestId === req.id ? (
                          <>
                            <RefreshCw size={13} className="animate-spin" />
                            <span>Assigning...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} />
                            <span>Approve & Assign to Station</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: SHIFT RECONCILIATIONS, EXPENSES & CLAIMS */}
      {/* ========================================================================= */}
      {(activeCategory === 'all' || activeCategory === 'shifts') && (
        <div className="space-y-3 pt-4 border-t border-stone-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-amber-400" />
            Shift Reconciliations & Expenses ({filteredItems.length})
          </h3>

          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-[#8d9195] text-xs bg-[#191b1d] rounded-2xl border border-[#333739]">
              <CheckCircle2 size={28} className="mx-auto mb-2 opacity-40 text-emerald-400" />
              <p className="font-semibold text-[#ece8e0]">No items in this queue.</p>
              <p className="mt-0.5 text-stone-500">All shift reconciliations and expense claims are cleared.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl bg-[#191b1d] border border-[#333739] hover:border-[#8d9195] transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                          item.type === 'shift'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : item.type === 'voucher'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : item.type === 'variance'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-purple-950 text-purple-300 border border-purple-800'
                        }`}
                      >
                        {item.type.replace('_', ' ')}
                      </span>
                      <h4 className="font-bold text-xs text-[#ece8e0]">{item.title}</h4>
                    </div>

                    <div className="text-[11px] text-[#8d9195] flex items-center gap-3">
                      <span>Applicant: <strong className="text-[#ece8e0]">{item.applicant}</strong></span>
                      <span>•</span>
                      <span>Date: <strong className="text-[#ece8e0]">{item.date}</strong></span>
                      {item.amount && (
                        <>
                          <span>•</span>
                          <span>Amount: <strong className="text-[#e8b93b] font-mono">{item.amount}</strong></span>
                        </>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase shrink-0 ${
                      item.status === 'approved'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : item.status === 'rejected'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <p className="text-xs text-[#8d9195] bg-[#15171a] p-2.5 rounded-lg border border-[#333739]">
                  {item.details}
                </p>

                {item.status === 'pending' && (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleAction(item.id, 'rejected')}
                      className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle size={13} />
                      <span>Reject</span>
                    </button>
                    <button
                      onClick={() => handleAction(item.id, 'approved')}
                      className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      <span>Approve & Authorize</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal for rejecting a join request */}
      {rejectionModalRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                Reject Station Join Request
              </h3>
              <button
                onClick={() => setRejectionModalRequest(null)}
                className="text-stone-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-stone-300">
              Rejecting request from <strong className="text-white">{rejectionModalRequest.attendantName}</strong> to join <strong className="text-amber-400">{rejectionModalRequest.stationName}</strong>.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-400">
                Reason for Rejection (Optional)
              </label>
              <textarea
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="e.g. Unrecognized staff identifier, wrong station branch selected, or applicant not yet officially contracted."
                rows={3}
                className="w-full bg-stone-950 border border-stone-800 rounded-2xl p-3 text-xs text-white placeholder-stone-600 outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectionModalRequest(null)}
                className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  handleReviewJoinRequest(
                    rejectionModalRequest.id,
                    'rejected',
                    rejectionReasonInput
                  )
                }
                disabled={processingRequestId === rejectionModalRequest.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

