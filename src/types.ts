export interface FuelDefinition {
  id: string;
  label: string;
  shortName: string;
  defaultPrice: number;
  colorClass: string;
  badgeBg: string;
  badgeText: string;
}

export const FUELS: FuelDefinition[] = [
  {
    id: 'pms',
    label: 'PMS / Super Petrol',
    shortName: 'PMS',
    defaultPrice: 12.50,
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-800'
  },
  {
    id: 'ago',
    label: 'AGO / Diesel',
    shortName: 'AGO',
    defaultPrice: 13.20,
    colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800'
  },
  {
    id: 'ron95',
    label: 'RON 95 / V-Power',
    shortName: 'RON 95',
    defaultPrice: 13.80,
    colorClass: 'text-blue-700 bg-blue-50 border-blue-200',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-800'
  },
];

export const DENOMINATIONS = [200, 100, 50, 20, 10, 5, 2, 1];
export const COIN_DENOMINATIONS = [2.00, 1.00, 0.50, 0.20, 0.10];
export const PAYMENT_CHANNELS = ['Bank', 'MoMo', 'Card', 'Tingg', 'R-Pay', 'Hubtel', 'Other'] as const;
export type PaymentChannel = typeof PAYMENT_CHANNELS[number];

export const ALL_GHANA_BANKS = [
  // Licensed Universal Commercial Banks (Bank of Ghana)
  'Absa Bank Ghana PLC',
  'Access Bank Ghana PLC',
  'Agricultural Development Bank (ADB) PLC',
  'Bank of Africa Ghana (BOA)',
  'CalBank PLC',
  'Consolidated Bank Ghana (CBG)',
  'Ecobank Ghana PLC',
  'FBNBank Ghana Limited',
  'Fidelity Bank Ghana Limited',
  'First Atlantic Bank (FAB)',
  'First National Bank Ghana (FNB)',
  'GCB Bank PLC',
  'Guaranty Trust Bank Ghana (GTBank)',
  'National Investment Bank (NIB)',
  'OmniBSIC Bank Ghana',
  'Prudential Bank Limited',
  'Republic Bank (Ghana) PLC',
  'Société Générale Ghana (SG Ghana)',
  'Stanbic Bank Ghana Limited',
  'Standard Chartered Bank Ghana',
  'United Bank for Africa (UBA Ghana)',
  'Universal Merchant Bank (UMB)',
  'Zenith Bank Ghana Limited',
  // Specialized & Savings & Loans / Rural Apex Institutions
  'ARB Apex Bank (Rural & Community Banks Network)',
  'Best Point Savings & Loans',
  'Services Commercial Bank',
  'Sinapi Aba Savings & Loans',
  'Opportunity International Savings & Loans',
  'Bayport Savings & Loans',
  'Pan-African Savings & Loans',
  'ABii National Savings & Loans',
  'Other Rural / Community Bank',
] as const;

export const DEFAULT_BANKS = [...ALL_GHANA_BANKS];

/* ========================================================================= */
/* GHANA NATIONAL LUBRICANTS MASTER CATALOG (MULTI-COMPANY FORECOURT SYSTEM)   */
/* INCLUDES ALL BRANDS & OMCS IN GHANA: TOTALENERGIES, SHELL, GOIL, STAROIL,  */
/* PUMA ENERGY, CASTROL, MOBIL, ALLIED, ZEN, PETROSOL, FRIMPS, BENAB & OTHERS  */
/* ONLY THE SUPERVISOR ACCOUNTS FOR FORECOURT LUBRICANTS & OIL SALES         */
/* ========================================================================= */
export interface LubricantProduct {
  id: string;
  brand: string;
  name: string;
  category: 'Motor Oil' | 'Diesel Engine Oil' | 'Fully Synthetic' | 'Semi-Synthetic' | 'Transmission & Gear' | 'Coolant & Brake' | 'Grease & Specialty' | '2T & 4T Motorcycle / Marine' | string;
  viscosityGrade?: string;
  unit: string;
  dealerPrice: number;   // Wholesale / dealer acquisition cost
  consumerPrice: number; // Official Station Retail Price
}

