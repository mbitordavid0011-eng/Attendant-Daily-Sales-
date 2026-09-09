import React from 'react';
import {
  Plus,
  ArrowRight,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Calendar,
  Fuel,
  User,
  LogOut,
  Layers,
  Banknote,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { ShiftRecord, UserProfile } from '../types';
import { calculateReconciliation, fmt, fmtPlain } from '../utils/calculations';
import { LocalStorageSyncIndicator } from './LocalStorageSyncIndicator';

interface DashboardProps {
  records: ShiftRecord[];
  profile: UserProfile;
  onNewRecord: () => void;
  onResumeDraft: (record: ShiftRecord) => void;
  onSelectRecord: (record: ShiftRecord) => void;
  onViewAllRecords: () => void;
  onNavigateTo?: (view: string) => void;
  onLogout?: () => void;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  lastRefreshed?: Date;
}

export const Dashboard: React.FC<DashboardProps> = ({
  records,
  profile,
  onNewRecord,
  onResumeDraft,
  onSelectRecord,
  onViewAllRecords,
  onNavigateTo,
  onLogout,
  onRefresh,
  isRefreshing = false,
  lastRefreshed,
}) => {
  const today = new Date().toISOString().slice(0, 10);
  
  // Find current active draft or account
  const drafts = records.filter((r) => r.status === 'draft');
  const latestDraft = drafts[0] || null;

  // Determine current shift info
  const activeShiftName = latestDraft?.shiftGroup 
    ? `Shift ${latestDraft.shiftGroup}` 
    : profile.shiftGroup 
    ? profile.shiftGroup 
    : 'Shift A';

  // Multi-day determination:
  // An account is multi-day if it was opened prior to today and is still open
  const isMultiDay = Boolean(latestDraft && latestDraft.date && latestDraft.date < today);
  const accountStatus: 'OPEN' | 'MULTI-DAY OPEN' | 'CLOSED' = latestDraft
    ? isMultiDay
      ? 'MULTI-DAY OPEN'
      : 'OPEN'
    : 'CLOSED';

  // Attendant's submitted records
  const mySubmittedRecords = records.filter((r) => r.status === 'submitted' || r.status === 'verified');
  const latestCompleted = mySubmittedRecords[0] || null;

  // Calculations for active draft if present
  const draftRecon = latestDraft ? calculateReconciliation(latestDraft) : null;

  return (
    <div className="space-y-4 sm:space-y-6 pb-12 w-full max-w-4xl mx-auto px-1 sm:px-2">
      {/* 1. ATTENDANT ACCOUNT HEADER */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-stone-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                ATTENDANT FORECOURT
              </span>
              {profile.staffId && (
                <span className="text-[11px] font-mono font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                  ID: {profile.staffId}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight mt-1.5">
              MY ACCOUNT
            </h1>
            <p className="text-sm font-semibold text-stone-600 mt-0.5">
              Welcome back, <span className="text-stone-900 font-bold">{profile.attendant || profile.name || 'Fuel Attendant'}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 transition-all cursor-pointer border border-stone-200 flex items-center gap-1.5 text-xs font-bold"
                title="Refresh Records"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 transition-all cursor-pointer border border-rose-200 flex items-center gap-1.5 text-xs font-bold"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>

        {/* CURRENT ACCOUNT STATUS CARD */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/80">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Station
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-sm font-bold text-stone-900 truncate">
                {profile.station || 'Tema Main Station'}
              </span>
            </div>
            {profile.stationCode && (
              <span className="text-[10px] font-mono font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded border border-amber-300 mt-1.5 inline-block">
                Code: {profile.stationCode}
              </span>
            )}
          </div>

          <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/80">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Current Shift
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="text-sm font-bold text-stone-900">
                {activeShiftName}
              </span>
            </div>
            <span className="text-[11px] font-mono text-stone-500 mt-1 block">
              Date: {latestDraft ? latestDraft.date : today}
            </span>
          </div>

          <div className="bg-stone-50 rounded-2xl p-3.5 border border-stone-200/80">
            <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
              Account Status
            </span>
            <div className="mt-1">
              {accountStatus === 'MULTI-DAY OPEN' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500 text-stone-950 shadow-xs animate-pulse">
                  <Layers className="w-3.5 h-3.5 stroke-[2.5]" />
                  MULTI-DAY OPEN
                </span>
              ) : accountStatus === 'OPEN' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                  <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
                  OPEN
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-stone-200 text-stone-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  CLOSED
                </span>
              )}
            </div>
            <span className="text-[10px] text-stone-500 mt-1.5 block">
              {accountStatus === 'CLOSED'
                ? 'Ready for new shift'
                : 'Active pump session'}
            </span>
          </div>
        </div>

        {/* MULTI-DAY ACCOUNT CONTINUITY POLICY BANNER */}
        <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-amber-950 text-xs uppercase tracking-wider block">
                Multi-Day Account Continuity Policy
              </span>
              <p className="text-amber-900 mt-1 leading-relaxed text-[11.5px] sm:text-xs">
                “Attendant accounts can remain open across multiple days (e.g., Saturday → Sunday → Monday).
                An attendant's account is only closed when the supervisor explicitly completes their final physical cash accounting.
                The system never automatically closes accounts at day/shift end.”
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PRIMARY ACTIONS (LARGE, OBVIOUS BUTTONS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {latestDraft ? (
          <button
            type="button"
            id="btn-attendant-continue-account"
            onClick={() => onResumeDraft(latestDraft)}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-base shadow-md hover:shadow-lg flex items-center justify-between transition-all cursor-pointer ring-2 ring-emerald-500/20"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-base font-extrabold">Continue Account</span>
                <span className="text-xs font-normal text-emerald-100">
                  {latestDraft.date} · {activeShiftName} ({accountStatus})
                </span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        ) : (
          <button
            type="button"
            id="btn-attendant-open-account"
            onClick={onNewRecord}
            className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-base shadow-md hover:shadow-lg flex items-center justify-between transition-all cursor-pointer ring-2 ring-emerald-500/20"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                <Plus className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <span className="block text-base font-extrabold">Open / Start Account</span>
                <span className="text-xs font-normal text-emerald-100">
                  Start recording dispenser meters & sales
                </span>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}

        {/* View My Account Button */}
        {latestDraft ? (
          <button
            type="button"
            id="btn-attendant-view-account"
            onClick={() => onSelectRecord(latestDraft)}
            className="w-full py-4 px-6 rounded-2xl bg-stone-900 hover:bg-stone-800 active:scale-98 text-stone-100 font-extrabold text-base shadow-md flex items-center justify-between transition-all cursor-pointer border border-stone-700"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center shrink-0 text-amber-400">
                <Fuel className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-base font-extrabold">View My Account</span>
                <span className="text-xs font-normal text-stone-400">
                  Check current sales and totals
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : latestCompleted ? (
          <button
            type="button"
            id="btn-attendant-view-last-account"
            onClick={() => onSelectRecord(latestCompleted)}
            className="w-full py-4 px-6 rounded-2xl bg-stone-900 hover:bg-stone-800 active:scale-98 text-stone-100 font-extrabold text-base shadow-md flex items-center justify-between transition-all cursor-pointer border border-stone-700"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center shrink-0 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-base font-extrabold">View Last Shift Account</span>
                <span className="text-xs font-normal text-stone-400">
                  {latestCompleted.date} ({latestCompleted.shiftGroup})
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            id="btn-attendant-view-previous-records"
            onClick={onViewAllRecords}
            className="w-full py-4 px-6 rounded-2xl bg-stone-900 hover:bg-stone-800 active:scale-98 text-stone-100 font-extrabold text-base shadow-md flex items-center justify-between transition-all cursor-pointer border border-stone-700"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center shrink-0 text-stone-300">
                <ClipboardList className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-base font-extrabold">View Previous Records</span>
                <span className="text-xs font-normal text-stone-400">
                  Access your shift logs & history
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* OFFLINE STORAGE INDICATOR */}
      <LocalStorageSyncIndicator onRefreshRecords={onRefresh} />

      {/* 3. ACTIVE ACCOUNT LIVE SUMMARY (IF ACCOUNT IS OPEN) */}
      {latestDraft && draftRecon && (
        <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Fuel className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-stone-700">
                Live Account Figures ({latestDraft.date})
              </h2>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              In Progress
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
              <span className="text-[11px] text-stone-500 font-semibold block">Total Litres</span>
              <span className="text-base font-bold font-mono text-emerald-800 block mt-0.5">
                {fmtPlain(draftRecon.totalLitres)} L
              </span>
            </div>

            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
              <span className="text-[11px] text-stone-500 font-semibold block">Total Sales</span>
              <span className="text-base font-bold font-mono text-stone-900 block mt-0.5">
                {fmt(draftRecon.totalSales)}
              </span>
            </div>

            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
              <span className="text-[11px] text-stone-500 font-semibold block">Drawings / Expenses</span>
              <span className="text-base font-bold font-mono text-amber-800 block mt-0.5">
                {fmt(draftRecon.drawings)}
              </span>
            </div>

            <div className="bg-emerald-50/80 rounded-xl p-3 border border-emerald-200">
              <span className="text-[11px] text-emerald-800 font-semibold block">Expected Cash to Bank</span>
              <span className="text-base font-bold font-mono text-emerald-950 block mt-0.5">
                {fmt(draftRecon.totalCashToBank)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. SECONDARY ATTENDANT NAVIGATION LINKS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onViewAllRecords}
          className="p-4 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 text-left transition-all cursor-pointer shadow-xs flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
            <ClipboardList className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-stone-900 block">Previous Records</span>
            <span className="text-[11px] text-stone-500 block">Review past shifts</span>
          </div>
        </button>

        {onNavigateTo && (
          <button
            type="button"
            onClick={() => onNavigateTo('profile')}
            className="p-4 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200 text-left transition-all cursor-pointer shadow-xs flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-stone-900 block">Profile</span>
              <span className="text-[11px] text-stone-500 block">Staff PIN & Details</span>
            </div>
          </button>
        )}

        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="p-4 rounded-2xl bg-white hover:bg-rose-50 border border-stone-200 hover:border-rose-200 text-left transition-all cursor-pointer shadow-xs flex items-center gap-3 col-span-2 sm:col-span-1"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-stone-900 block">Sign Out</span>
              <span className="text-[11px] text-stone-500 block">End current session</span>
            </div>
          </button>
        )}
      </div>

      {/* 5. RECENT FINALIZED SHIFT RECORDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-stone-700">
            My Recent Finalized Records
          </h3>
          <button
            type="button"
            onClick={onViewAllRecords}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
          >
            View All ({mySubmittedRecords.length})
          </button>
        </div>

        {mySubmittedRecords.length > 0 ? (
          <div className="space-y-2">
            {mySubmittedRecords.slice(0, 4).map((r) => {
              const recon = calculateReconciliation(r);
              return (
                <div
                  key={r.id}
                  onClick={() => onSelectRecord(r)}
                  className="bg-white hover:bg-stone-50 rounded-2xl p-3.5 border border-stone-200 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all hover:border-stone-300"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-stone-900">{r.date}</span>
                      <span className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.2 rounded">
                        Shift {r.shiftGroup}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Total: {fmtPlain(recon.totalLitres)} L dispensed
                    </p>
                  </div>

                  <div className="text-right shrink-0 space-y-0.5">
                    <div className="font-mono font-bold text-xs text-stone-900">
                      {fmt(recon.totalCashToBank)}
                    </div>
                    <span
                      className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full ${
                        recon.status === 'balanced'
                          ? 'bg-emerald-100 text-emerald-800'
                          : recon.status === 'shortage'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {recon.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 text-center text-xs text-stone-500 border border-stone-200">
            No completed shift records found yet. Tap <b>"Open / Start Account"</b> to record your forecourt shift.
          </div>
        )}
      </div>
    </div>
  );
};
