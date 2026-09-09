import React, { useState } from 'react';
import { Search, Filter, Calendar, User, Building, ArrowRight, GitBranch, UserCheck, Fuel } from 'lucide-react';
import { ShiftRecord, UserProfile } from '../types';
import { calculateReconciliation, fmt, fmtPlain } from '../utils/calculations';

interface HistoryListProps {
  records: ShiftRecord[];
  profile?: UserProfile;
  onSelectRecord: (record: ShiftRecord) => void;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  records,
  profile,
  onSelectRecord,
  onRefresh,
  isRefreshing = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<'All' | 'A' | 'B'>('All');
  const [periodFilter, setPeriodFilter] = useState<'All' | 'Day' | 'Night'>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'draft' | 'balanced' | 'shortage' | 'excess'>('All');
  const [ownerFilter, setOwnerFilter] = useState<'all' | 'my'>('all');

  const isSupervisor = profile?.role === 'supervisor' || profile?.role === 'station_manager' || profile?.role === 'company_admin';
  const myName = (profile?.supervisor || profile?.attendant || profile?.name || '').trim().toLowerCase();
  const currentStaffId = (profile?.staffId || '').trim().toLowerCase();

  const filtered = records.filter((r) => {
    const recon = calculateReconciliation(r);

    // CRITICAL: If attendant, STRICTLY only allow records belonging to this attendant!
    if (!isSupervisor) {
      const recordAttendant = (r.attendant || '').trim().toLowerCase();
      const recordAttendantId = (r.attendantId || '').trim().toLowerCase();
      const isMine =
        (myName && recordAttendant.includes(myName)) ||
        (currentStaffId && (recordAttendant.includes(currentStaffId) || recordAttendantId === currentStaffId));
      if (!isMine) return false;
    } else if (ownerFilter === 'my' && myName) {
      // Owner filter for supervisor
      const isMine =
        r.attendant?.trim().toLowerCase() === myName ||
        r.supervisor?.trim().toLowerCase() === myName;
      if (!isMine) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const combined = `${r.date} ${r.attendant} ${r.station} ${r.supervisor} ${r.shiftGroup} ${r.shiftPeriod}`.toLowerCase();
      if (!combined.includes(q)) return false;
    }

    // Group filter
    if (groupFilter !== 'All' && r.shiftGroup !== groupFilter) return false;

    // Period filter
    if (periodFilter !== 'All' && r.shiftPeriod !== periodFilter) return false;

    // Status filter
    if (statusFilter !== 'All') {
      if (statusFilter === 'draft') {
        if (r.status !== 'draft') return false;
      } else {
        if (r.status === 'draft' || recon.status !== statusFilter) return false;
      }
    }

    return true;
  });

  const content = (
    <div className="space-y-4 pb-12">
      <div>
        <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
          {isSupervisor ? 'Forecourt & Shift Records' : 'Shift Records History'}
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          View, search, and audit past fuel shift reconciliations and drafts. Swipe down to refresh.
        </p>
      </div>

      {/* Supervisor Scope Switcher */}
      {isSupervisor && (
        <div className="flex gap-2 p-1 bg-stone-200/80 rounded-xl">
          <button
            type="button"
            onClick={() => setOwnerFilter('all')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              ownerFilter === 'all'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All Forecourt Attendants ({records.length})
          </button>
          <button
            type="button"
            onClick={() => setOwnerFilter('my')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              ownerFilter === 'my'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            My Shift Sales
          </button>
        </div>
      )}

      {/* Search Box */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by date, attendant, station, or shift..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white border border-stone-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-xs"
        />
      </div>

      {/* Filter Chips */}
      <div className="space-y-2">
        {/* Shift Group */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(['All', 'A', 'B'] as const).map((grp) => (
            <button
              key={grp}
              onClick={() => setGroupFilter(grp)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                groupFilter === grp
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {grp === 'All' ? 'All Groups' : `Group ${grp}`}
            </button>
          ))}
        </div>

        {/* Shift Period */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(['All', 'Day', 'Night'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setPeriodFilter(period)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                periodFilter === period
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {period === 'All' ? 'All Shifts' : period === 'Day' ? '☀️ Day' : '🌙 Night'}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(['All', 'balanced', 'shortage', 'excess', 'draft'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
        <span>
          Showing <strong>{filtered.length}</strong> {filtered.length === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* Records List */}
      <div className="space-y-2">
        {filtered.length > 0 ? (
          filtered.map((r) => {
            const recon = calculateReconciliation(r);
            const isDraft = r.status === 'draft';

            return (
              <div
                key={r.id}
                onClick={() => onSelectRecord(r)}
                className="bg-white hover:bg-stone-50/80 rounded-2xl p-3.5 border border-stone-200 shadow-xs flex items-center justify-between gap-3 cursor-pointer transition-all hover:border-stone-300"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-stone-900">{r.date}</span>
                    <span className="text-stone-300">·</span>
                    <span className="text-xs font-semibold text-stone-700">
                      Group {r.shiftGroup}
                    </span>
                    {r.revisionOf && (
                      <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">
                        rev
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-stone-500 flex items-center gap-2">
                    <span>{r.attendant || 'Attendant'}</span>
                    <span>·</span>
                    <span className="truncate max-w-[150px]">{r.station || 'Station'}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <div className="font-mono font-bold text-xs text-stone-900">
                    {isDraft ? 'In Progress' : fmt(recon.totalCashToBank)}
                  </div>
                  <span
                    className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-full ${
                      isDraft
                        ? 'bg-blue-100 text-blue-800'
                        : recon.status === 'balanced'
                        ? 'bg-emerald-100 text-emerald-800'
                        : recon.status === 'shortage'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isDraft ? 'Draft' : recon.status}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center text-xs text-stone-400 border border-stone-200 space-y-1">
            <p className="font-semibold text-stone-600">No shift records match your filter criteria.</p>
            <p className="text-[11px] text-stone-400">Try clearing search terms or changing filters.</p>
          </div>
        )}
      </div>
    </div>
  );

  return content;
};

