import React, { useState } from 'react';
import { Scale, CheckCircle, AlertTriangle, ArrowUpRight, ArrowDownRight, FileText, Check, Fuel, Droplet, PenLine, ShieldCheck, Banknote, Coins, Layers } from 'lucide-react';
import { ShiftRecord, FUELS, DENOMINATIONS, COIN_DENOMINATIONS } from '../../types';
import { calculateReconciliation, fmt, fmtPlain, num } from '../../utils/calculations';
import { SignaturePadModal } from '../SignaturePadModal';

interface Step7ReconciliationProps {
  record: ShiftRecord;
  onChange: (updated: ShiftRecord) => void;
}

export const Step7Reconciliation: React.FC<Step7ReconciliationProps> = ({
  record,
  onChange,
}) => {
  const recon = calculateReconciliation(record);
  const [activeSigner, setActiveSigner] = useState<'attendant' | 'supervisor' | null>(null);

  // Aggregate denominations totals
  let totalNotesPieces = 0;
  let totalNotesCash = 0;
  const countedNotesList: { denom: number; count: number; subtotal: number }[] = [];
  DENOMINATIONS.forEach((d) => {
    const count = num(record.cash?.denoms?.[d]);
    const subtotal = d * count;
    if (count > 0) {
      countedNotesList.push({ denom: d, count, subtotal });
    }
    totalNotesPieces += count;
    totalNotesCash += subtotal;
  });

  let totalCoinsPieces = 0;
  let totalCoinsCash = 0;
  const countedCoinsList: { coin: number; count: number; subtotal: number }[] = [];
  COIN_DENOMINATIONS.forEach((c) => {
    const count = num(record.cash?.coins?.[c]);
    const subtotal = c * count;
    if (count > 0) {
      countedCoinsList.push({ coin: c, count, subtotal });
    }
    totalCoinsPieces += count;
    totalCoinsCash += subtotal;
  });

  // Aggregate totals across all fuels
  const totalMeterLitres = Object.values(recon.fuelBreakdown).reduce(
    (sum, item) => sum + (item?.meterLitres || 0),
    0
  );
  const totalRttLitres = Object.values(recon.fuelBreakdown).reduce(
    (sum, item) => sum + (item?.rttLitres || 0),
    0
  );

  const statusConfig = {
    balanced: {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      title: 'Shift Account Balanced',
      icon: CheckCircle,
      textColor: 'text-emerald-700',
      description: 'Physical cash matches expected cash to bank within tolerance.',
    },
    shortage: {
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      title: 'Cash Shortage Detected',
      icon: AlertTriangle,
      textColor: 'text-rose-700',
      description: 'Physical cash is lower than expected cash to bank.',
    },
    excess: {
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      title: 'Cash Excess / Overage',
      icon: ArrowUpRight,
      textColor: 'text-amber-700',
      description: 'Physical cash is higher than expected cash to bank.',
    },
  }[recon.status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <Scale className="w-5 h-5 text-emerald-600" />
          Shift Reconciliation Statement
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Review total litres dispensed, sales analysis, drawings, and cash reconciliation.
        </p>
      </div>

      {/* Fuel Litres Volume Summary Card */}
      <div className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Fuel className="w-4 h-4 text-emerald-600" /> Fuel Volume &amp; Litres Summary
          </span>
          <span className="text-xs font-bold font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            Total: {fmtPlain(recon.totalLitres)} Litres
          </span>
        </div>

        {/* Litres Hero Banner & Per-Fuel Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {FUELS.map((f) => {
            const item = recon.fuelBreakdown[f.id];
            const netL = item ? item.netLitres : 0;
            const salesGHS = item ? item.salesAmount : 0;

            return (
              <div
                key={f.id}
                className="bg-stone-50 rounded-xl p-3 border border-stone-200 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-stone-800 uppercase">
                    {f.shortName}
                  </span>
                  <span className="text-[10px] font-mono text-stone-500">
                    GH₵{fmtPlain(item?.price ?? f.defaultPrice)}/L
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-base font-extrabold font-mono text-stone-900">
                    {fmtPlain(netL)}{' '}
                    <span className="text-xs font-normal text-stone-500">L</span>
                  </div>
                  <div className="text-xs font-mono font-semibold text-emerald-800">
                    {fmt(salesGHS)}
                  </div>
                </div>
                {item && item.rttLitres > 0 && (
                  <div className="text-[10px] text-amber-700 font-medium">
                    (Includes -{fmtPlain(item.rttLitres)} L R.T.T.)
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detailed Litres Table Breakdown */}
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-100/75 text-[10px] text-stone-600 font-bold uppercase tracking-wider border-b border-stone-200">
                <th className="py-2 px-3">Fuel Product</th>
                <th className="text-right py-2 px-3">Price / L</th>
                <th className="text-right py-2 px-3">Meter Dispensed</th>
                <th className="text-right py-2 px-3 text-amber-700">R.T.T. (L)</th>
                <th className="text-right py-2 px-3 font-bold text-emerald-900">Net Litres (L)</th>
                <th className="text-right py-2 px-3 font-bold text-stone-900">Sales Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-mono text-xs">
              {FUELS.map((f) => {
                const item = recon.fuelBreakdown[f.id];
                if (!item) return null;

                return (
                  <tr key={f.id} className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-3 font-sans font-semibold text-stone-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {f.label}
                    </td>
                    <td className="text-right py-2.5 px-3 text-stone-600">
                      GH₵{fmtPlain(item.price)}
                    </td>
                    <td className="text-right py-2.5 px-3 text-stone-600">
                      {fmtPlain(item.meterLitres)} L
                    </td>
                    <td className="text-right py-2.5 px-3 text-amber-700">
                      {item.rttLitres > 0 ? `-${fmtPlain(item.rttLitres)} L` : '0.00 L'}
                    </td>
                    <td className="text-right py-2.5 px-3 font-bold text-emerald-800">
                      {fmtPlain(item.netLitres)} L
                    </td>
                    <td className="text-right py-2.5 px-3 font-bold text-stone-900">
                      {fmt(item.salesAmount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-stone-100/90 border-t-2 border-stone-300 font-bold text-stone-900 text-xs font-mono">
                <td className="py-2.5 px-3 font-sans uppercase">TOTAL LITRES</td>
                <td className="text-right py-2.5 px-3 text-stone-400">—</td>
                <td className="text-right py-2.5 px-3">{fmtPlain(totalMeterLitres)} L</td>
                <td className="text-right py-2.5 px-3 text-amber-700">
                  {totalRttLitres > 0 ? `-${fmtPlain(totalRttLitres)} L` : '0.00 L'}
                </td>
                <td className="text-right py-2.5 px-3 font-extrabold text-emerald-900 bg-emerald-100/60">
                  {fmtPlain(recon.totalLitres)} L
                </td>
                <td className="text-right py-2.5 px-3 font-extrabold text-stone-900 bg-stone-200/50">
                  {fmt(recon.totalSales)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-3">
          {FUELS.map((f) => {
            const item = recon.fuelBreakdown[f.id];
            if (!item) return null;

            return (
              <div key={f.id} className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm text-stone-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {f.label}
                  </div>
                  <span className="text-xs font-mono font-bold text-stone-700">
                    GH₵{fmtPlain(item.price)}/L
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-sans block">Meter Dispensed</span>
                    <span className="text-stone-700">{fmtPlain(item.meterLitres)} L</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-sans block">R.T.T.</span>
                    <span className="text-amber-700">{item.rttLitres > 0 ? `-${fmtPlain(item.rttLitres)} L` : '0.00 L'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-sans block">Net Litres</span>
                    <span className="font-bold text-emerald-800">{fmtPlain(item.netLitres)} L</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-sans block">Sales Value</span>
                    <span className="font-bold text-stone-900">{fmt(item.salesAmount)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Mobile Total Card */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase text-emerald-900">Total Net Litres</span>
              <span className="font-mono font-black text-sm text-emerald-900">{fmtPlain(recon.totalLitres)} L</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-emerald-200">
              <span className="font-bold uppercase text-stone-800">Total Sales Value</span>
              <span className="font-mono font-black text-sm text-stone-900">{fmt(recon.totalSales)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tank Stock & Dipping Reconciliation Card */}
      <div className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-emerald-600" /> Tank Stock &amp; Dipping Reconciliation
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono border ${
              recon.totalStockVariation < -0.5
                ? 'bg-rose-100 text-rose-800 border-rose-300'
                : recon.totalStockVariation > 0.5
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
            }`}
          >
            Net Variation: {recon.totalStockVariation > 0 ? `+${fmtPlain(recon.totalStockVariation)} L` : `${fmtPlain(recon.totalStockVariation)} L`}
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto rounded-xl border border-stone-200">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-100/75 text-[10px] text-stone-600 font-bold uppercase tracking-wider border-b border-stone-200">
                <th className="py-2 px-3">Fuel Tank</th>
                <th className="text-right py-2 px-3">Opening Dip</th>
                <th className="text-right py-2 px-3 text-blue-700">Received (BRV)</th>
                <th className="text-right py-2 px-3">Available</th>
                <th className="text-right py-2 px-3">Sales (Meters)</th>
                <th className="text-right py-2 px-3 font-semibold text-emerald-900">Book Closing</th>
                <th className="text-right py-2 px-3 font-bold text-stone-900">Physical Dip</th>
                <th className="text-right py-2 px-3 font-bold">Variation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-mono text-xs">
              {FUELS.map((f) => {
                const s = recon.stockBreakdown[f.id];
                if (!s) return null;
                const isLoss = s.variation < -0.5;
                const isGain = s.variation > 0.5;

                return (
                  <tr key={f.id} className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-3 font-sans font-semibold text-stone-800">
                      {f.label}
                    </td>
                    <td className="text-right py-2.5 px-3 text-stone-600">
                      {fmtPlain(s.openingStock)} L
                    </td>
                    <td className="text-right py-2.5 px-3 text-blue-700 font-semibold">
                      {s.stockReceived > 0 ? `+${fmtPlain(s.stockReceived)} L` : '0.00 L'}
                    </td>
                    <td className="text-right py-2.5 px-3 text-stone-700">
                      {fmtPlain(s.totalAvailable)} L
                    </td>
                    <td className="text-right py-2.5 px-3 text-stone-700">
                      -{fmtPlain(s.salesLitres)} L
                    </td>
                    <td className="text-right py-2.5 px-3 font-semibold text-emerald-800 bg-emerald-50/30">
                      {fmtPlain(s.bookClosing)} L
                    </td>
                    <td className="text-right py-2.5 px-3 font-bold text-stone-900">
                      {fmtPlain(s.physicalClosing)} L
                    </td>
                    <td
                      className={`text-right py-2.5 px-3 font-bold ${
                        isLoss
                          ? 'text-rose-700 bg-rose-50/50'
                          : isGain
                          ? 'text-amber-700 bg-amber-50/50'
                          : 'text-emerald-700 bg-emerald-50/30'
                      }`}
                    >
                      {s.variation > 0 ? `+${fmtPlain(s.variation)} L` : `${fmtPlain(s.variation)} L`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-stone-100/90 border-t-2 border-stone-300 font-bold text-stone-900 text-xs font-mono">
                <td className="py-2.5 px-3 font-sans uppercase">TOTALS</td>
                <td className="text-right py-2.5 px-3">{fmtPlain(recon.totalOpeningStock)} L</td>
                <td className="text-right py-2.5 px-3 text-blue-700">+{fmtPlain(recon.totalStockReceived)} L</td>
                <td className="text-right py-2.5 px-3">{fmtPlain(recon.totalOpeningStock + recon.totalStockReceived)} L</td>
                <td className="text-right py-2.5 px-3">-{fmtPlain(recon.totalLitres)} L</td>
                <td className="text-right py-2.5 px-3 text-emerald-900 bg-emerald-100/40">{fmtPlain(recon.totalBookClosing)} L</td>
                <td className="text-right py-2.5 px-3 bg-stone-200/40">{fmtPlain(recon.totalPhysicalClosing)} L</td>
                <td
                  className={`text-right py-2.5 px-3 font-extrabold ${
                    recon.totalStockVariation < -0.5
                      ? 'text-rose-700 bg-rose-100/60'
                      : recon.totalStockVariation > 0.5
                      ? 'text-amber-700 bg-amber-100/60'
                      : 'text-emerald-800 bg-emerald-100/60'
                  }`}
                >
                  {recon.totalStockVariation > 0 ? `+${fmtPlain(recon.totalStockVariation)} L` : `${fmtPlain(recon.totalStockVariation)} L`}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="lg:hidden space-y-3">
          {FUELS.map((f) => {
            const s = recon.stockBreakdown[f.id];
            if (!s) return null;
            const isLoss = s.variation < -0.5;
            const isGain = s.variation > 0.5;

            return (
              <div key={f.id} className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-stone-900">{f.label}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${
                      isLoss
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : isGain
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {s.variation > 0 ? `+${fmtPlain(s.variation)} L` : `${fmtPlain(s.variation)} L`}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-sans block">Opening Dip</span>
                    <span className="text-stone-700">{fmtPlain(s.openingStock)} L</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-sans block">Received (BRV)</span>
                    <span className="text-blue-700 font-semibold">{s.stockReceived > 0 ? `+${fmtPlain(s.stockReceived)} L` : '0.00 L'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-sans block">Available</span>
                    <span className="text-stone-700">{fmtPlain(s.totalAvailable)} L</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-sans block">Sales (Meters)</span>
                    <span className="text-stone-700">-{fmtPlain(s.salesLitres)} L</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-sans block">Book Closing</span>
                    <span className="font-semibold text-emerald-800">{fmtPlain(s.bookClosing)} L</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase font-sans block">Physical Dip</span>
                    <span className="font-bold text-stone-900">{fmtPlain(s.physicalClosing)} L</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Mobile Totals Summary */}
          <div className="p-3 bg-stone-100 border border-stone-300 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase text-stone-800">TOTAL VARIATION</span>
              <span
                className={`font-mono font-black text-xs ${
                  recon.totalStockVariation < -0.5
                    ? 'text-rose-700'
                    : recon.totalStockVariation > 0.5
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                {recon.totalStockVariation > 0 ? `+${fmtPlain(recon.totalStockVariation)} L` : `${fmtPlain(recon.totalStockVariation)} L`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-[9.5px] text-stone-500 uppercase font-sans block">Total Opening</span>
                <span>{fmtPlain(recon.totalOpeningStock)} L</span>
              </div>
              <div>
                <span className="text-[9.5px] text-stone-500 uppercase font-sans block">Total Received</span>
                <span className="text-blue-700">+{fmtPlain(recon.totalStockReceived)} L</span>
              </div>
              <div>
                <span className="text-[9.5px] text-stone-500 uppercase font-sans block">Total Sales</span>
                <span>-{fmtPlain(recon.totalLitres)} L</span>
              </div>
              <div>
                <span className="text-[9.5px] text-stone-500 uppercase font-sans block">Total Physical</span>
                <span>{fmtPlain(recon.totalPhysicalClosing)} L</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Reconciliation Mathematical Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
            Account Reconciliation Statement
          </span>
          <span className="text-[11px] text-stone-500 font-mono">
            Volume: <strong>{fmtPlain(recon.totalLitres)} L</strong>
          </span>
        </div>

        <table className="w-full text-left text-xs">
          <tbody className="divide-y divide-stone-100">
            <tr className="hover:bg-stone-50/50">
              <td className="py-3 px-4 text-stone-700 font-medium">
                <div>Total Sales Amount Expected (From Meters)</div>
                <div className="text-[10px] text-stone-400 font-normal">
                  Calculated from {fmtPlain(recon.totalLitres)} net litres dispensed across all nozzles
                </div>
              </td>
              <td className="py-3 px-4 text-right font-mono font-bold text-stone-900">
                {fmt(recon.totalSales)}
              </td>
            </tr>
            <tr className="hover:bg-stone-50/50 text-emerald-800">
              <td className="py-3 px-4 font-medium flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">
                  +
                </span>
                Add: Credit Sales Collection (C)
              </td>
              <td className="py-3 px-4 text-right font-mono font-bold">
                {fmtPlain(recon.C)}
              </td>
            </tr>
            <tr className="hover:bg-stone-50/50 text-rose-800">
              <td className="py-3 px-4 font-medium flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-[10px]">
                  -
                </span>
                Less: Approved Credit Sales (A)
              </td>
              <td className="py-3 px-4 text-right font-mono font-bold">
                {fmtPlain(recon.A)}
              </td>
            </tr>
            <tr className="hover:bg-stone-50/50 text-rose-800">
              <td className="py-3 px-4 font-medium flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-[10px]">
                  -
                </span>
                Less: E-Value / MoMo &amp; Bank POS (B)
              </td>
              <td className="py-3 px-4 text-right font-mono font-bold">
                {fmtPlain(recon.B)}
              </td>
            </tr>
            <tr className="hover:bg-stone-50/50 text-rose-800">
              <td className="py-3 px-4 font-medium flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-[10px]">
                  -
                </span>
                Less: Generator Fuel (D)
              </td>
              <td className="py-3 px-4 text-right font-mono font-bold">
                {fmtPlain(recon.D)}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-emerald-50/90 border-t-2 border-emerald-300 font-bold text-emerald-950 text-xs">
              <td className="py-3.5 px-4 uppercase tracking-wider font-bold">
                Total Cash Expected To Bank
              </td>
              <td className="py-3.5 px-4 text-right font-mono font-extrabold text-sm text-emerald-900">
                {fmt(recon.totalCashToBank)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Comparison Variance Card */}
      <div className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
            Physical Cash vs Expected Comparison
          </span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border flex items-center gap-1 ${statusConfig.badge}`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            {recon.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200">
            <span className="text-[11px] text-stone-500 font-semibold block">Expected Cash to Bank</span>
            <span className="text-base font-bold font-mono text-stone-800">
              {fmt(recon.totalCashToBank)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
            <span className="text-[11px] text-emerald-800 font-semibold block">Physical Cash Counted</span>
            <span className="text-base font-bold font-mono text-emerald-900">
              {fmt(recon.physicalCash)}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-stone-900 text-white flex items-center justify-between">
          <div>
            <span className="text-[11px] text-stone-400 uppercase font-semibold block">
              Difference / Variance
            </span>
            <span className="text-xs text-stone-300">
              {recon.status === 'balanced'
                ? 'Account in complete balance'
                : recon.status === 'shortage'
                ? 'Shortage to be accounted for'
                : 'Cash surplus'}
            </span>
          </div>
          <div className="text-right">
            <span
              className={`text-xl font-mono font-extrabold ${
                recon.status === 'shortage'
                  ? 'text-rose-400'
                  : recon.status === 'excess'
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {recon.diff > 0 ? `+${fmt(recon.diff)}` : fmt(recon.diff)}
            </span>
          </div>
        </div>
      </div>

      {/* Physical Cash Denominations & Banknotes Counted Card */}
      <div className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <Banknote className="w-4 h-4 text-emerald-600" /> Counted Cash Denominations (Notes &amp; Coins)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Counted: {fmt(recon.physicalCash)}
            </span>
          </div>
        </div>

        {/* Banknotes Counted Breakdown */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5 text-stone-500" /> Ghana Cedi Banknotes
            </span>
            <span className="text-[11px] font-mono text-stone-600">
              <strong className="text-stone-900">{totalNotesPieces}</strong> notes ·{' '}
              <strong className="text-emerald-800">{fmt(totalNotesCash)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DENOMINATIONS.map((d) => {
              const count = num(record.cash?.denoms?.[d]);
              const subtotal = d * count;
              const hasCount = count > 0;

              return (
                <div
                  key={d}
                  className={`p-2.5 rounded-xl border transition-all ${
                    hasCount
                      ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/30'
                      : 'bg-stone-50/60 border-stone-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-mono font-extrabold px-1.5 py-0.5 rounded border ${
                        hasCount
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-stone-200 text-stone-700 border-stone-300'
                      }`}
                    >
                      GH₵{d}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold ${
                        hasCount ? 'text-emerald-900' : 'text-stone-400'
                      }`}
                    >
                      {count} <span className="text-[10px] font-normal font-sans">pcs</span>
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-baseline justify-between text-xs font-mono">
                    <span className="text-[10px] text-stone-400 font-sans">Subtotal</span>
                    <span
                      className={`font-extrabold ${
                        hasCount ? 'text-stone-900' : 'text-stone-400'
                      }`}
                    >
                      {fmt(subtotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coins Counted Breakdown */}
        <div className="space-y-2 pt-1 border-t border-stone-100">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-600" /> Pesewas &amp; Coins
            </span>
            <span className="text-[11px] font-mono text-stone-600">
              <strong className="text-stone-900">{totalCoinsPieces}</strong> coins ·{' '}
              <strong className="text-stone-800">{fmt(totalCoinsCash)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {COIN_DENOMINATIONS.map((c) => {
              const count = num(record.cash?.coins?.[c]);
              const subtotal = c * count;
              const hasCount = count > 0;

              return (
                <div
                  key={c}
                  className={`p-2 rounded-xl border transition-all ${
                    hasCount
                      ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-400/30'
                      : 'bg-stone-50/60 border-stone-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        hasCount
                          ? 'bg-amber-500 text-stone-950 border-amber-600'
                          : 'bg-stone-200 text-stone-700 border-stone-300'
                      }`}
                    >
                      {c >= 1 ? `GH₵${c.toFixed(0)}` : `${Math.round(c * 100)}p`}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold ${
                        hasCount ? 'text-amber-900' : 'text-stone-400'
                      }`}
                    >
                      {count} <span className="text-[10px] font-normal font-sans">pcs</span>
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between text-xs font-mono">
                    <span className="text-[9px] text-stone-400 font-sans">Subtotal</span>
                    <span
                      className={`text-[11px] font-bold ${
                        hasCount ? 'text-stone-900' : 'text-stone-400'
                      }`}
                    >
                      {fmt(subtotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Total Physical Cash Count Verification Footnote */}
        <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-stone-600">
              Drawer Total: <strong>{totalNotesPieces} notes</strong> + <strong>{totalCoinsPieces} coins</strong>
            </span>
          </div>
          <div className="font-mono font-extrabold text-emerald-900">
            Total Cash: {fmt(recon.physicalCash)}
          </div>
        </div>
      </div>

      {/* Digital Signatures Handover & Authentication */}
      <div className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> Digital Sign-Off &amp; Handover
          </span>
          <span className="text-[11px] text-stone-400">Touch to sign</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Attendant Signature Box */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-700">Pump Attendant</span>
              <span className="text-[11px] text-stone-500 font-medium">
                {record.attendant || 'Attendant'}
              </span>
            </div>

            <div
              onClick={() => setActiveSigner('attendant')}
              className="h-20 bg-white rounded-lg border border-dashed border-stone-300 hover:border-emerald-500 flex flex-col items-center justify-center p-2 cursor-pointer transition-all hover:bg-emerald-50/20"
            >
              {record.attendantSignature ? (
                <img
                  src={record.attendantSignature}
                  alt="Attendant Signature"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-stone-400 flex flex-col items-center gap-1">
                  <PenLine className="w-4 h-4 text-stone-400" />
                  <span className="text-[11px] font-semibold text-emerald-700">Tap to Sign</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-[10px] text-stone-400">
              <span>{record.attendantSignature ? '✓ Signed digitally' : 'Signature required'}</span>
              {record.attendantSignature && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSigner('attendant');
                  }}
                  className="text-emerald-700 font-bold hover:underline"
                >
                  Change
                </button>
              )}
            </div>
          </div>

          {/* Supervisor Signature Box */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-stone-700">Shift Supervisor</span>
              <span className="text-[11px] text-stone-500 font-medium">
                {record.supervisor || 'Supervisor'}
              </span>
            </div>

            <div
              onClick={() => setActiveSigner('supervisor')}
              className="h-20 bg-white rounded-lg border border-dashed border-stone-300 hover:border-emerald-500 flex flex-col items-center justify-center p-2 cursor-pointer transition-all hover:bg-emerald-50/20"
            >
              {record.supervisorSignature ? (
                <img
                  src={record.supervisorSignature}
                  alt="Supervisor Signature"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-stone-400 flex flex-col items-center gap-1">
                  <PenLine className="w-4 h-4 text-stone-400" />
                  <span className="text-[11px] font-semibold text-emerald-700">Tap to Sign (Optional)</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-[10px] text-stone-400">
              <span>{record.supervisorSignature ? '✓ Verified by supervisor' : 'Supervisor verification'}</span>
              {record.supervisorSignature && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSigner('supervisor');
                  }}
                  className="text-emerald-700 font-bold hover:underline"
                >
                  Change
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {activeSigner && (
        <SignaturePadModal
          isOpen={true}
          onClose={() => setActiveSigner(null)}
          title={activeSigner === 'attendant' ? 'Attendant Digital Signature' : 'Supervisor Verification Signature'}
          signerName={activeSigner === 'attendant' ? record.attendant : record.supervisor}
          initialSignature={activeSigner === 'attendant' ? record.attendantSignature : record.supervisorSignature}
          onSave={(sigDataUrl) => {
            if (activeSigner === 'attendant') {
              onChange({ ...record, attendantSignature: sigDataUrl });
            } else {
              onChange({ ...record, supervisorSignature: sigDataUrl });
            }
          }}
        />
      )}

      {/* Shift Sign-off info & Notes */}
      <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-xs space-y-3">
        <div className="font-semibold text-stone-800 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-stone-500" />
          Shift Record Handover &amp; Notes
        </div>

        <div className="grid grid-cols-2 gap-2 text-stone-600">
          <div>
            <span className="text-stone-400 block text-[11px]">Attendant:</span>
            <span className="font-medium text-stone-900">{record.attendant || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-stone-400 block text-[11px]">Supervisor:</span>
            <span className="font-medium text-stone-900">{record.supervisor || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-stone-400 block text-[11px]">Station:</span>
            <span className="font-medium text-stone-900">{record.station || 'Not specified'}</span>
          </div>
          <div>
            <span className="text-stone-400 block text-[11px]">Shift:</span>
            <span className="font-medium text-stone-900">
              Group {record.shiftGroup} ({record.shiftPeriod})
            </span>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-stone-600 mb-1">
            Shift Notes / Attendant Remarks
          </label>
          <textarea
            rows={2}
            value={record.notes || ''}
            onChange={(e) => onChange({ ...record, notes: e.target.value })}
            placeholder="Add any handover notes or remarks about pump status, shortages, or power outages..."
            className="w-full bg-white border border-stone-300 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>
    </div>
  );
};