export type StarOilLubricantProduct = LubricantProduct;

import {
  GHANA_LUBRICANTS_MASTER_CATALOG,
  LUBRICANT_BRANDS,
  LUBRICANT_CATEGORIES,
  ALL_GHANA_OMCS,
} from './data/ghanaLubricantsCatalog';

export {
  GHANA_LUBRICANTS_MASTER_CATALOG,
  LUBRICANT_BRANDS,
  LUBRICANT_CATEGORIES,
  ALL_GHANA_OMCS,
};

export const LUBRICANT_CATALOG = GHANA_LUBRICANTS_MASTER_CATALOG;
export const STAROIL_LUBRICANTS_CATALOG = GHANA_LUBRICANTS_MASTER_CATALOG;

export interface SupervisorLubeRecord {
  id: string;
  catalogId?: string;
  brand?: string;
  category?: string;
  viscosityGrade?: string;
  name: string;
  unit: string;
  unitPrice: number;     // Consumer retail price
  dealerPrice?: number;  // Wholesale / purchase price
  openingStock: number;  // Opening physical units on station shelf
  received: number;      // Fresh cartons / units received into station inventory
  soldQty: number;       // Units sold during shift (accounted by supervisor)
  closingStock: number;  // Physical count at end of shift
  totalAmount: number;   // soldQty * unitPrice
  notes?: string;
}


export interface PumpReading {
  id: string;
  name: string;
  opening: number;
  closing: number;
  rtt: number; // Return To Tank (Calibration / testing litres)
}

export interface FuelRecord {
  price: number;
  pumps: PumpReading[];
}

export interface CreditEntry {
  id: string;
  customer: string;
  reference: string;
  amount: number;
}

export interface EvalueEntry {
  id: string;
  channel: PaymentChannel;
  bank?: string;
  reference: string;
  amount: number;
}

export interface GeneratorEntry {
  id: string;
  description: string;
  amount: number;
}

export interface CashAnalysis {
  denoms: Record<number, number>; // denomination -> count of pieces
  coins: Record<number, number>;  // coin -> count of pieces
}

export interface TankStockItem {
  openingStock: number;     // Opening Dip / Stock in Litres
  stockReceived: number;    // Stock received / BRV tanker discharge in Litres
  physicalClosing: number;  // Physical Dip / Actual Closing Stock in Litres
  notes?: string;           // Optional invoice / delivery waybill reference
}

export type ShiftStatus = 'draft' | 'submitted' | 'verified';
export type ReconciliationStatus = 'balanced' | 'shortage' | 'excess';

export interface ShiftRecord {
  id: string;
  date: string;
  shiftGroup: 'A' | 'B';
  shiftPeriod: 'Day' | 'Night';
  attendant: string;
  attendantId?: string;
  station: string;
  stationId?: string;
  stationCode?: string;
  supervisor: string;
  supervisorId?: string;
  userId?: string;
  notes?: string;
  fuels: Record<string, FuelRecord>;
  stocks?: Record<string, TankStockItem>;
  approved: CreditEntry[];     // Category A: Approved Credit Sales
  evalue: EvalueEntry[];       // Category B: E-Value / Drawings (MoMo, Bank, POS, etc.)
  collections: CreditEntry[];  // Category C: Credit Sales Collection (Cash collected from prior credit)
  generator: GeneratorEntry[]; // Category D: Generator Fuel / Station Expenses
  cash: CashAnalysis;
  status: ShiftStatus;
  attendantSignature?: string; // Base64 data URL
  supervisorSignature?: string; // Base64 data URL
  verifiedBy?: string;
  verifiedAt?: string;
  revisionOf?: string | null;
  submittedAt?: string;
  createdAt: string;
  _step?: number;
}

export interface FuelReconciliationItem {
  meterLitres: number;
  rttLitres: number;
  netLitres: number;
  price: number;
  salesAmount: number;
}

