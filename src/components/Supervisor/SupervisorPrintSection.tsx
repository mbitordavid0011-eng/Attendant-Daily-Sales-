import React from 'react';
import { Printer, CheckCircle2, ShieldCheck, ArrowLeft } from 'lucide-react';
import {
  SupervisorSalesAccountRecord,
  SUPERVISOR_DEDUCTION_CATEGORIES,
} from '../../types';

interface SupervisorPrintSectionProps {
  form: SupervisorSalesAccountRecord;
  formatGhc: (val: number) => string;
  summary: any;
  supervisorName: string;
  stationName: string;
  stationCode: string;
  onBackToLedger?: () => void;
}

export const SupervisorPrintSection: React.FC<SupervisorPrintSectionProps> = ({
  form,
  formatGhc,
  summary,
  supervisorName,
  stationName,
  stationCode,
  onBackToLedger,
}) => {
  const fb = summary.fuelBreakdown || {};
  const stockBreakdown = summary.stockBreakdown || {};
  const isBalanced = Math.abs(summary.netVariance) <= 0.5;
  const isShortage = summary.netVariance < -0.5;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#191c1f] p-4 rounded-2xl border border-[#333739]">
        <div>
          <h3 className="text-sm font-bold text-[#ece8e0] uppercase tracking-wide flex items-center gap-2">
            <Printer className="w-4 h-4 text-[#e8b93b]" />
            Official Supervisor Sales Account Sheet
          </h3>
          <p className="text-xs text-[#8d9195]">
            Complete 11-section station sales ledger formatted for official audit review and printing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onBackToLedger && (
            <button
              type="button"
              onClick={onBackToLedger}
              className="py-2 px-3 rounded-xl border border-[#333739] bg-[#23262a] hover:bg-[#2e3237] text-[#ece8e0] text-xs font-bold cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft size={13} />
              <span>Back to Ledger</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="py-2 px-4 rounded-xl bg-[#e8b93b] hover:bg-[#d6a528] text-[#15171a] text-xs font-extrabold shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Print Official Account</span>
          </button>
        </div>
      </div>

      {/* PRINTABLE SLIP CONTAINER */}
      <div className="bg-white text-stone-900 p-6 sm:p-8 rounded-xl shadow-lg border border-stone-300 font-sans space-y-5 print:p-0 print:border-none print:shadow-none">
        {/* SLIP HEADER */}
        <div className="border-b-2 border-stone-800 pb-3 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black tracking-wider uppercase text-stone-900">
              {(form as any).companyName || 'FUEL STATION & FORECOURT MANAGEMENT'}
            </h1>
            <h2 className="text-xs font-bold text-stone-700 uppercase">
              SUPERVISOR DAILY SALES ACCOUNT & CLOSING LEDGER
            </h2>
            <p className="text-xs text-stone-600 font-mono font-semibold">
              Station: {form.station || stationName} ({form.stationCode || stationCode})
            </p>
          </div>
          <div className="text-right text-xs space-y-0.5">
            <div className="font-bold text-stone-900">Date: {form.date}</div>
            <div className="text-stone-700 font-mono">Shift: {form.shiftType}</div>
            <div className="text-stone-700">
              Supervisor: <b>{form.supervisorName || supervisorName}</b>
            </div>
            <div className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-stone-400 bg-stone-100">
              {form.accountState === 'closed' ? '🔒 Closed Account' : '🟢 Open Shift'}
            </div>
          </div>
        </div>

        {/* 1. SHIFT FUEL METERS (SUPER, DIESEL, RON 95) */}
        <div>
          <h3 className="text-xs font-bold uppercase bg-stone-100 p-1.5 border border-stone-300 text-stone-800">
            1. Fuel Dispensers & Totalizers (Super PMS, Diesel AGO, RON 95)
          </h3>
          <table className="w-full text-[11px] border-collapse mt-1">
            <thead>
              <tr className="border-b border-stone-300 bg-stone-50 text-stone-700 font-bold">
                <th className="p-1 text-left">Dispenser / Pump</th>
                <th className="p-1 text-left">Product</th>
                <th className="p-1 text-right">Opening Meters</th>
                <th className="p-1 text-right">Closing Meters</th>
                <th className="p-1 text-right">RTT (L)</th>
                <th className="p-1 text-right">Litres Sold</th>
                <th className="p-1 text-right">Price (GH₵)</th>
                <th className="p-1 text-right">Amount Sold (GH₵)</th>
              </tr>
            </thead>
            <tbody>
              {(form.fuelMeters || []).map((m) => {
                const netLitres = Math.max(
                  0,
                  (Number(m.closingMeter) || 0) -
                    (Number(m.openingMeter) || 0) -
                    (Number(m.rtt) || 0)
                );
                return (
                  <tr key={m.id} className="border-b border-stone-200">
                    <td className="p-1 font-bold">{m.pumpName}</td>
                    <td className="p-1 uppercase font-semibold">{m.fuelType}</td>
                    <td className="p-1 text-right font-mono">{m.openingMeter}</td>
                    <td className="p-1 text-right font-mono">{m.closingMeter}</td>
                    <td className="p-1 text-right font-mono text-amber-700">{m.rtt}</td>
                    <td className="p-1 text-right font-mono font-bold">
                      {formatGhc(netLitres)} L
                    </td>
                    <td className="p-1 text-right font-mono">
                      {m.unitPrice?.toFixed(2)}
                    </td>
                    <td className="p-1 text-right font-mono font-bold">
                      GH₵ {formatGhc(netLitres * (m.unitPrice || 0))}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-stone-100 font-bold">
                <td colSpan={5} className="p-1 text-right">
                  Total Fuel Throughput & Sales:
                </td>
                <td className="p-1 text-right font-mono">
                  {formatGhc(summary.totalFuelLitres)} L
                </td>
                <td colSpan={2} className="p-1 text-right font-mono text-stone-900">
                  GH₵ {formatGhc(summary.totalFuelSales)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. LUBRICANTS SECTION */}
        {(form.lubricantSales || []).length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase bg-stone-100 p-1.5 border border-stone-300 text-stone-800">
              2. Forecourt Lubricants & Specialty Products
            </h3>
            <table className="w-full text-[11px] border-collapse mt-1">
              <thead>
                <tr className="border-b border-stone-300 bg-stone-50 text-stone-700 font-bold">
                  <th className="p-1 text-left">Lubricant Product</th>
                  <th className="p-1 text-center">Unit</th>
                  <th className="p-1 text-right">Opening Stock</th>
                  <th className="p-1 text-right">Received</th>
                  <th className="p-1 text-right">Quantity Sold</th>
                  <th className="p-1 text-right">Closing Stock</th>
                  <th className="p-1 text-right">Unit Price</th>
                  <th className="p-1 text-right">Total Amount Sold</th>
                </tr>
              </thead>
              <tbody>
                {form.lubricantSales.map((lube) => (
                  <tr key={lube.id} className="border-b border-stone-200">
                    <td className="p-1 font-bold">{lube.name}</td>
                    <td className="p-1 text-center">{lube.unit}</td>
                    <td className="p-1 text-right font-mono">{lube.openingStock}</td>
                    <td className="p-1 text-right font-mono">{lube.received}</td>
                    <td className="p-1 text-right font-mono font-bold">
                      {lube.soldQty}
                    </td>
                    <td className="p-1 text-right font-mono">{lube.closingStock}</td>
                    <td className="p-1 text-right font-mono">{lube.unitPrice}</td>
                    <td className="p-1 text-right font-mono font-bold">
                      GH₵ {formatGhc((Number(lube.soldQty) || 0) * (Number(lube.unitPrice) || 0))}
                    </td>
                  </tr>
                ))}
                <tr className="bg-stone-100 font-bold">
                  <td colSpan={4} className="p-1 text-right">
                    Total Lubricants Sold & Revenue:
                  </td>
                  <td className="p-1 text-right font-mono">
                    {summary.totalLubeUnitsSold} Units
                  </td>
                  <td colSpan={3} className="p-1 text-right font-mono text-stone-900">
                    GH₵ {formatGhc(summary.totalLubeSales)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* 3. STOCK ACCOUNT TABLE */}
        <div>
          <h3 className="text-xs font-bold uppercase bg-stone-100 p-1.5 border border-stone-300 text-stone-800">
            3. Stock Account & Underground Tank Dip Comparison
          </h3>
          <table className="w-full text-[11px] border-collapse mt-1">
            <thead>
              <tr className="border-b border-stone-300 bg-stone-50 text-stone-700 font-bold">
                <th className="p-1 text-left">Product</th>
                <th className="p-1 text-right">Opening Stock</th>
                <th className="p-1 text-right">Stock Received</th>
                <th className="p-1 text-right">Total Stock</th>
                <th className="p-1 text-right">Closing Dip</th>
                <th className="p-1 text-right">Sales Per Dips</th>
                <th className="p-1 text-right">Sales Totalizer</th>
                <th className="p-1 text-right">Variance (L)</th>
                <th className="p-1 text-right">Stock Underground</th>
              </tr>
            </thead>
            <tbody>
              {['super', 'diesel', 'ron95'].map((fid) => {
                const item = stockBreakdown[fid] || {
                  label: fid.toUpperCase(),
                  openingStock: 0,
                  stockReceived: 0,
                  totalStock: 0,
                  closingStock: 0,
                  salesPerDips: 0,
                  salesPerTotalizer: 0,
                  variance: 0,
                  stockUnderground: 0,
                };
                return (
                  <tr key={fid} className="border-b border-stone-200">
                    <td className="p-1 font-bold">{item.label}</td>
                    <td className="p-1 text-right font-mono">{formatGhc(item.openingStock)}</td>
                    <td className="p-1 text-right font-mono">{formatGhc(item.stockReceived)}</td>
                    <td className="p-1 text-right font-mono font-semibold">{formatGhc(item.totalStock)}</td>
                    <td className="p-1 text-right font-mono font-bold">{formatGhc(item.closingStock)}</td>
                    <td className="p-1 text-right font-mono">{formatGhc(item.salesPerDips)}</td>
                    <td className="p-1 text-right font-mono">{formatGhc(item.salesPerTotalizer)}</td>
                    <td className={`p-1 text-right font-mono font-bold ${
                      item.variance < -0.5 ? 'text-red-600' : 'text-emerald-700'
                    }`}>
                      {item.variance >= 0 ? '+' : ''}{formatGhc(item.variance)}
                    </td>
                    <td className="p-1 text-right font-mono font-bold text-blue-900">{formatGhc(item.stockUnderground)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 4. TOTAL STATION SALES & DRAWINGS / EXPENSES SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* DRAWINGS */}
          <div>
            <h3 className="text-xs font-bold uppercase bg-stone-100 p-1.5 border border-stone-300 text-stone-800">
              4. Account / Drawings & Collections
            </h3>
            <div className="border border-stone-200 divide-y divide-stone-200 mt-1 p-2 space-y-1">
              <div className="flex justify-between">
                <span>Approved Credit Sales:</span>
                <span className="font-mono font-bold">GH₵ {formatGhc(summary.categoryA_approvedCredit)}</span>
              </div>
              <div className="flex justify-between">
                <span>E-Value / Drawings (MoMo & POS):</span>
                <span className="font-mono font-bold">GH₵ {formatGhc(summary.categoryB_evalues)}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-semibold">
                <span>+ Credit Sales Collections:</span>
                <span className="font-mono font-bold">+ GH₵ {formatGhc(summary.categoryC_creditCollections)}</span>
              </div>
              <div className="flex justify-between">
                <span>Generator Fuel (Genset):</span>
                <span className="font-mono font-bold">GH₵ {formatGhc(summary.deductionsBreakdown?.genset_expenses?.total || 0)}</span>
              </div>
            </div>
          </div>

          {/* OTHER EXPENSES */}
          <div>
            <h3 className="text-xs font-bold uppercase bg-stone-100 p-1.5 border border-stone-300 text-stone-800">
              5. Other Payments & Expenses
            </h3>
            <div className="border border-stone-200 divide-y divide-stone-200 mt-1 p-2 space-y-1">
              <div className="flex justify-between">
                <span>Vouchers & Claim Codes:</span>
                <span className="font-mono font-bold">GH₵ {formatGhc(summary.totalVouchers || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Operational & Station Expenses:</span>
                <span className="font-mono font-bold">GH₵ {formatGhc(summary.deductionsBreakdown?.operational_expenses?.total || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>Water & Utilities:</span>
                <span className="font-mono font-bold">GH₵ {formatGhc(summary.deductionsBreakdown?.water_bills?.total || 0)}</span>
              </div>
              <div className="flex justify-between font-bold text-red-700 pt-1">
                <span>Total Accounted Deductions:</span>
                <span className="font-mono">GH₵ {formatGhc(summary.totalDeductions || summary.totalDrawings)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. GRAND RECONCILIATION SUMMARY BOX */}
        <div className="border-2 border-stone-800 p-3 rounded-lg bg-stone-50 space-y-2 text-xs">
          <h3 className="text-xs font-black uppercase text-stone-900 border-b border-stone-300 pb-1">
            6. Shift Financial Reconciliation Statement
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Total Sales Amount Expected:</span>
                <b className="font-mono">GH₵ {formatGhc(summary.grossSales)}</b>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>+ Credit Collections:</span>
                <b className="font-mono">+ GH₵ {formatGhc(summary.categoryC_creditCollections)}</b>
              </div>
              <div className="flex justify-between text-red-700">
                <span>- Total Deductions / Drawings:</span>
                <b className="font-mono">- GH₵ {formatGhc(summary.totalDeductions || summary.totalDrawings)}</b>
              </div>
              <div className="flex justify-between font-bold text-stone-900 pt-1 border-t border-stone-300">
                <span>= Expected Cash to Bank:</span>
                <b className="font-mono text-sm">GH₵ {formatGhc(summary.expectedCashToBank)}</b>
              </div>
            </div>

            <div className="space-y-1 border-l border-stone-300 pl-4">
              <div className="flex justify-between font-bold text-stone-900">
                <span>Actual Physical Cash Counted:</span>
                <b className="font-mono text-sm">GH₵ {formatGhc(summary.actualCashCounted)}</b>
              </div>
              <div className="flex justify-between font-bold text-stone-900 pt-1 border-t border-stone-300">
                <span>Difference (Variance):</span>
                <b
                  className={`font-mono text-sm ${
                    summary.netVariance < -0.5
                      ? 'text-red-600'
                      : isBalanced
                      ? 'text-emerald-700'
                      : 'text-amber-700'
                  }`}
                >
                  {summary.netVariance >= 0 ? '+' : ''}GH₵ {formatGhc(summary.netVariance)}
                </b>
              </div>
              <div className="flex justify-between font-extrabold text-stone-900 pt-1">
                <span>Reconciliation Result:</span>
                <span
                  className={`px-2 py-0.5 rounded font-black text-xs uppercase ${
                    isBalanced
                      ? 'bg-emerald-100 text-emerald-800'
                      : isShortage
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {isBalanced ? '✓ BALANCED' : isShortage ? '⚠️ SHORTAGE' : '📈 EXCESS'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SIGNATURES */}
        <div className="grid grid-cols-2 gap-6 pt-6 border-t border-stone-300 text-xs">
          <div className="border-t border-stone-500 pt-1">
            <span className="text-[10px] text-stone-500 block">
              SUPERVISOR SIGNATURE & DATE:
            </span>
            <span className="font-bold text-stone-800">
              {form.supervisorName || supervisorName} — {form.date}
            </span>
          </div>
          <div className="border-t border-stone-500 pt-1">
            <span className="text-[10px] text-stone-500 block">
              STATION MANAGER AUDIT & APPROVAL:
            </span>
            <span className="font-bold text-stone-800">Kwame Mensah (Manager)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
