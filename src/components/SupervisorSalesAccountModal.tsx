import React, { useState, useEffect } from 'react';
import {
  X,
  Fuel,
  Droplet,
  FileText,
  Banknote,
  ShieldCheck,
  Printer,
  ChevronLeft,
  ChevronRight,
  Save,
  Lock,
  Unlock,
  Trash2,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Cylinder,
  CreditCard,
  Receipt,
  Eye,
  ListOrdered,
} from 'lucide-react';
import {
  SupervisorSalesAccountRecord,
  SUPERVISOR_DEDUCTION_CATEGORIES,
} from '../types';
import { computeSupervisorSalesSummary } from '../utils/accountabilityCalculations';
import { SupervisorShiftInfoSection } from './Supervisor/SupervisorShiftInfoSection';
import { SupervisorFuelProductSection } from './Supervisor/SupervisorFuelProductSection';
import { SupervisorLubesSection } from './Supervisor/SupervisorLubesSection';
import { SupervisorStockAccountSection } from './Supervisor/SupervisorStockAccountSection';
import { SupervisorTotalStationSalesSection } from './Supervisor/SupervisorTotalStationSalesSection';
import { SupervisorDrawingsSection } from './Supervisor/SupervisorDrawingsSection';
import { SupervisorOtherExpensesSection } from './Supervisor/SupervisorOtherExpensesSection';
import { SupervisorCashSection } from './Supervisor/SupervisorCashSection';
import { SupervisorReconciliationSection } from './Supervisor/SupervisorReconciliationSection';
import { SupervisorPrintSection } from './Supervisor/SupervisorPrintSection';

interface SupervisorSalesAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SupervisorSalesAccountRecord;
  onSave: (updated: SupervisorSalesAccountRecord) => void;
  onDelete?: (id: string) => void;
  supervisorName?: string;
  stationName?: string;
  stationCode?: string;
}

export type SalesAccountStep =
  | 'shift_info'
  | 'super_pms'
  | 'diesel_ago'
  | 'ron95'
  | 'lubricants'
  | 'stock_account'
  | 'total_sales'
  | 'drawings'
  | 'expenses'
  | 'cash'
  | 'reconciliation'
  | 'print';

