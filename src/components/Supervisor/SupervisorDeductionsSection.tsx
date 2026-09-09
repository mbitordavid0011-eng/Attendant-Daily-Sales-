import React, { useState, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building,
  CreditCard,
  Smartphone,
  Tag,
  Droplet,
  Fuel,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  CheckSquare,
  Sparkles,
  Layers,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  SupervisorDeductionType,
  SupervisorDeductionEntry,
  SupervisorDeductionApproval,
  SUPERVISOR_DEDUCTION_CATEGORIES,
} from '../../types';

interface SupervisorDeductionsSectionProps {
  deductions: SupervisorDeductionEntry[];
  onChange: (deductions: SupervisorDeductionEntry[]) => void;
  supervisorName?: string;
  defaultDate?: string;
}

export const SupervisorDeductionsSection: React.FC<SupervisorDeductionsSectionProps> = ({
  deductions = [],
  onChange,
  supervisorName = 'John Mensah',
  defaultDate = new Date().toISOString().slice(0, 10),
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterApproval, setFilterApproval] = useState<'all' | 'approved' | 'pending'>('all');
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  // Group & Subtotals
  const categoryStats = useMemo(() => {
    const stats: Record<
      SupervisorDeductionType,
      { total: number; count: number; approvedCount: number; pendingCount: number }
    > = {
      vouchers: { total: 0, count: 0, approvedCount: 0, pendingCount: 0 },
      r_pay: { total: 0, count: 0, approvedCount: 0, pendingCount: 0 },
      claim_codes: { total: 0, count: 0, approvedCount: 0, pendingCount: 0 },
      approved_company_transactions: { total: 0, count: 0, approvedCount: 0, pendingCount: 0 },
      operational_expenses: { total: 0, count: 0, approvedCount: 0, pendingCount: 0 },
      genset_expenses: { total: 0, count: 0, approvedCount: 0, pendingCount: 0 },
      water_bills: { total: 0, count: 0, approvedCount: 0, pendingCount: 0 },
      tingg: { total: 0, count: 0, approvedCount: 0, pendingCount: 0 },
      visa: { total: 0, count: 0, approvedCount: 0, pendingCount: 0 },
      bank_transactions: { total: 0, count: 0, approvedCount: 0, pendingCount: 0 },
      other_approved: { total: 0, count: 0, approvedCount: 0, pendingCount: 0 },
    };

    let grandTotal = 0;
    let grandApprovedTotal = 0;
    let grandPendingTotal = 0;
    let grandCount = 0;

    deductions.forEach((d) => {
      const amt = Number(d.amount) || 0;
      const t = d.type as SupervisorDeductionType;
      grandTotal += amt;
      grandCount++;

      const isApproved = Boolean(d.approval?.approved);
      if (isApproved) {
        grandApprovedTotal += amt;
      } else {
        grandPendingTotal += amt;
      }

      if (stats[t]) {
        stats[t].total += amt;
        stats[t].count++;
        if (isApproved) {
          stats[t].approvedCount++;
        } else {
          stats[t].pendingCount++;
        }
      }
    });

    return {
      stats,
      grandTotal,
      grandApprovedTotal,
      grandPendingTotal,
      grandCount,
    };
  }, [deductions]);

  // Filtering
  const filteredDeductions = useMemo(() => {
    return deductions.filter((d) => {
      if (activeCategoryFilter !== 'all' && d.type !== activeCategoryFilter) {
        return false;
      }

      const isAppr = Boolean(d.approval?.approved);
      if (filterApproval === 'approved' && !isAppr) return false;
      if (filterApproval === 'pending' && isAppr) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = d.description?.toLowerCase().includes(q);
        const matchRef = d.reference?.toLowerCase().includes(q);
        const matchCompany = d.companyName?.toLowerCase().includes(q);
        const matchApprover = d.approval?.approvedBy?.toLowerCase().includes(q);
        const matchCode = d.approval?.approvalCode?.toLowerCase().includes(q);
        if (!matchDesc && !matchRef && !matchCompany && !matchApprover && !matchCode) {
          return false;
        }
      }

      return true;
    });
  }, [deductions, activeCategoryFilter, filterApproval, searchQuery]);

  // Handlers
  const handleAddDeduction = (type: SupervisorDeductionType = 'vouchers') => {
    const categoryDef = SUPERVISOR_DEDUCTION_CATEGORIES.find((c) => c.type === type);
    const prefixMap: Record<SupervisorDeductionType, string> = {
      vouchers: 'VCH-',
      r_pay: 'RPAY-',
      claim_codes: 'CLM-',
      approved_company_transactions: 'LPO-',
      operational_expenses: 'EXP-',
      genset_expenses: 'GEN-',
      water_bills: 'GWCL-',
      tingg: 'TNG-',
      visa: 'POS-',
      bank_transactions: 'BNK-',
      other_approved: 'OTH-',
    };

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newEntry: SupervisorDeductionEntry = {
      id: 'sded_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5),
      type,
      amount: 0,
      description: categoryDef?.label || 'Deduction item',
      date: defaultDate,
      reference: `${prefixMap[type] || 'REF-'}${randomSuffix}`,
      approval: {
        approved: true,
        approvedBy: supervisorName,
        approvalCode: `AUTH-${randomSuffix}`,
        approvalDate: defaultDate,
        notes: 'Verified during shift accounting',
      },
    };

    const next = [newEntry, ...deductions];
    onChange(next);
    setExpandedEntryId(newEntry.id);
  };

  const handleUpdateEntry = (id: string, field: keyof SupervisorDeductionEntry, val: any) => {
    const next = deductions.map((d) => {
      if (d.id !== id) return d;
      return { ...d, [field]: val };
    });
    onChange(next);
  };

  const handleUpdateApproval = (id: string, field: keyof SupervisorDeductionApproval, val: any) => {
    const next = deductions.map((d) => {
      if (d.id !== id) return d;
      const currApproval: SupervisorDeductionApproval = d.approval || {
        approved: false,
      };
      return {
        ...d,
        approval: {
          ...currApproval,
          [field]: val,
        },
      };
    });
    onChange(next);
  };

  const handleToggleApproval = (id: string) => {
    const next = deductions.map((d) => {
      if (d.id !== id) return d;
      const isCurrentlyApproved = Boolean(d.approval?.approved);
      return {
        ...d,
        approval: {
          approved: !isCurrentlyApproved,
          approvedBy: !isCurrentlyApproved ? (d.approval?.approvedBy || supervisorName) : d.approval?.approvedBy,
          approvalDate: !isCurrentlyApproved ? defaultDate : d.approval?.approvalDate,
          approvalCode: d.approval?.approvalCode || `AUTH-${Math.floor(1000 + Math.random() * 9000)}`,
          notes: d.approval?.notes || '',
        },
      };
    });
    onChange(next);
  };

  const handleRemoveEntry = (id: string) => {
    const next = deductions.filter((d) => d.id !== id);
    onChange(next);
    if (expandedEntryId === id) setExpandedEntryId(null);
  };

  const handleApproveAllPending = () => {
    const next = deductions.map((d) => {
      if (d.approval?.approved) return d;
      return {
        ...d,
        approval: {
          approved: true,
          approvedBy: d.approval?.approvedBy || supervisorName,
          approvalDate: defaultDate,
          approvalCode: d.approval?.approvalCode || `AUTH-${Math.floor(1000 + Math.random() * 9000)}`,
          notes: d.approval?.notes || 'Batch approved by supervisor',
        },
      };
    });
    onChange(next);
  };

  const formatGhc = (val: number) =>
    (isFinite(val) ? val : 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="space-y-5">
      {/* SECTION BANNER & QUICK ACTIONS */}
      <div className="p-4 rounded-xl bg-[#15171a] border border-[#333739] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500 text-[#15171a]">
              ACCOUNTING / DEDUCTIONS
            </span>
            <span className="text-xs text-[#8d9195]">
              {categoryStats.grandCount} item(s) recorded
            </span>
          </div>
          <h3 className="text-base font-extrabold text-[#ece8e0] uppercase tracking-tight font-['Space_Grotesk'] mt-1 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#e8b93b]" />
            Deductions & Shift Accounting Ledger
          </h3>
          <p className="text-xs text-[#8d9195] mt-0.5">
            Amounts deducted from gross sales: Vouchers, R-Pay, Claim codes, Approved company transactions, Expenses, Utility bills, Digital & Bank settlements.
          </p>
        </div>

        {/* Quick Add Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative group">
            <button
              type="button"
              className="pl-btn primary text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
              onClick={() => handleAddDeduction('vouchers')}
            >
              <Plus size={14} />
              <span>+ Add Deduction</span>
            </button>
          </div>

          {categoryStats.grandPendingTotal > 0 && (
            <button
              type="button"
              onClick={handleApproveAllPending}
              className="pl-btn text-xs bg-amber-950/60 border-amber-700/60 text-amber-300 hover:bg-amber-900/60 flex items-center gap-1.5 cursor-pointer"
              title="Approve all pending deductions"
            >
              <ShieldCheck size={13} />
              <span>Approve Pending ({formatGhc(categoryStats.grandPendingTotal)})</span>
            </button>
          )}
        </div>
      </div>

      {/* TOP SUMMARY STATS KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#1d2023] border border-[#333739] space-y-1">
          <span className="text-[11px] text-[#8d9195] block font-medium">Total Deductions</span>
          <span className="text-lg font-extrabold text-rose-400 font-mono block">
            GH₵ {formatGhc(categoryStats.grandTotal)}
          </span>
          <span className="text-[10px] text-[#8d9195] block">
            Accounted against sales
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1d2023] border border-[#333739] space-y-1">
          <span className="text-[11px] text-[#8d9195] block font-medium">Approved Deductions</span>
          <span className="text-lg font-extrabold text-emerald-400 font-mono block">
            GH₵ {formatGhc(categoryStats.grandApprovedTotal)}
          </span>
          <span className="text-[10px] text-emerald-500/80 block">
            Verified with audit ref
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1d2023] border border-[#333739] space-y-1">
          <span className="text-[11px] text-[#8d9195] block font-medium">Pending Approval</span>
          <span
            className={`text-lg font-extrabold font-mono block ${
              categoryStats.grandPendingTotal > 0 ? 'text-amber-400' : 'text-[#ece8e0]'
            }`}
          >
            GH₵ {formatGhc(categoryStats.grandPendingTotal)}
          </span>
          <span className="text-[10px] text-[#8d9195] block">
            {categoryStats.grandPendingTotal > 0 ? 'Awaiting sign-off' : 'All approved'}
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#1d2023] border border-[#333739] space-y-1">
          <span className="text-[11px] text-[#8d9195] block font-medium">Supported Types</span>
          <span className="text-lg font-extrabold text-[#e8b93b] font-mono block">
            11 Categories
          </span>
          <span className="text-[10px] text-[#8d9195] block">
            Vouchers, R-Pay, VISA, Bank & Bills
          </span>
        </div>
      </div>

      {/* 11-CATEGORY HORIZONTAL FILTER CHIPS */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8d9195]">
          Filter by Transaction Category:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin flex-wrap">
          <button
            type="button"
            onClick={() => setActiveCategoryFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeCategoryFilter === 'all'
                ? 'bg-[#e8b93b] text-[#15171a] shadow-xs'
                : 'bg-[#23262a] text-[#8d9195] hover:text-[#ece8e0] border border-[#333739]'
            }`}
          >
            <span>All Categories</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-mono">
              {deductions.length}
            </span>
          </button>

          {SUPERVISOR_DEDUCTION_CATEGORIES.map((cat) => {
            const stat = categoryStats.stats[cat.type] || { total: 0, count: 0 };
            const isActive = activeCategoryFilter === cat.type;

            return (
              <button
                key={cat.type}
                type="button"
                onClick={() => setActiveCategoryFilter(cat.type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1.5 border ${
                  isActive
                    ? `${cat.badgeColor} border-current shadow-xs`
                    : 'bg-[#1d2023] text-[#8d9195] hover:text-[#ece8e0] border-[#333739]'
                }`}
              >
                <span>{cat.label}</span>
                {stat.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono font-bold">
                    GH₵ {formatGhc(stat.total)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* QUICK ADD BUTTONS BAR FOR ALL 11 CATEGORIES */}
      <div className="p-3 rounded-xl bg-[#1d2023] border border-[#333739] space-y-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8d9195] flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[#e8b93b]" />
          Quick Add Specific Deduction Category:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
          {SUPERVISOR_DEDUCTION_CATEGORIES.map((cat) => (
            <button
              key={cat.type}
              type="button"
              onClick={() => handleAddDeduction(cat.type)}
              className="px-2 py-1.5 rounded-lg bg-[#23262a] hover:bg-[#2d3136] border border-[#333739] hover:border-amber-500/50 text-[11px] text-[#ece8e0] font-medium text-left truncate cursor-pointer transition-colors flex items-center gap-1"
              title={`Add ${cat.label}`}
            >
              <Plus size={11} className="text-[#e8b93b] shrink-0" />
              <span className="truncate">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* SEARCH AND FILTER STATUS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8d9195]" />
          <input
            type="text"
            placeholder="Search description, reference, company, or approval code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#15171a] border border-[#333739] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#ece8e0]"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterApproval}
            onChange={(e) => setFilterApproval(e.target.value as any)}
            className="bg-[#15171a] border border-[#333739] rounded-xl px-3 py-1.5 text-xs text-[#ece8e0]"
          >
            <option value="all">All Approval States</option>
            <option value="approved">Approved Only</option>
            <option value="pending">Pending Approval</option>
          </select>
        </div>
      </div>

      {/* DEDUCTIONS TABLE / LIST */}
      {filteredDeductions.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-[#333739] bg-[#15171a] text-center space-y-3">
          <Receipt className="w-8 h-8 text-[#8d9195] mx-auto opacity-50" />
          <div className="text-xs text-[#8d9195]">
            No deductions found for the selected criteria.
          </div>
          <button
            type="button"
            onClick={() => handleAddDeduction(activeCategoryFilter === 'all' ? 'vouchers' : (activeCategoryFilter as any))}
            className="pl-btn text-xs primary inline-flex items-center gap-1.5"
          >
            <Plus size={13} />
            <span>Record New Deduction</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeductions.map((entry) => {
            const categoryDef =
              SUPERVISOR_DEDUCTION_CATEGORIES.find((c) => c.type === entry.type) ||
              SUPERVISOR_DEDUCTION_CATEGORIES[0];
            const isApproved = Boolean(entry.approval?.approved);
            const isExpanded = expandedEntryId === entry.id;

            return (
              <div
                key={entry.id}
                className={`rounded-xl border transition-colors ${
                  isApproved
                    ? 'border-[#333739] bg-[#15171a]'
                    : 'border-amber-700/60 bg-amber-950/20'
                }`}
              >
                {/* PRIMARY ROW HEADER */}
                <div className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 flex-1">
                    {/* Category Selector */}
                    <div className="w-48 shrink-0">
                      <select
                        value={entry.type}
                        onChange={(e) =>
                          handleUpdateEntry(entry.id, 'type', e.target.value as SupervisorDeductionType)
                        }
                        className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1.5 text-xs text-[#ece8e0] font-semibold"
                      >
                        {SUPERVISOR_DEDUCTION_CATEGORIES.map((cat) => (
                          <option key={cat.type} value={cat.type}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Description */}
                    <div className="flex-1 min-w-[140px]">
                      <input
                        type="text"
                        placeholder="Description (e.g. STC Fleet Vouchers, Genset Fuel 30L, GWCL Bill)..."
                        value={entry.description}
                        onChange={(e) => handleUpdateEntry(entry.id, 'description', e.target.value)}
                        className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-[#ece8e0]"
                      />
                    </div>

                    {/* Reference */}
                    <div className="w-32 shrink-0">
                      <input
                        type="text"
                        placeholder="Ref / Voucher #"
                        value={entry.reference}
                        onChange={(e) => handleUpdateEntry(entry.id, 'reference', e.target.value)}
                        className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1.5 text-xs text-[#ece8e0] font-mono text-center"
                        title="Voucher, Claim, POS or Bank Reference Code"
                      />
                    </div>

                    {/* Date */}
                    <div className="w-28 shrink-0">
                      <input
                        type="date"
                        value={entry.date}
                        onChange={(e) => handleUpdateEntry(entry.id, 'date', e.target.value)}
                        className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1.5 text-xs text-[#ece8e0] font-mono"
                      />
                    </div>
                  </div>

                  {/* RIGHT: AMOUNT & APPROVAL ACTIONS */}
                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                    {/* Amount Input */}
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-[#8d9195] font-mono">GH₵</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={entry.amount || ''}
                        onChange={(e) =>
                          handleUpdateEntry(entry.id, 'amount', parseFloat(e.target.value) || 0)
                        }
                        className="w-28 bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1.5 text-xs font-mono font-extrabold text-right text-rose-300 focus:text-white"
                      />
                    </div>

                    {/* Approval Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleApproval(entry.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors border ${
                        isApproved
                          ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60'
                          : 'bg-amber-950/80 text-amber-300 border-amber-700/80'
                      }`}
                      title={isApproved ? 'Approved. Click to toggle' : 'Pending Approval. Click to approve'}
                    >
                      {isApproved ? (
                        <>
                          <CheckCircle2 size={12} />
                          <span>Approved</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle size={12} />
                          <span>Pending</span>
                        </>
                      )}
                    </button>

                    {/* Expand Details Toggle */}
                    <button
                      type="button"
                      onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
                      className="p-1.5 rounded-lg bg-[#23262a] hover:bg-[#2d3136] text-[#8d9195] hover:text-[#ece8e0] cursor-pointer"
                      title="Approval & Contextual Metadata"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => handleRemoveEntry(entry.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 cursor-pointer"
                      title="Delete entry"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* EXPANDABLE APPROVAL & CONTEXTUAL DETAILS PANEL */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-[#23262a] bg-[#191c1f] rounded-b-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-[#8d9195] uppercase block mb-1">
                        Approved By (Manager / Head Office)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Kwame Mensah (Manager)"
                        value={entry.approval?.approvedBy || ''}
                        onChange={(e) => handleUpdateApproval(entry.id, 'approvedBy', e.target.value)}
                        className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1 text-xs text-[#ece8e0]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#8d9195] uppercase block mb-1">
                        Approval Code / Authorization Token
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. AUTH-9821 / LPO-441"
                        value={entry.approval?.approvalCode || ''}
                        onChange={(e) => handleUpdateApproval(entry.id, 'approvalCode', e.target.value)}
                        className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1 text-xs text-[#ece8e0] font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#8d9195] uppercase block mb-1">
                        Company / Fleet Account Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. State Housing Corp / VIP Logistics"
                        value={entry.companyName || ''}
                        onChange={(e) => handleUpdateEntry(entry.id, 'companyName', e.target.value)}
                        className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1 text-xs text-[#ece8e0]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-[#8d9195] uppercase block mb-1">
                        Vehicle Reg / POS Terminal ID
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. GN-4920-24 / POS-TMA-02"
                        value={entry.vehicleReg || entry.channel || ''}
                        onChange={(e) => handleUpdateEntry(entry.id, 'vehicleReg', e.target.value)}
                        className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1 text-xs text-[#ece8e0] font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2 md:col-span-4">
                      <label className="text-[10px] font-bold text-[#8d9195] uppercase block mb-1">
                        Audit Remarks & Approval Justification
                      </label>
                      <input
                        type="text"
                        placeholder="Enter any notes on invoice verification, manager pre-approval, or physical slip retention..."
                        value={entry.approval?.notes || ''}
                        onChange={(e) => handleUpdateApproval(entry.id, 'notes', e.target.value)}
                        className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2.5 py-1 text-xs text-[#ece8e0]"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