export interface FuelStockReconciliation {
  fuelId: string;
  label: string;
  shortName: string;
  openingStock: number;
  stockReceived: number;
  totalAvailable: number;   // openingStock + stockReceived
  salesLitres: number;      // from dispenser meter readings
  bookClosing: number;      // totalAvailable - salesLitres
  physicalClosing: number;  // physical dip
  variation: number;        // physicalClosing - bookClosing (positive = gain, negative = loss)
  variationPercent: number; // percentage variation relative to sales or throughput
  status: 'balanced' | 'gain' | 'loss';
}

export interface ShiftReconciliation {
  totalLitres: number;
  fuelBreakdown: Record<string, FuelReconciliationItem>;
  stockBreakdown: Record<string, FuelStockReconciliation>;
  totalOpeningStock: number;
  totalStockReceived: number;
  totalPhysicalClosing: number;
  totalBookClosing: number;
  totalStockVariation: number;
  totalSales: number;        // Expected sales from meter readings
  A: number;                 // Approved Credit Sales
  B: number;                 // E-Value / Drawings
  C: number;                 // Credit Sales Collection
  D: number;                 // Generator Fuel
  drawings: number;          // Total Drawings (A + B + D)
  totalCashToBank: number;   // Expected cash: Total Sales + C - (A + B + D)
  physicalCash: number;      // Actual physical cash counted
  diff: number;              // physicalCash - totalCashToBank
  status: ReconciliationStatus;
}

export interface CompanyConfig {
  id: string;
  name: string;
  code?: string;
  description?: string;
  logo?: string;
  createdAt?: string;
}

export interface StationConfig {
  id: string;
  name: string;
  stationCode: string;           // Official Station Code provided by the owning company (stored as text/string data, e.g. 004, STN-01, SO-ACC-012, GH-99, etc.)
  companyId?: string;            // ID of the company that owns/operates this station
  companyName?: string;          // Name of the operating company (e.g. StarOil, GOIL, TotalEnergies, Shell, Allied, Puma, Frimps, etc.)
  isActive?: boolean;            // Station operational status (default true/active)
  pumps: Record<string, number>; // fuelId -> pump count (0 = fuel not carried at this station branch)
  prices: Record<string, number>;// fuelId -> price per litre
  hasRon95?: boolean;            // Flag indicating if station branch carries RON 95 (V-Power / Super 95)
  banks: string[];
  lat?: number;
  lng?: number;
  locationName?: string;
}

export type UserRole = 'attendant' | 'supervisor';

export interface StationCodeAuditEntry {
  id: string;
  timestamp: string;
  stationId: string;
  stationName: string;
  companyId?: string;
  companyName?: string;
  oldCode: string;
  newCode: string;
  changedBy: string;
  userRole: string;
  reason: string;
}

export interface WorkerAssignmentAuditEntry {
  id: string;
  timestamp: string;
  workerId: string;
  workerName: string;
  companyId?: string;
  companyName?: string;
  staffId?: string;
  oldStation: string;
  newStation: string;
  oldStationId?: string;
  newStationId?: string;
  oldStationCode?: string;
  newStationCode: string;
  assignedBy: string;
  userRole: string;
  reason: string;
}

