import React from 'react';
import { Plus, Trash2, CreditCard, Building, Fuel, Wallet, AlertCircle, Landmark } from 'lucide-react';
import { ShiftRecord, PAYMENT_CHANNELS, PaymentChannel, StationConfig, CreditEntry, EvalueEntry, GeneratorEntry, ALL_GHANA_BANKS } from '../../types';
import { num, fmt, fmtPlain, generateId, sumListAmount } from '../../utils/calculations';

interface Step5AccountDrawingsProps {
  record: ShiftRecord;
  onChange: (updated: ShiftRecord) => void;
  stationConfig?: StationConfig | null;
}

export const Step5AccountDrawings: React.FC<Step5AccountDrawingsProps> = ({
  record,
  onChange,
  stationConfig,
}) => {
  const stationFavoriteBanks = stationConfig?.banks || [];

  // A. Approved Credit Sales
  const handleAddApproved = () => {
    const newItem: CreditEntry = {
      id: generateId(),
      customer: '',
      reference: '',
      amount: 0,
    };
    onChange({
      ...record,
      approved: [...record.approved, newItem],
    });
  };

  const handleUpdateApproved = (index: number, field: keyof CreditEntry, value: string | number) => {
    const list = [...record.approved];
    list[index] = {
      ...list[index],
      [field]: field === 'amount' ? num(value) : value,
    };
    onChange({ ...record, approved: list });
  };

  const handleRemoveApproved = (index: number) => {
    onChange({
      ...record,
      approved: record.approved.filter((_, i) => i !== index),
    });
  };

  // B. E-Value / Drawings
  const handleAddEvalue = () => {
    const newItem: EvalueEntry = {
      id: generateId(),
      channel: 'MoMo',
      bank: '',
      reference: '',
      amount: 0,
    };
    onChange({
      ...record,
      evalue: [...record.evalue, newItem],
    });
  };

  const handleUpdateEvalue = (index: number, field: keyof EvalueEntry, value: string | number) => {
    const list = [...record.evalue];
    list[index] = {
      ...list[index],
      [field]: field === 'amount' ? num(value) : value,
    };
    onChange({ ...record, evalue: list });
  };

  const handleRemoveEvalue = (index: number) => {
    onChange({
      ...record,
      evalue: record.evalue.filter((_, i) => i !== index),
    });
  };

  // C. Collections
  const handleAddCollection = () => {
    const newItem: CreditEntry = {
      id: generateId(),
      customer: '',
      reference: '',
      amount: 0,
    };
    onChange({
      ...record,
      collections: [...record.collections, newItem],
    });
  };

  const handleUpdateCollection = (index: number, field: keyof CreditEntry, value: string | number) => {
    const list = [...record.collections];
    list[index] = {
      ...list[index],
      [field]: field === 'amount' ? num(value) : value,
    };
    onChange({ ...record, collections: list });
  };

  const handleRemoveCollection = (index: number) => {
    onChange({
      ...record,
      collections: record.collections.filter((_, i) => i !== index),
    });
  };

  // D. Generator Fuel
  const handleAddGenerator = () => {
    const newItem: GeneratorEntry = {
      id: generateId(),
      description: 'Backup Generator fuel refill',
      amount: 0,
    };
    onChange({
      ...record,
      generator: [...record.generator, newItem],
    });
  };

  const handleUpdateGenerator = (index: number, field: keyof GeneratorEntry, value: string | number) => {
    const list = [...record.generator];
    list[index] = {
      ...list[index],
      [field]: field === 'amount' ? num(value) : value,
    };
    onChange({ ...record, generator: list });
  };

  const handleRemoveGenerator = (index: number) => {
    onChange({
      ...record,
      generator: record.generator.filter((_, i) => i !== index),
    });
  };

  const totalA = sumListAmount(record.approved);
  const totalB = sumListAmount(record.evalue);
  const totalC = sumListAmount(record.collections);
  const totalD = sumListAmount(record.generator);
  const totalDrawings = totalA + totalB + totalD;

  const commercialBanks = ALL_GHANA_BANKS.slice(0, 23);
  const otherFinancialInstitutions = ALL_GHANA_BANKS.slice(23);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-600" />
          Account &amp; Drawings
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Record credit invoices, digital payments (MoMo/Bank POS), collections, and generator fuel.
        </p>
      </div>

      {/* Category A: Approved Credit Sales */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div>
            <span className="text-xs font-bold text-stone-900 uppercase tracking-wide">
              A. Approved Credit Sales
            </span>
            <p className="text-[11px] text-stone-500">Corporate &amp; fleet customer fuel tickets</p>
          </div>
          <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
            Total (A): {fmt(totalA)}
          </span>
        </div>

        <div className="space-y-2.5">
          {record.approved.map((item, idx) => (
            <div key={item.id || idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Customer / Company (e.g. DHL Express)"
                  value={item.customer}
                  onChange={(e) => handleUpdateApproved(idx, 'customer', e.target.value)}
                  className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Invoice / Ticket #"
                    value={item.reference}
                    onChange={(e) => handleUpdateApproved(idx, 'reference', e.target.value)}
                    className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount (GHS)"
                    value={item.amount === 0 ? '' : item.amount}
                    onChange={(e) => handleUpdateApproved(idx, 'amount', e.target.value)}
                    className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-right font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRemoveApproved(idx)}
                  className="text-stone-400 hover:text-rose-600 text-[11px] flex items-center gap-1 font-semibold transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Remove Item
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddApproved}
            className="w-full py-2 border border-dashed border-stone-300 hover:border-emerald-500 rounded-xl text-xs font-semibold text-stone-600 hover:text-emerald-700 bg-stone-50/50 hover:bg-emerald-50/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Approved Credit Entry
          </button>
        </div>
      </div>

      {/* Category B: E-Value / Drawings (MoMo, Bank POS, Card) */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div>
            <span className="text-xs font-bold text-stone-900 uppercase tracking-wide">
              B. E-Value / Digital Payments
            </span>
            <p className="text-[11px] text-stone-500">Mobile Money (MTN/Telecel/AT), All Ghana Banks POS, Card</p>
          </div>
          <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
            Total (B): {fmt(totalB)}
          </span>
        </div>

        <div className="space-y-2.5">
          {record.evalue.map((item, idx) => {
            const isCustomOrRuralBank =
              item.channel === 'Bank' &&
              (item.bank === 'Other Rural / Community Bank' ||
                (item.bank && !ALL_GHANA_BANKS.includes(item.bank as any)));

            return (
              <div key={item.id || idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <select
                    value={item.channel}
                    onChange={(e) => handleUpdateEvalue(idx, 'channel', e.target.value as PaymentChannel)}
                    className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {PAYMENT_CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>

                  {item.channel === 'Bank' ? (
                    <select
                      value={item.bank || ''}
                      onChange={(e) => handleUpdateEvalue(idx, 'bank', e.target.value)}
                      className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                    >
                      <option value="">-- Select Bank in Ghana --</option>
                      
                      {stationFavoriteBanks.length > 0 && (
                        <optgroup label="⭐ Station Favorite / Selected Banks">
                          {stationFavoriteBanks.map((b) => (
                            <option key={`fav_${b}`} value={b}>
                              {b}
                            </option>
                          ))}
                        </optgroup>
                      )}

                      <optgroup label="🏦 All Commercial Banks (Bank of Ghana)">
                        {commercialBanks.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </optgroup>

                      <optgroup label="🏛️ Savings & Loans / Rural Apex">
                        {otherFinancialInstitutions.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ref / Transaction ID"
                      value={item.reference}
                      onChange={(e) => handleUpdateEvalue(idx, 'reference', e.target.value)}
                      className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  )}

                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount (GHS)"
                    value={item.amount === 0 ? '' : item.amount}
                    onChange={(e) => handleUpdateEvalue(idx, 'amount', e.target.value)}
                    className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-right font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {item.channel === 'Bank' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    {isCustomOrRuralBank ? (
                      <input
                        type="text"
                        placeholder="Specify Rural Bank / Institution name..."
                        value={item.bank === 'Other Rural / Community Bank' ? '' : item.bank}
                        onChange={(e) => handleUpdateEvalue(idx, 'bank', e.target.value)}
                        className="bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    ) : null}
                    <input
                      type="text"
                      placeholder="Terminal / Slip Reference # (e.g. POS-8842)"
                      value={item.reference}
                      onChange={(e) => handleUpdateEvalue(idx, 'reference', e.target.value)}
                      className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemoveEvalue(idx)}
                    className="text-stone-400 hover:text-rose-600 text-[11px] flex items-center gap-1 font-semibold transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Remove Item
                  </button>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleAddEvalue}
            className="w-full py-2 border border-dashed border-stone-300 hover:border-emerald-500 rounded-xl text-xs font-semibold text-stone-600 hover:text-emerald-700 bg-stone-50/50 hover:bg-emerald-50/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add E-Value / MoMo / Bank POS Entry
          </button>
        </div>
      </div>

      {/* Category C: Credit Sales Collection */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div>
            <span className="text-xs font-bold text-stone-900 uppercase tracking-wide">
              C. Credit Sales Collection
            </span>
            <p className="text-[11px] text-stone-500">Cash received from debtors on prior credit</p>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            Total (C): +{fmt(totalC)}
          </span>
        </div>

        <div className="space-y-2.5">
          {record.collections.map((item, idx) => (
            <div key={item.id || idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Customer / Debtor Name"
                  value={item.customer}
                  onChange={(e) => handleUpdateCollection(idx, 'customer', e.target.value)}
                  className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Receipt #"
                    value={item.reference}
                    onChange={(e) => handleUpdateCollection(idx, 'reference', e.target.value)}
                    className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Amount (GHS)"
                    value={item.amount === 0 ? '' : item.amount}
                    onChange={(e) => handleUpdateCollection(idx, 'amount', e.target.value)}
                    className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-right font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRemoveCollection(idx)}
                  className="text-stone-400 hover:text-rose-600 text-[11px] flex items-center gap-1 font-semibold transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Remove Item
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddCollection}
            className="w-full py-2 border border-dashed border-stone-300 hover:border-emerald-500 rounded-xl text-xs font-semibold text-stone-600 hover:text-emerald-700 bg-stone-50/50 hover:bg-emerald-50/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Collection
          </button>
        </div>
      </div>

      {/* Category D: Generator Fuel */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <div>
            <span className="text-xs font-bold text-stone-900 uppercase tracking-wide">
              D. Generator Fuel / Station Expenses
            </span>
            <p className="text-[11px] text-stone-500">Power outage generator fuel &amp; approved drawings</p>
          </div>
          <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
            Total (D): {fmt(totalD)}
          </span>
        </div>

        <div className="space-y-2.5">
          {record.generator.map((item, idx) => (
            <div key={item.id || idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Description (e.g. Generator 50L AGO top-up)"
                    value={item.description}
                    onChange={(e) => handleUpdateGenerator(idx, 'description', e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Amount (GHS)"
                  value={item.amount === 0 ? '' : item.amount}
                  onChange={(e) => handleUpdateGenerator(idx, 'amount', e.target.value)}
                  className="bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-right font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRemoveGenerator(idx)}
                  className="text-stone-400 hover:text-rose-600 text-[11px] flex items-center gap-1 font-semibold transition-colors"
                >
                  <Trash2 className="w-3 h-3" /> Remove Item
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddGenerator}
            className="w-full py-2 border border-dashed border-stone-300 hover:border-emerald-500 rounded-xl text-xs font-semibold text-stone-600 hover:text-emerald-700 bg-stone-50/50 hover:bg-emerald-50/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Generator Fuel
          </button>
        </div>
      </div>

      {/* Summary Callout */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between text-amber-900 shadow-xs">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block">
            Total Shift Deductions / Drawings
          </span>
          <span className="text-[11px] text-amber-700">Formula: (A + B + D)</span>
        </div>
        <span className="text-xl font-bold font-mono text-amber-900">
          {fmt(totalDrawings)}
        </span>
      </div>
    </div>
  );
};
