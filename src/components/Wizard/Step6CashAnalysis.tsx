import React from 'react';
import { Banknote, Coins, Calculator, RotateCcw } from 'lucide-react';
import { ShiftRecord, DENOMINATIONS, COIN_DENOMINATIONS } from '../../types';
import { num, fmt, fmtPlain, calculatePhysicalCash } from '../../utils/calculations';

interface Step6CashAnalysisProps {
  record: ShiftRecord;
  onChange: (updated: ShiftRecord) => void;
}

export const Step6CashAnalysis: React.FC<Step6CashAnalysisProps> = ({
  record,
  onChange,
}) => {
  const handleDenomChange = (denom: number, pieces: number) => {
    const safePieces = Math.max(0, pieces);
    onChange({
      ...record,
      cash: {
        ...record.cash,
        denoms: {
          ...record.cash.denoms,
          [denom]: safePieces,
        },
      },
    });
  };

  const handleCoinChange = (coin: number, pieces: number) => {
    const safePieces = Math.max(0, pieces);
    onChange({
      ...record,
      cash: {
        ...record.cash,
        coins: {
          ...record.cash.coins,
          [coin]: safePieces,
        },
      },
    });
  };

  const handleClearCash = () => {
    if (!window.confirm('Reset all physical cash counts to zero?')) return;
    const cleanDenoms: Record<number, number> = {};
    DENOMINATIONS.forEach((d) => (cleanDenoms[d] = 0));
    const cleanCoins: Record<number, number> = {};
    COIN_DENOMINATIONS.forEach((c) => (cleanCoins[c] = 0));

    onChange({
      ...record,
      cash: {
        denoms: cleanDenoms,
        coins: cleanCoins,
      },
    });
  };

  const totalPhysicalCash = calculatePhysicalCash(record.cash);

  let totalNotesCash = 0;
  DENOMINATIONS.forEach((d) => {
    totalNotesCash += d * num(record.cash?.denoms?.[d]);
  });

  let totalCoinsCash = 0;
  COIN_DENOMINATIONS.forEach((c) => {
    totalCoinsCash += c * num(record.cash?.coins?.[c]);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Banknote className="w-5 h-5 text-emerald-600" />
            Physical Cash Count
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Count Ghana Cedi banknotes and coins in the cash drawer.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClearCash}
          className="text-xs text-stone-500 hover:text-rose-600 flex items-center gap-1 font-semibold transition-colors px-2 py-1 rounded-lg hover:bg-rose-50"
          title="Reset denominations"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* Banknotes Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Banknote className="w-4 h-4 text-emerald-600" /> Banknotes (Ghana Cedis)
          </span>
          <span className="text-xs font-mono font-bold text-stone-700">
            Notes: {fmt(totalNotesCash)}
          </span>
        </div>

        <div className="divide-y divide-stone-100">
          {DENOMINATIONS.map((d) => {
            const count = record.cash?.denoms?.[d] || 0;
            const subtotal = d * count;

            return (
              <div
                key={d}
                className="p-3 flex items-center justify-between gap-3 hover:bg-stone-50/70 transition-colors"
              >
                <div className="w-24 sm:w-28 flex items-center gap-2">
                  <span className="inline-block px-2 py-1 rounded bg-stone-100 text-stone-800 font-mono font-bold text-xs border border-stone-200">
                    GH₵{d}
                  </span>
                </div>

                {/* Steppers & Input */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={count === 0 ? '' : count}
                    onChange={(e) => handleDenomChange(d, parseInt(e.target.value) || 0)}
                    className="w-20 sm:w-24 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-right font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-stone-400 font-medium">pcs</span>
                </div>

                {/* Subtotal */}
                <div className="w-24 sm:w-28 text-right font-mono font-bold text-xs text-stone-800">
                  {fmtPlain(subtotal)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coins Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-amber-600" /> Pesewas &amp; Coins
          </span>
          <span className="text-xs font-mono font-bold text-stone-700">
            Coins: {fmt(totalCoinsCash)}
          </span>
        </div>

        <div className="divide-y divide-stone-100">
          {COIN_DENOMINATIONS.map((c) => {
            const count = record.cash?.coins?.[c] || 0;
            const subtotal = c * count;

            return (
              <div
                key={c}
                className="p-3 flex items-center justify-between gap-3 hover:bg-stone-50/70 transition-colors"
              >
                <div className="w-24 sm:w-28 flex items-center gap-2">
                  <span className="inline-block px-2 py-1 rounded bg-amber-50 text-amber-900 font-mono font-bold text-xs border border-amber-200">
                    {c >= 1 ? `GH₵${c.toFixed(2)}` : `${Math.round(c * 100)}p`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={count === 0 ? '' : count}
                    onChange={(e) => handleCoinChange(c, parseInt(e.target.value) || 0)}
                    className="w-20 sm:w-24 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-right font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-stone-400 font-medium">pcs</span>
                </div>

                <div className="w-24 sm:w-28 text-right font-mono font-bold text-xs text-stone-800">
                  {fmtPlain(subtotal)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total Physical Cash Callout */}
      <div className="bg-emerald-900 text-white rounded-2xl p-4.5 shadow-md flex items-center justify-between">
        <div>
          <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wider block">
            Total Physical Cash Counted
          </span>
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {fmt(totalPhysicalCash)}
          </span>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-white">
          <Calculator className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
