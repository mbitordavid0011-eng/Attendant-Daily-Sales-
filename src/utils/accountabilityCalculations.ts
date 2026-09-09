import {
  AttendantAccountabilityRecord,
  AttendantMeterReading,
  AttendantPaymentBreakdown,
  AttendantDeduction,
  AttendantDailyLog,
  PumpTimeSlotAssignment,
  SupervisorSalesAccountRecord,
  SupervisorSalesSummary,
  SupervisorDeductionType,
  SupervisorDeductionEntry,
  STAROIL_LUBRICANTS_CATALOG,
} from '../types';

export interface AttendantFuelBreakdown {
  superLitres: number;
  superSales: number;
  dieselLitres: number;
  dieselSales: number;
  ron95Litres: number;
  ron95Sales: number;
}

export interface AttendantAccountabilitySummary {
  totalLitres: number;
  totalSales: number;
  fuelBreakdown: AttendantFuelBreakdown;
  totalEvalues: number;
  totalVouchers: number;
  totalCreditSales: number;
  totalCreditCollections: number;
  approvedDeductions: number;
  totalNonCash: number;
  totalRecordedPayments: number;
  expectedCash: number;
  actualCash: number;
  cashFromDenominations: number;
  difference: number;
  status: 'accounted' | 'shortage' | 'excess' | 'pending';
  hasDiscrepancy: boolean;
  accountState: 'open' | 'closed';
  isMultiDay: boolean;
  daysOpenCount: number;
  startDate: string;
  endDate?: string;
}

