import React from 'react';
import { TrendingUp, Fuel, Droplet, CheckCircle2 } from 'lucide-react';
import { SupervisorSalesAccountRecord } from '../../types';

interface SupervisorTotalStationSalesSectionProps {
  form: SupervisorSalesAccountRecord;
  formatGhc: (val: number) => string;
  summary: any;
}

export const SupervisorTotalStationSalesSection: React.FC<SupervisorTotalStationSalesSectionProps> = ({
  form,
  formatGhc,
  summary,
}) => {
  const fb = summary.fuelBreakdown || {
    superLitres: 0,
    superSales: 0,
    dieselLitres: 0,
    dieselSales: 0,
    ron95Litres: 0,
    ron95Sales: 0,
  };

  const totalFuelSales = (fb.superSales || 0) + (fb.dieselSales || 0) + (fb.ron95Sales || 0);
  const totalLubeSales = summary.totalLubeSales || 0;
  const grandTotalSales = totalFuelSales + totalLubeSales;

  return (
    <div className="bg-[#191c1f] rounded-2xl border border-[#333739] p-4 sm:p-5 space-y-4">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#333739] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-[#e8b93b]/15 text-[#e8b93b] flex items-center justify-center font-mono font-bold text-xs border border-[#e8b93b]/30">
            7
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-[#ece8e0] uppercase tracking-wide flex items-center gap-2 font-['Space_Grotesk']">
                <TrendingUp className="w-4 h-4 text-[#e8b93b]" />
                7. Total Station Sales Summary
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                Consolidated Revenue
              </span>
            </div>
            <p className="text-xs text-[#8d9195]">
              Gross sales revenue across Super, Diesel, RON 95, and StarOil lubricants.
            </p>
          </div>
        </div>

        <div className="p-2.5 px-4 rounded-xl bg-[#15171a] border border-[#e8b93b]/40 flex items-center gap-3">
          <span className="text-xs text-[#8d9195] uppercase font-bold">Grand Station Sales:</span>
          <span className="text-base sm:text-lg font-black font-mono text-[#e8b93b]">
            GH₵ {formatGhc(grandTotalSales)}
          </span>
        </div>
      </div>

      {/* PRODUCT SALES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Super PMS */}
        <div className="bg-[#15171a] border border-rose-900/40 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-300 uppercase flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Super (PMS)
            </span>
            <span className="text-[10.5px] font-mono text-[#8d9195]">
              {formatGhc(fb.superLitres)} L
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-[#ece8e0]">
            GH₵ {formatGhc(fb.superSales)}
          </div>
          <div className="text-[10px] text-[#8d9195]">
            {summary.totalFuelSales > 0
              ? `${((fb.superSales / summary.totalFuelSales) * 100).toFixed(1)}% of fuel volume`
              : '0.0%'}
          </div>
        </div>

        {/* Diesel AGO */}
        <div className="bg-[#15171a] border border-emerald-900/40 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 uppercase flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Diesel (AGO)
            </span>
            <span className="text-[10.5px] font-mono text-[#8d9195]">
              {formatGhc(fb.dieselLitres)} L
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-[#ece8e0]">
            GH₵ {formatGhc(fb.dieselSales)}
          </div>
          <div className="text-[10px] text-[#8d9195]">
            {summary.totalFuelSales > 0
              ? `${((fb.dieselSales / summary.totalFuelSales) * 100).toFixed(1)}% of fuel volume`
              : '0.0%'}
          </div>
        </div>

        {/* RON 95 */}
        <div className="bg-[#15171a] border border-blue-900/40 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-300 uppercase flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              RON 95 (V-Power)
            </span>
            <span className="text-[10.5px] font-mono text-[#8d9195]">
              {formatGhc(fb.ron95Litres)} L
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-[#ece8e0]">
            GH₵ {formatGhc(fb.ron95Sales)}
          </div>
          <div className="text-[10px] text-[#8d9195]">
            {summary.totalFuelSales > 0
              ? `${((fb.ron95Sales / summary.totalFuelSales) * 100).toFixed(1)}% of fuel volume`
              : '0.0%'}
          </div>
        </div>

        {/* Lubricants */}
        <div className="bg-[#15171a] border border-amber-900/40 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 uppercase flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Lubricants
            </span>
            <span className="text-[10.5px] font-mono text-[#8d9195]">
              {summary.totalLubeUnitsSold || 0} Units
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-[#ece8e0]">
            GH₵ {formatGhc(totalLubeSales)}
          </div>
          <div className="text-[10px] text-[#8d9195]">
            {(form.lubricantSales || []).length} Product lines sold
          </div>
        </div>
      </div>
    </div>
  );
};
