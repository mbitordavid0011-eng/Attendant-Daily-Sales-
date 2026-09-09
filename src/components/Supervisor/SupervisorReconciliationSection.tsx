import React from 'react';
import {
  ShieldCheck,
  CheckSquare,
  Lock,
  Unlock,
  Trash2,
  Printer,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileText,
} from 'lucide-react';
import {
  SupervisorSalesAccountRecord,
  SUPERVISOR_DEDUCTION_CATEGORIES,
} from '../../types';

interface SupervisorReconciliationSectionProps {
  form: SupervisorSalesAccountRecord;
  onUpdateForm: (updated: Partial<SupervisorSalesAccountRecord>) => void;
  formatGhc: (val: number) => string;
  summary: any;
  supervisorName: string;
  stationName: string;
  stationCode: string;
  isAccountClosed: boolean;
  onReopenAccount: () => void;
  onRequestCloseAccount: () => void;
  onRequestDelete?: () => void;
  onSwitchToPrint: () => void;
}

export const SupervisorReconciliationSection: React.FC<
  SupervisorReconciliationSectionProps
> = ({
  form,
  onUpdateForm,
  formatGhc,
  summary,
  supervisorName,
  stationName,
  stationCode,
  isAccountClosed,
  onReopenAccount,
  onRequestCloseAccount,
  onRequestDelete,
  onSwitchToPrint,
}) => {
  const handleToggleChecklist = (
    field: keyof NonNullable<SupervisorSalesAccountRecord['supervisorChecklist']>
  ) => {
    const curr = form.supervisorChecklist || {
      litresAndMetersVerified: false,
      evaluesConfirmed: false,
      cashDenominationsCounted: false,
      otherTransactionsAudited: false,
    };
    onUpdateForm({
      supervisorChecklist: {
        ...curr,
        [field]: !curr[field],
      },
    });
  };

  const isBalanced = Math.abs(summary.netVariance) <= 0.5;
  const isShortage = summary.netVariance < -0.5;
  const isExcess = summary.netVariance > 0.5;

  const resultStatus = isBalanced ? 'BALANCED' : isShortage ? 'SHORTAGE' : 'EXCESS';

  // Subtotals
  const totalApprovedCredit = (form.approvedCredit || []).reduce(
    (acc: number, c: any) => acc + (Number(c.amount) || 0),
    0
  );
  const totalEvalues = (form.evalues || []).reduce(
    (acc: number, e: any) => acc + (Number(e.amount) || 0),
    0
  );
  const totalCollections = (form.creditCollections || []).reduce(
    (acc: number, col: any) => acc + (Number(col.amount) || 0),
    0
  );
  const totalGenFuel = (form.deductions || [])
    .filter((d) => d.type === 'genset_expenses')
    .reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  const totalOtherExpenses = (form.deductions || [])
    .filter((d) => d.type !== 'genset_expenses')
    .reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

  return (
    <div className="space-y-6">
      {/* 11. RECONCILIATION SECTION */}
      <div className="bg-[#191c1f] rounded-2xl border border-[#333739] p-4 sm:p-5 space-y-4">
        {/* SECTION HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#333739] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-[#e8b93b]/15 text-[#e8b93b] flex items-center justify-center font-mono font-bold text-xs border border-[#e8b93b]/30">
              11
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-[#ece8e0] uppercase tracking-wide flex items-center gap-2 font-['Space_Grotesk']">
                  <ShieldCheck className="w-4 h-4 text-[#e8b93b]" />
                  11. Reconciliation & Final Sales Accountability
                </h3>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                    isBalanced
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : isShortage
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {resultStatus}
                </span>
              </div>
              <p className="text-xs text-[#8d9195]">
                Mathematical reconciliation of total expected sales, authorized deductions, and counted physical cash.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSwitchToPrint}
              className="py-1.5 px-3 rounded-xl border border-[#333739] bg-[#23262a] hover:bg-[#2e3237] text-xs font-bold text-[#ece8e0] cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Printer size={13} />
              <span>Print Official Slip</span>
            </button>
          </div>
        </div>

        {/* RECONCILIATION EQUATION BREAKDOWN */}
        <div className="bg-[#15171a] rounded-xl border border-[#333739] p-4 sm:p-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#8d9195] border-b border-[#333739] pb-2">
            Reconciliation Equation Breakdown
          </h4>

          <div className="divide-y divide-[#333739] text-xs">
            {/* Total Sales Amount Expected */}
            <div className="flex justify-between items-center py-2">
              <div>
                <span className="font-bold text-[#ece8e0] block">1. Total Sales Amount Expected</span>
                <span className="text-[10.5px] text-[#8d9195]">
                  Super (GH₵ {formatGhc(summary.fuelBreakdown?.superSales || 0)}) + Diesel (GH₵ {formatGhc(summary.fuelBreakdown?.dieselSales || 0)}) + RON 95 (GH₵ {formatGhc(summary.fuelBreakdown?.ron95Sales || 0)}) + Lubes (GH₵ {formatGhc(summary.totalLubeSales || 0)})
                </span>
              </div>
              <span className="font-mono font-bold text-[#ece8e0] text-sm">
                GH₵ {formatGhc(summary.grossSales)}
              </span>
            </div>

            {/* + Credit Sales Collection */}
            <div className="flex justify-between items-center py-2">
              <div>
                <span className="font-semibold text-emerald-400 block">+ Credit Sales Collection (Debtor Recovery)</span>
                <span className="text-[10.5px] text-[#8d9195]">
                  {(form.creditCollections || []).length} Recorded collections from credit clients
                </span>
              </div>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                + GH₵ {formatGhc(totalCollections)}
              </span>
            </div>

            {/* - Approved Credit Sales */}
            <div className="flex justify-between items-center py-2">
              <div>
                <span className="font-semibold text-rose-300 block">- Approved Credit Sales (LPO / Company Accounts)</span>
                <span className="text-[10.5px] text-[#8d9195]">
                  {(form.approvedCredit || []).length} Corporate fleet invoices
                </span>
              </div>
              <span className="font-mono font-bold text-rose-300 text-sm">
                - GH₵ {formatGhc(totalApprovedCredit)}
              </span>
            </div>

            {/* - E-Value / Drawings */}
            <div className="flex justify-between items-center py-2">
              <div>
                <span className="font-semibold text-rose-300 block">- E-Value / Drawings (MoMo & POS Payments)</span>
                <span className="text-[10.5px] text-[#8d9195]">
                  {(form.evalues || []).length} Digital settlements
                </span>
              </div>
              <span className="font-mono font-bold text-rose-300 text-sm">
                - GH₵ {formatGhc(totalEvalues)}
              </span>
            </div>

            {/* - Generator Fuel */}
            <div className="flex justify-between items-center py-2">
              <div>
                <span className="font-semibold text-rose-300 block">- Generator Fuel</span>
                <span className="text-[10.5px] text-[#8d9195]">
                  Station genset operational fuel usage
                </span>
              </div>
              <span className="font-mono font-bold text-rose-300 text-sm">
                - GH₵ {formatGhc(totalGenFuel)}
              </span>
            </div>

            {/* - Other Deductions / Expenses */}
            <div className="flex justify-between items-center py-2">
              <div>
                <span className="font-semibold text-rose-300 block">- Other Payments & Expenses (Vouchers, Utilities)</span>
                <span className="text-[10.5px] text-[#8d9195]">
                  {(form.deductions || []).filter((d) => d.type !== 'genset_expenses').length} Expense vouchers & operational items
                </span>
              </div>
              <span className="font-mono font-bold text-rose-300 text-sm">
                - GH₵ {formatGhc(totalOtherExpenses)}
              </span>
            </div>

            {/* = Expected Cash to Bank */}
            <div className="flex justify-between items-center py-3 bg-[#191c1f] px-3 rounded-xl border border-[#333739] my-1">
              <div>
                <span className="font-extrabold text-[#e8b93b] text-sm block">= Expected Cash to Bank</span>
                <span className="text-[10.5px] text-[#8d9195]">Net physical cash required for safe drop & banking</span>
              </div>
              <span className="font-mono font-black text-[#e8b93b] text-base">
                GH₵ {formatGhc(summary.expectedCashToBank)}
              </span>
            </div>

            {/* Physical Cash Counted */}
            <div className="flex justify-between items-center py-3 bg-[#191c1f] px-3 rounded-xl border border-emerald-900/50 my-1">
              <div>
                <span className="font-extrabold text-emerald-400 text-sm block">Physical Cash Counted</span>
                <span className="text-[10.5px] text-[#8d9195]">Total counted banknotes & coins from Section 10</span>
              </div>
              <span className="font-mono font-black text-emerald-400 text-base">
                GH₵ {formatGhc(summary.actualCashCounted)}
              </span>
            </div>
          </div>

          {/* RESULT STATUS BANNER */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 ${
              isBalanced
                ? 'bg-emerald-950/40 border-emerald-700'
                : isShortage
                ? 'bg-rose-950/40 border-rose-700'
                : 'bg-amber-950/40 border-amber-700'
            }`}
          >
            <div>
              <span className="text-xs text-[#8d9195] block">Account Reconciliation Result:</span>
              <span
                className={`text-lg font-black tracking-wide ${
                  isBalanced
                    ? 'text-emerald-400'
                    : isShortage
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {isBalanced ? '✓ BALANCED (No Variance)' : isShortage ? '⚠️ SHORTAGE DETECTED' : '📈 EXCESS DETECTED'}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs text-[#8d9195] block">Difference (Physical Cash - Expected Cash):</span>
              <span
                className={`text-xl font-black font-mono ${
                  isBalanced
                    ? 'text-emerald-400'
                    : isShortage
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {summary.netVariance >= 0 ? '+' : ''}GH₵ {formatGhc(summary.netVariance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 12. CLOSE SUPERVISOR ACCOUNT SECTION */}
      <div className="bg-[#191c1f] rounded-2xl border border-[#333739] p-4 sm:p-5 space-y-4">
        {/* SECTION HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#333739] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-lg bg-[#e8b93b]/15 text-[#e8b93b] flex items-center justify-center font-mono font-bold text-xs border border-[#e8b93b]/30">
              12
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#ece8e0] uppercase tracking-wide flex items-center gap-2 font-['Space_Grotesk']">
                <Lock className="w-4 h-4 text-[#e8b93b]" />
                12. Close Supervisor Sales Account
              </h3>
              <p className="text-xs text-[#8d9195]">
                Review the complete sales ledger and lock the account for shift closure.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAccountClosed ? (
              <span className="text-xs font-bold text-stone-400 bg-stone-800 px-3 py-1 rounded-lg border border-stone-700">
                🔒 Account Closed by {form.closedBySupervisor || supervisorName}
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950 px-3 py-1 rounded-lg border border-emerald-800">
                🟢 Ready to Close
              </span>
            )}
          </div>
        </div>

        {/* SUPERVISOR AUDIT CHECKLIST */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-[#ece8e0] uppercase tracking-wide flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-[#e8b93b]" />
            Supervisor Pre-Closure Verification Checklist
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#15171a] border border-[#333739] hover:border-[#4d5358] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={form.supervisorChecklist?.litresAndMetersVerified || false}
                onChange={() => handleToggleChecklist('litresAndMetersVerified')}
                className="rounded text-amber-500 w-4 h-4"
              />
              <span className="text-[#ece8e0] font-medium">
                1. All fuel meters (Super, Diesel, RON 95) & RTT litres verified
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#15171a] border border-[#333739] hover:border-[#4d5358] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={form.supervisorChecklist?.evaluesConfirmed || false}
                onChange={() => handleToggleChecklist('evaluesConfirmed')}
                className="rounded text-amber-500 w-4 h-4"
              />
              <span className="text-[#ece8e0] font-medium">
                2. MoMo, POS, and Approved Credit invoices confirmed with receipts
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#15171a] border border-[#333739] hover:border-[#4d5358] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={form.supervisorChecklist?.cashDenominationsCounted || false}
                onChange={() => handleToggleChecklist('cashDenominationsCounted')}
                className="rounded text-amber-500 w-4 h-4"
              />
              <span className="text-[#ece8e0] font-medium">
                3. Physical cash denominations counted and deposited into safe
              </span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-[#15171a] border border-[#333739] hover:border-[#4d5358] cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={form.supervisorChecklist?.otherTransactionsAudited || false}
                onChange={() => handleToggleChecklist('otherTransactionsAudited')}
                className="rounded text-amber-500 w-4 h-4"
              />
              <span className="text-[#ece8e0] font-medium">
                4. Tank dips, lubricant inventory & expense vouchers audited
              </span>
            </label>
          </div>

          <div className="pt-1">
            <label className="text-xs font-bold text-[#8d9195] block mb-1">
              Supervisor Handover Remarks & Shift Notes
            </label>
            <textarea
              rows={2}
              value={form.notes || ''}
              placeholder="Enter any shift handover remarks, dip anomalies, or manager notes..."
              onChange={(e) => onUpdateForm({ notes: e.target.value })}
              className="w-full bg-[#15171a] border border-[#333739] rounded-xl p-3 text-xs text-[#ece8e0] focus:border-[#e8b93b] outline-none"
            />
          </div>
        </div>

        {/* BOTTOM ACTION BUTTONS: REVIEW ACCOUNT & CLOSE ACCOUNT */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#333739]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onRequestDelete && (
              <button
                type="button"
                onClick={onRequestDelete}
                className="py-2.5 px-3 rounded-xl border border-rose-900/60 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center"
              >
                <Trash2 size={13} />
                <span>Delete Account</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* REVIEW ACCOUNT BUTTON */}
            <button
              type="button"
              onClick={onSwitchToPrint}
              className="py-2.5 px-5 rounded-xl border border-[#333739] bg-[#23262a] hover:bg-[#2d3136] text-[#ece8e0] font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-sm w-full sm:w-auto justify-center"
            >
              <Eye size={15} className="text-[#e8b93b]" />
              <span>REVIEW ACCOUNT</span>
            </button>

            {/* CLOSE ACCOUNT BUTTON */}
            {isAccountClosed ? (
              <button
                type="button"
                onClick={onReopenAccount}
                className="py-2.5 px-5 rounded-xl border border-amber-800 bg-amber-950/50 hover:bg-amber-900/50 text-amber-300 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-sm w-full sm:w-auto justify-center"
              >
                <Unlock size={15} />
                <span>RE-OPEN ACCOUNT</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onRequestCloseAccount}
                className="py-2.5 px-6 rounded-xl bg-[#e8b93b] hover:bg-[#d8a82b] text-stone-900 font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-colors shadow-md w-full sm:w-auto justify-center"
              >
                <Lock size={15} />
                <span>CLOSE ACCOUNT</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
