import React, { useState } from 'react';
import {
  Fuel,
  User,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  SupervisorSalesAccountRecord,
  AttendantMeterReading,
  SupervisorAttendantHandover,
} from '../../types';

interface SupervisorFuelSectionProps {
  form: SupervisorSalesAccountRecord;
  onUpdateForm: (updated: Partial<SupervisorSalesAccountRecord>) => void;
  onSyncAttendantHandovers: () => void;
  supervisorName?: string;
  formatGhc: (val: number) => string;
}

export const SupervisorFuelSection: React.FC<SupervisorFuelSectionProps> = ({
  form,
  onUpdateForm,
  onSyncAttendantHandovers,
  supervisorName = 'John Mensah',
  formatGhc,
}) => {
  const [viewMode, setViewMode] = useState<'both' | 'handovers' | 'meters'>('both');
  const [expandedHandoverId, setExpandedHandoverId] = useState<string | null>(null);

  // Handover handlers
  const handleAddAttendantHandover = () => {
    const newHandover: SupervisorAttendantHandover = {
      id: 'sh_' + Date.now(),
      attendantId: 'att_' + Date.now(),
      attendantName: 'Duty Attendant ' + ((form.attendantHandovers?.length || 0) + 1),
      pumpRange: 'Pumps 1 - 2',
      litresSold: 0,
      salesAmount: 0,
      cashHandedOver: 0,
      evaluesAmount: 0,
      vouchersAmount: 0,
      creditSales: 0,
      variance: 0,
      status: 'verified',
    };
    onUpdateForm({
      attendantHandovers: [...(form.attendantHandovers || []), newHandover],
    });
  };

  const handleUpdateAttendantHandover = (
    id: string,
    field: keyof SupervisorAttendantHandover,
    val: any
  ) => {
    const updated = (form.attendantHandovers || []).map((h) => {
      if (h.id !== id) return h;
      const next = { ...h, [field]: val };
      const totalSurrendered =
        (Number(next.cashHandedOver) || 0) +
        (Number(next.evaluesAmount) || 0) +
        (Number(next.vouchersAmount) || 0) +
        (Number(next.creditSales) || 0);
      next.variance = totalSurrendered - (Number(next.salesAmount) || 0);
      next.status = Math.abs(next.variance) <= 0.5 ? 'verified' : 'flagged';
      return next;
    });
    onUpdateForm({ attendantHandovers: updated });
  };

  const handleRemoveAttendantHandover = (id: string) => {
    onUpdateForm({
      attendantHandovers: (form.attendantHandovers || []).filter((h) => h.id !== id),
    });
  };

  // Meter reading handlers
  const handleAddMeterReading = (fuelType: 'super' | 'diesel' | 'ron95' = 'super') => {
    const defaultPrice = fuelType === 'diesel' ? 14.5 : fuelType === 'ron95' ? 14.2 : 13.27;
    const count = (form.fuelMeters || []).filter((m) => m.fuelType === fuelType).length + 1;
    const pumpLabel =
      fuelType === 'super'
        ? `PMS Pump ${count}`
        : fuelType === 'diesel'
        ? `AGO Pump ${count}`
        : `RON 95 Pump ${count}`;

    const newMeter: AttendantMeterReading = {
      id: 'sm_' + Date.now(),
      pumpName: pumpLabel,
      fuelType,
      timeSlot: '06:00 – 18:00',
      openingMeter: 0,
      closingMeter: 0,
      rtt: 0,
      unitPrice: defaultPrice,
      litresSold: 0,
      totalSales: 0,
    };
    onUpdateForm({
      fuelMeters: [...(form.fuelMeters || []), newMeter],
    });
  };

  const handleUpdateMeter = (id: string, field: keyof AttendantMeterReading, val: any) => {
    const updated = (form.fuelMeters || []).map((m) => {
      if (m.id !== id) return m;
      const next = { ...m, [field]: val };
      const netLitres = Math.max(
        0,
        (Number(next.closingMeter) || 0) -
          (Number(next.openingMeter) || 0) -
          (Number(next.rtt) || 0)
      );
      next.litresSold = netLitres;
      next.totalSales = netLitres * (Number(next.unitPrice) || 0);
      return next;
    });
    onUpdateForm({ fuelMeters: updated });
  };

  const handleRemoveMeter = (id: string) => {
    onUpdateForm({
      fuelMeters: (form.fuelMeters || []).filter((m) => m.id !== id),
    });
  };

  // Aggregates
  const totalHandoverLitres = (form.attendantHandovers || []).reduce(
    (acc, h) => acc + (Number(h.litresSold) || 0),
    0
  );
  const totalHandoverSales = (form.attendantHandovers || []).reduce(
    (acc, h) => acc + (Number(h.salesAmount) || 0),
    0
  );
  const totalHandoverCash = (form.attendantHandovers || []).reduce(
    (acc, h) => acc + (Number(h.cashHandedOver) || 0),
    0
  );
  const totalHandoverEvalues = (form.attendantHandovers || []).reduce(
    (acc, h) => acc + (Number(h.evaluesAmount) || 0),
    0
  );
  const totalHandoverVouchers = (form.attendantHandovers || []).reduce(
    (acc, h) => acc + (Number(h.vouchersAmount) || 0),
    0
  );

  const totalMeterLitres = (form.fuelMeters || []).reduce(
    (acc, m) =>
      acc +
      Math.max(
        0,
        (Number(m.closingMeter) || 0) - (Number(m.openingMeter) || 0) - (Number(m.rtt) || 0)
      ),
    0
  );
  const totalMeterSales = (form.fuelMeters || []).reduce((acc, m) => {
    const net = Math.max(
      0,
      (Number(m.closingMeter) || 0) - (Number(m.openingMeter) || 0) - (Number(m.rtt) || 0)
    );
    return acc + net * (Number(m.unitPrice) || 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & QUICK CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#15171a] p-4 rounded-2xl border border-[#333739]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-[#e8b93b] border border-amber-500/30">
              STEP 1 OF 5 · FUEL CONSOLIDATION
            </span>
            <span className="text-xs font-mono text-[#8d9195]">
              {form.station || 'Station'} · {form.date}
            </span>
          </div>
          <h3 className="text-base font-bold text-[#ece8e0] uppercase tracking-wide flex items-center gap-2 mt-1 font-['Space_Grotesk']">
            <Fuel className="w-5 h-5 text-[#e8b93b]" />
            1. Fuel Dispenser Sales & Attendant Shift Handovers
          </h3>
          <p className="text-xs text-[#8d9195]">
            Consolidate individual attendant shift sales or track master station dispenser electronic totalizers.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Selector */}
          <div className="flex bg-[#23262a] p-1 rounded-xl border border-[#333739] text-xs">
            <button
              type="button"
              onClick={() => setViewMode('handovers')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                viewMode === 'handovers'
                  ? 'bg-[#15171a] text-[#e8b93b] shadow-xs'
                  : 'text-[#8d9195] hover:text-[#ece8e0]'
              }`}
            >
              Attendants ({form.attendantHandovers?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('meters')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                viewMode === 'meters'
                  ? 'bg-[#15171a] text-[#e8b93b] shadow-xs'
                  : 'text-[#8d9195] hover:text-[#ece8e0]'
              }`}
            >
              Totalizers ({form.fuelMeters?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                viewMode === 'both'
                  ? 'bg-[#15171a] text-[#e8b93b] shadow-xs'
                  : 'text-[#8d9195] hover:text-[#ece8e0]'
              }`}
            >
              Combined View
            </button>
          </div>

          <button
            type="button"
            onClick={onSyncAttendantHandovers}
            className="py-1.5 px-3 rounded-xl bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            title="Auto-import recorded attendant shift accounts from system"
          >
            <Sparkles size={13} className="text-blue-300 animate-pulse" />
            <span>⚡ Sync Attendant Handovers</span>
          </button>
        </div>
      </div>

      {/* STEP 1 SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#1d2023] border border-[#333739]">
          <span className="text-[10.5px] text-[#8d9195] uppercase font-bold block">
            Total Fuel Litres Sold
          </span>
          <span className="text-base font-extrabold text-[#e8b93b] font-mono">
            {formatGhc(totalMeterLitres || totalHandoverLitres)} L
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#1d2023] border border-[#333739]">
          <span className="text-[10.5px] text-[#8d9195] uppercase font-bold block">
            Gross Fuel Revenue
          </span>
          <span className="text-base font-extrabold text-[#e8b93b] font-mono">
            GH₵ {formatGhc(totalMeterSales || totalHandoverSales)}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#1d2023] border border-[#333739]">
          <span className="text-[10.5px] text-[#8d9195] uppercase font-bold block">
            Cash Surrendered
          </span>
          <span className="text-base font-extrabold text-emerald-400 font-mono">
            GH₵ {formatGhc(totalHandoverCash)}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#1d2023] border border-[#333739]">
          <span className="text-[10.5px] text-[#8d9195] uppercase font-bold block">
            E-Values & Vouchers
          </span>
          <span className="text-base font-extrabold text-blue-300 font-mono">
            GH₵ {formatGhc(totalHandoverEvalues + totalHandoverVouchers)}
          </span>
        </div>
      </div>

      {/* 1. ATTENDANT SHIFT HANDOVERS SECTION */}
      {(viewMode === 'handovers' || viewMode === 'both') && (
        <div className="space-y-4 p-4 sm:p-5 rounded-2xl border border-[#333739] bg-[#191c1f]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-[#ece8e0] uppercase tracking-wide flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                Consolidated Attendants On Duty & Shift Handover Ledger
              </h4>
              <p className="text-[11px] text-[#8d9195]">
                Individual pump attendants surrender pouch cash, POS slips, and vouchers to the supervisor at shift handover.
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddAttendantHandover}
              className="py-1.5 px-3 rounded-xl bg-[#23262a] hover:bg-[#2d3136] border border-[#333739] text-[#ece8e0] text-xs font-bold cursor-pointer flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Plus size={13} className="text-[#e8b93b]" />
              <span>+ Add Duty Attendant</span>
            </button>
          </div>

          {/* MOBILE CARDS VIEW (md:hidden) */}
          <div className="space-y-3 md:hidden">
            {(form.attendantHandovers || []).map((h) => {
              const totalSurrendered =
                (Number(h.cashHandedOver) || 0) +
                (Number(h.evaluesAmount) || 0) +
                (Number(h.vouchersAmount) || 0) +
                (Number(h.creditSales) || 0);
              const variance = totalSurrendered - (Number(h.salesAmount) || 0);
              const isExpanded = expandedHandoverId === h.id;

              return (
                <div
                  key={h.id}
                  className="bg-[#15171a] border border-[#333739] rounded-xl p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <input
                        type="text"
                        value={h.attendantName}
                        onChange={(e) =>
                          handleUpdateAttendantHandover(h.id, 'attendantName', e.target.value)
                        }
                        placeholder="Attendant Name"
                        className="bg-[#23262a] border border-[#333739] rounded-lg px-2.5 py-1 text-xs text-[#ece8e0] font-bold w-full"
                      />
                      <input
                        type="text"
                        value={h.pumpRange}
                        onChange={(e) =>
                          handleUpdateAttendantHandover(h.id, 'pumpRange', e.target.value)
                        }
                        placeholder="Pump assignment (e.g. Pumps 1-2)"
                        className="bg-[#23262a] border border-[#333739] rounded-lg px-2.5 py-1 text-[11px] text-[#8d9195] w-full"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          Math.abs(variance) <= 0.5
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : variance < 0
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {variance >= 0 ? '+' : ''}GH₵ {formatGhc(variance)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttendantHandover(h.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-[#8d9195] block mb-0.5">Litres Sold</label>
                      <input
                        type="number"
                        step="0.01"
                        value={h.litresSold || ''}
                        onChange={(e) =>
                          handleUpdateAttendantHandover(
                            h.id,
                            'litresSold',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-[#ece8e0] font-mono text-right"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8d9195] block mb-0.5">Declared Sales (GH₵)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={h.salesAmount || ''}
                        onChange={(e) =>
                          handleUpdateAttendantHandover(
                            h.id,
                            'salesAmount',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-[#ece8e0] font-mono text-right font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8d9195] block mb-0.5">Cash Handed (GH₵)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={h.cashHandedOver || ''}
                        onChange={(e) =>
                          handleUpdateAttendantHandover(
                            h.id,
                            'cashHandedOver',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full bg-[#23262a] border border-emerald-800/80 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono text-right font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8d9195] block mb-0.5">E-Values / POS (GH₵)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={h.evaluesAmount || ''}
                        onChange={(e) =>
                          handleUpdateAttendantHandover(
                            h.id,
                            'evaluesAmount',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-blue-300 font-mono text-right"
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => setExpandedHandoverId(isExpanded ? null : h.id)}
                      className="text-[11px] text-[#8d9195] hover:text-[#ece8e0] flex items-center gap-1 font-semibold"
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      <span>{isExpanded ? 'Hide Vouchers & Credit' : 'More: Vouchers & Credit'}</span>
                    </button>

                    {isExpanded && (
                      <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#333739]">
                        <div>
                          <label className="text-[10px] text-[#8d9195] block mb-0.5">Vouchers (GH₵)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={h.vouchersAmount || ''}
                            onChange={(e) =>
                              handleUpdateAttendantHandover(
                                h.id,
                                'vouchersAmount',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono text-right"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#8d9195] block mb-0.5">Credit Sales (GH₵)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={h.creditSales || ''}
                            onChange={(e) =>
                              handleUpdateAttendantHandover(
                                h.id,
                                'creditSales',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2.5 py-1.5 text-xs text-purple-300 font-mono text-right"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* TABLE VIEW (hidden on mobile, visible on md+) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-[#333739] bg-[#15171a]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#23262a] text-[#8d9195] font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Attendant Name</th>
                  <th className="p-2.5">Pump Assignment</th>
                  <th className="p-2.5 text-right">Litres Dispensed</th>
                  <th className="p-2.5 text-right">Declared Sales (GH₵)</th>
                  <th className="p-2.5 text-right">Cash Handed (GH₵)</th>
                  <th className="p-2.5 text-right">E-Values / POS</th>
                  <th className="p-2.5 text-right">Vouchers Handed</th>
                  <th className="p-2.5 text-center">Variance</th>
                  <th className="p-2.5 text-center">Status</th>
                  <th className="p-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333739]">
                {(form.attendantHandovers || []).map((h) => {
                  const totalSurrendered =
                    (Number(h.cashHandedOver) || 0) +
                    (Number(h.evaluesAmount) || 0) +
                    (Number(h.vouchersAmount) || 0) +
                    (Number(h.creditSales) || 0);
                  const variance = totalSurrendered - (Number(h.salesAmount) || 0);

                  return (
                    <tr key={h.id} className="hover:bg-[#1d2023]/60 transition-colors">
                      <td className="p-2.5">
                        <div className="space-y-0.5">
                          <input
                            type="text"
                            value={h.attendantName}
                            onChange={(e) =>
                              handleUpdateAttendantHandover(h.id, 'attendantName', e.target.value)
                            }
                            className="w-36 bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1 text-xs text-[#ece8e0] font-semibold"
                          />
                          <span className="text-[10px] font-mono text-[#8d9195] block">
                            ID: {h.attendantId || 'EMP-014'}
                          </span>
                        </div>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={h.pumpRange}
                          onChange={(e) =>
                            handleUpdateAttendantHandover(h.id, 'pumpRange', e.target.value)
                          }
                          placeholder="e.g. Pumps 1-2 Super"
                          className="w-32 bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1 text-xs text-[#ece8e0]"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={h.litresSold || ''}
                          onChange={(e) =>
                            handleUpdateAttendantHandover(
                              h.id,
                              'litresSold',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-20 bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1 text-xs text-[#ece8e0] font-mono text-right"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={h.salesAmount || ''}
                          onChange={(e) =>
                            handleUpdateAttendantHandover(
                              h.id,
                              'salesAmount',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-24 bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1 text-xs text-[#ece8e0] font-mono text-right font-bold"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={h.cashHandedOver || ''}
                          onChange={(e) =>
                            handleUpdateAttendantHandover(
                              h.id,
                              'cashHandedOver',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-24 bg-[#23262a] border border-emerald-800/80 rounded-lg px-2 py-1 text-xs text-emerald-300 font-mono text-right font-bold"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={h.evaluesAmount || ''}
                          onChange={(e) =>
                            handleUpdateAttendantHandover(
                              h.id,
                              'evaluesAmount',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-20 bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1 text-xs text-blue-300 font-mono text-right"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={h.vouchersAmount || ''}
                          onChange={(e) =>
                            handleUpdateAttendantHandover(
                              h.id,
                              'vouchersAmount',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-20 bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1 text-xs text-amber-300 font-mono text-right"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                            Math.abs(variance) <= 0.5
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : variance < 0
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {variance >= 0 ? '+' : ''}GH₵ {formatGhc(variance)}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            Math.abs(variance) <= 0.5
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {Math.abs(variance) <= 0.5 ? 'Verified' : 'Discrepancy'}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveAttendantHandover(h.id)}
                          className="p-1 rounded text-rose-400 hover:bg-rose-950/50 cursor-pointer"
                          title="Delete Attendant Handover"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-[#1d2023] font-bold text-xs border-t border-[#333739]">
                <tr>
                  <td colSpan={2} className="p-3 text-right text-[#8d9195]">
                    Duty Team Totals ({(form.attendantHandovers || []).length} Attendants):
                  </td>
                  <td className="p-3 text-right font-mono text-[#e8b93b]">
                    {formatGhc(totalHandoverLitres)} L
                  </td>
                  <td className="p-3 text-right font-mono text-[#e8b93b]">
                    GH₵ {formatGhc(totalHandoverSales)}
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-400">
                    GH₵ {formatGhc(totalHandoverCash)}
                  </td>
                  <td className="p-3 text-right font-mono text-blue-300">
                    GH₵ {formatGhc(totalHandoverEvalues)}
                  </td>
                  <td className="p-3 text-right font-mono text-amber-300">
                    GH₵ {formatGhc(totalHandoverVouchers)}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* 2. STATION DISPENSER MASTER TOTALIZERS & METERS */}
      {(viewMode === 'meters' || viewMode === 'both') && (
        <div className="space-y-4 p-4 sm:p-5 rounded-2xl border border-[#333739] bg-[#191c1f]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-[#ece8e0] uppercase tracking-wide flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#e8b93b]" />
                Station Dispenser Master Electronic Totalizers & Meter Readings
              </h4>
              <p className="text-[11px] text-[#8d9195]">
                Direct pump master meter readings for PMS (Super), RON 95 (V-Power), and AGO (Diesel).
              </p>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleAddMeterReading('super')}
                className="py-1 px-2.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold cursor-pointer"
              >
                + Super (PMS)
              </button>
              <button
                type="button"
                onClick={() => handleAddMeterReading('ron95')}
                className="py-1 px-2.5 rounded-lg bg-blue-950/60 hover:bg-blue-900 border border-blue-800 text-blue-300 text-xs font-bold cursor-pointer"
              >
                + RON 95
              </button>
              <button
                type="button"
                onClick={() => handleAddMeterReading('diesel')}
                className="py-1 px-2.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-bold cursor-pointer"
              >
                + Diesel (AGO)
              </button>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (md:hidden) */}
          <div className="space-y-3 md:hidden">
            {(form.fuelMeters || []).map((m) => {
              const netLitres = Math.max(
                0,
                (Number(m.closingMeter) || 0) -
                  (Number(m.openingMeter) || 0) -
                  (Number(m.rtt) || 0)
              );
              const lineTotal = netLitres * (Number(m.unitPrice) || 0);

              return (
                <div
                  key={m.id}
                  className="bg-[#15171a] border border-[#333739] rounded-xl p-3.5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                          m.fuelType === 'super'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : m.fuelType === 'ron95'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {m.fuelType}
                      </span>
                      <input
                        type="text"
                        value={m.pumpName}
                        onChange={(e) => handleUpdateMeter(m.id, 'pumpName', e.target.value)}
                        className="bg-[#23262a] border border-[#333739] rounded-lg px-2.5 py-1 text-xs text-[#ece8e0] font-bold w-32"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMeter(m.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-950/50"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-[#8d9195] block mb-0.5">Opening Meter</label>
                      <input
                        type="number"
                        step="0.01"
                        value={m.openingMeter || ''}
                        onChange={(e) =>
                          handleUpdateMeter(m.id, 'openingMeter', parseFloat(e.target.value) || 0)
                        }
                        className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1.5 text-xs text-[#ece8e0] font-mono text-right"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8d9195] block mb-0.5">Closing Meter</label>
                      <input
                        type="number"
                        step="0.01"
                        value={m.closingMeter || ''}
                        onChange={(e) =>
                          handleUpdateMeter(m.id, 'closingMeter', parseFloat(e.target.value) || 0)
                        }
                        className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1.5 text-xs text-[#ece8e0] font-mono text-right"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#8d9195] block mb-0.5">RTT (L)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={m.rtt || ''}
                        onChange={(e) =>
                          handleUpdateMeter(m.id, 'rtt', parseFloat(e.target.value) || 0)
                        }
                        className="w-full bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1.5 text-xs text-amber-300 font-mono text-right"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#333739] text-xs">
                    <div>
                      <span className="text-[10px] text-[#8d9195] block">Net Litres Sold</span>
                      <span className="font-mono font-bold text-[#ece8e0]">
                        {formatGhc(netLitres)} L
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-[#8d9195] block">
                        Price: GH₵ {(Number(m.unitPrice) || 0).toFixed(2)}/L
                      </span>
                      <span className="font-mono font-bold text-[#e8b93b] text-sm">
                        GH₵ {formatGhc(lineTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* TABLE VIEW (hidden on mobile, visible on md+) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-[#333739] bg-[#15171a]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#23262a] text-[#8d9195] font-mono uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Pump Name</th>
                  <th className="p-2.5">Product</th>
                  <th className="p-2.5 text-right">Opening Meter</th>
                  <th className="p-2.5 text-right">Closing Meter</th>
                  <th className="p-2.5 text-right">RTT (L)</th>
                  <th className="p-2.5 text-right">Net Litres Sold</th>
                  <th className="p-2.5 text-right">Price (GH₵)</th>
                  <th className="p-2.5 text-right">Total Amount (GH₵)</th>
                  <th className="p-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#333739]">
                {(form.fuelMeters || []).map((m) => {
                  const netLitres = Math.max(
                    0,
                    (Number(m.closingMeter) || 0) -
                      (Number(m.openingMeter) || 0) -
                      (Number(m.rtt) || 0)
                  );
                  const lineTotal = netLitres * (Number(m.unitPrice) || 0);

                  return (
                    <tr key={m.id} className="hover:bg-[#1d2023]/60 transition-colors">
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={m.pumpName}
                          onChange={(e) => handleUpdateMeter(m.id, 'pumpName', e.target.value)}
                          className="w-28 bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1 text-xs text-[#ece8e0] font-semibold"
                        />
                      </td>
                      <td className="p-2.5">
                        <select
                          value={m.fuelType}
                          onChange={(e) =>
                            handleUpdateMeter(
                              m.id,
                              'fuelType',
                              e.target.value as 'super' | 'diesel' | 'ron95'
                            )
                          }
                          className="bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1 text-xs text-[#ece8e0] uppercase"
                        >
                          <option value="super">Super (PMS)</option>
                          <option value="ron95">RON 95 (V-Power)</option>
                          <option value="diesel">Diesel (AGO)</option>
                        </select>
                      </td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={m.openingMeter || ''}
                          onChange={(e) =>
                            handleUpdateMeter(
                              m.id,
                              'openingMeter',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-24 bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1 text-xs text-[#ece8e0] font-mono text-right"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={m.closingMeter || ''}
                          onChange={(e) =>
                            handleUpdateMeter(
                              m.id,
                              'closingMeter',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-24 bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1 text-xs text-[#ece8e0] font-mono text-right"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={m.rtt || ''}
                          onChange={(e) =>
                            handleUpdateMeter(m.id, 'rtt', parseFloat(e.target.value) || 0)
                          }
                          className="w-16 bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1 text-xs text-amber-300 font-mono text-right"
                        />
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-[#ece8e0]">
                        {formatGhc(netLitres)} L
                      </td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={m.unitPrice || ''}
                          onChange={(e) =>
                            handleUpdateMeter(
                              m.id,
                              'unitPrice',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-16 bg-[#23262a] border border-[#333739] rounded-lg px-2 py-1 text-xs text-[#ece8e0] font-mono text-right"
                        />
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-[#e8b93b]">
                        GH₵ {formatGhc(lineTotal)}
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveMeter(m.id)}
                          className="p-1 rounded text-rose-400 hover:bg-rose-950/50 cursor-pointer"
                          title="Delete Dispenser Meter"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-[#1d2023] font-bold text-xs border-t border-[#333739]">
                <tr>
                  <td colSpan={5} className="p-3 text-right text-[#8d9195]">
                    Total Dispenser Throughput & Gross Fuel Sales:
                  </td>
                  <td className="p-3 text-right font-mono text-[#e8b93b]">
                    {formatGhc(totalMeterLitres)} L
                  </td>
                  <td></td>
                  <td className="p-3 text-right font-mono text-[#e8b93b]">
                    GH₵ {formatGhc(totalMeterSales)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
