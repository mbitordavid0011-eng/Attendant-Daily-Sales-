import React, { useState } from 'react';
import { CheckCircle2, Printer, Eye, Plus, ArrowRight, ShieldCheck, Sparkles, Banknote, ChevronDown, ChevronUp } from 'lucide-react';
import { ShiftRecord, DENOMINATIONS, COIN_DENOMINATIONS } from '../types';
import { calculateReconciliation, fmt, fmtPlain, num } from '../utils/calculations';
import { PrintSlipModal } from './PrintSlipModal';

interface SuccessViewProps {
  record: ShiftRecord;
  onViewRecord: () => void;
  onNewRecord: () => void;
}

export const SuccessView: React.FC<SuccessViewProps> = ({
  record,
  onViewRecord,
  onNewRecord,
}) => {
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showDenoms, setShowDenoms] = useState(false);
  const recon = calculateReconciliation(record);

  let totalNotesPieces = 0;
  let totalNotesCash = 0;
  DENOMINATIONS.forEach((d) => {
    const count = num(record.cash?.denoms?.[d]);
    totalNotesPieces += count;
    totalNotesCash += d * count;
  });

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-stone-200 shadow-xl text-center space-y-6">
        {/* Animated Badge */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
            Record Saved Successfully!
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Shift account for {record.date} (Group {record.shiftGroup} · {record.shiftPeriod}) has been saved and reconciled.
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-left space-y-3 text-xs">
          <div className="flex justify-between items-center text-stone-600">
            <span>Station Branch:</span>
            <span className="font-semibold text-stone-900">{record.station || 'Station'}</span>
          </div>
          <div className="flex justify-between items-center text-stone-600">
            <span>Total Fuel Volume:</span>
            <span className="font-mono font-bold text-stone-900">{fmtPlain(recon.totalLitres)} L</span>
          </div>
          <div className="flex justify-between items-center text-stone-600">
            <span>Total Expected Sales:</span>
            <span className="font-mono font-bold text-stone-900">{fmt(recon.totalSales)}</span>
          </div>
          <div className="flex justify-between items-center text-stone-600">
            <span>Expected Cash to Bank:</span>
            <span className="font-mono font-bold text-emerald-800">{fmt(recon.totalCashToBank)}</span>
          </div>
          <div className="flex justify-between items-center text-stone-600">
            <span>Physical Cash Counted:</span>
            <span className="font-mono font-bold text-stone-900">{fmt(recon.physicalCash)}</span>
          </div>

          {/* Denominations Toggle */}
          <div className="border-t border-stone-200/80 pt-2">
            <button
              type="button"
              onClick={() => setShowDenoms(!showDenoms)}
              className="w-full flex items-center justify-between text-[11px] font-semibold text-emerald-800 hover:text-emerald-900 py-1 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                Counted Notes ({totalNotesPieces} notes · {fmt(totalNotesCash)})
              </span>
              {showDenoms ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showDenoms && (
              <div className="mt-2 pt-2 border-t border-stone-200 grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                {DENOMINATIONS.map((d) => {
                  const count = num(record.cash?.denoms?.[d]);
                  const subtotal = d * count;
                  if (count === 0) return null;
                  return (
                    <div key={d} className="flex justify-between bg-white px-2 py-1 rounded border border-stone-200">
                      <span className="text-stone-700 font-bold">GH₵{d} × {count}</span>
                      <span className="text-emerald-900 font-bold">{fmtPlain(subtotal)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-stone-200 pt-2.5 flex justify-between items-center">
            <div>
              <span className="font-bold text-stone-800 block">Variance Status:</span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-0.5 ${
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
            <span
              className={`text-base font-mono font-extrabold ${
                recon.status === 'shortage'
                  ? 'text-rose-600'
                  : recon.status === 'excess'
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              {recon.diff > 0 ? `+${fmt(recon.diff)}` : fmt(recon.diff)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={() => setShowPrintModal(true)}
            className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Print Reconciliation Slip</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onViewRecord}
              className="py-2.5 px-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Record</span>
            </button>

            <button
              onClick={onNewRecord}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Next Shift</span>
            </button>
          </div>
        </div>
      </div>

      {showPrintModal && (
        <PrintSlipModal record={record} onClose={() => setShowPrintModal(false)} />
      )}
    </div>
  );
};