export function computeAttendantSummary(
  record: AttendantAccountabilityRecord
): AttendantAccountabilitySummary {
  // 1. Meter Accountability (Aggregate top-level meters + any nested dayLogs)
  let totalLitres = 0;
  let totalSales = 0;
  const fuelBreakdown: AttendantFuelBreakdown = {
    superLitres: 0,
    superSales: 0,
    dieselLitres: 0,
    dieselSales: 0,
    ron95Litres: 0,
    ron95Sales: 0,
  };

  const processReading = (m: AttendantMeterReading) => {
    const netLitres = Math.max(
      0,
      (Number(m.closingMeter) || 0) - (Number(m.openingMeter) || 0) - (Number(m.rtt) || 0)
    );
    const sales = netLitres * (Number(m.unitPrice) || 0);
    totalLitres += netLitres;
    totalSales += sales;

    const fType = m.fuelType || 'super';
    if (fType === 'diesel') {
      fuelBreakdown.dieselLitres += netLitres;
      fuelBreakdown.dieselSales += sales;
    } else if (fType === 'ron95') {
      fuelBreakdown.ron95Litres += netLitres;
      fuelBreakdown.ron95Sales += sales;
    } else {
      fuelBreakdown.superLitres += netLitres;
      fuelBreakdown.superSales += sales;
    }
  };

  // Process top-level meter readings
  (record.meterReadings || []).forEach(processReading);

  // Aggregate meter readings from multi-day logs if present
  if (record.dayLogs && record.dayLogs.length > 0) {
    record.dayLogs.forEach((dl) => {
      (dl.meterReadings || []).forEach(processReading);
    });
  }

  // 2. E-Values (Electronic / Digital Payments: MoMo, POS, Bank, QR, Tingg, Hubtel)
  let totalEvalues = 0;
  if (record.evalues && record.evalues.length > 0) {
    totalEvalues = record.evalues.reduce((acc, ev) => acc + (Number(ev.amount) || 0), 0);
  } else {
    const p = record.payments || { cash: 0, visa: 0, momo: 0, bank: 0, credit: 0, other: 0 };
    totalEvalues = (Number(p.visa) || 0) + (Number(p.momo) || 0) + (Number(p.bank) || 0) + (Number(p.other) || 0);
  }

  // Include multi-day E-values if any
  if (record.dayLogs && record.dayLogs.length > 0) {
    record.dayLogs.forEach((dl) => {
      if (dl.evalues && dl.evalues.length > 0) {
        totalEvalues += dl.evalues.reduce((acc, ev) => acc + (Number(ev.amount) || 0), 0);
      } else if (dl.payments) {
        totalEvalues += (Number(dl.payments.visa) || 0) + (Number(dl.payments.momo) || 0) + (Number(dl.payments.bank) || 0) + (Number(dl.payments.other) || 0);
      }
    });
  }

  // 3. Claim Codes & Corporate / Fleet Vouchers
  let totalVouchers = 0;
  if (record.voucherClaims && record.voucherClaims.length > 0) {
    totalVouchers = record.voucherClaims.reduce((acc, vc) => acc + (Number(vc.amount) || 0), 0);
  }
  if (record.dayLogs && record.dayLogs.length > 0) {
    record.dayLogs.forEach((dl) => {
      if (dl.voucherClaims && dl.voucherClaims.length > 0) {
        totalVouchers += dl.voucherClaims.reduce((acc, vc) => acc + (Number(vc.amount) || 0), 0);
      }
    });
  }

  // 4. Approved Credit Sales
  let totalCreditSales = 0;
  if (record.creditSales && record.creditSales.length > 0) {
    totalCreditSales = record.creditSales.reduce((acc, cs) => acc + (Number(cs.amount) || 0), 0);
  } else {
    totalCreditSales = Number(record.payments?.credit) || 0;
  }
  if (record.dayLogs && record.dayLogs.length > 0) {
    record.dayLogs.forEach((dl) => {
      if (dl.creditSales && dl.creditSales.length > 0) {
        totalCreditSales += dl.creditSales.reduce((acc, cs) => acc + (Number(cs.amount) || 0), 0);
      } else if (dl.payments?.credit) {
        totalCreditSales += Number(dl.payments.credit) || 0;
      }
    });
  }

  // 5. Credit Collections (Cash collected from prior credit customers to add to cash handover)
  let totalCreditCollections = 0;
  if (record.creditCollections && record.creditCollections.length > 0) {
    totalCreditCollections = record.creditCollections.reduce((acc, cc) => acc + (Number(cc.amount) || 0), 0);
  }
  if (record.dayLogs && record.dayLogs.length > 0) {
    record.dayLogs.forEach((dl) => {
      if (dl.creditCollections && dl.creditCollections.length > 0) {
        totalCreditCollections += dl.creditCollections.reduce((acc, cc) => acc + (Number(cc.amount) || 0), 0);
      }
    });
  }

  // 6. Authorized Station Deductions & Expenses
  let approvedDeductions = (record.expenses || [])
    .filter((e) => e.approved !== false)
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  if (record.dayLogs && record.dayLogs.length > 0) {
    record.dayLogs.forEach((dl) => {
      (dl.expenses || [])
        .filter((e) => e.approved !== false)
        .forEach((e) => {
          approvedDeductions += Number(e.amount) || 0;
        });
    });
  }

  // Total non-cash & deductions
  const totalNonCash = totalEvalues + totalVouchers + totalCreditSales;

  // 7. Physical Cash Denominations
  let cashFromDenominations = 0;
  if (record.cashDenominations) {
    const notes = record.cashDenominations.notes || ({} as any);
    const coins = record.cashDenominations.coins || ({} as any);
    const notesSum =
      (Number(notes[200]) || 0) * 200 +
      (Number(notes[100]) || 0) * 100 +
      (Number(notes[50]) || 0) * 50 +
      (Number(notes[20]) || 0) * 20 +
      (Number(notes[10]) || 0) * 10 +
      (Number(notes[5]) || 0) * 5 +
      (Number(notes[2]) || 0) * 2 +
      (Number(notes[1]) || 0) * 1;

    const coinsSum =
      (Number(coins[2.00]) || 0) * 2.00 +
      (Number(coins[1.00]) || 0) * 1.00 +
      (Number(coins[0.50]) || 0) * 0.50 +
      (Number(coins[0.20]) || 0) * 0.20 +
      (Number(coins[0.10]) || 0) * 0.10;

    cashFromDenominations = notesSum + coinsSum;
  }

  // 8. Expected Cash Equation:
  // Expected Cash = Total Gross Sales - E-Values - Vouchers - Credit Sales - Approved Deductions + Credit Collections
  const expectedCash = Math.max(0, totalSales - totalEvalues - totalVouchers - totalCreditSales - approvedDeductions + totalCreditCollections);

  // Actual cash priority: Cash Denominations if counted > 0, otherwise actualCashCounted
  const actualCash =
    cashFromDenominations > 0
      ? cashFromDenominations
      : Number(record.actualCashCounted) || 0;

  const difference = actualCash - expectedCash;
  const totalRecordedPayments = actualCash + totalNonCash + approvedDeductions;

  let status: 'accounted' | 'shortage' | 'excess' | 'pending' = 'pending';

  const isCounted =
    cashFromDenominations > 0 ||
    (record.actualCashCounted !== undefined &&
      record.actualCashCounted !== null &&
      (record.actualCashCounted > 0 || record.reviewedBySupervisor));

  if (isCounted) {
    if (Math.abs(difference) <= 0.5) {
      status = 'accounted';
    } else if (difference < -0.5) {
      status = 'shortage';
    } else {
      status = 'excess';
    }
  }

  const accountState: 'open' | 'closed' = record.accountState || 'open';
  const dayLogsCount = (record.dayLogs?.length || 0) + 1;
  const daysOpenCount = record.daysOpen || dayLogsCount;
  const isMultiDay = daysOpenCount > 1 || (record.dayLogs && record.dayLogs.length > 0) || false;
  const startDate = record.startDate || record.date;

  return {
    totalLitres,
    totalSales,
    fuelBreakdown,
    totalEvalues,
    totalVouchers,
    totalCreditSales,
    totalCreditCollections,
    approvedDeductions,
    totalNonCash,
    totalRecordedPayments,
    expectedCash,
    actualCash,
    cashFromDenominations,
    difference,
    status,
    hasDiscrepancy: status === 'shortage' || status === 'excess',
    accountState,
    isMultiDay,
    daysOpenCount,
    startDate,
    endDate: record.endDate,
  };
}

export interface ShiftAccountabilitySummary {
  totalAttendants: number;
  openAccountsCount: number;
  closedAccountsCount: number;
  multiDayAccountsCount: number;
  accountedCount: number;
  shortageCount: number;
  excessCount: number;
  pendingCount: number;
  totalLitres: number;
  totalSales: number;
  totalExpectedCash: number;
  totalActualCash: number;
  totalNonCash: number;
  totalDeductions: number;
  netVariance: number;
  canCloseShift: boolean;
}

