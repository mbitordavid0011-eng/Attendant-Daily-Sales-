import {
  FUELS,
  DENOMINATIONS,
  COIN_DENOMINATIONS,
  ShiftRecord,
  ShiftReconciliation,
  StationConfig,
  UserProfile,
  PumpReading,
  ReconciliationStatus
} from '../types';

export function num(v: unknown): number {
  if (typeof v === 'number') {
    return isNaN(v) ? 0 : v;
  }
  const n = parseFloat(String(v || '0'));
  return isNaN(n) ? 0 : n;
}

export function fmtPlain(n: number | undefined | null): string {
  const val = num(n);
  return val.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function fmt(n: number | undefined | null): string {
  return 'GH₵' + fmtPlain(n);
}

export function generateId(): string {
  return 'id_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
}

export function pumpsFor(count: number): PumpReading[] {
  const safeCount = Math.max(0, count || 0);
  if (safeCount === 0) return [];
  return Array.from({ length: safeCount }, (_, i) => ({
    id: generateId(),
    name: `Pump ${i + 1}`,
    opening: 0,
    closing: 0,
    rtt: 0,
  }));
}

export function isFuelActive(
  fuelId: string,
  record?: ShiftRecord | null,
  stationConfig?: StationConfig | null
): boolean {
  if (fuelId === 'pms' || fuelId === 'ago') return true;
  if (record?.fuels?.[fuelId]?.pumps?.length && record.fuels[fuelId].pumps.length > 0) return true;
  if (stationConfig) {
    if (stationConfig.hasRon95 !== undefined && fuelId === 'ron95') return stationConfig.hasRon95;
    if (stationConfig.pumps?.[fuelId] !== undefined) return (stationConfig.pumps[fuelId] || 0) > 0;
  }
  return false;
}

export function createNewRecord(
  profile?: Partial<UserProfile>,
  stationConfig?: StationConfig | null
): ShiftRecord {
  const fuels: Record<string, { price: number; pumps: PumpReading[] }> = {};
  const stocks: Record<string, { openingStock: number; stockReceived: number; physicalClosing: number; notes?: string }> = {};

  FUELS.forEach((f) => {
    let pumpCount = 2;
    if (stationConfig) {
      if (stationConfig.hasRon95 === false && f.id === 'ron95') {
        pumpCount = 0;
      } else if (stationConfig.pumps?.[f.id] !== undefined) {
        pumpCount = Number(stationConfig.pumps[f.id]);
      } else if (f.id === 'ron95') {
        pumpCount = stationConfig.hasRon95 ? 2 : 0;
      }
    } else if (f.id === 'ron95') {
      pumpCount = 0; // Default to not having RON 95 unless station config specifies it
    }

    const price = stationConfig?.prices?.[f.id] !== undefined ? Number(stationConfig.prices[f.id]) : f.defaultPrice;
    fuels[f.id] = {
      price,
      pumps: pumpsFor(pumpCount),
    };
    stocks[f.id] = {
      openingStock: 0,
      stockReceived: 0,
      physicalClosing: 0,
      notes: '',
    };
  });

  const initialCashDenoms: Record<number, number> = {};
  DENOMINATIONS.forEach((d) => {
    initialCashDenoms[d] = 0;
  });

  const initialCashCoins: Record<number, number> = {};
  COIN_DENOMINATIONS.forEach((c) => {
    initialCashCoins[c] = 0;
  });

  const today = new Date().toISOString().slice(0, 10);

  const defaultAttendantName =
    profile?.role === 'supervisor'
      ? (profile?.supervisor || profile?.attendant || '')
      : (profile?.attendant || '');

  return {
    id: generateId(),
    date: today,
    shiftGroup: 'A',
    shiftPeriod: 'Day',
    attendant: defaultAttendantName,
    attendantId: profile?.id || profile?.staffId || '',
    station: profile?.station || stationConfig?.name || '',
    stationId: profile?.stationId || stationConfig?.id || '',
    stationCode: profile?.stationCode || stationConfig?.stationCode || '',
    supervisor: profile?.supervisor || '',
    supervisorId: profile?.supervisorId || '',
    notes: '',
    fuels,
    stocks,
    approved: [],
    evalue: [],
    collections: [],
    generator: [],
    cash: {
      denoms: initialCashDenoms,
      coins: initialCashCoins,
    },
    status: 'draft',
    revisionOf: null,
    createdAt: new Date().toISOString(),
    _step: 1,
  };
}

export function sumListAmount(list: { amount: number }[] = []): number {
  return list.reduce((sum, item) => sum + num(item.amount), 0);
}

export function calculatePhysicalCash(cash: ShiftRecord['cash']): number {
  let total = 0;
  if (cash?.denoms) {
    DENOMINATIONS.forEach((d) => {
      total += d * num(cash.denoms[d]);
    });
  }
  if (cash?.coins) {
    COIN_DENOMINATIONS.forEach((c) => {
      total += c * num(cash.coins[c]);
    });
  }
  return total;
}

export function calculateReconciliation(record: ShiftRecord): ShiftReconciliation {
  let totalLitres = 0;
  let totalSales = 0;
  const fuelBreakdown: ShiftReconciliation['fuelBreakdown'] = {};
  const stockBreakdown: ShiftReconciliation['stockBreakdown'] = {};

  let totalOpeningStock = 0;
  let totalStockReceived = 0;
  let totalPhysicalClosing = 0;
  let totalBookClosing = 0;
  let totalStockVariation = 0;

  FUELS.forEach((f) => {
    const fuelData = record.fuels?.[f.id];
    let fuelMeter = 0;
    let fuelRtt = 0;
    let fuelNet = 0;

    if (fuelData?.pumps) {
      fuelData.pumps.forEach((p) => {
        const meter = Math.max(0, num(p.closing) - num(p.opening));
        const rtt = Math.max(0, num(p.rtt));
        const net = Math.max(0, meter - rtt);

        fuelMeter += meter;
        fuelRtt += rtt;
        fuelNet += net;
      });
    }

    const price = num(fuelData?.price ?? f.defaultPrice);
    const salesAmount = fuelNet * price;

    fuelBreakdown[f.id] = {
      meterLitres: fuelMeter,
      rttLitres: fuelRtt,
      netLitres: fuelNet,
      price,
      salesAmount,
    };

    totalLitres += fuelNet;
    totalSales += salesAmount;

    // Tank stock calculations
    const stockData = record.stocks?.[f.id];
    const openingStock = num(stockData?.openingStock);
    const stockReceived = num(stockData?.stockReceived);
    const totalAvailable = openingStock + stockReceived;
    const salesLitres = fuelNet;
    const bookClosing = totalAvailable - salesLitres;
    const physicalClosing = num(stockData?.physicalClosing);
    const variation = physicalClosing - bookClosing;
    const variationPercent = salesLitres > 0 ? (variation / salesLitres) * 100 : 0;

    let stockStatus: 'balanced' | 'gain' | 'loss' = 'balanced';
    if (variation < -0.5) {
      stockStatus = 'loss';
    } else if (variation > 0.5) {
      stockStatus = 'gain';
    }

    stockBreakdown[f.id] = {
      fuelId: f.id,
      label: f.label,
      shortName: f.shortName,
      openingStock,
      stockReceived,
      totalAvailable,
      salesLitres,
      bookClosing,
      physicalClosing,
      variation,
      variationPercent,
      status: stockStatus,
    };

    totalOpeningStock += openingStock;
    totalStockReceived += stockReceived;
    totalPhysicalClosing += physicalClosing;
    totalBookClosing += bookClosing;
    totalStockVariation += variation;
  });

  const A = sumListAmount(record.approved);
  const B = sumListAmount(record.evalue);
  const C = sumListAmount(record.collections);
  const D = sumListAmount(record.generator);

  const drawings = A + B + D;
  const totalCashToBank = totalSales + C - drawings;
  const physicalCash = calculatePhysicalCash(record.cash);
  const diff = physicalCash - totalCashToBank;

  let status: ReconciliationStatus = 'balanced';
  if (diff < -0.5) {
    status = 'shortage';
  } else if (diff > 0.5) {
    status = 'excess';
  }

  return {
    totalLitres,
    fuelBreakdown,
    stockBreakdown,
    totalOpeningStock,
    totalStockReceived,
    totalPhysicalClosing,
    totalBookClosing,
    totalStockVariation,
    totalSales,
    A,
    B,
    C,
    D,
    drawings,
    totalCashToBank,
    physicalCash,
    diff,
    status,
  };
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function exportRecordToCSV(record: ShiftRecord): void {
  const recon = calculateReconciliation(record);
  const rows: string[][] = [
    ['DAILY FUEL SALES RECONCILIATION REPORT'],
    ['Date', record.date],
    ['Station', record.station || 'N/A'],
    ['Shift', `${record.shiftGroup} - ${record.shiftPeriod}`],
    ['Attendant', record.attendant || 'N/A'],
    ['Supervisor', record.supervisor || 'N/A'],
    ['Status', record.status.toUpperCase()],
    ['Reconciliation Result', recon.status.toUpperCase()],
    [],
    ['FUEL SALES ANALYSIS'],
    ['Fuel Type', 'Price/L (GHS)', 'Total Meter (L)', 'R.T.T (L)', 'Net Litres (L)', 'Total Sales (GHS)'],
  ];

  FUELS.forEach((f) => {
    const item = recon.fuelBreakdown[f.id];
    rows.push([
      f.label,
      item ? item.price.toFixed(2) : '0.00',
      item ? item.meterLitres.toFixed(2) : '0.00',
      item ? item.rttLitres.toFixed(2) : '0.00',
      item ? item.netLitres.toFixed(2) : '0.00',
      item ? item.salesAmount.toFixed(2) : '0.00',
    ]);
  });

  rows.push(['TOTALS', '', '', '', recon.totalLitres.toFixed(2), recon.totalSales.toFixed(2)]);
  rows.push([]);
  rows.push(['TANK STOCK & DIPPING RECONCILIATION']);
  rows.push(['Fuel Type', 'Opening Dip (L)', 'Stock Received (L)', 'Total Available (L)', 'Sales Dispensed (L)', 'Book Closing (L)', 'Physical Closing (L)', 'Variation / Gain/Loss (L)', 'Status']);

  FUELS.forEach((f) => {
    const s = recon.stockBreakdown[f.id];
    rows.push([
      f.label,
      s ? s.openingStock.toFixed(2) : '0.00',
      s ? s.stockReceived.toFixed(2) : '0.00',
      s ? s.totalAvailable.toFixed(2) : '0.00',
      s ? s.salesLitres.toFixed(2) : '0.00',
      s ? s.bookClosing.toFixed(2) : '0.00',
      s ? s.physicalClosing.toFixed(2) : '0.00',
      s ? (s.variation > 0 ? `+${s.variation.toFixed(2)}` : s.variation.toFixed(2)) : '0.00',
      s ? s.status.toUpperCase() : 'N/A',
    ]);
  });

  rows.push([
    'TOTAL STOCKS',
    recon.totalOpeningStock.toFixed(2),
    recon.totalStockReceived.toFixed(2),
    (recon.totalOpeningStock + recon.totalStockReceived).toFixed(2),
    recon.totalLitres.toFixed(2),
    recon.totalBookClosing.toFixed(2),
    recon.totalPhysicalClosing.toFixed(2),
    (recon.totalStockVariation > 0 ? `+${recon.totalStockVariation.toFixed(2)}` : recon.totalStockVariation.toFixed(2)),
    '',
  ]);
  rows.push([]);
  rows.push(['ACCOUNT & DRAWINGS SUMMARY']);
  rows.push(['Total Sales Amount Expected', recon.totalSales.toFixed(2)]);
  rows.push(['(+) Credit Sales Collections (C)', recon.C.toFixed(2)]);
  rows.push(['(-) Approved Credit Sales (A)', recon.A.toFixed(2)]);
  rows.push(['(-) E-Value / Drawings (B)', recon.B.toFixed(2)]);
  rows.push(['(-) Generator Fuel (D)', recon.D.toFixed(2)]);
  rows.push(['(=) Total Cash to Bank Expected', recon.totalCashToBank.toFixed(2)]);
  rows.push(['Physical Cash Counted', recon.physicalCash.toFixed(2)]);
  rows.push(['Variance / Difference', recon.diff.toFixed(2)]);
  rows.push(['Variance Status', recon.status.toUpperCase()]);

  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.map(c => `"${c}"`).join(',')).join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Daily_Sales_${record.date}_${record.shiftGroup}_${record.shiftPeriod}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Translates technical error messages into clear, understandable workplace language
 * while preserving developer visibility in the console.
 */
export function formatUserFriendlyError(err: unknown, fallbackMessage = 'Unable to complete this action. Please check your network connection and try again.'): string {
  if (!err) return fallbackMessage;
  console.error('[System Operation Error Log]:', err);

  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (lower.includes('permission-denied') || lower.includes('insufficient permissions')) {
    return 'Permission denied. Please verify you are authorized for this station or contact your supervisor.';
  }
  if (lower.includes('unavailable') || lower.includes('network') || lower.includes('failed to fetch') || lower.includes('offline')) {
    return 'Unable to connect to the station server. Please check your internet connection and try again.';
  }
  if (lower.includes('not-found')) {
    return 'The requested record or station data could not be located.';
  }
  if (lower.includes('already-exists')) {
    return 'A record with this reference or date already exists.';
  }
  if (lower.includes('quota-exceeded')) {
    return 'Temporary system limit reached. Please wait a moment and try again.';
  }
  if (lower.includes('unauthenticated') || lower.includes('token-expired')) {
    return 'Your session has expired. Please sign in again to continue.';
  }

  // If the error message is already human-friendly (short and doesn't contain code-like tokens)
  if (!lower.includes('firebase') && !lower.includes('firestore') && !lower.includes('at ') && raw.length < 120) {
    return raw;
  }

  return fallbackMessage;
}
