import React from 'react';
import { X, Printer, Download, CheckCircle2, AlertTriangle, ShieldCheck, Fuel, Banknote } from 'lucide-react';
import { ShiftRecord, FUELS, DENOMINATIONS, COIN_DENOMINATIONS } from '../types';
import { calculateReconciliation, fmt, fmtPlain, num } from '../utils/calculations';

interface PrintSlipModalProps {
  record: ShiftRecord;
  onClose: () => void;
}

export const PrintSlipModal: React.FC<PrintSlipModalProps> = ({ record, onClose }) => {
  const recon = calculateReconciliation(record);

  // Aggregate denominations totals
  let totalNotesPieces = 0;
  let totalNotesCash = 0;
  const countedNotes = DENOMINATIONS.map((d) => {
    const count = num(record.cash?.denoms?.[d]);
    const subtotal = d * count;
    totalNotesPieces += count;
    totalNotesCash += subtotal;
    return { denom: d, count, subtotal };
  });

  let totalCoinsPieces = 0;
  let totalCoinsCash = 0;
  const countedCoins = COIN_DENOMINATIONS.map((c) => {
    const count = num(record.cash?.coins?.[c]);
    const subtotal = c * count;
    totalCoinsPieces += count;
    totalCoinsCash += subtotal;
    return { coin: c, count, subtotal };
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-stone-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-3.5 bg-stone-900 text-white flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider">Shift Reconciliation Slip</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" /> Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Slip Body */}
        <div className="p-6 overflow-y-auto font-mono text-xs text-stone-900 space-y-4 printable-slip">
          {/* Slip Header */}
          <div className="text-center border-b-2 border-stone-800 pb-3 space-y-1">
            <div className="flex items-center justify-center gap-1.5 font-sans font-extrabold text-base tracking-tight text-stone-950">
              <Fuel className="w-4 h-4 text-emerald-700 inline" />
              <span>DAILY SALES &amp; SHIFT RECONCILIATION</span>
            </div>
            <div className="font-sans font-bold text-xs text-stone-700 uppercase">
              {record.station || 'Station Branch'}
            </div>
            <div className="text-[11px] text-stone-500">
              Date: <strong>{record.date}</strong> &nbsp;|&nbsp; Shift: <strong>Group {record.shiftGroup} ({record.shiftPeriod})</strong>
            </div>
          </div>

          {/* Attendant Info */}
          <div className="grid grid-cols-2 gap-2 text-[11px] border-b border-stone-300 pb-2">
            <div>
              <span className="text-stone-500">Attendant:</span> <strong>{record.attendant || '—'}</strong>
            </div>
            <div className="text-right">
              <span className="text-stone-500">Supervisor:</span> <strong>{record.supervisor || '—'}</strong>
            </div>
            <div>
              <span className="text-stone-500">Record ID:</span> <span>{record.id.slice(0, 14)}</span>
            </div>
            <div className="text-right">
              <span className="text-stone-500">Status:</span> <strong className="uppercase">{record.status}</strong>
            </div>
          </div>

          {/* Meter & Sales Table */}
          <div>
            <div className="font-bold text-[11px] uppercase border-b border-stone-300 pb-1 mb-1">
              1. Fuel Sales Breakdown
            </div>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500">
                  <th className="text-left py-1">Fuel</th>
                  <th className="text-right py-1">Net (L)</th>
                  <th className="text-right py-1">Price</th>
                  <th className="text-right py-1">Amount (GHS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {FUELS.map((f) => {
                  const item = recon.fuelBreakdown[f.id];
                  if (!item || item.netLitres === 0) return null;
                  return (
                    <tr key={f.id}>
                      <td className="py-1 font-semibold">{f.shortName}</td>
                      <td className="text-right py-1">{fmtPlain(item.netLitres)}</td>
                      <td className="text-right py-1">{item.price.toFixed(2)}</td>
                      <td className="text-right py-1 font-bold">{fmtPlain(item.salesAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-stone-800 font-bold">
                  <td className="py-1">TOTAL SALES</td>
                  <td className="text-right py-1">{fmtPlain(recon.totalLitres)} L</td>
                  <td></td>
                  <td className="text-right py-1">{fmt(recon.totalSales)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Tank Stock & Dipping Report */}
          <div>
            <div className="font-bold text-[11px] uppercase border-b border-stone-300 pb-1 mb-1">
              2. Tank Stock &amp; Dipping Variation
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500">
                  <th className="text-left py-0.5">Tank</th>
                  <th className="text-right py-0.5">Open</th>
                  <th className="text-right py-0.5">Recv</th>
                  <th className="text-right py-0.5">Book</th>
                  <th className="text-right py-0.5">Dip</th>
                  <th className="text-right py-0.5 font-bold">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono">
                {FUELS.map((f) => {
                  const s = recon.stockBreakdown[f.id];
                  if (!s) return null;
                  const isCarried = (record.fuels[f.id]?.pumps?.length || 0) > 0 || s.salesLitres > 0 || s.openingStock > 0 || s.stockReceived > 0 || s.physicalClosing > 0;
                  if (!isCarried) return null;
                  return (
                    <tr key={f.id}>
                      <td className="py-1 font-sans font-semibold">{f.shortName}</td>
                      <td className="text-right py-1">{fmtPlain(s.openingStock)}</td>
                      <td className="text-right py-1 text-blue-700">+{fmtPlain(s.stockReceived)}</td>
                      <td className="text-right py-1">{fmtPlain(s.bookClosing)}</td>
                      <td className="text-right py-1 font-semibold">{fmtPlain(s.physicalClosing)}</td>
                      <td className={`text-right py-1 font-bold ${s.variation < -0.5 ? 'text-rose-700' : s.variation > 0.5 ? 'text-amber-700' : 'text-emerald-800'}`}>
                        {s.variation > 0 ? `+${fmtPlain(s.variation)}` : fmtPlain(s.variation)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-stone-400 font-bold">
                  <td className="py-1">TOTAL</td>
                  <td className="text-right py-1">{fmtPlain(recon.totalOpeningStock)}</td>
                  <td className="text-right py-1 text-blue-700">+{fmtPlain(recon.totalStockReceived)}</td>
                  <td className="text-right py-1">{fmtPlain(recon.totalBookClosing)}</td>
                  <td className="text-right py-1">{fmtPlain(recon.totalPhysicalClosing)}</td>
                  <td className="text-right py-1">
                    {recon.totalStockVariation > 0 ? `+${fmtPlain(recon.totalStockVariation)}` : fmtPlain(recon.totalStockVariation)} L
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Account & Drawings */}
          <div>
            <div className="font-bold text-[11px] uppercase border-b border-stone-300 pb-1 mb-1">
              3. Account &amp; Drawings
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>(+) Credit Collections (C):</span>
                <span>{fmt(recon.C)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>(-) Approved Credit Sales (A):</span>
                <span>{fmt(recon.A)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>(-) E-Value / MoMo &amp; Bank (B):</span>
                <span>{fmt(recon.B)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>(-) Generator Fuel (D):</span>
                <span>{fmt(recon.D)}</span>
              </div>
              <div className="flex justify-between border-t border-stone-300 pt-1 font-semibold">
                <span>Total Drawings (A+B+D):</span>
                <span>{fmt(recon.drawings)}</span>
              </div>
            </div>
          </div>

          {/* Physical Cash Denominations Counted */}
          <div>
            <div className="font-bold text-[11px] uppercase border-b border-stone-300 pb-1 mb-1 flex justify-between">
              <span>4. Cash Denominations Counted</span>
              <span className="font-mono text-stone-700">{fmt(recon.physicalCash)}</span>
            </div>

            {/* Banknotes grid */}
            <div className="text-[10px] space-y-1">
              <div className="font-semibold text-stone-700 text-[10px] flex justify-between">
                <span>Banknotes:</span>
                <span>{totalNotesPieces} pcs · {fmt(totalNotesCash)}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px]">
                {countedNotes.map(({ denom, count, subtotal }) => (
                  <div key={denom} className="flex justify-between border-b border-dotted border-stone-200 py-0.5">
                    <span className="text-stone-700">GH₵{denom} × {count}</span>
                    <span className={count > 0 ? 'font-bold text-stone-900' : 'text-stone-400'}>
                      {fmtPlain(subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Coins line if counted */}
              <div className="font-semibold text-stone-700 text-[10px] flex justify-between pt-1">
                <span>Coins &amp; Pesewas:</span>
                <span>{totalCoinsPieces} pcs · {fmt(totalCoinsCash)}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px]">
                {countedCoins.map(({ coin, count, subtotal }) => (
                  <div key={coin} className="flex justify-between border-b border-dotted border-stone-200 py-0.5">
                    <span className="text-stone-700">
                      {coin >= 1 ? `GH₵${coin.toFixed(0)}` : `${Math.round(coin * 100)}p`} × {count}
                    </span>
                    <span className={count > 0 ? 'font-bold text-stone-900' : 'text-stone-400'}>
                      {fmtPlain(subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Final Reconciliation Summary */}
          <div className="bg-stone-100 p-3 rounded-lg border border-stone-300 space-y-1.5">
            <div className="flex justify-between text-xs font-bold">
              <span>EXPECTED CASH TO BANK:</span>
              <span>{fmt(recon.totalCashToBank)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold">
              <span>PHYSICAL CASH COUNTED:</span>
              <span>{fmt(recon.physicalCash)}</span>
            </div>
            <div className="border-t border-dashed border-stone-400 pt-1 flex justify-between text-xs font-extrabold">
              <span>VARIANCE / DIFFERENCE:</span>
              <span className={recon.status === 'shortage' ? 'text-rose-700' : recon.status === 'excess' ? 'text-amber-700' : 'text-emerald-800'}>
                {recon.diff > 0 ? `+${fmt(recon.diff)}` : fmt(recon.diff)} ({recon.status.toUpperCase()})
              </span>
            </div>
          </div>

          {/* Notes if any */}
          {record.notes && (
            <div className="text-[10px] text-stone-600 border border-stone-200 p-2 rounded bg-stone-50">
              <strong>Notes:</strong> {record.notes}
            </div>
          )}

          {/* Verification Badge on Slip */}
          {record.status === 'verified' && (
            <div className="bg-emerald-50 border border-emerald-300 rounded p-2 text-center text-[10px] text-emerald-900 font-bold flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>OFFICIALLY AUDITED &amp; VERIFIED by {record.verifiedBy || record.supervisor} on {record.verifiedAt ? new Date(record.verifiedAt).toLocaleString() : record.date}</span>
            </div>
          )}

          {/* Signatures block */}
          <div className="pt-3 grid grid-cols-2 gap-4 text-center text-[10px] border-t border-stone-400">
            <div>
              <div className="h-12 border-b border-dashed border-stone-400 flex items-center justify-center overflow-hidden">
                {record.attendantSignature ? (
                  <img src={record.attendantSignature} alt="Attendant Signature" className="max-h-10 max-w-full object-contain" />
                ) : null}
              </div>
              <div className="mt-1 font-semibold">Attendant: {record.attendant || 'Sign-off'}</div>
            </div>
            <div>
              <div className="h-12 border-b border-dashed border-stone-400 flex items-center justify-center overflow-hidden">
                {record.supervisorSignature ? (
                  <img src={record.supervisorSignature} alt="Supervisor Signature" className="max-h-10 max-w-full object-contain" />
                ) : null}
              </div>
              <div className="mt-1 font-semibold">Supervisor: {record.supervisor || 'Manager Sign-off'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
