import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  TrendingUp,
  Fuel,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  PieChart as PieChartIcon,
  Scale,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import { ShiftRecord, FUELS } from '../types';
import { calculateReconciliation, fmt, fmtPlain } from '../utils/calculations';

interface ReportsViewProps {
  records: ShiftRecord[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({ records }) => {
  const [timeFilter, setTimeFilterState] = useState<'7days' | '30days' | 'all'>(() => {
    try {
      const saved = localStorage.getItem('staroil_reports_time_filter');
      if (saved === '7days' || saved === '30days' || saved === 'all') return saved;
    } catch {}
    return '30days';
  });

  const setTimeFilter = (tf: '7days' | '30days' | 'all') => {
    setTimeFilterState(tf);
    try {
      localStorage.setItem('staroil_reports_time_filter', tf);
    } catch {}
  };

  const [activeTab, setActiveTabState] = useState<'overview' | 'charts' | 'eod' | 'variances'>(() => {
    try {
      const saved = localStorage.getItem('staroil_reports_tab');
      if (saved === 'overview' || saved === 'charts' || saved === 'eod' || saved === 'variances') return saved;
    } catch {}
    return 'overview';
  });

  const setActiveTab = (tab: 'overview' | 'charts' | 'eod' | 'variances') => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('staroil_reports_tab', tab);
    } catch {}
  };

  const [expandedEodDate, setExpandedEodDate] = useState<string | null>(null);

  const submittedRecords = useMemo(
    () => records.filter((r) => r.status === 'submitted' || r.status === 'verified'),
    [records]
  );

  const filteredRecords = useMemo(() => {
    if (timeFilter === 'all') return submittedRecords;
    const now = Date.now();
    const days = timeFilter === '7days' ? 7 : 30;
    return submittedRecords.filter((r) => {
      const recDate = new Date(r.date).getTime();
      return now - recDate <= days * 86400000;
    });
  }, [submittedRecords, timeFilter]);

  // Aggregate global totals
  const totals = useMemo(() => {
    let totalLitres = 0;
    let totalSales = 0;
    let totalDrawings = 0;
    let totalCashBank = 0;
    let totalPhysicalCash = 0;
    let totalShortage = 0;
    let totalExcess = 0;
    let totalStockVariation = 0;

    const fuelVolume: Record<string, { litres: number; sales: number }> = {};
    FUELS.forEach((f) => {
      fuelVolume[f.id] = { litres: 0, sales: 0 };
    });

    const paymentChannels: Record<string, number> = {
      Cash: 0,
      MoMo: 0,
      Bank: 0,
      Card: 0,
      Credit: 0,
      Other: 0,
    };

    const attendantVariances: Record<string, { shifts: number; totalDiff: number; shortages: number; excess: number }> = {};

    filteredRecords.forEach((r) => {
      const recon = calculateReconciliation(r);
      totalLitres += recon.totalLitres;
      totalSales += recon.totalSales;
      totalDrawings += recon.drawings;
      totalCashBank += recon.totalCashToBank;
      totalPhysicalCash += recon.physicalCash;
      totalStockVariation += recon.totalStockVariation;

      if (recon.diff < -0.5) {
        totalShortage += Math.abs(recon.diff);
      } else if (recon.diff > 0.5) {
        totalExcess += recon.diff;
      }

      // Fuel breakdown
      FUELS.forEach((f) => {
        const item = recon.fuelBreakdown[f.id];
        if (item) {
          fuelVolume[f.id].litres += item.netLitres;
          fuelVolume[f.id].sales += item.salesAmount;
        }
      });

      // Payment breakdown
      paymentChannels.Cash += recon.physicalCash;
      paymentChannels.Credit += recon.A;

      r.evalue.forEach((ev) => {
        if (ev.channel === 'MoMo') paymentChannels.MoMo += Number(ev.amount) || 0;
        else if (ev.channel === 'Bank') paymentChannels.Bank += Number(ev.amount) || 0;
        else if (ev.channel === 'Card') paymentChannels.Card += Number(ev.amount) || 0;
        else paymentChannels.Other += Number(ev.amount) || 0;
      });

      // Attendant variance tracker
      const attKey = r.attendant?.trim() || 'Attendant';
      if (!attendantVariances[attKey]) {
        attendantVariances[attKey] = { shifts: 0, totalDiff: 0, shortages: 0, excess: 0 };
      }
      attendantVariances[attKey].shifts += 1;
      attendantVariances[attKey].totalDiff += recon.diff;
      if (recon.diff < -0.5) attendantVariances[attKey].shortages += Math.abs(recon.diff);
      if (recon.diff > 0.5) attendantVariances[attKey].excess += recon.diff;
    });

    return {
      totalLitres,
      totalSales,
      totalDrawings,
      totalCashBank,
      totalPhysicalCash,
      totalShortage,
      totalExcess,
      totalStockVariation,
      fuelVolume,
      paymentChannels,
      attendantVariances,
    };
  }, [filteredRecords]);

