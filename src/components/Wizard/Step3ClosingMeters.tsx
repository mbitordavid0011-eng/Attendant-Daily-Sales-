import React, { useState } from 'react';
import { Gauge, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ShiftRecord, FUELS, PumpReading } from '../../types';
import { num, fmtPlain } from '../../utils/calculations';

interface Step3ClosingMetersProps {
  record: ShiftRecord;
  onChange: (updated: ShiftRecord) => void;
}

export const Step3ClosingMeters: React.FC<Step3ClosingMetersProps> = ({
  record,
  onChange,
}) => {
  const [activeFuel, setActiveFuel] = useState<string>('pms');

  const currentFuelDef = FUELS.find((f) => f.id === activeFuel) || FUELS[0];
  const fuelData = record.fuels[activeFuel] || {
    price: currentFuelDef.defaultPrice,
    pumps: [],
  };

  const handleUpdatePump = (index: number, field: keyof PumpReading, value: string | number) => {
    const newPumps = [...fuelData.pumps];
    newPumps[index] = {
      ...newPumps[index],
      [field]: field === 'name' ? value : num(value),
    };

    onChange({
      ...record,
      fuels: {
        ...record.fuels,
        [activeFuel]: {
          ...fuelData,
          pumps: newPumps,
        },
      },
    });
  };

  let totalMeterLitres = 0;
  let totalRttLitres = 0;
  let totalNetLitres = 0;

  fuelData.pumps.forEach((p) => {
    const meter = Math.max(0, num(p.closing) - num(p.opening));
    const rtt = Math.max(0, num(p.rtt));
    const net = Math.max(0, meter - rtt);
    totalMeterLitres += meter;
    totalRttLitres += rtt;
    totalNetLitres += net;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <Gauge className="w-5 h-5 text-emerald-600" />
          Closing Meter Readings &amp; R.T.T.
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Enter ending meter readings and Return-To-Tank (calibration test) litres.
        </p>
      </div>

      {/* Fuel Selection Tabs */}
      <div className="flex gap-1.5 p-1 bg-stone-200/80 rounded-xl">
        {FUELS.map((fuel) => {
          const isActive = activeFuel === fuel.id;
          const currentFuel = record.fuels[fuel.id];
          const pumpCount = currentFuel?.pumps?.length || 0;
          const isCarried = pumpCount > 0;
          let fuelNet = 0;
          if (currentFuel?.pumps) {
            currentFuel.pumps.forEach((p) => {
              const meter = Math.max(0, num(p.closing) - num(p.opening));
              fuelNet += Math.max(0, meter - num(p.rtt));
            });
          }
          return (
            <button
              key={fuel.id}
              type="button"
              onClick={() => setActiveFuel(fuel.id)}
              className={`flex-1 py-2 px-2 text-center rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-stone-900 shadow-xs ring-1 ring-stone-900/5'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/50'
              }`}
            >
              <div className="truncate">{fuel.shortName}</div>
              <div className={`text-[10px] font-semibold mt-0.5 ${
                isCarried ? 'font-mono text-emerald-700' : 'font-sans text-stone-400 italic font-normal'
              }`}>
                {isCarried ? `${fmtPlain(fuelNet)} L` : 'Not carried'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Meter Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
            {currentFuelDef.label} Closing
          </span>
          <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
            Net: {fmtPlain(totalNetLitres)} Litres
          </span>
        </div>

        {fuelData.pumps.length === 0 ? (
          <div className="p-8 text-center bg-stone-50/40 space-y-2">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
              <Gauge className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-stone-800">
              {currentFuelDef.label} is Not Carried for this Shift
            </h3>
            <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
              No active dispensers configured. No closing readings required for this product.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-100/50 text-[11px] text-stone-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3 font-semibold">Dispenser</th>
                  <th className="py-2.5 px-2 font-semibold text-right text-stone-400">Opening (L)</th>
                  <th className="py-2.5 px-2 font-semibold text-right">Closing (L)</th>
                  <th className="py-2.5 px-2 font-semibold text-right">R.T.T (L)</th>
                  <th className="py-2.5 px-3 font-semibold text-right text-emerald-800">Net (L)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {fuelData.pumps.map((pump, idx) => {
                  const meter = Math.max(0, num(pump.closing) - num(pump.opening));
                  const rtt = Math.max(0, num(pump.rtt));
                  const net = Math.max(0, meter - rtt);
                  const hasNegative = num(pump.closing) > 0 && num(pump.closing) < num(pump.opening);

                  return (
                    <tr key={pump.id || idx} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-stone-800">{pump.name}</div>
                        {hasNegative && (
                          <div className="text-[10px] text-rose-600 flex items-center gap-1 font-semibold">
                            <AlertTriangle className="w-2.5 h-2.5" /> Closing &lt; Opening
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono text-stone-500 text-[11px]">
                        {fmtPlain(pump.opening)}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={pump.closing === 0 ? '' : pump.closing}
                          onChange={(e) => handleUpdatePump(idx, 'closing', e.target.value)}
                          className={`w-28 sm:w-32 bg-stone-50 border rounded-lg px-2 py-1.5 text-xs text-right font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                            hasNegative ? 'border-rose-400 bg-rose-50/50' : 'border-stone-300'
                          }`}
                        />
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={pump.rtt === 0 ? '' : pump.rtt}
                          onChange={(e) => handleUpdatePump(idx, 'rtt', e.target.value)}
                          className="w-20 sm:w-24 bg-stone-50 border border-stone-300 rounded-lg px-2 py-1.5 text-xs text-right font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          title="Return to Tank (test calibration)"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800 text-xs">
                        {fmtPlain(net)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-emerald-50/80 font-bold border-t border-emerald-200 text-stone-800 text-xs">
                  <td className="py-2.5 px-3 text-emerald-900">Total ({currentFuelDef.shortName})</td>
                  <td className="py-2.5 px-2 text-right font-mono text-stone-600">
                    {fmtPlain(fuelData.pumps.reduce((acc, p) => acc + num(p.opening), 0))}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-stone-800">
                    {fmtPlain(fuelData.pumps.reduce((acc, p) => acc + num(p.closing), 0))}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono text-amber-700">
                    {fmtPlain(totalRttLitres)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-900">
                    {fmtPlain(totalNetLitres)} L
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 text-xs text-stone-600 space-y-1">
        <div className="font-semibold text-stone-800 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-stone-500" />
          Formula Calculation
        </div>
        <p className="text-[11px]">
          <strong>Net Litres</strong> = (Closing Meter − Opening Meter) − R.T.T (Return To Tank)
        </p>
      </div>
    </div>
  );
};
