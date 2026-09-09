import React from 'react';
import {
  Banknote,
  Coins,
  Shield,
  CreditCard,
  Building,
} from 'lucide-react';
import {
  SupervisorSalesAccountRecord,
  DENOMINATIONS,
  COIN_DENOMINATIONS,
} from '../../types';

interface SupervisorCashSectionProps {
  form: SupervisorSalesAccountRecord;
  onUpdateForm: (updated: Partial<SupervisorSalesAccountRecord>) => void;
  formatGhc: (val: number) => string;
}

export const SupervisorCashSection: React.FC<SupervisorCashSectionProps> = ({
  form,
  onUpdateForm,
  formatGhc,
}) => {
  const handleNoteCountChange = (denom: number, count: number) => {
    const currentNotes = form.cashDenominations?.notes || {
      200: 0,
      100: 0,
      50: 0,
      20: 0,
      10: 0,
      5: 0,
      2: 0,
      1: 0,
    };
    const updatedNotes = {
      ...currentNotes,
      [denom]: Math.max(0, count || 0),
    };
    const currentCoins = form.cashDenominations?.coins || {
      2.0: 0,
      1.0: 0,
      0.5: 0,
      0.2: 0,
      0.1: 0,
    };

    let total = 0;
    Object.entries(updatedNotes).forEach(([d, c]) => {
      total += Number(d) * (Number(c) || 0);
    });
    Object.entries(currentCoins).forEach(([d, c]) => {
      total += Number(d) * (Number(c) || 0);
    });

    onUpdateForm({
      cashDenominations: {
        notes: updatedNotes,
        coins: currentCoins,
        totalCash: total,
      },
      actualCashCounted: total,
    });
  };

  const handleCoinCountChange = (denom: number, count: number) => {
    const currentNotes = form.cashDenominations?.notes || {
      200: 0,
      100: 0,
      50: 0,
      20: 0,
      10: 0,
      5: 0,
      2: 0,
      1: 0,
    };
    const currentCoins = form.cashDenominations?.coins || {
      2.0: 0,
      1.0: 0,
      0.5: 0,
      0.2: 0,
      0.1: 0,
    };
    const updatedCoins = {
      ...currentCoins,
      [denom]: Math.max(0, count || 0),
    };

    let total = 0;
    Object.entries(currentNotes).forEach(([d, c]) => {
      total += Number(d) * (Number(c) || 0);
    });
    Object.entries(updatedCoins).forEach(([d, c]) => {
      total += Number(d) * (Number(c) || 0);
    });

    onUpdateForm({
      cashDenominations: {
        notes: currentNotes,
        coins: updatedCoins,
        totalCash: total,
      },
      actualCashCounted: total,
    });
  };

  // Subtotals
  const totalNotesValue = DENOMINATIONS.reduce((acc, denom) => {
    const count =
      form.cashDenominations?.notes?.[
        denom as keyof typeof form.cashDenominations.notes
      ] || 0;
    return acc + denom * count;
  }, 0);

  const totalCoinsValue = COIN_DENOMINATIONS.reduce((acc, denom) => {
    const count =
      form.cashDenominations?.coins?.[
        denom as keyof typeof form.cashDenominations.coins
      ] || 0;
    return acc + denom * count;
  }, 0);

  const grandCashCounted = totalNotesValue + totalCoinsValue;

  return (
    <div className="bg-[#191c1f] rounded-2xl border border-[#333739] p-4 sm:p-5 space-y-4">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#333739] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-[#e8b93b]/15 text-[#e8b93b] flex items-center justify-center font-mono font-bold text-xs border border-[#e8b93b]/30">
            10
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-[#ece8e0] uppercase tracking-wide flex items-center gap-2 font-['Space_Grotesk']">
                <Banknote className="w-4 h-4 text-emerald-400" />
                10. Cash Analysis & Physical Safe Count
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                Notes & Coins Count
              </span>
            </div>
            <p className="text-xs text-[#8d9195]">
              The supervisor must enter the physical cash counted in notes and coins to verify total cash on hand.
            </p>
          </div>
        </div>

        <div className="p-2 px-3.5 rounded-xl bg-[#15171a] border border-emerald-500/30 flex items-center gap-3">
          <span className="text-xs text-[#8d9195]">Total Physical Cash:</span>
          <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
            GH₵ {formatGhc(grandCashCounted)}
          </span>
        </div>
      </div>

      {/* SUMMARY BANNER */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-[#1d2023] border border-[#333739]">
          <span className="text-[10.5px] text-[#8d9195] uppercase font-bold block">
            Banknotes Subtotal
          </span>
          <span className="text-base font-extrabold text-emerald-400 font-mono">
            GH₵ {formatGhc(totalNotesValue)}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#1d2023] border border-[#333739]">
          <span className="text-[10.5px] text-[#8d9195] uppercase font-bold block">
            Coins Subtotal
          </span>
          <span className="text-base font-extrabold text-amber-400 font-mono">
            GH₵ {formatGhc(totalCoinsValue)}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#1d2023] border border-[#333739] col-span-2 sm:col-span-1">
          <span className="text-[10.5px] text-[#8d9195] uppercase font-bold block">
            Total Physical Cash
          </span>
          <span className="text-base font-extrabold text-emerald-300 font-mono">
            GH₵ {formatGhc(grandCashCounted)}
          </span>
        </div>
      </div>

      {/* BANKNOTES GRID */}
      <div className="space-y-3 p-4 sm:p-5 rounded-2xl border border-[#333739] bg-[#191c1f]">
        <div className="flex items-center justify-between border-b border-[#333739] pb-2.5">
          <h4 className="text-xs font-bold text-[#ece8e0] uppercase tracking-wider flex items-center gap-2">
            <Banknote className="w-4 h-4 text-emerald-400" /> Bank of Ghana Notes (GH₵)
          </h4>
          <span className="text-xs font-mono font-bold text-emerald-400">
            GH₵ {formatGhc(totalNotesValue)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {DENOMINATIONS.map((denom) => {
            const count =
              form.cashDenominations?.notes?.[
                denom as keyof typeof form.cashDenominations.notes
              ] || 0;
            const subtotal = denom * count;

            return (
              <div
                key={denom}
                className="p-3.5 rounded-xl border border-[#333739] bg-[#15171a] flex flex-col justify-between space-y-2.5 hover:border-[#4d5358] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#ece8e0] font-mono">
                    GH₵ {denom} Note
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">
                    GH₵ {formatGhc(subtotal)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleNoteCountChange(denom, Math.max(0, count - 1))}
                    className="w-8 h-8 rounded-lg bg-[#23262a] hover:bg-[#2d3136] text-[#8d9195] hover:text-[#ece8e0] font-bold text-sm flex items-center justify-center cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={count || ''}
                    placeholder="0 pcs"
                    onChange={(e) =>
                      handleNoteCountChange(denom, parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-center font-mono font-bold text-[#ece8e0]"
                  />
                  <button
                    type="button"
                    onClick={() => handleNoteCountChange(denom, count + 1)}
                    className="w-8 h-8 rounded-lg bg-[#23262a] hover:bg-[#2d3136] text-[#8d9195] hover:text-[#ece8e0] font-bold text-sm flex items-center justify-center cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COINS GRID */}
      <div className="space-y-3 p-4 sm:p-5 rounded-2xl border border-[#333739] bg-[#191c1f]">
        <div className="flex items-center justify-between border-b border-[#333739] pb-2.5">
          <h4 className="text-xs font-bold text-[#ece8e0] uppercase tracking-wider flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" /> Ghana Pesewas & Coins (GH₵)
          </h4>
          <span className="text-xs font-mono font-bold text-amber-400">
            GH₵ {formatGhc(totalCoinsValue)}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {COIN_DENOMINATIONS.map((denom) => {
            const count =
              form.cashDenominations?.coins?.[
                denom as keyof typeof form.cashDenominations.coins
              ] || 0;
            const subtotal = denom * count;

            return (
              <div
                key={denom}
                className="p-3.5 rounded-xl border border-[#333739] bg-[#15171a] flex flex-col justify-between space-y-2.5 hover:border-[#4d5358] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#ece8e0] font-mono">
                    GH₵ {denom.toFixed(2)}
                  </span>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    GH₵ {formatGhc(subtotal)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCoinCountChange(denom, Math.max(0, count - 1))}
                    className="w-8 h-8 rounded-lg bg-[#23262a] hover:bg-[#2d3136] text-[#8d9195] hover:text-[#ece8e0] font-bold text-sm flex items-center justify-center cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={count || ''}
                    placeholder="0 pcs"
                    onChange={(e) =>
                      handleCoinCountChange(denom, parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-center font-mono font-bold text-[#ece8e0]"
                  />
                  <button
                    type="button"
                    onClick={() => handleCoinCountChange(denom, count + 1)}
                    className="w-8 h-8 rounded-lg bg-[#23262a] hover:bg-[#2d3136] text-[#8d9195] hover:text-[#ece8e0] font-bold text-sm flex items-center justify-center cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SAFE DROP & BANK DEPOSIT SLIP REFERENCE */}
      <div className="p-4 sm:p-5 rounded-2xl border border-[#333739] bg-[#191c1f] grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-bold text-[#ece8e0] block mb-1">
            Safe Deposit / Safe Drop Amount (GH₵)
          </label>
          <input
            type="number"
            step="0.01"
            value={form.safeDropAmount || ''}
            placeholder="e.g. 30000.00"
            onChange={(e) =>
              onUpdateForm({ safeDropAmount: parseFloat(e.target.value) || 0 })
            }
            className="w-full bg-[#15171a] border border-[#333739] rounded-xl px-3.5 py-2.5 text-xs text-[#ece8e0] font-mono font-bold"
          />
          <span className="text-[10.5px] text-[#8d9195] block mt-1">
            Amount dropped into StarOil station secure safe vault before end of shift.
          </span>
        </div>

        <div>
          <label className="text-xs font-bold text-[#ece8e0] block mb-1">
            Bank Deposit Slip / Direct Transfer Reference
          </label>
          <input
            type="text"
            value={form.bankDepositSlip || ''}
            placeholder="e.g. GCB-DEP-20260825-991"
            onChange={(e) => onUpdateForm({ bankDepositSlip: e.target.value })}
            className="w-full bg-[#15171a] border border-[#333739] rounded-xl px-3.5 py-2.5 text-xs text-[#ece8e0] font-mono"
          />
          <span className="text-[10.5px] text-[#8d9195] block mt-1">
            Commercial bank deposit voucher or bullion cash pickup reference code.
          </span>
        </div>
      </div>
    </div>
  );
};
