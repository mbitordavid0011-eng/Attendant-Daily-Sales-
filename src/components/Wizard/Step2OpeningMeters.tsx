import React, { useState } from 'react';
import { Plus, Trash2, Gauge, Info, Sparkles } from 'lucide-react';
import { ShiftRecord, FUELS, PumpReading } from '../../types';
import { num, fmtPlain, generateId } from '../../utils/calculations';

interface Step2OpeningMetersProps {
  record: ShiftRecord;
  onChange: (updated: ShiftRecord) => void;
}

export const Step2OpeningMeters: React.FC<Step2OpeningMetersProps> = ({
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

  const handleAddPump = () => {
    const nextNum = fuelData.pumps.length + 1;
    const newPump: PumpReading = {
      id: generateId(),
      name: `Pump ${nextNum}`,
      opening: 0,
      closing: 0,
      rtt: 0,
    };

    onChange({
      ...record,
      fuels: {
        ...record.fuels,
        [activeFuel]: {
          ...fuelData,
          pumps: [...fuelData.pumps, newPump],
        },
      },
    });
  };

  const handleRemovePump = (index: number) => {
    if (fuelData.pumps.length <= 1) return;
    const newPumps = fuelData.pumps.filter((_, i) => i !== index);

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

  const totalOpeningLitres = fuelData.pumps.reduce(
    (acc, p) => acc + num(p.opening),
    0
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <Gauge className="w-5 h-5 text-emerald-600" />
          Opening Meter Readings
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Record starting totalizer meter figures on each dispenser at shift handover.
        </p>
      </div>

      {/* Fuel Selection Tabs */}
      <div className="flex gap-1.5 p-1 bg-stone-200/80 rounded-xl">
        {FUELS.map((fuel) => {
          const isActive = activeFuel === fuel.id;
          const pumpCount = record.fuels[fuel.id]?.pumps?.length || 0;
          const isCarried = pumpCount > 0;

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
              <div className={`text-[10px] font-normal mt-0.5 ${isCarried ? 'text-stone-500' : 'text-stone-400 italic'}`}>
                {isCarried ? `${pumpCount} ${pumpCount === 1 ? 'nozzle' : 'nozzles'}` : 'Not carried'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Meter Table Card */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${activeFuel === 'pms' ? 'bg-emerald-500' : activeFuel === 'ago' ? 'bg-amber-500' : 'bg-blue-500'}`} />
            {currentFuelDef.label}
          </span>
          <span className="text-xs font-mono font-bold text-stone-600">
            Total: {fmtPlain(totalOpeningLitres)} L
          </span>
        </div>

        {fuelData.pumps.length === 0 ? (
          <div className="p-8 text-center bg-stone-50/40 space-y-3">
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-stone-800">
                {currentFuelDef.label} is Not Configured (0 Dispensers)
              </h3>
              <p className="text-[11px] text-stone-500 mt-0.5 max-w-sm mx-auto">
                {activeFuel === 'ron95'
                  ? 'This station branch does not carry RON 95 (V-Power) tanks. If your station does have RON 95, click below to add a dispenser.'
                  : `No active ${currentFuelDef.shortName} dispensers configured for this shift.`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddPump}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add {currentFuelDef.shortName} Dispenser</span>
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-100/50 text-[11px] text-stone-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-semibold">Dispenser / Nozzle</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Opening Meter (Litres)</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {fuelData.pumps.map((pump, idx) => (
                    <tr key={pump.id || idx} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={pump.name}
                          onChange={(e) => handleUpdatePump(idx, 'name', e.target.value)}
                          className="w-full bg-transparent font-medium text-stone-800 text-xs focus:outline-none focus:bg-stone-100 rounded px-1.5 py-1"
                          placeholder="e.g. Pump 1"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={pump.opening === 0 ? '' : pump.opening}
                          placeholder="0.00"
                          onChange={(e) => handleUpdatePump(idx, 'opening', e.target.value)}
                          className="w-full sm:w-48 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-right font-mono font-semibold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ml-auto block"
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemovePump(idx)}
                          className="text-stone-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                          title="Remove dispenser"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Dispenser Button */}
            <div className="p-3 bg-stone-50/50 border-t border-stone-200">
              <button
                type="button"
                onClick={handleAddPump}
                className="w-full py-2 px-3 border border-dashed border-stone-300 hover:border-emerald-500 rounded-xl text-xs font-semibold text-stone-600 hover:text-emerald-700 bg-white hover:bg-emerald-50/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add {currentFuelDef.shortName} Dispenser
              </button>
            </div>
          </>
        )}
      </div>

      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-900 flex items-start gap-2">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Tip:</span> You can switch tabs between PMS, AGO, and RON 95 above to fill in all starting meter readings.
        </div>
      </div>
    </div>
  );
};
