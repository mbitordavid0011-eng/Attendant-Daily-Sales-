import React from 'react';
import { Gauge, Plus, Trash2, Fuel, AlertCircle, Info } from 'lucide-react';
import { SupervisorSalesAccountRecord, AttendantMeterReading } from '../../types';

interface SupervisorOpeningMetersStepProps {
  form: SupervisorSalesAccountRecord;
  onUpdateForm: (updated: Partial<SupervisorSalesAccountRecord>) => void;
  formatGhc: (val: number) => string;
  isAccountClosed: boolean;
}

export const SupervisorOpeningMetersStep: React.FC<SupervisorOpeningMetersStepProps> = ({
  form,
  onUpdateForm,
  formatGhc,
  isAccountClosed,
}) => {
  const allMeters = form.fuelMeters || [];

  const fuels: { type: 'super' | 'diesel' | 'ron95'; label: string; defaultPrice: number; color: string }[] = [
    { type: 'super', label: 'Super PMS (Petrol)', defaultPrice: 13.27, color: 'text-rose-400 border-rose-800/40 bg-rose-950/20' },
    { type: 'diesel', label: 'Diesel AGO', defaultPrice: 14.50, color: 'text-emerald-400 border-emerald-800/40 bg-emerald-950/20' },
    { type: 'ron95', label: 'V-Power / RON 95', defaultPrice: 14.20, color: 'text-blue-400 border-blue-800/40 bg-blue-950/20' },
  ];

  const handleUpdateMeter = (id: string, field: keyof AttendantMeterReading, val: any) => {
    const updated = allMeters.map((m) => {
      if (m.id !== id) return m;
      const next = { ...m, [field]: val };
      const open = Number(next.openingMeter) || 0;
      const close = Number(next.closingMeter) || 0;
      const rtt = Number(next.rtt) || 0;
      const price = Number(next.unitPrice) || 0;
      const litres = Math.max(0, close - open - rtt);
      next.litresSold = litres;
      next.totalSales = litres * price;
      return next;
    });
    onUpdateForm({ fuelMeters: updated });
  };

  const handleAddPump = (fuelType: 'super' | 'diesel' | 'ron95', label: string, defaultPrice: number) => {
    const count = allMeters.filter((m) => m.fuelType === fuelType).length + 1;
    const newMeter: AttendantMeterReading = {
      id: `sm_${fuelType}_${Date.now()}`,
      pumpName: `${label} - Pump ${count}`,
      fuelType,
      timeSlot: form.shiftType || '06:00 – 18:00',
      openingMeter: 0,
      closingMeter: 0,
      rtt: 0,
      unitPrice: defaultPrice,
      litresSold: 0,
      totalSales: 0,
    };
    onUpdateForm({ fuelMeters: [...allMeters, newMeter] });
  };

  const handleRemovePump = (id: string) => {
    if (allMeters.length <= 1) return;
    onUpdateForm({ fuelMeters: allMeters.filter((m) => m.id !== id) });
  };

  return (
    <div className="space-y-6">
      {/* STEP INTRO BANNER */}
      <div className="bg-[#1a1d20] border border-[#2d3135] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <Gauge className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400 font-['Space_Grotesk']">
              STEP 2 OF 7
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#ece8e0] font-['Space_Grotesk'] mt-0.5">
              Opening Pump Meters
            </h2>
            <p className="text-xs text-[#8d9195] mt-1">
              Record the opening electronic or mechanical dispenser meter readings at the start of this shift.
              These values form the baseline for total fuel dispensed.
            </p>
          </div>
        </div>
      </div>

      {/* METERS LIST BY PRODUCT */}
      <div className="space-y-5">
        {fuels.map((fuel) => {
          const productMeters = allMeters.filter((m) => (m.fuelType || 'super') === fuel.type);

          return (
            <div
              key={fuel.type}
              className="bg-[#1a1d20] border border-[#2d3135] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#2d3135]">
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-[#ece8e0] uppercase tracking-wide">
                    {fuel.label}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#25292e] text-[#8d9195]">
                    {productMeters.length} {productMeters.length === 1 ? 'Pump' : 'Pumps'}
                  </span>
                </div>

                {!isAccountClosed && (
                  <button
                    type="button"
                    onClick={() => handleAddPump(fuel.type, fuel.label.split(' ')[0], fuel.defaultPrice)}
                    className="self-start sm:self-auto text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#25292e] hover:bg-[#30353b] text-amber-400 border border-[#383e46] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus size={13} /> Add Pump
                  </button>
                )}
              </div>

              {productMeters.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#8d9195] border border-dashed border-[#2d3135] rounded-xl">
                  No pumps added for {fuel.label}.
                  {!isAccountClosed && (
                    <button
                      type="button"
                      onClick={() => handleAddPump(fuel.type, fuel.label.split(' ')[0], fuel.defaultPrice)}
                      className="ml-2 text-amber-400 font-bold hover:underline cursor-pointer"
                    >
                      + Add Pump 1
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {productMeters.map((meter, idx) => (
                    <div
                      key={meter.id}
                      className="bg-[#202428] border border-[#2d3135] hover:border-[#383e46] rounded-xl p-4 space-y-3 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#15171a] border border-[#2d3135] flex items-center justify-center text-xs font-bold text-amber-400 font-mono">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            disabled={isAccountClosed}
                            value={meter.pumpName}
                            onChange={(e) => handleUpdateMeter(meter.id, 'pumpName', e.target.value)}
                            className="bg-transparent text-xs font-bold text-[#ece8e0] border-b border-transparent focus:border-amber-400 outline-none w-36 sm:w-44"
                            placeholder="Pump Label"
                          />
                        </div>

                        {!isAccountClosed && allMeters.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePump(meter.id)}
                            className="text-[#8d9195] hover:text-rose-400 p-1 cursor-pointer transition-colors"
                            title="Remove Pump"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#8d9195] block mb-1">
                            Opening Meter Reading
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isAccountClosed}
                            value={meter.openingMeter || ''}
                            onChange={(e) => handleUpdateMeter(meter.id, 'openingMeter', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-full bg-[#15171a] border border-[#2d3135] focus:border-amber-400 rounded-xl px-3 py-2.5 text-base sm:text-lg font-mono font-bold text-[#ece8e0] outline-none"
                          />
                          <span className="text-[10px] text-[#8d9195] mt-1 block">
                            Enter start counter
                          </span>
                        </div>

                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#8d9195] block mb-1">
                            Pump Price (GH₵ / L)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-[#8d9195]">
                              GH₵
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              disabled={isAccountClosed}
                              value={meter.unitPrice || ''}
                              onChange={(e) => handleUpdateMeter(meter.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full bg-[#15171a] border border-[#2d3135] focus:border-amber-400 rounded-xl pl-11 pr-3 py-2.5 text-sm sm:text-base font-mono font-bold text-[#ece8e0] outline-none"
                            />
                          </div>
                          <span className="text-[10px] text-[#8d9195] mt-1 block">
                            Regulated retail price
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