export interface StationJoinRequest {
  id: string;
  userId: string;
  attendantName: string;
  attendantIdentifier: string;
  attendantPhone?: string;
  attendantEmail?: string;
  staffId?: string;
  stationId: string;
  stationName: string;
  stationCode: string;
  companyName?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

export interface AccountClosureAuditEntry {
  id: string;
  timestamp: string;
  accountId: string;
  attendantName: string;
  staffId: string;
  stationName: string;
  stationCode: string;
  startDate: string;
  endDate: string;
  daysOpen: number;
  totalSales: number;
  expectedCash: number;
  actualCash: number;
  variance: number;
  status: 'accounted' | 'shortage' | 'excess' | 'pending';
  closedBySupervisor: string;
  notes?: string;
}

export interface UserProfile {
  id?: string;
  attendant: string;
  station: string;
  stationId?: string;
  stationCode?: string;
  companyId?: string;
  companyName?: string;
  supervisor: string;
  supervisorId?: string;
  email?: string;
  phone?: string;
  authType?: 'email' | 'phone';
  isVerified?: boolean;
  staffId?: string;
  role?: UserRole;
  verifiedAt?: string;
}

export interface AuthUser {
  id: string;
  fullName: string;
  authType: 'email' | 'phone';
  identifier: string; // email address or phone number (e.g. +233 24 123 4567 or email@domain.com)
  phone?: string;
  email?: string;
  password?: string;
  isVerified: boolean;
  station: string;
  stationId?: string;
  stationCode: string;
  companyId?: string;
  companyName?: string;
  supervisor: string;
  role: UserRole;
  staffId: string;
  shiftGroup?: 'A' | 'B' | 'C' | string;
  shiftHours?: string;
  assignedPumps?: string;
  dutyStatus?: 'active' | 'scheduled' | 'standby';
  attendanceRate?: string;
  // Attendant Personal PIN Security (One-way hashed)
  pinHash?: string;           // One-way SHA-256 hash of salt + 6-digit PIN
  pinSalt?: string;           // Cryptographic salt for PIN hashing
  pinFailedAttempts?: number; // Count of consecutive failed PIN entries
  pinLockedUntil?: number;    // Lockout timestamp (ms) if max attempts exceeded
  createdAt: string;
  verifiedAt?: string;
  lastLoginAt: string;
}

export interface VerificationSession {
  identifier: string;
  authType: 'email' | 'phone';
  code: string;
  expiresAt: number; // timestamp in ms (valid for limited period, e.g. 10 minutes)
  attempts: number;  // current failed attempts count
  maxAttempts: number; // max allowed failed attempts before invalidation (5)
  lastSentAt: number; // timestamp in ms of last OTP dispatch for rate-limiting
}

// Supervisor Master Daily Account Sheet Types (Matching Excel Station Ledger)
export interface SupervisorPumpData {
  closing: number;
  opening: number;
  rtt: number;
}

export interface SupervisorFuelSection {
  unitPrice: number;
  pumps: SupervisorPumpData[];
  attendantPairs?: {
    pumpRange: string; // e.g. "Pumps 1 - 2", "Pumps 3 - 4"
    attendantNames: string; // e.g. "BRIGHT/DAVID", "SARAH/JOHNSON"
    amount?: number;
  }[];
}

export interface SupervisorStockAccount {
  openingStock: number;
  stockReceived: number;
  closingStockDip: number;
}

export interface SupervisorLubeItem {
  id: string;
  name: string;
  unitPrice: number;
  qty: number;
  amount: number;
}

export interface SupervisorExpenseItem {
  id: string;
  category: string; // 'voucher' | 'rpay' | 'visa' | 'tingg' | 'claim' | 'operational' | 'genset' | 'water' | 'other'
  description: string;
  amount: number;
}

export interface SupervisorDailySheet {
  id: string;
  date: string;
  station: string;
  stationCode?: string;
  supervisor: string;
  status: 'draft' | 'verified' | 'submitted';
  superFuel: SupervisorFuelSection; // PMS / Super
  dieselFuel: SupervisorFuelSection; // AGO / Diesel
  ron95Fuel?: SupervisorFuelSection; // RON 95 (if available)
  stockAccount: {
    super: SupervisorStockAccount;
    diesel: SupervisorStockAccount;
    ron95?: SupervisorStockAccount;
  };
  lubricants: SupervisorLubeItem[];
  expenses: SupervisorExpenseItem[];
  creditSales?: number;
  starcardFunding?: number;
  notes?: string;
  signature?: string;
  createdAt: string;
  updatedAt: string;
}

export type SupervisorDeductionType =
  | 'vouchers'
  | 'r_pay'
  | 'claim_codes'
  | 'approved_company_transactions'
  | 'operational_expenses'
  | 'genset_expenses'
  | 'water_bills'
  | 'tingg'
  | 'visa'
  | 'bank_transactions'
  | 'other_approved';

export interface SupervisorDeductionApproval {
  approved: boolean;
  approvedBy?: string;     // Approver Name / Manager e.g. "Kwame Mensah (Manager)"
  approvalCode?: string;   // Authorization code or reference
  approvalDate?: string;   // Date of approval
  notes?: string;          // Approval remarks / justification
}

export interface SupervisorDeductionEntry {
  id: string;
  type: SupervisorDeductionType;
  categoryLabel?: string;   // e.g. "Vouchers", "R-Pay", "Claim codes", "Water bills", etc.
  amount: number;
  description: string;      // Transaction / deduction description
  date: string;             // ISO date e.g. "2026-08-25"
  reference: string;        // Ref #, Voucher #, Claim code, Bank Slip, POS Ref, Invoice #
  approval: SupervisorDeductionApproval;
  
