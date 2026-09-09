import React from 'react';
import { Cylinder, Fuel, ArrowDownRight, ArrowUpRight, CheckCircle2, AlertTriangle, Scale, Info, Truck } from 'lucide-react';
import { ShiftRecord, FUELS, TankStockItem } from '../../types';
import { calculateReconciliation, fmtPlain, num } from '../../utils/calculations';

interface Step5TankStocksProps {
  record: ShiftRecord;
  onChange: (updated: ShiftRecord) => void;
}

export const Step5TankStocks: React.FC<Step5TankStocksProps> = ({
  record,
  onChange,
}) => {
  const recon = calculateReconciliation(record);

  const handleStockFieldChange = (
    fuelId: string,
    field: keyof TankStockItem,
    value: string | number
  ) => {
    const currentStocks = record.stocks || {};
    const currentItem = currentStocks[fuelId] || {
      openingStock: 0,
      stockReceived: 0,
      physicalClosing: 0,
      notes: '',
    };

    const parsedValue = field === 'notes' ? String(value) : Math.max(0, num(value));

    onChange({
      ...record,
      stocks: {
        ...currentStocks,
        [fuelId]: {
          ...currentItem,
          [field]: parsedValue,
        },
      },
    });
  };

  return (
    <div className="space-y-4 pb-4">
      <div>
        <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <Fuel className="w-5 h-5 text-emerald-600" />
          Tank Stocks &amp; Dipping Analysis
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Record opening dip, fuel tanker offloads received, and physical closing dips to compute tank stock variation (gain/loss).
        </p>
      </div>

      {/* Overview Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-2xs">
          <span className="text-[11px] text-stone-500 font-semibold block">Total Opening Stock</span>
          <span className="text-sm font-bold font-mono text-stone-900">
            {fmtPlain(recon.totalOpeningStock)} L
          </span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-2xs">
          <span className="text-[11px] text-stone-500 font-semibold block flex items-center gap-1">
            <Truck className="w-3 h-3 text-blue-600" /> Stock Received (BRV)
          </span>
          <span className="text-sm font-bold font-mono text-blue-700">
            +{fmtPlain(recon.totalStockReceived)} L
          </span>
        </div>

        <div className="bg-white rounded-xl p-3 border border-stone-200 shadow-2xs">
          <span className="text-[11px] text-stone-500 font-semibold block">Total Sales Dispensed</span>
          <span className="text-sm font-bold font-mono text-stone-700">
            -{fmtPlain(recon.totalLitres)} L
          </span>
        </div>

        <div className={`rounded-xl p-3 border shadow-2xs ${
          recon.totalStockVariation < -0.5
            ? 'bg-rose-50 border-rose-200 text-rose-900'
            : recon.totalStockVariation > 0.5
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <span className="text-[11px] font-semibold block">Total Stock Variation</span>
          <span className="text-sm font-bold font-mono">
            {recon.totalStockVariation > 0 ? `+${fmtPlain(recon.totalStockVariation)} L` : `${fmtPlain(recon.totalStockVariation)} L`}
          </span>
        </div>
      </div>

      {/* Per-Fuel Tank Dipping Cards */}
      <div className="space-y-4">
        {FUELS.map((f) => {
          const stock = recon.stockBreakdown[f.id] || {
            fuelId: f.id,
            label: f.label,
            shortName: f.shortName,
            openingStock: 0,
            stockReceived: 0,
            totalAvailable: 0,
            salesLitres: 0,
            bookClosing: 0,
            physicalClosing: 0,
            variation: 0,
            variationPercent: 0,
            status: 'balanced' as const,
          };
          const stockData = record.stocks?.[f.id] || {
            openingStock: 0,
            stockReceived: 0,
            physicalClosing: 0,
            notes: '',
          };

          const pumpCount = record.fuels[f.id]?.pumps?.length || 0;
          const isCarried = pumpCount > 0 || stock.salesLitres > 0 || stockData.openingStock > 0 || stockData.stockReceived > 0 || stockData.physicalClosing > 0;

          const isGain = stock.variation > 0.5;
          const isLoss = stock.variation < -0.5;

          if (!isCarried) {
            return (
              <div
                key={f.id}
                className="bg-stone-50/70 rounded-2xl p-4 border border-dashed border-stone-200 flex items-center justify-between opacity-75"
              >
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-stone-300" />
                  <div>
                    <h3 className="font-bold text-xs text-stone-600">{f.label}</h3>
                    <p className="text-[10px] text-stone-400">
                      Not carried at this station branch (0 dispensers configured)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleStockFieldChange(f.id, 'notes', 'Manual tank entry')
                  }
                  className="px-2.5 py-1 text-[11px] font-bold text-stone-600 bg-white border border-stone-300 rounded-lg hover:bg-stone-100 cursor-pointer"
                >
                  + Add Tank Dip
                </button>
              </div>
            );
          }

          return (
            <div
              key={f.id}
              className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-3.5 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3.5 h-3.5 rounded-full ${
                      f.id === 'pms' ? 'bg-emerald-500' : f.id === 'ago' ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                  />
                  <div>
                    <h3 className="font-bold text-sm text-stone-900">{f.label}</h3>
                    <p className="text-[11px] text-stone-500 font-mono">
                      Shift Sales: <strong>{fmtPlain(stock.salesLitres)} Litres</strong>
                    </p>
                  </div>
                </div>

                {/* Variation Badge */}
                <div
                  className={`px-3 py-1 rounded-full text-xs font-bold font-mono flex items-center gap-1 border ${
                    isLoss
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : isGain
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {isLoss ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Loss: {fmtPlain(stock.variation)} L ({stock.variationPercent.toFixed(1)}%)
                    </>
                  ) : isGain ? (
                    <>
                      <ArrowUpRight className="w-3.5 h-3.5 text-amber-700" />
                      Gain: +{fmtPlain(stock.variation)} L (+{stock.variationPercent.toFixed(1)}%)
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Balanced (0.00 L)
                    </>
                  )}
                </div>
              </div>

              {/* Input Form Fields */}
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Opening Stock Input */}
                  <div className="bg-stone-50/70 p-3 rounded-xl border border-stone-200 space-y-1">
                    <label className="block text-[11px] font-bold text-stone-700">
                      1. Opening Stock (Dip)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={stockData.openingStock || ''}
                        onChange={(e) =>
                          handleStockFieldChange(f.id, 'openingStock', e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] text-stone-400 font-bold">
                        LITRES
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500 block">
                      Initial tank dip at shift start
                    </span>
                  </div>

                  {/* Stock Received Input */}
                  <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200 space-y-1">
                    <label className="block text-[11px] font-bold text-blue-950 flex items-center gap-1">
                      <Truck className="w-3 h-3 text-blue-600" /> 2. Stock Received (BRV)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={stockData.stockReceived || ''}
                        onChange={(e) =>
                          handleStockFieldChange(f.id, 'stockReceived', e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full bg-white border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] text-blue-400 font-bold">
                        LITRES
                      </span>
                    </div>
                    <span className="text-[10px] text-blue-600 block">
                      Tanker discharge / offload volume
                    </span>
                  </div>

                  {/* Physical Closing Dip Input */}
                  <div className="bg-stone-50/70 p-3 rounded-xl border border-stone-200 space-y-1">
                    <label className="block text-[11px] font-bold text-stone-700">
                      3. Physical Closing Dip
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={stockData.physicalClosing || ''}
                        onChange={(e) =>
                          handleStockFieldChange(f.id, 'physicalClosing', e.target.value)
                        }
                        placeholder="0.00"
                        className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-2.5 top-2 text-[10px] text-stone-400 font-bold">
                        LITRES
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-500 block">
                      Actual dip measured at shift close
                    </span>
                  </div>
                </div>

                {/* Mathematical Stock Reconciliation Strip */}
                <div className="bg-stone-900 text-white rounded-xl p-3 text-xs overflow-x-auto">
                  <div className="flex items-center justify-between gap-4 font-mono min-w-[500px]">
                    <div className="text-center">
                      <span className="text-[10px] text-stone-400 block font-sans">Available Stock</span>
                      <span className="font-bold text-stone-200">
                        {fmtPlain(stock.totalAvailable)} L
                      </span>
                    </div>
                    <span className="text-stone-500 font-bold">-</span>
                    <div className="text-center">
                      <span className="text-[10px] text-stone-400 block font-sans">Sales Dispensed</span>
                      <span className="font-bold text-stone-200">
                        {fmtPlain(stock.salesLitres)} L
                      </span>
                    </div>
                    <span className="text-stone-500 font-bold">=</span>
                    <div className="text-center">
                      <span className="text-[10px] text-emerald-400 block font-sans font-bold">Book Closing Stock</span>
                      <span className="font-bold text-emerald-300">
                        {fmtPlain(stock.bookClosing)} L
                      </span>
                    </div>
                    <span className="text-stone-500 font-bold">vs</span>
                    <div className="text-center">
                      <span className="text-[10px] text-stone-400 block font-sans">Actual Physical Dip</span>
                      <span className="font-bold text-white">
                        {fmtPlain(stock.physicalClosing)} L
                      </span>
                    </div>
                    <span className="text-stone-500 font-bold">=</span>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 block font-sans font-bold">Variation (Gain / Loss)</span>
                      <span
                        className={`font-extrabold text-sm ${
                          isLoss
                            ? 'text-rose-400'
                            : isGain
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {stock.variation > 0 ? `+${fmtPlain(stock.variation)} L` : `${fmtPlain(stock.variation)} L`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Optional Delivery Waybill / Tank Notes */}
                <div>
                  <input
                    type="text"
                    value={stockData.notes || ''}
                    onChange={(e) => handleStockFieldChange(f.id, 'notes', e.target.value)}
                    placeholder={`Optional waybill / BRV tanker number or dip remarks for ${f.shortName}...`}
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Reference Note */}
      <div className="bg-stone-50 rounded-xl p-3 border border-stone-200 text-xs text-stone-600 flex items-start gap-2">
        <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-stone-800">Standard Tank Stock Dipping Formula:</span>
          <p className="text-[11px] text-stone-500 mt-0.5">
            <strong>Book Closing Stock</strong> = Opening Stock + Stock Received (Discharged) - Meter Sales Dispensed.
            <br />
            <strong>Stock Variation</strong> = Physical Closing Dip - Book Closing Stock. Normal station operating evaporation and temperature variance tolerance is typically within ±0.5%.
          </p>
        </div>
      </div>
    </div>
  );
};
