import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Printer,
  Download,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  GitBranch,
  Building,
  Calendar,
  User,
  Fuel,
  Wallet,
  Banknote,
  Coins,
  Scale,
  ShieldCheck,
  PenLine,
  Lock,
} from 'lucide-react';
import { ShiftRecord, FUELS, DENOMINATIONS, COIN_DENOMINATIONS } from '../types';
import { calculateReconciliation, fmt, fmtPlain, exportRecordToCSV, num } from '../utils/calculations';
import { PrintSlipModal } from './PrintSlipModal';
import { SignaturePadModal } from './SignaturePadModal';
import { getCurrentUser } from '../services/auth';

interface RecordDetailProps {
  record: ShiftRecord;
  allRecords: ShiftRecord[];
  userRole?: 'attendant' | 'supervisor' | 'station_manager';
  onBack: () => void;
  onEdit: (record: ShiftRecord, mode?: 'direct' | 'revision') => void;
  onDelete: (id: string) => void;
  onSelectRecord: (record: ShiftRecord) => void;
  onVerifyRecord?: (record: ShiftRecord) => void;
}

export const RecordDetail: React.FC<RecordDetailProps> = ({
  record,
  allRecords,
  userRole = 'attendant',
  onBack,
  onEdit,
  onDelete,
  onSelectRecord,
  onVerifyRecord,
}) => {
  const isSupervisor = userRole === 'supervisor' || userRole === 'station_manager';
  const currentUser = getCurrentUser();
  const currentAttendantName = (currentUser?.fullName || '').trim().toLowerCase();
  const currentStaffId = (currentUser?.staffId || '').trim().toLowerCase();
  const isRecordOwner =
    isSupervisor ||
    (currentAttendantName && (record.attendant || '').trim().toLowerCase().includes(currentAttendantName)) ||
    (currentStaffId && (
      (record.attendant || '').trim().toLowerCase().includes(currentStaffId) ||
      (record.attendantId || '').trim().toLowerCase() === currentStaffId
    ));

  if (!isSupervisor && !isRecordOwner) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 border border-stone-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-extrabold text-stone-900">Access Restricted</h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            This shift record belongs to another attendant ({record.attendant || 'Assigned Attendant'}). Forecourt attendants cannot view or open other attendants' shift accounts.
          </p>
          <button
            onClick={onBack}
            className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer"
          >
            Return to My Shifts
          </button>
        </div>
      </div>
    );
  }

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSupervisorSignModal, setShowSupervisorSignModal] = useState(false);
  const recon = calculateReconciliation(record);

  // Aggregate denominations totals
  let totalNotesPieces = 0;
  let totalNotesCash = 0;
  DENOMINATIONS.forEach((d) => {
    const count = num(record.cash?.denoms?.[d]);
    totalNotesPieces += count;
    totalNotesCash += d * count;
  });

  let totalCoinsPieces = 0;
  let totalCoinsCash = 0;
  COIN_DENOMINATIONS.forEach((c) => {
    const count = num(record.cash?.coins?.[c]);
    totalCoinsPieces += count;
    totalCoinsCash += c * count;
  });

  // Check if this record has a revision
  const revision = allRecords.find((r) => r.revisionOf === record.id);
  const original = record.revisionOf ? allRecords.find((r) => r.id === record.revisionOf) : null;

  const statusConfig = {
    balanced: {
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: CheckCircle2,
    },
    shortage: {
      badge: 'bg-rose-100 text-rose-800 border-rose-300',
      icon: AlertTriangle,
    },
    excess: {
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: ArrowUpRight,
    },
  }[recon.status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-stone-100 pb-28">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs no-print">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-900 py-1.5 px-2.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Records</span>
          </button>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xs font-extrabold text-stone-900">
                {record.date} · Shift {record.shiftGroup} ({record.shiftPeriod})
              </span>
              {record.status === 'verified' ? (
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold px-2 py-0.2 rounded-full inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified
                </span>
              ) : record.status === 'draft' ? (
                <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.2 rounded-full">
                  Draft
                </span>
              ) : (
                <span className="bg-blue-100 text-blue-800 border border-blue-300 text-[10px] font-bold px-2 py-0.2 rounded-full">
                  Submitted
                </span>
              )}
            </div>
            <span className="text-[11px] text-stone-500 truncate max-w-[200px] block">
              {record.station || 'Station'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowPrintModal(true)}
              className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
              title="Print Receipt Slip"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => exportRecordToCSV(record)}
              className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer"
              title="Export CSV"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* Supervisor Read-Only Governance Banner */}
        {isSupervisor && (
          <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-amber-950 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-xs">
                <span className="font-extrabold text-amber-950 block">Supervisor Read-Only Oversight</span>
                <p className="text-[11px] text-amber-800">
                  Attendant sales, meter records, and cash reconciliations are tamper-protected and cannot be edited by supervisors.
                </p>
              </div>
            </div>
            <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900 shrink-0">
              Read Only
            </span>
          </div>
        )}

        {/* Revision Alert Banners */}
        {revision && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-blue-900">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-blue-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold">A revised version exists for this shift.</span>
                <p className="text-[11px] text-blue-700">Updated: {new Date(revision.createdAt).toLocaleTimeString()}</p>
              </div>
            </div>
            <button
              onClick={() => onSelectRecord(revision)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer shrink-0"
            >
              View Revision
            </button>
          </div>
        )}

        {original && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-amber-900">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-amber-600 shrink-0" />
              <div className="text-xs">
                <span className="font-bold">This is a revised record.</span>
                <p className="text-[11px] text-amber-700">Original record is archived in History.</p>
              </div>
            </div>
            <button
              onClick={() => onSelectRecord(original)}
              className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors cursor-pointer shrink-0"
            >
              View Original
            </button>
          </div>
        )}

        {/* Top Summary Card */}
        <div className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-stone-900">
                  {record.station || 'Station'}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1 ${statusConfig.badge}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {record.status === 'draft' ? 'Draft' : recon.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-y-1 gap-x-3 text-xs text-stone-500 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  {record.date} (Group {record.shiftGroup} · {record.shiftPeriod})
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  {record.attendant || 'Attendant'}
                </span>
              </div>
            </div>
          </div>

          {/* Key Metric Blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
              <span className="text-[11px] text-stone-500 font-semibold block">Total Fuel Dispensed</span>
              <span className="text-sm font-bold font-mono text-stone-900">{fmtPlain(recon.totalLitres)} L</span>
            </div>
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
              <span className="text-[11px] text-stone-500 font-semibold block">Total Sales Expected</span>
              <span className="text-sm font-bold font-mono text-stone-900">{fmt(recon.totalSales)}</span>
            </div>
            <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
              <span className="text-[11px] text-stone-500 font-semibold block">Total Drawings</span>
              <span className="text-sm font-bold font-mono text-amber-700">{fmt(recon.drawings)}</span>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
              <span className="text-[11px] text-emerald-800 font-semibold block">Expected to Bank</span>
              <span className="text-sm font-bold font-mono text-emerald-900">{fmt(recon.totalCashToBank)}</span>
            </div>
          </div>

          {/* Variance Strip */}
          <div className="p-3.5 rounded-xl bg-stone-900 text-white flex items-center justify-between">
            <div>
              <span className="text-[11px] text-stone-400 font-semibold uppercase block">
                Physical Cash vs Expected
              </span>
              <span className="text-xs text-stone-300">
                Counted: {fmt(recon.physicalCash)}
              </span>
            </div>
            <div className="text-right">
              <span
                className={`text-lg font-mono font-extrabold ${
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

        {/* Meter Readings Table Breakdown */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Fuel className="w-4 h-4 text-emerald-600" /> Dispenser Meter Readings
            </span>
          </div>

          <div className="divide-y divide-stone-200">
            {FUELS.map((f) => {
              const fuelData = record.fuels[f.id];
              if (!fuelData || !fuelData.pumps || fuelData.pumps.length === 0) return null;

              const item = recon.fuelBreakdown[f.id];

              return (
                <div key={f.id} className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900">{f.label}</span>
                    <span className="text-xs font-mono font-bold text-emerald-800">
                      @ GH₵{fmtPlain(fuelData.price)}/L · {fmt(item?.salesAmount || 0)}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-[10px] text-stone-400 uppercase tracking-wider border-b border-stone-100">
                          <th className="py-1">Nozzle</th>
                          <th className="text-right py-1">Opening</th>
                          <th className="text-right py-1">Closing</th>
                          <th className="text-right py-1">R.T.T</th>
                          <th className="text-right py-1 font-semibold text-emerald-800">Net L</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-mono">
                        {fuelData.pumps.map((p) => {
                          const meter = Math.max(0, num(p.closing) - num(p.opening));
                          const net = Math.max(0, meter - num(p.rtt));
                          return (
                            <tr key={p.id}>
                              <td className="py-1.5 font-sans font-medium text-stone-700">{p.name}</td>
                              <td className="text-right py-1.5 text-stone-500">{fmtPlain(p.opening)}</td>
                              <td className="text-right py-1.5 text-stone-800">{fmtPlain(p.closing)}</td>
                              <td className="text-right py-1.5 text-amber-700">{fmtPlain(p.rtt)}</td>
                              <td className="text-right py-1.5 font-bold text-emerald-800">{fmtPlain(net)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tank Stock & Dipping Inventory Card */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Scale className="w-4 h-4 text-emerald-600" /> Tank Stock &amp; Dipping Inventory
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
              Variation: {recon.totalStockVariation > 0 ? `+${fmtPlain(recon.totalStockVariation)} L` : `${fmtPlain(recon.totalStockVariation)} L`}
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block p-3.5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] text-stone-400 uppercase tracking-wider border-b border-stone-100">
                  <th className="py-1">Tank</th>
                  <th className="text-right py-1">Opening</th>
                  <th className="text-right py-1 text-blue-700">Received</th>
                  <th className="text-right py-1">Sales</th>
                  <th className="text-right py-1 text-emerald-800">Book Dip</th>
                  <th className="text-right py-1 text-stone-900 font-bold">Actual Dip</th>
                  <th className="text-right py-1 font-bold">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono">
                {FUELS.map((f) => {
                  const s = recon.stockBreakdown[f.id];
                  if (!s) return null;
                  const isCarried = (record.fuels[f.id]?.pumps?.length || 0) > 0 || s.salesLitres > 0 || s.openingStock > 0 || s.stockReceived > 0 || s.physicalClosing > 0;
                  if (!isCarried) return null;
                  const isLoss = s.variation < -0.5;
                  const isGain = s.variation > 0.5;

                  return (
                    <tr key={f.id}>
                      <td className="py-2 font-sans font-medium text-stone-700">{f.label}</td>
                      <td className="text-right py-2 text-stone-500">{fmtPlain(s.openingStock)} L</td>
                      <td className="text-right py-2 text-blue-700 font-semibold">{s.stockReceived > 0 ? `+${fmtPlain(s.stockReceived)} L` : '0.00 L'}</td>
                      <td className="text-right py-2 text-stone-600">-{fmtPlain(s.salesLitres)} L</td>
                      <td className="text-right py-2 text-emerald-800 font-semibold">{fmtPlain(s.bookClosing)} L</td>
                      <td className="text-right py-2 text-stone-900 font-bold">{fmtPlain(s.physicalClosing)} L</td>
                      <td
                        className={`text-right py-2 font-bold ${
                          isLoss
                            ? 'text-rose-700'
                            : isGain
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {s.variation > 0 ? `+${fmtPlain(s.variation)} L` : `${fmtPlain(s.variation)} L`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-stone-200 font-bold text-stone-900 text-xs font-mono">
                  <td className="py-2 font-sans uppercase">TOTALS</td>
                  <td className="text-right py-2">{fmtPlain(recon.totalOpeningStock)} L</td>
                  <td className="text-right py-2 text-blue-700">+{fmtPlain(recon.totalStockReceived)} L</td>
                  <td className="text-right py-2">-{fmtPlain(recon.totalLitres)} L</td>
                  <td className="text-right py-2 text-emerald-800">{fmtPlain(recon.totalBookClosing)} L</td>
                  <td className="text-right py-2">{fmtPlain(recon.totalPhysicalClosing)} L</td>
                  <td
                    className={`text-right py-2 font-extrabold ${
                      recon.totalStockVariation < -0.5
                        ? 'text-rose-700'
                        : recon.totalStockVariation > 0.5
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    {recon.totalStockVariation > 0 ? `+${fmtPlain(recon.totalStockVariation)} L` : `${fmtPlain(recon.totalStockVariation)} L`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden p-3 space-y-3">
            {FUELS.map((f) => {
              const s = recon.stockBreakdown[f.id];
              if (!s) return null;
              const isCarried = (record.fuels[f.id]?.pumps?.length || 0) > 0 || s.salesLitres > 0 || s.openingStock > 0 || s.stockReceived > 0 || s.physicalClosing > 0;
              if (!isCarried) return null;
              const isLoss = s.variation < -0.5;
              const isGain = s.variation > 0.5;

              return (
                <div key={f.id} className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5">
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

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase block">Opening Stock</span>
                      <span className="font-mono font-semibold text-stone-800">{fmtPlain(s.openingStock)} L</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase block">Stock Received</span>
                      <span className="font-mono font-semibold text-blue-700">{s.stockReceived > 0 ? `+${fmtPlain(s.stockReceived)} L` : '0.00 L'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase block">Total Sales</span>
                      <span className="font-mono font-semibold text-stone-800">-{fmtPlain(s.salesLitres)} L</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase block">Book Dip (Closing)</span>
                      <span className="font-mono font-semibold text-emerald-800">{fmtPlain(s.bookClosing)} L</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase block">Actual Physical Dip</span>
                      <span className="font-mono font-bold text-stone-900">{fmtPlain(s.physicalClosing)} L</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase block">Variance</span>
                      <span
                        className={`font-mono font-bold ${
                          isLoss
                            ? 'text-rose-700'
                            : isGain
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {s.variation > 0 ? `+${fmtPlain(s.variation)} L` : `${fmtPlain(s.variation)} L`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Mobile Totals Summary */}
            <div className="p-3 bg-stone-100 border border-stone-300 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase text-stone-800">TOTALS</span>
                <span
                  className={`font-mono font-extrabold text-xs ${
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

        {/* Account & Drawings Summary */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-600" /> Drawings &amp; Collections
            </span>
            <span className="text-xs font-mono font-bold text-amber-700">
              Drawings Total: {fmt(recon.drawings)}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Approved Credit */}
            {record.approved.length > 0 && (
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="font-bold text-stone-800 mb-1 flex justify-between">
                  <span>A. Approved Credit Sales ({record.approved.length})</span>
                  <span className="font-mono text-rose-700">-{fmt(recon.A)}</span>
                </div>
                {record.approved.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] text-stone-600 py-0.5">
                    <span>{item.customer} {item.reference ? `(${item.reference})` : ''}</span>
                    <span className="font-mono font-medium">{fmt(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* E-Value */}
            {record.evalue.length > 0 && (
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="font-bold text-stone-800 mb-1 flex justify-between">
                  <span>B. E-Value &amp; Bank Payments ({record.evalue.length})</span>
                  <span className="font-mono text-rose-700">-{fmt(recon.B)}</span>
                </div>
                {record.evalue.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] text-stone-600 py-0.5">
                    <span>{item.channel} {item.bank ? `· ${item.bank}` : ''} {item.reference ? `(${item.reference})` : ''}</span>
                    <span className="font-mono font-medium">{fmt(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Collections */}
            {record.collections.length > 0 && (
              <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <div className="font-bold text-emerald-900 mb-1 flex justify-between">
                  <span>C. Credit Collections ({record.collections.length})</span>
                  <span className="font-mono text-emerald-700">+{fmt(recon.C)}</span>
                </div>
                {record.collections.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] text-emerald-800 py-0.5">
                    <span>{item.customer} {item.reference ? `(${item.reference})` : ''}</span>
                    <span className="font-mono font-medium">{fmt(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Generator Fuel */}
            {record.generator.length > 0 && (
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                <div className="font-bold text-stone-800 mb-1 flex justify-between">
                  <span>D. Generator Fuel ({record.generator.length})</span>
                  <span className="font-mono text-rose-700">-{fmt(recon.D)}</span>
                </div>
                {record.generator.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] text-stone-600 py-0.5">
                    <span>{item.description}</span>
                    <span className="font-mono font-medium">{fmt(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cash Denominations & Banknotes Counted Card */}
        <div className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Banknote className="w-4 h-4 text-emerald-600" /> Counted Cash Denominations (Notes &amp; Coins)
            </span>
            <span className="text-xs font-bold font-mono text-emerald-900 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Counted: {fmt(recon.physicalCash)}
            </span>
          </div>

          {/* Banknotes Counted Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5 text-stone-500" /> Banknotes Counted
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

          {/* Drawer Verification Footnote */}
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
            <div className="text-stone-600">
              Drawer Total: <strong>{totalNotesPieces} notes</strong> + <strong>{totalCoinsPieces} coins</strong>
            </div>
            <div className="font-mono font-extrabold text-emerald-900">
              Total Cash: {fmt(recon.physicalCash)}
            </div>
          </div>
        </div>

        {/* Digital Signatures Card */}
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Digital Signatures &amp; Authentication
            </span>
            {record.status === 'verified' && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Lock className="w-3 h-3" /> Shift Verified &amp; Locked
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Attendant Signature */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-700">Pump Attendant</span>
                <span className="text-[11px] text-stone-500">{record.attendant || 'Attendant'}</span>
              </div>
              <div className="h-20 bg-white rounded-lg border border-stone-200 flex items-center justify-center p-2">
                {record.attendantSignature ? (
                  <img
                    src={record.attendantSignature}
                    alt="Attendant Signature"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-[11px] text-stone-400 italic">No digital signature</span>
                )}
              </div>
              <span className="text-[10px] text-stone-400 block">
                {record.submittedAt ? `Submitted: ${new Date(record.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Shift declaration'}
              </span>
            </div>

            {/* Supervisor Signature */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-700">Shift Supervisor</span>
                <span className="text-[11px] text-stone-500">{record.supervisor || 'Supervisor'}</span>
              </div>
              <div className="h-20 bg-white rounded-lg border border-stone-200 flex items-center justify-center p-2">
                {record.supervisorSignature ? (
                  <img
                    src={record.supervisorSignature}
                    alt="Supervisor Signature"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSupervisorSignModal(true)}
                    className="flex flex-col items-center gap-1 text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer"
                  >
                    <PenLine className="w-4 h-4" />
                    <span className="text-[11px]">Sign &amp; Verify Now</span>
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-stone-400">
                  {record.verifiedAt ? `Verified: ${new Date(record.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Audit sign-off'}
                </span>
                {!record.supervisorSignature && (
                  <button
                    type="button"
                    onClick={() => setShowSupervisorSignModal(true)}
                    className="text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    Verify
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Supervisor Sign-Off & Verification Modal */}
        {showSupervisorSignModal && (
          <SignaturePadModal
            isOpen={true}
            onClose={() => setShowSupervisorSignModal(false)}
            title="Shift Supervisor Sign-Off & Verification"
            signerName={record.supervisor || 'Supervisor'}
            initialSignature={record.supervisorSignature}
            onSave={(sig) => {
              if (onVerifyRecord) {
                onVerifyRecord({
                  ...record,
                  supervisorSignature: sig,
                  status: 'verified',
                  verifiedBy: record.supervisor || 'Supervisor',
                  verifiedAt: new Date().toISOString(),
                });
              }
              setShowSupervisorSignModal(false);
            }}
          />
        )}

        {/* Action Controls */}
        {isSupervisor ? (
          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowSupervisorSignModal(true)}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <PenLine className="w-4 h-4" />
                <span>{record.supervisorSignature ? 'Update Verification Signature' : 'Sign & Verify Shift Record'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="py-3 px-4 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Slip</span>
              </button>
            </div>

            <div className="text-center text-[11px] text-stone-500 bg-stone-50 border border-stone-200 rounded-xl p-2.5 flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Supervisor Mode: Attendant sales accounts &amp; entries cannot be altered or deleted.</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <button
              onClick={() => {
                if (record.status === 'draft') {
                  onEdit(record, 'direct');
                } else {
                  setShowEditModal(true);
                }
              }}
              className="py-3 px-4 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
            >
              <Edit className="w-4 h-4" />
              <span>{record.status === 'draft' ? 'Continue Editing Draft' : 'Edit Shift Record'}</span>
            </button>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="py-3 px-4 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Record</span>
            </button>
          </div>
        )}
      </main>

      {/* Edit Options Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Edit className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-stone-900">
                Edit Submitted Record
              </h3>
              <p className="text-xs text-stone-600">
                How would you like to edit this shift for <strong className="text-stone-900">{record.date}</strong>?
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  onEdit(record, 'direct');
                }}
                className="w-full py-2.5 px-3.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold text-left flex items-center justify-between transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-bold">Edit Record Directly</div>
                  <div className="text-[10px] text-stone-300 font-normal">Update the meter readings, sales, or cash counts in place</div>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0 text-stone-400" />
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  onEdit(record, 'revision');
                }}
                className="w-full py-2.5 px-3.5 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-bold text-left flex items-center justify-between transition-colors cursor-pointer"
              >
                <div>
                  <div className="font-bold">Create Revised Copy</div>
                  <div className="text-[10px] text-stone-500 font-normal">Preserve the original record and generate a linked revision</div>
                </div>
                <GitBranch className="w-4 h-4 shrink-0 text-emerald-600" />
              </button>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-full py-2 rounded-xl text-stone-600 font-semibold text-xs hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-stone-200 space-y-4">
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-extrabold text-stone-900">
                Delete Shift Record?
              </h3>
              <p className="text-xs text-stone-600">
                Are you sure you want to permanently delete the shift record for{' '}
                <strong className="text-stone-900">
                  {record.date} (Group {record.shiftGroup} · {record.shiftPeriod})
                </strong>
                ? This will remove all associated meter readings and cash reconciliation data.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="py-2.5 px-3 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  onDelete(record.id);
                }}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Slip Modal */}
      {showPrintModal && (
        <PrintSlipModal record={record} onClose={() => setShowPrintModal(false)} />
      )}
    </div>
  );
};