  // Contextual metadata:
  companyName?: string;     // e.g. "Intercity STC", "Ghana Police", "VIP Transport", "StarOil Fleet"
  vehicleReg?: string;      // e.g. "GN-4820-24"
  customerName?: string;    // Customer or staff name
  channelOrBank?: string;   // e.g. "Stanbic Bank", "GCB Bank", "Tingg POS", "Visa Swipe"
  litres?: number;          // Fuel litres if applicable
  fuelProduct?: 'super' | 'diesel' | 'ron95';
}

export const SUPERVISOR_DEDUCTION_CATEGORIES: {
  type: SupervisorDeductionType;
  label: string;
  badgeColor: string;
  description: string;
}[] = [
  {
    type: 'vouchers',
    label: 'Vouchers',
    badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-800',
    description: 'Corporate fuel vouchers, Gov coupons, fleet paper vouchers',
  },
  {
    type: 'r_pay',
    label: 'R-Pay',
    badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-800',
    description: 'R-Pay electronic fleet cards & digital fuel network transactions',
  },
  {
    type: 'claim_codes',
    label: 'Claim codes',
    badgeColor: 'bg-purple-950 text-purple-300 border-purple-800',
    description: 'Special authorization claim codes, promotional claims & loyalty coupons',
  },
  {
    type: 'approved_company_transactions',
    label: 'Approved company transactions',
    badgeColor: 'bg-blue-950 text-blue-300 border-blue-800',
    description: 'Corporate credit accounts, fleet invoice approvals, head office allocations',
  },
  {
    type: 'operational_expenses',
    label: 'Operational expenses',
    badgeColor: 'bg-amber-950 text-amber-300 border-amber-800',
    description: 'Station consumables, forecourt cleaning supplies, stationery, minor repairs',
  },
  {
    type: 'genset_expenses',
    label: 'Genset expenses',
    badgeColor: 'bg-orange-950 text-orange-300 border-orange-800',
    description: 'Emergency generator diesel consumption, genset oil top-ups & servicing',
  },
  {
    type: 'water_bills',
    label: 'Water bills',
    badgeColor: 'bg-sky-950 text-sky-300 border-sky-800',
    description: 'GWCL utility bills, water tanker deliveries for station washrooms & service bay',
  },
  {
    type: 'tingg',
    label: 'TINGG',
    badgeColor: 'bg-teal-950 text-teal-300 border-teal-800',
    description: 'Tingg digital merchant payments, USSD and QR terminal receipts',
  },
  {
    type: 'visa',
    label: 'VISA',
    badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    description: 'Visa / MasterCard debit & credit card POS terminal settlements',
  },
  {
    type: 'bank_transactions',
    label: 'Bank transactions',
    badgeColor: 'bg-violet-950 text-violet-300 border-violet-800',
    description: 'Direct bank deposits, GhIPSS Instant transfers, corporate bank lodgments',
  },
  {
    type: 'other_approved',
    label: 'Other approved transactions',
    badgeColor: 'bg-slate-900 text-slate-300 border-slate-700',
    description: 'Mobile Money, Hubtel, StarCard funding, other authorized station drawings',
  },
];

export interface SupervisorAttendantHandover {
  id: string;
  attendantId?: string;
  attendantName: string;
  pumpRange: string;         // e.g. "Pumps 1 - 2 (Super)", "Pumps 3 - 4 (Diesel)"
  timeSlot?: string;         // e.g. "06:00 – 14:00"
  litresSold: number;        // Total litres dispensed by this attendant
  salesAmount: number;       // Gross sales from attendant's nozzles
  cashHandedOver: number;    // Physical cash given to supervisor
  evaluesAmount?: number;    // MoMo, POS, Cards collected by attendant
  vouchersAmount?: number;   // Vouchers collected by attendant
  creditSales?: number;      // Corporate credit signed at nozzle
  variance?: number;         // Shortage (-) or Excess (+) on attendant's book
  status?: 'verified' | 'pending' | 'flagged';
  notes?: string;
}

export interface SupervisorSalesAccountRecord {
  id: string;
  supervisorName: string;
  staffId: string;
  phone?: string;
  shiftType: string;        // e.g. "Shift A — Day", "Shift B — Night"
  date: string;             // ISO Date e.g. "2026-08-25"
  station: string;
  stationCode?: string;
  
