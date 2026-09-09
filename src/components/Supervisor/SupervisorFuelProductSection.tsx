import React from 'react';
import { Fuel, Plus, Trash2, Gauge, AlertCircle, Sparkles } from 'lucide-react';
import { SupervisorSalesAccountRecord, AttendantMeterReading } from '../../types';

interface SupervisorFuelProductSectionProps {
  sectionNumber: number; // 2, 3, or 4
  fuelType: 'super' | 'diesel' | 'ron95';
  title: string;
  subtitle: string;
  defaultPrice: number;
  form: SupervisorSalesAccountRecord;
  onUpdateForm: (updated: Partial<SupervisorSalesAccountRecord>) => void;
  formatGhc: (val: number) => string;
  disabled?: boolean;
}

export const SupervisorFuelProductSection: React.FC<SupervisorFuelProductSectionProps> = ({
  sectionNumber,
  fuelType,
  title,
  subtitle,
  defaultPrice,
  form,
  onUpdateForm,
  formatGhc,
  disabled = false,
}) => {
  const allMeters = form.fuelMeters || [];
  const productMeters = allMeters.filter((m) => (m.fuelType || 'super') === fuelType);

  const getThemeColor = () => {
    switch (fuelType) {
      case 'super':
        return {
          badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
          accent: 'text-rose-400',
          border: 'border-rose-900/40',
          button: 'bg-rose-950/70 hover:bg-rose-900 text-rose-200 border-rose-800',
        };
      case 'diesel':
        return {
          badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
          accent: 'text-emerald-400',
          border: 'border-emerald-900/40',
          button: 'bg-emerald-950/70 hover:bg-emerald-900 text-emerald-200 border-emerald-800',
        };
      case 'ron95':
        return {
          badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
          accent: 'text-blue-400',
          border: 'border-blue-900/40',
          button: 'bg-blue-950/70 hover:bg-blue-900 text-blue-200 border-blue-800',
        };
    }
  };

  const theme = getThemeColor();

  const handleUpdateMeter = (id: string, field: keyof AttendantMeterReading, val: any) => {
    const updated = allMeters.map((m) => {
      if (m.id !== id) return m;
      const next = { ...m, [field]: val };
      const open = Number(next.openingMeter) || 0;
      const close = Number(next.closingMeter) || 0;
      const rtt = Number(next.rtt) || 0;
      const price = Number(next.unitPrice) || defaultPrice;
      const litres = Math.max(0, close - open - rtt);
      next.litresSold = litres;
      next.totalSales = litres * price;
      return next;
    });
    onUpdateForm({ fuelMeters: updated });
  };

  const handleAddPump = () => {
    const count = productMeters.length + 1;
    const newMeter: AttendantMeterReading = {
      id: `sm_${fuelType}_${Date.now()}`,
      pumpName: `${title} - Pump ${count}`,
      fuelType,
      timeSlot: form.shiftType || '06:00 – 18:00',
      openingMeter: 0,
      closingMeter: 0,
      rtt: 0,
      unitPrice: productMeters[0]?.unitPrice || defaultPrice,
      litresSold: 0,
      totalSales: 0,
    };
    onUpdateForm({ fuelMeters: [...allMeters, newMeter] });
  };

  const handleRemovePump = (id: string) => {
    if (productMeters.length <= 1) return;
    const updated = allMeters.filter((m) => m.id !== id);
    onUpdateForm({ fuelMeters: updated });
  };

  // Section Calculations
  let totalSectionLitres = 0;
  let totalSectionSales = 0;
  let totalSectionRtt = 0;
  let unitPrice = productMeters[0]?.unitPrice || defaultPrice;

  productMeters.forEach((m) => {
    const net = Math.max(
      0,
      (Number(m.closingMeter) || 0) - (Number(m.openingMeter) || 0) - (Number(m.rtt) || 0)
    );
    const p = Number(m.unitPrice) || defaultPrice;
    totalSectionLitres += net;
    totalSectionSales += net * p;
    totalSectionRtt += Number(m.rtt) || 0;
    unitPrice = p;
  });

  return (
    <div className="bg-[#191c1f] rounded-2xl border border-[#333739] p-4 sm:p-5 space-y-4">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#333739] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-[#e8b93b]/15 text-[#e8b93b] flex items-center justify-center font-mono font-bold text-xs border border-[#e8b93b]/30">
            {sectionNumber}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-[#ece8e0] uppercase tracking-wide flex items-center gap-2 font-['Space_Grotesk']">
                <Fuel className={`w-4 h-4 ${theme.accent}`} />
                {sectionNumber}. {title}
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${theme.badgeBg}`}>
                GH₵ {unitPrice.toFixed(2)} / L
              </span>
            </div>
            <p className="text-xs text-[#8d9195]">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!disabled && (
            <button
              type="button"
              onClick={handleAddPump}
              className={`py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm ${theme.button}`}
            >
              <Plus size={13} />
              <span>+ Add {title} Pump</span>
            </button>
          )}
        </div>
      </div>

      {/* METRIC BANNER */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="p-3 rounded-xl bg-[#15171a] border border-[#333739]">
          <span className="text-[10.5px] text-[#8d9195] uppercase font-bold block">
            Dispensers Active
          </span>
          <span className="text-sm sm:text-base font-bold font-mono text-[#ece8e0]">
            {productMeters.length} {productMeters.length === 1 ? 'Nozzle' : 'Nozzles'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#15171a] border border-[#333739]">
          <span className="text-[10.5px] text-[#8d9195] uppercase font-bold block">
            Total RTT (Return to Tank)
          </span>
          <span className="text-sm sm:text-base font-bold font-mono text-amber-400">
            {totalSectionRtt.toFixed(2)} L
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#15171a] border border-[#333739]">
          <span className="text-[10.5px] text-[#8d9195] uppercase font-bold block">
            Net Litres Sold
          </span>
          <span className={`text-sm sm:text-base font-bold font-mono ${theme.accent}`}>
            {formatGhc(totalSectionLitres)} L
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#15171a] border border-[#333739]">
          <span className="text-[10.5px] text-[#8d9195] uppercase font-bold block">
            Total {title} Sales
          </span>
          <span className="text-sm sm:text-base font-bold font-mono text-[#e8b93b]">
            GH₵ {formatGhc(totalSectionSales)}
          </span>
        </div>
      </div>

      {/* DESKTOP TABLE VIEW (hidden on small screens) */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-[#333739]">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-[#15171a] text-[#8d9195] uppercase font-bold text-[10px] tracking-wider border-b border-[#333739]">
            <tr>
              <th className="p-3">Pump / Nozzle Name</th>
              <th className="p-3 text-right">Opening Meters</th>
              <th className="p-3 text-right">Closing Meters</th>
              <th className="p-3 text-right">RTT</th>
              <th className="p-3 text-right">Litres Sold</th>
              <th className="p-3 text-right">Unit Price (GH₵)</th>
              <th className="p-3 text-right">Amount Sold / Total Sales</th>
              {!disabled && <th className="p-3 text-center w-12">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333739] bg-[#191c1f]">
            {productMeters.map((m, idx) => {
              const netLitres = Math.max(
                0,
                (Number(m.closingMeter) || 0) -
                  (Number(m.openingMeter) || 0) -
                  (Number(m.rtt) || 0)
              );
              const lineTotal = netLitres * (Number(m.unitPrice) || defaultPrice);

              return (
                <tr key={m.id} className="hover:bg-[#1d2023]/60 transition-colors">
                  <td className="p-2.5">
                    <input
                      type="text"
                      disabled={disabled}
                      value={m.pumpName}
                      onChange={(e) => handleUpdateMeter(m.id, 'pumpName', e.target.value)}
                      className="w-44 bg-[#15171a] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-[#ece8e0] font-semibold outline-hidden"
                    />
                  </td>

                  <td className="p-2.5 text-right">
                    <input
                      type="number"
                      step="0.01"
                      disabled={disabled}
                      value={m.openingMeter || ''}
                      onChange={(e) =>
                        handleUpdateMeter(m.id, 'openingMeter', parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                      className="w-28 bg-[#15171a] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-[#ece8e0] font-mono text-right outline-hidden"
                    />
                  </td>

                  <td className="p-2.5 text-right">
                    <input
                      type="number"
                      step="0.01"
                      disabled={disabled}
                      value={m.closingMeter || ''}
                      onChange={(e) =>
                        handleUpdateMeter(m.id, 'closingMeter', parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                      className="w-28 bg-[#15171a] border border-blue-900/60 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-blue-200 font-mono text-right font-bold outline-hidden"
                    />
                  </td>

                  <td className="p-2.5 text-right">
                    <input
                      type="number"
                      step="0.01"
                      disabled={disabled}
                      value={m.rtt || ''}
                      onChange={(e) =>
                        handleUpdateMeter(m.id, 'rtt', parseFloat(e.target.value) || 0)
                      }
                      placeholder="0.00"
                      className="w-20 bg-[#15171a] border border-amber-900/60 rounded-lg px-2 py-1.5 text-xs text-amber-300 font-mono text-right outline-hidden"
                    />
                  </td>

                  <td className="p-2.5 text-right font-mono font-bold text-[#ece8e0]">
                    {formatGhc(netLitres)} L
                  </td>

                  <td className="p-2.5 text-right">
                    <input
                      type="number"
                      step="0.01"
                      disabled={disabled}
                      value={m.unitPrice || defaultPrice}
                      onChange={(e) =>
                        handleUpdateMeter(m.id, 'unitPrice', parseFloat(e.target.value) || 0)
                      }
                      className="w-24 bg-[#15171a] border border-[#333739] rounded-lg px-2 py-1.5 text-xs text-[#ece8e0] font-mono text-right outline-hidden"
                    />
                  </td>

                  <td className="p-2.5 text-right font-mono font-extrabold text-[#e8b93b] text-sm">
                    GH₵ {formatGhc(lineTotal)}
                  </td>

                  {!disabled && (
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        disabled={productMeters.length <= 1}
                        onClick={() => handleRemovePump(m.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Delete dispenser reading"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-[#15171a] font-bold text-xs border-t border-[#333739]">
            <tr>
              <td colSpan={3} className="p-3 text-right text-[#8d9195] uppercase text-[11px]">
                {title} Totals:
              </td>
              <td className="p-3 text-right font-mono text-amber-400">
                {totalSectionRtt.toFixed(2)} L
              </td>
              <td className="p-3 text-right font-mono text-[#ece8e0]">
                {formatGhc(totalSectionLitres)} L
              </td>
              <td className="p-3 text-right font-mono text-[#8d9195]">
                GH₵ {unitPrice.toFixed(2)}
              </td>
              <td className="p-3 text-right font-mono text-[#e8b93b] text-sm">
                GH₵ {formatGhc(totalSectionSales)}
              </td>
              {!disabled && <td></td>}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* MOBILE / TABLET CARDS VIEW (lg:hidden) */}
      <div className="space-y-3 lg:hidden">
        {productMeters.map((m, idx) => {
          const netLitres = Math.max(
            0,
            (Number(m.closingMeter) || 0) -
              (Number(m.openingMeter) || 0) -
              (Number(m.rtt) || 0)
          );
          const lineTotal = netLitres * (Number(m.unitPrice) || defaultPrice);

          return (
            <div
              key={m.id}
              className="bg-[#15171a] border border-[#333739] rounded-xl p-3.5 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  disabled={disabled}
                  value={m.pumpName}
                  onChange={(e) => handleUpdateMeter(m.id, 'pumpName', e.target.value)}
                  className="bg-[#191c1f] border border-[#333739] rounded-lg px-2.5 py-1 text-xs text-[#ece8e0] font-semibold w-48"
                />
                {!disabled && productMeters.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePump(m.id)}
                    className="p-1 rounded text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-[#8d9195] font-bold block mb-1">
                    Opening Meters
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={disabled}
                    value={m.openingMeter || ''}
                    onChange={(e) =>
                      handleUpdateMeter(m.id, 'openingMeter', parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                    className="w-full bg-[#191c1f] border border-[#333739] rounded-lg px-2 py-1.5 text-xs text-[#ece8e0] font-mono text-right"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-blue-300 font-bold block mb-1">
                    Closing Meters
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={disabled}
                    value={m.closingMeter || ''}
                    onChange={(e) =>
                      handleUpdateMeter(m.id, 'closingMeter', parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                    className="w-full bg-[#191c1f] border border-blue-800 rounded-lg px-2 py-1.5 text-xs text-blue-200 font-mono text-right font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-amber-300 font-bold block mb-1">
                    RTT (Litres)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={disabled}
                    value={m.rtt || ''}
                    onChange={(e) =>
                      handleUpdateMeter(m.id, 'rtt', parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                    className="w-full bg-[#191c1f] border border-[#333739] rounded-lg px-2 py-1.5 text-xs text-amber-300 font-mono text-right"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#8d9195] font-bold block mb-1">
                    Unit Price (GH₵)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={disabled}
                    value={m.unitPrice || defaultPrice}
                    onChange={(e) =>
                      handleUpdateMeter(m.id, 'unitPrice', parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-[#191c1f] border border-[#333739] rounded-lg px-2 py-1.5 text-xs text-[#ece8e0] font-mono text-right"
                  />
                </div>
              </div>

              <div className="bg-[#191c1f] rounded-lg p-2.5 border border-[#333739] flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-[#8d9195] block">Litres Sold:</span>
                  <span className="font-mono font-bold text-[#ece8e0]">{formatGhc(netLitres)} L</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#8d9195] block">Total Sales:</span>
                  <span className="font-mono font-extrabold text-[#e8b93b] text-sm">
                    GH₵ {formatGhc(lineTotal)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
