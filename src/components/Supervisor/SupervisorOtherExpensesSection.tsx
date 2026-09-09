import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Sparkles,
} from 'lucide-react';
import {
  SupervisorSalesAccountRecord,
  SupervisorDeductionEntry,
  SUPERVISOR_DEDUCTION_CATEGORIES,
  SupervisorDeductionType,
} from '../../types';

interface SupervisorOtherExpensesSectionProps {
  form: SupervisorSalesAccountRecord;
  onUpdateForm: (updated: Partial<SupervisorSalesAccountRecord>) => void;
  formatGhc: (val: number) => string;
  summary: any;
  disabled?: boolean;
}

export const SupervisorOtherExpensesSection: React.FC<SupervisorOtherExpensesSectionProps> = ({
  form,
  onUpdateForm,
  formatGhc,
  summary,
  disabled = false,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<SupervisorDeductionType | 'all'>('all');

  const deductions = form.deductions || [];

  const handleAddDeduction = (type: SupervisorDeductionType = 'operational_expenses') => {
    const catDef = SUPERVISOR_DEDUCTION_CATEGORIES.find((c) => c.type === type);
    const newEntry: SupervisorDeductionEntry = {
      id: 'sded_' + Date.now(),
      type,
      categoryLabel: catDef?.label || 'Operational expenses',
      description: '',
      date: form.date || new Date().toISOString().slice(0, 10),
      reference: 'EXP-' + Date.now().toString().slice(-4),
      amount: 50,
      approval: {
        approved: true,
        approvedBy: 'Station Supervisor',
        approvalDate: form.date,
      },
    };
    onUpdateForm({ deductions: [...deductions, newEntry] });
  };

  const handleUpdateDeduction = (
    id: string,
    field: keyof SupervisorDeductionEntry,
    val: any
  ) => {
    const updated = deductions.map((d) => {
      if (d.id !== id) return d;
      const next = { ...d, [field]: val };
      if (field === 'type') {
        const catDef = SUPERVISOR_DEDUCTION_CATEGORIES.find((c) => c.type === val);
        if (catDef) {
          next.categoryLabel = catDef.label;
        }
      }
      return next;
    });
    onUpdateForm({ deductions: updated });
  };

  const handleRemoveDeduction = (id: string) => {
    onUpdateForm({ deductions: deductions.filter((d) => d.id !== id) });
  };

  const filteredDeductions =
    selectedCategory === 'all'
      ? deductions
      : deductions.filter((d) => d.type === selectedCategory);

  const totalOtherExpenses = deductions.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

  return (
    <div className="bg-[#191c1f] rounded-2xl border border-[#333739] p-4 sm:p-5 space-y-4">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#333739] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-[#e8b93b]/15 text-[#e8b93b] flex items-center justify-center font-mono font-bold text-xs border border-[#e8b93b]/30">
            9
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-[#ece8e0] uppercase tracking-wide flex items-center gap-2 font-['Space_Grotesk']">
                <Receipt className="w-4 h-4 text-[#e8b93b]" />
                9. Other Payments / Expenses & Vouchers
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-purple-500/10 text-purple-300 border-purple-500/30">
                {deductions.length} Expense Items
              </span>
            </div>
            <p className="text-xs text-[#8d9195]">
              Vouchers, Claim Codes, R-Pay, Tingg, Visa, Water Bills, Genset, and Operational Station Expenses.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 px-3 rounded-xl bg-[#15171a] border border-[#333739] text-right">
            <span className="text-[10.5px] text-[#8d9195] block">Total Other Expenses:</span>
            <span className="text-sm sm:text-base font-bold font-mono text-[#e8b93b]">
              GH₵ {formatGhc(totalOtherExpenses)}
            </span>
          </div>

          {!disabled && (
            <button
              type="button"
              onClick={() => handleAddDeduction('operational_expenses')}
              className="py-2 px-3.5 rounded-xl bg-[#e8b93b] hover:bg-[#d8a82b] text-stone-900 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus size={14} />
              <span>+ Add Expense</span>
            </button>
          )}
        </div>
      </div>

      {/* CATEGORY FILTER PILLS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
            selectedCategory === 'all'
              ? 'bg-[#e8b93b] text-stone-900 font-bold'
              : 'bg-[#15171a] text-[#8d9195] border border-[#333739] hover:text-[#ece8e0]'
          }`}
        >
          All ({deductions.length})
        </button>
        {SUPERVISOR_DEDUCTION_CATEGORIES.map((cat) => {
          const count = deductions.filter((d) => d.type === cat.type).length;
          return (
            <button
              key={cat.type}
              type="button"
              onClick={() => setSelectedCategory(cat.type)}
              className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap cursor-pointer transition-colors ${
                selectedCategory === cat.type
                  ? 'bg-[#2a2e33] text-[#ece8e0] border border-[#e8b93b] font-bold'
                  : 'bg-[#15171a] text-[#8d9195] border border-[#333739] hover:text-[#ece8e0]'
              }`}
            >
              {cat.label} {count > 0 && <span className="font-mono text-amber-400">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* EXPENSES LIST */}
      {filteredDeductions.length === 0 ? (
        <div className="bg-[#15171a] rounded-xl p-8 text-center border border-[#333739] space-y-2">
          <p className="text-xs text-[#8d9195] italic">
            No expenses or payment vouchers recorded under this category for this shift.
          </p>
          {!disabled && (
            <button
              type="button"
              onClick={() => handleAddDeduction(selectedCategory === 'all' ? 'operational_expenses' : selectedCategory)}
              className="text-xs text-[#e8b93b] font-bold hover:underline cursor-pointer"
            >
              + Click to add new expense entry
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredDeductions.map((d) => (
            <div
              key={d.id}
              className="bg-[#15171a] border border-[#333739] rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
                {/* Category Select */}
                <div>
                  <label className="text-[10px] text-[#8d9195] block mb-0.5">Category</label>
                  <select
                    disabled={disabled}
                    value={d.type}
                    onChange={(e) =>
                      handleUpdateDeduction(d.id, 'type', e.target.value as SupervisorDeductionType)
                    }
                    className="w-full bg-[#191c1f] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-[#ece8e0]"
                  >
                    {SUPERVISOR_DEDUCTION_CATEGORIES.map((c) => (
                      <option key={c.type} value={c.type}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] text-[#8d9195] block mb-0.5">Description / Purpose</label>
                  <input
                    type="text"
                    disabled={disabled}
                    value={d.description || ''}
                    onChange={(e) => handleUpdateDeduction(d.id, 'description', e.target.value)}
                    placeholder="e.g. Station cleaning supplies / Utility"
                    className="w-full bg-[#191c1f] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-[#ece8e0]"
                  />
                </div>

                {/* Reference */}
                <div>
                  <label className="text-[10px] text-[#8d9195] block mb-0.5">Voucher / Receipt Ref</label>
                  <input
                    type="text"
                    disabled={disabled}
                    value={d.reference || ''}
                    onChange={(e) => handleUpdateDeduction(d.id, 'reference', e.target.value)}
                    placeholder="Voucher #"
                    className="w-full bg-[#191c1f] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-[#ece8e0] font-mono"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="text-[10px] text-[#8d9195] block mb-0.5">Amount (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={disabled}
                    value={d.amount || ''}
                    onChange={(e) =>
                      handleUpdateDeduction(d.id, 'amount', parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                    className="w-full bg-[#191c1f] border border-[#e8b93b]/40 rounded-lg px-2.5 py-1.5 text-xs text-[#e8b93b] font-mono text-right font-bold"
                  />
                </div>
              </div>

              {!disabled && (
                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveDeduction(d.id)}
                    className="p-1.5 text-rose-400 hover:bg-rose-950/40 rounded-lg cursor-pointer"
                    title="Delete entry"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