export const SupervisorSalesAccountModal: React.FC<SupervisorSalesAccountModalProps> = ({
  isOpen,
  onClose,
  record,
  onSave,
  onDelete,
  supervisorName = 'John Mensah',
  stationName = 'Tema Main Station',
  stationCode = 'SO-TMA-001',
}) => {
  const [form, setForm] = useState<SupervisorSalesAccountRecord>({ ...record });
  const [activeStep, setActiveStep] = useState<SalesAccountStep>('shift_info');
  const [viewMode, setViewMode] = useState<'step' | 'full'>('step');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Sync with prop changes
  useEffect(() => {
    if (record) {
      setForm({ ...record });
    }
  }, [record]);

  if (!isOpen) return null;

  const summary = computeSupervisorSalesSummary(form);
  const isAccountClosed = form.accountState === 'closed';

  const formatGhc = (val: number) => {
    return (val || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleUpdateForm = (updated: Partial<SupervisorSalesAccountRecord>) => {
    setForm((prev) => ({
      ...prev,
      ...updated,
    }));
  };

  const handleSave = () => {
    const updated: SupervisorSalesAccountRecord = {
      ...form,
      actualCashCounted: summary.actualCashCounted,
      status: summary.status,
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleCloseAccount = () => {
    const now = new Date().toISOString();
    const updated: SupervisorSalesAccountRecord = {
      ...form,
      accountState: 'closed',
      endDate: form.endDate || now.slice(0, 10),
      closedAt: now,
      closedBySupervisor: supervisorName,
      actualCashCounted: summary.actualCashCounted,
      status: summary.status,
      updatedAt: now,
    };
    setForm(updated);
    onSave(updated);
    setShowCloseModal(false);
    setSaveSuccess(true);
  };

  const handleReopenAccount = () => {
    const updated: SupervisorSalesAccountRecord = {
      ...form,
      accountState: 'open',
      endDate: undefined,
      closedAt: undefined,
      closedBySupervisor: undefined,
      updatedAt: new Date().toISOString(),
    };
    setForm(updated);
    onSave(updated);
  };

  // 11 Core Steps + Print Slip Definition
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
      title: '1. Shift Information',
      shortTitle: '1. Shift Info',
      icon: Calendar,
      badge: form.date || 'Today',
    },
    {
      id: 'super_pms',
      num: 2,
      title: '2. Super / PMS',
      shortTitle: '2. Super PMS',
      icon: Fuel,
      badge: `${formatGhc(summary.fuelBreakdown?.superLitres || 0)} L`,
    },
    {
      id: 'diesel_ago',
      num: 3,
      title: '3. Diesel / AGO',
      shortTitle: '3. Diesel AGO',
      icon: Fuel,
      badge: `${formatGhc(summary.fuelBreakdown?.dieselLitres || 0)} L`,
    },
    {
      id: 'ron95',
      num: 4,
      title: '4. RON 95',
      shortTitle: '4. RON 95',
      icon: Fuel,
      badge: `${formatGhc(summary.fuelBreakdown?.ron95Litres || 0)} L`,
    },
    {
      id: 'lubricants',
      num: 5,
      title: '5. Lubricants',
      shortTitle: '5. Lubricants',
      icon: Droplet,
      badge: `${summary.totalLubeUnitsSold || 0} Units`,
    },
    {
      id: 'stock_account',
      num: 6,
      title: '6. Stock Account',
      shortTitle: '6. Stock Dips',
      icon: Cylinder,
      badge: 'Dips Audit',
    },
    {
      id: 'total_sales',
      num: 7,
      title: '7. Total Station Sales',
      shortTitle: '7. Total Sales',
      icon: TrendingUp,
      badge: `GH₵ ${formatGhc(summary.grossSales || 0)}`,
    },
    {
      id: 'drawings',
      num: 8,
      title: '8. Account / Drawings',
      shortTitle: '8. Drawings',
      icon: CreditCard,
      badge: `GH₵ ${formatGhc(summary.categoryA_approvedCredit + summary.categoryB_evalues)}`,
    },
    {
      id: 'expenses',
      num: 9,
      title: '9. Other Payments / Expenses',
      shortTitle: '9. Expenses',
      icon: Receipt,
      badge: `${(form.deductions || []).length} items`,
    },
    {
      id: 'cash',
      num: 10,
      title: '10. Cash Analysis',
      shortTitle: '10. Cash Count',
      icon: Banknote,
      badge: `GH₵ ${formatGhc(summary.actualCashCounted || 0)}`,
    },
    {
      id: 'reconciliation',
      num: 11,
      title: '11. Reconciliation & Close',
      shortTitle: '11. Reconcile',
      icon: ShieldCheck,
      badge:
        Math.abs(summary.netVariance) <= 0.5
          ? 'Balanced'
          : `Var: GH₵ ${formatGhc(summary.netVariance)}`,
    },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === activeStep);

  const goToNextStep = () => {
    if (currentStepIndex >= 0 && currentStepIndex < steps.length - 1) {
      setActiveStep(steps[currentStepIndex + 1].id);
    }
  };

  const goToPrevStep = () => {
    if (currentStepIndex > 0) {
      setActiveStep(steps[currentStepIndex - 1].id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-[#1d2023] border border-[#333739] rounded-2xl w-full max-w-7xl max-h-[96vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* MODAL HEADER */}
        <div className="p-4 sm:px-6 bg-[#15171a] border-b border-[#333739] flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e8b93b]/10 border border-[#e8b93b]/30 flex items-center justify-center text-[#e8b93b] shrink-0">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[#e8b93b]/15 text-[#e8b93b] border border-[#e8b93b]/30">
                  SUPERVISOR SALES ACCOUNT
                </span>
                <span className="text-[11px] font-mono text-[#8d9195]">
                  {form.station || stationName} ({form.stationCode || stationCode})
                </span>
                {form.isMultiDay && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    📅 Multi-Day Shift ({form.daysOpen || 1} Days)
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-bold text-[#ece8e0] font-['Space_Grotesk'] flex items-center gap-2 mt-0.5">
                {form.supervisorName || supervisorName} — {form.shiftType || 'Day Shift'} ({form.date})
              </h2>
            </div>
          </div>

          {/* TOP ACTIONS */}
          <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center">
            {/* View Mode Toggle: Single Section Wizard vs All Sections Sheet */}
            <div className="flex items-center bg-[#23262a] p-0.5 rounded-xl border border-[#333739]">
              <button
                type="button"
                onClick={() => {
                  setViewMode('step');
                  if (activeStep === 'print') setActiveStep('shift_info');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'step' && activeStep !== 'print'
                    ? 'bg-[#e8b93b] text-stone-900 shadow-xs'
                    : 'text-[#8d9195] hover:text-[#ece8e0]'
                }`}
              >
                <Layers size={13} />
                <span>Wizard View</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('full');
                  if (activeStep === 'print') setActiveStep('shift_info');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'full' && activeStep !== 'print'
                    ? 'bg-[#e8b93b] text-stone-900 shadow-xs'
                    : 'text-[#8d9195] hover:text-[#ece8e0]'
                }`}
              >
                <ListOrdered size={13} />
                <span>Full Ledger Sheet</span>
              </button>
            </div>

            {/* Print Official Slip */}
            <button
              type="button"
              onClick={() => setActiveStep('print')}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeStep === 'print'
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-[#23262a] text-[#ece8e0] border-[#333739] hover:bg-[#2d3136]'
              }`}
              title="Official Printable Statement"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Official Slip</span>
            </button>

            {/* Save Button */}
            {!isAccountClosed && (
              <button
                type="button"
                onClick={handleSave}
                className="px-3.5 py-2 rounded-xl bg-[#23262a] hover:bg-[#2d3136] border border-[#333739] text-[#ece8e0] text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <Save size={14} className="text-[#e8b93b]" />
                <span className="hidden sm:inline">Save Draft</span>
              </button>
            )}

            {/* Close / Reopen Trigger */}
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
                className="px-3.5 py-2 rounded-xl bg-[#e8b93b] hover:bg-[#d8a82b] text-stone-900 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <Lock size={14} />
                <span>Close Account</span>
              </button>
            )}

            {/* Close Modal X */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#8d9195] hover:text-[#ece8e0] hover:bg-[#23262a] transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* SAVE SUCCESS BANNER */}
        {saveSuccess && (
          <div className="bg-emerald-950/90 border-b border-emerald-800 text-emerald-300 text-xs py-2 px-6 flex items-center justify-between animate-fade-in shrink-0">
            <span className="flex items-center gap-2 font-bold">
              <CheckCircle2 size={16} className="text-emerald-400" />
              Supervisor Sales Account changes saved successfully.
            </span>
          </div>
        )}

        {/* SECTION NAVIGATION PILLS (1 to 11) */}
        {activeStep !== 'print' && (
          <div className="bg-[#15171a] px-3 sm:px-6 py-2 border-b border-[#333739] overflow-x-auto flex items-center gap-1.5 shrink-0 scrollbar-thin">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id && viewMode === 'step';
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    setActiveStep(step.id);
                    if (viewMode === 'full') {
                      // Smooth scroll to anchor in full mode
                      const el = document.getElementById(`section-${step.id}`);
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#e8b93b] text-stone-900 shadow-md'
                      : 'bg-[#1d2023] text-[#8d9195] hover:text-[#ece8e0] hover:bg-[#23262a] border border-[#333739]'
                  }`}
                >
                  <Icon size={13} className={isActive ? 'text-stone-900' : 'text-[#8d9195]'} />
                  <span>{step.shortTitle}</span>
                  {step.badge && (
                    <span
                      className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono ${
                        isActive
                          ? 'bg-black/20 text-stone-900 font-bold'
                          : 'bg-[#15171a] text-[#8d9195]'
                      }`}
                    >
                      {step.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* MODAL BODY (SCROLLABLE) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#15171a] space-y-5">
          {activeStep === 'print' ? (
            <SupervisorPrintSection
              form={form}
              formatGhc={formatGhc}
              summary={summary}
              supervisorName={supervisorName}
              stationName={stationName}
              stationCode={stationCode}
              onBackToLedger={() => setActiveStep('reconciliation')}
            />
          ) : viewMode === 'step' ? (
            /* WIZARD STEP-BY-STEP VIEW */
            <div className="space-y-4">
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

              {activeStep === 'super_pms' && (
                <SupervisorFuelProductSection
                  sectionNumber={2}
                  fuelType="super"
                  title="Super / PMS"
                  subtitle="Premium Motor Spirit dispenser meters, RTT & net sales volume."
                  defaultPrice={13.9}
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                  disabled={isAccountClosed}
                />
              )}

              {activeStep === 'diesel_ago' && (
                <SupervisorFuelProductSection
                  sectionNumber={3}
                  fuelType="diesel"
                  title="Diesel / AGO"
                  subtitle="Automotive Gas Oil dispenser meters, RTT & net sales volume."
                  defaultPrice={14.65}
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                  disabled={isAccountClosed}
                />
              )}

              {activeStep === 'ron95' && (
                <SupervisorFuelProductSection
                  sectionNumber={4}
                  fuelType="ron95"
                  title="RON 95 (V-Power)"
                  subtitle="High octane premium fuel dispenser meters, RTT & net sales volume."
                  defaultPrice={15.4}
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                  disabled={isAccountClosed}
                />
              )}

              {activeStep === 'lubricants' && (
                <SupervisorLubesSection
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                  disabled={isAccountClosed}
                />
              )}

              {activeStep === 'stock_account' && (
                <SupervisorStockAccountSection
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                  summary={summary}
                  disabled={isAccountClosed}
                />
              )}

              {activeStep === 'total_sales' && (
                <SupervisorTotalStationSalesSection
                  form={form}
                  formatGhc={formatGhc}
                  summary={summary}
                />
              )}

              {activeStep === 'drawings' && (
                <SupervisorDrawingsSection
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                  disabled={isAccountClosed}
                />
              )}

              {activeStep === 'expenses' && (
                <SupervisorOtherExpensesSection
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                  summary={summary}
                  disabled={isAccountClosed}
                />
              )}

              {activeStep === 'cash' && (
                <SupervisorCashSection
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                />
              )}

              {activeStep === 'reconciliation' && (
                <SupervisorReconciliationSection
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                  summary={summary}
                  supervisorName={supervisorName}
                  stationName={stationName}
                  stationCode={stationCode}
                  isAccountClosed={isAccountClosed}
                  onReopenAccount={handleReopenAccount}
                  onRequestCloseAccount={() => setShowCloseModal(true)}
                  onRequestDelete={onDelete ? () => setShowDeleteConfirm(true) : undefined}
                  onSwitchToPrint={() => setActiveStep('print')}
                />
              )}
            </div>
          ) : (
            /* FULL LEDGER VIEW: ALL 11 SECTIONS SEQUENTIALLY */
            <div className="space-y-6">
              <div id="section-shift_info">
                <SupervisorShiftInfoSection
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  supervisorName={supervisorName}
                  stationName={stationName}
                  stationCode={stationCode}
                  disabled={isAccountClosed}
                />
              </div>

              <div id="section-super_pms">
                <SupervisorFuelProductSection
                  sectionNumber={2}
                  fuelType="super"
                  title="Super / PMS"
                  subtitle="Premium Motor Spirit dispenser meters, RTT & net sales volume."
                  defaultPrice={13.9}
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                  disabled={isAccountClosed}
                />
              </div>

              <div id="section-diesel_ago">
                <SupervisorFuelProductSection
                  sectionNumber={3}
                  fuelType="diesel"
                  title="Diesel / AGO"
                  subtitle="Automotive Gas Oil dispenser meters, RTT & net sales volume."
                  defaultPrice={14.65}
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                  disabled={isAccountClosed}
                />
              </div>

              <div id="section-ron95">
                <SupervisorFuelProductSection
                  sectionNumber={4}
                  fuelType="ron95"
                  title="RON 95 (V-Power)"
                  subtitle="High octane premium fuel dispenser meters, RTT & net sales volume."
                  defaultPrice={15.4}
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                  disabled={isAccountClosed}
                />
              </div>

              <div id="section-lubricants">
                <SupervisorLubesSection
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                  disabled={isAccountClosed}
                />
              </div>

              <div id="section-stock_account">
                <SupervisorStockAccountSection
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                  summary={summary}
                  disabled={isAccountClosed}
                />
              </div>

              <div id="section-total_sales">
                <SupervisorTotalStationSalesSection
                  form={form}
                  formatGhc={formatGhc}
                  summary={summary}
                />
              </div>

              <div id="section-drawings">
                <SupervisorDrawingsSection
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                  disabled={isAccountClosed}
                />
              </div>

              <div id="section-expenses">
                <SupervisorOtherExpensesSection
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                  summary={summary}
                  disabled={isAccountClosed}
                />
              </div>

              <div id="section-cash">
                <SupervisorCashSection
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                />
              </div>

              <div id="section-reconciliation">
                <SupervisorReconciliationSection
                  form={form}
                  onUpdateForm={handleUpdateForm}
                  formatGhc={formatGhc}
                  summary={summary}
                  supervisorName={supervisorName}
                  stationName={stationName}
                  stationCode={stationCode}
                  isAccountClosed={isAccountClosed}
                  onReopenAccount={handleReopenAccount}
                  onRequestCloseAccount={() => setShowCloseModal(true)}
                  onRequestDelete={onDelete ? () => setShowDeleteConfirm(true) : undefined}
                  onSwitchToPrint={() => setActiveStep('print')}
                />
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER NAVIGATION (FOR WIZARD MODE) */}
        {activeStep !== 'print' && viewMode === 'step' && (
          <div className="p-3.5 sm:px-6 bg-[#15171a] border-t border-[#333739] flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              disabled={currentStepIndex <= 0}
              onClick={goToPrevStep}
              className="py-2 px-4 rounded-xl border border-[#333739] bg-[#23262a] hover:bg-[#2d3136] text-[#ece8e0] text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft size={16} />
              <span>Previous Section</span>
            </button>

            {/* SUMMARY QUICK INDICATOR */}
            <div className="hidden sm:flex items-center gap-3 text-xs font-mono">
              <span className="text-[#8d9195]">Gross Sales:</span>
              <span className="text-[#ece8e0] font-bold">
                GH₵ {formatGhc(summary.grossSales)}
              </span>
              <span className="text-stone-600">|</span>
              <span className="text-[#8d9195]">Expected Cash:</span>
              <span className="text-[#e8b93b] font-bold">
                GH₵ {formatGhc(summary.expectedCashToBank)}
              </span>
              <span className="text-stone-600">|</span>
              <span
                className={`font-bold ${
                  Math.abs(summary.netVariance) <= 0.5
                    ? 'text-emerald-400'
                    : summary.netVariance < 0
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {Math.abs(summary.netVariance) <= 0.5
                  ? 'Balanced'
                  : `Var: GH₵ ${formatGhc(summary.netVariance)}`}
              </span>
            </div>

            {currentStepIndex < steps.length - 1 ? (
              <button
                type="button"
                onClick={goToNextStep}
                className="py-2 px-5 rounded-xl bg-[#e8b93b] hover:bg-[#d8a82b] text-stone-900 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <span>Next Section</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveStep('print')}
                className="py-2 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
              >
                <Eye size={15} />
                <span>Review & Print</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* CONFIRM CLOSE ACCOUNT MODAL */}
      {showCloseModal && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#191c1f] border border-[#333739] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-[#e8b93b]/15 border border-[#e8b93b]/30 flex items-center justify-center text-[#e8b93b] mx-auto">
              <Lock className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-[#ece8e0] font-['Space_Grotesk']">
                Close & Lock Supervisor Sales Account?
              </h3>
              <p className="text-xs text-[#8d9195]">
                This will finalize shift sales for <b>{form.station || stationName}</b> on <b>{form.date}</b>.
              </p>
            </div>

            {/* SUMMARY STATS IN CONFIRMATION */}
            <div className="bg-[#15171a] border border-[#333739] rounded-xl p-3 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-[#8d9195]">Total Fuel Sales:</span>
                <span className="text-[#ece8e0] font-bold">
                  GH₵ {formatGhc(summary.totalFuelSales)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8d9195]">Lubricants Sales:</span>
                <span className="text-amber-300 font-bold">
                  GH₵ {formatGhc(summary.totalLubeSales)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8d9195]">Total Drawings/Expenses:</span>
                <span className="text-rose-300 font-bold">
                  GH₵ {formatGhc(summary.totalDeductions)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#333739] pt-1 text-sm font-bold">
                <span className="text-[#e8b93b]">Expected Safe Drop:</span>
                <span className="text-[#e8b93b]">
                  GH₵ {formatGhc(summary.expectedCashToBank)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-[#8d9195]">Physical Cash Counted:</span>
                <span className="text-emerald-400">
                  GH₵ {formatGhc(summary.actualCashCounted)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#333739]">
                <span className="text-[#8d9195]">Reconciliation Result:</span>
                <span
                  className={`font-bold ${
                    Math.abs(summary.netVariance) <= 0.5
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {Math.abs(summary.netVariance) <= 0.5
                    ? 'BALANCED'
                    : `SHORTAGE / VARIANCE: GH₵ ${formatGhc(summary.netVariance)}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#333739] bg-[#23262a] hover:bg-[#2d3136] text-xs font-bold text-[#ece8e0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCloseAccount}
                className="flex-1 py-2.5 rounded-xl bg-[#e8b93b] hover:bg-[#d8a82b] text-stone-900 text-xs font-extrabold cursor-pointer shadow-md"
              >
                Confirm & Lock Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#191c1f] border border-rose-900/60 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-800 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-[#ece8e0] font-['Space_Grotesk']">
                Delete Sales Account Record?
              </h3>
              <p className="text-xs text-[#8d9195]">
                This will permanently delete this supervisor sales account. Type <b>DELETE</b> to confirm.
              </p>
            </div>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full bg-[#15171a] border border-[#333739] focus:border-rose-500 rounded-xl px-3 py-2 text-xs text-center font-mono font-bold text-[#ece8e0]"
            />

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-[#333739] bg-[#23262a] text-xs font-bold text-[#ece8e0] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== 'DELETE'}
                onClick={() => {
                  if (onDelete && form.id) {
                    onDelete(form.id);
                    onClose();
                  }
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