  // Fuel Mode (Consolidated Attendant Shifts vs Master Totalizers)
  fuelAccountingMode?: 'attendant_handovers' | 'master_totalizers' | 'both';
  
  // Attendant Shift Handovers (Supervisor Consolidates All Station Attendants on Duty)
  attendantHandovers?: SupervisorAttendantHandover[];
  
  // 1. Fuel Dispensers & Meter Accountability (Super, Diesel, RON 95)
  fuelMeters: AttendantMeterReading[];
  
  // Tank Stocks / Underground Dip Accountability (Super, Diesel, RON 95)
  stocks?: Record<string, TankStockItem>;
  
  // 2. Supervisor Exclusive Lubricants & Specialty Products Ledger
  lubricantSales: SupervisorLubeRecord[];
  
  // 3. MASTER ACCOUNTING / DEDUCTIONS SECTION
  // Specifically supports: Vouchers, R-Pay, Claim codes, Approved company transactions,
  // Operational expenses, Genset expenses, Water bills, TINGG, VISA, Bank transactions, Other approved transactions
  deductions?: SupervisorDeductionEntry[];
  
  // Legacy / Direct drawings fallback arrays
  approvedCredit?: AttendantCreditSale[];
  evalues?: AttendantEvalueEntry[];
  creditCollections?: AttendantCreditCollection[];
  expenses?: AttendantDeduction[];
  voucherClaims?: AttendantVoucherClaim[];
  
  // 4. Physical Cash Denominations (Notes & Coins)
  cashDenominations: CashDenominationBreakdown;
  actualCashCounted: number;
  
  // Safe Drop & Bank Slip Reference
  safeDropAmount?: number;
  bankDepositSlip?: string;
  
  // Account Status & Multi-Day Continuity
  accountState: 'open' | 'closed';
  status: 'accounted' | 'shortage' | 'excess' | 'pending';
  startDate: string;
  endDate?: string;
  isMultiDay?: boolean;
  daysOpen?: number;
  
