import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Fuel,
  CreditCard,
  Receipt,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Clock,
  Save,
  ShieldAlert,
  Calendar,
  Layers,
  Lock,
  Unlock,
  RotateCcw,
  Check,
  ChevronRight,
  FileText,
  Info,
  Banknote,
  Coins,
  Printer,
  Smartphone,
  Tag,
  Building,
  ShieldCheck,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import {
  AttendantAccountabilityRecord,
  AttendantMeterReading,
  AttendantDeduction,
  AttendantDailyLog,
  AttendantEvalueEntry,
  AttendantVoucherClaim,
  AttendantCreditSale,
  AttendantCreditCollection,
  CashDenominationBreakdown,
  SupervisorAccountClosureChecklist,
  DENOMINATIONS,
  COIN_DENOMINATIONS,
} from '../types';
import { computeAttendantSummary } from '../utils/accountabilityCalculations';
import { useUndoRedo } from '../utils/useUndoRedo';
import { UndoRedoControls } from './UndoRedoControls';
import { addAccountClosureAuditLog } from '../services/storage';
import { AccountClosurePrintSlip } from './Attendant/AccountClosurePrintSlip';

interface AttendantAccountabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendantAccountabilityRecord;
  onSave: (updated: AttendantAccountabilityRecord) => void;
  onDelete?: (id: string) => void;
  fuelPrices?: { super: number; ron95?: number; diesel: number };
  supervisorName?: string;
}

