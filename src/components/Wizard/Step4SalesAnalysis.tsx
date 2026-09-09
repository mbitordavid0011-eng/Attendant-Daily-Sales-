import React from 'react';
import { TrendingUp, Coins, Fuel, CheckCircle2 } from 'lucide-react';
import { ShiftRecord, FUELS } from '../../types';
import { num, fmt, fmtPlain } from '../../utils/calculations';

interface Step4SalesAnalysisProps {
  record: ShiftRecord;
  onChange: (updated: ShiftRecord) => void;
}

export const Step4SalesAnalysis: React.FC<Step4SalesAnalysisProps> = ({
  record,
  onChange,
}) => {
  const handlePriceChange = (fuelId: string, price: number) => {
    const current = record.fuels[fuelId] || { price: 0, pumps: [] };
    onChange({
      ...record,
      fuels: {
        ...record.fuels,
        [fuelId]: {
          ...current,
          price: num(price),
        },
      },
    });
  };

  let grandTotalLitres = 0;
  let grandTotalSales = 0;

  const fuelSummaries = FUELS.map((f) => {
    const data = record.fuels[f.id] || { price: f.defaultPrice, pumps: [] };
    let meterLitres = 0;
    let rttLitres = 0;
    let netLitres = 0;

    data.pumps.forEach((p) => {
      const m = Math.max(0, num(p.closing) - num(p.opening));
      const r = Math.max(0, num(p.rtt));
      meterLitres += m;
      rttLitres += r;
      netLitres += Math.max(0, m - r);
    });

    const price = num(data.price || f.defaultPrice);
    const totalAmount = netLitres * price;

    grandTotalLitres += netLitres;
    grandTotalSales += totalAmount;

    return {
      definition: f,
      meterLitres,
      rttLitres,
      netLitres,
      price,
      totalAmount,
      pumpsCount: data.pumps.length,
    };
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          Sales Analysis
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Verify price per litre and computed expected revenue for each fuel type.
        </p>
      </div>

      {/* Fuel Product Cards */}
      <div className="space-y-3">
        {fuelSummaries.map((summary) => {
          const f = summary.definition;
          const isCarried = summary.pumpsCount > 0 || summary.netLitres > 0;

          if (!isCarried) {
            return (
              <div
                key={f.id}
                className="bg-stone-50/70 rounded-2xl p-3.5 border border-dashed border-stone-200 flex items-center justify-between opacity-75"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-stone-300" />
                  <div>
                    <h3 className="font-bold text-xs text-stone-600">{f.label}</h3>
                    <p className="text-[10px] text-stone-400">Not carried / 0 active dispensers</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-stone-400">0.00 L · GH₵0.00</span>
              </div>
            );
          }

          return (
            <div
              key={f.id}
              className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${f.id === 'pms' ? 'bg-emerald-500' : f.id === 'ago' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                  <div>
                    <h3 className="font-bold text-sm text-stone-900">{f.label}</h3>
                    <p className="text-[11px] text-stone-500">
                      {summary.pumpsCount} active {summary.pumpsCount === 1 ? 'dispenser' : 'dispensers'}
                    </p>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-sm text-emerald-800">
                  {fmt(summary.totalAmount)}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-stone-50 rounded-xl p-3">
                <div>
                  <span className="text-[11px] text-stone-600 block">Meter Dispensed</span>
                  <span className="font-mono font-semibold text-stone-800">{fmtPlain(summary.meterLitres)} L</span>
                </div>
                <div>
                  <span className="text-[11px] text-stone-600 block">R.T.T (Deduction)</span>
                  <span className="font-mono font-semibold text-amber-700">-{fmtPlain(summary.rttLitres)} L</span>
                </div>
                <div>
                  <span className="text-[11px] text-stone-600 block">Net Litres Sold</span>
                  <span className="font-mono font-bold text-emerald-800">{fmtPlain(summary.netLitres)} L</span>
                </div>
                <div>
                  <label className="text-[11px] text-stone-600 block font-medium">Price / Litre (GHS)</label>
                  <div className="relative mt-0.5">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={summary.price}
                      onChange={(e) => handlePriceChange(f.id, parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expected Revenue Callout */}
      <div className="bg-gradient-to-br from-emerald-800 to-stone-900 rounded-2xl p-4.5 text-white shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-emerald-200 uppercase tracking-wider">
            Total Fuel Volume Sold
          </span>
          <span className="font-mono text-sm font-bold text-emerald-100">
            {fmtPlain(grandTotalLitres)} Litres
          </span>
        </div>
        <div className="border-t border-white/10 pt-2 flex items-center justify-between">
          <div>
            <span className="text-xs text-stone-300 block">Total Expected Sales Revenue</span>
            <span className="text-2xl font-bold font-mono tracking-tight text-white">
              {fmt(grandTotalSales)}
            </span>
          </div>
          <Coins className="w-8 h-8 text-emerald-400 opacity-80" />
        </div>
      </div>
    </div>
  );
};
