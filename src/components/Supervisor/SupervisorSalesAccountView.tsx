import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Fuel,
  Droplet,
  Cylinder,
  CreditCard,
  Banknote,
  Receipt,
  ShieldCheck,
  Printer,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  PlusCircle,
  Gauge,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  SupervisorSalesAccountRecord,
  UserProfile,
  StationConfig,
} from '../../types';
import {
  getLocalSupervisorSalesAccounts,
  saveSupervisorSalesAccounts,
  fetchSupervisorSalesAccounts,
  subscribeToSupervisorSalesAccounts,
} from '../../services/supervisorStorage';
import { computeSupervisorSalesSummary } from '../../utils/accountabilityCalculations';
import { formatUserFriendlyError } from '../../utils/calculations';
import { SupervisorShiftInfoSection } from './SupervisorShiftInfoSection';
import { SupervisorOpeningMetersStep } from './SupervisorOpeningMetersStep';
import { SupervisorClosingMetersStep } from './SupervisorClosingMetersStep';
import { SupervisorLubesSection } from './SupervisorLubesSection';
import { SupervisorStockAccountSection } from './SupervisorStockAccountSection';
import { SupervisorTotalStationSalesSection } from './SupervisorTotalStationSalesSection';
import { SupervisorDrawingsSection } from './SupervisorDrawingsSection';
import { SupervisorOtherExpensesSection } from './SupervisorOtherExpensesSection';
import { SupervisorCashSection } from './SupervisorCashSection';
import { SupervisorReconciliationSection } from './SupervisorReconciliationSection';
import { SupervisorPrintSection } from './SupervisorPrintSection';

export type SalesAccountStep =
  | 'shift_info'
  | 'opening_meters'
  | 'closing_meters'
  | 'sales'
  | 'drawings_credits'
  | 'cash_count'
  | 'reconciliation'
  | 'print';

interface SupervisorSalesAccountViewProps {
  profile: UserProfile;
  stations?: StationConfig[];
  onBackToHome?: () => void;
}