export const AttendantAccountabilityModal: React.FC<AttendantAccountabilityModalProps> = ({
  isOpen,
  onClose,
  record,
  onSave,
  onDelete,
  fuelPrices = { super: 13.27, ron95: 14.2, diesel: 16.1 },
  supervisorName = 'Supervisor',
}) => {
  const {
    state: form,
    set: setForm,
    undo,
    redo,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
  } = useUndoRedo<AttendantAccountabilityRecord>(structuredClone(record), {
    debounceMs: 300,
    enableShortcuts: isOpen,
  });

  const [activeSection, setActiveSection] = useState<
    | 'summary'
    | 'meters'
    | 'evalues'
    | 'vouchers'
    | 'other'
    | 'denominations'
    | 'closeAudit'
    | 'multiday'
  >('summary');

  // Print Slip Modal State
  const [showPrintSlip, setShowPrintSlip] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  // State for adding a new day log in multi-day tab
  const [isAddingDayLog, setIsAddingDayLog] = useState(false);
  const [newDayDate, setNewDayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newDayPeriod, setNewDayPeriod] = useState('Day');
  const [newDayNotes, setNewDayNotes] = useState('');

  if (!isOpen) return null;

  const summary = computeAttendantSummary(form);
  const isAccountOpen = (form.accountState || 'open') === 'open';

  // Ensure cash denominations object exists
  const denoms = form.cashDenominations?.notes || {
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    5: 0,
    2: 0,
    1: 0,
  };
  const coins = form.cashDenominations?.coins || {
    2.00: 0,
    1.00: 0,
    0.50: 0,
    0.20: 0,
    0.10: 0,
  };

  // Supervisor Checklist State
  const checklist: SupervisorAccountClosureChecklist = form.supervisorChecklist || {
    litresAndMetersVerified: false,
    evaluesConfirmed: false,
    vouchersAndClaimsCollected: false,
    otherTransactionsAudited: false,
    cashDenominationsCounted: false,
    attendantAcknowledged: false,
  };

  const isChecklistComplete =
    checklist.litresAndMetersVerified &&
    checklist.evaluesConfirmed &&
    checklist.vouchersAndClaimsCollected &&
    checklist.otherTransactionsAudited &&
    checklist.cashDenominationsCounted;

  /* ========================================================================= */
  /* 1. METER HANDLERS                                                         */
  /* ========================================================================= */
  const addMeter = () => {
    const newMeter: AttendantMeterReading = {
      id: 'mr_' + Date.now().toString(36),
      pumpName: 'Super 1',
      fuelType: 'super',
      timeSlot: '06:00 – 14:00',
      openingMeter: 0,
      closingMeter: 0,
      rtt: 0,
      unitPrice: fuelPrices.super,
    };
    setForm((prev) => ({
      ...prev,
      meterReadings: [...(prev.meterReadings || []), newMeter],
    }));
  };

  const updateMeter = (index: number, field: keyof AttendantMeterReading, val: any) => {
    setForm((prev) => {
      const next = structuredClone(prev);
      next.meterReadings[index] = {
        ...next.meterReadings[index],
        [field]: val,
      };

      // Auto set fuelType and unitPrice when pumpName changes
      if (field === 'pumpName') {
        const pumpStr = String(val).toLowerCase();
        if (pumpStr.includes('ron') || pumpStr.includes('v-power') || pumpStr.includes('95')) {
          next.meterReadings[index].fuelType = 'ron95';
          if (
            !next.meterReadings[index].unitPrice ||
            next.meterReadings[index].unitPrice === fuelPrices.super ||
            next.meterReadings[index].unitPrice === fuelPrices.diesel
          ) {
            next.meterReadings[index].unitPrice = fuelPrices.ron95 || 14.2;
          }
        } else if (pumpStr.includes('diesel') || pumpStr.includes('ago')) {
          next.meterReadings[index].fuelType = 'diesel';
          if (
            !next.meterReadings[index].unitPrice ||
            next.meterReadings[index].unitPrice === fuelPrices.super ||
            next.meterReadings[index].unitPrice === (fuelPrices.ron95 || 14.2)
          ) {
            next.meterReadings[index].unitPrice = fuelPrices.diesel;
          }
        } else {
          next.meterReadings[index].fuelType = 'super';
          if (
            !next.meterReadings[index].unitPrice ||
            next.meterReadings[index].unitPrice === fuelPrices.diesel ||
            next.meterReadings[index].unitPrice === (fuelPrices.ron95 || 14.2)
          ) {
            next.meterReadings[index].unitPrice = fuelPrices.super;
          }
        }
      }

      return next;
    });
  };

  const removeMeter = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      meterReadings: (prev.meterReadings || []).filter((_, i) => i !== idx),
    }));
  };

  /* ========================================================================= */
  /* 2. E-VALUES HANDLERS                                                      */
  /* ========================================================================= */
  const addEvalue = () => {
    const newEv: AttendantEvalueEntry = {
      id: 'ev_' + Date.now().toString(36),
      channel: 'MoMo',
      provider: 'MTN',
      reference: '',
      customerInfo: '',
      amount: 0,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      verified: true,
    };
    setForm((prev) => ({
      ...prev,
      evalues: [...(prev.evalues || []), newEv],
    }));
  };

  const updateEvalue = (index: number, field: keyof AttendantEvalueEntry, val: any) => {
    setForm((prev) => {
      const next = structuredClone(prev);
      if (!next.evalues) next.evalues = [];
      next.evalues[index] = {
        ...next.evalues[index],
        [field]: val,
      };
      return next;
    });
  };

  const removeEvalue = (index: number) => {
    setForm((prev) => ({
      ...prev,
      evalues: (prev.evalues || []).filter((_, i) => i !== index),
    }));
  };

  /* ========================================================================= */
  /* 3. CLAIM CODES & VOUCHERS HANDLERS                                        */
  /* ========================================================================= */
  const addVoucher = () => {
    const newVc: AttendantVoucherClaim = {
      id: 'vc_' + Date.now().toString(36),
      type: 'claim_code',
      claimCode: '',
      voucherNumber: '',
      companyName: '',
      vehicleReg: '',
      product: 'super',
      litres: 0,
      amount: 0,
      verified: true,
    };
    setForm((prev) => ({
      ...prev,
      voucherClaims: [...(prev.voucherClaims || []), newVc],
    }));
  };

  const updateVoucher = (index: number, field: keyof AttendantVoucherClaim, val: any) => {
    setForm((prev) => {
      const next = structuredClone(prev);
      if (!next.voucherClaims) next.voucherClaims = [];
      next.voucherClaims[index] = {
        ...next.voucherClaims[index],
        [field]: val,
      };
      return next;
    });
  };

  const removeVoucher = (index: number) => {
    setForm((prev) => ({
      ...prev,
      voucherClaims: (prev.voucherClaims || []).filter((_, i) => i !== index),
    }));
  };

  /* ========================================================================= */
  /* 4. OTHER TRANSACTIONS: CREDIT SALES, EXPENSES & COLLECTIONS               */
  /* ========================================================================= */
  const addCreditSale = () => {
    const newCs: AttendantCreditSale = {
      id: 'cs_' + Date.now().toString(36),
      customer: '',
      invoiceRef: '',
      vehicleReg: '',
      amount: 0,
      product: 'Super',
      approvedBy: supervisorName,
    };
    setForm((prev) => ({
      ...prev,
      creditSales: [...(prev.creditSales || []), newCs],
    }));
  };

  const updateCreditSale = (index: number, field: keyof AttendantCreditSale, val: any) => {
    setForm((prev) => {
      const next = structuredClone(prev);
      if (!next.creditSales) next.creditSales = [];
      next.creditSales[index] = {
        ...next.creditSales[index],
        [field]: val,
      };
      return next;
    });
  };

  const removeCreditSale = (index: number) => {
    setForm((prev) => ({
      ...prev,
      creditSales: (prev.creditSales || []).filter((_, i) => i !== index),
    }));
  };

  const addExpense = () => {
    const newExp: AttendantDeduction = {
      id: 'ded_' + Date.now().toString(36),
      category: 'Operational Expense',
      amount: 0,
      reason: '',
      voucherRef: '',
      approved: true,
    };
    setForm((prev) => ({
      ...prev,
      expenses: [...(prev.expenses || []), newExp],
    }));
  };

  const updateExpense = (idx: number, field: keyof AttendantDeduction, val: any) => {
    setForm((prev) => {
      const next = structuredClone(prev);
      if (!next.expenses) next.expenses = [];
      next.expenses[idx] = {
        ...next.expenses[idx],
        [field]: val,
      };
      return next;
    });
  };

  const removeExpense = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      expenses: (prev.expenses || []).filter((_, i) => i !== idx),
    }));
  };

  const addCreditCollection = () => {
    const newCc: AttendantCreditCollection = {
      id: 'cc_' + Date.now().toString(36),
      customer: '',
      receiptRef: '',
      amount: 0,
      notes: '',
    };
    setForm((prev) => ({
      ...prev,
      creditCollections: [...(prev.creditCollections || []), newCc],
    }));
  };

  const updateCreditCollection = (
    index: number,
    field: keyof AttendantCreditCollection,
    val: any
  ) => {
    setForm((prev) => {
      const next = structuredClone(prev);
      if (!next.creditCollections) next.creditCollections = [];
      next.creditCollections[index] = {
        ...next.creditCollections[index],
        [field]: val,
      };
      return next;
    });
  };

  const removeCreditCollection = (index: number) => {
    setForm((prev) => ({
      ...prev,
      creditCollections: (prev.creditCollections || []).filter((_, i) => i !== index),
    }));
  };

  /* ========================================================================= */
  /* 5. MONEY DENOMINATIONS HANDLERS                                           */
  /* ========================================================================= */
  const handleDenomChange = (denom: number, count: number) => {
    const safeCount = Math.max(0, count);
    setForm((prev) => {
      const existingNotes = prev.cashDenominations?.notes || ({} as any);
      const existingCoins = prev.cashDenominations?.coins || ({} as any);

      const updatedNotes = {
        ...existingNotes,
        [denom]: safeCount,
      };

      // Calculate total cash
      let notesTotal = 0;
      DENOMINATIONS.forEach((d) => {
        notesTotal += d * (Number(updatedNotes[d]) || 0);
      });
      let coinsTotal = 0;
      COIN_DENOMINATIONS.forEach((c) => {
        coinsTotal += c * (Number(existingCoins[c]) || 0);
      });

      const totalCash = notesTotal + coinsTotal;

      return {
        ...prev,
        actualCashCounted: totalCash,
        cashDenominations: {
          notes: updatedNotes,
          coins: existingCoins,
          totalCash,
          notesTotal,
          coinsTotal,
        },
      };
    });
  };

  const handleCoinChange = (coin: number, count: number) => {
    const safeCount = Math.max(0, count);
    setForm((prev) => {
      const existingNotes = prev.cashDenominations?.notes || ({} as any);
      const existingCoins = prev.cashDenominations?.coins || ({} as any);

      const updatedCoins = {
        ...existingCoins,
        [coin]: safeCount,
      };

      let notesTotal = 0;
      DENOMINATIONS.forEach((d) => {
        notesTotal += d * (Number(existingNotes[d]) || 0);
      });
      let coinsTotal = 0;
      COIN_DENOMINATIONS.forEach((c) => {
        coinsTotal += c * (Number(updatedCoins[c]) || 0);
      });

      const totalCash = notesTotal + coinsTotal;

      return {
        ...prev,
        actualCashCounted: totalCash,
        cashDenominations: {
          notes: existingNotes,
          coins: updatedCoins,
          totalCash,
          notesTotal,
          coinsTotal,
        },
      };
    });
  };

  const handleResetDenominations = () => {
    const cleanNotes: any = {};
    DENOMINATIONS.forEach((d) => (cleanNotes[d] = 0));
    const cleanCoins: any = {};
    COIN_DENOMINATIONS.forEach((c) => (cleanCoins[c] = 0));

    setForm((prev) => ({
      ...prev,
      actualCashCounted: 0,
      cashDenominations: {
        notes: cleanNotes,
        coins: cleanCoins,
        totalCash: 0,
        notesTotal: 0,
        coinsTotal: 0,
      },
    }));
  };

  // Helper to auto-populate denominations from expected cash
  const handleAutoFillFromExpected = () => {
    let remaining = Math.max(0, Math.floor(summary.expectedCash));
    const newNotes: any = {};
    [200, 100, 50, 20, 10, 5, 2, 1].forEach((d) => {
      const count = Math.floor(remaining / d);
      newNotes[d] = count;
      remaining -= count * d;
    });

    const newCoins: any = {};
    COIN_DENOMINATIONS.forEach((c) => (newCoins[c] = 0));

    let notesTotal = 0;
    DENOMINATIONS.forEach((d) => (notesTotal += d * (newNotes[d] || 0)));

    setForm((prev) => ({
      ...prev,
      actualCashCounted: notesTotal,
      cashDenominations: {
        notes: newNotes,
        coins: newCoins,
        totalCash: notesTotal,
        notesTotal,
        coinsTotal: 0,
      },
    }));
  };

  /* ========================================================================= */
  /* 6. SUPERVISOR CHECKLIST & CLOSURE HANDLERS                                */
  /* ========================================================================= */
  const toggleChecklistItem = (key: keyof SupervisorAccountClosureChecklist) => {
    setForm((prev) => {
      const current = prev.supervisorChecklist || {
        litresAndMetersVerified: false,
        evaluesConfirmed: false,
        vouchersAndClaimsCollected: false,
        otherTransactionsAudited: false,
        cashDenominationsCounted: false,
        attendantAcknowledged: false,
      };
      return {
        ...prev,
        supervisorChecklist: {
          ...current,
          [key]: !current[key],
        },
      };
    });
  };

  const handleMarkAllChecklist = () => {
    setForm((prev) => ({
      ...prev,
      supervisorChecklist: {
        litresAndMetersVerified: true,
        evaluesConfirmed: true,
        vouchersAndClaimsCollected: true,
        otherTransactionsAudited: true,
        cashDenominationsCounted: true,
        attendantAcknowledged: true,
      },
    }));
  };

  // Multi-day log helpers
  const handleAddNewDayLog = () => {
    if (!newDayDate) return;
    const dateObj = new Date(newDayDate);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = !isNaN(dateObj.getDay()) ? dayNames[dateObj.getDay()] : 'Shift Day';

    const newLog: AttendantDailyLog = {
      id: 'dl_' + Date.now().toString(36),
      date: newDayDate,
      dayName,
      shiftPeriod: newDayPeriod,
      meterReadings: [],
      payments: { cash: 0, visa: 0, momo: 0, bank: 0, credit: 0, other: 0 },
      expenses: [],
      interimCashCounted: 0,
      notes: newDayNotes || `Shift on ${dayName} carried over into open account.`,
    };

    setForm((prev) => {
      const updatedDayLogs = [...(prev.dayLogs || []), newLog];
      return {
        ...prev,
        isMultiDay: true,
        daysOpen: updatedDayLogs.length + 1,
        dayLogs: updatedDayLogs,
      };
    });

    setIsAddingDayLog(false);
    setNewDayNotes('');
  };

  const removeDayLog = (logId: string) => {
    setForm((prev) => {
      const updatedDayLogs = (prev.dayLogs || []).filter((l) => l.id !== logId);
      return {
        ...prev,
        dayLogs: updatedDayLogs,
        daysOpen: updatedDayLogs.length + 1,
        isMultiDay: updatedDayLogs.length > 0,
      };
    });
  };

  // 1. SAVE & KEEP ACCOUNT OPEN
  const handleSaveAndKeepOpen = () => {
    const finalRecord: AttendantAccountabilityRecord = {
      ...form,
      accountState: 'open',
      reviewedBySupervisor: true,
      status: summary.status,
      updatedAt: new Date().toISOString(),
    };
    onSave(finalRecord);
    onClose();
  };

  // 2. COMPLETE & CLOSE ACCOUNT (Explicit supervisor accounting completion)
  const handleCompleteAndCloseAccount = () => {
    const today = new Date().toISOString().slice(0, 10);
    const notes =
      form.supervisorNotes ||
      `Account verified across litres (${summary.totalLitres.toFixed(
        2
      )}L), E-values (GH₵${summary.totalEvalues.toFixed(
        2
      )}), vouchers (GH₵${summary.totalVouchers.toFixed(
        2
      )}), and cash denominations (GH₵${summary.actualCash.toFixed(2)}).`;

    const finalRecord: AttendantAccountabilityRecord = {
      ...form,
      accountState: 'closed',
      endDate: form.endDate || today,
      closedAt: new Date().toISOString(),
      closedBySupervisor: supervisorName,
      closedNotes: notes,
      reviewedBySupervisor: true,
      status: summary.status,
      updatedAt: new Date().toISOString(),
    };

    // Log to immutable Audit History
    addAccountClosureAuditLog({
      accountId: form.id,
      attendantName: form.attendantName,
      staffId: form.staffId || 'SO-ATT',
      stationName: form.station || 'Station Forecourt',
      stationCode: 'SO-TMA-001',
      startDate: form.startDate || form.date || today,
      endDate: form.endDate || today,
      daysOpen: summary.daysOpenCount || 1,
      totalSales: summary.totalSales,
      expectedCash: summary.expectedCash,
      actualCash: summary.actualCash,
      variance: summary.difference,
      status: summary.status,
      closedBySupervisor: supervisorName,
      notes: notes,
    });

    onSave(finalRecord);
    onClose();
  };

  // 3. RE-OPEN ACCOUNT
  const handleReopenAccount = () => {
    const finalRecord: AttendantAccountabilityRecord = {
      ...form,
      accountState: 'open',
      endDate: undefined,
      closedAt: undefined,
      closedBySupervisor: undefined,
      updatedAt: new Date().toISOString(),
    };
    setForm(finalRecord);
    onSave(finalRecord);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 overflow-y-auto">
        <div className="bg-[#1d2023] border border-[#333739] text-[#ece8e0] rounded-xl w-full max-w-5xl my-6 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
          {/* Modal Top Header */}
          <div className="p-4 bg-[#15171a] border-b border-[#333739] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#23262a] border border-[#333739] flex items-center justify-center text-[#e8b93b]">
                <User className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base tracking-wide uppercase font-['Space_Grotesk'] text-[#ece8e0]">
                    {form.attendantName}
                  </h3>
                  <span className="text-[11px] font-mono font-semibold bg-[#23262a] border border-[#333739] text-[#8d9195] px-2 py-0.5 rounded">
                    {form.staffId || 'ID #'}
                  </span>

                  {/* Account Open/Closed Status Badge */}
                  {isAccountOpen ? (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-950/60 text-amber-300 border border-amber-600/60 flex items-center gap-1">
                      <Unlock className="w-3 h-3" />
                      <span>
                        Account Open ({summary.daysOpenCount}{' '}
                        {summary.daysOpenCount === 1 ? 'Day' : 'Days'})
                      </span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-emerald-950/70 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      <span>Account Closed</span>
                    </span>
                  )}

                  {/* Reconciliation Status Badge */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      summary.status === 'accounted'
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                        : summary.status === 'shortage'
                        ? 'bg-rose-950/60 text-rose-400 border border-rose-800'
                        : summary.status === 'excess'
                        ? 'bg-blue-950/60 text-blue-400 border border-blue-800'
                        : 'bg-[#23262a] text-[#8d9195] border border-[#333739]'
                    }`}
                  >
                    {summary.status === 'accounted'
                      ? '✓ Accounted'
                      : summary.status === 'shortage'
                      ? `⚠️ Shortage (GH₵ ${Math.abs(summary.difference).toFixed(2)})`
                      : summary.status === 'excess'
                      ? `🔵 Surplus (+GH₵ ${summary.difference.toFixed(2)})`
                      : 'Pending Count'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#8d9195] mt-1 flex-wrap">
                  <span>{form.shiftType}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-[#e8b93b]" />
                    <span>
                      Started: <b className="text-[#ece8e0]">{form.startDate || form.date}</b>
                      {form.endDate && ` → Closed: ${form.endDate}`}
                    </span>
                  </span>
                  <span>•</span>
                  <span>{form.station}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Delete this attendant account record"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">Delete Account</span>
                </button>
              )}

              <button
                onClick={() => setShowPrintSlip(true)}
                className="px-2.5 py-1.5 rounded-lg bg-[#23262a] hover:bg-[#2e3237] border border-[#333739] text-[#ece8e0] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Print Shift Closure Slip"
              >
                <Printer className="w-3.5 h-3.5 text-[#e8b93b]" />
                <span className="hidden sm:inline">Print Slip</span>
              </button>

              <UndoRedoControls
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
                undoCount={undoCount}
                redoCount={redoCount}
                variant="dark"
                size="sm"
                showLabels={false}
              />
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#8d9195] hover:text-[#ece8e0] hover:bg-[#23262a] transition-colors cursor-pointer"
                title="Close modal (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs (8 Pillars) */}
          <div className="flex border-b border-[#333739] bg-[#15171a]/90 px-3 gap-1 overflow-x-auto">
            {[
              { id: 'summary', label: '1. Summary & Equations', icon: Wallet },
              {
                id: 'meters',
                label: `2. Litres & Sales (${summary.totalLitres.toFixed(1)}L)`,
                icon: Fuel,
              },
              {
                id: 'evalues',
                label: `3. E-Values (GH₵ ${summary.totalEvalues.toFixed(2)})`,
                icon: Smartphone,
              },
              {
                id: 'vouchers',
                label: `4. Claim Codes & Vouchers (GH₵ ${summary.totalVouchers.toFixed(2)})`,
                icon: Receipt,
              },
              {
                id: 'other',
                label: '5. Other Transactions',
                icon: Layers,
              },
              {
                id: 'denominations',
                label: `6. Money Denominations (GH₵ ${summary.actualCash.toFixed(2)})`,
                icon: Banknote,
              },
              {
                id: 'closeAudit',
                label: '7. Supervisor Sign-Off & Close',
                icon: ShieldCheck,
              },
              {
                id: 'multiday',
                label: `8. Multi-Day Logs (${summary.daysOpenCount}d)`,
                icon: Calendar,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id as any)}
                  className={`py-3 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    active
                      ? 'border-[#e8b93b] text-[#e8b93b] bg-[#23262a]'
                      : 'border-transparent text-[#8d9195] hover:text-[#ece8e0]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Modal Body */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
            {/* ========================================================================= */}
            {/* TAB 1: SUMMARY & GRAND RECONCILIATION                                     */}
            {/* ========================================================================= */}
            {activeSection === 'summary' && (
              <div className="space-y-4">
                {/* 5-Metric Executive Overview Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="p-3 rounded-lg bg-[#23262a] border border-[#333739]">
                    <span className="text-[10px] text-[#8d9195] font-semibold uppercase block">
                      1. Fuel Litres
                    </span>
                    <span className="text-base font-bold font-mono text-[#ece8e0]">
                      {summary.totalLitres.toLocaleString('en-US', { minimumFractionDigits: 2 })} L
                    </span>
                    <span className="text-[10px] text-[#8d9195] block mt-0.5">
                      Dispenser meters
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#23262a] border border-[#333739]">
                    <span className="text-[10px] text-[#8d9195] font-semibold uppercase block">
                      2. Gross Fuel Sales
                    </span>
                    <span className="text-base font-bold font-mono text-[#e8b93b]">
                      GH₵ {summary.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-[#8d9195] block mt-0.5">
                      Net litres × price
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#23262a] border border-[#333739]">
                    <span className="text-[10px] text-[#8d9195] font-semibold uppercase block">
                      3. E-Values & Digital
                    </span>
                    <span className="text-base font-bold font-mono text-cyan-400">
                      GH₵ {summary.totalEvalues.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-[#8d9195] block mt-0.5">
                      MoMo, POS, Bank QR
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#23262a] border border-[#333739]">
                    <span className="text-[10px] text-[#8d9195] font-semibold uppercase block">
                      4. Claim Codes & Vouchers
                    </span>
                    <span className="text-base font-bold font-mono text-purple-400">
                      GH₵ {summary.totalVouchers.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-[#8d9195] block mt-0.5">
                      Fleet vouchers & codes
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#15171a] border border-[#e8b93b]/40 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-[#e8b93b] font-bold uppercase block">
                      5. Expected Cash Handover
                    </span>
                    <span className="text-base font-bold font-mono text-[#e8b93b]">
                      GH₵ {summary.expectedCash.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-[#8d9195] block mt-0.5">
                      Sales − Deductions
                    </span>
                  </div>
                </div>

                {/* The Supervisor Accountability Equation Box */}
                <div className="p-4 rounded-xl bg-[#15171a] border border-[#333739] space-y-3">
                  <div className="flex items-center justify-between border-b border-[#2a2d30] pb-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-[#ece8e0] flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-[#e8b93b]" />
                        <span>Reconciliation Equation Breakdown</span>
                      </h4>
                      <p className="text-[11px] text-[#8d9195]">
                        How the supervisor derives Expected Cash to be reconciled against physical money denominations
                      </p>
                    </div>

                    <span className="font-mono text-xs text-[#8d9195]">
                      Expected Cash = Sales − E-Values − Vouchers − Credit − Expenses + Collections
                    </span>
                  </div>

                  {/* Flow Diagram / Step Calculation */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-lg bg-[#23262a] border border-[#333739]">
                      <span className="text-[10px] text-[#8d9195] block uppercase">Gross Sales (+)</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">
                        GH₵ {summary.totalSales.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#23262a] border border-[#333739]">
                      <span className="text-[10px] text-cyan-400 block uppercase">E-Values (−)</span>
                      <span className="font-mono font-bold text-cyan-300 text-sm">
                        − GH₵ {summary.totalEvalues.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#23262a] border border-[#333739]">
                      <span className="text-[10px] text-purple-400 block uppercase">Vouchers/Claims (−)</span>
                      <span className="font-mono font-bold text-purple-300 text-sm">
                        − GH₵ {summary.totalVouchers.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#23262a] border border-[#333739]">
                      <span className="text-[10px] text-rose-400 block uppercase">Credit Sales (−)</span>
                      <span className="font-mono font-bold text-rose-300 text-sm">
                        − GH₵ {summary.totalCreditSales.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#23262a] border border-[#333739]">
                      <span className="text-[10px] text-[#8d9195] block uppercase">Deductions (−)</span>
                      <span className="font-mono font-bold text-[#8d9195] text-sm">
                        − GH₵ {summary.approvedDeductions.toFixed(2)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#15171a] border border-[#e8b93b]/50">
                      <span className="text-[10px] text-[#e8b93b] font-bold block uppercase">
                        Expected Cash (=)
                      </span>
                      <span className="font-mono font-bold text-[#e8b93b] text-sm">
                        GH₵ {summary.expectedCash.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Variance and Denominations Count Summary Banner */}
                <div className="p-4 rounded-xl bg-[#23262a] border border-[#333739] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          summary.status === 'accounted'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : summary.status === 'shortage'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-blue-950 text-blue-400 border border-blue-800'
                        }`}
                      >
                        {summary.status === 'accounted' ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : (
                          <AlertTriangle className="w-6 h-6" />
                        )}
                      </div>

                      <div>
                        <span className="text-xs font-bold text-[#ece8e0] block">
                          Cash Variance (Counted Denominations vs. Expected Cash)
                        </span>
                        <span className="text-[11px] text-[#8d9195]">
                          Counted: <b>GH₵ {summary.actualCash.toFixed(2)}</b> • Expected:{' '}
                          <b>GH₵ {summary.expectedCash.toFixed(2)}</b>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xl font-bold font-mono ${
                          summary.status === 'accounted'
                            ? 'text-emerald-400'
                            : summary.status === 'shortage'
                            ? 'text-rose-400'
                            : 'text-blue-400'
                        }`}
                      >
                        {summary.difference >= 0 ? '+' : ''}GH₵ {summary.difference.toFixed(2)}
                      </span>
                      <span className="text-[10px] block uppercase font-bold text-[#8d9195]">
                        {summary.status === 'accounted'
                          ? '✓ Fully Balanced & Accounted'
                          : summary.status === 'shortage'
                          ? '⚠️ Attendant Cash Shortage'
                          : '🔵 Physical Cash Surplus'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#333739]">
                    <span className="text-[11px] text-[#8d9195]">
                      Need to input or verify the Ghana Cedi banknote and coin pieces?
                    </span>
                    <button
                      onClick={() => setActiveSection('denominations')}
                      className="px-3 py-1 rounded bg-[#15171a] border border-[#333739] hover:border-[#e8b93b] text-[#e8b93b] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Open Denomination Counter</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: ATTENDANT LITRES & SALES (METERS)                                   */}
            {/* ========================================================================= */}
            {activeSection === 'meters' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs uppercase text-[#ece8e0] flex items-center gap-1.5">
                      <Fuel className="w-4 h-4 text-[#e8b93b]" />
                      <span>Attendant Pump Meters, Litres & Sales</span>
                    </h4>
                    <p className="text-[11px] text-[#8d9195]">
                      Opening meter, closing meter, RTT (test litres), net dispensed litres, and total sales
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addMeter}
                    className="px-2.5 py-1.5 rounded-lg bg-[#23262a] border border-[#333739] hover:border-[#e8b93b] text-[#ece8e0] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#e8b93b]" />
                    <span>Add Pump Meter</span>
                  </button>
                </div>

                {/* Fuel Product Breakdown Cards */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-lg bg-[#15171a] border border-[#333739]">
                    <span className="text-[10px] text-[#8d9195] uppercase block font-semibold">Super (PMS)</span>
                    <span className="font-mono font-bold text-amber-400">
                      {summary.fuelBreakdown.superLitres.toFixed(2)} L
                    </span>
                    <span className="text-[10px] text-[#8d9195] block">
                      GH₵ {summary.fuelBreakdown.superSales.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#15171a] border border-[#333739]">
                    <span className="text-[10px] text-[#8d9195] uppercase block font-semibold">Diesel (AGO)</span>
                    <span className="font-mono font-bold text-cyan-400">
                      {summary.fuelBreakdown.dieselLitres.toFixed(2)} L
                    </span>
                    <span className="text-[10px] text-[#8d9195] block">
                      GH₵ {summary.fuelBreakdown.dieselSales.toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#15171a] border border-[#333739]">
                    <span className="text-[10px] text-[#8d9195] uppercase block font-semibold">RON 95 (V-Power)</span>
                    <span className="font-mono font-bold text-purple-400">
                      {summary.fuelBreakdown.ron95Litres.toFixed(2)} L
                    </span>
                    <span className="text-[10px] text-[#8d9195] block">
                      GH₵ {summary.fuelBreakdown.ron95Sales.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Meter Rows */}
                <div className="space-y-2.5">
                  {(form.meterReadings || []).map((m, idx) => {
                    const netLitres = Math.max(
                      0,
                      (Number(m.closingMeter) || 0) -
                        (Number(m.openingMeter) || 0) -
                        (Number(m.rtt) || 0)
                    );
                    const sales = netLitres * (Number(m.unitPrice) || 0);

                    return (
                      <div
                        key={m.id || idx}
                        className="p-3 rounded-lg bg-[#15171a] border border-[#333739] space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <select
                              value={m.pumpName}
                              onChange={(e) => updateMeter(idx, 'pumpName', e.target.value)}
                              className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded font-bold text-xs text-[#ece8e0]"
                            >
                              <option value="Super 1">Super 1</option>
                              <option value="Super 2">Super 2</option>
                              <option value="Super 3">Super 3</option>
                              <option value="Super 4">Super 4</option>
                              <option value="Diesel 1">Diesel 1</option>
                              <option value="Diesel 2">Diesel 2</option>
                              <option value="Diesel 3">Diesel 3</option>
                              <option value="RON 95 1">RON 95 1</option>
                              <option value="RON 95 2">RON 95 2</option>
                            </select>
                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#23262a] text-[#8d9195]">
                              {m.fuelType?.toUpperCase() || 'SUPER'}
                            </span>
                            <input
                              type="text"
                              placeholder="Time slot (e.g. 06:00 – 14:00)"
                              value={m.timeSlot || ''}
                              onChange={(e) => updateMeter(idx, 'timeSlot', e.target.value)}
                              className="px-2 py-0.5 bg-[#23262a] border border-[#333739] rounded text-[11px] text-[#8d9195] w-36"
                            />
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-[#e8b93b]">
                              {netLitres.toFixed(2)} L = GH₵ {sales.toFixed(2)}
                            </span>
                            {(form.meterReadings || []).length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeMeter(idx)}
                                className="text-[#8d9195] hover:text-rose-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-[10px] text-[#8d9195] block mb-1">
                              Opening Meter
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={m.openingMeter || ''}
                              onChange={(e) =>
                                updateMeter(idx, 'openingMeter', parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-2 py-1 bg-[#23262a] border border-[#333739] rounded font-mono text-right text-xs text-[#ece8e0]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#8d9195] block mb-1">
                              Closing Meter
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={m.closingMeter || ''}
                              onChange={(e) =>
                                updateMeter(idx, 'closingMeter', parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-2 py-1 bg-[#23262a] border border-[#333739] rounded font-mono text-right text-xs text-[#ece8e0]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#8d9195] block mb-1">
                              RTT Test (Litres)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={m.rtt || ''}
                              onChange={(e) =>
                                updateMeter(idx, 'rtt', parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-2 py-1 bg-[#23262a] border border-[#333739] rounded font-mono text-right text-xs text-[#ece8e0]"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-[#8d9195] block mb-1">
                              Price / Litre (GH₵)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={m.unitPrice || ''}
                              onChange={(e) =>
                                updateMeter(idx, 'unitPrice', parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-2 py-1 bg-[#23262a] border border-[#333739] rounded font-mono text-right text-xs text-[#ece8e0]"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: E-VALUES (ELECTRONIC PAYMENTS)                                     */}
            {/* ========================================================================= */}
            {activeSection === 'evalues' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs uppercase text-[#ece8e0] flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-cyan-400" />
                      <span>E-Values (Mobile Money, POS Card, Bank QR, Tingg)</span>
                    </h4>
                    <p className="text-[11px] text-[#8d9195]">
                      Itemized electronic collections handed over by attendant with transaction IDs & references
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addEvalue}
                    className="px-2.5 py-1.5 rounded-lg bg-[#23262a] border border-[#333739] hover:border-cyan-400 text-[#ece8e0] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Add E-Value Transaction</span>
                  </button>
                </div>

                {/* Total E-Values Badge */}
                <div className="p-3 bg-[#15171a] rounded-lg border border-cyan-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-xs text-[#ece8e0]">
                      Cumulative E-Values Total:
                    </span>
                  </div>
                  <span className="font-mono font-bold text-base text-cyan-400">
                    GH₵ {summary.totalEvalues.toFixed(2)}
                  </span>
                </div>

                {/* E-Value Items */}
                {(form.evalues || []).length === 0 ? (
                  <div className="p-6 rounded-lg bg-[#15171a] border border-dashed border-[#333739] text-center space-y-2">
                    <Smartphone className="w-8 h-8 text-[#8d9195] mx-auto opacity-50" />
                    <p className="text-[#8d9195] text-xs">
                      No itemized E-Values logged yet. Click "Add E-Value Transaction" or use general payment fields.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {form.evalues?.map((ev, idx) => (
                      <div
                        key={ev.id || idx}
                        className="p-3 rounded-lg bg-[#15171a] border border-[#333739] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <select
                              value={ev.channel}
                              onChange={(e) => updateEvalue(idx, 'channel', e.target.value)}
                              className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded font-bold text-xs text-[#ece8e0]"
                            >
                              <option value="MoMo">Mobile Money (MoMo)</option>
                              <option value="POS Card">POS / Card (VISA/Master)</option>
                              <option value="Bank Transfer">Bank Transfer / GhQR</option>
                              <option value="QR Pay">QR Pay</option>
                              <option value="Tingg">Tingg / Digital Wallet</option>
                              <option value="Hubtel">Hubtel POS</option>
                              <option value="StarCard">StarCard Fleet E-Value</option>
                              <option value="Other">Other Electronic</option>
                            </select>

                            <input
                              type="text"
                              placeholder="Provider (e.g. MTN, Telecel, Stanbic)"
                              value={ev.provider || ''}
                              onChange={(e) => updateEvalue(idx, 'provider', e.target.value)}
                              className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs text-[#ece8e0] w-36"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-[#8d9195]">GH₵</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={ev.amount || ''}
                              onChange={(e) =>
                                updateEvalue(idx, 'amount', parseFloat(e.target.value) || 0)
                              }
                              className="w-28 px-2 py-1 bg-[#23262a] border border-[#333739] rounded font-mono text-right text-xs text-[#ece8e0] font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => removeEvalue(idx)}
                              className="text-[#8d9195] hover:text-rose-400 cursor-pointer p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            placeholder="Transaction ID / Approval Ref # (e.g. MTN-98214)"
                            value={ev.reference || ''}
                            onChange={(e) => updateEvalue(idx, 'reference', e.target.value)}
                            className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs font-mono text-[#ece8e0]"
                          />
                          <input
                            type="text"
                            placeholder="Customer Info / Phone / Vehicle (e.g. 0244123456)"
                            value={ev.customerInfo || ''}
                            onChange={(e) => updateEvalue(idx, 'customerInfo', e.target.value)}
                            className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs text-[#ece8e0]"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#23262a] text-[11px]">
                          <label className="flex items-center gap-1.5 text-[#8d9195] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={ev.verified !== false}
                              onChange={(e) => updateEvalue(idx, 'verified', e.target.checked)}
                              className="accent-cyan-400"
                            />
                            <span>SMS / POS Merchant Confirmation Verified</span>
                          </label>

                          <span className="text-[#8d9195] font-mono">{ev.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: CLAIM CODES & VOUCHERS                                             */}
            {/* ========================================================================= */}
            {activeSection === 'vouchers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs uppercase text-[#ece8e0] flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-purple-400" />
                      <span>Fleet Claim Codes & Corporate Vouchers</span>
                    </h4>
                    <p className="text-[11px] text-[#8d9195]">
                      Record B2B fleet coupons, StarCard claim codes, and company vouchers deducted from attendant cash
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addVoucher}
                    className="px-2.5 py-1.5 rounded-lg bg-[#23262a] border border-[#333739] hover:border-purple-400 text-[#ece8e0] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-purple-400" />
                    <span>Add Claim Code / Voucher</span>
                  </button>
                </div>

                {/* Total Vouchers Badge */}
                <div className="p-3 bg-[#15171a] rounded-lg border border-purple-800/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-xs text-[#ece8e0]">
                      Cumulative Claim Codes & Vouchers Total:
                    </span>
                  </div>
                  <span className="font-mono font-bold text-base text-purple-400">
                    GH₵ {summary.totalVouchers.toFixed(2)}
                  </span>
                </div>

                {/* Voucher Items */}
                {(form.voucherClaims || []).length === 0 ? (
                  <div className="p-6 rounded-lg bg-[#15171a] border border-dashed border-[#333739] text-center space-y-2">
                    <Tag className="w-8 h-8 text-[#8d9195] mx-auto opacity-50" />
                    <p className="text-[#8d9195] text-xs">
                      No claim codes or fleet vouchers logged for this attendant.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {form.voucherClaims?.map((vc, idx) => (
                      <div
                        key={vc.id || idx}
                        className="p-3 rounded-lg bg-[#15171a] border border-[#333739] space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <select
                              value={vc.type}
                              onChange={(e) => updateVoucher(idx, 'type', e.target.value)}
                              className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded font-bold text-xs text-[#ece8e0]"
                            >
                              <option value="claim_code">Fleet Claim Code</option>
                              <option value="corporate_voucher">Corporate Voucher</option>
                              <option value="fleet_coupon">Prepaid Fuel Coupon</option>
                              <option value="gov_voucher">Government Voucher</option>
                            </select>

                            <input
                              type="text"
                              placeholder="Claim Code (e.g. STC-8821)"
                              value={vc.claimCode || ''}
                              onChange={(e) => updateVoucher(idx, 'claimCode', e.target.value)}
                              className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs font-mono text-[#ece8e0] w-32"
                            />
                            <input
                              type="text"
                              placeholder="Voucher # (e.g. VCH-0092)"
                              value={vc.voucherNumber || ''}
                              onChange={(e) => updateVoucher(idx, 'voucherNumber', e.target.value)}
                              className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs font-mono text-[#ece8e0] w-32"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-[#8d9195]">GH₵</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={vc.amount || ''}
                              onChange={(e) =>
                                updateVoucher(idx, 'amount', parseFloat(e.target.value) || 0)
                              }
                              className="w-28 px-2 py-1 bg-[#23262a] border border-[#333739] rounded font-mono text-right text-xs text-[#ece8e0] font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => removeVoucher(idx)}
                              className="text-[#8d9195] hover:text-rose-400 cursor-pointer p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <input
                            type="text"
                            placeholder="Company Name (e.g. VIP Transport, Police Service)"
                            value={vc.companyName || ''}
                            onChange={(e) => updateVoucher(idx, 'companyName', e.target.value)}
                            className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs text-[#ece8e0]"
                          />
                          <input
                            type="text"
                            placeholder="Vehicle Reg # (e.g. GN-4819-24)"
                            value={vc.vehicleReg || ''}
                            onChange={(e) => updateVoucher(idx, 'vehicleReg', e.target.value)}
                            className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs font-mono text-[#ece8e0]"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#8d9195]">Litres:</span>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00 L"
                              value={vc.litres || ''}
                              onChange={(e) =>
                                updateVoucher(idx, 'litres', parseFloat(e.target.value) || 0)
                              }
                              className="w-full px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs font-mono text-right text-[#ece8e0]"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-[#23262a] text-[11px]">
                          <label className="flex items-center gap-1.5 text-[#8d9195] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={vc.verified !== false}
                              onChange={(e) => updateVoucher(idx, 'verified', e.target.checked)}
                              className="accent-purple-400"
                            />
                            <span>Physical voucher / claim authorization verified and signed</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: OTHER TRANSACTIONS (CREDIT SALES, DEDUCTIONS, COLLECTIONS)          */}
            {/* ========================================================================= */}
            {activeSection === 'other' && (
              <div className="space-y-4">
                {/* 1. Approved Credit Sales Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs uppercase text-[#ece8e0] flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-rose-400" />
                        <span>Approved Credit Sales (Accounts Deducted from Cash)</span>
                      </h4>
                      <p className="text-[11px] text-[#8d9195]">
                        Fuel issued on authorized credit customer invoices
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addCreditSale}
                      className="px-2.5 py-1 rounded bg-[#23262a] border border-[#333739] hover:border-rose-400 text-[#ece8e0] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-rose-400" />
                      <span>Add Credit Sale</span>
                    </button>
                  </div>

                  {(form.creditSales || []).map((cs, idx) => (
                    <div
                      key={cs.id || idx}
                      className="p-3 rounded-lg bg-[#15171a] border border-[#333739] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          placeholder="Credit Customer Name (e.g. DHL Express)"
                          value={cs.customer || ''}
                          onChange={(e) => updateCreditSale(idx, 'customer', e.target.value)}
                          className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs font-bold text-[#ece8e0] flex-1"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[#8d9195]">GH₵</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={cs.amount || ''}
                            onChange={(e) =>
                              updateCreditSale(idx, 'amount', parseFloat(e.target.value) || 0)
                            }
                            className="w-28 px-2 py-1 bg-[#23262a] border border-[#333739] rounded font-mono text-right text-xs text-[#ece8e0] font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => removeCreditSale(idx)}
                            className="text-[#8d9195] hover:text-rose-400 cursor-pointer p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Invoice / Chit Ref # (e.g. INV-9042)"
                          value={cs.invoiceRef || ''}
                          onChange={(e) => updateCreditSale(idx, 'invoiceRef', e.target.value)}
                          className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs font-mono text-[#ece8e0]"
                        />
                        <input
                          type="text"
                          placeholder="Vehicle Reg # (e.g. GT-8819-22)"
                          value={cs.vehicleReg || ''}
                          onChange={(e) => updateCreditSale(idx, 'vehicleReg', e.target.value)}
                          className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs font-mono text-[#ece8e0]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Authorized Expenses & Deductions */}
                <div className="space-y-2 pt-3 border-t border-[#333739]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs uppercase text-[#ece8e0]">
                        Authorized Operational Expenses & Deductions
                      </h4>
                      <p className="text-[11px] text-[#8d9195]">
                        Station expenses or cash deducted with supervisor vouchers
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addExpense}
                      className="px-2.5 py-1 rounded bg-[#23262a] border border-[#333739] hover:border-[#e8b93b] text-[#ece8e0] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#e8b93b]" />
                      <span>Add Expense Voucher</span>
                    </button>
                  </div>

                  {(form.expenses || []).map((exp, idx) => (
                    <div
                      key={exp.id || idx}
                      className="p-3 rounded-lg bg-[#15171a] border border-[#333739] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          placeholder="Category (e.g. Genset Fuel, Water Bill, Foreman Cash)"
                          value={exp.category || ''}
                          onChange={(e) => updateExpense(idx, 'category', e.target.value)}
                          className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs font-bold text-[#ece8e0] flex-1"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[#8d9195]">GH₵</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={exp.amount || ''}
                            onChange={(e) =>
                              updateExpense(idx, 'amount', parseFloat(e.target.value) || 0)
                            }
                            className="w-28 px-2 py-1 bg-[#23262a] border border-[#333739] rounded font-mono text-right text-xs text-[#ece8e0]"
                          />
                          <button
                            type="button"
                            onClick={() => removeExpense(idx)}
                            className="text-[#8d9195] hover:text-rose-400 cursor-pointer p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Reason / Purpose..."
                          value={exp.reason || ''}
                          onChange={(e) => updateExpense(idx, 'reason', e.target.value)}
                          className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs text-[#ece8e0]"
                        />
                        <input
                          type="text"
                          placeholder="Voucher # (e.g. VCH-009)"
                          value={exp.voucherRef || ''}
                          onChange={(e) => updateExpense(idx, 'voucherRef', e.target.value)}
                          className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs font-mono text-[#ece8e0]"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* 3. Credit Collections Section (Adding cash to handover) */}
                <div className="space-y-2 pt-3 border-t border-[#333739]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs uppercase text-[#ece8e0] flex items-center gap-1.5">
                        <Receipt className="w-4 h-4 text-emerald-400" />
                        <span>Credit Collections (Cash Received for Past Invoices)</span>
                      </h4>
                      <p className="text-[11px] text-[#8d9195]">
                        Previous credit debts paid in cash during this shift (increases physical cash handover)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addCreditCollection}
                      className="px-2.5 py-1 rounded bg-[#23262a] border border-[#333739] hover:border-emerald-400 text-[#ece8e0] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Add Credit Collection</span>
                    </button>
                  </div>

                  {(form.creditCollections || []).map((cc, idx) => (
                    <div
                      key={cc.id || idx}
                      className="p-3 rounded-lg bg-[#15171a] border border-[#333739] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          placeholder="Customer / Debtor Name..."
                          value={cc.customer || ''}
                          onChange={(e) => updateCreditCollection(idx, 'customer', e.target.value)}
                          className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs font-bold text-[#ece8e0] flex-1"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-[#8d9195]">GH₵</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={cc.amount || ''}
                            onChange={(e) =>
                              updateCreditCollection(idx, 'amount', parseFloat(e.target.value) || 0)
                            }
                            className="w-28 px-2 py-1 bg-[#23262a] border border-[#333739] rounded font-mono text-right text-xs text-[#ece8e0] font-bold text-emerald-400"
                          />
                          <button
                            type="button"
                            onClick={() => removeCreditCollection(idx)}
                            className="text-[#8d9195] hover:text-rose-400 cursor-pointer p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Receipt / Reference # (e.g. REC-102)"
                          value={cc.receiptRef || ''}
                          onChange={(e) => updateCreditCollection(idx, 'receiptRef', e.target.value)}
                          className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs font-mono text-[#ece8e0]"
                        />
                        <input
                          type="text"
                          placeholder="Notes..."
                          value={cc.notes || ''}
                          onChange={(e) => updateCreditCollection(idx, 'notes', e.target.value)}
                          className="px-2 py-1 bg-[#23262a] border border-[#333739] rounded text-xs text-[#ece8e0]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 6: MONEY DENOMINATIONS BREAKDOWN (BANK OF GHANA CASH)                 */}
            {/* ========================================================================= */}
            {activeSection === 'denominations' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#333739] pb-3">
                  <div>
                    <h4 className="font-bold text-xs uppercase text-[#ece8e0] flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <span>Bank of Ghana Money Denominations Breakdown</span>
                    </h4>
                    <p className="text-[11px] text-[#8d9195]">
                      Count and enter physical banknote pieces and coin pieces handed over by {form.attendantName}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoFillFromExpected}
                      className="px-2.5 py-1 rounded bg-[#23262a] border border-[#333739] hover:border-[#e8b93b] text-[#e8b93b] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Quickly fill standard notes matching Expected Cash"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Fill from Expected Cash</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetDenominations}
                      className="px-2 py-1 rounded bg-[#23262a] hover:bg-rose-950/40 text-rose-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Reset all denomination counts to 0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Grand Cash Total KPI Banner */}
                <div className="p-4 rounded-xl bg-[#15171a] border border-emerald-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                      Grand Physical Cash Counted (from Denominations)
                    </span>
                    <div className="text-2xl font-bold font-mono text-emerald-400 mt-0.5">
                      GH₵ {summary.actualCash.toFixed(2)}
                    </div>
                    <span className="text-[11px] text-[#8d9195]">
                      Banknotes: GH₵{' '}
                      {DENOMINATIONS.reduce((acc, d) => acc + d * (Number(denoms[d]) || 0), 0).toFixed(
                        2
                      )}{' '}
                      • Coins: GH₵{' '}
                      {COIN_DENOMINATIONS.reduce(
                        (acc, c) => acc + c * (Number(coins[c]) || 0),
                        0
                      ).toFixed(2)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[#8d9195] block">
                      Expected Cash to Handover
                    </span>
                    <span className="text-lg font-bold font-mono text-[#e8b93b]">
                      GH₵ {summary.expectedCash.toFixed(2)}
                    </span>
                    <div
                      className={`text-xs font-mono font-bold mt-0.5 ${
                        summary.status === 'accounted'
                          ? 'text-emerald-400'
                          : summary.status === 'shortage'
                          ? 'text-rose-400'
                          : 'text-blue-400'
                      }`}
                    >
                      Variance: {summary.difference >= 0 ? '+' : ''}GH₵ {summary.difference.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* 2-Column Denominations Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Banknotes Column */}
                  <div className="p-3.5 bg-[#15171a] rounded-xl border border-[#333739] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#2a2d30] pb-2">
                      <span className="font-bold text-xs text-[#ece8e0] flex items-center gap-1.5">
                        <Banknote className="w-4 h-4 text-emerald-400" />
                        <span>Ghana Cedi Banknotes</span>
                      </span>
                      <span className="text-[11px] font-mono text-emerald-400 font-bold">
                        GH₵{' '}
                        {DENOMINATIONS.reduce(
                          (acc, d) => acc + d * (Number(denoms[d]) || 0),
                          0
                        ).toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {DENOMINATIONS.map((d) => {
                        const count = Number(denoms[d] || 0);
                        const subtotal = count * d;

                        return (
                          <div
                            key={d}
                            className="flex items-center justify-between gap-3 p-2 rounded-lg bg-[#23262a] border border-[#333739]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-16 font-bold font-mono text-xs text-[#e8b93b] px-2 py-0.5 bg-[#15171a] rounded text-center">
                                GH₵ {d}
                              </span>
                              <span className="text-[10px] text-[#8d9195]">Note</span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-[#8d9195]">Pieces:</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={count || ''}
                                  onChange={(e) =>
                                    handleDenomChange(d, parseInt(e.target.value) || 0)
                                  }
                                  placeholder="0"
                                  className="w-20 px-2 py-1 bg-[#15171a] border border-[#333739] rounded font-mono text-right text-xs text-[#ece8e0]"
                                />
                              </div>

                              <span className="w-24 text-right font-mono font-bold text-xs text-[#ece8e0]">
                                GH₵ {subtotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Coins Column */}
                  <div className="p-3.5 bg-[#15171a] rounded-xl border border-[#333739] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#2a2d30] pb-2">
                      <span className="font-bold text-xs text-[#ece8e0] flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-amber-400" />
                        <span>Ghana Cedi Coins & Pesewas</span>
                      </span>
                      <span className="text-[11px] font-mono text-amber-400 font-bold">
                        GH₵{' '}
                        {COIN_DENOMINATIONS.reduce(
                          (acc, c) => acc + c * (Number(coins[c]) || 0),
                          0
                        ).toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {COIN_DENOMINATIONS.map((c) => {
                        const count = Number(coins[c] || 0);
                        const subtotal = count * c;

                        return (
                          <div
                            key={c}
                            className="flex items-center justify-between gap-3 p-2 rounded-lg bg-[#23262a] border border-[#333739]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-16 font-bold font-mono text-xs text-amber-300 px-2 py-0.5 bg-[#15171a] rounded text-center">
                                GH₵ {c.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-[#8d9195]">Coin</span>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-[#8d9195]">Pieces:</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={count || ''}
                                  onChange={(e) =>
                                    handleCoinChange(c, parseInt(e.target.value) || 0)
                                  }
                                  placeholder="0"
                                  className="w-20 px-2 py-1 bg-[#15171a] border border-[#333739] rounded font-mono text-right text-xs text-[#ece8e0]"
                                />
                              </div>

                              <span className="w-24 text-right font-mono font-bold text-xs text-[#ece8e0]">
                                GH₵ {subtotal.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 7: SUPERVISOR SIGN-OFF & CLOSE ACCOUNT                                */}
            {/* ========================================================================= */}
            {activeSection === 'closeAudit' && (
              <div className="space-y-4">
                <div className="border-b border-[#333739] pb-3">
                  <h4 className="font-bold text-xs uppercase text-[#ece8e0] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Supervisor Account Closure & Audit Verification</span>
                  </h4>
                  <p className="text-[11px] text-[#8d9195]">
                    Verify all 5 financial pillars before officially locking and closing this attendant's account
                  </p>
                </div>

                {/* 5-Pillar Verification Checklist */}
                <div className="p-4 rounded-xl bg-[#15171a] border border-[#333739] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[#ece8e0]">
                      Mandatory Supervisor Verification Checklist
                    </span>
                    <button
                      type="button"
                      onClick={handleMarkAllChecklist}
                      className="text-[11px] font-semibold text-[#e8b93b] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>Check All Items</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {/* Item 1: Litres & Meters */}
                    <div
                      onClick={() => toggleChecklistItem('litresAndMetersVerified')}
                      className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                        checklist.litresAndMetersVerified
                          ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                          : 'bg-[#23262a] border-[#333739] text-[#8d9195]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checklist.litresAndMetersVerified}
                        onChange={() => {}}
                        className="accent-emerald-400 mt-0.5 pointer-events-none"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#ece8e0]">
                            1. Attendant Litres & Forecourt Totalizers Verified
                          </span>
                          <span className="font-mono text-[11px] text-[#e8b93b]">
                            {summary.totalLitres.toFixed(2)} L (GH₵ {summary.totalSales.toFixed(2)})
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8d9195] mt-0.5">
                          Physical pump opening & closing meter counters match dispenser totalizers on the forecourt.
                        </p>
                      </div>
                    </div>

                    {/* Item 2: E-Values */}
                    <div
                      onClick={() => toggleChecklistItem('evaluesConfirmed')}
                      className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                        checklist.evaluesConfirmed
                          ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                          : 'bg-[#23262a] border-[#333739] text-[#8d9195]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checklist.evaluesConfirmed}
                        onChange={() => {}}
                        className="accent-emerald-400 mt-0.5 pointer-events-none"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#ece8e0]">
                            2. E-Values & Mobile Money/POS Slips Confirmed
                          </span>
                          <span className="font-mono text-[11px] text-cyan-400">
                            GH₵ {summary.totalEvalues.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8d9195] mt-0.5">
                          SMS merchant notifications, POS merchant transaction printouts, and bank approvals validated.
                        </p>
                      </div>
                    </div>

                    {/* Item 3: Claim Codes & Vouchers */}
                    <div
                      onClick={() => toggleChecklistItem('vouchersAndClaimsCollected')}
                      className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                        checklist.vouchersAndClaimsCollected
                          ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                          : 'bg-[#23262a] border-[#333739] text-[#8d9195]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checklist.vouchersAndClaimsCollected}
                        onChange={() => {}}
                        className="accent-emerald-400 mt-0.5 pointer-events-none"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#ece8e0]">
                            3. Physical Claim Codes & Fleet Vouchers Collected
                          </span>
                          <span className="font-mono text-[11px] text-purple-400">
                            GH₵ {summary.totalVouchers.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8d9195] mt-0.5">
                          Physical StarCard claim slips and signed corporate vouchers physically deposited in station safe.
                        </p>
                      </div>
                    </div>

                    {/* Item 4: Other Transactions */}
                    <div
                      onClick={() => toggleChecklistItem('otherTransactionsAudited')}
                      className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                        checklist.otherTransactionsAudited
                          ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                          : 'bg-[#23262a] border-[#333739] text-[#8d9195]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checklist.otherTransactionsAudited}
                        onChange={() => {}}
                        className="accent-emerald-400 mt-0.5 pointer-events-none"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#ece8e0]">
                            4. Credit Sales, Operational Expenses & Collections Audited
                          </span>
                          <span className="font-mono text-[11px] text-rose-400">
                            Credit: GH₵ {summary.totalCreditSales.toFixed(2)} • Exp: GH₵{' '}
                            {summary.approvedDeductions.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8d9195] mt-0.5">
                          Authorized customer credit invoices signed, station expense receipts verified, and debts collected.
                        </p>
                      </div>
                    </div>

                    {/* Item 5: Money Denominations */}
                    <div
                      onClick={() => toggleChecklistItem('cashDenominationsCounted')}
                      className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                        checklist.cashDenominationsCounted
                          ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                          : 'bg-[#23262a] border-[#333739] text-[#8d9195]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checklist.cashDenominationsCounted}
                        onChange={() => {}}
                        className="accent-emerald-400 mt-0.5 pointer-events-none"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#ece8e0]">
                            5. Bank of Ghana Cash Denominations Counted & Confirmed
                          </span>
                          <span className="font-mono text-[11px] text-emerald-400 font-bold">
                            Counted: GH₵ {summary.actualCash.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8d9195] mt-0.5">
                          Physical Ghana Cedi banknotes (GH₵200 to GH₵1) and coins counted in presence of attendant.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Supervisor Notes & Sign-Off Block */}
                <div className="p-4 rounded-xl bg-[#15171a] border border-[#333739] space-y-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase text-[#ece8e0] block mb-1">
                      Official Supervisor Account Closure Remarks & Audit Notes
                    </label>
                    <textarea
                      rows={2}
                      value={form.supervisorNotes || ''}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          supervisorNotes: e.target.value,
                        }))
                      }
                      placeholder="Add supervisor notes regarding shift performance, shortages/surpluses, or multi-day reconciliation..."
                      className="w-full px-3 py-2 bg-[#23262a] border border-[#333739] rounded-lg text-xs text-[#ece8e0] focus:outline-1 focus:outline-[#e8b93b]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#2a2d30] text-[11px]">
                    <div>
                      <span className="text-[#8d9195] block">Closing Supervisor:</span>
                      <span className="font-bold text-[#ece8e0]">{supervisorName}</span>
                    </div>
                    <div>
                      <span className="text-[#8d9195] block">Closing Date & Timestamp:</span>
                      <span className="font-mono text-[#ece8e0]">
                        {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Print Handover Slip Button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowPrintSlip(true)}
                    className="px-4 py-2 rounded-lg bg-[#23262a] hover:bg-[#2e3237] border border-[#333739] text-[#ece8e0] text-xs font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-[#e8b93b]" />
                    <span>Generate & Print Official Account Closure Certificate</span>
                  </button>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 8: MULTI-DAY SPAN & DAILY LOGS                                        */}
            {/* ========================================================================= */}
            {activeSection === 'multiday' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-xs uppercase text-[#ece8e0]">
                      Multi-Day Account Span & Daily Shift Logs
                    </h4>
                    <p className="text-[11px] text-[#8d9195]">
                      Track daily forecourt shifts carried over (e.g. Saturday → Sunday → Monday)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsAddingDayLog(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#23262a] border border-[#333739] hover:border-[#e8b93b] text-[#ece8e0] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#e8b93b]" />
                    <span>Append Day Shift Log</span>
                  </button>
                </div>

                {/* Day Logs List */}
                <div className="space-y-2.5">
                  <div className="p-3 rounded-lg bg-[#23262a] border border-[#e8b93b]/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-[#e8b93b] text-[#15171a] font-bold text-[10px] uppercase">
                          Current Day (Day {summary.daysOpenCount})
                        </span>
                        <span className="font-bold text-xs text-[#ece8e0]">{form.date}</span>
                        <span className="text-[11px] text-[#8d9195]">({form.shiftType})</span>
                      </div>

                      <span className="text-[11px] font-mono text-[#e8b93b] font-semibold">
                        Active Shift Log
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-[#15171a] p-2 rounded">
                      <div>
                        <span className="text-[#8d9195] block text-[10px]">Litres:</span>
                        <span className="text-[#ece8e0] font-mono font-bold">
                          {summary.totalLitres.toFixed(2)} L
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8d9195] block text-[10px]">E-Values:</span>
                        <span className="text-cyan-400 font-mono">
                          GH₵ {summary.totalEvalues.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8d9195] block text-[10px]">Vouchers:</span>
                        <span className="text-purple-400 font-mono">
                          GH₵ {summary.totalVouchers.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8d9195] block text-[10px]">Counted Cash:</span>
                        <span className="text-emerald-400 font-mono font-bold">
                          GH₵ {summary.actualCash.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {(form.dayLogs || []).map((dl, idx) => (
                    <div
                      key={dl.id || idx}
                      className="p-3 rounded-lg bg-[#15171a] border border-[#333739] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#23262a] border border-[#333739] text-[#8d9195] font-mono text-[10px] uppercase">
                            Day {idx + 1}: {dl.dayName}
                          </span>
                          <span className="font-semibold text-xs text-[#ece8e0]">{dl.date}</span>
                          <span className="text-[11px] text-[#8d9195]">({dl.shiftPeriod})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => removeDayLog(dl.id)}
                            className="text-[#8d9195] hover:text-rose-400 p-1 cursor-pointer"
                            title="Remove day log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {dl.notes && (
                        <p className="text-[11px] text-[#8d9195] italic bg-[#23262a] p-2 rounded">
                          "{dl.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer Controls */}
          <div className="p-4 bg-[#15171a] border-t border-[#333739] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#8d9195]">Reconciliation:</span>
              <span
                className={`text-xs font-mono font-bold ${
                  summary.status === 'accounted'
                    ? 'text-emerald-400'
                    : summary.status === 'shortage'
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {summary.status.toUpperCase()}: {summary.difference >= 0 ? '+' : ''}GH₵{' '}
                {summary.difference.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {onDelete && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(true)}
                  className="px-3 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-900/60 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors mr-auto sm:mr-0"
                  title="Delete this attendant account record"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete Account</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg bg-[#23262a] hover:bg-[#333739] text-[#ece8e0] text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              {/* Save & Keep Open (Continues multi-day) */}
              <button
                onClick={handleSaveAndKeepOpen}
                className="px-4 py-2 rounded-lg bg-[#23262a] hover:bg-[#2e3237] border border-[#333739] text-[#e8b93b] hover:border-[#e8b93b] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                title="Save progress and keep account OPEN across multiple days"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Save & Keep Account Open</span>
              </button>

              {/* Complete & Close Account */}
              <button
                onClick={handleCompleteAndCloseAccount}
                className="px-4 py-2 rounded-lg bg-[#e8b93b] hover:bg-[#e8b93b]/90 text-[#15171a] text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                title="Supervisor finalizes accounting and officially closes this attendant account"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete & Close Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* In-Modal Delete Confirmation Dialog */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1d2023] border border-rose-900/60 rounded-xl p-5 max-w-md w-full shadow-2xl text-[#ece8e0] space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-extrabold text-[#ece8e0] font-['Space_Grotesk'] uppercase tracking-wide">
                Delete Attendant Account?
              </h3>
              <p className="text-xs text-[#8d9195] leading-relaxed">
                Are you sure you want to permanently delete the accountability account for{' '}
                <strong className="text-amber-400">{form.attendantName}</strong> ({form.staffId || 'SO-ATT'})?
              </p>
              <div className="p-2.5 rounded bg-[#15171a] border border-[#2a2d30] text-[11px] text-[#8d9195] text-left mt-2">
                <span className="text-rose-400 font-semibold block mb-0.5">⚠️ Irreversible Action:</span>
                This will remove all recorded meter readings ({form.meterReadings?.length || 0}), sales, physical cash counts, and multi-day logs for this shift.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="py-2.5 px-3 rounded-lg border border-[#333739] bg-[#23262a] hover:bg-[#2e3237] text-[#ece8e0] font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  if (onDelete) {
                    onDelete(form.id);
                  }
                  onClose();
                }}
                className="py-2.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer transition-colors shadow-md flex items-center justify-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>Yes, Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Closure Handover Slip Modal */}
      {showPrintSlip && (
        <AccountClosurePrintSlip
          isOpen={showPrintSlip}
          onClose={() => setShowPrintSlip(false)}
          record={form}
          supervisorName={supervisorName}
        />
      )}
    </>
  );
};
