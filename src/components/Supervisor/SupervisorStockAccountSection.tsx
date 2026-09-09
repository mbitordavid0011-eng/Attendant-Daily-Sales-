import React from 'react';
import { Cylinder, Fuel, Truck, AlertTriangle, CheckCircle2, Scale, Info } from 'lucide-react';
import { SupervisorSalesAccountRecord, TankStockItem } from '../../types';

interface SupervisorStockAccountSectionProps {
  form: SupervisorSalesAccountRecord;
  onUpdateForm: (updated: Partial<SupervisorSalesAccountRecord>) => void;
  formatGhc: (val: number) => string;
  summary: any;
  disabled?: boolean;
}

export const SupervisorStockAccountSection: React.FC<SupervisorStockAccountSectionProps> = ({
  form,
  onUpdateForm,
  formatGhc,
  summary,
  disabled = false,
}) => {
  const stockBreakdown = summary.stockBreakdown || {};

  const handleUpdateStockField = (
    fuelId: string,
    field: keyof TankStockItem,
    val: any
  ) => {
    const currentStocks = form.stocks || {};
    const item = currentStocks[fuelId] || {
      openingStock: 0,
      stockReceived: 0,
      physicalClosing: 0,
      notes: '',
    };

    const nextItem = {
      ...item,
      [field]: field === 'notes' ? String(val) : Math.max(0, Number(val) || 0),
    };

    onUpdateForm({
      stocks: {
        ...currentStocks,
        [fuelId]: nextItem,
      },
    });
  };

  const fuelDefs = [
    { id: 'super', label: 'Super / PMS', color: 'rose' },
    { id: 'diesel', label: 'Diesel / AGO', color: 'emerald' },
    { id: 'ron95', label: 'RON 95 (V-Power)', color: 'blue' },
  ];

  return (
    <div className="bg-[#191c1f] rounded-2xl border border-[#333739] p-4 sm:p-5 space-y-4">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#333739] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-[#e8b93b]/15 text-[#e8b93b] flex items-center justify-center font-mono font-bold text-xs border border-[#e8b93b]/30">
            6
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-[#ece8e0] uppercase tracking-wide flex items-center gap-2 font-['Space_Grotesk']">
                <Cylinder className="w-4 h-4 text-[#e8b93b]" />
                6. Stock Account & Underground Tank Dips
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-blue-500/10 text-blue-300 border-blue-500/30">
                Dip vs Totalizer Variance
              </span>
            </div>
            <p className="text-xs text-[#8d9195]">
              Verify physical dip stick measurements against master totalizer sales to identify gain or loss.
            </p>
          </div>
        </div>
      </div>

      {/* STOCK ACCOUNT SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fuelDefs.map((def) => {
          const item = stockBreakdown[def.id] || {
            openingStock: 0,
            stockReceived: 0,
            totalStock: 0,
            closingStock: 0,
            salesPerDips: 0,
            salesPerTotalizer: 0,
            variance: 0,
            stockUnderground: 0,
          };

          const sData = form.stocks?.[def.id] || {
            openingStock: item.openingStock,
            stockReceived: item.stockReceived,
            physicalClosing: item.closingStock,
            notes: '',
          };

          const isGain = item.variance > 0.5;
          const isLoss = item.variance < -0.5;

          return (
            <div
              key={def.id}
              className="bg-[#15171a] border border-[#333739] rounded-xl p-4 space-y-3 shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-[#333739] pb-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      def.color === 'rose'
                        ? 'bg-rose-500'
                        : def.color === 'emerald'
                        ? 'bg-emerald-500'
                        : 'bg-blue-500'
                    }`}
                  />
                  <h4 className="font-bold text-xs sm:text-sm text-[#ece8e0] uppercase">
                    {def.label}
                  </h4>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    !isLoss && !isGain
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : isLoss
                      ? 'bg-rose-950 text-rose-300 border-rose-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}
                >
                  {item.variance >= 0 ? '+' : ''}
                  {formatGhc(item.variance)} L
                </span>
              </div>

              {/* INPUT FIELDS */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10.5px] text-[#8d9195] font-bold block mb-1">
                    Opening Stock (L)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={disabled}
                    value={sData.openingStock || ''}
                    onChange={(e) =>
                      handleUpdateStockField(def.id, 'openingStock', parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-[#191c1f] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-[#ece8e0] font-mono text-right"
                  />
                </div>

                <div>
                  <label className="text-[10.5px] text-blue-300 font-bold block mb-1">
                    Stock Received (BRV)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={disabled}
                    value={sData.stockReceived || ''}
                    onChange={(e) =>
                      handleUpdateStockField(def.id, 'stockReceived', parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-[#191c1f] border border-blue-900/60 rounded-lg px-2.5 py-1.5 text-xs text-blue-200 font-mono text-right"
                  />
                </div>

                <div>
                  <label className="text-[10.5px] text-[#8d9195] font-bold block mb-1">
                    Total Stock (L)
                  </label>
                  <div className="w-full bg-[#191c1f] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-[#ece8e0] font-mono text-right font-bold">
                    {formatGhc(item.totalStock)} L
                  </div>
                </div>

                <div>
                  <label className="text-[10.5px] text-amber-300 font-bold block mb-1">
                    Closing Stock (Dip)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={disabled}
                    value={sData.physicalClosing || ''}
                    onChange={(e) =>
                      handleUpdateStockField(def.id, 'physicalClosing', parseFloat(e.target.value) || 0)
                    }
                    className="w-full bg-[#191c1f] border border-amber-900/60 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono text-right font-bold"
                  />
                </div>
              </div>

              {/* CALCULATED COMPARISON TABLE */}
              <div className="bg-[#191c1f] rounded-lg p-3 border border-[#333739] space-y-1.5 text-xs">
                <div className="flex justify-between items-center text-[#8d9195]">
                  <span>Sales Per Dips:</span>
                  <span className="font-mono font-bold text-[#ece8e0]">
                    {formatGhc(item.salesPerDips)} L
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#8d9195]">
                  <span>Sales Per Totalizer:</span>
                  <span className="font-mono font-bold text-[#ece8e0]">
                    {formatGhc(item.salesPerTotalizer)} L
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#8d9195] pt-1 border-t border-[#333739]">
                  <span className="font-semibold">Variance (Gain / Loss):</span>
                  <span
                    className={`font-mono font-extrabold ${
                      isLoss
                        ? 'text-rose-400'
                        : isGain
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {item.variance >= 0 ? '+' : ''}
                    {formatGhc(item.variance)} L
                  </span>
                </div>
                <div className="flex justify-between items-center text-[#8d9195] pt-1 border-t border-[#333739]">
                  <span>Stock Underground:</span>
                  <span className="font-mono font-bold text-blue-300">
                    {formatGhc(item.stockUnderground)} L
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