  // Timeline chart data (grouped by date)
  const timelineData = useMemo(() => {
    const map: Record<string, { date: string; PMS: number; AGO: number; RON95: number; totalSales: number }> = {};

    // Sort ascending for chronology
    const sorted = [...filteredRecords].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sorted.forEach((r) => {
      const recon = calculateReconciliation(r);
      const d = r.date;
      if (!map[d]) {
        map[d] = { date: d.slice(5), PMS: 0, AGO: 0, RON95: 0, totalSales: 0 };
      }
      map[d].PMS += recon.fuelBreakdown['pms']?.netLitres || 0;
      map[d].AGO += recon.fuelBreakdown['ago']?.netLitres || 0;
      map[d].RON95 += recon.fuelBreakdown['ron95']?.netLitres || 0;
      map[d].totalSales += recon.totalSales;
    });

    return Object.values(map);
  }, [filteredRecords]);

  // Payment channel pie data
  const paymentPieData = useMemo(() => {
    const colors: Record<string, string> = {
      Cash: '#10b981', // emerald
      MoMo: '#f59e0b', // amber
      Bank: '#3b82f6', // blue
      Card: '#8b5cf6', // purple
      Credit: '#f43f5e', // rose
      Other: '#64748b', // slate
    };

    return (Object.entries(totals.paymentChannels) as [string, number][])
      .filter(([_, val]) => Number(val) > 0)
      .map(([name, value]) => ({
        name,
        value: Math.round(Number(value) * 100) / 100,
        color: colors[name] || '#94a3b8',
      }));
  }, [totals.paymentChannels]);

  // Tank Stock Variance Timeline Data
  const tankVarianceData = useMemo(() => {
    const map: Record<string, { date: string; variation: number; loss: number; gain: number }> = {};
    const sorted = [...filteredRecords].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sorted.forEach((r) => {
      const recon = calculateReconciliation(r);
      const d = r.date;
      if (!map[d]) {
        map[d] = { date: d.slice(5), variation: 0, loss: 0, gain: 0 };
      }
      map[d].variation += recon.totalStockVariation;
      if (recon.totalStockVariation < 0) {
        map[d].loss += Math.abs(recon.totalStockVariation);
      } else {
        map[d].gain += recon.totalStockVariation;
      }
    });

    return Object.values(map);
  }, [filteredRecords]);