export function computeShiftAccountabilitySummary(
  records: AttendantAccountabilityRecord[],
  managerOverride: boolean = false
): ShiftAccountabilitySummary {
  let totalLitres = 0;
  let totalSales = 0;
  let totalExpectedCash = 0;
  let totalActualCash = 0;
  let totalNonCash = 0;
  let totalDeductions = 0;
  let accountedCount = 0;
  let shortageCount = 0;
  let excessCount = 0;
  let pendingCount = 0;
  let openAccountsCount = 0;
  let closedAccountsCount = 0;
  let multiDayAccountsCount = 0;

  records.forEach((r) => {
    const summary = computeAttendantSummary(r);
    totalLitres += summary.totalLitres;
    totalSales += summary.totalSales;
    totalExpectedCash += summary.expectedCash;
    totalActualCash += summary.actualCash;
    totalNonCash += summary.totalNonCash;
    totalDeductions += summary.approvedDeductions;

    if (summary.accountState === 'closed') {
      closedAccountsCount++;
    } else {
      openAccountsCount++;
    }

    if (summary.isMultiDay) {
      multiDayAccountsCount++;
    }

    if (summary.status === 'accounted') {
      accountedCount++;
    } else if (summary.status === 'shortage') {
      shortageCount++;
    } else if (summary.status === 'excess') {
      excessCount++;
    } else {
      pendingCount++;
    }
  });

  const netVariance = totalActualCash - totalExpectedCash;
  const allAccountedOrOverridden =
    (pendingCount === 0 && shortageCount === 0 && excessCount === 0) || managerOverride;

  return {
    totalAttendants: records.length,
    openAccountsCount,
    closedAccountsCount,
    multiDayAccountsCount,
    accountedCount,
    shortageCount,
    excessCount,
    pendingCount,
    totalLitres,
    totalSales,
    totalExpectedCash,
    totalActualCash,
    totalNonCash,
    totalDeductions,
    netVariance,
    canCloseShift: allAccountedOrOverridden,
  };
}

