import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  Trash2,
  Building,
  Fuel,
  Wallet,
  Landmark,
  FileText,
} from 'lucide-react';
import {
  SupervisorSalesAccountRecord,
  CreditEntry,
  EvalueEntry,
  GeneratorEntry,
} from '../../types';

interface SupervisorDrawingsSectionProps {
  form: SupervisorSalesAccountRecord;
  onUpdateForm: (updated: Partial<SupervisorSalesAccountRecord>) => void;
  formatGhc: (val: number) => string;
  disabled?: boolean;
}

export const SupervisorDrawingsSection: React.FC<SupervisorDrawingsSectionProps> = ({
  form,
  onUpdateForm,
  formatGhc,
  disabled = false,
}) => {
  const [activeTab, setActiveTab] = useState<'approved' | 'evalue' | 'collections' | 'generator'>('approved');

  // Approved Credit
  const handleAddApproved = () => {
    const newItem: CreditEntry = {
      id: 'appr_' + Date.now(),
      customer: 'Corporate Fleet Account',
      reference: 'LPO-' + Date.now().toString().slice(-4),
      amount: 500,
    };
    onUpdateForm({
      approvedCredit: [...(form.approvedCredit || []), newItem as any],
    });
  };

  const handleUpdateApproved = (id: string, field: string, val: any) => {
    const updated = (form.approvedCredit || []).map((c: any) => {
      if (c.id === id) {
        return { ...c, [field]: field === 'amount' ? Math.max(0, Number(val) || 0) : val };
      }
      return c;
    });
    onUpdateForm({ approvedCredit: updated });
  };

  const handleRemoveApproved = (id: string) => {
    onUpdateForm({
      approvedCredit: (form.approvedCredit || []).filter((c: any) => c.id !== id),
    });
  };

  // E-Values / Drawings
  const handleAddEvalue = () => {
    const newItem: EvalueEntry = {
      id: 'eval_' + Date.now(),
      channel: 'MoMo',
      bank: 'Forecourt Merchant',
      reference: 'TXN-' + Date.now().toString().slice(-4),
      amount: 1000,
    };
    onUpdateForm({
      evalues: [...(form.evalues || []), newItem as any],
    });
  };

  const handleUpdateEvalue = (id: string, field: string, val: any) => {
    const updated = (form.evalues || []).map((e: any) => {
      if (e.id === id) {
        return { ...e, [field]: field === 'amount' ? Math.max(0, Number(val) || 0) : val };
      }
      return e;
    });
    onUpdateForm({ evalues: updated });
  };

  const handleRemoveEvalue = (id: string) => {
    onUpdateForm({
      evalues: (form.evalues || []).filter((e: any) => e.id !== id),
    });
  };

  // Credit Collections
  const handleAddCollection = () => {
    const newItem = {
      id: 'col_' + Date.now(),
      customer: 'Debtor Recovery Client',
      receiptRef: 'RCP-' + Date.now().toString().slice(-4),
      amount: 500,
      notes: 'Cash payment against past credit invoice',
    };
    onUpdateForm({
      creditCollections: [...(form.creditCollections || []), newItem as any],
    });
  };

  const handleUpdateCollection = (id: string, field: string, val: any) => {
    const updated = (form.creditCollections || []).map((col: any) => {
      if (col.id === id) {
        return { ...col, [field]: field === 'amount' ? Math.max(0, Number(val) || 0) : val };
      }
      return col;
    });
    onUpdateForm({ creditCollections: updated });
  };

  const handleRemoveCollection = (id: string) => {
    onUpdateForm({
      creditCollections: (form.creditCollections || []).filter((col: any) => col.id !== id),
    });
  };

  // Subtotals
  const totalApproved = (form.approvedCredit || []).reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0);
  const totalEvalues = (form.evalues || []).reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);
  const totalCollections = (form.creditCollections || []).reduce((acc: number, col: any) => acc + (Number(col.amount) || 0), 0);
  const totalGenFuel = (form.deductions || []).filter(d => d.type === 'genset_expenses').reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

  const grandTotalDrawings = totalApproved + totalEvalues + totalGenFuel;

  return (
    <div className="bg-[#191c1f] rounded-2xl border border-[#333739] p-4 sm:p-5 space-y-4">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#333739] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-[#e8b93b]/15 text-[#e8b93b] flex items-center justify-center font-mono font-bold text-xs border border-[#e8b93b]/30">
            8
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-[#ece8e0] uppercase tracking-wide flex items-center gap-2 font-['Space_Grotesk']">
                <CreditCard className="w-4 h-4 text-[#e8b93b]" />
                8. Account / Drawings
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-amber-500/10 text-amber-300 border-amber-500/30">
                Authorized Shift Deductions
              </span>
            </div>
            <p className="text-xs text-[#8d9195]">
              Record Approved Credit Sales, E-Value/Drawings, Credit Sales Collections, and Generator Fuel.
            </p>
          </div>
        </div>

        <div className="p-2 px-3.5 rounded-xl bg-[#15171a] border border-[#333739] flex items-center gap-3">
          <span className="text-xs text-[#8d9195]">Total Drawings:</span>
          <span className="text-sm sm:text-base font-bold font-mono text-[#e8b93b]">
            GH₵ {formatGhc(grandTotalDrawings)}
          </span>
        </div>
      </div>

      {/* SUB-CATEGORY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div
          onClick={() => setActiveTab('approved')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'approved'
              ? 'bg-[#23262a] border-[#e8b93b] text-[#ece8e0]'
              : 'bg-[#15171a] border-[#333739] text-[#8d9195] hover:border-stone-600'
          }`}
        >
          <span className="text-[10px] uppercase font-bold block">Approved Credit</span>
          <span className="text-sm font-bold font-mono text-[#ece8e0]">
            GH₵ {formatGhc(totalApproved)}
          </span>
        </div>

        <div
          onClick={() => setActiveTab('evalue')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'evalue'
              ? 'bg-[#23262a] border-[#e8b93b] text-[#ece8e0]'
              : 'bg-[#15171a] border-[#333739] text-[#8d9195] hover:border-stone-600'
          }`}
        >
          <span className="text-[10px] uppercase font-bold block">E-Value / Drawings</span>
          <span className="text-sm font-bold font-mono text-blue-300">
            GH₵ {formatGhc(totalEvalues)}
          </span>
        </div>

        <div
          onClick={() => setActiveTab('collections')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'collections'
              ? 'bg-[#23262a] border-[#e8b93b] text-[#ece8e0]'
              : 'bg-[#15171a] border-[#333739] text-[#8d9195] hover:border-stone-600'
          }`}
        >
          <span className="text-[10px] uppercase font-bold block">Credit Collection</span>
          <span className="text-sm font-bold font-mono text-emerald-400">
            +GH₵ {formatGhc(totalCollections)}
          </span>
        </div>

        <div
          onClick={() => setActiveTab('generator')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'generator'
              ? 'bg-[#23262a] border-[#e8b93b] text-[#ece8e0]'
              : 'bg-[#15171a] border-[#333739] text-[#8d9195] hover:border-stone-600'
          }`}
        >
          <span className="text-[10px] uppercase font-bold block">Generator Fuel</span>
          <span className="text-sm font-bold font-mono text-amber-300">
            GH₵ {formatGhc(totalGenFuel)}
          </span>
        </div>
      </div>

      {/* ACTIVE SUBSECTION CONTENT */}
      <div className="bg-[#15171a] border border-[#333739] rounded-xl p-4 space-y-3">
        {/* Approved Credit Tab */}
        {activeTab === 'approved' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#ece8e0] uppercase flex items-center gap-2">
                <Building size={14} className="text-[#e8b93b]" />
                Approved Credit Sales ({(form.approvedCredit || []).length} Entries)
              </h4>
              {!disabled && (
                <button
                  type="button"
                  onClick={handleAddApproved}
                  className="py-1 px-3 rounded-lg bg-[#23262a] hover:bg-[#2a2e33] border border-[#333739] text-[#ece8e0] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Add Credit Sale
                </button>
              )}
            </div>

            {(form.approvedCredit || []).length === 0 ? (
              <p className="text-xs text-[#8d9195] italic py-2">No approved credit sales recorded.</p>
            ) : (
              <div className="space-y-2">
                {(form.approvedCredit || []).map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 bg-[#191c1f] p-2.5 rounded-lg border border-[#333739]">
                    <input
                      type="text"
                      disabled={disabled}
                      value={c.customer || ''}
                      onChange={(e) => handleUpdateApproved(c.id, 'customer', e.target.value)}
                      placeholder="Customer / Company Name"
                      className="flex-1 bg-[#15171a] border border-[#333739] rounded px-2 py-1 text-xs text-[#ece8e0]"
                    />
                    <input
                      type="text"
                      disabled={disabled}
                      value={c.reference || ''}
                      onChange={(e) => handleUpdateApproved(c.id, 'reference', e.target.value)}
                      placeholder="LPO / Invoice Ref"
                      className="w-32 bg-[#15171a] border border-[#333739] rounded px-2 py-1 text-xs text-[#ece8e0] font-mono"
                    />
                    <input
                      type="number"
                      step="0.01"
                      disabled={disabled}
                      value={c.amount || ''}
                      onChange={(e) => handleUpdateApproved(c.id, 'amount', e.target.value)}
                      placeholder="Amount"
                      className="w-28 bg-[#15171a] border border-[#333739] rounded px-2 py-1 text-xs text-[#ece8e0] font-mono text-right font-bold"
                    />
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleRemoveApproved(c.id)}
                        className="p-1 text-rose-400 hover:bg-rose-950/40 rounded cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* E-Value Tab */}
        {activeTab === 'evalue' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#ece8e0] uppercase flex items-center gap-2">
                <Wallet size={14} className="text-blue-400" />
                E-Value / Digital Drawings ({(form.evalues || []).length} Entries)
              </h4>
              {!disabled && (
                <button
                  type="button"
                  onClick={handleAddEvalue}
                  className="py-1 px-3 rounded-lg bg-[#23262a] hover:bg-[#2a2e33] border border-[#333739] text-[#ece8e0] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Add E-Value Entry
                </button>
              )}
            </div>

            {(form.evalues || []).length === 0 ? (
              <p className="text-xs text-[#8d9195] italic py-2">No electronic drawings recorded.</p>
            ) : (
              <div className="space-y-2">
                {(form.evalues || []).map((e: any) => (
                  <div key={e.id} className="flex items-center gap-2 bg-[#191c1f] p-2.5 rounded-lg border border-[#333739]">
                    <select
                      disabled={disabled}
                      value={e.channel || 'MoMo'}
                      onChange={(ev) => handleUpdateEvalue(e.id, 'channel', ev.target.value)}
                      className="w-28 bg-[#15171a] border border-[#333739] rounded px-2 py-1 text-xs text-[#ece8e0]"
                    >
                      <option value="MoMo">MTN MoMo</option>
                      <option value="Telecel">Telecel Cash</option>
                      <option value="POS">Bank POS</option>
                      <option value="StarCard">StarCard</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                    <input
                      type="text"
                      disabled={disabled}
                      value={e.bank || ''}
                      onChange={(ev) => handleUpdateEvalue(e.id, 'bank', ev.target.value)}
                      placeholder="Bank / Merchant Terminal"
                      className="flex-1 bg-[#15171a] border border-[#333739] rounded px-2 py-1 text-xs text-[#ece8e0]"
                    />
                    <input
                      type="text"
                      disabled={disabled}
                      value={e.reference || ''}
                      onChange={(ev) => handleUpdateEvalue(e.id, 'reference', ev.target.value)}
                      placeholder="Transaction Ref"
                      className="w-28 bg-[#15171a] border border-[#333739] rounded px-2 py-1 text-xs text-[#ece8e0] font-mono"
                    />
                    <input
                      type="number"
                      step="0.01"
                      disabled={disabled}
                      value={e.amount || ''}
                      onChange={(ev) => handleUpdateEvalue(e.id, 'amount', ev.target.value)}
                      placeholder="Amount"
                      className="w-28 bg-[#15171a] border border-blue-900/60 rounded px-2 py-1 text-xs text-blue-200 font-mono text-right font-bold"
                    />
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEvalue(e.id)}
                        className="p-1 text-rose-400 hover:bg-rose-950/40 rounded cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Credit Collections Tab */}
        {activeTab === 'collections' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#ece8e0] uppercase flex items-center gap-2">
                <Landmark size={14} className="text-emerald-400" />
                Credit Sales Collection from Debtors ({(form.creditCollections || []).length} Entries)
              </h4>
              {!disabled && (
                <button
                  type="button"
                  onClick={handleAddCollection}
                  className="py-1 px-3 rounded-lg bg-[#23262a] hover:bg-[#2a2e33] border border-[#333739] text-[#ece8e0] text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={12} /> Add Collection
                </button>
              )}
            </div>

            {(form.creditCollections || []).length === 0 ? (
              <p className="text-xs text-[#8d9195] italic py-2">No prior debtor credit collections recorded for this shift.</p>
            ) : (
              <div className="space-y-2">
                {(form.creditCollections || []).map((col: any) => (
                  <div key={col.id} className="flex items-center gap-2 bg-[#191c1f] p-2.5 rounded-lg border border-[#333739]">
                    <input
                      type="text"
                      disabled={disabled}
                      value={col.customer || ''}
                      onChange={(e) => handleUpdateCollection(col.id, 'customer', e.target.value)}
                      placeholder="Debtor / Client Name"
                      className="flex-1 bg-[#15171a] border border-[#333739] rounded px-2 py-1 text-xs text-[#ece8e0]"
                    />
                    <input
                      type="text"
                      disabled={disabled}
                      value={col.receiptRef || ''}
                      onChange={(e) => handleUpdateCollection(col.id, 'receiptRef', e.target.value)}
                      placeholder="Official Receipt Ref"
                      className="w-32 bg-[#15171a] border border-[#333739] rounded px-2 py-1 text-xs text-[#ece8e0] font-mono"
                    />
                    <input
                      type="number"
                      step="0.01"
                      disabled={disabled}
                      value={col.amount || ''}
                      onChange={(e) => handleUpdateCollection(col.id, 'amount', e.target.value)}
                      placeholder="Amount"
                      className="w-28 bg-[#15171a] border border-emerald-900/60 rounded px-2 py-1 text-xs text-emerald-300 font-mono text-right font-bold"
                    />
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCollection(col.id)}
                        className="p-1 text-rose-400 hover:bg-rose-950/40 rounded cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Generator Fuel Tab */}
        {activeTab === 'generator' && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#ece8e0] uppercase flex items-center gap-2">
              <Fuel size={14} className="text-amber-400" />
              Generator Fuel (Genset Operational Fuel Consumption)
            </h4>
            <div className="p-3 bg-[#191c1f] rounded-lg border border-[#333739] text-xs text-[#8d9195] space-y-2">
              <p>
                Generator fuel entries are logged under station operational expenses. Total Genset expenses for shift:
              </p>
              <div className="text-base font-bold font-mono text-amber-400">
                GH₵ {formatGhc(totalGenFuel)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
