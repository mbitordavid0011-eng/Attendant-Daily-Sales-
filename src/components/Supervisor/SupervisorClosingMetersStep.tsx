import React from 'react';
import { Gauge, Fuel, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { SupervisorSalesAccountRecord, AttendantMeterReading } from '../../types';

interface SupervisorClosingMetersStepProps {
  form: SupervisorSalesAccountRecord;
  onUpdateForm: (updated: Partial<SupervisorSalesAccountRecord>) => void;
  formatGhc: (val: number) => string;
  isAccountClosed: boolean;
}

export const SupervisorClosingMetersStep: React.FC<SupervisorClosingMetersStepProps> = ({
  form,
  onUpdateForm,
  formatGhc,
  isAccountClosed,
}) => {
  const allMeters = form.fuelMeters || [];

  const fuels: { type: 'super' | 'diesel' | 'ron95'; label: string }[] = [
    { type: 'super', label: 'Super PMS (Petrol)' },
    { type: 'diesel', label: 'Diesel AGO' },
    { type: 'ron95', label: 'V-Power / RON 95' },
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

  // Overall totals for closing meters
  const totalLitresSold = allMeters.reduce((acc, m) => acc + (Number(m.litresSold) || 0), 0);
  const totalFuelSalesAmount = allMeters.reduce((acc, m) => acc + (Number(m.totalSales) || 0), 0);

  return (
    <div className="space-y-6">
      {/* STEP INTRO BANNER */}
      <div className="bg-[#1a1d20] border border-[#2d3135] rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-400 font-['Space_Grotesk']">
                STEP 3 OF 7
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-[#ece8e0] font-['Space_Grotesk'] mt-0.5">
                Closing Meters & Test Litres (R.T.T.)
              </h2>
              <p className="text-xs text-[#8d9195] mt-1">
                Enter closing meter counters and any Return To Tank (R.T.T.) testing volumes.
                The system automatically calculates Net Litres Sold and Total Sales in real-time.
              </p>
            </div>
          </div>

          <div className="bg-[#202428] border border-[#2d3135] rounded-xl p-3 shrink-0 flex items-center gap-4">
            <div>
              <span className="text-[10px] font-bold text-[#8d9195] uppercase block">Total Net Litres</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                {totalLitresSold.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
              </span>
            </div>
            <div className="border-l border-[#2d3135] pl-4">
              <span className="text-[10px] font-bold text-[#8d9195] uppercase block">Total Fuel Sales</span>
              <span className="text-base font-bold font-mono text-[#ece8e0]">
                GH₵ {formatGhc(totalFuelSalesAmount)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* METERS LIST */}
      <div className="space-y-5">
        {fuels.map((fuel) => {
          const productMeters = allMeters.filter((m) => (m.fuelType || 'super') === fuel.type);
          if (productMeters.length === 0) return null;

          return (
            <div
              key={fuel.type}
              className="bg-[#1a1d20] border border-[#2d3135] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#2d3135]">
                <div className="flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-[#ece8e0] uppercase tracking-wide">
                    {fuel.label}
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-stone-400">
                  {productMeters.length} Dispenser(s)
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {productMeters.map((meter, idx) => {
                  const open = Number(meter.openingMeter) || 0;
                  const close = Number(meter.closingMeter) || 0;
                  const rtt = Number(meter.rtt) || 0;
                  const hasWarning = close > 0 && close < open;

                  return (
                    <div
                      key={meter.id}
                      className="bg-[#202428] border border-[#2d3135] rounded-xl p-4 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#15171a] border border-[#2d3135] flex items-center justify-center text-xs font-bold text-amber-400 font-mono">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-[#ece8e0]">
                            {meter.pumpName}
                          </span>
                          <span className="text-[11px] font-mono text-[#8d9195] bg-[#15171a] px-2 py-0.5 rounded border border-[#2d3135]">
                            Price: GH₵ {formatGhc(meter.unitPrice || 0)} / L
                          </span>
                        </div>

                        {hasWarning && (
                          <div className="flex items-center gap-1 text-xs text-rose-400 bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-800">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Warning: Closing meter is less than opening meter</span>
                          </div>
                        )}
                      </div>

                      {/* 4 Inputs / Figures Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                        {/* Opening Meter Reference */}
                        <div className="bg-[#15171a] p-3 rounded-xl border border-[#2d3135]">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8d9195] block mb-1">
                            Opening Meter
                          </span>
                          <span className="text-base sm:text-lg font-mono font-bold text-[#ece8e0] block">
                            {open.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-[10px] text-stone-500 mt-0.5 block">Baseline count</span>
                        </div>

                        {/* Closing Meter Input */}
                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#8d9195] block mb-1">
                            Closing Meter Reading
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isAccountClosed}
                            value={meter.closingMeter || ''}
                            onChange={(e) => handleUpdateMeter(meter.id, 'closingMeter', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-full bg-[#15171a] border border-[#2d3135] focus:border-emerald-400 rounded-xl px-3 py-2.5 text-base sm:text-lg font-mono font-bold text-[#ece8e0] outline-none"
                          />
                          <span className="text-[10px] text-[#8d9195] mt-1 block">End of shift reading</span>
                        </div>

                        {/* RTT Input */}
                        <div>
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#8d9195] block mb-1">
                            R.T.T. (Return to Tank)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            disabled={isAccountClosed}
                            value={meter.rtt || ''}
                            onChange={(e) => handleUpdateMeter(meter.id, 'rtt', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="w-full bg-[#15171a] border border-[#2d3135] focus:border-amber-400 rounded-xl px-3 py-2.5 text-base sm:text-lg font-mono font-bold text-[#ece8e0] outline-none"
                          />
                          <span className="text-[10px] text-[#8d9195] mt-1 block">Pump test litres</span>
                        </div>

                        {/* Net Litres & Sales Calculated */}
                        <div className="bg-[#15171a] p-3 rounded-xl border border-emerald-900/40">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block mb-0.5">
                            Net Sold & Sales Amount
                          </span>
                          <div className="text-base sm:text-lg font-mono font-bold text-emerald-300">
                            {(meter.litresSold || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                          </div>
                          <div className="text-xs font-mono font-bold text-[#ece8e0] mt-0.5">
                            GH₵ {formatGhc(meter.totalSales || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