/* ========================================================================= */
/* INITIAL SEED DATA FOR ATTENDANT ACCOUNTABILITY WITH MULTI-DAY SUPPORT     */
/* (Illustrating Saturday Open -> Sunday Open -> Monday Closed pattern)      */
/* ========================================================================= */
export function getInitialAttendantRecords(
  date: string = '2026-08-19',
  shiftType: string = 'Shift A — Day',
  station: string = 'Tema Main Station'
): AttendantAccountabilityRecord[] {
  return [
    {
      id: 'att_rec_bright',
      attendantName: 'BRIGHT',
      staffId: 'EMP-014',
      phone: '024 111 2233',
      shiftType,
      date,
      station,
      assignedPumps: ['Super 1'],
      accountState: 'open', // OPEN across 3 days (Saturday, Sunday, Monday)
      startDate: '2026-08-16', // Saturday
      isMultiDay: true,
      daysOpen: 3,
      dayLogs: [
        {
          id: 'dl_bright_sat',
          date: '2026-08-16',
          dayName: 'Saturday',
          shiftPeriod: 'Day',
          meterReadings: [
            {
              id: 'mr_b_sat',
              pumpName: 'Super 1',
              fuelType: 'super',
              timeSlot: '06:00 – 18:00',
              openingMeter: 100000.0,
              closingMeter: 100450.0,
              rtt: 0,
              unitPrice: 13.27,
              litresSold: 450.0,
              totalSales: 5971.5,
            },
          ],
          payments: { cash: 4500, visa: 1000, momo: 471.5, bank: 0, credit: 0, other: 0 },
          expenses: [],
          interimCashCounted: 4500,
          notes: 'Saturday shift completed. Account left OPEN per supervisor instruction.',
        },
        {
          id: 'dl_bright_sun',
          date: '2026-08-17',
          dayName: 'Sunday',
          shiftPeriod: 'Day',
          meterReadings: [
            {
              id: 'mr_b_sun',
              pumpName: 'Super 1',
              fuelType: 'super',
              timeSlot: '06:00 – 18:00',
              openingMeter: 100450.0,
              closingMeter: 100850.0,
              rtt: 0,
              unitPrice: 13.27,
              litresSold: 400.0,
              totalSales: 5308.0,
            },
          ],
          payments: { cash: 4000, visa: 800, momo: 508, bank: 0, credit: 0, other: 0 },
          expenses: [],
          interimCashCounted: 4000,
          notes: 'Sunday shift completed. Carried over to Monday for final reconciliation.',
        },
      ],
      meterReadings: [
        {
          id: 'mr_1',
          pumpName: 'Super 1',
          fuelType: 'super',
          timeSlot: '06:00 – 14:00',
          openingMeter: 100850.0,
          closingMeter: 101250.0,
          rtt: 0,
          unitPrice: 13.27,
          litresSold: 400.0,
          totalSales: 5308.0,
        },
      ],
      payments: {
        cash: 3500,
        visa: 700,
        momo: 20.5,
        bank: 0,
        credit: 500,
        other: 0,
      },
      expenses: [],
      actualCashCounted: 12000, // Total cash submitted across Sat, Sun, Mon: GH₵ 12,000
      reviewedBySupervisor: false, // NOT closed yet - remains open across days
      status: 'shortage',
      supervisorNotes: 'Account active across Saturday, Sunday, and Monday. Final reconciliation pending supervisor physical cash count.',
      createdAt: '2026-08-16T06:00:00.000Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'att_rec_david',
      attendantName: 'DAVID',
      staffId: 'EMP-019',
      phone: '024 444 5566',
      shiftType,
      date,
      station,
      assignedPumps: ['Super 2'],
      accountState: 'open', // OPEN across 2 days (Sunday, Monday)
      startDate: '2026-08-17', // Sunday
      isMultiDay: true,
      daysOpen: 2,
      dayLogs: [
        {
          id: 'dl_david_sun',
          date: '2026-08-17',
          dayName: 'Sunday',
          shiftPeriod: 'Day',
          meterReadings: [
            {
              id: 'mr_d_sun',
              pumpName: 'Super 2',
              fuelType: 'super',
              timeSlot: '06:00 – 18:00',
              openingMeter: 200000.0,
              closingMeter: 200750.0,
              rtt: 0,
              unitPrice: 13.27,
              litresSold: 750.0,
              totalSales: 9952.5,
            },
          ],
          payments: { cash: 7000, visa: 1952.5, momo: 1000, bank: 0, credit: 0, other: 0 },
          expenses: [],
          interimCashCounted: 7000,
          notes: 'Sunday shift saved and carried forward.',
        },
      ],
      meterReadings: [
        {
          id: 'mr_2',
          pumpName: 'Super 2',
          fuelType: 'super',
          timeSlot: '06:00 – 14:00',
          openingMeter: 200750.0,
          closingMeter: 201500.0,
          rtt: 0,
          unitPrice: 13.27,
          litresSold: 750.0,
          totalSales: 9952.5,
        },
      ],
      payments: {
        cash: 7000,
        visa: 1952.5,
        momo: 1000,
        bank: 0,
        credit: 0,
        other: 0,
      },
      expenses: [],
      actualCashCounted: 14000,
      reviewedBySupervisor: true,
      status: 'accounted',
      supervisorNotes: 'Exact 2-day multi-shift reconciliation verified.',
      createdAt: '2026-08-17T06:00:00.000Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'att_rec_sarah',
      attendantName: 'SARAH',
      staffId: 'EMP-022',
      phone: '055 777 8899',
      shiftType,
      date,
      station,
      assignedPumps: ['Diesel 1'],
      accountState: 'closed', // Supervisor COMPLETED & CLOSED this account on Monday
      startDate: '2026-08-16', // Saturday
      endDate: '2026-08-18',   // Monday
      isMultiDay: true,
      daysOpen: 3,
      closedAt: '2026-08-18T17:30:00.000Z',
      closedBySupervisor: 'John (Supervisor)',
      closedNotes: 'Saturday & Sunday shifts carried forward, closed Monday upon final physical cash audit.',
      dayLogs: [
        {
          id: 'dl_sarah_sat',
          date: '2026-08-16',
          dayName: 'Saturday',
          shiftPeriod: 'Day',
          meterReadings: [
            {
              id: 'mr_s_sat',
              pumpName: 'Diesel 1',
              fuelType: 'diesel',
              timeSlot: '06:00 – 18:00',
              openingMeter: 50000.0,
              closingMeter: 50700.0,
              rtt: 0,
              unitPrice: 16.1,
              litresSold: 700.0,
              totalSales: 11270.0,
            },
          ],
          payments: { cash: 9000, visa: 1500, momo: 770, bank: 0, credit: 0, other: 0 },
          expenses: [],
          interimCashCounted: 9000,
        },
      ],
      meterReadings: [
        {
          id: 'mr_3',
          pumpName: 'Diesel 1',
          fuelType: 'diesel',
          timeSlot: '06:00 – 14:00',
          openingMeter: 50700.0,
          closingMeter: 51393.17,
          rtt: 0,
          unitPrice: 16.1,
          litresSold: 693.17,
          totalSales: 11160.0,
        },
      ],
      payments: {
        cash: 9000,
        visa: 1500,
        momo: 660,
        bank: 0,
        credit: 0,
        other: 0,
      },
      expenses: [],
      actualCashCounted: 18000,
      reviewedBySupervisor: true,
      status: 'accounted',
      supervisorNotes: 'Account officially completed and closed after 3-day shift span.',
      createdAt: '2026-08-16T06:00:00.000Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'att_rec_johnson',
      attendantName: 'JOHNSON',
      staffId: 'EMP-031',
      phone: '020 999 0011',
      shiftType,
      date,
      station,
      assignedPumps: ['Diesel 2'],
      accountState: 'open', // OPEN across days
      startDate: '2026-08-16', // Saturday
      isMultiDay: true,
      daysOpen: 3,
      meterReadings: [
        {
          id: 'mr_4',
          pumpName: 'Diesel 2',
          fuelType: 'diesel',
          timeSlot: '06:00 – 14:00',
          openingMeter: 60000.0,
          closingMeter: 61130.43,
          rtt: 0,
          unitPrice: 16.1,
          litresSold: 1130.43,
          totalSales: 18200.0,
        },
      ],
      payments: {
        cash: 14950,
        visa: 2000,
        momo: 1200,
        bank: 0,
        credit: 0,
        other: 0,
      },
      expenses: [
        {
          id: 'exp_1',
          category: 'Genset Fuel Voucher',
          amount: 50.0,
          reason: 'Emergency Genset top-up during grid power trip',
          voucherRef: 'VCH-8891',
          approved: true,
        },
      ],
      actualCashCounted: 14900,
      reviewedBySupervisor: true,
      status: 'shortage',
      supervisorNotes: 'Account open since Saturday. GH₵ 50.00 cash drawer shortage noted.',
      createdAt: '2026-08-16T06:00:00.000Z',
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'att_rec_linda',
      attendantName: 'LINDA',
      staffId: 'EMP-008',
      phone: '024 333 4455',
      shiftType,
      date,
      station,
      assignedPumps: ['Super 3'],
      accountState: 'open',
      startDate: date,
      isMultiDay: false,
      daysOpen: 1,
      meterReadings: [
        {
          id: 'mr_5',
          pumpName: 'Super 3',
          fuelType: 'super',
          timeSlot: '06:00 – 14:00',
          openingMeter: 300000.0,
          closingMeter: 301000.0,
          rtt: 0,
          unitPrice: 13.27,
          litresSold: 1000.0,
          totalSales: 13270.0,
        },
      ],
      payments: {
        cash: 10000,
        visa: 2000,
        momo: 1270,
        bank: 0,
        credit: 0,
        other: 0,
      },
      expenses: [],
      actualCashCounted: 10000,
      reviewedBySupervisor: true,
      status: 'accounted',
      supervisorNotes: 'Single day shift open.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'att_rec_kwame',
      attendantName: 'KWAME',
      staffId: 'EMP-045',
      phone: '024 888 9900',
      shiftType,
      date,
      station,
      assignedPumps: ['RON 95 1'],
      accountState: 'closed',
      startDate: date,
      endDate: date,
      isMultiDay: false,
      daysOpen: 1,
      closedAt: new Date().toISOString(),
      closedBySupervisor: 'John (Supervisor)',
      closedNotes: 'RON 95 accounting completed and closed.',
      meterReadings: [
        {
          id: 'mr_6',
          pumpName: 'RON 95 1',
          fuelType: 'ron95',
          timeSlot: '06:00 – 14:00',
          openingMeter: 300000.0,
          closingMeter: 300850.0,
          rtt: 0,
          unitPrice: 14.20,
          litresSold: 850.0,
          totalSales: 12070.0,
        },
      ],
      payments: {
        cash: 7000,
        visa: 3070,
        momo: 2000,
        bank: 0,
        credit: 0,
        other: 0,
      },
      expenses: [],
      actualCashCounted: 7000,
      reviewedBySupervisor: true,
      status: 'accounted',
      supervisorNotes: 'RON 95 sales and digital payments verified. Account closed.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

/* ========================================================================= */
/* SUPERVISOR SALES ACCOUNT CALCULATIONS & SUMMARY HELPER                    */
/* ========================================================================= */

export function computeSupervisorSalesSummary(
  rec: SupervisorSalesAccountRecord
): SupervisorSalesSummary {
  // 1. Calculate Fuel Sales
  let totalFuelLitres = 0;
  let totalFuelSales = 0;
  const fuelBreakdown = {
    superLitres: 0,
    superSales: 0,
    dieselLitres: 0,
    dieselSales: 0,
    ron95Litres: 0,
    ron95Sales: 0,
  };

  (rec.fuelMeters || []).forEach((m) => {
    const netLitres = Math.max(
      0,
      (Number(m.closingMeter) || 0) - (Number(m.openingMeter) || 0) - (Number(m.rtt) || 0)
    );
    const sales = netLitres * (Number(m.unitPrice) || 0);
    totalFuelLitres += netLitres;
    totalFuelSales += sales;

    const fType = m.fuelType || 'super';
    if (fType === 'diesel') {
      fuelBreakdown.dieselLitres += netLitres;
      fuelBreakdown.dieselSales += sales;
    } else if (fType === 'ron95') {
      fuelBreakdown.ron95Litres += netLitres;
      fuelBreakdown.ron95Sales += sales;
    } else {
      fuelBreakdown.superLitres += netLitres;
      fuelBreakdown.superSales += sales;
    }
  });

  // Stock Account Dip & Totalizer Comparison (Super, Diesel, RON 95)
  const stockBreakdown: Record<
    string,
    {
      fuelId: string;
      label: string;
      openingStock: number;
      stockReceived: number;
      totalStock: number;
      closingStock: number;
      salesPerDips: number;
      salesPerTotalizer: number;
      variance: number;
      stockUnderground: number;
    }
  > = {};

  const fuelStockDefs = [
    { id: 'super', label: 'Super / PMS', meterLitres: fuelBreakdown.superLitres },
    { id: 'diesel', label: 'Diesel / AGO', meterLitres: fuelBreakdown.dieselLitres },
    { id: 'ron95', label: 'RON 95 (V-Power)', meterLitres: fuelBreakdown.ron95Litres },
  ];

  fuelStockDefs.forEach((def) => {
    const s = (rec.stocks && rec.stocks[def.id]) || {
      openingStock: def.id === 'super' ? 18500 : def.id === 'diesel' ? 22000 : 8000,
      stockReceived: 0,
      physicalClosing: def.id === 'super' ? 16760 : def.id === 'diesel' ? 20585 : 7420,
    };

    const openingStock = Number(s.openingStock) || 0;
    const stockReceived = Number(s.stockReceived) || 0;
    const totalStock = openingStock + stockReceived;
    const closingStock = Number(s.physicalClosing) || 0;
    const salesPerDips = Math.max(0, totalStock - closingStock);
    const salesPerTotalizer = def.meterLitres;
    const variance = closingStock - (totalStock - salesPerTotalizer);
    const stockUnderground = closingStock;

    stockBreakdown[def.id] = {
      fuelId: def.id,
      label: def.label,
      openingStock,
      stockReceived,
      totalStock,
      closingStock,
      salesPerDips,
      salesPerTotalizer,
      variance,
      stockUnderground,
    };
  });

  // 2. Calculate Lubricant Sales (Exclusively accounted by supervisor)
  let totalLubeUnitsSold = 0;
  let totalLubeSales = 0;
  (rec.lubricantSales || []).forEach((lube) => {
    const qty = Number(lube.soldQty) || 0;
    const price = Number(lube.unitPrice) || 0;
    const amount = Number(lube.totalAmount) || qty * price;
    totalLubeUnitsSold += qty;
    totalLubeSales += amount;
  });

  // Gross Sales (Fuel Sales + Lubricants Revenue)
  const grossSales = totalFuelSales + totalLubeSales;

  // 3. MASTER ACCOUNTING / DEDUCTIONS SECTION
  // Specifically supports: Vouchers, R-Pay, Claim codes, Approved company transactions,
  // Operational expenses, Genset expenses, Water bills, TINGG, VISA, Bank transactions, Other approved transactions
  const deductionsBreakdown: Record<
    SupervisorDeductionType,
    { total: number; count: number; approvedTotal: number; unapprovedTotal: number }
  > = {
    vouchers: { total: 0, count: 0, approvedTotal: 0, unapprovedTotal: 0 },
    r_pay: { total: 0, count: 0, approvedTotal: 0, unapprovedTotal: 0 },
    claim_codes: { total: 0, count: 0, approvedTotal: 0, unapprovedTotal: 0 },
    approved_company_transactions: { total: 0, count: 0, approvedTotal: 0, unapprovedTotal: 0 },
    operational_expenses: { total: 0, count: 0, approvedTotal: 0, unapprovedTotal: 0 },
    genset_expenses: { total: 0, count: 0, approvedTotal: 0, unapprovedTotal: 0 },
    water_bills: { total: 0, count: 0, approvedTotal: 0, unapprovedTotal: 0 },
    tingg: { total: 0, count: 0, approvedTotal: 0, unapprovedTotal: 0 },
    visa: { total: 0, count: 0, approvedTotal: 0, unapprovedTotal: 0 },
    bank_transactions: { total: 0, count: 0, approvedTotal: 0, unapprovedTotal: 0 },
    other_approved: { total: 0, count: 0, approvedTotal: 0, unapprovedTotal: 0 },
  };

  let totalDeductions = 0;
  let unapprovedDeductionsCount = 0;
  let unapprovedDeductionsTotal = 0;

  if (rec.deductions && rec.deductions.length > 0) {
    rec.deductions.forEach((d) => {
      const amt = Number(d.amount) || 0;
      const type = (d.type in deductionsBreakdown ? d.type : 'other_approved') as SupervisorDeductionType;
      deductionsBreakdown[type].total += amt;
      deductionsBreakdown[type].count += 1;
      totalDeductions += amt;

      const isApproved = d.approval?.approved !== false;
      if (isApproved) {
        deductionsBreakdown[type].approvedTotal += amt;
      } else {
        deductionsBreakdown[type].unapprovedTotal += amt;
        unapprovedDeductionsCount += 1;
        unapprovedDeductionsTotal += amt;
      }
    });
  } else {
    // Fallback migration from legacy arrays if present
    const legacyCredit = (rec.approvedCredit || []).reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
    const legacyEvalues = (rec.evalues || []).reduce((acc, ev) => acc + (Number(ev.amount) || 0), 0);
    const legacyExpenses = (rec.expenses || []).reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
    const legacyVouchers = (rec.voucherClaims || []).reduce((acc, vch) => acc + (Number(vch.amount) || 0), 0);

    deductionsBreakdown.approved_company_transactions.total += legacyCredit;
    deductionsBreakdown.approved_company_transactions.count += (rec.approvedCredit || []).length;
    deductionsBreakdown.approved_company_transactions.approvedTotal += legacyCredit;

    deductionsBreakdown.other_approved.total += legacyEvalues;
    deductionsBreakdown.other_approved.count += (rec.evalues || []).length;
    deductionsBreakdown.other_approved.approvedTotal += legacyEvalues;

    deductionsBreakdown.operational_expenses.total += legacyExpenses;
    deductionsBreakdown.operational_expenses.count += (rec.expenses || []).length;
    deductionsBreakdown.operational_expenses.approvedTotal += legacyExpenses;

    deductionsBreakdown.vouchers.total += legacyVouchers;
    deductionsBreakdown.vouchers.count += (rec.voucherClaims || []).length;
    deductionsBreakdown.vouchers.approvedTotal += legacyVouchers;

    totalDeductions = legacyCredit + legacyEvalues + legacyExpenses + legacyVouchers;
  }

  // Credit Collections (Cash collected from prior debtors)
  const categoryC_creditCollections = (rec.creditCollections || []).reduce(
    (acc, col) => acc + (Number(col.amount) || 0),
    0
  );

  // Expected Cash to Bank = Gross Sales + Credit Collections - Total Deductions
  const expectedCashToBank = Math.max(0, grossSales + categoryC_creditCollections - totalDeductions);

  // Actual Physical Cash from Denominations
  let actualCashCounted = Number(rec.actualCashCounted) || 0;
  if (rec.cashDenominations) {
    let noteSum = 0;
    if (rec.cashDenominations.notes) {
      Object.entries(rec.cashDenominations.notes).forEach(([denom, count]) => {
        noteSum += Number(denom) * (Number(count) || 0);
      });
    }
    let coinSum = 0;
    if (rec.cashDenominations.coins) {
      Object.entries(rec.cashDenominations.coins).forEach(([denom, count]) => {
        coinSum += Number(denom) * (Number(count) || 0);
      });
    }
    const denomTotal = noteSum + coinSum;
    if (denomTotal > 0) {
      actualCashCounted = denomTotal;
    }
  }

  const netVariance = actualCashCounted - expectedCashToBank;
  const hasDiscrepancy = Math.abs(netVariance) > 0.5;

  let status: 'accounted' | 'shortage' | 'excess' | 'pending' = 'pending';
  if (rec.accountState === 'closed' || actualCashCounted > 0) {
    if (!hasDiscrepancy) {
      status = 'accounted';
    } else if (netVariance < -0.5) {
      status = 'shortage';
    } else {
      status = 'excess';
    }
  }

  const accountState = rec.accountState || 'open';
  const isMultiDay = Boolean(rec.isMultiDay || (rec.daysOpen && rec.daysOpen > 1));
  const daysOpenCount = rec.daysOpen || 1;

  return {
    totalFuelLitres,
    totalFuelSales,
    fuelBreakdown,
    stockBreakdown,
    totalLubeUnitsSold,
    totalLubeSales,
    grossSales,
    deductionsBreakdown,
    totalDeductions,
    unapprovedDeductionsCount,
    unapprovedDeductionsTotal,
    categoryA_approvedCredit: deductionsBreakdown.approved_company_transactions.total,
    categoryB_evalues: deductionsBreakdown.other_approved.total + deductionsBreakdown.tingg.total + deductionsBreakdown.visa.total + deductionsBreakdown.r_pay.total,
    categoryC_creditCollections,
    categoryD_expenses: deductionsBreakdown.operational_expenses.total + deductionsBreakdown.genset_expenses.total + deductionsBreakdown.water_bills.total,
    totalVouchers: deductionsBreakdown.vouchers.total + deductionsBreakdown.claim_codes.total,
    totalDrawings: totalDeductions,
    expectedCashToBank,
    actualCashCounted,
    netVariance,
    status,
    hasDiscrepancy,
    accountState,
    isMultiDay,
    daysOpenCount,
  };
}

export function generateDefaultSupervisorSalesAccounts(
  supervisorName = 'John Mensah',
  station = 'Tema Main Station',
  stationCode = 'SO-TMA-001'
): SupervisorSalesAccountRecord[] {
  const today = new Date().toISOString().slice(0, 10);
  
  return [
    {
      id: 'sup_sales_001',
      supervisorName,
      staffId: 'SO-SUP-01',
      phone: '024 123 4567',
      shiftType: 'Shift A — Day (06:00 – 18:00)',
      date: today,
      station,
      stationCode,
      accountState: 'open',
      status: 'pending',
      startDate: today,
      isMultiDay: false,
      daysOpen: 1,
      stocks: {
        super: {
          openingStock: 18500,
          stockReceived: 0,
          physicalClosing: 16760,
          notes: 'Dip tape reading 162cm. Zero water detected.',
        },
        diesel: {
          openingStock: 22000,
          stockReceived: 0,
          physicalClosing: 20585,
          notes: 'Dip tape reading 198cm. Water paste test clear.',
        },
        ron95: {
          openingStock: 8000,
          stockReceived: 0,
          physicalClosing: 7420,
          notes: 'Dip tape reading 94cm.',
        },
      },
      fuelMeters: [
        {
          id: 'sm_1',
          pumpName: 'Pump Island 1 (PMS 1 & AGO 1)',
          fuelType: 'super',
          timeSlot: '06:00 – 18:00',
          openingMeter: 124500.0,
          closingMeter: 126250.0,
          rtt: 10.0,
          unitPrice: 13.27,
          litresSold: 1740.0,
          totalSales: 23089.80,
        },
        {
          id: 'sm_2',
          pumpName: 'Pump Island 2 (PMS 2 & RON 95)',
          fuelType: 'diesel',
          timeSlot: '06:00 – 18:00',
          openingMeter: 89200.0,
          closingMeter: 90620.0,
          rtt: 5.0,
          unitPrice: 14.50,
          litresSold: 1415.0,
          totalSales: 20517.50,
        },
        {
          id: 'sm_3',
          pumpName: 'Pump Island 3 (RON 95 V-Power)',
          fuelType: 'ron95',
          timeSlot: '06:00 – 18:00',
          openingMeter: 45100.0,
          closingMeter: 45680.0,
          rtt: 0,
          unitPrice: 14.20,
          litresSold: 580.0,
          totalSales: 8236.00,
        },
      ],
      lubricantSales: [
        {
          id: 'slube_1',
          catalogId: 'ug-sae40-1l',
          name: 'ULTRA GUARD SAE 40',
          unit: '1LT',
          unitPrice: 66,
          openingStock: 24,
          received: 0,
          soldQty: 6,
          closingStock: 18,
          totalAmount: 396,
        },
        {
          id: 'slube_2',
          catalogId: 'ug-hpd-15w40-4l',
          name: 'STAR ULTRA GUARD HPD SAE 15W40 CF-4',
          unit: '4LT',
          unitPrice: 257,
          openingStock: 12,
          received: 0,
          soldQty: 2,
          closingStock: 10,
          totalAmount: 514,
        },
        {
          id: 'slube_3',
          catalogId: 'st-atf3-1l',
          name: 'STAR-TRANS ATF -III',
          unit: '1LT',
          unitPrice: 84,
          openingStock: 16,
          received: 0,
          soldQty: 3,
          closingStock: 13,
          totalAmount: 252,
        },
        {
          id: 'slube_4',
          catalogId: 'sc-coolant-1l',
          name: 'Star Cool Cool-Ant',
          unit: '1LT',
          unitPrice: 59,
          openingStock: 20,
          received: 0,
          soldQty: 4,
          closingStock: 16,
          totalAmount: 236,
        },
      ],
      // MASTER ACCOUNTING / DEDUCTIONS SECTION
      // Specifically supports all 11 required transaction types:
      deductions: [
        {
          id: 'sded_vch_1',
          type: 'vouchers',
          categoryLabel: 'Vouchers',
          amount: 1740.0,
          description: 'Intercity STC fleet paper voucher (120L Diesel for bus GN-4421-20)',
          date: today,
          reference: 'VCH-STC-4421',
          companyName: 'Intercity STC Coaches',
          vehicleReg: 'GN-4421-20',
          litres: 120,
          fuelProduct: 'diesel',
          approval: {
            approved: true,
            approvedBy: 'Kwame Mensah (Manager)',
            approvalCode: 'MGR-VCH-8821',
            approvalDate: today,
            notes: 'Physical voucher slip verified and retained in audit envelope',
          },
        },
        {
          id: 'sded_rpay_1',
          type: 'r_pay',
          categoryLabel: 'R-Pay',
          amount: 1250.0,
          description: 'R-Pay electronic fleet network card payment for haulage truck',
          date: today,
          reference: 'RPAY-992014',
          companyName: 'B5 Plus Logistics',
          vehicleReg: 'GT-9081-22',
          channelOrBank: 'R-Pay Portal',
          approval: {
            approved: true,
            approvedBy: 'Kwame Mensah (Manager)',
            approvalCode: 'RP-AUTH-882',
            approvalDate: today,
            notes: 'System verification SMS code matched customer token',
          },
        },
        {
          id: 'sded_clm_1',
          type: 'claim_codes',
          categoryLabel: 'Claim codes',
          amount: 850.0,
          description: 'Fleet authorization claim coupon code (Government Protocol Escort)',
          date: today,
          reference: 'CLM-GH-7782',
          companyName: 'Ministry of Transport Protocol',
          vehicleReg: 'GV-102-23',
          approval: {
            approved: true,
            approvedBy: 'Kwame Mensah (Manager)',
            approvalCode: 'CLM-AUTH-091',
            approvalDate: today,
            notes: 'Verified via StarOil Central Claim Portal',
          },
        },
        {
          id: 'sded_corp_1',
          type: 'approved_company_transactions',
          categoryLabel: 'Approved company transactions',
          amount: 3200.0,
          description: 'Corporate monthly credit billing invoice for heavy tipper fleet',
          date: today,
          reference: 'INV-SHC-2026-88',
          companyName: 'State Housing Corporation',
          vehicleReg: 'GV-891-21',
          approval: {
            approved: true,
            approvedBy: 'Kwame Mensah (Manager)',
            approvalCode: 'LPO-SHC-449',
            approvalDate: today,
            notes: 'Official purchase order LPO attached and signed',
          },
        },
        {
          id: 'sded_ops_1',
          type: 'operational_expenses',
          categoryLabel: 'Operational expenses',
          amount: 180.0,
          description: 'Forecourt cleaning detergents, thermal receipt rolls, and safety PPE gloves',
          date: today,
          reference: 'EXP-OPS-091',
          approval: {
            approved: true,
            approvedBy: supervisorName,
            approvalCode: 'PETTY-091',
            approvalDate: today,
            notes: 'Approved petty cash drawing from forecourt sales',
          },
        },
        {
          id: 'sded_gen_1',
          type: 'genset_expenses',
          categoryLabel: 'Genset expenses',
          amount: 450.0,
          description: 'Emergency station generator diesel top-up (30L AGO) during grid ECG outage',
          date: today,
          reference: 'GEN-20260825',
          litres: 30,
          fuelProduct: 'diesel',
          approval: {
            approved: true,
            approvedBy: 'Kwame Mensah (Manager)',
            approvalCode: 'GEN-RUN-04',
            approvalDate: today,
            notes: 'Outage duration: 3.5 hrs. Meter reading verified before fueling genset tank',
          },
        },
        {
          id: 'sded_wtr_1',
          type: 'water_bills',
          categoryLabel: 'Water bills',
          amount: 320.0,
          description: 'Ghana Water Company Ltd (GWCL) utility bill payment for station washrooms and service bay',
          date: today,
          reference: 'GWCL-BILL-88301',
          companyName: 'Ghana Water Company Ltd',
          approval: {
            approved: true,
            approvedBy: 'Kwame Mensah (Manager)',
            approvalCode: 'UTIL-WTR-2026',
            approvalDate: today,
            notes: 'Original GWCL bill receipt retained in petty cash envelope',
          },
        },
        {
          id: 'sded_tng_1',
          type: 'tingg',
          categoryLabel: 'TINGG',
          amount: 2150.0,
          description: 'Tingg digital merchant payment terminal transactions & QR settlements',
          date: today,
          reference: 'TINGG-POS-4482',
          channelOrBank: 'Tingg Merchant POS 01',
          approval: {
            approved: true,
            approvedBy: supervisorName,
            approvalCode: 'TNG-SETTLE-88',
            approvalDate: today,
            notes: 'Batch settlement printout verified and balanced with daily transactions',
          },
        },
        {
          id: 'sded_visa_1',
          type: 'visa',
          categoryLabel: 'VISA',
          amount: 5400.0,
          description: 'Stanbic Bank Visa / MasterCard POS card swipe payments',
          date: today,
          reference: 'STAN-POS-0482',
          channelOrBank: 'Stanbic Bank POS',
          approval: {
            approved: true,
            approvedBy: supervisorName,
            approvalCode: 'VISA-EOD-0482',
            approvalDate: today,
            notes: 'End-of-day bank POS batch closure successful and receipts attached',
          },
        },
        {
          id: 'sded_bnk_1',
          type: 'bank_transactions',
          categoryLabel: 'Bank transactions',
          amount: 4200.0,
          description: 'Direct corporate client bank wire deposit into StarOil GCB main collection account',
          date: today,
          reference: 'GCB-DIR-8472',
          companyName: 'Zenith Oil Haulage Ltd',
          channelOrBank: 'GCB Bank Main Branch',
          approval: {
            approved: true,
            approvedBy: 'Kwame Mensah (Manager)',
            approvalCode: 'GCB-ADV-993',
            approvalDate: today,
            notes: 'Bank credit advice slip verified via treasury alert',
          },
        },
        {
          id: 'sded_oth_1',
          type: 'other_approved',
          categoryLabel: 'Other approved transactions',
          amount: 8500.0,
          description: 'Forecourt MTN Mobile Money & Telecel Cash merchant wallet settlements',
          date: today,
          reference: 'TXN-98421034',
          channelOrBank: 'MTN Mobile Money Merchant Pay',
          approval: {
            approved: true,
            approvedBy: supervisorName,
            approvalCode: 'MOMO-MER-01',
            approvalDate: today,
            notes: 'Forecourt merchant wallet balance audited with shift attendant records',
          },
        },
      ],
      creditCollections: [
        {
          id: 'scol_1',
          customer: 'VIP Transport Logistics',
          receiptRef: 'RCP-VIP-0091',
          amount: 2500,
          notes: 'Settlement for previous week diesel invoice',
        },
      ],
      cashDenominations: {
        notes: {
          200: 80,  // 16,000
          100: 85,  // 8,500
          50: 50,   // 2,500
          20: 20,   // 400
          10: 8,    // 80
          5: 3,     // 15
          2: 0,
          1: 0,
        },
        coins: {
          2.00: 3,  // 6.00
          1.00: 0,
          0.50: 0,
          0.20: 0,
          0.10: 3,  // 0.30
        },
        totalCash: 27501.30,
      },
      actualCashCounted: 27501.30,
      safeDropAmount: 25000,
      bankDepositSlip: 'GCB-DEP-20260825-991',
      notes: 'Shift sales running smoothly. All meter readings, StarOil lubricants inventory, and all 11 accounting deduction categories reconciled with full approvals.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
}