  // 24-Hour End of Day (EOD) Consolidated Summary
  const eodSummaries = useMemo(() => {
    const dateMap: Record<string, { date: string; station: string; records: ShiftRecord[] }> = {};

    filteredRecords.forEach((r) => {
      const key = `${r.date}_${r.station || 'Default'}`;
      if (!dateMap[key]) {
        dateMap[key] = { date: r.date, station: r.station || 'All Branches', records: [] };
      }
      dateMap[key].records.push(r);
    });

    return Object.values(dateMap)
      .map((group) => {
        let totalLitres = 0;
        let totalSales = 0;
        let totalCashExpected = 0;
        let totalPhysicalCash = 0;
        let totalVariance = 0;
        let dayShift: ShiftRecord | null = null;
        let nightShift: ShiftRecord | null = null;

        group.records.forEach((r) => {
          const rec = calculateReconciliation(r);
          totalLitres += rec.totalLitres;
          totalSales += rec.totalSales;
          totalCashExpected += rec.totalCashToBank;
          totalPhysicalCash += rec.physicalCash;
          totalVariance += rec.diff;

          if (r.shiftPeriod === 'Day') dayShift = r;
          if (r.shiftPeriod === 'Night') nightShift = r;
        });

        return {
          date: group.date,
          station: group.station,
          recordCount: group.records.length,
          totalLitres,
          totalSales,
          totalCashExpected,
          totalPhysicalCash,
          totalVariance,
          dayShift,
          nightShift,
          allRecords: group.records,
        };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredRecords]);

  const handleExportAllCSV = () => {
    const rows: string[][] = [
      [
        'Date',
        'Station',
        'Shift Group',
        'Shift Period',
        'Status',
        'Attendant',
        'Supervisor',
        'Verified By',
        'Total Litres (L)',
        'Total Sales (GHS)',
        'Approved Credit (A)',
        'E-Value (B)',
        'Collections (C)',
        'Generator (D)',
        'Expected Cash To Bank',
        'Physical Cash Counted',
        'Cash Difference',
        'Tank Stock Variation (L)',
        'Variance Status',
      ],
    ];

    filteredRecords.forEach((r) => {
      const recon = calculateReconciliation(r);
      rows.push([
        r.date,
        r.station || 'N/A',
        r.shiftGroup,
        r.shiftPeriod,
        r.status.toUpperCase(),
        r.attendant || 'N/A',
        r.supervisor || 'N/A',
        r.verifiedBy || 'N/A',
        recon.totalLitres.toFixed(2),
        recon.totalSales.toFixed(2),
        recon.A.toFixed(2),
        recon.B.toFixed(2),
        recon.C.toFixed(2),
        recon.D.toFixed(2),
        recon.totalCashToBank.toFixed(2),
        recon.physicalCash.toFixed(2),
        recon.diff.toFixed(2),
        recon.totalStockVariation.toFixed(2),
        recon.status.toUpperCase(),
      ]);
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      rows.map((e) => e.map((c) => `"${c}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Station_Analytics_${timeFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <h1 className="text-xl font-extrabold text-stone-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-600" />
            Forecourt Analytics &amp; Reports
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time volume tracking, payment channels, 24-hr EOD consolidation, and variance audits.
          </p>
        </div>

        <button
          onClick={handleExportAllCSV}
          className="self-start sm:self-auto py-2 px-3.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          title="Export CSV"
        >
          <Download className="w-4 h-4" />
          <span>Export Master CSV</span>
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-1.5 p-1 bg-stone-200/70 rounded-2xl">
        {[
          { id: 'overview', label: 'Executive Overview', icon: Layers },
          { id: 'charts', label: 'Forecourt Charts', icon: TrendingUp },
          { id: 'eod', label: '24h EOD Consolidations', icon: Calendar },
          { id: 'variances', label: 'Attendant Audit Ledger', icon: Users },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-white/40'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-stone-400'}`} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Time Filter Buttons */}
      <div className="flex gap-2">
        {[
          { id: '7days', label: 'Last 7 Days' },
          { id: '30days', label: 'Last 30 Days' },
          { id: 'all', label: `All Recorded Shifts (${submittedRecords.length})` },
        ].map((btn) => (
          <button
            key={btn.id}
            onClick={() => setTimeFilter(btn.id as any)}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              timeFilter === btn.id
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-white border border-stone-300 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* TAB 1: EXECUTIVE OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          {/* Key Metric Blocks */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-xs">
              <span className="text-[11px] text-stone-500 font-semibold block">Total Fuel Dispensed</span>
              <span className="text-base font-bold font-mono text-emerald-800">
                {fmtPlain(totals.totalLitres)} L
              </span>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-xs">
              <span className="text-[11px] text-stone-500 font-semibold block">Gross Sales Expected</span>
              <span className="text-base font-bold font-mono text-stone-900">
                {fmt(totals.totalSales)}
              </span>
            </div>
            <div className="bg-white rounded-2xl p-3.5 border border-stone-200 shadow-xs">
              <span className="text-[11px] text-stone-500 font-semibold block">Drawings &amp; Expenses</span>
              <span className="text-base font-bold font-mono text-amber-700">
                {fmt(totals.totalDrawings)}
              </span>
            </div>
            <div className="bg-emerald-50 rounded-2xl p-3.5 border border-emerald-200 shadow-xs">
              <span className="text-[11px] text-emerald-800 font-semibold block">Physical Cash Deposited</span>
              <span className="text-base font-bold font-mono text-emerald-950">
                {fmt(totals.totalPhysicalCash)}
              </span>
            </div>
          </div>

          {/* Product Volume Breakdown */}
          <div className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Fuel className="w-4 h-4 text-emerald-600" /> Fuel Product Volume &amp; Sales Share
              </span>
              <span className="text-xs font-mono font-semibold text-stone-500">
                {filteredRecords.length} Shifts
              </span>
            </div>

            <div className="space-y-3">
              {FUELS.map((f) => {
                const data = totals.fuelVolume[f.id] || { litres: 0, sales: 0 };
                const isCarried = data.litres > 0 || data.sales > 0 || f.id !== 'ron95';
                if (!isCarried && totals.totalLitres > 0) return null;

                const pct = totals.totalLitres > 0 ? (data.litres / totals.totalLitres) * 100 : 0;

                return (
                  <div key={f.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-stone-800 flex items-center gap-1.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${f.id === 'pms' ? 'bg-emerald-500' : f.id === 'ago' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                        {f.label}
                      </span>
                      <span className="font-mono text-stone-900">
                        {fmtPlain(data.litres)} L · {fmt(data.sales)}
                      </span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          f.id === 'pms' ? 'bg-emerald-500' : f.id === 'ago' ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-stone-400 text-right font-mono">
                      {pct.toFixed(1)}% of total station throughput
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Financial Variances & Dipping Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5 border-b border-stone-100 pb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Cash Reconciliation Audit
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-[10px] text-rose-800 font-semibold block">Cumulative Shortage</span>
                  <span className="text-sm font-bold font-mono text-rose-700">-{fmt(totals.totalShortage)}</span>
                </div>
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-[10px] text-amber-800 font-semibold block">Cumulative Excess</span>
                  <span className="text-sm font-bold font-mono text-amber-700">+{fmt(totals.totalExcess)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5 border-b border-stone-100 pb-2">
                <Scale className="w-4 h-4 text-emerald-600" /> Tank Dipping Variance
              </span>
              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-500 font-semibold block">Net Tank Stock Variance</span>
                  <span className="text-xs text-stone-400">Physical vs Book Dip</span>
                </div>
                <span
                  className={`text-base font-bold font-mono ${
                    totals.totalStockVariation < -0.5
                      ? 'text-rose-700'
                      : totals.totalStockVariation > 0.5
                      ? 'text-amber-700'
                      : 'text-emerald-800'
                  }`}
                >
                  {totals.totalStockVariation > 0 ? `+${fmtPlain(totals.totalStockVariation)} L` : `${fmtPlain(totals.totalStockVariation)} L`}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VISUAL CHARTS */}
      {activeTab === 'charts' && (
        <div className="space-y-4">
          {/* Daily Fuel Volume Trend Chart */}
          <div className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" /> Daily Fuel Volume Trends (Litres)
              </span>
              <span className="text-[11px] text-stone-400">PMS vs AGO vs RON 95</span>
            </div>

            {timelineData.length > 0 ? (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="PMS" fill="#10b981" name="PMS (Super)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="AGO" fill="#f59e0b" name="AGO (Diesel)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="RON95" fill="#3b82f6" name="RON 95" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-stone-400">No shift data in this date range</div>
            )}
          </div>

          {/* Payment Channels Distribution Donut */}
          <div className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <PieChartIcon className="w-4 h-4 text-emerald-600" /> Payment &amp; Drawing Method Distribution
              </span>
              <span className="text-[11px] text-stone-400">GHS Breakdown</span>
            </div>

            {paymentPieData.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {paymentPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [`GH₵${fmtPlain(val)}`, 'Amount']}
                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-2 text-xs">
                  {paymentPieData.map((item) => {
                    const totalPay = paymentPieData.reduce((s, p) => s + p.value, 0);
                    const pct = totalPay > 0 ? (item.value / totalPay) * 100 : 0;
                    return (
                      <div key={item.name} className="flex items-center justify-between p-2 rounded-xl bg-stone-50 border border-stone-200">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="font-semibold text-stone-800">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-stone-900">{fmt(item.value)}</span>
                          <span className="text-[10px] text-stone-400 ml-1.5 font-mono">({pct.toFixed(1)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-stone-400">No payment records found</div>
            )}
          </div>

          {/* Tank Stock Variation Timeline Chart */}
          <div className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-600" /> Tank Dipping Variance &amp; Losses (Litres)
              </span>
              <span className="text-[11px] text-stone-400">Gain (+) vs Loss (-)</span>
            </div>

            {tankVarianceData.length > 0 ? (
              <div className="h-56 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tankVarianceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip
                      formatter={(val: any) => [`${fmtPlain(val)} L`, 'Variance']}
                      contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                    />
                    <Bar dataKey="variation" fill="#f43f5e" name="Dip Variance (L)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-stone-400">No tank dipping data available</div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: 24-HOUR CONSOLIDATED EOD */}
      {activeTab === 'eod' && (
        <div className="space-y-3">
          <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl text-xs text-emerald-950 flex items-center justify-between">
            <div>
              <span className="font-bold block">24-Hour End-Of-Day (EOD) Station Reconciliation</span>
              <span className="text-[11px] text-emerald-800">
                Combines Shift A (Day) and Shift B (Night) for complete 24-hour station accounting.
              </span>
            </div>
            <span className="text-xs font-mono font-bold bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full text-emerald-900">
              {eodSummaries.length} Days Audited
            </span>
          </div>

          {eodSummaries.length > 0 ? (
            eodSummaries.map((eod) => {
              const isExpanded = expandedEodDate === eod.date;
              const hasShortage = eod.totalVariance < -0.5;
              const hasExcess = eod.totalVariance > 0.5;

              return (
                <div
                  key={eod.date}
                  className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden transition-all"
                >
                  <div
                    onClick={() => setExpandedEodDate(isExpanded ? null : eod.date)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-stone-50/60"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-stone-900">{eod.date}</span>
                        <span className="text-[10px] bg-stone-100 border border-stone-200 text-stone-700 font-bold px-2 py-0.5 rounded-full">
                          {eod.recordCount} {eod.recordCount === 1 ? 'Shift' : 'Shifts'}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500 block">{eod.station}</span>
                    </div>

                    <div className="flex items-center gap-3 text-right">
                      <div>
                        <span className="text-xs font-bold font-mono text-stone-900 block">
                          {fmt(eod.totalSales)}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {fmtPlain(eod.totalLitres)} L
                        </span>
                      </div>

                      <div className="hidden sm:block">
                        <span
                          className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg border ${
                            hasShortage
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : hasExcess
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {eod.totalVariance > 0 ? `+${fmt(eod.totalVariance)}` : fmt(eod.totalVariance)}
                        </span>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-stone-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-stone-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Breakdown */}
                  {isExpanded && (
                    <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-3 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                          <span className="text-[10px] text-stone-500 block">24h Dispensed</span>
                          <span className="font-bold font-mono text-stone-900">{fmtPlain(eod.totalLitres)} L</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                          <span className="text-[10px] text-stone-500 block">24h Sales</span>
                          <span className="font-bold font-mono text-stone-900">{fmt(eod.totalSales)}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                          <span className="text-[10px] text-stone-500 block">Cash Expected</span>
                          <span className="font-bold font-mono text-stone-900">{fmt(eod.totalCashExpected)}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-xl border border-stone-200">
                          <span className="text-[10px] text-stone-500 block">24h Variance</span>
                          <span
                            className={`font-bold font-mono ${
                              hasShortage ? 'text-rose-700' : hasExcess ? 'text-amber-700' : 'text-emerald-800'
                            }`}
                          >
                            {eod.totalVariance > 0 ? `+${fmt(eod.totalVariance)}` : fmt(eod.totalVariance)}
                          </span>
                        </div>
                      </div>

                      {/* Shifts within this day */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-stone-600 block">Shift Handover Breakdown</span>
                        <div className="space-y-1">
                          {eod.allRecords.map((r) => {
                            const rec = calculateReconciliation(r);
                            return (
                              <div
                                key={r.id}
                                className="bg-white p-2.5 rounded-xl border border-stone-200 flex items-center justify-between"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs">
                                    Shift {r.shiftGroup} ({r.shiftPeriod})
                                  </span>
                                  <span className="text-[11px] text-stone-500">
                                    Attendant: {r.attendant || '—'}
                                  </span>
                                  {r.status === 'verified' && (
                                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full inline-flex items-center gap-0.5">
                                      <ShieldCheck className="w-2.5 h-2.5" /> Verified
                                    </span>
                                  )}
                                </div>
                                <div className="text-right flex items-center gap-3">
                                  <span className="font-mono text-xs font-semibold">{fmtPlain(rec.totalLitres)} L</span>
                                  <span className="font-mono text-xs font-bold text-stone-900">{fmt(rec.totalSales)}</span>
                                  <span
                                    className={`font-mono text-xs font-bold ${
                                      rec.diff < -0.5 ? 'text-rose-700' : rec.diff > 0.5 ? 'text-amber-700' : 'text-emerald-800'
                                    }`}
                                  >
                                    {rec.diff > 0 ? `+${fmt(rec.diff)}` : fmt(rec.diff)}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-stone-300 text-stone-400 text-xs">
              No shift records available to generate 24h summaries.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: ATTENDANT AUDIT LEDGER */}
      {activeTab === 'variances' && (
        <div className="bg-white rounded-2xl p-4.5 border border-stone-200 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" /> Attendant Shift Variance &amp; Shortage Audit
            </span>
            <span className="text-[11px] text-stone-400">Attendant performance</span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-stone-200">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-100/80 text-[10px] text-stone-600 font-bold uppercase tracking-wider border-b border-stone-200">
                  <th className="py-2 px-3">Pump Attendant</th>
                  <th className="text-center py-2 px-3">Shifts Logged</th>
                  <th className="text-right py-2 px-3 text-rose-700">Total Shortages</th>
                  <th className="text-right py-2 px-3 text-amber-700">Total Excess</th>
                  <th className="text-right py-2 px-3 font-bold text-stone-900">Net Variance</th>
                  <th className="text-center py-2 px-3">Audit Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-mono text-xs">
                {(Object.entries(totals.attendantVariances) as [string, { shifts: number; totalDiff: number; shortages: number; excess: number }][]).map(([att, stats]) => {
                  const isLoss = stats.totalDiff < -1.0;
                  const isGain = stats.totalDiff > 1.0;

                  return (
                    <tr key={att} className="hover:bg-stone-50/50">
                      <td className="py-2.5 px-3 font-sans font-bold text-stone-900">{att}</td>
                      <td className="text-center py-2.5 px-3 text-stone-600">{stats.shifts}</td>
                      <td className="text-right py-2.5 px-3 text-rose-700 font-semibold">
                        {stats.shortages > 0 ? `-${fmt(stats.shortages)}` : 'GH₵0.00'}
                      </td>
                      <td className="text-right py-2.5 px-3 text-amber-700 font-semibold">
                        {stats.excess > 0 ? `+${fmt(stats.excess)}` : 'GH₵0.00'}
                      </td>
                      <td
                        className={`text-right py-2.5 px-3 font-bold ${
                          isLoss ? 'text-rose-700' : isGain ? 'text-amber-700' : 'text-emerald-800'
                        }`}
                      >
                        {stats.totalDiff > 0 ? `+${fmt(stats.totalDiff)}` : fmt(stats.totalDiff)}
                      </td>
                      <td className="text-center py-2.5 px-3 font-sans">
                        {Math.abs(stats.totalDiff) <= 2 ? (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Excellent
                          </span>
                        ) : stats.totalDiff < -10 ? (
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Shortage Review
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            Acceptable
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {(Object.entries(totals.attendantVariances) as [string, { shifts: number; totalDiff: number; shortages: number; excess: number }][]).map(([att, stats]) => {
              const isLoss = stats.totalDiff < -1.0;
              const isGain = stats.totalDiff > 1.0;

              return (
                <div
                  key={att}
                  className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-sm text-stone-900">{att}</div>
                    <div>
                      {Math.abs(stats.totalDiff) <= 2 ? (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Excellent
                        </span>
                      ) : stats.totalDiff < -10 ? (
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Shortage Review
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          Acceptable
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white p-2.5 rounded-lg border border-stone-200">
                    <div>
                      <span className="text-[9.5px] text-stone-400 uppercase font-sans font-bold block">Shifts Logged</span>
                      <span className="font-semibold text-stone-700">{stats.shifts}</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-stone-400 uppercase font-sans font-bold block">Net Variance</span>
                      <span
                        className={`font-bold ${
                          isLoss ? 'text-rose-700' : isGain ? 'text-amber-700' : 'text-emerald-800'
                        }`}
                      >
                        {stats.totalDiff > 0 ? `+${fmt(stats.totalDiff)}` : fmt(stats.totalDiff)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-stone-400 uppercase font-sans font-bold block">Total Shortages</span>
                      <span className="text-rose-700 font-semibold">
                        {stats.shortages > 0 ? `-${fmt(stats.shortages)}` : 'GH₵0.00'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-stone-400 uppercase font-sans font-bold block">Total Excess</span>
                      <span className="text-amber-700 font-semibold">
                        {stats.excess > 0 ? `+${fmt(stats.excess)}` : 'GH₵0.00'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