export const SupervisorSalesAccountView: React.FC<SupervisorSalesAccountViewProps> = ({
  profile,
  stations,
  onBackToHome,
}) => {
  const [records, setRecords] = useState<SupervisorSalesAccountRecord[]>(() => {
    return getLocalSupervisorSalesAccounts();
  });
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [activeStep, setActiveStep] = useState<SalesAccountStep>('shift_info');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const supervisorName = profile.supervisor || profile.name || 'Supervisor';
  const stationName = profile.station || 'Tema Main Station';
  const stationCode = profile.stationCode || 'SOC101179';

  // Load records from Cloud Firestore with Local Fallback
  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      try {
        const cloudRecords = await fetchSupervisorSalesAccounts();
        if (isMounted && cloudRecords && cloudRecords.length > 0) {
          setRecords(cloudRecords);
        }
      } catch (e) {
        console.warn('Initial cloud fetch failed, utilizing local store', e);
      }
    };
    loadInitial();

    const unsubscribe = subscribeToSupervisorSalesAccounts((cloudRecords) => {
      if (isMounted && cloudRecords && cloudRecords.length > 0) {
        setRecords(cloudRecords);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Initialize Default Record if none exists
  useEffect(() => {
    if (records.length === 0) {
      const initialRecord: SupervisorSalesAccountRecord = {
        id: 'sup_sales_' + Date.now(),
        supervisorName,
        staffId: profile.staffId || 'SO-SUP-01',
        date: new Date().toISOString().slice(0, 10),
        shiftType: 'Shift A — Day',
        station: stationName,
        stationCode,
        accountState: 'open',
        startDate: new Date().toISOString().slice(0, 10),
        isMultiDay: false,
        daysOpen: 1,
        attendantHandovers: [],
        fuelMeters: [
          {
            id: 'smr_' + Date.now() + '_1',
            pumpName: 'Super PMS - Pump 1',
            fuelType: 'super',
            openingMeter: 45210.0,
            closingMeter: 45210.0,
            rtt: 0,
            unitPrice: 13.27,
            litresSold: 0,
            totalSales: 0,
          },
          {
            id: 'smr_' + Date.now() + '_2',
            pumpName: 'Diesel AGO - Pump 1',
            fuelType: 'diesel',
            openingMeter: 82140.0,
            closingMeter: 82140.0,
            rtt: 0,
            unitPrice: 14.50,
            litresSold: 0,
            totalSales: 0,
          },
        ],
        lubricantSales: [
          {
            id: 'slube_1',
            catalogId: 'ug-sae40-1l',
            name: 'ULTRA GUARD SAE 40',
            unit: '1LT',
            unitPrice: 66,
            openingStock: 24,
            received: 0,
            soldQty: 0,
            closingStock: 24,
            totalAmount: 0,
          },
        ],
        approvedCredit: [],
        evalues: [],
        creditCollections: [],
        expenses: [],
        voucherClaims: [],
        cashDenominations: {
          notes: { 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 },
          coins: { 2: 0, 1: 0, 0.5: 0, 0.2: 0, 0.1: 0 },
          totalCash: 0,
        },
        actualCashCounted: 0,
        notes: '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setRecords([initialRecord]);
      setSelectedRecordId(initialRecord.id);
      saveSupervisorSalesAccounts([initialRecord]);
    } else if (!selectedRecordId) {
      setSelectedRecordId(records[0].id);
    }
  }, [records, selectedRecordId, supervisorName, stationName, stationCode, profile.staffId]);

  // Current active sales account record
  const currentRecord = useMemo(() => {
    return records.find((r) => r.id === selectedRecordId) || records[0] || null;
  }, [records, selectedRecordId]);

  const [form, setForm] = useState<SupervisorSalesAccountRecord | null>(currentRecord);

  useEffect(() => {
    if (currentRecord) {
      setForm(currentRecord);
    }
  }, [currentRecord]);

  if (!form) {
    return (
      <div className="p-8 text-center text-[#8d9195] bg-[#1a1d20] rounded-2xl border border-[#2d3135]">
        Initializing Supervisor Sales Account...
      </div>
    );
  }

  // Live Calculations
  const summary = computeSupervisorSalesSummary(form);
  const isAccountClosed = form.accountState === 'closed';

  // Currency Formatter
  const formatGhc = (val: number) => {
    return (Number(val) || 0).toLocaleString('en-GH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Form Field Update Handler
  const handleUpdateForm = (updatedFields: Partial<SupervisorSalesAccountRecord>) => {
    setForm((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        ...updatedFields,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  // Save Progress
  const handleSave = async () => {
    if (!form) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const updatedList = records.map((r) => (r.id === form.id ? form : r));
      if (!records.some((r) => r.id === form.id)) {
        updatedList.unshift(form);
      }
      setRecords(updatedList);
      await saveSupervisorSalesAccounts(updatedList);
      setSaveSuccess('Sales Account Saved Successfully');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err) {
      setSaveError(formatUserFriendlyError(err, 'Unable to save this record. Please check your connection and try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  // Close Account Handler
  const handleCloseAccount = async () => {
    if (!form) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const closedForm: SupervisorSalesAccountRecord = {
        ...form,
        accountState: 'closed',
        status:
          Math.abs(summary.netVariance) <= 0.5
            ? 'accounted'
            : summary.netVariance < 0
            ? 'shortage'
            : 'excess',
        updatedAt: new Date().toISOString(),
      };
      setForm(closedForm);
      const updatedList = records.map((r) => (r.id === form.id ? closedForm : r));
      setRecords(updatedList);
      await saveSupervisorSalesAccounts(updatedList);
      setShowCloseModal(false);
      setSaveSuccess('Sales Account Closed Successfully');
      setTimeout(() => setSaveSuccess(null), 4000);
    } catch (err) {
      setSaveError(formatUserFriendlyError(err, 'Unable to close account. Please check your connection and try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  // Re-Open Account Handler
  const handleReopenAccount = async () => {
    if (!form) return;
    setIsSaving(true);
    try {
      const reopened: SupervisorSalesAccountRecord = {
        ...form,
        accountState: 'open',
        status: 'pending',
        updatedAt: new Date().toISOString(),
      };
      setForm(reopened);
      const updatedList = records.map((r) => (r.id === form.id ? reopened : r));
      setRecords(updatedList);
      await saveSupervisorSalesAccounts(updatedList);
      setSaveSuccess('Sales Account Re-Opened for adjustments');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      setSaveError(formatUserFriendlyError(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Create New Shift Account
  const handleCreateNewShiftAccount = async () => {
    const newId = 'sup_sales_' + Date.now();
    const newRecord: SupervisorSalesAccountRecord = {
      id: newId,
      supervisorName,
      staffId: profile.staffId || 'SO-SUP-01',
      date: new Date().toISOString().slice(0, 10),
      shiftType: 'Shift A — Day',
      station: stationName,
      stationCode,
      accountState: 'open',
      startDate: new Date().toISOString().slice(0, 10),
      isMultiDay: false,
      daysOpen: 1,
      attendantHandovers: [],
      fuelMeters: [
        {
          id: 'smr_' + Date.now() + '_1',
          pumpName: 'Super PMS - Pump 1',
          fuelType: 'super',
          openingMeter: 0,
          closingMeter: 0,
          rtt: 0,
          unitPrice: 13.27,
          litresSold: 0,
          totalSales: 0,
        },
        {
          id: 'smr_' + Date.now() + '_2',
          pumpName: 'Diesel AGO - Pump 1',
          fuelType: 'diesel',
          openingMeter: 0,
          closingMeter: 0,
          rtt: 0,
          unitPrice: 14.50,
          litresSold: 0,
          totalSales: 0,
        },
      ],
      lubricantSales: [],
      approvedCredit: [],
      evalues: [],
      creditCollections: [],
      expenses: [],
      voucherClaims: [],
      cashDenominations: {
        notes: { 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 },
        coins: { 2: 0, 1: 0, 0.5: 0, 0.2: 0, 0.1: 0 },
        totalCash: 0,
      },
      actualCashCounted: 0,
      notes: '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const nextList = [newRecord, ...records];
    setRecords(nextList);
    setSelectedRecordId(newId);
    setForm(newRecord);
    setActiveStep('shift_info');
    await saveSupervisorSalesAccounts(nextList);
  };

  // 7 MANDATED STEPS
  const steps: {
    id: SalesAccountStep;
    num: number;
    title: string;
    shortTitle: string;
    icon: React.ElementType;
    badge?: string;
  }[] = [
    {
      id: 'shift_info',
      num: 1,
      title: 'STEP 1: Shift Information',
      shortTitle: '1. Shift Info',
      icon: Calendar,
      badge: form.date || 'Today',
    },
    {
      id: 'opening_meters',
      num: 2,
      title: 'STEP 2: Opening Meters',
      shortTitle: '2. Opening Meters',
      icon: Gauge,
      badge: `${(form.fuelMeters || []).length} Pumps`,
    },
    {
      id: 'closing_meters',
      num: 3,
      title: 'STEP 3: Closing Meters',
      shortTitle: '3. Closing Meters',
      icon: Fuel,
      badge: `${formatGhc(summary.totalFuelLitres || 0)} L`,
    },
    {
      id: 'sales',
      num: 4,
      title: 'STEP 4: Sales',
      shortTitle: '4. Sales',
      icon: TrendingUp,
      badge: `GH₵ ${formatGhc(summary.grossSales || 0)}`,
    },
    {
      id: 'drawings_credits',
      num: 5,
      title: 'STEP 5: Drawings & Credits',
      shortTitle: '5. Drawings & Credits',
      icon: CreditCard,
      badge: `GH₵ ${formatGhc(summary.totalDeductions || 0)}`,
    },
    {
      id: 'cash_count',
      num: 6,
      title: 'STEP 6: Cash Count',
      shortTitle: '6. Cash Count',
      icon: Banknote,
      badge: `GH₵ ${formatGhc(summary.actualCashCounted || 0)}`,
    },
    {
      id: 'reconciliation',
      num: 7,
      title: 'STEP 7: Reconciliation',
      shortTitle: '7. Reconciliation',
      icon: ShieldCheck,
      badge:
        Math.abs(summary.netVariance) <= 0.5
          ? 'BALANCED'
          : summary.netVariance < 0
          ? 'SHORTAGE'
          : 'EXCESS',
    },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === activeStep);

  const goToNextStep = () => {
    if (currentStepIndex >= 0 && currentStepIndex < steps.length - 1) {
      setActiveStep(steps[currentStepIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevStep = () => {
    if (currentStepIndex > 0) {
      setActiveStep(steps[currentStepIndex - 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto px-1 sm:px-2 pb-16">
      {/* 1. TOP HEADER & SHIFT CLOSING SELECTOR */}
      <div className="bg-[#191c1f] rounded-3xl border border-[#333739] p-4 sm:p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded bg-amber-500 text-stone-950">
                SUPERVISOR'S SALES ACCOUNT
              </span>
              <span className="text-xs font-mono font-bold text-amber-300">
                {form.station || stationName} ({form.stationCode || stationCode})
              </span>
              {isAccountClosed ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" /> CLOSED
                </span>
              ) : form.isMultiDay ? (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                  <Unlock className="w-3 h-3 text-amber-400" /> MULTI-DAY OPEN ({form.daysOpen || 1} Days)
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                  <Unlock className="w-3 h-3 text-emerald-400" /> OPEN
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#ece8e0] font-['Space_Grotesk'] mt-1.5 flex items-center gap-2">
              <Banknote className="w-6 h-6 text-amber-400" />
              Supervisor Sales Account
            </h1>
            <p className="text-xs text-[#8d9195] mt-0.5">
              Reconcile shift sales, pumps, lubricants, drawings, physical cash, and station banking for {form.supervisorName || supervisorName}.
            </p>
          </div>

          {/* RIGHT ACTION BUTTONS */}
          <div className="flex items-center gap-2 flex-wrap">
            {records.length > 1 && (
              <select
                aria-label="Select Supervisor Shift Account"
                value={selectedRecordId}
                onChange={(e) => setSelectedRecordId(e.target.value)}
                className="bg-[#15171a] border border-[#333739] text-[#ece8e0] text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-amber-500 cursor-pointer"
              >
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.date} — {r.shiftType} ({r.accountState === 'closed' ? 'Closed' : 'Open'})
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handleCreateNewShiftAccount}
              className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <PlusCircle size={14} />
              <span>New Account</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStep('print')}
              className="px-3 py-2 rounded-xl border border-[#333739] hover:bg-[#252a2f] text-[#ece8e0] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Printer size={14} className="text-amber-400" />
              <span>Print Slip</span>
            </button>

            {!isAccountClosed && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-sm active:scale-95"
              >
                <Save size={14} />
                <span>{isSaving ? 'Saving...' : 'Save Draft'}</span>
              </button>
            )}

            {isAccountClosed ? (
              <button
                type="button"
                onClick={handleReopenAccount}
                className="px-3.5 py-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/40 border border-amber-800 text-amber-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Unlock size={14} />
                <span>Re-Open</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCloseModal(true)}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <Lock size={14} />
                <span>Submit / Close</span>
              </button>
            )}
          </div>
        </div>

        {/* SAVE CONFIRMATION BANNER */}
        {saveSuccess && (
          <div className="mt-3 bg-emerald-950/90 border border-emerald-800 text-emerald-300 text-xs py-2 px-4 rounded-xl flex items-center gap-2 font-bold animate-fade-in">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}

        {/* ERROR BANNER */}
        {saveError && (
          <div className="mt-3 bg-rose-950/90 border border-rose-800 text-rose-300 text-xs py-2 px-4 rounded-xl flex items-center gap-2 font-bold animate-fade-in">
            <AlertTriangle size={16} className="text-rose-400 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
      </div>

      {/* 2. LARGE KEY TOTALS DISPLAY (TOTAL SALES, EXPECTED CASH, PHYSICAL CASH, DIFFERENCE) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-[#191c1f] border border-[#333739] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8d9195] block">
            TOTAL SALES
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#ece8e0] mt-1 truncate">
            GH₵ {formatGhc(summary.grossSales)}
          </div>
          <span className="text-[11px] text-[#8d9195] font-mono mt-0.5 block">
            {formatGhc(summary.totalFuelLitres || 0)} L + Lubes
          </span>
        </div>

        <div className="bg-[#191c1f] border border-[#333739] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8d9195] block">
            EXPECTED CASH
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-blue-300 mt-1 truncate">
            GH₵ {formatGhc(summary.expectedCashToBank)}
          </div>
          <span className="text-[11px] text-[#8d9195] font-mono mt-0.5 block">
            Drawings: GH₵ {formatGhc(summary.totalDeductions)}
          </span>
        </div>

        <div className="bg-[#191c1f] border border-[#333739] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8d9195] block">
            PHYSICAL CASH
          </span>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 mt-1 truncate">
            GH₵ {formatGhc(summary.actualCashCounted)}
          </div>
          <span className="text-[11px] text-[#8d9195] font-mono mt-0.5 block">
            Denominations count
          </span>
        </div>

        <div
          className={`border rounded-2xl p-4 shadow-sm ${
            Math.abs(summary.netVariance) <= 0.5
              ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
              : summary.netVariance < 0
              ? 'bg-rose-950/30 border-rose-800 text-rose-300'
              : 'bg-blue-950/30 border-blue-800 text-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider block opacity-80">
              DIFFERENCE & STATUS
            </span>
            <span
              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                Math.abs(summary.netVariance) <= 0.5
                  ? 'bg-emerald-500 text-stone-950'
                  : summary.netVariance < 0
                  ? 'bg-rose-500 text-white'
                  : 'bg-blue-500 text-white'
              }`}
            >
              {Math.abs(summary.netVariance) <= 0.5
                ? 'BALANCED'
                : summary.netVariance < 0
                ? 'SHORTAGE'
                : 'EXCESS'}
            </span>
          </div>

          <div className="text-xl sm:text-2xl font-black font-mono mt-1 truncate">
            {summary.netVariance >= 0 ? '+' : ''}GH₵ {formatGhc(summary.netVariance)}
          </div>
          <span className="text-[11px] opacity-80 mt-0.5 block capitalize">
            {Math.abs(summary.netVariance) <= 0.5
              ? 'Reconciled balanced'
              : summary.netVariance < 0
              ? 'Cash shortage'
              : 'Excess cash'}
          </span>
        </div>
      </div>

      {/* 3. STEP PROGRESSION TABS (7 MANDATED STEPS) */}
      <div className="bg-[#191c1f] rounded-2xl border border-[#333739] p-2.5 shadow-sm">
        <div className="overflow-x-auto flex items-center gap-1.5 scrollbar-thin pb-1">
          {steps.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep === step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  setActiveStep(step.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-amber-500 text-stone-950 shadow-md font-black'
                    : 'bg-[#15171a] text-[#8d9195] hover:text-[#ece8e0] hover:bg-[#23262a] border border-[#333739]'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-stone-950' : 'text-amber-400'} />
                <span>{step.shortTitle}</span>
                {step.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isActive
                        ? 'bg-black/20 text-stone-950 font-bold'
                        : 'bg-[#1e2226] text-[#8d9195]'
                    }`}
                  >
                    {step.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. ACTIVE STEP WORKSPACE */}
      <div className="space-y-4">
        {activeStep === 'print' && (
          <SupervisorPrintSection
            form={form}
            formatGhc={formatGhc}
            summary={summary}
            supervisorName={supervisorName}
            stationName={stationName}
            stationCode={stationCode}
            onBackToLedger={() => setActiveStep('reconciliation')}
          />
        )}

        {activeStep === 'shift_info' && (
          <SupervisorShiftInfoSection
            form={form}
            onUpdateForm={handleUpdateForm}
            supervisorName={supervisorName}
            stationName={stationName}
            stationCode={stationCode}
            disabled={isAccountClosed}
          />
        )}

        {activeStep === 'opening_meters' && (
          <SupervisorOpeningMetersStep
            form={form}
            onUpdateForm={handleUpdateForm}
            formatGhc={formatGhc}
            isAccountClosed={isAccountClosed}
          />
        )}

        {activeStep === 'closing_meters' && (
          <SupervisorClosingMetersStep
            form={form}
            onUpdateForm={handleUpdateForm}
            formatGhc={formatGhc}
            isAccountClosed={isAccountClosed}
          />
        )}

        {activeStep === 'sales' && (
          <div className="space-y-5">
            {/* Summary banner of Total Station Sales */}
            <SupervisorTotalStationSalesSection
              form={form}
              onUpdateForm={handleUpdateForm}
              summary={summary}
              formatGhc={formatGhc}
              disabled={isAccountClosed}
            />

            {/* Lubricants Sales Catalog */}
            <SupervisorLubesSection
              form={form}
              onUpdateForm={handleUpdateForm}
              formatGhc={formatGhc}
              disabled={isAccountClosed}
            />

            {/* Stock Tanks & Dips */}
            <SupervisorStockAccountSection
              form={form}
              onUpdateForm={handleUpdateForm}
              formatGhc={formatGhc}
              disabled={isAccountClosed}
            />
          </div>
        )}

        {activeStep === 'drawings_credits' && (
          <div className="space-y-5">
            <SupervisorDrawingsSection
              form={form}
              onUpdateForm={handleUpdateForm}
              formatGhc={formatGhc}
              disabled={isAccountClosed}
            />

            <SupervisorOtherExpensesSection
              form={form}
              onUpdateForm={handleUpdateForm}
              formatGhc={formatGhc}
              disabled={isAccountClosed}
            />
          </div>
        )}

        {activeStep === 'cash_count' && (
          <SupervisorCashSection
            form={form}
            onUpdateForm={handleUpdateForm}
            formatGhc={formatGhc}
            disabled={isAccountClosed}
          />
        )}

        {activeStep === 'reconciliation' && (
          <SupervisorReconciliationSection
            form={form}
            onUpdateForm={handleUpdateForm}
            summary={summary}
            formatGhc={formatGhc}
            disabled={isAccountClosed}
            onPrintSlip={() => setActiveStep('print')}
          />
        )}

        {/* 5. MANDATED NAVIGATION BUTTON BAR: BACK, NEXT, SAVE, SUBMIT, PRINT */}
        {activeStep !== 'print' && (
          <div className="bg-[#191c1f] rounded-2xl border border-[#333739] p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            {/* BACK BUTTON */}
            <button
              type="button"
              onClick={goToPrevStep}
              disabled={currentStepIndex === 0}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#23262a] hover:bg-[#2d3136] text-[#ece8e0] text-xs font-extrabold flex items-center justify-center gap-2 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border border-[#333739]"
            >
              <ChevronLeft size={16} />
              <span>BACK</span>
            </button>

            {/* STEP COUNTER & QUICK ACTIONS */}
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="text-xs text-[#8d9195] font-mono px-3 py-1 rounded-lg bg-[#15171a] border border-[#2d3135]">
                {steps[currentStepIndex]?.title || `Step ${currentStepIndex + 1} of 7`}
              </span>

              {/* SAVE BUTTON */}
              {!isAccountClosed && (
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-[#25292e] hover:bg-[#30353b] border border-[#383e46] text-[#ece8e0] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Save size={14} className="text-amber-400" />
                  <span>SAVE</span>
                </button>
              )}

              {/* PRINT BUTTON */}
              <button
                type="button"
                onClick={() => setActiveStep('print')}
                className="px-4 py-2 rounded-xl bg-[#25292e] hover:bg-[#30353b] border border-[#383e46] text-[#ece8e0] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer size={14} className="text-amber-400" />
                <span>PRINT</span>
              </button>
            </div>

            {/* NEXT / SUBMIT BUTTON */}
            {currentStepIndex < steps.length - 1 ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md active:scale-95"
              >
                <span>NEXT ({steps[currentStepIndex + 1]?.shortTitle})</span>
                <ChevronRight size={16} />
              </button>
            ) : isAccountClosed ? (
              <button
                type="button"
                onClick={() => setActiveStep('print')}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
              >
                <Printer size={16} />
                <span>PRINT STATEMENT</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCloseModal(true)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md active:scale-95"
              >
                <Lock size={16} />
                <span>SUBMIT / CLOSE ACCOUNT</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* CLOSE ACCOUNT CONFIRMATION MODAL - EXACT MANDATED TEXT */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1d2023] border border-[#333739] rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
              <Lock size={24} />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-black text-[#ece8e0] font-['Space_Grotesk'] uppercase tracking-tight">
                CLOSE ACCOUNT
              </h3>
              <p className="text-xs text-[#b5b9bd] leading-relaxed px-2">
                “Closing this account means the supervisor has completed the final physical cash accounting. The account will no longer remain open.”
              </p>
            </div>

            {/* Reconciliation summary recap */}
            <div className="bg-[#15171a] p-3.5 rounded-2xl border border-[#333739] space-y-2 text-xs">
              <div className="flex justify-between text-[#8d9195]">
                <span>Total Sales Expected:</span>
                <span className="font-bold text-[#ece8e0] font-mono">GH₵ {formatGhc(summary.grossSales)}</span>
              </div>
              <div className="flex justify-between text-[#8d9195]">
                <span>Expected Cash To Bank:</span>
                <span className="font-bold text-blue-300 font-mono">GH₵ {formatGhc(summary.expectedCashToBank)}</span>
              </div>
              <div className="flex justify-between text-[#8d9195]">
                <span>Actual Counted Cash:</span>
                <span className="font-bold text-emerald-300 font-mono">GH₵ {formatGhc(summary.actualCashCounted)}</span>
              </div>
              <div className="flex justify-between text-[#8d9195] pt-1 border-t border-[#2d3135]">
                <span>Status / Difference:</span>
                <span className="font-bold font-mono text-amber-300">
                  {summary.netVariance >= 0 ? '+' : ''}GH₵ {formatGhc(summary.netVariance)} ({Math.abs(summary.netVariance) <= 0.5 ? 'BALANCED' : summary.netVariance < 0 ? 'SHORTAGE' : 'EXCESS'})
                </span>
              </div>
            </div>

            {/* EXACT MANDATED BUTTONS: CANCEL and CLOSE ACCOUNT */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="flex-1 py-3 rounded-xl bg-[#23262a] hover:bg-[#2d3136] text-[#ece8e0] text-xs font-bold transition-colors cursor-pointer border border-[#333739]"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleCloseAccount}
                disabled={isSaving}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black transition-colors cursor-pointer shadow-md active:scale-95"
              >
                {isSaving ? 'CLOSING...' : 'CLOSE ACCOUNT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
