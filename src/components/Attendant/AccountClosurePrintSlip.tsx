import React from 'react';
import {
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  User,
  Fuel,
  CreditCard,
  Receipt,
  Banknote,
  ShieldCheck,
} from 'lucide-react';
import {
  AttendantAccountabilityRecord,
  DENOMINATIONS,
  COIN_DENOMINATIONS,
} from '../../types';
import { computeAttendantSummary } from '../../utils/accountabilityCalculations';

interface AccountClosurePrintSlipProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendantAccountabilityRecord;
  supervisorName: string;
}

export const AccountClosurePrintSlip: React.FC<AccountClosurePrintSlipProps> = ({
  isOpen,
  onClose,
  record,
  supervisorName,
}) => {
  if (!isOpen) return null;

  const summary = computeAttendantSummary(record);
  const handlePrint = () => {
    window.print();
  };

  const denoms = record.cashDenominations?.notes || ({} as any);
  const coins = record.cashDenominations?.coins || ({} as any);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 overflow-y-auto print:p-0 print:bg-white">
      <div className="bg-white text-stone-900 rounded-xl w-full max-w-2xl my-6 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:m-0 print:rounded-none print:w-full">
        {/* Header Controls (Hidden on Print) */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">Official Account Closure Handover Certificate</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-amber-400 text-stone-900 hover:bg-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Handover Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Slip Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs font-sans print:p-4 print:text-[11px]">
          {/* Station & Company Header */}
          <div className="text-center border-b border-stone-300 pb-3">
            <h1 className="text-lg font-black tracking-tight text-stone-900 uppercase">
              {record.companyName || 'FUEL STATION & FORECOURT MANAGEMENT'}
            </h1>
            <p className="text-[11px] font-semibold text-stone-600">
              FORECOURT ATTENDANT SHIFT & ACCOUNT CLOSURE CERTIFICATE
            </p>
            <div className="flex items-center justify-center gap-3 text-[10px] text-stone-500 mt-1">
              <span>Station: <b>{record.station || 'Main Forecourt'}</b></span>
              <span>•</span>
              <span>Code: <b>{record.stationCode || 'STN-001'}</b></span>
              <span>•</span>
              <span>Printed: {new Date().toLocaleString()}</span>
            </div>
          </div>

          {/* Attendant & Shift Meta */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200">
            <div>
              <span className="text-[10px] uppercase text-stone-500 block font-semibold">Attendant Details</span>
              <div className="font-bold text-sm text-stone-900">{record.attendantName}</div>
              <div className="text-[11px] text-stone-600">Staff ID: <b className="font-mono">{record.staffId}</b></div>
              <div className="text-[11px] text-stone-600">Phone: {record.phone || 'N/A'}</div>
            </div>
            <div>
              <span className="text-[10px] uppercase text-stone-500 block font-semibold">Account Period & Shift</span>
              <div className="font-bold text-stone-900">{record.shiftType}</div>
              <div className="text-[11px] text-stone-600">
                Period: <b className="font-mono">{record.startDate || record.date}</b>
                {record.endDate && <span> to <b className="font-mono">{record.endDate}</b></span>}
              </div>
              <div className="text-[11px] text-stone-600">
                Span: <b>{summary.daysOpenCount} Day(s)</b> • State: <b className="uppercase">{record.accountState || 'Closed'}</b>
              </div>
            </div>
          </div>

          {/* 1. LITRES & SALES (METERS) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between border-b border-stone-300 pb-1">
              <h4 className="font-bold text-xs uppercase text-stone-800 flex items-center gap-1.5">
                <Fuel className="w-3.5 h-3.5 text-amber-600" />
                <span>1. Meter Readings, Litres & Gross Sales</span>
              </h4>
              <span className="font-mono font-bold text-stone-900">
                Total Litres: {summary.totalLitres.toFixed(2)} L
              </span>
            </div>

            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-stone-100 text-[10px] text-stone-600 border-b border-stone-200 uppercase">
                  <th className="p-1.5">Pump / Fuel</th>
                  <th className="p-1.5 text-right">Opening</th>
                  <th className="p-1.5 text-right">Closing</th>
                  <th className="p-1.5 text-right">RTT (L)</th>
                  <th className="p-1.5 text-right">Net Litres</th>
                  <th className="p-1.5 text-right">Price (GH₵)</th>
                  <th className="p-1.5 text-right">Sales (GH₵)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 font-mono text-[11px]">
                {(record.meterReadings || []).map((m, idx) => {
                  const netL = Math.max(0, (Number(m.closingMeter) || 0) - (Number(m.openingMeter) || 0) - (Number(m.rtt) || 0));
                  const sales = netL * (Number(m.unitPrice) || 0);
                  return (
                    <tr key={m.id || idx}>
                      <td className="p-1.5 font-sans font-semibold text-stone-900">
                        {m.pumpName} <span className="text-[10px] text-stone-500 uppercase">({m.fuelType})</span>
                      </td>
                      <td className="p-1.5 text-right">{(Number(m.openingMeter) || 0).toFixed(2)}</td>
                      <td className="p-1.5 text-right">{(Number(m.closingMeter) || 0).toFixed(2)}</td>
                      <td className="p-1.5 text-right">{(Number(m.rtt) || 0).toFixed(2)}</td>
                      <td className="p-1.5 text-right font-bold text-stone-900">{netL.toFixed(2)}</td>
                      <td className="p-1.5 text-right">{(Number(m.unitPrice) || 0).toFixed(2)}</td>
                      <td className="p-1.5 text-right font-bold text-stone-900">{sales.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-stone-100 font-bold border-t-2 border-stone-300">
                  <td colSpan={4} className="p-1.5 text-right uppercase text-[10px] font-sans">Gross Fuel Sales Total:</td>
                  <td className="p-1.5 text-right font-mono">{summary.totalLitres.toFixed(2)} L</td>
                  <td></td>
                  <td className="p-1.5 text-right font-mono text-stone-900">GH₵ {summary.totalSales.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 2. E-VALUES & ELECTRONIC TRANSACTIONS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between border-b border-stone-300 pb-1">
              <h4 className="font-bold text-xs uppercase text-stone-800 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-cyan-600" />
                <span>2. E-Values (MoMo / POS / Bank QR)</span>
              </h4>
              <span className="font-mono font-bold text-cyan-800">
                GH₵ {summary.totalEvalues.toFixed(2)}
              </span>
            </div>

            {(record.evalues && record.evalues.length > 0) ? (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-stone-100 text-[10px] text-stone-600 border-b border-stone-200 uppercase">
                    <th className="p-1.5">Channel / Provider</th>
                    <th className="p-1.5">Reference / TxID</th>
                    <th className="p-1.5">Customer / Phone</th>
                    <th className="p-1.5 text-right">Amount (GH₵)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-[11px]">
                  {record.evalues.map((ev, idx) => (
                    <tr key={ev.id || idx}>
                      <td className="p-1.5 font-semibold text-stone-900">
                        {ev.channel} {ev.provider ? `(${ev.provider})` : ''}
                      </td>
                      <td className="p-1.5 font-mono text-stone-700">{ev.reference}</td>
                      <td className="p-1.5 text-stone-600">{ev.customerInfo || '—'}</td>
                      <td className="p-1.5 text-right font-mono font-bold text-stone-900">
                        {(Number(ev.amount) || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="grid grid-cols-4 gap-2 p-2 bg-stone-50 rounded border border-stone-200 text-center font-mono">
                <div><span className="text-[10px] text-stone-500 block">VISA / POS</span>GH₵ {Number(record.payments?.visa || 0).toFixed(2)}</div>
                <div><span className="text-[10px] text-stone-500 block">MoMo</span>GH₵ {Number(record.payments?.momo || 0).toFixed(2)}</div>
                <div><span className="text-[10px] text-stone-500 block">Bank</span>GH₵ {Number(record.payments?.bank || 0).toFixed(2)}</div>
                <div><span className="text-[10px] text-stone-500 block">Other / Wallets</span>GH₵ {Number(record.payments?.other || 0).toFixed(2)}</div>
              </div>
            )}
          </div>

          {/* 3. CLAIM CODES & VOUCHERS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between border-b border-stone-300 pb-1">
              <h4 className="font-bold text-xs uppercase text-stone-800 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-purple-600" />
                <span>3. Claim Codes & Corporate Vouchers</span>
              </h4>
              <span className="font-mono font-bold text-purple-800">
                GH₵ {summary.totalVouchers.toFixed(2)}
              </span>
            </div>

            {(record.voucherClaims && record.voucherClaims.length > 0) ? (
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-stone-100 text-[10px] text-stone-600 border-b border-stone-200 uppercase">
                    <th className="p-1.5">Claim Code / Voucher #</th>
                    <th className="p-1.5">Company / Client</th>
                    <th className="p-1.5">Vehicle Reg #</th>
                    <th className="p-1.5 text-right">Litres</th>
                    <th className="p-1.5 text-right">Amount (GH₵)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-[11px]">
                  {record.voucherClaims.map((vc, idx) => (
                    <tr key={vc.id || idx}>
                      <td className="p-1.5 font-mono font-bold text-stone-900">
                        {vc.claimCode ? `${vc.claimCode} / ` : ''}{vc.voucherNumber}
                      </td>
                      <td className="p-1.5 text-stone-800">{vc.companyName}</td>
                      <td className="p-1.5 font-mono text-stone-600">{vc.vehicleReg || '—'}</td>
                      <td className="p-1.5 text-right font-mono">{Number(vc.litres || 0).toFixed(2)}</td>
                      <td className="p-1.5 text-right font-mono font-bold text-stone-900">
                        {(Number(vc.amount) || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-[11px] text-stone-500 italic p-2 bg-stone-50 rounded">
                No fleet claim codes or corporate vouchers recorded for this shift.
              </p>
            )}
          </div>

          {/* 4. OTHER TRANSACTIONS & DEDUCTIONS */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between border-b border-stone-300 pb-1">
              <h4 className="font-bold text-xs uppercase text-stone-800">
                4. Other Transactions (Credit Sales, Expenses & Deductions)
              </h4>
              <span className="font-mono text-stone-600 text-[11px]">
                Credit: GH₵ {summary.totalCreditSales.toFixed(2)} • Expenses: GH₵ {summary.approvedDeductions.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-stone-50 rounded border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-600 block mb-1">Approved Credit Customers</span>
                {(record.creditSales && record.creditSales.length > 0) ? (
                  <div className="space-y-1">
                    {record.creditSales.map((c, i) => (
                      <div key={i} className="flex justify-between font-mono">
                        <span className="truncate">{c.customer} ({c.invoiceRef})</span>
                        <span className="font-bold">GH₵ {c.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-stone-500 font-mono">GH₵ {Number(record.payments?.credit || 0).toFixed(2)} (General)</span>
                )}
              </div>

              <div className="p-2 bg-stone-50 rounded border border-stone-200">
                <span className="text-[10px] uppercase font-bold text-stone-600 block mb-1">Authorized Deductions / Expenses</span>
                {(record.expenses && record.expenses.length > 0) ? (
                  <div className="space-y-1">
                    {record.expenses.map((e, i) => (
                      <div key={i} className="flex justify-between font-mono">
                        <span className="truncate">{e.category} ({e.voucherRef || e.reason})</span>
                        <span className="font-bold">GH₵ {e.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-stone-500">None logged</span>
                )}
              </div>
            </div>
          </div>

          {/* 5. MONEY DENOMINATIONS (BANK OF GHANA CASH) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between border-b border-stone-300 pb-1">
              <h4 className="font-bold text-xs uppercase text-stone-800 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                <span>5. Bank of Ghana Cash Denominations Count</span>
              </h4>
              <span className="font-mono font-bold text-emerald-700">
                Total Cash Counted: GH₵ {summary.actualCash.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-lg border border-stone-200 text-[11px] font-mono">
              {/* Banknotes */}
              <div>
                <span className="text-[10px] font-sans font-bold uppercase text-stone-600 block mb-1">
                  Banknotes (GH₵)
                </span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  {DENOMINATIONS.map((d) => {
                    const count = Number(denoms[d] || 0);
                    const subtotal = count * d;
                    return (
                      <div key={d} className="flex justify-between border-b border-stone-200 py-0.5">
                        <span className="text-stone-600">GH₵{d} × {count}</span>
                        <span className="font-bold">{subtotal.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Coins */}
              <div>
                <span className="text-[10px] font-sans font-bold uppercase text-stone-600 block mb-1">
                  Coins (GH₵)
                </span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                  {COIN_DENOMINATIONS.map((c) => {
                    const count = Number(coins[c] || 0);
                    const subtotal = count * c;
                    return (
                      <div key={c} className="flex justify-between border-b border-stone-200 py-0.5">
                        <span className="text-stone-600">GH₵{c.toFixed(2)} × {count}</span>
                        <span className="font-bold">{subtotal.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* RECONCILIATION SUMMARY BOX */}
          <div className="p-3 rounded-lg bg-stone-100 border border-stone-300 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold uppercase border-b border-stone-300 pb-1.5">
              <span>Final Reconciliation Equation</span>
              <span
                className={`font-mono text-sm px-2 py-0.5 rounded ${
                  summary.status === 'accounted'
                    ? 'bg-emerald-100 text-emerald-800'
                    : summary.status === 'shortage'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                Status: {summary.status.toUpperCase()} ({summary.difference >= 0 ? '+' : ''}GH₵ {summary.difference.toFixed(2)})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
              <div className="p-1.5 bg-white rounded border border-stone-200">
                <span className="text-[10px] text-stone-500 font-sans block">Total Gross Sales</span>
                <span className="font-bold text-stone-900">GH₵ {summary.totalSales.toFixed(2)}</span>
              </div>
              <div className="p-1.5 bg-white rounded border border-stone-200">
                <span className="text-[10px] text-stone-500 font-sans block">Non-Cash & Deductions</span>
                <span className="font-bold text-stone-900">
                  − GH₵ {(summary.totalNonCash + summary.approvedDeductions).toFixed(2)}
                </span>
              </div>
              <div className="p-1.5 bg-amber-50 rounded border border-amber-200">
                <span className="text-[10px] text-amber-800 font-sans block font-semibold">Expected Cash</span>
                <span className="font-bold text-amber-900">GH₵ {summary.expectedCash.toFixed(2)}</span>
              </div>
              <div className="p-1.5 bg-emerald-50 rounded border border-emerald-200">
                <span className="text-[10px] text-emerald-800 font-sans block font-semibold">Actual Counted Cash</span>
                <span className="font-bold text-emerald-900">GH₵ {summary.actualCash.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* SIGNATURE & AUDIT SIGN-OFF */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t-2 border-stone-400">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-500 block">
                  Attendant Handover Signature
                </span>
                <div className="mt-8 border-b border-stone-400 flex justify-between text-[11px] pb-1">
                  <span>Name: <b>{record.attendantName}</b></span>
                  <span>Date: {new Date().toLocaleDateString()}</span>
                </div>
                <span className="text-[9px] text-stone-500 block mt-0.5">
                  I hereby confirm the litres, sales, E-values, vouchers, and cash count submitted.
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-500 block">
                  Supervisor Audit & Sign-Off
                </span>
                <div className="mt-8 border-b border-stone-400 flex justify-between text-[11px] pb-1">
                  <span>Supervisor: <b>{record.closedBySupervisor || supervisorName}</b></span>
                  <span>Date: {new Date().toLocaleDateString()}</span>
                </div>
                <span className="text-[9px] text-stone-500 block mt-0.5">
                  Account verified, physical money denominations confirmed, and account officially closed.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
