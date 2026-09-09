import React, { useState, useMemo } from 'react';
import {
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Calendar,
  Fuel,
  Droplet,
  CreditCard,
  Banknote,
  Printer,
  Trash2,
  Search,
  Filter,
  Eye,
  Lock,
  Unlock,
  Building,
  User,
  RotateCcw,
} from 'lucide-react';
import { SupervisorSalesAccountRecord } from '../../types';
import { computeSupervisorSalesSummary } from '../../utils/accountabilityCalculations';

interface SupervisorSalesAccountControlPanelProps {
  records: SupervisorSalesAccountRecord[];
  supervisorName: string;
  stationName: string;
  stationCode: string;
  onOpenRecord: (record: SupervisorSalesAccountRecord) => void;
  onAddRecord: () => void;
  onDeleteRecord: (id: string) => void;
  onClearAllRecords?: () => void;
  onClearClosedRecords?: () => void;
}

export const SupervisorSalesAccountControlPanel: React.FC<SupervisorSalesAccountControlPanelProps> = ({
  records,
  supervisorName,
  stationName,
  stationCode,
  onOpenRecord,
  onAddRecord,
  onDeleteRecord,
  onClearAllRecords,
  onClearClosedRecords,
}) => {
  const [viewMode, setPanelViewMode] = useState<'cards' | 'table'>('cards');
  const [filter, setFilter] = useState<'all' | 'open' | 'multi_day' | 'closed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearClosedConfirm, setShowClearClosedConfirm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Compute aggregate metrics across all supervisor sales accounts
  const aggregate = useMemo(() => {
    let grossSales = 0;
    let expectedCash = 0;
    let actualCash = 0;
    let totalDrawings = 0;
    let openCount = 0;
    let closedCount = 0;
    let multiDayCount = 0;
    let shortageCount = 0;

    records.forEach((r) => {
      const s = computeSupervisorSalesSummary(r);
      grossSales += s.grossSales;
      expectedCash += s.expectedCashToBank;
      actualCash += s.actualCashCounted;
      totalDrawings += s.totalDrawings;
      if (s.accountState === 'open') {
        openCount++;
        if (s.isMultiDay) multiDayCount++;
      } else {
        closedCount++;
      }
      if (s.status === 'shortage') shortageCount++;
    });

    const netVariance = actualCash - expectedCash;

    return {
      grossSales,
      expectedCash,
      actualCash,
      totalDrawings,
      netVariance,
      openCount,
      closedCount,
      multiDayCount,
      shortageCount,
    };
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const s = computeSupervisorSalesSummary(r);
      const isOpen = s.accountState === 'open';

      if (filter === 'open' && !isOpen) return false;
      if (filter === 'closed' && isOpen) return false;
      if (filter === 'multi_day' && (!isOpen || !s.isMultiDay)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.supervisorName?.toLowerCase().includes(q);
        const matchShift = r.shiftType?.toLowerCase().includes(q);
        const matchDate = r.date?.toLowerCase().includes(q);
        const matchStaff = r.staffId?.toLowerCase().includes(q);
        if (!matchName && !matchShift && !matchDate && !matchStaff) return false;
      }

      return true;
    });
  }, [records, filter, searchQuery]);

  const fmt = (val: number) =>
    (isFinite(val) ? val : 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="space-y-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#333739]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-[#e8b93b] text-[#15171a]">
              SUPERVISOR SALES LEDGER
            </span>
            <span className="text-xs font-mono text-[#8d9195]">{stationName} ({stationCode})</span>
          </div>
          <h1 className="text-xl font-extrabold uppercase tracking-tight text-[#ece8e0] font-['Space_Grotesk'] mt-1 flex items-center gap-2">
            <Banknote className="w-6 h-6 text-[#e8b93b]" />
            Supervisor's Sales Account
          </h1>
          <p className="text-xs text-[#8d9195]">
            Master Sales Accountability, Lubricants & Engine Oils (Doc No: SOC/LPL/2026/01), Drawings & Safe Cash Deposit.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex bg-[#23262a] p-1 rounded-lg border border-[#333739]">
            <button
              onClick={() => setPanelViewMode('cards')}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                viewMode === 'cards'
                  ? 'bg-[#15171a] text-[#e8b93b] shadow-xs'
                  : 'text-[#8d9195] hover:text-[#ece8e0]'
              }`}
            >
              Sales Cards
            </button>
            <button
              onClick={() => setPanelViewMode('table')}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                viewMode === 'table'
                  ? 'bg-[#15171a] text-[#e8b93b] shadow-xs'
                  : 'text-[#8d9195] hover:text-[#ece8e0]'
              }`}
            >
              Manager's Audit Ledger
            </button>
          </div>

          <button
            type="button"
            onClick={onAddRecord}
            className="pl-btn primary text-xs flex items-center gap-1.5"
          >
            <PlusCircle size={13} />
            <span>+ New Sales Account</span>
          </button>
        </div>
      </div>

      {/* MULTI-DAY ACCOUNT CONTINUITY EXPLANATION BANNER */}
      <div className="p-3.5 rounded-xl bg-[#15171a] border border-[#333739] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[#e8b93b] shrink-0 mt-0.5">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-[#ece8e0] block">
              Supervisor Sales & Lubricant Accountability Structure
            </span>
            <p className="text-[#8d9195] text-[11.5px] mt-0.5">
              The station supervisor is exclusively responsible for station lubricant stock accounting, total dispenser fuel throughput reconciliation, corporate approved credit, and physical safe vault deposits.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#23262a] border border-amber-500/40 text-amber-300 font-semibold">
            {aggregate.openCount} Open ({aggregate.multiDayCount} Multi-Day)
          </span>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#23262a] border border-emerald-500/40 text-emerald-300 font-semibold">
            {aggregate.closedCount} Closed
          </span>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-xl bg-[#1d2023] border border-[#333739] space-y-1">
          <span className="text-[11px] text-[#8d9195] block font-medium">Total Gross Sales</span>
          <span className="text-base sm:text-lg font-extrabold text-[#e8b93b] font-mono block">
            GH₵ {fmt(aggregate.grossSales)}
          </span>
          <span className="text-[10px] text-[#8d9195] block">
            Fuel + Lubricants & Oils
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1d2023] border border-[#333739] space-y-1">
          <span className="text-[11px] text-[#8d9195] block font-medium">Expected Cash to Bank</span>
          <span className="text-base sm:text-lg font-extrabold text-[#ece8e0] font-mono block">
            GH₵ {fmt(aggregate.expectedCash)}
          </span>
          <span className="text-[10px] text-blue-400 block">
            Drawings: GH₵ {fmt(aggregate.totalDrawings)}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1d2023] border border-[#333739] space-y-1">
          <span className="text-[11px] text-[#8d9195] block font-medium">Actual Physical Cash</span>
          <span className="text-base sm:text-lg font-extrabold text-emerald-400 font-mono block">
            GH₵ {fmt(aggregate.actualCash)}
          </span>
          <span className="text-[10px] text-[#8d9195] block">
            Vault Notes & Coins
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1d2023] border border-[#333739] space-y-1">
          <span className="text-[11px] text-[#8d9195] block font-medium">Net Cash Variance</span>
          <span
            className={`text-base sm:text-lg font-extrabold font-mono block ${
              Math.abs(aggregate.netVariance) <= 0.5
                ? 'text-emerald-400'
                : aggregate.netVariance < 0
                ? 'text-rose-400'
                : 'text-amber-400'
            }`}
          >
            {aggregate.netVariance >= 0 ? '+' : ''}GH₵ {fmt(aggregate.netVariance)}
          </span>
          <span className="text-[10px] text-[#8d9195] block">
            {aggregate.shortageCount > 0
              ? `${aggregate.shortageCount} shortage shift(s)`
              : 'All shifts balanced'}
          </span>
        </div>
      </div>

      {/* CONTROLS BAR: FILTERS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full font-semibold cursor-pointer transition-colors ${
              filter === 'all'
                ? 'bg-[#e8b93b] text-[#15171a]'
                : 'bg-[#23262a] text-[#8d9195] hover:text-[#ece8e0] border border-[#333739]'
            }`}
          >
            All Accounts ({records.length})
          </button>
          <button
            onClick={() => setFilter('open')}
            className={`px-3 py-1 rounded-full font-semibold cursor-pointer transition-colors ${
              filter === 'open'
                ? 'bg-amber-400 text-[#15171a]'
                : 'bg-[#23262a] text-amber-400/90 hover:text-amber-300 border border-amber-900/50'
            }`}
          >
            Open / Active ({aggregate.openCount})
          </button>
          <button
            onClick={() => setFilter('multi_day')}
            className={`px-3 py-1 rounded-full font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
              filter === 'multi_day'
                ? 'bg-amber-400 text-[#15171a]'
                : 'bg-[#23262a] text-amber-400/90 hover:text-amber-300 border border-amber-900/50'
            }`}
          >
            <Calendar className="w-3 h-3" />
            <span>Multi-Day Open ({aggregate.multiDayCount})</span>
          </button>
          <button
            onClick={() => setFilter('closed')}
            className={`px-3 py-1 rounded-full font-semibold cursor-pointer transition-colors ${
              filter === 'closed'
                ? 'bg-emerald-500 text-white'
                : 'bg-[#23262a] text-emerald-400/90 hover:text-emerald-300 border border-emerald-900/50'
            }`}
          >
            Closed & Reconciled ({aggregate.closedCount})
          </button>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8d9195]" />
            <input
              type="text"
              placeholder="Search shift, date, staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#15171a] border border-[#333739] rounded-lg pl-8 pr-3 py-1 text-xs text-[#ece8e0] w-48 sm:w-56"
            />
          </div>

          {onClearClosedRecords && aggregate.closedCount > 0 && (
            <button
              onClick={() => setShowClearClosedConfirm(true)}
              className="px-2.5 py-1 rounded-lg border border-[#333739] bg-[#23262a] hover:bg-[#2e3237] text-[#8d9195] hover:text-[#ece8e0] text-xs font-semibold cursor-pointer transition-colors"
              title="Clear only closed sales accounts"
            >
              Clear Closed
            </button>
          )}

          {onClearAllRecords && records.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-2.5 py-1 rounded-lg border border-rose-900/40 bg-rose-950/30 hover:bg-rose-950/60 text-rose-300 text-xs font-semibold cursor-pointer transition-colors"
              title="Clear all supervisor sales accounts"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: SALES CARDS GRID */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredRecords.map((r) => {
            const s = computeSupervisorSalesSummary(r);
            const isClosed = s.accountState === 'closed';

            return (
              <div
                key={r.id}
                onClick={() => onOpenRecord(r)}
                className="p-4 rounded-2xl bg-[#1d2023] border border-[#333739] hover:border-amber-500/60 transition-all cursor-pointer shadow-sm hover:shadow-md space-y-3.5 relative group"
              >
                {/* CARD TOP HEADER */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-[#15171a] border border-[#333739] flex items-center justify-center text-[#e8b93b] font-bold shrink-0">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-[#ece8e0] text-sm">
                          {r.supervisorName || supervisorName}
                        </span>
                        <span className="text-[10px] font-mono text-[#8d9195]">
                          ({r.staffId || 'SO-SUP-01'})
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8d9195] font-mono">
                        {r.date} · {r.shiftType || 'Shift A — Day'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {isClosed ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Closed
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Active Open
                      </span>
                    )}

                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        Math.abs(s.netVariance) <= 0.5
                          ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800'
                          : s.netVariance < 0
                          ? 'bg-rose-950/70 text-rose-300 border border-rose-800'
                          : 'bg-amber-950/70 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {s.netVariance >= 0 ? '+' : ''}GH₵ {fmt(s.netVariance)}
                    </span>
                  </div>
                </div>

                {/* SALES & DRAWINGS NUMBERS */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-[#15171a] border border-[#333739] text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-[#8d9195] block">Gross Sales:</span>
                    <span className="font-bold text-[#e8b93b]">GH₵ {fmt(s.grossSales)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8d9195] block">Expected Cash:</span>
                    <span className="font-bold text-[#ece8e0]">GH₵ {fmt(s.expectedCashToBank)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8d9195] block">Physical Cash:</span>
                    <span className="font-bold text-emerald-400">GH₵ {fmt(s.actualCashCounted)}</span>
                  </div>
                </div>

                {/* BREAKDOWN PILLS */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-[#8d9195]">
                  <span className="px-2 py-0.5 rounded bg-[#23262a] border border-[#333739] flex items-center gap-1">
                    <Fuel size={12} className="text-amber-400" /> {fmt(s.totalFuelLitres)} L Fuel
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#23262a] border border-[#333739] flex items-center gap-1">
                    <Droplet size={12} className="text-blue-400" /> {s.totalLubeUnitsSold} Lubes
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#23262a] border border-[#333739] flex items-center gap-1">
                    <CreditCard size={12} className="text-emerald-400" /> GH₵ {fmt(s.categoryB_evalues)} Digital
                  </span>
                </div>

                {/* BOTTOM ACTION */}
                <div className="flex items-center justify-between pt-1 border-t border-[#2d3136] text-xs">
                  <span className="text-[11px] text-amber-400/90 font-medium group-hover:underline">
                    Click to Open & Reconcile Account →
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(r.id);
                    }}
                    className="p-1 rounded text-[#8d9195] hover:text-rose-400 hover:bg-rose-950/30 cursor-pointer transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredRecords.length === 0 && (
            <div className="col-span-full p-8 rounded-2xl bg-[#15171a] border border-dashed border-[#333739] text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#23262a] text-[#8d9195] flex items-center justify-center mx-auto">
                <Banknote size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#ece8e0]">No Supervisor Sales Accounts Found</h3>
                <p className="text-xs text-[#8d9195]">
                  Create a new supervisor sales shift account to begin logging dispenser sales, lubricants, and safe cash reconciliations.
                </p>
              </div>
              <button
                type="button"
                onClick={onAddRecord}
                className="pl-btn primary text-xs inline-flex items-center gap-1.5"
              >
                <PlusCircle size={13} />
                <span>+ Create First Sales Account</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: MANAGER'S AUDIT TABLE */}
      {viewMode === 'table' && (
        <div className="rounded-2xl border border-[#333739] bg-[#15171a] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#23262a] text-[#8d9195] font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-3">Shift Date & Period</th>
                  <th className="p-3">Supervisor</th>
                  <th className="p-3 text-right">Fuel Sales</th>
                  <th className="p-3 text-right">Lubes Sales</th>
                  <th className="p-3 text-right">Gross Sales</th>
                  <th className="p-3 text-right">Drawings (A+B+D)</th>
                  <th className="p-3 text-right">Expected Cash</th>
                  <th className="p-3 text-right">Actual Cash</th>
                  <th className="p-3 text-right">Variance</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333739]">
                {filteredRecords.map((r) => {
                  const s = computeSupervisorSalesSummary(r);

                  return (
                    <tr
                      key={r.id}
                      onClick={() => onOpenRecord(r)}
                      className="hover:bg-[#1d2023]/60 cursor-pointer transition-colors font-mono"
                    >
                      <td className="p-3 font-sans">
                        <div className="font-bold text-[#ece8e0]">{r.date}</div>
                        <div className="text-[10.5px] text-[#8d9195] font-mono">{r.shiftType}</div>
                      </td>
                      <td className="p-3 font-sans">
                        <div className="font-bold text-[#ece8e0]">{r.supervisorName || supervisorName}</div>
                        <div className="text-[10px] text-[#8d9195] font-mono">{r.staffId || 'SO-SUP-01'}</div>
                      </td>
                      <td className="p-3 text-right font-bold text-[#ece8e0]">
                        GH₵ {fmt(s.totalFuelSales)}
                      </td>
                      <td className="p-3 text-right font-bold text-amber-300">
                        GH₵ {fmt(s.totalLubeSales)}
                      </td>
                      <td className="p-3 text-right font-extrabold text-[#e8b93b]">
                        GH₵ {fmt(s.grossSales)}
                      </td>
                      <td className="p-3 text-right text-rose-300">
                        GH₵ {fmt(s.totalDrawings)}
                      </td>
                      <td className="p-3 text-right font-bold text-[#ece8e0]">
                        GH₵ {fmt(s.expectedCashToBank)}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-400">
                        GH₵ {fmt(s.actualCashCounted)}
                      </td>
                      <td className="p-3 text-right">
                        <span
                          className={`font-bold ${
                            Math.abs(s.netVariance) <= 0.5
                              ? 'text-emerald-400'
                              : s.netVariance < 0
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {s.netVariance >= 0 ? '+' : ''}GH₵ {fmt(s.netVariance)}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full font-sans ${
                            s.accountState === 'closed'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {s.accountState === 'closed' ? 'Closed' : 'Open'}
                        </span>
                      </td>
                      <td className="p-3 text-center font-sans">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenRecord(r);
                          }}
                          className="px-2.5 py-1 rounded bg-[#23262a] hover:bg-[#2d3136] text-[#ece8e0] text-xs font-bold transition-colors"
                        >
                          Audit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOGS */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#1d2023] border border-rose-900 rounded-2xl p-5 max-w-sm w-full space-y-4 text-[#ece8e0]">
            <div className="w-10 h-10 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold">Clear All Supervisor Sales Accounts?</h3>
              <p className="text-xs text-[#8d9195]">
                This will delete all supervisor sales accounts from local persistence.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="py-2 px-3 rounded-xl border border-[#333739] bg-[#23262a] text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllRecords) onClearAllRecords();
                  setShowClearConfirm(false);
                }}
                className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearClosedConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#1d2023] border border-[#333739] rounded-2xl p-5 max-w-sm w-full space-y-4 text-[#ece8e0]">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 text-[#e8b93b] flex items-center justify-center mx-auto">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold">Clear Closed Accounts?</h3>
              <p className="text-xs text-[#8d9195]">
                This will purge all closed sales accounts and keep only active open shifts.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowClearClosedConfirm(false)}
                className="py-2 px-3 rounded-xl border border-[#333739] bg-[#23262a] text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearClosedRecords) onClearClosedRecords();
                  setShowClearClosedConfirm(false);
                }}
                className="py-2 px-3 rounded-xl bg-[#e8b93b] hover:bg-[#d6a528] text-[#15171a] text-xs font-bold"
              >
                Clear Closed
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#1d2023] border border-rose-900 rounded-2xl p-5 max-w-sm w-full space-y-4 text-[#ece8e0]">
            <div className="w-10 h-10 rounded-full bg-rose-950 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-sm font-bold">Delete Sales Account?</h3>
              <p className="text-xs text-[#8d9195]">
                Are you sure you want to permanently delete this sales account?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="py-2 px-3 rounded-xl border border-[#333739] bg-[#23262a] text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteRecord(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
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