  // Supervisor verification & Audit
  notes?: string;
  supervisorSignature?: string;
  managerSignature?: string;
  managerApproved?: boolean;
  managerNotes?: string;
  supervisorChecklist?: SupervisorAccountClosureChecklist;
  closedAt?: string;
  closedBySupervisor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupervisorSalesSummary {
  // Fuel Metrics
  totalFuelLitres: number;
  totalFuelSales: number;
  fuelBreakdown: {
    superLitres: number;
    superSales: number;
    dieselLitres: number;
    dieselSales: number;
    ron95Litres: number;
    ron95Sales: number;
  };

  // Stock Account Dip & Totalizer Comparison Breakdown (PMS, AGO, RON 95)
  stockBreakdown?: Record<
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
  >;

  // Lubricants Metrics (Supervisor Exclusive)
  totalLubeUnitsSold: number;
  totalLubeSales: number;

  // Gross Sales
  grossSales: number; // totalFuelSales + totalLubeSales

  // Master Deductions Breakdown
  deductionsBreakdown: Record<
    SupervisorDeductionType,
    { total: number; count: number; approvedTotal: number; unapprovedTotal: number }
  >;
  totalDeductions: number;
  unapprovedDeductionsCount: number;
  unapprovedDeductionsTotal: number;

  // Category Legacy / Direct drawings
  categoryA_approvedCredit: number; // Approved Credit Sales
  categoryB_evalues: number;        // E-Values (MoMo, POS, Bank, QR, StarCard)
  categoryC_creditCollections: number; // Credit Collections from Debtors
  categoryD_expenses: number;       // Generator & Operational Expenses
  totalVouchers: number;            // Vouchers & Claims
  totalDrawings: number;            // Total deductions / drawings

  // Cash Reconciliation
  expectedCashToBank: number;       // grossSales + categoryC - totalDeductions
  actualCashCounted: number;        // Sum of Physical Notes & Coins
  netVariance: number;              // actualCashCounted - expectedCashToBank
  status: 'accounted' | 'shortage' | 'excess' | 'pending';
  hasDiscrepancy: boolean;
  accountState: 'open' | 'closed';
  isMultiDay: boolean;
  daysOpenCount: number;
}

/* ========================================================================= */
/* ATTENDANT ACCOUNTABILITY STRUCTURE & TIME-BASED PUMP ASSIGNMENT TYPES     */
/* ========================================================================= */

export interface AttendantMeterReading {
  id: string;
  pumpName: string;         // e.g. "Super 1", "Diesel 2"
  fuelType: 'super' | 'diesel' | 'ron95';
  timeSlot?: string;        // e.g. "06:00 – 10:00"
  openingMeter: number;
  closingMeter: number;
  rtt: number;              // Returned testing / calibration litres
  unitPrice: number;
  litresSold?: number;
  totalSales?: number;
}

export interface AttendantPaymentBreakdown {
  cash: number;
  visa: number;
  momo: number;
  bank: number;
  credit: number;
  other: number;
}

export interface AttendantDeduction {
  id: string;
  category: string;         // e.g. "Operational Expense", "Genset Fuel", "Water Bill", "Claim Code", "Voucher"
  amount: number;
  reason: string;
  voucherRef?: string;
  approved: boolean;
}

export interface AttendantEvalueEntry {
  id: string;
  channel: 'MoMo' | 'POS Card' | 'Bank Transfer' | 'QR Pay' | 'Tingg' | 'Hubtel' | 'StarCard' | 'Other';
  provider?: string;        // MTN, Telecel, AT Money, Stanbic, Ecobank, GCB, etc.
  reference: string;        // Transaction ID / Reference Code / Approval Code
  customerInfo?: string;    // Phone number, customer name, or vehicle reg
  amount: number;
  time?: string;
  verified?: boolean;
}

export interface AttendantVoucherClaim {
  id: string;
  type: 'claim_code' | 'corporate_voucher' | 'fleet_coupon' | 'gov_voucher';
  claimCode?: string;       // e.g. "STC-98214"
  voucherNumber: string;    // e.g. "VCH-004821"
  companyName: string;      // e.g. "VIP Transport", "Ghana Police Service", "State Housing"
  vehicleReg?: string;      // e.g. "GN-4819-24"
  product: 'super' | 'diesel' | 'ron95';
  litres: number;
  amount: number;
  verified: boolean;
  driverName?: string;
}

export interface AttendantCreditSale {
  id: string;
  customer: string;
  invoiceRef: string;
  vehicleReg?: string;
  amount: number;
  product?: string;
  approvedBy?: string;
}

export interface AttendantCreditCollection {
  id: string;
  customer: string;
  receiptRef: string;
  amount: number;
  notes?: string;
}

export interface CashDenominationBreakdown {
  notes: {
    200: number;
    100: number;
    50: number;
    20: number;
    10: number;
    5: number;
    2: number;
    1: number;
  };
  coins: {
    2.00: number;
    1.00: number;
    0.50: number;
    0.20: number;
    0.10: number;
  };
  totalCash: number;
  notesTotal?: number;
  coinsTotal?: number;
}

export interface SupervisorAccountClosureChecklist {
  litresAndMetersVerified: boolean;
  evaluesConfirmed: boolean;
  vouchersAndClaimsCollected: boolean;
  otherTransactionsAudited: boolean;
  cashDenominationsCounted: boolean;
  attendantAcknowledged: boolean;
}

export interface PumpTimeSlotAssignment {
  id: string;
  pumpName: string;         // e.g. "Pump 1 (Super)"
  fuelType: 'super' | 'diesel' | 'ron95';
  startTime: string;        // e.g. "06:00"
  endTime: string;          // e.g. "10:00"
  attendantId: string;
  attendantName: string;
  staffId?: string;
  openingMeter: number;
  closingMeter: number;
  rtt: number;
}

export interface AttendantDailyLog {
  id: string;
  date: string;          // e.g. "2026-08-16" (Saturday)
  dayName: string;       // e.g. "Saturday"
  shiftPeriod: string;   // e.g. "Day" or "Night"
  meterReadings: AttendantMeterReading[];
  payments: AttendantPaymentBreakdown;
  expenses: AttendantDeduction[];
  evalues?: AttendantEvalueEntry[];
  voucherClaims?: AttendantVoucherClaim[];
  creditSales?: AttendantCreditSale[];
  creditCollections?: AttendantCreditCollection[];
  cashDenominations?: CashDenominationBreakdown;
  interimCashCounted?: number;
  notes?: string;
}

export interface AttendantAccountabilityRecord {
  id: string;
  attendantName: string;
  staffId: string;
  phone?: string;
  shiftType: string;        // e.g. "Shift A — Day"
  date: string;             // Current date or start date
  station: string;
  assignedPumps: string[];  // e.g. ["Super 1", "Super 2"]
  pumpTimeSlots?: PumpTimeSlotAssignment[];
  meterReadings: AttendantMeterReading[];
  payments: AttendantPaymentBreakdown;
  expenses: AttendantDeduction[];
  evalues?: AttendantEvalueEntry[];
  voucherClaims?: AttendantVoucherClaim[];
  creditSales?: AttendantCreditSale[];
  creditCollections?: AttendantCreditCollection[];
  cashDenominations?: CashDenominationBreakdown;
  actualCashCounted: number;
  reviewedBySupervisor?: boolean;
  status: 'accounted' | 'shortage' | 'excess' | 'pending';
  supervisorNotes?: string;
  supervisorChecklist?: SupervisorAccountClosureChecklist;
  managerAuthorizedException?: boolean;
  managerAuthorizationNotes?: string;
  managerName?: string;
  createdAt: string;
  updatedAt: string;

  // Multi-day open account properties
  accountState?: 'open' | 'closed'; // 'open' allows account to remain open across multiple days until supervisor closes it
  startDate?: string;               // e.g. "2026-08-16" (Saturday)
  endDate?: string;                 // e.g. "2026-08-18" (Monday) or undefined while still open
  isMultiDay?: boolean;             // Flag indicating account has spanned > 1 day
  daysOpen?: number;                // Calculated or explicit count of days open (e.g. 3)
  dayLogs?: AttendantDailyLog[];     // Breakdown of meter readings & collections per day (Saturday, Sunday, Monday...)
  closedAt?: string;                // Timestamp when supervisor actually closed the account
  closedBySupervisor?: string;      // Supervisor name who completed the accounting
  closedNotes?: string;             // Final closing notes
}



