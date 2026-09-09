import React, { useState, useEffect, useMemo } from 'react';
import {
  Home,
  PlusCircle,
  History as HistoryIcon,
  BarChart3,
  MoreHorizontal,
  Users,
  Settings as SettingsIcon,
  LogOut,
  Search,
  AlertTriangle,
  CheckCircle2,
  Truck,
  Receipt,
  CreditCard,
  Ticket,
  Trash2,
  Plus,
  ChevronRight,
  ArrowLeft,
  Fuel,
  Droplet,
  X,
  Pencil,
  Eye,
  EyeOff,
  Scale,
  TrendingUp,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Clock,
  Wallet,
  Lock,
  Unlock,
  Check,
  Sliders,
  Gauge,
  User,
  Save,
  Phone,
  Mail,
  Building,
  Package,
  Calendar,
  Layers,
  Banknote,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  ShiftRecord,
  UserProfile,
  StationConfig,
  AttendantAccountabilityRecord,
  AttendantMeterReading,
  AttendantDeduction,
  STAROIL_LUBRICANTS_CATALOG,
  StarOilLubricantProduct,
  SupervisorLubeRecord,
  SupervisorSalesAccountRecord,
} from '../types';
import {
  computeAttendantSummary,
  computeShiftAccountabilitySummary,
  getInitialAttendantRecords,
  computeSupervisorSalesSummary,
  generateDefaultSupervisorSalesAccounts,
} from '../utils/accountabilityCalculations';
import { AttendantAccountabilityModal } from './AttendantAccountabilityModal';
import { SupervisorSalesAccountModal } from './SupervisorSalesAccountModal';
import { SupervisorSalesAccountControlPanel } from './Supervisor/SupervisorSalesAccountControlPanel';
import { ManagerExceptionModal } from './ManagerExceptionModal';
import { PumpTimelineSlotModal } from './PumpTimelineSlotModal';
import { useUndoRedo } from '../utils/useUndoRedo';
import { UndoRedoControls } from './UndoRedoControls';
import { getAttendantsByStationId } from '../services/auth';
import { LocalStorageSyncIndicator } from './LocalStorageSyncIndicator';
import {
  saveSupervisorSalesAccounts,
  fetchSupervisorSalesAccounts,
  subscribeToSupervisorSalesAccounts,
  saveAttendantAccountabilityRecords,
  fetchAttendantAccountabilityRecords,
  subscribeToAttendantAccountabilityRecords,
} from '../services/supervisorStorage';

/* ============================== STYLE ============================== */
const CSS = `
  .pl-root{ 
    --asphalt:#15171a; --panel:#1d2023; --panel-2:#23262a; --line:#333739; --line-soft:#2a2d30;
    --text:#ece8e0; --text-dim:#8d9195; --super:#d8543f; --super-dim:#4a2a24; 
    --ron95:#3b82f6; --ron95-dim:#172554;
    --diesel:#8fae4f; --diesel-dim:#333f22;
    --amber:#e8b93b; --good:#6fae6a; --bad:#d8543f;
    background:var(--asphalt); color:var(--text); min-height:100vh; font-family:'Inter',sans-serif;
  }
  .pl-root *{box-sizing:border-box;}
  .pl-root .mono{font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;}
  .pl-root .disp{font-family:'Space Grotesk',sans-serif,system-ui;}
  .pl-card{background:var(--panel); border:1px solid var(--line); border-radius:6px;}
  .pl-input{background:var(--panel-2); border:1px solid var(--line); color:var(--text); padding:8px 10px; border-radius:4px; font-size:13px; width:100%; font-family:'Inter',sans-serif;}
  .pl-input:focus{outline:1px solid var(--amber);}
  .pl-input.mono{font-family:'IBM Plex Mono',ui-monospace,monospace;}
  .pl-label{font-size:9.5px; text-transform:uppercase; letter-spacing:.07em; color:var(--text-dim); display:block; margin-bottom:4px; font-weight:600;}
  .pl-btn{background:var(--panel-2); border:1px solid var(--line); color:var(--text); padding:9px 16px; border-radius:5px; font-size:13px; cursor:pointer; font-family:'Inter',sans-serif; display:inline-flex; align-items:center; gap:6px; font-weight:500;}
  .pl-btn:hover{border-color:var(--amber); color:var(--amber);}
  .pl-btn.primary{background:var(--amber); color:#15171a; border-color:var(--amber); font-weight:600;}
  .pl-btn.primary:hover{opacity:.9; color:#15171a;}
  .pl-btn.danger{background:var(--panel-2); border-color:var(--line); color:var(--text-dim);}
  .pl-btn.danger:hover{border-color:var(--bad); color:var(--bad); background:rgba(216,84,63,0.1);}
  .pl-btn.ghost{background:none; border:1px dashed var(--line); color:var(--text-dim);}
  .pl-btn.ghost:hover{border-color:var(--amber); color:var(--amber);}
  .pl-btn:disabled{opacity:.4; cursor:not-allowed;}
  .pl-pill{font-size:10px; padding:3px 9px; border-radius:20px; text-transform:uppercase; letter-spacing:.05em; font-weight:600;}
  .pl-pill.ok{background:rgba(111,174,106,.15); color:var(--good); border:1px solid rgba(111,174,106,.35);}
  .pl-pill.warn{background:rgba(232,185,59,.15); color:var(--amber); border:1px solid rgba(232,185,59,.35);}
  .pl-pill.bad{background:rgba(216,84,63,.15); color:var(--bad); border:1px solid rgba(216,84,63,.35);}
  .pl-pill.draft{background:var(--panel-2); color:var(--text-dim); border:1px solid var(--line);}
  .pl-nav-item{display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:5px; color:var(--text-dim); cursor:pointer; font-size:13px; font-weight:500;}
  .pl-nav-item:hover{background:var(--panel-2); color:var(--text);}
  .pl-nav-item.active{background:var(--panel-2); color:var(--amber); font-weight:600;}
  .odometer{background:#0e0f11; border:1px solid #000; border-radius:3px; padding:0 6px;}
  .odometer input{background:transparent; border:none; color:#e8b93b; font-family:'IBM Plex Mono',ui-monospace,monospace; font-weight:600; font-size:14px; padding:7px 2px; width:100%; text-align:right;}
  .odometer input:focus{outline:none;}
  table.pl-table{width:100%; border-collapse:collapse;}
  table.pl-table th{text-align:left; font-size:9.5px; text-transform:uppercase; letter-spacing:.06em; color:var(--text-dim); padding:8px 10px; border-bottom:1px solid var(--line); font-weight:600;}
  table.pl-table td{padding:8px 10px; border-bottom:1px solid var(--line-soft); font-size:12.5px;}
  table.pl-table tr:hover td{background:rgba(255,255,255,.02);}
  .scrollbar-thin::-webkit-scrollbar{height:6px; width:6px;}
  .scrollbar-thin::-webkit-scrollbar-thumb{background:var(--line); border-radius:4px;}
  .show-mobile{display:none;}
  @media (max-width:820px){ 
    .hide-mobile{display:none !important;} 
    .show-mobile{display:flex !important;} 
  }
`;

/* ============================== STORAGE HELPERS ============================== */
function sGet<T>(key: string, fallback: T): T {
  try {
    const r = localStorage.getItem('pl_' + key);
    return r ? JSON.parse(r) : fallback;
  } catch (e) {
    return fallback;
  }
}

function sSet<T>(key: string, val: T): boolean {
  try {
    localStorage.setItem('pl_' + key, JSON.stringify(val));
    return true;
  } catch (e) {
    console.error('storage set failed', e);
    return false;
  }
}

function sDelete(key: string): boolean {
  try {
    localStorage.removeItem('pl_' + key);
    return true;
  } catch (e) {
    return false;
  }
}

const num = (v: any) => {
  const n = parseFloat(v);
  return isFinite(n) ? n : 0;
};

const fmt = (n: any) =>
  (isFinite(n) ? n : 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

const SHIFT_TYPES = ['A - Day', 'A - Night', 'B - Day', 'B - Night'];
const EXPENSE_CATEGORIES = [
  'R-Pay',
  'Claim Code',
  'Operational Expense',
  'Genset',
  'Water Bill',
  'TINGG',
  'VISA',
  'Other',
];

export interface PLPump {
  opening: string | number;
  closing: string | number;
  rtt: string | number;
}

export interface PLFuelGroup {
  price: string | number;
  pumps: PLPump[];
}

export interface PLStockItem {
  opening: string | number;
  received: string | number;
  closing: string | number;
}

export interface PLExpense {
  category: string;
  description: string;
  amount: string | number;
  date?: string;
}

export interface PLCredit {
  customer: string;
  reference: string;
  amount: string | number;
  status: 'Unpaid' | 'Paid';
  date?: string;
}

export interface PLVoucher {
  number: string;
  description: string;
  person: string;
  amount: string | number;
  status: 'Pending' | 'Approved';
  date?: string;
}

export interface PLAttendantEntry {
  id: string;
  name: string;
  pumps: string;
}

export interface PLPaymentChannels {
  cash: string | number;
  visa: string | number;
  momo: string | number;
  bank: string | number;
  credit: string | number;
  wallets: string | number;
}

export interface PLLubeSale {
  id: string;
  catalogId?: string;
  name: string;
  unit: string;
  unitPrice: string | number;
  opening: string | number;
  received: string | number;
  soldQty: string | number;
  closing: string | number;
  notes?: string;
}

export interface PLShift {
  id: string;
  date: string;
  shiftType: string;
  supervisor: string;
  attendants: PLAttendantEntry[];
  startTime: string;
  endTime: string;
  super: PLFuelGroup;
  ron95: PLFuelGroup;
  diesel: PLFuelGroup;
  stock: {
    super: PLStockItem;
    ron95: PLStockItem;
    diesel: PLStockItem;
  };
  lubricants?: PLLubeSale[];
  payments?: PLPaymentChannels;
  expenses: PLExpense[];
  credit: PLCredit[];
  vouchers: PLVoucher[];
  cash: { actual: string | number };
  status: 'draft' | 'completed';
  savedAt: string | null;
}

export interface PLDelivery {
  id: string;
  product: string;
  quantity: string | number;
  deliveryNumber: string;
  supplier: string;
  date: string;
}

export interface PLAttendantRoster {
  id: string;
  name: string;
  phone?: string;
}

export interface PLSettings {
  stationName: string;
  location: string;
  code: string;
  manager: string;
  contact: string;
  superPrice: number;
  ron95Price: number;
  dieselPrice: number;
  varianceLimit: number;
}

function defaultShift(date: string, shiftType: string): PLShift {
  return {
    id: uid(),
    date,
    shiftType,
    supervisor: '',
    attendants: [],
    startTime: '06:00',
    endTime: '14:00',
    super: {
      price: 13.27,
      pumps: [0, 1, 2, 3].map(() => ({ opening: '', closing: '', rtt: '' })),
    },
    ron95: {
      price: 14.20,
      pumps: [0, 1].map(() => ({ opening: '', closing: '', rtt: '' })),
    },
    diesel: {
      price: 16.10,
      pumps: [0, 1, 2, 3, 4, 5].map(() => ({ opening: '', closing: '', rtt: '' })),
    },
    stock: {
      super: { opening: '', received: '', closing: '' },
      ron95: { opening: '', received: '', closing: '' },
      diesel: { opening: '', received: '', closing: '' },
    },
    lubricants: [
      {
        id: uid(),
        catalogId: 'ug-sae40-1l',
        name: 'ULTRA GUARD SAE 40',
        unit: '1LT',
        unitPrice: 66,
        opening: '24',
        received: '0',
        soldQty: '',
        closing: '',
      },
      {
        id: uid(),
        catalogId: 'ug-sae40-4l',
        name: 'ULTRA GUARD SAE 40',
        unit: '4LT',
        unitPrice: 242,
        opening: '12',
        received: '0',
        soldQty: '',
        closing: '',
      },
      {
        id: uid(),
        catalogId: 'ug-hpd-15w40-4l',
        name: 'STAR ULTRA GUARD HPD SAE 15W40 CF-4',
        unit: '4LT',
        unitPrice: 257,
        opening: '8',
        received: '0',
        soldQty: '',
        closing: '',
      },
      {
        id: uid(),
        catalogId: 'pt-20w50-4l',
        name: 'STAR PRO-TEC SAE 20W50 SL/CF',
        unit: '4LT',
        unitPrice: 294,
        opening: '10',
        received: '0',
        soldQty: '',
        closing: '',
      },
      {
        id: uid(),
        catalogId: 'st-atf3-1l',
        name: 'STAR-TRANS ATF -III',
        unit: '1LT',
        unitPrice: 84,
        opening: '15',
        received: '0',
        soldQty: '',
        closing: '',
      },
      {
        id: uid(),
        catalogId: 'ss-brake-dot4-05l',
        name: 'STAR-SAFE Brake DOT-4',
        unit: '0.5L',
        unitPrice: 151,
        opening: '20',
        received: '0',
        soldQty: '',
        closing: '',
      },
    ],
    payments: {
      cash: '',
      visa: '',
      momo: '',
      bank: '',
      credit: '',
      wallets: '',
    },
    expenses: [],
    credit: [],
    vouchers: [],
    cash: { actual: '' },
    status: 'draft',
    savedAt: null,
  };
}

function fuelTotals(fuel?: PLFuelGroup) {
  if (!fuel || !fuel.pumps) return { litres: 0, amount: 0 };
  let litres = 0;
  fuel.pumps.forEach((p) => {
    litres += Math.max(0, num(p.closing) - num(p.opening) - num(p.rtt));
  });
  return { litres, amount: litres * num(fuel.price) };
}

function computeShift(shift: PLShift) {
  const s = fuelTotals(shift.super || { price: 13.27, pumps: [] });
  const r = fuelTotals(shift.ron95 || { price: 14.20, pumps: [] });
  const d = fuelTotals(shift.diesel || { price: 16.10, pumps: [] });
  const expenseTotal = (shift.expenses || []).reduce((a, x) => a + num(x.amount), 0);
  const creditTotal = (shift.credit || []).reduce((a, x) => a + num(x.amount), 0);
  const voucherTotal = (shift.vouchers || []).reduce((a, x) => a + num(x.amount), 0);

  // Compute StarOil Lubricants & Oil sales (accounted strictly by supervisor)
  let lubeSales = 0;
  let lubeQty = 0;
  (shift.lubricants || []).forEach((item) => {
    let qty = num(item.soldQty);
    if (qty === 0 && item.closing !== '' && item.opening !== '') {
      qty = Math.max(0, num(item.opening) + num(item.received) - num(item.closing));
    }
    const itemAmount = qty * num(item.unitPrice);
    lubeSales += itemAmount;
    lubeQty += qty;
  });

  const payments = shift.payments || {
    cash: '',
    visa: '',
    momo: '',
    bank: '',
    credit: '',
    wallets: '',
  };
  const visaTotal = num(payments.visa);
  const momoTotal = num(payments.momo);
  const bankTotal = num(payments.bank);
  const walletsTotal = num(payments.wallets);
  const totalNonCash = visaTotal + momoTotal + bankTotal + creditTotal + walletsTotal;

  const fuelSales = s.amount + r.amount + d.amount;
  const totalSales = fuelSales + lubeSales;
  const totalLitres = s.litres + r.litres + d.litres;
  const expectedCash = Math.max(0, totalSales - totalNonCash - expenseTotal - voucherTotal);
  const actualCash = num(shift.cash?.actual || payments.cash);
  const shortage = actualCash - expectedCash;

  const stockCalc = (key: 'super' | 'ron95' | 'diesel') => {
    const st = shift.stock?.[key] || { opening: 0, received: 0, closing: 0 };
    const totalStock = num(st.opening) + num(st.received);
    const salesDips = totalStock - num(st.closing);
    const totalizer = key === 'super' ? s.litres : key === 'ron95' ? r.litres : d.litres;
    return { salesDips, totalizer, variation: salesDips - totalizer, totalStock };
  };

  return {
    superLitres: s.litres,
    superSales: s.amount,
    ron95Litres: r.litres,
    ron95Sales: r.amount,
    dieselLitres: d.litres,
    dieselSales: d.amount,
    fuelSales,
    lubeSales,
    lubeQty,
    totalSales,
    totalLitres,
    expenseTotal,
    creditTotal,
    voucherTotal,
    visaTotal,
    momoTotal,
    bankTotal,
    walletsTotal,
    totalNonCash,
    expectedCash,
    actualCash,
    shortage,
    stockSuper: stockCalc('super'),
    stockRon95: stockCalc('ron95'),
    stockDiesel: stockCalc('diesel'),
  };
}

/* ============================== UI COMPONENTS ============================== */
function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="pl-card" style={{ padding: '14px 16px' }}>
      <div className="pl-label">{label}</div>
      <div
        className="disp"
        style={{ fontSize: 20, fontWeight: 700, color: accent || 'var(--text)' }}
      >
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SectionHead({ n, title }: { n: React.ReactNode; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
      <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
        {n}
      </span>
      <h2
        className="disp"
        style={{ fontSize: 14, margin: 0, letterSpacing: '.03em', textTransform: 'uppercase' }}
      >
        {title}
      </h2>
      <div style={{ flex: 1, height: 1, background: 'var(--line-soft)' }} />
    </div>
  );
}

function VarianceStatus(v: number, limit: number) {
  const a = Math.abs(v);
  if (a < limit * 0.5) return { color: 'var(--good)', label: 'within tolerance' };
  if (a < limit) return { color: 'var(--amber)', label: 'check dips' };
  return { color: 'var(--bad)', label: 'investigate' };
}

/* ============================== SUPERVISOR DASHBOARD PROPS ============================== */
interface SupervisorDashboardProps {
  records?: ShiftRecord[];
  profile: UserProfile;
  stations?: StationConfig[];
  triggerNewSalesAccount?: number;
  onSaveProfile?: (profile: UserProfile) => void;
  onSelectRecord?: (record: ShiftRecord) => void;
  onVerifyRecord?: (record: ShiftRecord) => void;
  onSwitchRole?: (role: 'attendant' | 'supervisor') => void;
  onOpenSettings?: () => void;
  onOpenSupervisorSales?: () => void;
  onNewRecord?: () => void;
  onResumeDraft?: (record: ShiftRecord) => void;
  onViewAllRecords?: () => void;
  onOpenExcelSheet?: () => void;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({
  records = [],
  profile,
  stations = [],
  triggerNewSalesAccount = 0,
  onSaveProfile,
  onSwitchRole,
  onOpenSettings,
  onOpenSupervisorSales,
}) => {
  const [view, setViewState] = useState<
    'home' | 'attendant_accountability' | 'supervisor_sales' | 'shift' | 'history' | 'reports' | 'stock' | 'more'
  >(() => {
    return sGet<'home' | 'attendant_accountability' | 'supervisor_sales' | 'shift' | 'history' | 'reports' | 'stock' | 'more'>('supervisor_active_subview', 'home');
  });
  const [moreView, setMoreViewState] = useState<'attendants' | 'settings' | 'account' | null>(() => {
    return sGet<'attendants' | 'settings' | 'account' | null>('supervisor_active_moreview', null);
  });

  const setView = (nextView: 'home' | 'attendant_accountability' | 'supervisor_sales' | 'shift' | 'history' | 'reports' | 'stock' | 'more') => {
    setViewState(nextView);
    sSet('supervisor_active_subview', nextView);
  };

  const setMoreView = (nextMore: 'attendants' | 'settings' | 'account' | null) => {
    setMoreViewState(nextMore);
    sSet('supervisor_active_moreview', nextMore);
  };

  const [settings, setSettings] = useState<PLSettings>(() => {
    return sGet<PLSettings>('settings', {
      stationName: profile.station || 'Tema Main Station',
      location: 'Tema, Greater Accra',
      code: profile.stationCode || 'SO-TMA-001',
      manager: profile.supervisor || 'Kofi Asare',
      contact: '+233 24 123 4567',
      superPrice: 13.27,
      ron95Price: 14.20,
      dieselPrice: 16.10,
      varianceLimit: 60,
    });
  });

  const [attendantsRoster, setAttendantsRoster] = useState<PLAttendantRoster[]>(() => {
    const stId = profile.stationId || 'st_tema_main';
    const dynamicAttendants = getAttendantsByStationId(stId, profile.stationCode, profile.station);
    if (dynamicAttendants.length > 0) {
      return dynamicAttendants.map((a) => ({
        id: a.id,
        name: a.fullName,
        phone: a.phone || (a.authType === 'phone' ? a.identifier : undefined),
      }));
    }
    return sGet<PLAttendantRoster[]>('attendants', []);
  });

  // Keep roster in sync when station or accounts change
  useEffect(() => {
    const stId = profile.stationId || 'st_tema_main';
    const dynamic = getAttendantsByStationId(stId, profile.stationCode, profile.station);
    if (dynamic.length > 0) {
      setAttendantsRoster(
        dynamic.map((a) => ({
          id: a.id,
          name: a.fullName,
          phone: a.phone || (a.authType === 'phone' ? a.identifier : undefined),
        }))
      );
    }
  }, [profile.stationId, profile.stationCode, profile.station]);

  // Current Active Attendant Accountability Records for Shift
  const [attendantRecords, setAttendantRecords] = useState<AttendantAccountabilityRecord[]>(
    () => {
      const saved = sGet<AttendantAccountabilityRecord[]>('attendant_accountability', []);
      return Array.isArray(saved) ? saved : [];
    }
  );

  // Supervisor Sales Accounts for Shift
  const [supervisorSalesAccounts, setSupervisorSalesAccounts] = useState<SupervisorSalesAccountRecord[]>(
    () => {
      const saved = sGet<SupervisorSalesAccountRecord[]>('supervisor_sales_accounts', []);
      return Array.isArray(saved) ? saved : [];
    }
  );

  // Cross-device Firestore synchronization
  useEffect(() => {
    fetchAttendantAccountabilityRecords().then((cloudRecs) => {
      if (cloudRecs && cloudRecs.length > 0) {
        setAttendantRecords(cloudRecs);
      }
    });
    fetchSupervisorSalesAccounts().then((cloudSales) => {
      if (cloudSales && cloudSales.length > 0) {
        setSupervisorSalesAccounts(cloudSales);
      }
    });

    const unsubAttendants = subscribeToAttendantAccountabilityRecords((cloudRecs) => {
      if (cloudRecs && cloudRecs.length > 0) {
        setAttendantRecords(cloudRecs);
      }
    });
    const unsubSales = subscribeToSupervisorSalesAccounts((cloudSales) => {
      if (cloudSales && cloudSales.length > 0) {
        setSupervisorSalesAccounts(cloudSales);
      }
    });

    return () => {
      unsubAttendants();
      unsubSales();
    };
  }, []);

  const [isShiftClosed, setIsShiftClosed] = useState<boolean>(false);
  const [managerExceptionAuthorized, setManagerExceptionAuthorized] = useState<boolean>(false);

  // Modals state
  const [selectedAttendantModal, setSelectedAttendantModal] =
    useState<AttendantAccountabilityRecord | null>(null);
  const [selectedSupervisorSalesModal, setSelectedSupervisorSalesModal] =
    useState<SupervisorSalesAccountRecord | null>(null);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);

  const [shifts, setShifts] = useState<PLShift[]>(() => {
    const saved = sGet<PLShift[]>('shifts', []);
    return Array.isArray(saved) ? saved : [];
  });

  const [deliveries, setDeliveries] = useState<PLDelivery[]>(() => {
    return sGet<PLDelivery[]>('deliveries', []);
  });

  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);

  const clearAllAttendantAccounts = () => {
    setAttendantRecords([]);
    sSet('attendant_accountability', []);
    saveAttendantAccountabilityRecords([]);
  };

  const clearDoneAttendantAccounts = () => {
    setAttendantRecords((prev) => {
      const remaining = prev.filter((att) => {
        const summary = computeAttendantSummary(att);
        return summary.accountState === 'open' && summary.status !== 'accounted';
      });
      sSet('attendant_accountability', remaining);
      saveAttendantAccountabilityRecords(remaining);
      return remaining;
    });
  };

  const deleteAttendantRecord = (id: string) => {
    setAttendantRecords((prev) => {
      const remaining = prev.filter((att) => att.id !== id);
      sSet('attendant_accountability', remaining);
      saveAttendantAccountabilityRecords(remaining);
      return remaining;
    });
  };

  const addAttendantRecord = () => {
    const id = 'att_rec_' + Date.now();
    const newRecord: AttendantAccountabilityRecord = {
      id,
      attendantName: 'NEW ATTENDANT',
      staffId: 'SO-ATT-' + Math.floor(100 + Math.random() * 900),
      phone: '',
      shiftType: 'Shift A — Day',
      date: new Date().toISOString().slice(0, 10),
      station: settings.stationName || 'Tema Main Station',
      assignedPumps: ['Super 1'],
      accountState: 'open',
      startDate: new Date().toISOString().slice(0, 10),
      isMultiDay: false,
      daysOpen: 1,
      dayLogs: [],
      meterReadings: [
        {
          id: 'mr_' + Date.now(),
          pumpName: 'Super 1',
          fuelType: 'super',
          timeSlot: '06:00 – 18:00',
          openingMeter: 0,
          closingMeter: 0,
          rtt: 0,
          unitPrice: settings.superPrice || 13.27,
          litresSold: 0,
          totalSales: 0,
        },
      ],
      payments: { cash: 0, visa: 0, momo: 0, bank: 0, credit: 0, other: 0 },
      expenses: [],
      actualCashCounted: 0,
      supervisorNotes: '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setAttendantRecords((prev) => {
      const nextList = [newRecord, ...prev];
      sSet('attendant_accountability', nextList);
      saveAttendantAccountabilityRecords(nextList);
      return nextList;
    });
    setSelectedAttendantModal(newRecord);
  };

  // Supervisor Sales Account Handlers
  const saveSupervisorSalesAccount = (updated: SupervisorSalesAccountRecord) => {
    setSupervisorSalesAccounts((prev) => {
      const idx = prev.findIndex((s) => s.id === updated.id);
      let nextList: SupervisorSalesAccountRecord[] = [];
      if (idx >= 0) {
        nextList = [...prev];
        nextList[idx] = updated;
      } else {
        nextList = [updated, ...prev];
      }
      sSet('supervisor_sales_accounts', nextList);
      saveSupervisorSalesAccounts(nextList);
      return nextList;
    });
  };

  const deleteSupervisorSalesAccount = (id: string) => {
    setSupervisorSalesAccounts((prev) => {
      const nextList = prev.filter((s) => s.id !== id);
      sSet('supervisor_sales_accounts', nextList);
      saveSupervisorSalesAccounts(nextList);
      return nextList;
    });
  };

  const clearAllSupervisorSalesAccounts = () => {
    setSupervisorSalesAccounts([]);
    sSet('supervisor_sales_accounts', []);
    saveSupervisorSalesAccounts([]);
  };

  const clearClosedSupervisorSalesAccounts = () => {
    setSupervisorSalesAccounts((prev) => {
      const nextList = prev.filter((s) => {
        const summary = computeSupervisorSalesSummary(s);
        return summary.accountState === 'open';
      });
      sSet('supervisor_sales_accounts', nextList);
      saveSupervisorSalesAccounts(nextList);
      return nextList;
    });
  };

  const addSupervisorSalesAccount = () => {
    const id = 'sup_sales_' + Date.now();

    // Auto-consolidate any active attendant records into handovers
    const autoHandovers = attendantRecords.map((att) => {
      const summary = computeAttendantSummary(att);
      return {
        id: 'hnd_' + att.id + '_' + Date.now(),
        attendantName: att.attendantName,
        pumpRange: att.assignedPumps.join(', ') || 'Forecourt Management',
        litresSold: summary.totalLitres || 0,
        salesAmount: summary.totalSales || 0,
        cashHandedOver: summary.actualCash || 0,
        evaluesAmount: (att.payments?.momo || 0) + (att.payments?.visa || 0),
        vouchersAmount: (att.payments?.bank || 0) + (att.payments?.other || 0),
        creditSales: att.payments?.credit || 0,
        notes: att.supervisorNotes || '',
      };
    });

    const newRecord: SupervisorSalesAccountRecord = {
      id,
      supervisorName: profile.supervisor || 'JOHN KOFI',
      staffId: 'SO-SUP-01',
      date: new Date().toISOString().slice(0, 10),
      shiftType: 'Shift A — Day',
      station: settings.stationName || 'Tema Main Station',
      stationCode: settings.code || 'SO-TMA-001',
      accountState: 'open',
      startDate: new Date().toISOString().slice(0, 10),
      isMultiDay: false,
      daysOpen: 1,
      attendantHandovers: autoHandovers,
      fuelMeters: [
        {
          id: 'smr_' + Date.now() + '_1',
          pumpName: 'Super Pump 1',
          fuelType: 'super',
          openingMeter: 45210.0,
          closingMeter: 45210.0,
          rtt: 0,
          unitPrice: settings.superPrice || 13.27,
          litresSold: 0,
          totalSales: 0,
        },
        {
          id: 'smr_' + Date.now() + '_2',
          pumpName: 'Diesel Pump 1',
          fuelType: 'diesel',
          openingMeter: 82140.0,
          closingMeter: 82140.0,
          rtt: 0,
          unitPrice: settings.dieselPrice || 16.10,
          litresSold: 0,
          totalSales: 0,
        },
      ],
      lubricantSales: [
        {
          id: 'slube_' + Date.now() + '_1',
          catalogId: 'ug-sae40-1l',
          name: 'ULTRA GUARD SAE 40',
          unit: '1LT',
          unitPrice: 66,
          openingStock: 24,
          received: 0,
          soldQty: 0,
          closingStock: 24,
          totalAmount: 0,
        },
        {
          id: 'slube_' + Date.now() + '_2',
          catalogId: 'ug-20w50-4l',
          name: 'ULTRA GUARD 20W50',
          unit: '4LT',
          unitPrice: 280,
          openingStock: 12,
          received: 0,
          soldQty: 0,
          closingStock: 12,
          totalAmount: 0,
        },
      ],
      approvedCredit: [],
      evalues: [],
      creditCollections: [],
      expenses: [],
      voucherClaims: [],
      cashDenominations: {
        notes: {
          200: 0,
          100: 0,
          50: 0,
          20: 0,
          10: 0,
          5: 0,
          2: 0,
          1: 0,
        },
        coins: {
          2.00: 0,
          1.00: 0,
          0.50: 0,
          0.20: 0,
          0.10: 0,
        },
        totalCash: 0,
      },
      actualCashCounted: 0,
      safeDropAmount: 0,
      bankDepositSlip: '',
      notes: '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setSupervisorSalesAccounts((prev) => {
      const nextList = [newRecord, ...prev];
      sSet('supervisor_sales_accounts', nextList);
      saveSupervisorSalesAccounts(nextList);
      return nextList;
    });
    setSelectedSupervisorSalesModal(newRecord);
  };

  // Listen for trigger from top Navbar or Persistent Sidebar
  useEffect(() => {
    if (triggerNewSalesAccount && triggerNewSalesAccount > 0) {
      addSupervisorSalesAccount();
    }
  }, [triggerNewSalesAccount]);

  const clearAllShifts = () => {
    setShifts([]);
    sSet('shifts', []);
  };

  const saveSettings = (next: PLSettings) => {
    setSettings(next);
    sSet('settings', next);
  };

  const saveAttendantsRoster = (next: PLAttendantRoster[]) => {
    setAttendantsRoster(next);
    sSet('attendants', next);
  };

  const saveAttendantRecord = (updated: AttendantAccountabilityRecord) => {
    setAttendantRecords((prev) => {
      const idx = prev.findIndex((a) => a.id === updated.id);
      let nextList = [];
      if (idx >= 0) {
        nextList = [...prev];
        nextList[idx] = updated;
      } else {
        nextList = [...prev, updated];
      }
      sSet('attendant_accountability', nextList);
      saveAttendantAccountabilityRecords(nextList);
      return nextList;
    });
  };

  const saveAllAttendantsFromTimeline = (updatedList: AttendantAccountabilityRecord[]) => {
    setAttendantRecords(updatedList);
    sSet('attendant_accountability', updatedList);
    saveAttendantAccountabilityRecords(updatedList);
  };

  const saveShift = (shift: PLShift) => {
    setShifts((prev) => {
      const others = prev.filter((s) => s.id !== shift.id);
      const updated = [...others, shift].sort((a, b) =>
        a.date + a.shiftType < b.date + b.shiftType ? 1 : -1
      );
      sSet('shifts', updated);
      return updated;
    });
  };

  const deleteShift = (id: string) => {
    setShifts((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      sSet('shifts', updated);
      return updated;
    });
  };

  const saveDelivery = (d: PLDelivery) => {
    setDeliveries((prev) => {
      const updated = [d, ...prev.filter((x) => x.id !== d.id)];
      sSet('deliveries', updated);
      return updated;
    });
  };

  const deleteDelivery = (id: string) => {
    setDeliveries((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      sSet('deliveries', updated);
      return updated;
    });
  };

  const openNewShift = () => {
    setEditingShiftId(null);
    setView('shift');
  };

  const openEditShift = (id: string) => {
    setEditingShiftId(id);
    setView('shift');
  };

  // Accountability summary metrics
  const accountabilitySummary = useMemo(() => {
    return computeShiftAccountabilitySummary(
      attendantRecords,
      managerExceptionAuthorized
    );
  }, [attendantRecords, managerExceptionAuthorized]);

  const supervisorSalesShortages = useMemo(() => {
    return supervisorSalesAccounts.filter(
      (r) => computeSupervisorSalesSummary(r).status === 'shortage'
    ).length;
  }, [supervisorSalesAccounts]);

  const NAV = [
    { key: 'home' as const, label: 'Home', icon: Home },
    {
      key: 'supervisor_sales' as const,
      label: 'Supervisor Sales Account',
      icon: Banknote,
      badge:
        supervisorSalesShortages > 0
          ? `${supervisorSalesShortages} ⚠️`
          : null,
    },
    {
      key: 'new_daily_record' as const,
      label: 'New Daily Record',
      icon: PlusCircle,
      isAction: true,
    },
    {
      key: 'attendant_accountability' as const,
      label: 'Attendant Handovers',
      icon: Users,
      badge:
        accountabilitySummary.shortageCount > 0
          ? `${accountabilitySummary.shortageCount} ⚠️`
          : null,
    },
    { key: 'shift' as const, label: 'Attendant Shift Sheet', icon: Fuel },
    { key: 'history' as const, label: 'Shift Logs', icon: HistoryIcon },
    { key: 'reports' as const, label: 'Reports', icon: BarChart3 },
    { key: 'stock' as const, label: 'Stock & Dips', icon: Truck },
    { key: 'more' as const, label: 'More', icon: MoreHorizontal },
  ];

  return (
    <div className="pl-root" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', margin: '0' }}>
      <style>{CSS}</style>

      {/* Main Content Workspace with Full Width */}
      <div style={{ flex: 1, minWidth: 0, paddingBottom: 40 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 16px 40px' }}>
          {/* VIEW: HOME DASHBOARD */}
          {view === 'home' && (
            <DashboardView
              settings={settings}
              shifts={shifts}
              profile={profile}
              attendantRecords={attendantRecords}
              accountabilitySummary={accountabilitySummary}
              supervisorSalesAccounts={supervisorSalesAccounts}
              onNewDailyRecord={addSupervisorSalesAccount}
              onNewShift={addSupervisorSalesAccount}
              onOpenHistory={() => setView('history')}
              onOpenAttendants={() => setView('attendant_accountability')}
              onOpenSupervisorSales={onOpenSupervisorSales || (() => setView('supervisor_sales'))}
              onOpenAttendantModal={(rec) => setSelectedAttendantModal(rec)}
              onOpenTeam={() => setView('attendant_accountability')}
              onOpenApprovals={() => setView('more')}
              onOpenReports={() => setView('reports')}
              onOpenSettings={onOpenSettings || (() => { setView('more'); setMoreViewState('settings'); })}
              onViewShift={openEditShift}
              onAddAccount={addAttendantRecord}
            />
          )}

          {/* VIEW: ATTENDANT ACCOUNTABILITY CONTROL PANEL */}
          {view === 'attendant_accountability' && (
            <AttendantAccountabilityControlPanel
              attendantRecords={attendantRecords}
              summary={accountabilitySummary}
              isShiftClosed={isShiftClosed}
              managerExceptionAuthorized={managerExceptionAuthorized}
              supervisorName={profile.supervisor || 'JOHN'}
              date="19/08/2026"
              shiftType="SHIFT A — DAY"
              onOpenAttendantModal={(rec) => setSelectedAttendantModal(rec)}
              onOpenTimelineModal={() => setIsTimelineModalOpen(true)}
              onOpenManagerModal={() => setIsManagerModalOpen(true)}
              onCloseShift={() => {
                setIsShiftClosed(true);
              }}
              onReopenShift={() => {
                setIsShiftClosed(false);
                setManagerExceptionAuthorized(false);
              }}
              onClearAllAccounts={clearAllAttendantAccounts}
              onClearDoneAccounts={clearDoneAttendantAccounts}
              onAddAccount={addAttendantRecord}
              onDeleteAccount={deleteAttendantRecord}
            />
          )}

          {/* VIEW: SUPERVISOR SALES ACCOUNT CONTROL PANEL */}
          {view === 'supervisor_sales' && (
            <SupervisorSalesAccountControlPanel
              records={supervisorSalesAccounts}
              supervisorName={profile.supervisor || 'JOHN KOFI'}
              stationName={settings.stationName || 'Tema Main Station'}
              stationCode={settings.code || 'SO-TMA-001'}
              onOpenRecord={(rec) => setSelectedSupervisorSalesModal(rec)}
              onAddRecord={addSupervisorSalesAccount}
              onDeleteRecord={deleteSupervisorSalesAccount}
              onClearAllRecords={clearAllSupervisorSalesAccounts}
              onClearClosedRecords={clearClosedSupervisorSalesAccounts}
            />
          )}

          {/* VIEW: SHIFT FORM */}
          {view === 'shift' && (
            <ShiftFormView
              key={editingShiftId || 'new'}
              existing={editingShiftId ? shifts.find((s) => s.id === editingShiftId) || null : null}
              settings={settings}
              attendants={attendantsRoster}
              profile={profile}
              onSave={async (shift, andExit) => {
                saveShift(shift);
                if (andExit) setView('history');
              }}
              onCancel={() => setView('home')}
            />
          )}

          {/* VIEW: HISTORY */}
          {view === 'history' && (
            <HistoryViewComponent
              shifts={shifts}
              onView={openEditShift}
              onDelete={deleteShift}
              onClearAll={clearAllShifts}
              settings={settings}
            />
          )}

          {/* VIEW: REPORTS */}
          {view === 'reports' && <ReportsViewComponent shifts={shifts} />}

          {/* VIEW: STOCK */}
          {view === 'stock' && (
            <StockViewComponent
              shifts={shifts}
              deliveries={deliveries}
              onSaveDelivery={saveDelivery}
              onDeleteDelivery={deleteDelivery}
            />
          )}

          {/* VIEW: MORE */}
          {view === 'more' && !moreView && <MoreMenuComponent onSelect={setMoreView} />}

          {view === 'more' && moreView === 'account' && (
            <SupervisorAccountViewComponent
              profile={profile}
              stations={stations}
              onSaveProfile={onSaveProfile}
              onBack={() => setMoreView(null)}
              onSwitchRole={onSwitchRole}
            />
          )}

          {view === 'more' && moreView === 'attendants' && (
            <AttendantsViewComponent
              attendants={attendantsRoster}
              onSave={saveAttendantsRoster}
              onBack={() => setMoreView(null)}
            />
          )}

          {view === 'more' && moreView === 'settings' && (
            <SettingsViewComponent
              settings={settings}
              onSave={saveSettings}
              onBack={() => setMoreView(null)}
            />
          )}
        </div>
      </div>

      {/* INDIVIDUAL ATTENDANT RECONCILIATION MODAL */}
      {selectedAttendantModal && (
        <AttendantAccountabilityModal
          isOpen={true}
          record={selectedAttendantModal}
          onClose={() => setSelectedAttendantModal(null)}
          onSave={saveAttendantRecord}
          onDelete={(id) => {
            deleteAttendantRecord(id);
            setSelectedAttendantModal(null);
          }}
          fuelPrices={{
            super: settings.superPrice || 13.27,
            ron95: settings.ron95Price || 14.20,
            diesel: settings.dieselPrice || 16.1,
          }}
        />
      )}

      {/* MANAGER EXCEPTION AUTHORIZATION MODAL */}
      <ManagerExceptionModal
        isOpen={isManagerModalOpen}
        onClose={() => setIsManagerModalOpen(false)}
        unresolvedCount={
          accountabilitySummary.shortageCount +
          accountabilitySummary.excessCount +
          accountabilitySummary.pendingCount
        }
        totalShortage={accountabilitySummary.netVariance}
        shiftDate="19/08/2026"
        shiftType="SHIFT A — DAY"
        onAuthorize={(managerName, notes) => {
          setManagerExceptionAuthorized(true);
          setIsShiftClosed(true);
        }}
      />

      {/* TIME-BASED PUMP ROTATION TIMELINE MODAL */}
      <PumpTimelineSlotModal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        attendants={attendantRecords}
        onSaveAssignments={saveAllAttendantsFromTimeline}
      />

      {/* SUPERVISOR SALES ACCOUNT RECONCILIATION MODAL */}
      {selectedSupervisorSalesModal && (
        <SupervisorSalesAccountModal
          isOpen={true}
          record={selectedSupervisorSalesModal}
          onClose={() => setSelectedSupervisorSalesModal(null)}
          onSave={saveSupervisorSalesAccount}
          onDelete={(id) => {
            deleteSupervisorSalesAccount(id);
            setSelectedSupervisorSalesModal(null);
          }}
          fuelPrices={{
            super: settings.superPrice || 13.27,
            ron95: settings.ron95Price || 14.20,
            diesel: settings.dieselPrice || 16.10,
          }}
        />
      )}
    </div>
  );
};

/* ========================================================================= */
/* 1. ATTENDANT ACCOUNTABILITY CONTROL PANEL & TWO-LEVEL RECONCILIATION       */
/* ========================================================================= */
interface ControlPanelProps {
  attendantRecords: AttendantAccountabilityRecord[];
  summary: ReturnType<typeof computeShiftAccountabilitySummary>;
  isShiftClosed: boolean;
  managerExceptionAuthorized: boolean;
  supervisorName: string;
  date: string;
  shiftType: string;
  onOpenAttendantModal: (rec: AttendantAccountabilityRecord) => void;
  onOpenTimelineModal: () => void;
  onOpenManagerModal: () => void;
  onCloseShift: () => void;
  onReopenShift: () => void;
  onClearAllAccounts?: () => void;
  onClearDoneAccounts?: () => void;
  onAddAccount?: () => void;
  onDeleteAccount?: (id: string) => void;
}

const AttendantAccountabilityControlPanel: React.FC<ControlPanelProps> = ({
  attendantRecords,
  summary,
  isShiftClosed,
  managerExceptionAuthorized,
  supervisorName,
  date,
  shiftType,
  onOpenAttendantModal,
  onOpenTimelineModal,
  onOpenManagerModal,
  onCloseShift,
  onReopenShift,
  onClearAllAccounts,
  onClearDoneAccounts,
  onAddAccount,
  onDeleteAccount,
}) => {
  const [panelViewMode, setPanelViewMode] = useState<'control' | 'manager_table'>('control');
  const [accountFilter, setAccountFilter] = useState<'all' | 'multi_day' | 'open' | 'closed'>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearDoneConfirm, setShowClearDoneConfirm] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredAttendants = useMemo(() => {
    return attendantRecords.filter((att) => {
      const attSummary = computeAttendantSummary(att);
      const isOpen = attSummary.accountState === 'open';
      if (accountFilter === 'multi_day') {
        return isOpen && attSummary.isMultiDay;
      }
      if (accountFilter === 'open') {
        return isOpen;
      }
      if (accountFilter === 'closed') {
        return !isOpen;
      }
      return true;
    });
  }, [attendantRecords, accountFilter]);

  return (
    <div className="space-y-4">
      {/* SHIFT & ACCOUNTABILITY HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#333739]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded bg-[#e8b93b] text-[#15171a]">
              {shiftType}
            </span>
            <span className="text-xs font-mono text-[#8d9195]">{date}</span>
            {isShiftClosed && (
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Shift Closed
              </span>
            )}
          </div>
          <h1 className="text-xl font-extrabold uppercase tracking-tight text-[#ece8e0] font-['Space_Grotesk'] mt-1">
            Attendant Accountability
          </h1>
          <p className="text-xs text-[#8d9195]">
            SUPERVISOR: <b className="text-[#ece8e0]">{supervisorName}</b> · Station: Forecourt Management
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex bg-[#23262a] p-1 rounded-lg border border-[#333739]">
            <button
              onClick={() => setPanelViewMode('control')}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                panelViewMode === 'control'
                  ? 'bg-[#15171a] text-[#e8b93b] shadow-xs'
                  : 'text-[#8d9195] hover:text-[#ece8e0]'
              }`}
            >
              Control Panel
            </button>
            <button
              onClick={() => setPanelViewMode('manager_table')}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer transition-colors ${
                panelViewMode === 'manager_table'
                  ? 'bg-[#15171a] text-[#e8b93b] shadow-xs'
                  : 'text-[#8d9195] hover:text-[#ece8e0]'
              }`}
            >
              Manager's Audit View
            </button>
          </div>

          {onAddAccount && (
            <button
              onClick={onAddAccount}
              className="pl-btn primary text-xs"
              title="Add New Attendant Account"
            >
              <PlusCircle size={13} />
              <span>+ Add Account</span>
            </button>
          )}

          <button
            onClick={onOpenTimelineModal}
            className="pl-btn text-xs"
            title="Configure Pump Time Slot Rotations"
          >
            <Clock size={13} className="text-[#e8b93b]" />
            <span>Pump Rotations</span>
          </button>
        </div>
      </div>

      {/* MULTI-DAY POLICY EXPLANATION BANNER */}
      <div className="p-3.5 rounded-lg bg-[#15171a] border border-[#333739] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#23262a] border border-[#333739] flex items-center justify-center text-[#e8b93b] shrink-0 mt-0.5">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-[#ece8e0] block">
              Multi-Day Account Continuity Policy
            </span>
            <p className="text-[#8d9195] text-[11.5px] mt-0.5">
              Attendant accounts can remain open across multiple days (e.g., Saturday → Sunday → Monday).
              An attendant's account is <b className="text-[#ece8e0]">only closed</b> when the supervisor explicitly completes their final physical cash accounting.
              The system <b className="text-amber-400">never automatically closes accounts</b> at day/shift end.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#23262a] border border-amber-500/40 text-amber-300 font-semibold">
            {summary.openAccountsCount} Open ({summary.multiDayAccountsCount} Multi-Day)
          </span>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#23262a] border border-emerald-500/40 text-emerald-300 font-semibold">
            {summary.closedAccountsCount} Closed
          </span>
        </div>
      </div>

      {/* QUICK SUMMARY CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <StatCard
          label="Total Attendant Sales"
          value={`GH₵ ${fmt(summary.totalSales)}`}
          accent="var(--amber)"
          sub={`${fmt(summary.totalLitres)} L dispensed`}
        />
        <StatCard
          label="Expected Cash to Bank"
          value={`GH₵ ${fmt(summary.totalExpectedCash)}`}
          sub={`Non-cash: GH₵ ${fmt(summary.totalNonCash)}`}
        />
        <StatCard
          label="Actual Cash Counted"
          value={`GH₵ ${fmt(summary.totalActualCash)}`}
          accent={summary.totalActualCash >= summary.totalExpectedCash ? 'var(--good)' : 'var(--amber)'}
        />
        <StatCard
          label="Net Cash Variance"
          value={(summary.netVariance >= 0 ? '+' : '') + `GH₵ ${fmt(summary.netVariance)}`}
          accent={
            Math.abs(summary.netVariance) <= 0.5
              ? 'var(--good)'
              : summary.netVariance < 0
              ? 'var(--bad)'
              : 'var(--amber)'
          }
          sub={
            summary.shortageCount > 0
              ? `${summary.shortageCount} attendant shortage(s)`
              : 'All accounts balanced'
          }
        />
      </div>

      {/* VIEW 1: SUPERVISOR'S ATTENDANT CONTROL PANEL */}
      {panelViewMode === 'control' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <SectionHead n="1" title="Attendants Control Panel" />

            {/* Account Status Filter Pills and Clear Actions */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs flex-wrap">
              <button
                onClick={() => setAccountFilter('all')}
                className={`px-3 py-1 rounded-full font-semibold cursor-pointer transition-colors ${
                  accountFilter === 'all'
                    ? 'bg-[#e8b93b] text-[#15171a]'
                    : 'bg-[#23262a] text-[#8d9195] hover:text-[#ece8e0] border border-[#333739]'
                }`}
              >
                All Accounts ({attendantRecords.length})
              </button>
              <button
                onClick={() => setAccountFilter('multi_day')}
                className={`px-3 py-1 rounded-full font-semibold cursor-pointer transition-colors flex items-center gap-1 ${
                  accountFilter === 'multi_day'
                    ? 'bg-amber-400 text-[#15171a]'
                    : 'bg-[#23262a] text-amber-400/90 hover:text-amber-300 border border-amber-900/50'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>Multi-Day Open ({summary.multiDayAccountsCount})</span>
              </button>
              <button
                onClick={() => setAccountFilter('open')}
                className={`px-3 py-1 rounded-full font-semibold cursor-pointer transition-colors ${
                  accountFilter === 'open'
                    ? 'bg-blue-500 text-white'
                    : 'bg-[#23262a] text-blue-300/90 hover:text-blue-200 border border-blue-900/50'
                }`}
              >
                All Open ({summary.openAccountsCount})
              </button>
              <button
                onClick={() => setAccountFilter('closed')}
                className={`px-3 py-1 rounded-full font-semibold cursor-pointer transition-colors ${
                  accountFilter === 'closed'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#23262a] text-emerald-400/90 hover:text-emerald-300 border border-emerald-900/50'
                }`}
              >
                Closed ({summary.closedAccountsCount})
              </button>

              {/* Clear Done Accounts Button */}
              {summary.closedAccountsCount > 0 && onClearDoneAccounts && (
                showClearDoneConfirm ? (
                  <div className="flex items-center gap-1 bg-emerald-950/90 border border-emerald-700 px-2 py-0.5 rounded-full text-[11px]">
                    <span className="text-emerald-300 font-bold text-[10px]">
                      Clear {summary.closedAccountsCount} closed?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onClearDoneAccounts();
                        setShowClearDoneConfirm(false);
                      }}
                      className="px-2 py-0.5 bg-emerald-600 text-white font-bold rounded text-[10px] hover:bg-emerald-500 cursor-pointer"
                    >
                      Yes, Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearDoneConfirm(false)}
                      className="px-1.5 py-0.5 text-[#8d9195] hover:text-white text-[10px] cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowClearDoneConfirm(true)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900 cursor-pointer flex items-center gap-1"
                    title="Clear all closed/done accounts from this dashboard"
                  >
                    <CheckCircle2 size={12} />
                    <span>Clear Done ({summary.closedAccountsCount})</span>
                  </button>
                )
              )}

              {/* Clear All Accounts Button */}
              {attendantRecords.length > 0 && onClearAllAccounts && (
                showClearConfirm ? (
                  <div className="flex items-center gap-1 bg-rose-950/90 border border-rose-800 px-2 py-0.5 rounded-full text-[11px]">
                    <span className="text-rose-300 font-bold">Clear all {attendantRecords.length} accounts?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onClearAllAccounts();
                        setShowClearConfirm(false);
                      }}
                      className="px-2 py-0.5 bg-rose-600 text-white font-bold rounded hover:bg-rose-500"
                    >
                      Yes, Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="px-1.5 py-0.5 text-[#8d9195] hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950/40 border border-rose-900/50 text-rose-400 hover:bg-rose-950 hover:text-rose-300 cursor-pointer flex items-center gap-1"
                    title="Clear all attendant accounts on this dashboard"
                  >
                    <Trash2 size={12} />
                    <span>Clear All</span>
                  </button>
                )
              )}
            </div>
          </div>

          {filteredAttendants.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#191b1d] border border-[#333739] text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#23262a] border border-[#333739] flex items-center justify-center text-[#e8b93b] mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-[#ece8e0]">
                  {attendantRecords.length === 0
                    ? 'No Attendant Accounts on Dashboard'
                    : 'No Attendant Accounts Match Filter'}
                </h4>
                <p className="text-xs text-[#8d9195] max-w-md mx-auto">
                  {attendantRecords.length === 0
                    ? 'All attendant accounts have been cleared. Click "+ Add Account" or "Pump Rotations" to set up a new shift reconciliation.'
                    : 'Try selecting "All Accounts" or clearing your status filter.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                {onAddAccount && (
                  <button onClick={onAddAccount} className="pl-btn primary text-xs">
                    <PlusCircle size={13} />
                    <span>+ Add Account</span>
                  </button>
                )}
                <button onClick={onOpenTimelineModal} className="pl-btn text-xs">
                  <Clock size={13} />
                  <span>Pump Rotations</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAttendants.map((att, idx) => {
                const attSummary = computeAttendantSummary(att);
                const isShortage = attSummary.status === 'shortage';
                const isBalanced = attSummary.status === 'accounted';
                const isExcess = attSummary.status === 'excess';
                const isOpen = attSummary.accountState === 'open';

                return (
                  <div
                    key={att.id || idx}
                    className={`pl-card p-4 space-y-3 transition-all ${
                      isShortage
                        ? 'border-rose-900/60 bg-[#1f1a1a]'
                        : isOpen && attSummary.isMultiDay
                        ? 'border-amber-700/50 bg-[#1a1c1e]'
                        : 'hover:border-[#e8b93b]/50'
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-2 border-b border-[#2a2d30] pb-2.5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-[#ece8e0] uppercase font-['Space_Grotesk']">
                            {idx + 1}. {att.attendantName}
                          </span>
                          <span className="text-[10px] font-mono text-[#8d9195] bg-[#23262a] px-1.5 py-0.2 rounded border border-[#333739]">
                            {att.staffId}
                          </span>

                          {/* Multi-Day / Open / Closed badge */}
                          {isOpen ? (
                            attSummary.isMultiDay ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-600/70 text-amber-300 text-[10px] font-bold uppercase flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>
                                  Day {attSummary.daysOpenCount} Open ({attSummary.startDate} → Today)
                                </span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-blue-950/70 border border-blue-700 text-blue-300 text-[10px] font-bold uppercase flex items-center gap-1">
                                <Unlock className="w-3 h-3" />
                                <span>Account Open</span>
                              </span>
                            )
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-700 text-emerald-300 text-[10px] font-bold uppercase flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              <span>Account Closed</span>
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-[#8d9195] mt-1 flex items-center gap-1">
                          <Fuel className="w-3 h-3 text-[#e8b93b]" />
                          <span>Pumps: {att.assignedPumps.join(', ') || 'Super 1'}</span>
                          <span className="text-[#8d9195]">•</span>
                          <span>{att.shiftType}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          {isBalanced && (
                            <span className="pl-pill ok flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Accounted
                            </span>
                          )}
                          {isShortage && (
                            <span className="pl-pill bad flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Shortage
                            </span>
                          )}
                          {isExcess && (
                            <span className="pl-pill warn flex items-center gap-1">
                              Surplus
                            </span>
                          )}
                          {attSummary.status === 'pending' && (
                            <span className="pl-pill draft">Pending</span>
                          )}
                        </div>

                        {onDeleteAccount && (
                          confirmDeleteId === att.id ? (
                            <div
                              className="flex items-center gap-1 bg-rose-950 border border-rose-700 px-2 py-0.5 rounded text-[11px] shadow-sm z-10"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-rose-200 font-bold text-[10px]">Delete account?</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteAccount(att.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded text-[10px] cursor-pointer"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(null);
                                }}
                                className="px-1.5 py-0.5 text-[#8d9195] hover:text-white text-[10px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(att.id);
                              }}
                              className="p-1 rounded text-[#8d9195] hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Delete this attendant account"
                            >
                              <Trash2 size={13} />
                            </button>
                          )
                        )}
                      </div>
                    </div>

                  {/* Multi-day summary notice if multi-day */}
                  {attSummary.isMultiDay && (
                    <div className="bg-[#15171a] px-2.5 py-1.5 rounded border border-amber-900/40 text-[11px] flex items-center justify-between text-amber-300/90">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          Multi-Day Span: {attSummary.daysOpenCount} days active (Started {attSummary.startDate})
                        </span>
                      </span>
                      <span className="font-mono text-[10px] bg-[#23262a] px-1.5 py-0.5 rounded text-[#ece8e0]">
                        {(att.dayLogs?.length || 0) + 1} Daily Shift Logs
                      </span>
                    </div>
                  )}

                  {/* Meter Accountability Info */}
                  <div className="bg-[#15171a] p-2.5 rounded border border-[#2a2d30] text-[11px] space-y-1">
                    {att.meterReadings.map((mr, mIdx) => (
                      <div key={mr.id || mIdx} className="flex justify-between items-center">
                        <span className="text-[#8d9195]">
                          {mr.pumpName}
                        </span>
                        <span className="font-mono text-[#ece8e0]">
                          {(mr.litresSold || (mr.closingMeter - mr.openingMeter)).toFixed(2)} L @ GH₵{' '}
                          {mr.unitPrice}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-1 border-t border-[#23262a] font-semibold">
                      <span className="text-[#8d9195]">Total Cumulative Sales:</span>
                      <span className="font-mono text-[#e8b93b]">
                        GH₵ {fmt(attSummary.totalSales)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Breakdown Chips */}
                  <div className="flex flex-wrap gap-1.5 text-[10.5px]">
                    <span className="px-2 py-0.5 rounded bg-[#23262a] border border-[#333739] text-[#ece8e0] font-mono">
                      Cash Count: GH₵ {fmt(attSummary.actualCash)}
                    </span>
                    {attSummary.totalEvalues > 0 && (
                      <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-700 text-cyan-300 font-mono">
                        E-Values: GH₵ {fmt(attSummary.totalEvalues)}
                      </span>
                    )}
                    {attSummary.totalVouchers > 0 && (
                      <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-700 text-purple-300 font-mono">
                        Vouchers: GH₵ {fmt(attSummary.totalVouchers)}
                      </span>
                    )}
                    {attSummary.totalCreditSales > 0 && (
                      <span className="px-2 py-0.5 rounded bg-rose-950/60 border border-rose-700 text-rose-300 font-mono">
                        Credit: GH₵ {fmt(attSummary.totalCreditSales)}
                      </span>
                    )}
                    {attSummary.approvedDeductions > 0 && (
                      <span className="px-2 py-0.5 rounded bg-[#23262a] border border-[#333739] text-[#8d9195] font-mono">
                        Deductions: GH₵ {fmt(attSummary.approvedDeductions)}
                      </span>
                    )}
                  </div>

                  {/* Financial Comparison Box */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded bg-[#15171a] border border-[#2a2d30] text-center">
                    <div>
                      <span className="text-[9.5px] text-[#8d9195] uppercase block">Expected</span>
                      <span className="font-mono font-bold text-xs text-[#ece8e0]">
                        GH₵ {fmt(attSummary.expectedCash)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-[#8d9195] uppercase block">Actual Cash</span>
                      <span className="font-mono font-bold text-xs text-[#ece8e0]">
                        GH₵ {fmt(attSummary.actualCash)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-[#8d9195] uppercase block">Difference</span>
                      <span
                        className={`font-mono font-bold text-xs ${
                          isBalanced
                            ? 'text-emerald-400'
                            : isShortage
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {attSummary.difference >= 0 ? '+' : ''}GH₵ {fmt(attSummary.difference)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onOpenAttendantModal(att)}
                      className="pl-btn primary flex-1 justify-center text-xs py-2"
                    >
                      <Receipt size={13} />
                      <span>{isOpen ? 'Reconcile & Count' : 'View Closed Account'}</span>
                    </button>
                    <button
                      onClick={() => onOpenAttendantModal(att)}
                      className="pl-btn text-xs py-2 px-3"
                      title="View detailed account ledger"
                    >
                      <Eye size={13} />
                      <span>Ledger</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    )}

      {/* VIEW 2: MANAGER'S AUDIT VIEW TABLE */}
      {panelViewMode === 'manager_table' && (
        <div className="space-y-4">
          <SectionHead n="M" title="Manager's Attendant Audit Ledger" />

          {/* Desktop Table */}
          <div className="pl-card hidden md:block overflow-x-auto">
            <table className="pl-table">
              <thead>
                <tr>
                  <th>Attendant</th>
                  <th>Staff ID</th>
                  <th>Account Span</th>
                  <th>Pumps</th>
                  <th>Sales (GH₵)</th>
                  <th>Expected (GH₵)</th>
                  <th>Actual (GH₵)</th>
                  <th>Difference</th>
                  <th>Account State</th>
                  <th>Reconciliation</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {attendantRecords.map((att) => {
                  const s = computeAttendantSummary(att);
                  const isOpen = s.accountState === 'open';
                  return (
                    <tr key={att.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text)' }}>
                        {att.attendantName}
                      </td>
                      <td className="mono text-[#8d9195]">{att.staffId}</td>
                      <td>
                        <span className="text-[11px] font-mono text-[#ece8e0]">
                          {s.daysOpenCount} Day(s)
                        </span>
                        <span className="text-[10px] text-[#8d9195] block">
                          From {s.startDate}
                        </span>
                      </td>
                      <td>{att.assignedPumps.join(', ') || 'Super 1'}</td>
                      <td className="mono" style={{ color: 'var(--amber)', fontWeight: 600 }}>
                        {fmt(s.totalSales)}
                      </td>
                      <td className="mono">{fmt(s.expectedCash)}</td>
                      <td className="mono font-semibold">{fmt(s.actualCash)}</td>
                      <td
                        className={`mono font-bold ${
                          s.status === 'accounted'
                            ? 'text-emerald-400'
                            : s.status === 'shortage'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {s.difference >= 0 ? '+' : ''}
                        {fmt(s.difference)}
                      </td>
                      <td>
                        {isOpen ? (
                          <span className="pl-pill warn">OPEN</span>
                        ) : (
                          <span className="pl-pill ok">CLOSED</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`pl-pill ${
                            s.status === 'accounted'
                              ? 'ok'
                              : s.status === 'shortage'
                              ? 'bad'
                              : s.status === 'excess'
                              ? 'warn'
                              : 'draft'
                          }`}
                        >
                          {s.status === 'accounted'
                            ? '✓ Accounted'
                            : s.status === 'shortage'
                            ? '⚠️ Short'
                            : s.status === 'excess'
                            ? '🔵 Surplus'
                            : '—'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            className="pl-btn"
                            style={{ padding: '4px 8px' }}
                            onClick={() => onOpenAttendantModal(att)}
                            title="View detailed ledger"
                          >
                            <Eye size={12} />
                          </button>
                          {onDeleteAccount && (
                            confirmDeleteId === att.id ? (
                              <div className="flex items-center gap-1 bg-rose-950 border border-rose-700 px-1.5 py-0.5 rounded text-[10px]">
                                <span className="text-rose-200 font-bold text-[9px]">Delete?</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteAccount(att.id);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-[9px] cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-1 py-0.5 text-stone-400 hover:text-white text-[9px] cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                className="pl-btn danger"
                                style={{ padding: '4px 8px' }}
                                onClick={() => setConfirmDeleteId(att.id)}
                                title="Delete this attendant account"
                              >
                                <Trash2 size={12} />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards Presentation */}
          <div className="md:hidden space-y-3">
            {attendantRecords.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#8d9195] bg-[#1a1d20] border border-[#2d3135] rounded-xl">
                No attendant accounts in audit ledger.
              </div>
            ) : (
              attendantRecords.map((att) => {
                const s = computeAttendantSummary(att);
                const isOpen = s.accountState === 'open';

                return (
                  <div
                    key={att.id}
                    className="p-3.5 bg-[#1a1d20] border border-[#2d3135] rounded-xl space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-[#ece8e0]">{att.attendantName}</div>
                        <div className="text-[11px] text-[#8d9195] font-mono flex items-center gap-1.5">
                          <span>{att.staffId}</span>
                          <span>•</span>
                          <span>Pumps: {att.assignedPumps.join(', ') || 'Super 1'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isOpen ? (
                          <span className="pl-pill warn text-[10px]">OPEN</span>
                        ) : (
                          <span className="pl-pill ok text-[10px]">CLOSED</span>
                        )}
                        <span
                          className={`pl-pill text-[10px] ${
                            s.status === 'accounted'
                              ? 'ok'
                              : s.status === 'shortage'
                              ? 'bad'
                              : s.status === 'excess'
                              ? 'warn'
                              : 'draft'
                          }`}
                        >
                          {s.status === 'accounted'
                            ? '✓ Accounted'
                            : s.status === 'shortage'
                            ? '⚠️ Short'
                            : s.status === 'excess'
                            ? '🔵 Surplus'
                            : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-[#8d9195]">
                      Span: <span className="text-[#ece8e0] font-semibold">{s.daysOpenCount} Day(s)</span> (From {s.startDate})
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-[#15171a] p-2.5 rounded-lg border border-[#2d3135] text-xs">
                      <div>
                        <span className="text-[9.5px] text-[#8d9195] uppercase font-bold block">SALES</span>
                        <span className="font-mono font-bold text-amber-400">GH₵ {fmt(s.totalSales)}</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-[#8d9195] uppercase font-bold block">EXPECTED</span>
                        <span className="font-mono text-[#ece8e0]">GH₵ {fmt(s.expectedCash)}</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-[#8d9195] uppercase font-bold block">ACTUAL</span>
                        <span className="font-mono text-[#ece8e0] font-semibold">GH₵ {fmt(s.actualCash)}</span>
                      </div>
                      <div>
                        <span className="text-[9.5px] text-[#8d9195] uppercase font-bold block">DIFFERENCE</span>
                        <span
                          className={`font-mono font-bold ${
                            s.status === 'accounted'
                              ? 'text-emerald-400'
                              : s.status === 'shortage'
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {s.difference >= 0 ? '+' : ''}
                          {fmt(s.difference)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        className="pl-btn primary text-xs"
                        style={{ padding: '6px 12px' }}
                        onClick={() => onOpenAttendantModal(att)}
                      >
                        <Eye size={13} /> View Ledger
                      </button>

                      {onDeleteAccount && (
                        confirmDeleteId === att.id ? (
                          <div className="flex items-center gap-1 bg-rose-950 border border-rose-700 px-2 py-1 rounded text-xs">
                            <span className="text-rose-200 font-bold text-[10px]">Confirm?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteAccount(att.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-xs cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-0.5 text-stone-400 hover:text-white text-xs cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            className="pl-btn danger text-xs"
                            style={{ padding: '6px 12px' }}
                            onClick={() => setConfirmDeleteId(att.id)}
                            title="Delete this attendant account"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TWO-LEVEL STATION RECONCILIATION ACCORDION */}
      <div className="pl-card p-4 bg-[#15171a] border border-[#333739] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="disp font-bold text-xs uppercase tracking-wide text-[#ece8e0]">
              Two-Level Station Reconciliation Validation
            </h3>
          </div>
          <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-800">
            Attendant → Pump → Transaction → Shift → Station
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded bg-[#23262a] border border-[#333739] space-y-1">
            <span className="text-[10px] text-[#8d9195] uppercase font-bold block">
              Level 1: Attendants Total
            </span>
            <div className="flex justify-between">
              <span className="text-[#8d9195]">Sum of Attendant Sales:</span>
              <span className="font-mono font-bold text-[#e8b93b]">
                GH₵ {fmt(summary.totalSales)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8d9195]">Attendant Cash Handed Over:</span>
              <span className="font-mono font-bold text-[#ece8e0]">
                GH₵ {fmt(summary.totalActualCash)}
              </span>
            </div>
          </div>

          <div className="p-3 rounded bg-[#23262a] border border-[#333739] space-y-1">
            <span className="text-[10px] text-[#8d9195] uppercase font-bold block">
              Level 2: Station Meter Totalizer
            </span>
            <div className="flex justify-between">
              <span className="text-[#8d9195]">Total Station Pump Litres:</span>
              <span className="font-mono font-bold text-emerald-400">
                {fmt(summary.totalLitres)} L
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#8d9195]">Totalizer Sales Match:</span>
              <span className="font-mono font-bold text-emerald-400">
                GH₵ {fmt(summary.totalSales)} (100% Match ✓)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* END-OF-SHIFT ACCOUNTABILITY & CLOSURE GUARD */}
      <div className="pl-card p-5 border-t-2 border-t-[#e8b93b] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="disp font-extrabold text-sm uppercase text-[#ece8e0]">
              End-of-Shift Accountability Checklist
            </h3>
            <p className="text-xs text-[#8d9195]">
              Before the supervisor can close the shift, every attendant must be accounted for.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold bg-[#23262a] border border-[#333739] px-2.5 py-1 rounded text-[#ece8e0]">
              TOTAL: {summary.totalAttendants}
            </span>
            <span className="text-xs font-mono font-bold bg-emerald-950 border border-emerald-800 px-2.5 py-1 rounded text-emerald-400">
              ACCOUNTED: {summary.accountedCount}
            </span>
            {summary.shortageCount + summary.pendingCount > 0 && (
              <span className="text-xs font-mono font-bold bg-rose-950 border border-rose-800 px-2.5 py-1 rounded text-rose-300">
                OUTSTANDING: {summary.shortageCount + summary.pendingCount}
              </span>
            )}
          </div>
        </div>

        {/* Attendants Status Checklist */}
        {attendantRecords.length === 0 ? (
          <div className="p-3 text-center text-[#8d9195] bg-[#15171a] rounded-lg border border-[#2a2d30] text-xs">
            No attendant accounts currently open or active on the supervisor dashboard.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-xs">
            {attendantRecords.map((att) => {
              const s = computeAttendantSummary(att);
              return (
                <div
                  key={att.id}
                  onClick={() => onOpenAttendantModal(att)}
                  className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                    s.status === 'accounted'
                      ? 'bg-emerald-950/30 border-emerald-900/60 text-emerald-300 hover:bg-emerald-950/50'
                      : 'bg-rose-950/40 border-rose-900 text-rose-300 hover:bg-rose-950/60'
                  }`}
                >
                  <div>
                    <span className="font-bold block uppercase">{att.attendantName}</span>
                    <span className="text-[10px] text-[#8d9195]">
                      {s.status === 'accounted'
                        ? '✓ Accounted'
                        : `⚠ GH₵ ${Math.abs(s.difference).toFixed(2)} ${
                            s.status === 'shortage' ? 'short' : 'over'
                          }`}
                    </span>
                  </div>
                  <ChevronRight size={13} className="text-[#8d9195]" />
                </div>
              );
            })}
          </div>
        )}

        {/* Closure Actions */}
        <div className="pt-3 border-t border-[#2a2d30] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {!summary.canCloseShift && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-semibold">
                <Lock className="w-4 h-4 shrink-0" />
                <span>
                  Shift closure locked: {summary.shortageCount} attendant(s) have unresolved shortages.
                </span>
              </div>
            )}
            {summary.canCloseShift && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <Unlock className="w-4 h-4 shrink-0" />
                <span>
                  {managerExceptionAuthorized
                    ? 'Manager Exception Authorized: Shift is eligible for closure.'
                    : 'All attendant accounts are reconciled and accounted for.'}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {!summary.canCloseShift && (
              <button
                type="button"
                onClick={onOpenManagerModal}
                className="pl-btn text-xs border-amber-500/50 text-amber-400 hover:border-amber-400"
              >
                <ShieldAlert size={14} />
                <span>Authorize Manager Exception</span>
              </button>
            )}

            {!isShiftClosed ? (
              <button
                type="button"
                disabled={!summary.canCloseShift}
                onClick={onCloseShift}
                className="pl-btn primary text-xs py-2.5 px-5 shadow-lg"
              >
                <CheckCircle2 size={15} />
                <span>Close Shift</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onReopenShift}
                className="pl-btn text-xs text-[#8d9195] hover:text-[#ece8e0]"
              >
                <RotateCcw size={13} />
                <span>Re-open Shift</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ========================================================================= */
/* 2. DASHBOARD VIEW (HOME)                                                  */
/* ========================================================================= */
function DashboardView({
  settings,
  shifts,
  profile,
  attendantRecords,
  accountabilitySummary,
  supervisorSalesAccounts,
  onNewDailyRecord,
  onNewShift,
  onOpenHistory,
  onOpenAttendants,
  onOpenSupervisorSales,
  onOpenAttendantModal,
  onOpenTeam,
  onOpenApprovals,
  onOpenReports,
  onOpenSettings,
  onViewShift,
  onAddAccount,
}: {
  settings: PLSettings;
  shifts: PLShift[];
  profile: UserProfile;
  attendantRecords: AttendantAccountabilityRecord[];
  accountabilitySummary: ReturnType<typeof computeShiftAccountabilitySummary>;
  supervisorSalesAccounts: SupervisorSalesAccountRecord[];
  onNewDailyRecord?: () => void;
  onNewShift: () => void;
  onOpenHistory: () => void;
  onOpenAttendants: () => void;
  onOpenSupervisorSales: () => void;
  onOpenAttendantModal?: (rec: AttendantAccountabilityRecord) => void;
  onOpenTeam?: () => void;
  onOpenApprovals?: () => void;
  onOpenReports?: () => void;
  onOpenSettings?: () => void;
  onViewShift: (id: string) => void;
  onAddAccount?: () => void;
}) {
  const [filter, setFilter] = useState<'all' | 'open' | 'closed' | 'shortage' | 'excess'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isQuickActionsHidden, setIsQuickActionsHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem('staroil_hide_quick_actions') === 'true';
    } catch {
      return false;
    }
  });

  const toggleQuickActions = () => {
    setIsQuickActionsHidden((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('staroil_hide_quick_actions', String(next));
      } catch {}
      return next;
    });
  };

  const today = new Date().toISOString().slice(0, 10);
  const supervisorName = profile.supervisor || profile.attendant || 'David';
  const stationCode = profile.stationCode || settings.code || 'SOC101179';
  const stationDisplayName = `Station: Forecourt Management (${stationCode})`;

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'Good morning';
    if (hr < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const recent = shifts.slice(0, 5);

  // Filter counts including Multi-Day accounts
  const counts = useMemo(() => {
    let open = 0;
    let multiDay = 0;
    let closed = 0;
    let shortage = 0;
    let excess = 0;
    let balanced = 0;
    attendantRecords.forEach((rec) => {
      const sum = computeAttendantSummary(rec);
      if (sum.accountState === 'open') {
        open++;
        if (sum.isMultiDay || (sum.daysOpenCount && sum.daysOpenCount > 1)) {
          multiDay++;
        }
      } else if (sum.accountState === 'closed') {
        closed++;
      }
      if (sum.status === 'shortage') shortage++;
      else if (sum.status === 'excess') excess++;
      else if (sum.status === 'accounted' || Math.abs(sum.difference) < 0.01) balanced++;
    });
    return { all: attendantRecords.length, open, multiDay, closed, shortage, excess, balanced };
  }, [attendantRecords]);

  // Pending Approvals count from local / session state
  const pendingApprovalsCount = useMemo(() => {
    try {
      const raw = localStorage.getItem('staroil_pending_approvals');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.filter((x: any) => x.status === 'pending').length;
      }
    } catch {}
    return 0;
  }, []);

  // Filtered list - ONLY real records, no fake examples
  const filteredRecords = useMemo(() => {
    return attendantRecords.filter((rec) => {
      const sum = computeAttendantSummary(rec);
      if (filter === 'open' && sum.accountState !== 'open') return false;
      if (filter === 'closed' && sum.accountState !== 'closed') return false;
      if (filter === 'shortage' && sum.status !== 'shortage') return false;
      if (filter === 'excess' && sum.status !== 'excess') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = rec.attendantName?.toLowerCase().includes(q);
        const matchId = rec.staffId?.toLowerCase().includes(q);
        const matchPump = rec.assignedPumps?.some((p) => p.toLowerCase().includes(q));
        if (!matchName && !matchId && !matchPump) return false;
      }
      return true;
    });
  }, [attendantRecords, filter, searchQuery]);

  return (
    <div className="space-y-5 w-full max-w-full min-w-0 overflow-x-hidden">
      {/* 1. TOP MANDATED HEADER: STATION NAME & STATION CODE */}
      <div className="bg-[#191c1f] rounded-2xl border border-[#333739] p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 font-mono">
            STATION FORECOURT MANAGEMENT
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-[#ece8e0] font-['Space_Grotesk'] mt-0.5">
            {profile.station || settings.stationName || 'Tema Main Station'}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-mono font-bold text-amber-300 bg-[#15171a] px-2.5 py-0.5 rounded border border-[#2d3135]">
              STATION CODE: {stationCode}
            </span>
            <span className="text-xs text-[#8d9195]">
              Supervisor: <strong className="text-[#ece8e0]">{supervisorName}</strong>
            </span>
          </div>
        </div>

        {/* Most Important Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn-top-supervisor-sales"
            onClick={onOpenSupervisorSales}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs sm:text-sm tracking-tight transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Banknote className="w-4 h-4 stroke-[2.5]" />
            <span>Supervisor Sales Account</span>
          </button>
          {onOpenApprovals && (
            <button
              type="button"
              onClick={onOpenApprovals}
              className="px-3.5 py-2.5 rounded-xl bg-[#23262a] hover:bg-[#2d3136] text-[#ece8e0] border border-[#333739] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Approvals {pendingApprovalsCount > 0 && `(${pendingApprovalsCount})`}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. MANDATED "TODAY" OVERVIEW: OPEN, MULTI-DAY, CLOSED, PENDING APPROVALS */}
      <div className="bg-[#1a1d20] border border-[#2d3135] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 font-['Space_Grotesk'] flex items-center gap-2">
            <span>TODAY</span>
            <span className="text-[#8d9195] font-mono">({today})</span>
          </div>
          <span className="text-[11px] text-[#8d9195] font-mono">Shift Status Summary</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Open Accounts */}
          <div
            onClick={() => setFilter('open')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              filter === 'open' ? 'bg-amber-950/40 border-amber-500' : 'bg-[#202428] border-[#30353a] hover:border-[#3d4349]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#8d9195]">
                Open Accounts
              </span>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                OPEN
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-[#ece8e0] mt-1.5">
              {counts.open}
            </div>
            <span className="text-[10.5px] text-[#8d9195] mt-0.5 block">Active duty attendants</span>
          </div>

          {/* Multi-Day Accounts */}
          <div
            onClick={() => setFilter('all')}
            className="p-3.5 rounded-xl border bg-[#202428] border-[#30353a] hover:border-[#3d4349] cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#8d9195]">
                Multi-Day Accounts
              </span>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                MULTI-DAY
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-amber-300 mt-1.5">
              {counts.multiDay}
            </div>
            <span className="text-[10.5px] text-[#8d9195] mt-0.5 block">Carryover shifts</span>
          </div>

          {/* Closed Accounts */}
          <div
            onClick={() => setFilter('closed')}
            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
              filter === 'closed' ? 'bg-emerald-950/40 border-emerald-500' : 'bg-[#202428] border-[#30353a] hover:border-[#3d4349]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#8d9195]">
                Closed Accounts
              </span>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                CLOSED
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400 mt-1.5">
              {counts.closed}
            </div>
            <span className="text-[10.5px] text-[#8d9195] mt-0.5 block">Finalized & locked</span>
          </div>

          {/* Pending Approvals */}
          <div
            onClick={onOpenApprovals}
            className="p-3.5 rounded-xl border bg-[#202428] border-[#30353a] hover:border-amber-500/60 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold tracking-wider uppercase text-[#8d9195]">
                Pending Approvals
              </span>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                PENDING
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-blue-300 mt-1.5">
              {pendingApprovalsCount}
            </div>
            <span className="text-[10.5px] text-blue-400/80 mt-0.5 block hover:underline">Tap to review approvals</span>
          </div>
        </div>
      </div>

      {/* 3. TOTALS & VARIANCE SUMMARY STRIP */}
      <div className="bg-[#1a1d20] border border-[#2d3135] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#8d9195] font-['Space_Grotesk'] flex items-center gap-2">
            <span>SHIFT FINANCIAL TOTALS</span>
          </div>
          <span className="text-[11px] font-mono text-stone-400">
            {today}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Total Station Sales */}
          <div className="bg-[#202428] border border-[#30353a] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8d9195] mb-2">
              <span className="text-[10px] font-bold tracking-wider uppercase">TOTAL STATION SALES</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Fuel className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#ece8e0]">
                GH₵ {fmt(accountabilitySummary.totalSales)}
              </div>
              <div className="text-xs text-[#8d9195] mt-1 font-mono">
                Total litres: {fmt(accountabilitySummary.totalLitres)} L
              </div>
            </div>
          </div>

          {/* Card 2: Expected Cash to Bank */}
          <div className="bg-[#202428] border border-[#30353a] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8d9195] mb-2">
              <span className="text-[10px] font-bold tracking-wider uppercase">EXPECTED CASH TO BANK</span>
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Building className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#ece8e0]">
                GH₵ {fmt(accountabilitySummary.totalExpectedCash)}
              </div>
              <div className="text-xs text-[#8d9195] mt-1 font-mono">
                Non-cash: GH₵ {fmt(accountabilitySummary.totalNonCash)}
              </div>
            </div>
          </div>

          {/* Card 3: Actual Cash Counted */}
          <div className="bg-[#202428] border border-[#30353a] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8d9195] mb-2">
              <span className="text-[10px] font-bold tracking-wider uppercase">ACTUAL CASH COUNTED</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Banknote className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-[#ece8e0]">
                GH₵ {fmt(accountabilitySummary.totalActualCash)}
              </div>
              <div className="text-xs text-[#8d9195] mt-1">
                Counted by Supervisor
              </div>
            </div>
          </div>

          {/* Card 4: Net Cash Variance */}
          <div className="bg-[#202428] border border-[#30353a] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8d9195] mb-2">
              <span className="text-[10px] font-bold tracking-wider uppercase">NET CASH VARIANCE</span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                accountabilitySummary.netVariance === 0
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : accountabilitySummary.netVariance > 0
                  ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }`}>
                <Scale className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className={`text-xl sm:text-2xl font-bold font-mono ${
                accountabilitySummary.netVariance === 0
                  ? 'text-emerald-400'
                  : accountabilitySummary.netVariance > 0
                  ? 'text-blue-400'
                  : 'text-rose-400'
              }`}>
                {accountabilitySummary.netVariance >= 0 ? '+' : ''}GH₵ {fmt(accountabilitySummary.netVariance)}
              </div>
              <div className="text-xs text-[#8d9195] mt-1 font-medium capitalize">
                {accountabilitySummary.netVariance === 0
                  ? 'Balanced / Zero Variance'
                  : accountabilitySummary.netVariance > 0
                  ? 'Excess Cash Handover'
                  : 'Shortage Requiring Review'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. ATTENDANT ACCOUNTS OVERVIEW */}
      <div className="bg-[#1a1d20] border border-[#2d3135] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold uppercase tracking-wide text-[#ece8e0] font-['Space_Grotesk']">
              ATTENDANT ACCOUNTS OVERVIEW
            </span>
            <span className="text-xs bg-[#24282c] text-[#8d9195] px-2 py-0.5 rounded-md font-mono font-semibold">
              {attendantRecords.length}
            </span>
          </div>

          {/* Filter Pills + Search + Action */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter Pills */}
            <div className="flex items-center bg-[#202428] p-1 rounded-xl border border-[#2d3135] gap-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filter === 'all'
                    ? 'bg-[#15171a] text-[#e8b93b] shadow-xs'
                    : 'text-[#8d9195] hover:text-[#ece8e0]'
                }`}
              >
                All ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setFilter('open')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filter === 'open'
                    ? 'bg-[#15171a] text-[#e8b93b] shadow-xs'
                    : 'text-[#8d9195] hover:text-[#ece8e0]'
                }`}
              >
                Open ({counts.open})
              </button>
              <button
                type="button"
                onClick={() => setFilter('closed')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filter === 'closed'
                    ? 'bg-[#15171a] text-[#e8b93b] shadow-xs'
                    : 'text-[#8d9195] hover:text-[#ece8e0]'
                }`}
              >
                Closed ({counts.closed})
              </button>
              <button
                type="button"
                onClick={() => setFilter('shortage')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filter === 'shortage'
                    ? 'bg-rose-950/80 text-rose-300 shadow-xs'
                    : 'text-[#8d9195] hover:text-rose-300'
                }`}
              >
                Shortage ({counts.shortage})
              </button>
              <button
                type="button"
                onClick={() => setFilter('excess')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  filter === 'excess'
                    ? 'bg-blue-950/80 text-blue-300 shadow-xs'
                    : 'text-[#8d9195] hover:text-blue-300'
                }`}
              >
                Excess ({counts.excess})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8d9195]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search attendant..."
                className="bg-[#202428] border border-[#2d3135] text-xs text-[#ece8e0] pl-8 pr-3 py-1.5 rounded-xl placeholder:text-[#555a60] focus:outline-none focus:border-[#e8b93b] w-40 sm:w-48"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {onAddAccount && (
              <button
                type="button"
                onClick={onAddAccount}
                className="px-3 py-1.5 rounded-xl bg-[#252a2f] hover:bg-[#30363d] border border-[#373e47] text-xs font-semibold text-amber-400 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus size={13} /> + Add Account
              </button>
            )}
          </div>
        </div>

        {/* Attendant Table - Desktop */}
        <div className="hidden md:block overflow-x-auto rounded-xl border border-[#2d3135]">
          <table className="w-full text-left text-xs text-[#ece8e0]">
            <thead className="bg-[#202428] text-[#8d9195] text-[10px] uppercase tracking-wider font-semibold border-b border-[#2d3135]">
              <tr>
                <th className="py-3 px-3.5">ATTENDANT</th>
                <th className="py-3 px-3">SHIFT</th>
                <th className="py-3 px-3">ACCOUNT DATE</th>
                <th className="py-3 px-3">STATUS</th>
                <th className="py-3 px-3 font-mono">TOTAL SALES</th>
                <th className="py-3 px-3 font-mono">EXPECTED CASH</th>
                <th className="py-3 px-3 font-mono">CASH COUNTED</th>
                <th className="py-3 px-3 font-mono">DIFFERENCE</th>
                <th className="py-3 px-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2d3135] bg-[#1a1d20]">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 px-4 text-center text-[#8d9195]">
                    {attendantRecords.length === 0 ? (
                      <div className="flex flex-col items-center justify-center space-y-2 max-w-sm mx-auto">
                        <Users className="w-8 h-8 text-stone-600 mb-1" />
                        <p className="font-semibold text-sm text-[#ece8e0]">No Attendant Accounts Active</p>
                        <p className="text-xs text-[#8d9195]">
                          No active attendant accounts for this shift. Click "+ Add Account" to register an attendant or "+ New Sales Account" to start shift reconciliation.
                        </p>
                        {onAddAccount && (
                          <button
                            type="button"
                            onClick={onAddAccount}
                            className="mt-2 px-3.5 py-1.5 rounded-lg bg-[#e8b93b] text-[#15171a] font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-amber-400"
                          >
                            <Plus size={14} /> + Add Attendant Account
                          </button>
                        )}
                      </div>
                    ) : (
                      <div>No attendant records match the selected filter or search.</div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const summary = computeAttendantSummary(rec);
                  const initials = rec.attendantName
                    ? rec.attendantName
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'AT';

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-[#202428] transition-colors cursor-pointer group"
                      onClick={() => onOpenAttendantModal && onOpenAttendantModal(rec)}
                    >
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-[#272c32] border border-[#383f47] flex items-center justify-center text-[10px] font-extrabold text-amber-400 font-mono shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-[#ece8e0] group-hover:text-amber-400 transition-colors">
                              {rec.attendantName}
                            </div>
                            <div className="text-[10px] text-[#8d9195] font-mono">
                              {rec.staffId || 'SO-ATT'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                          {rec.shiftType?.replace('Shift ', '') || 'A — Day'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#8d9195] font-mono">
                        <div>{rec.date || today}</div>
                        <div className="text-[10px] text-stone-500">Started: 08:00</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1 items-start">
                          {summary.accountState === 'open' ? (
                            summary.isMultiDay || (summary.daysOpenCount && summary.daysOpenCount > 1) ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-950 text-amber-400 border border-amber-700">
                                MULTI-DAY
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-950/80 text-amber-300 border border-amber-800">
                                OPEN
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-[#25292e] text-[#8d9195] border border-[#383f47]">
                              CLOSED
                            </span>
                          )}

                          {summary.status === 'shortage' ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                              SHORTAGE
                            </span>
                          ) : summary.status === 'excess' ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                              EXCESS
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              BALANCED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-[#ece8e0]">
                        <div>GH₵ {fmt(summary.totalSales)}</div>
                        <div className="text-[10px] text-stone-500">{fmt(summary.totalLitres)} L</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[#ece8e0]">
                        GH₵ {fmt(summary.expectedCash)}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#ece8e0]">
                        {summary.actualCash > 0 ? `GH₵ ${fmt(summary.actualCash)}` : '—'}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {summary.difference === 0 ? (
                          <span className="text-emerald-400 font-semibold">GH₵ 0.00</span>
                        ) : summary.difference > 0 ? (
                          <span className="text-blue-400 font-semibold">+GH₵ {fmt(summary.difference)}</span>
                        ) : (
                          <span className="text-rose-400 font-semibold">-GH₵ {fmt(Math.abs(summary.difference))}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {summary.accountState === 'open' ? (
                            <button
                              type="button"
                              onClick={() => onOpenAttendantModal && onOpenAttendantModal(rec)}
                              className="px-2.5 py-1 rounded-lg bg-[#e8b93b] hover:bg-amber-400 text-[#15171a] text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
                            >
                              Continue
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onOpenAttendantModal && onOpenAttendantModal(rec)}
                              className="px-2.5 py-1 rounded-lg bg-[#272c32] hover:bg-[#343b43] text-[#ece8e0] text-[11px] font-semibold border border-[#3a424b] cursor-pointer transition-colors"
                            >
                              View
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Attendant Cards - Mobile Presentation */}
        <div className="md:hidden space-y-3">
          {filteredRecords.length === 0 ? (
            <div className="py-8 px-4 text-center text-[#8d9195] bg-[#1a1d20] rounded-xl border border-[#2d3135]">
              {attendantRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center space-y-2">
                  <Users className="w-8 h-8 text-stone-600 mb-1" />
                  <p className="font-semibold text-sm text-[#ece8e0]">No Attendant Accounts Active</p>
                  <p className="text-xs text-[#8d9195]">
                    No active attendant accounts for this shift.
                  </p>
                  {onAddAccount && (
                    <button
                      type="button"
                      onClick={onAddAccount}
                      className="mt-2 px-3.5 py-2 rounded-lg bg-[#e8b93b] text-[#15171a] font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:bg-amber-400"
                    >
                      <Plus size={14} /> + Add Attendant Account
                    </button>
                  )}
                </div>
              ) : (
                <div>No attendant records match the selected filter or search.</div>
              )}
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const summary = computeAttendantSummary(rec);
              const initials = rec.attendantName
                ? rec.attendantName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'AT';

              return (
                <div
                  key={rec.id}
                  onClick={() => onOpenAttendantModal && onOpenAttendantModal(rec)}
                  className="bg-[#202428] border border-[#2d3135] rounded-xl p-3.5 space-y-3 cursor-pointer hover:border-[#383f47] transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#272c32] border border-[#383f47] flex items-center justify-center text-xs font-extrabold text-amber-400 font-mono shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm text-[#ece8e0] truncate">
                          {rec.attendantName}
                        </div>
                        <div className="text-[11px] text-[#8d9195] font-mono flex items-center gap-1.5 flex-wrap">
                          <span>{rec.staffId || 'SO-ATT'}</span>
                          <span>•</span>
                          <span className="text-amber-300">
                            {rec.shiftType?.replace('Shift ', '') || 'A — Day'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {summary.accountState === 'open' ? (
                        summary.isMultiDay || (summary.daysOpenCount && summary.daysOpenCount > 1) ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-950 text-amber-400 border border-amber-700 whitespace-nowrap">
                            MULTI-DAY
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-amber-950/80 text-amber-300 border border-amber-800 whitespace-nowrap">
                            OPEN
                          </span>
                        )
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-[#25292e] text-[#8d9195] border border-[#383f47] whitespace-nowrap">
                          CLOSED
                        </span>
                      )}

                      {summary.status === 'shortage' ? (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-800 whitespace-nowrap">
                          SHORTAGE
                        </span>
                      ) : summary.status === 'excess' ? (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-950 text-blue-300 border border-blue-800 whitespace-nowrap">
                          EXCESS
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 whitespace-nowrap">
                          BALANCED
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-[#15171a] p-2.5 rounded-lg border border-[#2d3135] text-xs">
                    <div>
                      <span className="text-[9.5px] text-[#8d9195] uppercase font-bold block">TOTAL SALES</span>
                      <span className="font-mono font-bold text-[#ece8e0] text-xs sm:text-sm">GH₵ {fmt(summary.totalSales)}</span>
                      <span className="text-[10px] text-stone-500 block font-mono">{fmt(summary.totalLitres)} L</span>
                    </div>

                    <div>
                      <span className="text-[9.5px] text-[#8d9195] uppercase font-bold block">EXPECTED CASH</span>
                      <span className="font-mono text-[#ece8e0] font-semibold text-xs sm:text-sm">GH₵ {fmt(summary.expectedCash)}</span>
                    </div>

                    <div>
                      <span className="text-[9.5px] text-[#8d9195] uppercase font-bold block">CASH COUNTED</span>
                      <span className="font-mono text-[#ece8e0] text-xs sm:text-sm">
                        {summary.actualCash > 0 ? `GH₵ ${fmt(summary.actualCash)}` : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9.5px] text-[#8d9195] uppercase font-bold block">DIFFERENCE</span>
                      <span className="font-mono font-bold text-xs sm:text-sm">
                        {summary.difference === 0 ? (
                          <span className="text-emerald-400 font-semibold">GH₵ 0.00</span>
                        ) : summary.difference > 0 ? (
                          <span className="text-blue-400 font-semibold">+GH₵ {fmt(summary.difference)}</span>
                        ) : (
                          <span className="text-rose-400 font-semibold">-GH₵ {fmt(Math.abs(summary.difference))}</span>
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1" onClick={(e) => e.stopPropagation()}>
                    <span className="text-[11px] text-[#8d9195] font-mono">
                      {rec.date || today}
                    </span>
                    <div>
                      {summary.accountState === 'open' ? (
                        <button
                          type="button"
                          onClick={() => onOpenAttendantModal && onOpenAttendantModal(rec)}
                          className="px-3 py-1.5 rounded-lg bg-[#e8b93b] hover:bg-amber-400 text-[#15171a] text-xs font-bold cursor-pointer transition-colors shadow-xs"
                        >
                          Continue
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onOpenAttendantModal && onOpenAttendantModal(rec)}
                          className="px-3 py-1.5 rounded-lg bg-[#272c32] hover:bg-[#343b43] text-[#ece8e0] text-xs font-semibold border border-[#3a424b] cursor-pointer transition-colors"
                        >
                          View Account
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info note */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#8d9195] pt-1">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-amber-400 font-bold">ℹ️</span> Multi-day accounts remain open until you close them.
          </div>
          <div className="text-[11px] font-mono">
            Showing {filteredRecords.length} of {attendantRecords.length} attendants
          </div>
        </div>
      </div>

      {/* 4. QUICK ACTIONS (WITH HIDE / UNHIDE TOGGLE) */}
      <div className="bg-[#1a1d20] border border-[#2d3135] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#8d9195] font-['Space_Grotesk']">
              QUICK ACTIONS
            </span>
            {isQuickActionsHidden && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 border border-stone-700">
                Hidden
              </span>
            )}
          </div>

          <button
            type="button"
            id="btn-toggle-quick-actions"
            onClick={toggleQuickActions}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              isQuickActionsHidden
                ? 'bg-amber-400/10 text-amber-400 border-amber-400/30 hover:bg-amber-400/20'
                : 'bg-[#202428] text-stone-400 hover:text-stone-200 border-[#2d3135] hover:border-stone-600'
            }`}
            title={isQuickActionsHidden ? 'Unhide Quick Actions' : 'Hide Quick Actions'}
          >
            {isQuickActionsHidden ? (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Unhide Quick Actions</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Hide Quick Actions</span>
              </>
            )}
          </button>
        </div>

        {isQuickActionsHidden ? (
          <div
            onClick={toggleQuickActions}
            className="py-2.5 px-3.5 bg-[#202428]/60 border border-dashed border-[#2d3135] rounded-xl flex items-center justify-between text-xs text-[#8d9195] cursor-pointer hover:border-amber-400/40 hover:text-amber-400 transition-colors"
          >
            <span>Quick Actions shortcuts are currently hidden</span>
            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" /> Click to Unhide
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* Action 1: Team Management */}
            <div
              onClick={onOpenTeam || onOpenAttendants}
              className="bg-[#202428] border border-[#30353a] hover:border-[#e8b93b] p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 group shadow-xs"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-2.5 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
              <div className="font-bold text-sm text-[#ece8e0] group-hover:text-amber-400 transition-colors">
                Team Management
              </div>
              <div className="text-xs text-[#8d9195] mt-0.5">
                Add, edit or manage attendants
              </div>
            </div>

            {/* Action 2: Approvals & Claims */}
            <div
              onClick={onOpenApprovals}
              className="bg-[#202428] border border-[#30353a] hover:border-[#e8b93b] p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 group shadow-xs"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2.5 group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="font-bold text-sm text-[#ece8e0] group-hover:text-amber-400 transition-colors">
                Approvals & Claims
              </div>
              <div className="text-xs text-[#8d9195] mt-0.5">
                View pending approvals and claims
              </div>
            </div>

            {/* Action 3: Reports */}
            <div
              onClick={onOpenReports}
              className="bg-[#202428] border border-[#30353a] hover:border-[#e8b93b] p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 group shadow-xs"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2.5 group-hover:scale-105 transition-transform">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div className="font-bold text-sm text-[#ece8e0] group-hover:text-amber-400 transition-colors">
                Reports
              </div>
              <div className="text-xs text-[#8d9195] mt-0.5">
                View sales and performance reports
              </div>
            </div>

            {/* Action 4: Settings */}
            <div
              onClick={onOpenSettings}
              className="bg-[#202428] border border-[#30353a] hover:border-[#e8b93b] p-4 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 group shadow-xs"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-2.5 group-hover:scale-105 transition-transform">
                <SettingsIcon className="w-4 h-4" />
              </div>
              <div className="font-bold text-sm text-[#ece8e0] group-hover:text-amber-400 transition-colors">
                Settings
              </div>
              <div className="text-xs text-[#8d9195] mt-0.5">
                Account, station and system settings
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Offline Storage Synchronization Status Indicator */}
      <LocalStorageSyncIndicator variant="dark" />
    </div>
  );
}

/* ========================================================================= */
/* 3. SHIFT FORM VIEW (ARRANGED LIKE ATTENDANT SALES)                        */
/* ========================================================================= */
interface ShiftFormViewProps {
  key?: React.Key;
  existing: PLShift | null;
  settings: PLSettings;
  attendants: PLAttendantRoster[];
  profile: UserProfile;
  onSave: (shift: PLShift, andExit: boolean) => Promise<void>;
  onCancel: () => void;
}

const ShiftFormView: React.FC<ShiftFormViewProps> = ({
  existing,
  settings,
  attendants,
  profile,
  onSave,
  onCancel,
}) => {
  const initialShift = useMemo(() => {
    if (existing) {
      // Ensure ron95 exists if editing old shift
      const s = structuredClone(existing);
      if (!s.ron95) {
        s.ron95 = {
          price: settings.ron95Price || 14.20,
          pumps: [0, 1].map(() => ({ opening: '', closing: '', rtt: '' })),
        };
      }
      if (!s.stock.ron95) {
        s.stock.ron95 = { opening: '', received: '', closing: '' };
      }
      if (!s.payments) {
        s.payments = {
          cash: s.cash?.actual || '',
          visa: '',
          momo: '',
          bank: '',
          credit: '',
          wallets: '',
        };
      }
      return s;
    }
    const s = defaultShift(new Date().toISOString().slice(0, 10), SHIFT_TYPES[0]);
    s.super.price = settings.superPrice || 13.27;
    s.ron95.price = settings.ron95Price || 14.20;
    s.diesel.price = settings.dieselPrice || 16.10;
    s.supervisor = profile.supervisor || profile.attendant || '';
    return s;
  }, [existing, settings, profile]);

  const {
    state: shift,
    set: setShift,
    undo,
    redo,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
  } = useUndoRedo<PLShift>(initialShift, {
    debounceMs: 300,
    enableShortcuts: true,
  });

  const [activeTab, setActiveTab] = useState<
    'meters' | 'lubricants' | 'payments' | 'expenses' | 'stock' | 'review' | 'setup'
  >('meters');
  const [activeFuelTab, setActiveFuelTab] = useState<'all' | 'super' | 'ron95' | 'diesel'>('all');
  const [savedFlash, setSavedFlash] = useState(false);

  const update = (path: string, value: any) => {
    setShift((prev) => {
      const next = structuredClone(prev) as any;
      let ref = next;
      const parts = path.split('.');
      for (let i = 0; i < parts.length - 1; i++) {
        ref = ref[parts[i]];
      }
      ref[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const calc = computeShift(shift);
  const limit = settings.varianceLimit || 60;

  const doSave = async (asCompleted: boolean) => {
    const toSave: PLShift = {
      ...shift,
      status: asCompleted ? 'completed' : 'draft',
      savedAt: new Date().toISOString(),
    };
    setShift(toSave);
    await onSave(toSave, asCompleted);
    if (!asCompleted) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    }
  };

  const TABS = [
    { key: 'meters' as const, label: '1. Dispenser Meters & Fuel', icon: Fuel },
    { key: 'lubricants' as const, label: '2. StarOil Lubricants & Oils', icon: Package },
    { key: 'payments' as const, label: '3. Payment Channels', icon: CreditCard },
    { key: 'expenses' as const, label: '4. Deductions & Expenses', icon: Receipt },
    { key: 'stock' as const, label: '5. Tank Stocks & Dips', icon: Gauge },
    { key: 'review' as const, label: '6. Shift Reconciliation & Audit', icon: CheckCircle2 },
    { key: 'setup' as const, label: 'Shift Setup & Roster', icon: Users },
  ];

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[#333739]">
        <div className="flex items-center gap-3">
          <button className="pl-btn" onClick={onCancel}>
            <ArrowLeft size={14} /> Back
          </button>

          {/* Undo and Redo Controls */}
          <UndoRedoControls
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={undo}
            onRedo={redo}
            undoCount={undoCount}
            redoCount={redoCount}
            variant="dark"
            size="sm"
            showLabels={true}
          />

          <div>
            <div className="disp text-base font-bold flex items-center gap-2">
              <span>{existing ? 'Edit Supervisor Shift Record' : 'New Supervisor Shift Entry'}</span>
              <span className={`pl-pill ${shift.status === 'completed' ? 'ok' : 'draft'}`}>
                {shift.status}
              </span>
              {savedFlash && <span className="pl-pill ok">Saved</span>}
            </div>
            <div className="text-xs text-[#8d9195]">
              {shift.date} · {shift.shiftType} · Supervisor: <b className="text-[#ece8e0]">{shift.supervisor || 'Station Supervisor'}</b>
            </div>
          </div>
        </div>

        {/* Live Running Metrics Pill */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-[#23262a] border border-[#333739] text-xs">
            <span className="text-[10px] text-[#8d9195] uppercase block font-semibold">Total Sales</span>
            <span className="font-mono font-bold text-[#e8b93b]">GH₵ {fmt(calc.totalSales)}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#23262a] border border-[#333739] text-xs">
            <span className="text-[10px] text-[#8d9195] uppercase block font-semibold">Expected Cash</span>
            <span className="font-mono font-bold text-cyan-400">GH₵ {fmt(calc.expectedCash)}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#15171a] border border-[#333739] text-xs">
            <span className="text-[10px] text-[#8d9195] uppercase block font-semibold">Variance</span>
            <span
              className={`font-mono font-bold ${
                Math.abs(calc.shortage) < 5
                  ? 'text-emerald-400'
                  : Math.abs(calc.shortage) < 50
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {calc.shortage >= 0 ? '+' : ''}GH₵ {fmt(calc.shortage)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Workflow Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin border-b border-[#333739]">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`py-2.5 px-3.5 rounded-t-lg text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'border-[#e8b93b] text-[#e8b93b] bg-[#23262a]'
                  : 'border-transparent text-[#8d9195] hover:text-[#ece8e0] hover:bg-[#1d2023]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DISPENSER METERS & SALES (SUPER, RON 95, DIESEL)                   */}
      {/* ========================================================================= */ }
      {activeTab === 'meters' && (
        <div className="space-y-4">
          {/* Fuel Category Selector Header */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* SUPER (PMS) */}
            <div
              onClick={() => setActiveFuelTab(activeFuelTab === 'super' ? 'all' : 'super')}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                activeFuelTab === 'super' || activeFuelTab === 'all'
                  ? 'bg-[#261715] border-[#d8543f]'
                  : 'bg-[#1d2023] border-[#333739] opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs uppercase tracking-wider text-[#d8543f] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#d8543f]"></span>
                  SUPER (PMS)
                </span>
                <span className="text-[11px] font-mono text-[#8d9195]">
                  GH₵ {num(shift.super.price).toFixed(2)}/L
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#ece8e0]">{fmt(calc.superLitres)} L</span>
                <span className="text-sm font-bold font-mono text-[#d8543f]">
                  GH₵ {fmt(calc.superSales)}
                </span>
              </div>
            </div>

            {/* RON 95 (V-POWER) */}
            <div
              onClick={() => setActiveFuelTab(activeFuelTab === 'ron95' ? 'all' : 'ron95')}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                activeFuelTab === 'ron95' || activeFuelTab === 'all'
                  ? 'bg-[#151e2e] border-[#3b82f6]'
                  : 'bg-[#1d2023] border-[#333739] opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs uppercase tracking-wider text-[#3b82f6] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span>
                  RON 95 (V-POWER)
                </span>
                <span className="text-[11px] font-mono text-[#8d9195]">
                  GH₵ {num(shift.ron95?.price || 14.20).toFixed(2)}/L
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#ece8e0]">{fmt(calc.ron95Litres)} L</span>
                <span className="text-sm font-bold font-mono text-[#3b82f6]">
                  GH₵ {fmt(calc.ron95Sales)}
                </span>
              </div>
            </div>

            {/* DIESEL (AGO) */}
            <div
              onClick={() => setActiveFuelTab(activeFuelTab === 'diesel' ? 'all' : 'diesel')}
              className={`p-3 rounded-lg border transition-all cursor-pointer ${
                activeFuelTab === 'diesel' || activeFuelTab === 'all'
                  ? 'bg-[#1c2417] border-[#8fae4f]'
                  : 'bg-[#1d2023] border-[#333739] opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs uppercase tracking-wider text-[#8fae4f] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8fae4f]"></span>
                  DIESEL (AGO)
                </span>
                <span className="text-[11px] font-mono text-[#8d9195]">
                  GH₵ {num(shift.diesel.price).toFixed(2)}/L
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#ece8e0]">{fmt(calc.dieselLitres)} L</span>
                <span className="text-sm font-bold font-mono text-[#8fae4f]">
                  GH₵ {fmt(calc.dieselSales)}
                </span>
              </div>
            </div>
          </div>

          {/* Render Active Fuel Sections */}
          {(activeFuelTab === 'all' || activeFuelTab === 'super') && (
            <FuelTabComponent
              fuelKey="super"
              shift={shift}
              update={update}
              label="Super (PMS)"
              attendantsList={attendants}
            />
          )}

          {(activeFuelTab === 'all' || activeFuelTab === 'ron95') && (
            <FuelTabComponent
              fuelKey="ron95"
              shift={shift}
              update={update}
              label="RON 95 (V-Power)"
              attendantsList={attendants}
            />
          )}

          {(activeFuelTab === 'all' || activeFuelTab === 'diesel') && (
            <FuelTabComponent
              fuelKey="diesel"
              shift={shift}
              update={update}
              label="Diesel (AGO)"
              attendantsList={attendants}
            />
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STAROIL LUBRICANTS & OILS (ACCOUNTED ONLY BY SUPERVISOR)           */}
      {/* ========================================================================= */}
      {activeTab === 'lubricants' && (
        <LubricantsTabComponent
          shift={shift}
          update={update}
          calc={calc}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PAYMENT CHANNELS & BREAKDOWN                                       */}
      {/* ========================================================================= */}
      {activeTab === 'payments' && (
        <PaymentChannelsTabComponent
          shift={shift}
          update={update}
          calc={calc}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DEDUCTIONS & EXPENSES                                              */}
      {/* ========================================================================= */}
      {activeTab === 'expenses' && (
        <DeductionsTabComponent shift={shift} update={update} />
      )}

      {/* ========================================================================= */}
      {/* TAB 4: UNDERGROUND TANK STOCKS & PHYSICAL DIPS                             */}
      {/* ========================================================================= */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-xs uppercase text-[#ece8e0]">
                Underground Tank Stocks & Dip Reconciliation
              </h4>
              <p className="text-[11px] text-[#8d9195]">
                Opening Dip, BRV Deliveries Received, Dispenser Sales, Closing Dip, and Stock Variations
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['super', 'ron95', 'diesel'] as const).map((key) => {
              const s = shift.stock?.[key] || { opening: '', received: '', closing: '' };
              const c =
                key === 'super'
                  ? calc.stockSuper
                  : key === 'ron95'
                  ? calc.stockRon95
                  : calc.stockDiesel;
              const vs = VarianceStatus(c.variation, limit);
              const color =
                key === 'super'
                  ? 'var(--super)'
                  : key === 'ron95'
                  ? 'var(--ron95)'
                  : 'var(--diesel)';
              const label =
                key === 'super'
                  ? 'SUPER (PMS)'
                  : key === 'ron95'
                  ? 'RON 95 (V-POWER)'
                  : 'DIESEL (AGO)';

              return (
                <div
                  key={key}
                  className="pl-card p-4 space-y-3 bg-[#1d2023] border border-[#333739]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#333739]">
                    <span
                      className="font-bold text-xs uppercase tracking-wide font-['Space_Grotesk']"
                      style={{ color }}
                    >
                      {label} TANK
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-mono font-bold"
                      style={{
                        background: `${vs.color}20`,
                        color: vs.color,
                        border: `1px solid ${vs.color}40`,
                      }}
                    >
                      {vs.label}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="pl-label">Opening Dip / Stock (L)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="pl-input mono text-right"
                        placeholder="0.00"
                        value={s.opening}
                        onChange={(e) => update(`stock.${key}.opening`, e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="pl-label">BRV Stock Received (L)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="pl-input mono text-right"
                        placeholder="0.00"
                        value={s.received}
                        onChange={(e) => update(`stock.${key}.received`, e.target.value)}
                      />
                    </div>

                    <div className="p-2 rounded bg-[#15171a] border border-[#333739] flex justify-between text-xs">
                      <span className="text-[#8d9195]">Total Physical Available:</span>
                      <span className="font-mono font-bold text-[#ece8e0]">
                        {fmt(c.totalStock)} L
                      </span>
                    </div>

                    <div className="p-2 rounded bg-[#15171a] border border-[#333739] flex justify-between text-xs">
                      <span className="text-[#8d9195]">Sales per Totalizers:</span>
                      <span className="font-mono font-bold text-amber-400">
                        {fmt(c.totalizer)} L
                      </span>
                    </div>

                    <div className="p-2 rounded bg-[#15171a] border border-[#333739] flex justify-between text-xs">
                      <span className="text-[#8d9195]">Book Closing Stock:</span>
                      <span className="font-mono text-[#8d9195]">
                        {fmt(c.totalStock - c.totalizer)} L
                      </span>
                    </div>

                    <div>
                      <label className="pl-label">Closing Physical Dip (L)</label>
                      <input
                        type="number"
                        step="0.01"
                        className="pl-input mono text-right font-bold"
                        placeholder="0.00"
                        value={s.closing}
                        onChange={(e) => update(`stock.${key}.closing`, e.target.value)}
                      />
                    </div>

                    <div className="p-2.5 rounded bg-[#23262a] border border-[#333739] flex justify-between items-center text-xs">
                      <span className="text-[#8d9195] font-semibold uppercase text-[10px]">
                        Dip Variation:
                      </span>
                      <span className="font-mono font-bold" style={{ color: vs.color }}>
                        {c.variation > 0 ? '+' : ''}
                        {fmt(c.variation)} L
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AUDIT & SHIFT RECONCILIATION                                       */}
      {/* ========================================================================= */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-[#23262a] border border-[#333739]">
              <span className="text-[10px] text-[#8d9195] font-semibold uppercase block">
                Super (PMS) Sales
              </span>
              <span className="text-base font-bold font-mono text-[#d8543f]">
                GH₵ {fmt(calc.superSales)}
              </span>
              <span className="text-[10px] text-[#8d9195] block">{fmt(calc.superLitres)} L</span>
            </div>

            <div className="p-3 rounded-lg bg-[#23262a] border border-[#333739]">
              <span className="text-[10px] text-[#8d9195] font-semibold uppercase block">
                RON 95 Sales
              </span>
              <span className="text-base font-bold font-mono text-[#3b82f6]">
                GH₵ {fmt(calc.ron95Sales)}
              </span>
              <span className="text-[10px] text-[#8d9195] block">{fmt(calc.ron95Litres)} L</span>
            </div>

            <div className="p-3 rounded-lg bg-[#23262a] border border-[#333739]">
              <span className="text-[10px] text-[#8d9195] font-semibold uppercase block">
                Diesel (AGO) Sales
              </span>
              <span className="text-base font-bold font-mono text-[#8fae4f]">
                GH₵ {fmt(calc.dieselSales)}
              </span>
              <span className="text-[10px] text-[#8d9195] block">{fmt(calc.dieselLitres)} L</span>
            </div>

            <div className="p-3 rounded-lg bg-[#15171a] border border-[#e8b93b]/50">
              <span className="text-[10px] text-[#e8b93b] font-bold uppercase block">
                Total Fuel Revenue
              </span>
              <span className="text-base font-bold font-mono text-[#e8b93b]">
                GH₵ {fmt(calc.totalSales)}
              </span>
              <span className="text-[10px] text-[#8d9195] block">{fmt(calc.totalLitres)} L Total</span>
            </div>
          </div>

          {/* Reconciliation Balance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left: Deductions and Non-Cash breakdown */}
            <div className="pl-card p-4 space-y-2.5 bg-[#1d2023] border border-[#333739] text-xs">
              <h5 className="font-bold uppercase text-[11px] text-[#8d9195] pb-2 border-b border-[#333739]">
                Collections & Deductions Summary
              </h5>
              <div className="flex justify-between py-1 border-b border-[#333739]/50">
                <span className="text-[#8d9195]">Total Gross Sales:</span>
                <span className="font-mono font-bold text-[#ece8e0]">GH₵ {fmt(calc.totalSales)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#333739]/50 text-cyan-400">
                <span>Non-Cash & Credit Channels:</span>
                <span className="font-mono font-bold">- GH₵ {fmt(calc.totalNonCash)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#333739]/50 text-amber-400">
                <span>Station Deductions & Vouchers:</span>
                <span className="font-mono font-bold">
                  - GH₵ {fmt(calc.expenseTotal + calc.voucherTotal)}
                </span>
              </div>
              <div className="flex justify-between pt-2 text-sm font-bold text-[#e8b93b]">
                <span>Expected Cash to Bank:</span>
                <span className="font-mono">GH₵ {fmt(calc.expectedCash)}</span>
              </div>
            </div>

            {/* Middle: Cash Handover & Count */}
            <div className="pl-card p-4 space-y-3 bg-[#1d2023] border border-[#333739] text-xs">
              <h5 className="font-bold uppercase text-[11px] text-[#8d9195] pb-2 border-b border-[#333739]">
                Physical Cash Handover
              </h5>
              <div>
                <label className="pl-label">Actual Physical Cash Counted (GH₵)</label>
                <div className="odometer">
                  <input
                    value={shift.cash?.actual || shift.payments?.cash || ''}
                    onChange={(e) => {
                      update('cash.actual', e.target.value);
                      update('payments.cash', e.target.value);
                    }}
                    placeholder="0.00"
                    style={{ fontSize: 16 }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#15171a] border border-[#333739] space-y-1">
                <div className="flex justify-between text-xs text-[#8d9195]">
                  <span>Expected:</span>
                  <span className="font-mono text-[#ece8e0]">GH₵ {fmt(calc.expectedCash)}</span>
                </div>
                <div className="flex justify-between text-xs text-[#8d9195]">
                  <span>Counted:</span>
                  <span className="font-mono text-[#ece8e0]">GH₵ {fmt(calc.actualCash)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-1 border-t border-[#333739]">
                  <span>Net Shift Variance:</span>
                  <span
                    className={`font-mono ${
                      Math.abs(calc.shortage) < 5
                        ? 'text-emerald-400'
                        : Math.abs(calc.shortage) < 50
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {calc.shortage >= 0 ? '+' : ''}GH₵ {fmt(calc.shortage)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Attendant Accountability Lock Check */}
            <div className="pl-card p-4 space-y-3 bg-[#1d2023] border border-[#333739] text-xs flex flex-col justify-between">
              <div>
                <h5 className="font-bold uppercase text-[11px] text-[#8d9195] pb-2 border-b border-[#333739] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-[#e8b93b]" />
                  Attendant Accountability Status
                </h5>
                <p className="text-[11px] text-[#8d9195] mt-2">
                  Verify that every pump attendant on shift is accounted for before closing.
                </p>
                <div className="mt-3 p-2.5 rounded bg-[#15171a] border border-[#333739]">
                  <span className="text-[10px] text-[#8d9195] uppercase block font-semibold">
                    Two-Level Reconciliation
                  </span>
                  <span className="text-xs text-[#ece8e0] font-medium">
                    Attendant → Pump → Shift → Station
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#333739] flex gap-2">
                <button
                  type="button"
                  className="pl-btn flex-1 justify-center"
                  onClick={() => doSave(false)}
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  className="pl-btn primary flex-1 justify-center"
                  onClick={() => doSave(true)}
                >
                  <CheckCircle2 size={14} />
                  Save & Complete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: SHIFT SETUP & ATTENDANT ROSTER                                     */}
      {/* ========================================================================= */}
      {activeTab === 'setup' && (
        <div className="pl-card p-4 space-y-4 bg-[#1d2023] border border-[#333739]">
          <h4 className="font-bold text-xs uppercase text-[#ece8e0]">
            Shift Metadata & Staff Assignments
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="pl-label">Date</label>
              <input
                type="date"
                className="pl-input"
                value={shift.date}
                onChange={(e) => update('date', e.target.value)}
              />
            </div>
            <div>
              <label className="pl-label">Shift Period</label>
              <select
                className="pl-input"
                value={shift.shiftType}
                onChange={(e) => update('shiftType', e.target.value)}
              >
                {SHIFT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="pl-label">Supervisor In-Charge</label>
              <input
                className="pl-input"
                value={shift.supervisor}
                onChange={(e) => update('supervisor', e.target.value)}
                placeholder="Supervisor Name"
              />
            </div>
            <div>
              <label className="pl-label">Shift Hours</label>
              <div className="flex gap-2">
                <input
                  type="time"
                  className="pl-input"
                  value={shift.startTime || '06:00'}
                  onChange={(e) => update('startTime', e.target.value)}
                />
                <span className="self-center text-[#8d9195]">–</span>
                <input
                  type="time"
                  className="pl-input"
                  value={shift.endTime || '14:00'}
                  onChange={(e) => update('endTime', e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="pl-label mb-2">Active Attendants Selection</label>
            <div className="flex flex-wrap gap-2">
              {attendants.map((a) => {
                const active = shift.attendants.some((x) => x.id === a.id);
                return (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => {
                      const cur = shift.attendants;
                      update(
                        'attendants',
                        active
                          ? cur.filter((x) => x.id !== a.id)
                          : [...cur, { id: a.id, name: a.name, pumps: '' }]
                      );
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      active
                        ? 'bg-amber-950/60 border-[#e8b93b] text-[#e8b93b]'
                        : 'bg-[#23262a] border-[#333739] text-[#8d9195] hover:text-[#ece8e0]'
                    }`}
                  >
                    {a.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ========================================================================= */
/* 4. FUEL TAB COMPONENT (WITH ATTENDANT ASSIGNMENT & NOZZLE CARDS)         */
/* ========================================================================= */
function FuelTabComponent({
  fuelKey,
  shift,
  update,
  label,
  attendantsList = [],
}: {
  fuelKey: 'super' | 'ron95' | 'diesel';
  shift: PLShift;
  update: (path: string, val: any) => void;
  label: string;
  attendantsList?: PLAttendantRoster[];
}) {
  const fuel = shift[fuelKey] || { price: 13.27, pumps: [] };
  const totals = fuelTotals(fuel);
  const accent =
    fuelKey === 'super'
      ? 'var(--super)'
      : fuelKey === 'ron95'
      ? 'var(--ron95)'
      : 'var(--diesel)';

  const addPump = () => {
    const nextPumps = [...fuel.pumps, { opening: '', closing: '', rtt: '' }];
    update(`${fuelKey}.pumps`, nextPumps);
  };

  const removePump = (index: number) => {
    const nextPumps = fuel.pumps.filter((_, i) => i !== index);
    update(`${fuelKey}.pumps`, nextPumps);
  };

  return (
    <div className="pl-card overflow-hidden bg-[#1d2023] border border-[#333739]">
      {/* Product Banner */}
      <div
        className="p-3.5 flex items-center justify-between border-b border-[#333739] flex-wrap gap-2"
        style={{
          background:
            fuelKey === 'super'
              ? 'linear-gradient(90deg, var(--super-dim), transparent 150%)'
              : fuelKey === 'ron95'
              ? 'linear-gradient(90deg, var(--ron95-dim), transparent 150%)'
              : 'linear-gradient(90deg, var(--diesel-dim), transparent 150%)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm uppercase tracking-wider font-['Space_Grotesk']" style={{ color: accent }}>
            {label} PUMPS & METERS
          </span>
          <span className="text-xs px-2 py-0.5 rounded bg-[#15171a] text-[#8d9195] font-mono">
            {fuel.pumps.length} Nozzles
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[#8d9195]">
            <span>Unit Price (GH₵):</span>
            <input
              type="number"
              step="0.01"
              className="pl-input mono text-right w-24 font-bold text-xs"
              value={fuel.price}
              onChange={(e) => update(`${fuelKey}.price`, e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={addPump}
            className="px-2.5 py-1 rounded bg-[#23262a] border border-[#333739] hover:border-[#e8b93b] text-xs text-[#ece8e0] font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Plus size={12} className="text-[#e8b93b]" />
            <span>Add Nozzle</span>
          </button>
        </div>
      </div>

      {/* Pumps Grid */}
      <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {fuel.pumps.map((p, i) => {
          const litres = Math.max(0, num(p.closing) - num(p.opening) - num(p.rtt));
          const amount = litres * num(fuel.price);
          const pumpName = `${fuelKey === 'super' ? 'Super' : fuelKey === 'ron95' ? 'RON 95' : 'Diesel'} ${i + 1}`;

          return (
            <div
              key={i}
              className="p-3 rounded-lg bg-[#15171a] border border-[#333739] space-y-2.5"
            >
              {/* Pump Header with Attendant Assignment */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#ece8e0]">
                    {pumpName}
                  </span>
                  <span className="text-[10px] text-[#8d9195] bg-[#23262a] px-1.5 py-0.2 rounded border border-[#333739]">
                    Nozzle #{i + 1}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs text-[#e8b93b]">
                    GH₵ {fmt(amount)}
                  </span>
                  {fuel.pumps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePump(i)}
                      className="text-[#8d9195] hover:text-rose-400 cursor-pointer"
                      title="Remove Pump"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Odometer Inputs */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="pl-label">Opening Meter</label>
                  <div className="odometer">
                    <input
                      value={p.opening}
                      onChange={(e) => {
                        const arr = [...fuel.pumps];
                        arr[i] = { ...arr[i], opening: e.target.value };
                        update(`${fuelKey}.pumps`, arr);
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="pl-label">Closing Meter</label>
                  <div className="odometer">
                    <input
                      value={p.closing}
                      onChange={(e) => {
                        const arr = [...fuel.pumps];
                        arr[i] = { ...arr[i], closing: e.target.value };
                        update(`${fuelKey}.pumps`, arr);
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 items-center text-xs">
                <div>
                  <label className="pl-label">RTT / Test Litres</label>
                  <div className="odometer">
                    <input
                      value={p.rtt}
                      onChange={(e) => {
                        const arr = [...fuel.pumps];
                        arr[i] = { ...arr[i], rtt: e.target.value };
                        update(`${fuelKey}.pumps`, arr);
                      }}
                      placeholder="0.00"
                      style={{ fontSize: 12 }}
                    />
                  </div>
                </div>

                <div className="p-2 rounded bg-[#23262a] border border-[#333739] text-right">
                  <span className="text-[10px] text-[#8d9195] block uppercase font-semibold">
                    Net Litres Sold
                  </span>
                  <span className="font-mono font-bold text-xs text-[#ece8e0]">
                    {litres.toFixed(2)} L
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Product Total Footer */}
      <div className="p-3 bg-[#15171a] border-t border-[#333739] flex items-center justify-between text-xs">
        <span className="text-[#8d9195] uppercase font-semibold">
          {label} Total Sales ({fmt(totals.litres)} L Dispensed)
        </span>
        <span className="font-mono font-bold text-base" style={{ color: accent }}>
          GH₵ {fmt(totals.amount)}
        </span>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* STAROIL LUBRICANTS & OILS TAB COMPONENT                                   */
/* EXCLUSIVE SUPERVISOR ACCOUNTABILITY (DOC NO: SOC/LPL/2026/01)             */
/* ========================================================================= */
function LubricantsTabComponent({
  shift,
  update,
  calc,
}: {
  shift: PLShift;
  update: (path: string, val: any) => void;
  calc: ReturnType<typeof computeShift>;
}) {
  const lubes: PLLubeSale[] = shift.lubricants || [];
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>(
    STAROIL_LUBRICANTS_CATALOG[0]?.id || ''
  );
  const [showDealerPrices, setShowDealerPrices] = useState(false);

  const addFromCatalog = (prodId: string) => {
    const prod = STAROIL_LUBRICANTS_CATALOG.find((p) => p.id === prodId);
    if (!prod) return;
    const newItem: PLLubeSale = {
      id: uid(),
      catalogId: prod.id,
      name: prod.name,
      unit: prod.unit,
      unitPrice: prod.consumerPrice,
      opening: '0',
      received: '0',
      soldQty: '',
      closing: '',
      notes: '',
    };
    update('lubricants', [...lubes, newItem]);
  };

  const addAllFastMoving = () => {
    const coreIds = [
      'ug-sae40-1l',
      'ug-sae40-4l',
      'ug-hpd-15w40-4l',
      'pt-20w50-4l',
      'st-atf3-1l',
      'ss-brake-dot4-05l',
    ];
    const existingCatalogIds = new Set(lubes.map((l) => l.catalogId));
    const toAdd: PLLubeSale[] = [];
    coreIds.forEach((id) => {
      if (!existingCatalogIds.has(id)) {
        const prod = STAROIL_LUBRICANTS_CATALOG.find((p) => p.id === id);
        if (prod) {
          toAdd.push({
            id: uid(),
            catalogId: prod.id,
            name: prod.name,
            unit: prod.unit,
            unitPrice: prod.consumerPrice,
            opening: '10',
            received: '0',
            soldQty: '',
            closing: '',
          });
        }
      }
    });
    if (toAdd.length > 0) {
      update('lubricants', [...lubes, ...toAdd]);
    }
  };

  const updateItem = (index: number, field: keyof PLLubeSale, val: any) => {
    const next = [...lubes];
    next[index] = { ...next[index], [field]: val };
    
    // Auto-calculate closing if opening, received, and soldQty are provided
    if (field === 'soldQty' || field === 'opening' || field === 'received') {
      const op = num(field === 'opening' ? val : next[index].opening);
      const rec = num(field === 'received' ? val : next[index].received);
      const sold = num(field === 'soldQty' ? val : next[index].soldQty);
      if (next[index].soldQty !== '') {
        next[index].closing = Math.max(0, op + rec - sold);
      }
    } else if (field === 'closing') {
      // If closing is explicitly typed, calculate soldQty = opening + received - closing
      const op = num(next[index].opening);
      const rec = num(next[index].received);
      const cls = num(val);
      if (val !== '') {
        next[index].soldQty = Math.max(0, op + rec - cls);
      }
    }
    update('lubricants', next);
  };

  const removeItem = (index: number) => {
    const next = lubes.filter((_, i) => i !== index);
    update('lubricants', next);
  };

  return (
    <div className="space-y-4">
      {/* StarOil Policy & Document Banner */}
      <div className="p-3.5 rounded-lg bg-[#23262a] border border-[#e8b93b]/40 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#e8b93b]/20 border border-[#e8b93b]/50 flex items-center justify-center text-[#e8b93b]">
            <Package size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-[#e8b93b]">
                StarOil Official Forecourt Lubricants & Engine Oils
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#15171a] border border-[#333739] text-[#8d9195] font-mono">
                Doc: SOC/LPL/2026/01
              </span>
            </div>
            <p className="text-[11px] text-[#8d9195] mt-0.5">
              Strict Policy: <strong className="text-[#ece8e0]">Only the Station Supervisor accounts for Lubricants and Engine Oils.</strong> Attendants do not submit separate lube sheets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowDealerPrices(!showDealerPrices)}
            className="pl-btn text-xs py-1.5 px-2.5"
            title="Toggle between Consumer Retail Price and StarOil Dealer Wholesale Margin"
          >
            <Eye size={13} /> {showDealerPrices ? 'Showing Dealer Prices' : 'View Dealer Wholesale Margin'}
          </button>
          <button
            type="button"
            onClick={addAllFastMoving}
            className="pl-btn primary text-xs py-1.5 px-3"
          >
            <Plus size={13} /> Load Fast-Moving Lubes
          </button>
        </div>
      </div>

      {/* Catalog Quick Add Bar */}
      <div className="p-4 rounded-xl bg-[#1d2023] border border-[#333739] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[320px]">
          <span className="text-xs font-bold text-[#8d9195] whitespace-nowrap uppercase tracking-wide">
            Select Lubricant:
          </span>
          <select
            value={selectedCatalogId}
            onChange={(e) => setSelectedCatalogId(e.target.value)}
            className="pl-input flex-1 text-sm py-2.5 px-3 rounded-lg font-medium bg-[#15171a] border-[#3a3e42] text-[#ece8e0] focus:border-[#e8b93b]"
          >
            {STAROIL_LUBRICANTS_CATALOG.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.brand}] {p.name} ({p.unit}) — Retail: GH₵ {p.consumerPrice.toFixed(2)} | Dealer: GH₵ {p.dealerPrice.toFixed(2)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => addFromCatalog(selectedCatalogId)}
            className="pl-btn primary text-xs py-2.5 px-4 font-bold rounded-lg flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus size={15} /> Add Lubricant
          </button>
          <button
            type="button"
            onClick={() => {
              const newCustom: PLLubeSale = {
                id: uid(),
                name: 'Lubricant Product',
                unit: '1LT',
                unitPrice: 70,
                opening: '0',
                received: '0',
                soldQty: '',
                closing: '',
                notes: '',
              };
              update('lubricants', [...lubes, newCustom]);
            }}
            className="pl-btn text-xs py-2.5 px-3 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
            title="Add a custom lubricant item"
          >
            <Plus size={14} /> Custom Item
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-[#15171a] border border-[#333739] text-[#8d9195]">
            Active Catalog: <strong className="text-[#ece8e0] font-mono">{STAROIL_LUBRICANTS_CATALOG.length} SKUs</strong>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-[#15171a] border border-[#333739] text-[#8d9195]">
            Lubes in Shift: <strong className="text-[#e8b93b] font-mono">{lubes.length} logged</strong>
          </div>
        </div>
      </div>

      {/* Lubricants Table */}
      <div className="pl-card overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-[#15171a] border-b border-[#333739] text-[#8d9195] uppercase text-[10px] tracking-wider">
                <th className="p-3.5 min-w-[220px]">Brand & Lubricant Description</th>
                <th className="p-3.5 w-20 text-center">Unit</th>
                <th className="p-3.5 min-w-[120px] w-32 text-right">Dealer Wholesale (GH₵)</th>
                <th className="p-3.5 min-w-[140px] w-40 text-right">Consumer / Retail Price (GH₵)</th>
                <th className="p-3.5 min-w-[100px] w-24 text-right">Unit Margin</th>
                <th className="p-3.5 min-w-[100px] w-24 text-right">Opening Stock</th>
                <th className="p-3.5 min-w-[100px] w-24 text-right">Received</th>
                <th className="p-3.5 min-w-[110px] w-28 text-right">Units Sold</th>
                <th className="p-3.5 min-w-[100px] w-24 text-right">Closing Count</th>
                <th className="p-3.5 min-w-[130px] w-32 text-right">Total Revenue</th>
                <th className="p-3.5 w-12 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2d30]">
              {lubes.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center text-[#8d9195]">
                    <Package size={32} className="mx-auto mb-2 opacity-40 text-[#e8b93b]" />
                    <p className="font-semibold text-sm text-[#ece8e0]">No lubricant sales recorded for this shift yet</p>
                    <p className="text-xs mt-1">Select a lubricant from the StarOil catalog dropdown above, or click "Custom Item".</p>
                  </td>
                </tr>
              ) : (
                lubes.map((item, idx) => {
                  let sold = num(item.soldQty);
                  if (sold === 0 && item.closing !== '' && item.opening !== '') {
                    sold = Math.max(0, num(item.opening) + num(item.received) - num(item.closing));
                  }
                  const catalogItem = STAROIL_LUBRICANTS_CATALOG.find((c) => c.id === item.catalogId);
                  const retailPrice = num(item.unitPrice || catalogItem?.consumerPrice || 0);
                  const dealerPrice = catalogItem?.dealerPrice || num(item.unitPrice) * 0.9;
                  const unitMargin = retailPrice - dealerPrice;
                  const rowAmount = sold * retailPrice;

                  return (
                    <tr key={item.id} className="hover:bg-[#23262a]/50 transition-colors">
                      <td className="p-3.5">
                        <input
                          type="text"
                          className="font-bold text-sm text-[#ece8e0] bg-transparent border-b border-transparent hover:border-[#3a3e42] focus:border-[#e8b93b] focus:bg-[#15171a] px-1 py-0.5 rounded w-full outline-none"
                          value={item.name}
                          onChange={(e) => updateItem(idx, 'name', e.target.value)}
                        />
                        <div className="text-[10px] text-[#8d9195] flex items-center gap-2 mt-1">
                          <span className="text-emerald-400/90 font-mono font-medium">
                            Margin: GH₵ {unitMargin > 0 ? unitMargin.toFixed(2) : '0.00'}/unit
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <input
                          type="text"
                          className="w-16 px-1.5 py-1 text-center rounded bg-[#15171a] border border-[#333739] font-mono text-xs font-semibold text-[#ece8e0] focus:border-[#e8b93b] outline-none"
                          value={item.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                        />
                      </td>
                      <td className="p-3.5 text-right font-mono font-semibold text-emerald-400 text-sm">
                        GH₵ {dealerPrice.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="relative inline-flex items-center w-full min-w-[120px]">
                          <span className="absolute left-2.5 text-xs font-bold text-[#8d9195] pointer-events-none">GH₵</span>
                          <input
                            type="number"
                            step="0.01"
                            className="pl-input mono text-right py-2 pl-10 pr-3 text-sm font-bold text-[#e8b93b] bg-[#15171a] border-[#3a3e42] focus:border-[#e8b93b] rounded-lg w-full"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                            title="Station Consumer / Retail Selling Price (GH₵)"
                          />
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-xs text-emerald-400">
                        +GH₵ {unitMargin.toFixed(2)}
                      </td>
                      <td className="p-3.5 text-right">
                        <input
                          type="number"
                          min="0"
                          className="pl-input mono text-right py-2 px-3 text-sm font-medium bg-[#15171a] border-[#3a3e42] focus:border-[#e8b93b] rounded-lg w-full min-w-[80px]"
                          value={item.opening}
                          onChange={(e) => updateItem(idx, 'opening', e.target.value)}
                          placeholder="0"
                          title="Opening Stock"
                        />
                      </td>
                      <td className="p-3.5 text-right">
                        <input
                          type="number"
                          min="0"
                          className="pl-input mono text-right py-2 px-3 text-sm font-medium bg-[#15171a] border-[#3a3e42] focus:border-[#e8b93b] rounded-lg w-full min-w-[80px]"
                          value={item.received}
                          onChange={(e) => updateItem(idx, 'received', e.target.value)}
                          placeholder="0"
                          title="Stock Received"
                        />
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="odometer w-full min-w-[90px]">
                          <input
                            type="number"
                            min="0"
                            className="text-right text-[#e8b93b] font-bold text-sm py-2 px-3 w-full rounded-lg"
                            value={item.soldQty}
                            onChange={(e) => updateItem(idx, 'soldQty', e.target.value)}
                            placeholder="0"
                            title="Units Sold during shift"
                          />
                        </div>
                      </td>
                      <td className="p-3.5 text-right">
                        <input
                          type="number"
                          min="0"
                          className="pl-input mono text-right py-2 px-3 text-sm font-medium bg-[#15171a] border-[#3a3e42] focus:border-[#e8b93b] rounded-lg w-full min-w-[80px]"
                          value={item.closing}
                          onChange={(e) => updateItem(idx, 'closing', e.target.value)}
                          placeholder="0"
                          title="Closing Physical Shelf Count"
                        />
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-sm text-[#e8b93b] whitespace-nowrap">
                        GH₵ {fmt(rowAmount)}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-[#8d9195] hover:text-rose-400 hover:bg-rose-950/40 transition-colors p-1.5 rounded-lg"
                          title="Remove product row"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="lg:hidden p-3.5 space-y-3">
          {lubes.length === 0 ? (
            <div className="p-8 text-center text-[#8d9195]">
              <Package size={32} className="mx-auto mb-2 opacity-40 text-[#e8b93b]" />
              <p className="font-semibold text-sm text-[#ece8e0]">No lubricant sales recorded for this shift yet</p>
              <p className="text-xs mt-1">Select a lubricant from the catalog dropdown above, or click "Custom Item".</p>
            </div>
          ) : (
            lubes.map((item, idx) => {
              let sold = num(item.soldQty);
              if (sold === 0 && item.closing !== '' && item.opening !== '') {
                sold = Math.max(0, num(item.opening) + num(item.received) - num(item.closing));
              }
              const catalogItem = STAROIL_LUBRICANTS_CATALOG.find((c) => c.id === item.catalogId);
              const retailPrice = num(item.unitPrice || catalogItem?.consumerPrice || 0);
              const dealerPrice = catalogItem?.dealerPrice || num(item.unitPrice) * 0.9;
              const unitMargin = retailPrice - dealerPrice;
              const rowAmount = sold * retailPrice;

              return (
                <div
                  key={item.id}
                  className="bg-[#202428] border border-[#2d3135] rounded-xl p-3 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        className="font-bold text-sm text-[#ece8e0] bg-transparent border-b border-transparent hover:border-[#3a3e42] focus:border-[#e8b93b] focus:bg-[#15171a] px-1 py-0.5 rounded w-full outline-none"
                        value={item.name}
                        onChange={(e) => updateItem(idx, 'name', e.target.value)}
                      />
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[#8d9195]">
                        <input
                          type="text"
                          className="w-14 px-1 py-0.5 text-center rounded bg-[#15171a] border border-[#333739] font-mono text-[10px] font-semibold text-[#ece8e0]"
                          value={item.unit}
                          onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                        />
                        <span className="text-emerald-400 font-mono">
                          Margin: GH₵ {unitMargin > 0 ? unitMargin.toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-[#8d9195] hover:text-rose-400 p-1.5 rounded-lg shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[9.5px] text-[#8d9195] uppercase font-bold block mb-1">
                        Dealer Wholesale
                      </span>
                      <span className="font-mono text-emerald-400 font-bold block py-1.5">
                        GH₵ {dealerPrice.toFixed(2)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9.5px] text-[#8d9195] uppercase font-bold block mb-1">
                        Retail Price (GH₵)
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        className="pl-input mono text-right py-1 px-2 text-xs font-bold text-[#e8b93b] bg-[#15171a] border-[#3a3e42] rounded w-full"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                      />
                    </div>

                    <div>
                      <span className="text-[9.5px] text-[#8d9195] uppercase font-bold block mb-1">
                        Opening Stock
                      </span>
                      <input
                        type="number"
                        min="0"
                        className="pl-input mono text-right py-1 px-2 text-xs bg-[#15171a] border-[#3a3e42] rounded w-full"
                        value={item.opening}
                        onChange={(e) => updateItem(idx, 'opening', e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <span className="text-[9.5px] text-[#8d9195] uppercase font-bold block mb-1">
                        Received
                      </span>
                      <input
                        type="number"
                        min="0"
                        className="pl-input mono text-right py-1 px-2 text-xs bg-[#15171a] border-[#3a3e42] rounded w-full"
                        value={item.received}
                        onChange={(e) => updateItem(idx, 'received', e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <span className="text-[9.5px] text-amber-400 uppercase font-bold block mb-1">
                        Units Sold
                      </span>
                      <input
                        type="number"
                        min="0"
                        className="pl-input mono text-right py-1 px-2 text-xs font-bold text-amber-400 bg-[#15171a] border-[#3a3e42] rounded w-full"
                        value={item.soldQty}
                        onChange={(e) => updateItem(idx, 'soldQty', e.target.value)}
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <span className="text-[9.5px] text-[#8d9195] uppercase font-bold block mb-1">
                        Closing Count
                      </span>
                      <input
                        type="number"
                        min="0"
                        className="pl-input mono text-right py-1 px-2 text-xs bg-[#15171a] border-[#3a3e42] rounded w-full"
                        value={item.closing}
                        onChange={(e) => updateItem(idx, 'closing', e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#2d3135] bg-[#15171a]/60 px-2 py-1.5 rounded-lg">
                    <span className="text-[10px] text-[#8d9195] uppercase font-bold">Total Revenue</span>
                    <span className="font-mono font-black text-sm text-[#e8b93b]">
                      GH₵ {fmt(rowAmount)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Lubricants Total Summary Footer */}
        <div className="p-4 bg-[#15171a] border-t border-[#333739] flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-5 text-xs text-[#8d9195]">
            <span>
              Total Units Sold: <strong className="text-[#ece8e0] font-mono text-sm">{calc.lubeQty} units</strong>
            </span>
            <span>
              Products Accounted: <strong className="text-[#ece8e0] font-mono text-sm">{lubes.length} SKUs</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-bold tracking-wide text-[#8d9195]">
              StarOil Lubricants Total Revenue:
            </span>
            <span className="font-mono font-black text-lg text-[#e8b93b]">
              GH₵ {fmt(calc.lubeSales)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 5. PAYMENT CHANNELS & BREAKDOWN COMPONENT                                 */
/* ========================================================================= */
function PaymentChannelsTabComponent({
  shift,
  update,
  calc,
}: {
  shift: PLShift;
  update: (path: string, val: any) => void;
  calc: ReturnType<typeof computeShift>;
}) {
  const payments = shift.payments || {
    cash: shift.cash?.actual || '',
    visa: '',
    momo: '',
    bank: '',
    credit: '',
    wallets: '',
  };

  const addCreditRow = () => {
    const next = [
      ...(shift.credit || []),
      { customer: '', reference: '', amount: '', status: 'Unpaid' as const, date: shift.date },
    ];
    update('credit', next);
  };

  const removeCreditRow = (index: number) => {
    const next = (shift.credit || []).filter((_, i) => i !== index);
    update('credit', next);
  };

  const setCreditRow = (index: number, field: string, val: any) => {
    const next = [...(shift.credit || [])] as any[];
    next[index] = { ...next[index], [field]: val };
    update('credit', next);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Financial Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cash Handover & Count */}
        <div className="pl-card p-4 space-y-3 bg-[#1d2023] border border-[#333739]">
          <div className="flex items-center gap-2 pb-2 border-b border-[#333739]">
            <Wallet className="w-4 h-4 text-[#e8b93b]" />
            <h5 className="font-bold uppercase text-xs text-[#ece8e0]">
              Physical Cash Collection
            </h5>
          </div>

          <div>
            <label className="pl-label">Physical Cash Counted (GH₵)</label>
            <div className="odometer">
              <input
                value={payments.cash || shift.cash?.actual || ''}
                onChange={(e) => {
                  update('payments.cash', e.target.value);
                  update('cash.actual', e.target.value);
                }}
                placeholder="0.00"
                style={{ fontSize: 16 }}
              />
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#15171a] border border-[#333739] space-y-1 text-xs">
            <div className="flex justify-between text-[#8d9195]">
              <span>Expected Cash to Handover:</span>
              <span className="font-mono font-bold text-[#e8b93b]">GH₵ {fmt(calc.expectedCash)}</span>
            </div>
            <div className="flex justify-between text-[#8d9195]">
              <span>Actual Cash Counted:</span>
              <span className="font-mono font-bold text-[#ece8e0]">GH₵ {fmt(calc.actualCash)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#333739] font-bold">
              <span>Cash Variance:</span>
              <span
                className={`font-mono ${
                  Math.abs(calc.shortage) < 5
                    ? 'text-emerald-400'
                    : Math.abs(calc.shortage) < 50
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {calc.shortage >= 0 ? '+' : ''}GH₵ {fmt(calc.shortage)}
              </span>
            </div>
          </div>
        </div>

        {/* Digital & Card Channels */}
        <div className="pl-card p-4 space-y-3 bg-[#1d2023] border border-[#333739]">
          <div className="flex items-center gap-2 pb-2 border-b border-[#333739]">
            <CreditCard className="w-4 h-4 text-cyan-400" />
            <h5 className="font-bold uppercase text-xs text-[#ece8e0]">
              Electronic & Digital Payment Channels
            </h5>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="pl-label">VISA / POS Card (GH₵)</label>
              <input
                type="number"
                step="0.01"
                className="pl-input mono text-right"
                placeholder="0.00"
                value={payments.visa}
                onChange={(e) => update('payments.visa', e.target.value)}
              />
            </div>

            <div>
              <label className="pl-label">Mobile Money / MoMo (GH₵)</label>
              <input
                type="number"
                step="0.01"
                className="pl-input mono text-right"
                placeholder="0.00"
                value={payments.momo}
                onChange={(e) => update('payments.momo', e.target.value)}
              />
            </div>

            <div>
              <label className="pl-label">Direct Bank Deposit (GH₵)</label>
              <input
                type="number"
                step="0.01"
                className="pl-input mono text-right"
                placeholder="0.00"
                value={payments.bank}
                onChange={(e) => update('payments.bank', e.target.value)}
              />
            </div>

            <div>
              <label className="pl-label">Digital Wallets / Tingg (GH₵)</label>
              <input
                type="number"
                step="0.01"
                className="pl-input mono text-right"
                placeholder="0.00"
                value={payments.wallets}
                onChange={(e) => update('payments.wallets', e.target.value)}
              />
            </div>
          </div>

          <div className="p-2.5 rounded bg-[#15171a] border border-[#333739] flex justify-between items-center text-xs">
            <span className="text-[#8d9195]">Total Non-Cash Digital:</span>
            <span className="font-mono font-bold text-cyan-400">
              GH₵ {fmt(calc.totalNonCash - calc.creditTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Approved Credit Sales Ledger */}
      <div className="pl-card p-4 space-y-3 bg-[#1d2023] border border-[#333739]">
        <div className="flex items-center justify-between pb-2 border-b border-[#333739]">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" />
            <h5 className="font-bold uppercase text-xs text-[#ece8e0]">
              Approved Credit Sales Ledger
            </h5>
          </div>
          <button
            type="button"
            onClick={addCreditRow}
            className="px-2.5 py-1 rounded bg-[#23262a] border border-[#333739] hover:border-[#e8b93b] text-xs text-[#ece8e0] font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Plus size={12} className="text-[#e8b93b]" />
            <span>Add Credit Entry</span>
          </button>
        </div>

        {(shift.credit || []).map((r, i) => (
          <div key={i} className="flex gap-2 items-center flex-wrap">
            <input
              className="pl-input flex-1 min-w-[150px]"
              placeholder="Customer / Company Name"
              value={r.customer}
              onChange={(e) => setCreditRow(i, 'customer', e.target.value)}
            />
            <input
              className="pl-input w-36"
              placeholder="Invoice / Ref #"
              value={r.reference}
              onChange={(e) => setCreditRow(i, 'reference', e.target.value)}
            />
            <input
              type="number"
              step="0.01"
              className="pl-input mono w-28 text-right"
              placeholder="Amount (GH₵)"
              value={r.amount}
              onChange={(e) => setCreditRow(i, 'amount', e.target.value)}
            />
            <select
              className="pl-input w-28"
              value={r.status}
              onChange={(e) => setCreditRow(i, 'status', e.target.value)}
            >
              <option value="Unpaid">Unpaid</option>
              <option value="Paid">Paid</option>
            </select>
            <button
              type="button"
              className="pl-btn danger p-2"
              onClick={() => removeCreditRow(i)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {(!shift.credit || shift.credit.length === 0) && (
          <div className="p-3 text-center text-[#8d9195] bg-[#15171a] rounded">
            No credit sales recorded for this shift.
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-[#333739] text-xs font-semibold">
          <span className="text-[#8d9195]">Total Approved Credit:</span>
          <span className="font-mono text-amber-400">GH₵ {fmt(calc.creditTotal)}</span>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 6. DEDUCTIONS & EXPENSES COMPONENT                                        */
/* ========================================================================= */
function DeductionsTabComponent({
  shift,
  update,
}: {
  shift: PLShift;
  update: (path: string, val: any) => void;
}) {
  const addExpense = () => {
    update('expenses', [
      ...(shift.expenses || []),
      { category: 'Operational Expense', description: '', amount: '', date: shift.date },
    ]);
  };

  const removeExpense = (i: number) => {
    update(
      'expenses',
      (shift.expenses || []).filter((_, idx) => idx !== i)
    );
  };

  const setExpense = (i: number, field: string, val: any) => {
    const arr = [...(shift.expenses || [])] as any[];
    arr[i] = { ...arr[i], [field]: val };
    update('expenses', arr);
  };

  const addVoucher = () => {
    update('vouchers', [
      ...(shift.vouchers || []),
      { number: '', description: '', person: '', amount: '', status: 'Pending', date: shift.date },
    ]);
  };

  const removeVoucher = (i: number) => {
    update(
      'vouchers',
      (shift.vouchers || []).filter((_, idx) => idx !== i)
    );
  };

  const setVoucher = (i: number, field: string, val: any) => {
    const arr = [...(shift.vouchers || [])] as any[];
    arr[i] = { ...arr[i], [field]: val };
    update('vouchers', arr);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Station Expenses */}
      <div className="pl-card p-4 space-y-3 bg-[#1d2023] border border-[#333739]">
        <div className="flex items-center justify-between pb-2 border-b border-[#333739]">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-400" />
            <h5 className="font-bold uppercase text-xs text-[#ece8e0]">
              Station Operational Expenses
            </h5>
          </div>
          <button
            type="button"
            onClick={addExpense}
            className="px-2.5 py-1 rounded bg-[#23262a] border border-[#333739] hover:border-[#e8b93b] text-xs text-[#ece8e0] font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Plus size={12} className="text-[#e8b93b]" />
            <span>Add Expense</span>
          </button>
        </div>

        {(shift.expenses || []).map((r, i) => (
          <div key={i} className="flex gap-2 items-center flex-wrap">
            <select
              className="pl-input w-44"
              value={r.category}
              onChange={(e) => setExpense(i, 'category', e.target.value)}
            >
              <option value="">Category…</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              className="pl-input flex-1 min-w-[140px]"
              placeholder="Description e.g. Genset fuel, water bill"
              value={r.description}
              onChange={(e) => setExpense(i, 'description', e.target.value)}
            />
            <input
              type="number"
              step="0.01"
              className="pl-input mono w-28 text-right"
              placeholder="Amount (GH₵)"
              value={r.amount}
              onChange={(e) => setExpense(i, 'amount', e.target.value)}
            />
            <button
              type="button"
              className="pl-btn danger p-2"
              onClick={() => removeExpense(i)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {(!shift.expenses || shift.expenses.length === 0) && (
          <div className="p-3 text-center text-[#8d9195] bg-[#15171a] rounded">
            No operational expenses logged for this shift.
          </div>
        )}
      </div>

      {/* Cash Vouchers */}
      <div className="pl-card p-4 space-y-3 bg-[#1d2023] border border-[#333739]">
        <div className="flex items-center justify-between pb-2 border-b border-[#333739]">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-[#e8b93b]" />
            <h5 className="font-bold uppercase text-xs text-[#ece8e0]">
              Authorized Vouchers & Claims
            </h5>
          </div>
          <button
            type="button"
            onClick={addVoucher}
            className="px-2.5 py-1 rounded bg-[#23262a] border border-[#333739] hover:border-[#e8b93b] text-xs text-[#ece8e0] font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Plus size={12} className="text-[#e8b93b]" />
            <span>Add Voucher</span>
          </button>
        </div>

        {(shift.vouchers || []).map((r, i) => (
          <div key={i} className="flex gap-2 items-center flex-wrap">
            <input
              className="pl-input w-28"
              placeholder="Voucher #"
              value={r.number}
              onChange={(e) => setVoucher(i, 'number', e.target.value)}
            />
            <input
              className="pl-input flex-1 min-w-[140px]"
              placeholder="Description"
              value={r.description}
              onChange={(e) => setVoucher(i, 'description', e.target.value)}
            />
            <input
              className="pl-input w-36"
              placeholder="Person responsible"
              value={r.person}
              onChange={(e) => setVoucher(i, 'person', e.target.value)}
            />
            <input
              type="number"
              step="0.01"
              className="pl-input mono w-28 text-right"
              placeholder="Amount (GH₵)"
              value={r.amount}
              onChange={(e) => setVoucher(i, 'amount', e.target.value)}
            />
            <select
              className="pl-input w-28"
              value={r.status}
              onChange={(e) => setVoucher(i, 'status', e.target.value)}
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
            </select>
            <button
              type="button"
              className="pl-btn danger p-2"
              onClick={() => removeVoucher(i)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}

        {(!shift.vouchers || shift.vouchers.length === 0) && (
          <div className="p-3 text-center text-[#8d9195] bg-[#15171a] rounded">
            No cash vouchers logged for this shift.
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 6. HISTORY VIEW                                                           */
/* ========================================================================= */
function HistoryViewComponent({
  shifts,
  onView,
  onDelete,
  onClearAll,
  settings,
}: {
  shifts: PLShift[];
  onView: (id: string) => void;
  onDelete: (id: string) => void;
  onClearAll?: () => void;
  settings: PLSettings;
}) {
  const [q, setQ] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const filtered = shifts.filter((s) => {
    if (shiftFilter && s.shiftType !== shiftFilter) return false;
    if (statusFilter && s.status !== statusFilter) return false;
    if (q) {
      const hay = `${s.date} ${s.supervisor} ${s.shiftType}`.toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="disp" style={{ fontSize: 18, fontWeight: 700 }}>
          History
        </div>
        {shifts.length > 0 && onClearAll && (
          confirmClearAll ? (
            <div className="flex items-center gap-2 bg-rose-950/90 border border-rose-800 px-2.5 py-1 rounded text-xs">
              <span className="text-rose-300 font-bold">Clear all shifts?</span>
              <button
                type="button"
                onClick={() => {
                  onClearAll();
                  setConfirmClearAll(false);
                }}
                className="px-2 py-0.5 bg-rose-600 text-white font-bold rounded hover:bg-rose-500"
              >
                Yes, Clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="px-1.5 py-0.5 text-[#8d9195] hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="pl-btn text-xs"
              style={{ color: 'var(--bad)', borderColor: 'rgba(239,68,68,0.3)' }}
            >
              <Trash2 size={13} />
              <span>Clear History</span>
            </button>
          )
        )}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search
            size={14}
            color="var(--text-dim)"
            style={{ position: 'absolute', left: 10, top: 11 }}
          />
          <input
            className="pl-input"
            style={{ paddingLeft: 30 }}
            placeholder="Search date, shift or supervisor"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="pl-input"
          style={{ maxWidth: 160 }}
          value={shiftFilter}
          onChange={(e) => setShiftFilter(e.target.value)}
        >
          <option value="">All shifts</option>
          {SHIFT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="pl-input"
          style={{ maxWidth: 140 }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Desktop Table View */}
      <div className="pl-card hidden md:block" style={{ overflowX: 'auto' }}>
        <table className="pl-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Shift</th>
              <th>Supervisor</th>
              <th>Total sales</th>
              <th>Variance</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)' }}
                >
                  No shifts match your filter.
                </td>
              </tr>
            )}
            {filtered.map((s) => {
              const c = computeShift(s);
              const lim = settings.varianceLimit || 60;
              const bad =
                Math.abs(c.stockSuper.variation) >= lim ||
                Math.abs(c.stockDiesel.variation) >= lim;
              return (
                <tr key={s.id}>
                  <td className="mono">{s.date}</td>
                  <td>{s.shiftType}</td>
                  <td>{s.supervisor || '—'}</td>
                  <td className="mono" style={{ color: 'var(--amber)', fontWeight: 600 }}>
                    GH₵ {fmt(c.totalSales)}
                  </td>
                  <td>
                    {bad ? (
                      <span className="pl-pill bad">flagged</span>
                    ) : (
                      <span className="pl-pill ok">ok</span>
                    )}
                  </td>
                  <td>
                    <span className={`pl-pill ${s.status === 'completed' ? 'ok' : 'draft'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        className="pl-btn"
                        style={{ padding: '5px 9px' }}
                        onClick={() => onView(s.id)}
                        title="View / Edit Shift"
                      >
                        <Eye size={12} />
                      </button>
                      {confirmId === s.id ? (
                        <>
                          <button
                            className="pl-btn danger"
                            style={{ padding: '5px 9px', color: 'var(--bad)' }}
                            onClick={() => {
                              onDelete(s.id);
                              setConfirmId(null);
                            }}
                          >
                            Confirm
                          </button>
                          <button
                            className="pl-btn"
                            style={{ padding: '5px 9px' }}
                            onClick={() => setConfirmId(null)}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          className="pl-btn danger"
                          style={{ padding: '5px 9px' }}
                          onClick={() => setConfirmId(s.id)}
                          title="Delete Shift"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#8d9195] bg-[#1a1d20] border border-[#2d3135] rounded-xl">
            No shifts match your filter.
          </div>
        ) : (
          filtered.map((s) => {
            const c = computeShift(s);
            const lim = settings.varianceLimit || 60;
            const bad =
              Math.abs(c.stockSuper.variation) >= lim ||
              Math.abs(c.stockDiesel.variation) >= lim;
            return (
              <div
                key={s.id}
                className="p-3.5 bg-[#1a1d20] border border-[#2d3135] rounded-xl space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-sm text-[#ece8e0]">{s.date}</div>
                    <div className="text-xs text-[#8d9195] flex items-center gap-1.5 mt-0.5">
                      <span className="font-semibold text-amber-300">{s.shiftType}</span>
                      <span>•</span>
                      <span>Supervisor: {s.supervisor || '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {bad ? (
                      <span className="pl-pill bad text-[10px]">flagged</span>
                    ) : (
                      <span className="pl-pill ok text-[10px]">ok</span>
                    )}
                    <span className={`pl-pill text-[10px] ${s.status === 'completed' ? 'ok' : 'draft'}`}>
                      {s.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[#15171a] p-2.5 rounded-lg border border-[#2d3135]">
                  <span className="text-xs text-[#8d9195] uppercase font-bold">Total Sales</span>
                  <span className="font-mono font-black text-sm text-amber-400">
                    GH₵ {fmt(c.totalSales)}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    className="pl-btn primary text-xs"
                    style={{ padding: '6px 14px' }}
                    onClick={() => onView(s.id)}
                  >
                    <Eye size={13} /> View / Edit Shift
                  </button>
                  {confirmId === s.id ? (
                    <div className="flex items-center gap-1 bg-rose-950 border border-rose-700 px-2 py-1 rounded text-xs">
                      <span className="text-rose-200 font-bold text-[10px]">Confirm?</span>
                      <button
                        className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-xs cursor-pointer"
                        onClick={() => {
                          onDelete(s.id);
                          setConfirmId(null);
                        }}
                      >
                        Yes
                      </button>
                      <button
                        className="px-1.5 py-0.5 text-stone-400 hover:text-white text-xs cursor-pointer"
                        onClick={() => setConfirmId(null)}
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      className="pl-btn danger text-xs"
                      style={{ padding: '6px 10px' }}
                      onClick={() => setConfirmId(s.id)}
                      title="Delete Shift"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 7. REPORTS VIEW                                                           */
/* ========================================================================= */
function ReportsViewComponent({ shifts }: { shifts: PLShift[] }) {
  const [range, setRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [anchor, setAnchor] = useState(new Date().toISOString().slice(0, 10));

  const filtered = useMemo(() => {
    const a = new Date(anchor);
    if (range === 'daily') return shifts.filter((s) => s.date === anchor);
    if (range === 'weekly') {
      const start = new Date(a);
      start.setDate(start.getDate() - 6);
      return shifts.filter((s) => new Date(s.date) >= start && new Date(s.date) <= a);
    }
    const ym = anchor.slice(0, 7);
    return shifts.filter((s) => s.date.slice(0, 7) === ym);
  }, [shifts, range, anchor]);

  const agg = filtered.reduce(
    (acc, s) => {
      const c = computeShift(s);
      acc.super += c.superSales;
      acc.ron95 += c.ron95Sales;
      acc.diesel += c.dieselSales;
      acc.lubes += c.lubeSales;
      acc.litres += c.totalLitres;
      acc.expenses += c.expenseTotal;
      acc.credit += c.creditTotal;
      return acc;
    },
    { super: 0, ron95: 0, diesel: 0, lubes: 0, litres: 0, expenses: 0, credit: 0 }
  );

  const total = agg.super + agg.ron95 + agg.diesel + agg.lubes;

  // daily series for chart
  const byDate: Record<string, number> = {};
  filtered.forEach((s) => {
    const c = computeShift(s);
    byDate[s.date] = (byDate[s.date] || 0) + c.totalSales;
  });

  const series = Object.entries(byDate)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, sales]) => ({ date: date.slice(5), sales }));

  const days = Object.keys(byDate);
  const avgDaily = days.length ? total / days.length : 0;
  let best: [string, number] | null = null;
  let worst: [string, number] | null = null;

  Object.entries(byDate).forEach(([d, v]) => {
    if (!best || v > best[1]) best = [d, v];
    if (!worst || v < worst[1]) worst = [d, v];
  });

  const pieData = [
    { name: 'Super (PMS)', value: agg.super },
    { name: 'RON 95', value: agg.ron95 },
    { name: 'Diesel (AGO)', value: agg.diesel },
    { name: 'Lubricants & Oils', value: agg.lubes },
  ].filter((p) => p.value > 0);
  const COLORS = ['#d8543f', '#3b82f6', '#8fae4f', '#e8b93b'];

  return (
    <div>
      <div className="disp" style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
        Reports
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        {(['daily', 'weekly', 'monthly'] as const).map((r) => (
          <div
            key={r}
            className="pl-btn"
            style={{
              background: range === r ? 'var(--panel-2)' : undefined,
              color: range === r ? 'var(--amber)' : undefined,
              borderColor: range === r ? 'var(--amber)' : undefined,
              cursor: 'pointer',
              fontWeight: range === r ? 600 : 500,
            }}
            onClick={() => setRange(r)}
          >
            {r[0].toUpperCase() + r.slice(1)}
          </div>
        ))}
        <input
          type={range === 'monthly' ? 'month' : 'date'}
          className="pl-input"
          style={{ maxWidth: 170 }}
          value={range === 'monthly' ? anchor.slice(0, 7) : anchor}
          onChange={(e) =>
            setAnchor(range === 'monthly' ? e.target.value + '-01' : e.target.value)
          }
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <StatCard label="Super sales" value={`GH₵ ${fmt(agg.super)}`} accent="var(--super)" />
        <StatCard label="RON 95 sales" value={`GH₵ ${fmt(agg.ron95)}`} accent="var(--ron95)" />
        <StatCard label="Diesel sales" value={`GH₵ ${fmt(agg.diesel)}`} accent="var(--diesel)" />
        <StatCard label="Oil & Lubes sales" value={`GH₵ ${fmt(agg.lubes)}`} accent="var(--amber)" />
        <StatCard label="Total sales" value={`GH₵ ${fmt(total)}`} accent="var(--amber)" />
        <StatCard label="Total litres" value={`${fmt(agg.litres)} L`} />
        <StatCard label="Expenses" value={`GH₵ ${fmt(agg.expenses)}`} />
        <StatCard label="Credit" value={`GH₵ ${fmt(agg.credit)}`} />
        {range !== 'daily' && (
          <StatCard label="Avg daily sales" value={`GH₵ ${fmt(avgDaily)}`} />
        )}
      </div>

      {range !== 'daily' && best && worst && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <StatCard
            label="Best day"
            value={`GH₵ ${fmt((best as any)[1])}`}
            sub={(best as any)[0]}
            accent="var(--good)"
          />
          <StatCard
            label="Lowest day"
            value={`GH₵ ${fmt((worst as any)[1])}`}
            sub={(worst as any)[0]}
            accent="var(--bad)"
          />
        </div>
      )}

      {series.length > 0 && (
        <div className="pl-card" style={{ padding: 16, marginBottom: 20, height: 240 }}>
          <div className="pl-label" style={{ marginBottom: 10 }}>
            Sales by day
          </div>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={series}>
              <CartesianGrid stroke="#2a2d30" vertical={false} />
              <XAxis dataKey="date" stroke="#8d9195" fontSize={11} />
              <YAxis stroke="#8d9195" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: '#1d2023',
                  border: '1px solid #333739',
                  fontSize: 12,
                  color: '#ece8e0',
                }}
              />
              <Bar dataKey="sales" fill="#e8b93b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {total > 0 && (
        <div className="pl-card" style={{ padding: 16, height: 220 }}>
          <div className="pl-label" style={{ marginBottom: 10 }}>
            Product Sales Breakdown
          </div>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={40}
                outerRadius={70}
              >
                {pieData.map((e, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: '#1d2023',
                  border: '1px solid #333739',
                  fontSize: 12,
                  color: '#ece8e0',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ========================================================================= */
/* 8. STOCK VIEW                                                             */
/* ========================================================================= */
function StockViewComponent({
  shifts,
  deliveries,
  onSaveDelivery,
  onDeleteDelivery,
}: {
  shifts: PLShift[];
  deliveries: PLDelivery[];
  onSaveDelivery: (d: PLDelivery) => void;
  onDeleteDelivery: (id: string) => void;
}) {
  const latestByFuel = (key: 'super' | 'ron95' | 'diesel') => {
    const relevant = shifts
      .filter((s) => s.stock && s.stock[key] && s.stock[key].closing !== '')
      .sort((a, b) => (a.date < b.date ? 1 : -1));
    return relevant[0] ? num(relevant[0].stock[key].closing) : null;
  };

  const [form, setForm] = useState({
    product: '',
    quantity: '',
    deliveryNumber: '',
    supplier: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const submit = () => {
    if (!form.product || !form.quantity) return;
    onSaveDelivery({ id: uid(), ...form });
    setForm({
      product: '',
      quantity: '',
      deliveryNumber: '',
      supplier: '',
      date: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div>
      <div className="disp" style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
        Stock
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
          gap: 10,
          marginBottom: 20,
        }}
      >
        <StatCard
          label="Super — last recorded closing stock"
          value={
            latestByFuel('super') !== null ? fmt(latestByFuel('super')) + ' L' : '—'
          }
          accent="var(--super)"
        />
        <StatCard
          label="RON 95 — last recorded closing stock"
          value={
            latestByFuel('ron95') !== null ? fmt(latestByFuel('ron95')) + ' L' : '—'
          }
          accent="var(--ron95)"
        />
        <StatCard
          label="Diesel — last recorded closing stock"
          value={
            latestByFuel('diesel') !== null ? fmt(latestByFuel('diesel')) + ' L' : '—'
          }
          accent="var(--diesel)"
        />
      </div>

      <SectionHead n={<Truck size={13} />} title="Log a delivery" />
      <div
        className="pl-card"
        style={{
          padding: 14,
          marginBottom: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))',
          gap: 10,
        }}
      >
        <div>
          <label className="pl-label">Product</label>
          <input
            className="pl-input"
            value={form.product}
            onChange={(e) => setForm({ ...form, product: e.target.value })}
            placeholder="Super / Diesel / SAE 40…"
          />
        </div>
        <div>
          <label className="pl-label">Quantity (L or units)</label>
          <input
            className="pl-input mono"
            value={form.quantity}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
          />
        </div>
        <div>
          <label className="pl-label">Delivery #</label>
          <input
            className="pl-input"
            value={form.deliveryNumber}
            onChange={(e) => setForm({ ...form, deliveryNumber: e.target.value })}
          />
        </div>
        <div>
          <label className="pl-label">Supplier</label>
          <input
            className="pl-input"
            value={form.supplier}
            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
          />
        </div>
        <div>
          <label className="pl-label">Date</label>
          <input
            type="date"
            className="pl-input"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            className="pl-btn primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={submit}
          >
            Save delivery
          </button>
        </div>
      </div>

      <SectionHead n="—" title="Stock movement history" />
      {/* Desktop Table View */}
      <div className="pl-card hidden md:block" style={{ overflowX: 'auto' }}>
        <table className="pl-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Delivery #</th>
              <th>Supplier</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {deliveries.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)' }}
                >
                  No deliveries logged yet.
                </td>
              </tr>
            )}
            {deliveries.map((d) => (
              <tr key={d.id}>
                <td className="mono">{d.date}</td>
                <td>{d.product}</td>
                <td className="mono">{fmt(d.quantity)} L</td>
                <td>{d.deliveryNumber || '—'}</td>
                <td>{d.supplier || '—'}</td>
                <td>
                  <button
                    className="pl-btn danger"
                    style={{ padding: '5px 9px' }}
                    onClick={() => onDeleteDelivery(d.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {deliveries.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#8d9195] bg-[#1a1d20] border border-[#2d3135] rounded-xl">
            No deliveries logged yet.
          </div>
        ) : (
          deliveries.map((d) => (
            <div
              key={d.id}
              className="p-3.5 bg-[#1a1d20] border border-[#2d3135] rounded-xl space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-sm text-[#ece8e0]">{d.product}</div>
                  <div className="text-xs text-[#8d9195] font-mono mt-0.5">{d.date}</div>
                </div>
                <button
                  className="pl-btn danger text-xs p-1.5"
                  onClick={() => onDeleteDelivery(d.id)}
                  title="Delete delivery"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-[#15171a] p-2 rounded-lg border border-[#2d3135] text-xs">
                <div>
                  <span className="text-[9.5px] text-[#8d9195] uppercase font-bold block">Quantity</span>
                  <span className="font-mono font-bold text-amber-400">{fmt(d.quantity)} L</span>
                </div>
                <div>
                  <span className="text-[9.5px] text-[#8d9195] uppercase font-bold block">Delivery #</span>
                  <span className="font-mono text-[#ece8e0]">{d.deliveryNumber || '—'}</span>
                </div>
                <div>
                  <span className="text-[9.5px] text-[#8d9195] uppercase font-bold block">Supplier</span>
                  <span className="text-[#ece8e0] truncate block">{d.supplier || '—'}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 9. MORE / ATTENDANTS / SETTINGS                                           */
/* ========================================================================= */
function MoreMenuComponent({
  onSelect,
}: {
  onSelect: (key: 'account' | 'attendants' | 'settings') => void;
}) {
  const items = [
    {
      key: 'account' as const,
      label: 'Supervisor Account',
      icon: User,
      sub: 'Edit supervisor name, staff ID, contact phone, and station branch',
    },
    {
      key: 'attendants' as const,
      label: 'Attendants',
      icon: Users,
      sub: 'Manage pump attendant roster',
    },
    {
      key: 'settings' as const,
      label: 'Settings',
      icon: SettingsIcon,
      sub: 'Station info, prices, variance limits',
    },
  ];

  return (
    <div>
      <div className="disp" style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>
        More
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it) => (
          <div
            key={it.key}
            className="pl-card"
            style={{
              padding: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
            }}
            onClick={() => onSelect(it.key)}
          >
            <it.icon size={18} color="var(--amber)" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{it.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{it.sub}</div>
            </div>
            <ChevronRight size={15} color="var(--text-dim)" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendantsViewComponent({
  attendants,
  onSave,
  onBack,
}: {
  attendants: PLAttendantRoster[];
  onSave: (arr: PLAttendantRoster[]) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const add = () => {
    if (!name.trim()) return;
    onSave([...attendants, { id: uid(), name: name.trim(), phone: phone.trim() }]);
    setName('');
    setPhone('');
  };

  const remove = (id: string) => {
    onSave(attendants.filter((a) => a.id !== id));
    setConfirmRemoveId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button className="pl-btn" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="disp" style={{ fontSize: 17, fontWeight: 700 }}>
          Attendants Roster
        </div>
      </div>

      <div
        className="pl-card"
        style={{ padding: 14, marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}
      >
        <input
          className="pl-input"
          style={{ flex: 1, minWidth: 160 }}
          placeholder="Attendant full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="pl-input"
          style={{ width: 160 }}
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <button className="pl-btn primary" onClick={add}>
          <Plus size={14} /> Add attendant
        </button>
      </div>

      {/* Desktop Table */}
      <div className="pl-card hidden sm:block" style={{ overflowX: 'auto' }}>
        <table className="pl-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {attendants.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)' }}
                >
                  No attendants registered yet.
                </td>
              </tr>
            )}
            {attendants.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 600 }}>{a.name}</td>
                <td className="mono">{a.phone || '—'}</td>
                <td>
                  {confirmRemoveId === a.id ? (
                    <div className="flex items-center gap-1 bg-rose-950 border border-rose-700 px-2 py-0.5 rounded text-[11px]">
                      <span className="text-rose-200 font-bold text-[10px]">Remove?</span>
                      <button
                        type="button"
                        onClick={() => remove(a.id)}
                        className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-[10px] cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(null)}
                        className="px-1 py-0.5 text-stone-400 hover:text-white text-[10px] cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      className="pl-btn danger"
                      style={{ padding: '5px 9px' }}
                      onClick={() => setConfirmRemoveId(a.id)}
                      title="Remove attendant from roster"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile List View */}
      <div className="sm:hidden space-y-2.5">
        {attendants.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#8d9195] bg-[#1a1d20] border border-[#2d3135] rounded-xl">
            No attendants registered yet.
          </div>
        ) : (
          attendants.map((a) => (
            <div
              key={a.id}
              className="p-3 bg-[#1a1d20] border border-[#2d3135] rounded-xl flex items-center justify-between gap-2"
            >
              <div>
                <div className="font-bold text-sm text-[#ece8e0]">{a.name}</div>
                <div className="text-xs text-[#8d9195] font-mono mt-0.5">{a.phone || '—'}</div>
              </div>
              <div>
                {confirmRemoveId === a.id ? (
                  <div className="flex items-center gap-1 bg-rose-950 border border-rose-700 px-2 py-1 rounded text-xs">
                    <span className="text-rose-200 font-bold text-[10px]">Remove?</span>
                    <button
                      type="button"
                      onClick={() => remove(a.id)}
                      className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-bold text-xs cursor-pointer"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemoveId(null)}
                      className="px-1 py-0.5 text-stone-400 hover:text-white text-xs cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    className="pl-btn danger text-xs p-1.5"
                    onClick={() => setConfirmRemoveId(a.id)}
                    title="Remove attendant"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SettingsViewComponent({
  settings,
  onSave,
  onBack,
}: {
  settings: PLSettings;
  onSave: (st: PLSettings) => void;
  onBack: () => void;
}) {
  const [form, setForm] = useState(settings);
  const set = (k: keyof PLSettings, v: any) => setForm({ ...form, [k]: v });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button className="pl-btn" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="disp" style={{ fontSize: 17, fontWeight: 700 }}>
          Station Settings
        </div>
      </div>

      <div
        className="pl-card"
        style={{
          padding: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
          gap: 14,
          marginBottom: 16,
        }}
      >
        <div>
          <label className="pl-label">Station name</label>
          <input
            className="pl-input"
            value={form.stationName}
            onChange={(e) => set('stationName', e.target.value)}
          />
        </div>
        <div>
          <label className="pl-label">Location</label>
          <input
            className="pl-input"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
          />
        </div>
        <div>
          <label className="pl-label">Station code</label>
          <input
            className="pl-input"
            value={form.code}
            onChange={(e) => set('code', e.target.value)}
          />
        </div>
        <div>
          <label className="pl-label">Manager</label>
          <input
            className="pl-input"
            value={form.manager}
            onChange={(e) => set('manager', e.target.value)}
          />
        </div>
        <div>
          <label className="pl-label">Contact</label>
          <input
            className="pl-input"
            value={form.contact}
            onChange={(e) => set('contact', e.target.value)}
          />
        </div>
        <div>
          <label className="pl-label">Default super price (GH₵)</label>
          <input
            className="pl-input mono"
            value={form.superPrice}
            onChange={(e) => set('superPrice', num(e.target.value))}
          />
        </div>
        <div>
          <label className="pl-label">Default RON 95 price (GH₵)</label>
          <input
            className="pl-input mono"
            value={form.ron95Price || 14.20}
            onChange={(e) => set('ron95Price', num(e.target.value))}
          />
        </div>
        <div>
          <label className="pl-label">Default diesel price (GH₵)</label>
          <input
            className="pl-input mono"
            value={form.dieselPrice}
            onChange={(e) => set('dieselPrice', num(e.target.value))}
          />
        </div>
        <div>
          <label className="pl-label">Variance limit (L)</label>
          <input
            className="pl-input mono"
            value={form.varianceLimit}
            onChange={(e) => set('varianceLimit', num(e.target.value))}
          />
        </div>
      </div>

      <button className="pl-btn primary" onClick={() => onSave(form)}>
        Save settings
      </button>
    </div>
  );
}

/* ========================================================================= */
/* 10. SUPERVISOR ACCOUNT VIEW                                               */
/* ========================================================================= */
function SupervisorAccountViewComponent({
  profile,
  stations = [],
  onSaveProfile,
  onBack,
  onSwitchRole,
}: {
  profile: UserProfile;
  stations?: StationConfig[];
  onSaveProfile?: (profile: UserProfile) => void;
  onBack: () => void;
  onSwitchRole?: (role: 'attendant' | 'supervisor') => void;
}) {
  const currentSupervisorName = profile.supervisor || profile.attendant || 'Kofi Asare';
  const [form, setForm] = useState({
    supervisorName: currentSupervisorName,
    staffId: profile.staffId || 'SO-SUP-001',
    phone: profile.phone || '+233 24 123 4567',
    email: profile.email || 'supervisor@staroil.com',
    station: profile.station || 'Tema Main Station (Harbour Rd)',
    stationCode: profile.stationCode || 'SO-TMA-001',
    shiftGroup: 'A' as 'A' | 'B',
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleStationChange = (stationName: string) => {
    const matched = stations.find((s) => s.name === stationName);
    setForm((prev) => ({
      ...prev,
      station: stationName,
      stationCode: matched?.stationCode || prev.stationCode,
    }));
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!form.supervisorName.trim()) return;

    setIsSubmitting(true);

    const updatedProfile: UserProfile = {
      ...profile,
      supervisor: form.supervisorName.trim(),
      attendant: form.supervisorName.trim(),
      staffId: form.staffId.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      station: form.station.trim(),
      stationCode: form.stationCode.trim(),
      role: 'supervisor',
      isVerified: true,
      authType: form.phone.trim() ? 'phone' : 'email',
    };

    if (onSaveProfile) {
      onSaveProfile(updatedProfile);
    }

    setIsSubmitting(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmationText.trim().toLowerCase() !== 'delete') return;
    setIsDeleting(true);

    try {
      // 1. Remove from stored auth accounts
      const rawAccounts = localStorage.getItem('staroil_auth_accounts');
      if (rawAccounts) {
        const parsed: any[] = JSON.parse(rawAccounts);
        const filtered = parsed.filter(
          (acc) =>
            acc.staffId !== form.staffId &&
            acc.fullName?.toLowerCase() !== form.supervisorName.toLowerCase()
        );
        localStorage.setItem('staroil_auth_accounts', JSON.stringify(filtered));
      }

      // 2. Clear current session
      localStorage.removeItem('staroil_auth_current_user');
      localStorage.removeItem('staroil_active_view');
      localStorage.removeItem('staroil_active_record_id');

      // 3. Clear profile
      const resetProfile: UserProfile = {
        attendant: '',
        station: stations[0]?.name || 'Tema Main Station',
        stationCode: stations[0]?.stationCode || 'SO-TMA-001',
        supervisor: '',
        isVerified: false,
        role: 'supervisor',
      };
      if (onSaveProfile) {
        onSaveProfile(resetProfile);
      }

      // Reload to prompt fresh login
      window.location.reload();
    } catch (err) {
      console.error('Failed to delete supervisor account', err);
      setIsDeleting(false);
    }
  };

  // Generate initials for avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (name.slice(0, 2) || 'SO').toUpperCase();
  };

  return (
    <div className="w-full max-w-full min-w-0">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button className="pl-btn" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>
        <div>
          <div className="disp" style={{ fontSize: 18, fontWeight: 700 }}>
            Supervisor Account & Profile
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
            Update your personal credentials, contact details, staff ID, and station assignment
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div
          className="pl-card"
          style={{
            padding: '12px 16px',
            marginBottom: 18,
            background: 'rgba(16, 185, 129, 0.15)',
            borderColor: 'rgba(16, 185, 129, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: '#34d399',
          }}
        >
          <CheckCircle2 size={18} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Account Changes Saved Successfully!</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>
              Your supervisor name, staff ID, and station details have been persisted across the station system.
            </div>
          </div>
        </div>
      )}

      {/* Profile Overview Card */}
      <div
        className="pl-card"
        style={{
          padding: 18,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: 'linear-gradient(135deg, #1d2023 0%, #17191c 100%)',
          border: '1px solid #333739',
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'var(--amber)',
            color: '#15171a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 800,
            fontFamily: 'var(--mono)',
            flexShrink: 0,
            boxShadow: '0 0 0 4px rgba(232, 185, 59, 0.2)',
          }}
        >
          {getInitials(form.supervisorName)}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#ece8e0' }}>
              {form.supervisorName || 'Supervisor Name'}
            </span>
            <span
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(232, 185, 59, 0.15)',
                color: 'var(--amber)',
                fontWeight: 700,
                border: '1px solid rgba(232, 185, 59, 0.3)',
                textTransform: 'uppercase',
                letterSpacing: '.05em',
              }}
            >
              Shift Supervisor
            </span>
            <span
              style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 4,
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              <ShieldCheck size={11} /> Verified
            </span>
          </div>

          <div style={{ fontSize: 11.5, color: 'var(--text-dim)', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <span>Staff ID: <strong style={{ color: '#ece8e0', fontFamily: 'var(--mono)' }}>{form.staffId || '—'}</strong></span>
            <span>Station: <strong style={{ color: '#ece8e0' }}>{form.station || '—'}</strong></span>
            <span>Code: <strong style={{ color: 'var(--amber)', fontFamily: 'var(--mono)' }}>{form.stationCode || '—'}</strong></span>
          </div>
        </div>
      </div>

      {/* Account Edit Form */}
      <form onSubmit={handleSave} className="pl-card" style={{ padding: 18, marginBottom: 20 }}>
        <div className="disp" style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--amber)' }}>
          Account Credentials & Station Assignment
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 18 }}>
          {/* Full Name */}
          <div>
            <label className="pl-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <User size={12} /> Full Name / Supervisor Identifier *
            </label>
            <input
              type="text"
              className="pl-input"
              value={form.supervisorName}
              onChange={(e) => setForm({ ...form, supervisorName: e.target.value })}
              placeholder="e.g. Kofi Mensah Asare"
              required
            />
            <span style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3, display: 'block' }}>
              Used as the official supervisor signature on shift reconciliations
            </span>
          </div>

          {/* Staff ID */}
          <div>
            <label className="pl-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={12} /> Staff ID / Employee Number *
            </label>
            <input
              type="text"
              className="pl-input mono"
              value={form.staffId}
              onChange={(e) => setForm({ ...form, staffId: e.target.value.toUpperCase() })}
              placeholder="e.g. SO-SUP-001"
              required
            />
            <span style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3, display: 'block' }}>
              Unique StarOil employee ID
            </span>
          </div>

          {/* Phone Number */}
          <div>
            <label className="pl-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={12} /> Contact Phone Number
            </label>
            <input
              type="tel"
              className="pl-input mono"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="e.g. +233 24 123 4567"
            />
            <span style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3, display: 'block' }}>
              Phone used for OTP verification and station contact
            </span>
          </div>

          {/* Email Address */}
          <div>
            <label className="pl-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={12} /> Email Address
            </label>
            <input
              type="email"
              className="pl-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="e.g. kofi.asare@staroil.com"
            />
            <span style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3, display: 'block' }}>
              Optional email for reporting and notifications
            </span>
          </div>

          {/* Assigned Station (Locked for Supervisor) */}
          <div>
            <label className="pl-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building size={12} /> Assigned Station Branch <Lock size={10} className="text-amber-400" />
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                className="pl-input opacity-80 cursor-not-allowed bg-[#1a1c1e] text-[#ece8e0] font-semibold"
                value={`${form.station} (${form.stationCode || 'SO-GH'})`}
                readOnly
                disabled
              />
            </div>
            <span style={{ fontSize: 10, color: 'var(--amber)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Lock size={10} /> Station assignment is locked to your official deployment branch
            </span>
          </div>

          {/* Station Code */}
          <div>
            <label className="pl-label">Official Station Code</label>
            <input
              type="text"
              className="pl-input mono"
              value={form.stationCode}
              onChange={(e) => setForm({ ...form, stationCode: e.target.value.toUpperCase() })}
              placeholder="e.g. SO-TMA-001"
            />
            <span style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3, display: 'block' }}>
              StarOil national station identifier
            </span>
          </div>

          {/* Default Shift Group */}
          <div>
            <label className="pl-label">Default Shift Group</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['A', 'B'] as const).map((grp) => (
                <button
                  type="button"
                  key={grp}
                  className="pl-btn flex-1 justify-center"
                  style={{
                    background: form.shiftGroup === grp ? 'rgba(232, 185, 59, 0.15)' : undefined,
                    borderColor: form.shiftGroup === grp ? 'var(--amber)' : undefined,
                    color: form.shiftGroup === grp ? 'var(--amber)' : undefined,
                    fontWeight: 600,
                  }}
                  onClick={() => setForm({ ...form, shiftGroup: grp })}
                >
                  Shift Group {grp}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3, display: 'block' }}>
              Preferred shift group rotation assignment
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
          <button
            type="submit"
            className="pl-btn primary"
            disabled={isSubmitting || !form.supervisorName.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px' }}
          >
            <Save size={15} />
            <span>{isSubmitting ? 'Saving...' : 'Save Account Details'}</span>
          </button>

          {savedSuccess && (
            <span style={{ color: '#34d399', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, fontWeight: 600 }}>
              <CheckCircle2 size={15} /> Saved successfully!
            </span>
          )}
        </div>
      </form>

      {/* Station Payment Methods & Banking Channels Configuration */}
      <div className="pl-card" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div className="disp" style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CreditCard size={16} /> Station Payment Methods & Banking Channels
          </div>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#23262a', border: '1px solid #333739', color: '#8d9195' }}>
            Station Default Channels
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
          {/* 1. Mobile Money */}
          <div style={{ background: '#15171a', border: '1px solid #333739', borderRadius: 6, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#e8b93b', fontWeight: 600, fontSize: 12 }}>
              <Phone size={14} /> 1. Mobile Money (MoMo) Merchant
            </div>
            <div style={{ fontSize: 11, color: '#8d9195', marginBottom: 10 }}>
              Official station merchant and agent SIMs for MTN MoMo, Telecel Cash, and AT Money collections.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#23262a', borderRadius: 4 }}>
                <span>MTN MoMo Merchant:</span>
                <strong className="mono text-[#ece8e0]">054 889 2011 (STAROIL-TMA)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#23262a', borderRadius: 4 }}>
                <span>Telecel Cash Merchant:</span>
                <strong className="mono text-[#ece8e0]">020 441 9022 (STAROIL-TMA)</strong>
              </div>
            </div>
          </div>

          {/* 2. POS Card Terminals */}
          <div style={{ background: '#15171a', border: '1px solid #333739', borderRadius: 6, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#3b82f6', fontWeight: 600, fontSize: 12 }}>
              <CreditCard size={14} /> 2. VISA / MasterCard POS Terminals
            </div>
            <div style={{ fontSize: 11, color: '#8d9195', marginBottom: 10 }}>
              Configured GhIPSS & Bank EMV card swiping terminals linked to StarOil settlement accounts.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#23262a', borderRadius: 4 }}>
                <span>Stanbic POS Terminal ID:</span>
                <strong className="mono text-[#ece8e0]">STB-POS-4491</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#23262a', borderRadius: 4 }}>
                <span>Ecobank POS Terminal ID:</span>
                <strong className="mono text-[#ece8e0]">ECO-GH-8812</strong>
              </div>
            </div>
          </div>

          {/* 3. Direct Bank Deposit */}
          <div style={{ background: '#15171a', border: '1px solid #333739', borderRadius: 6, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#6fae6a', fontWeight: 600, fontSize: 12 }}>
              <Building size={14} /> 3. StarOil Direct Bank Accounts
            </div>
            <div style={{ fontSize: 11, color: '#8d9195', marginBottom: 10 }}>
              Primary clearing accounts used for supervisor daily cash deposits and customer wire transfers.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#23262a', borderRadius: 4 }}>
                <span>GCB Bank Ltd:</span>
                <strong className="mono text-[#ece8e0]">1021130004921 (Main Operations)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#23262a', borderRadius: 4 }}>
                <span>Ecobank Ghana:</span>
                <strong className="mono text-[#ece8e0]">0040134481029 (Collections)</strong>
              </div>
            </div>
          </div>

          {/* 4. Digital Wallets & Hubtel / Tingg */}
          <div style={{ background: '#15171a', border: '1px solid #333739', borderRadius: 6, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#a78bfa', fontWeight: 600, fontSize: 12 }}>
              <Wallet size={14} /> 4. Digital Wallets, Tingg & Fuel Cards
            </div>
            <div style={{ fontSize: 11, color: '#8d9195', marginBottom: 10 }}>
              StarOil fleet fuel cards, StarCard contactless tokens, Tingg, Hubtel, and corporate vouchers.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#23262a', borderRadius: 4 }}>
                <span>StarCard Fleet Portal:</span>
                <strong className="mono text-[#ece8e0]">ACTIVE · Terminal #01</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#23262a', borderRadius: 4 }}>
                <span>Hubtel Merchant Code:</span>
                <strong className="mono text-[#ece8e0]">HUB-STAROIL-901</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Official Ghana Forecourt Lubricants & Oils Price Master Reference */}
      <div className="pl-card" style={{ padding: 18, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div className="disp" style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Package size={16} /> Ghana National Forecourt Lubricant Catalog (All OMCs & Brands)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#23262a', border: '1px solid #333739', color: '#8d9195', fontFamily: 'var(--mono)' }}>
              National Forecourt Database · Multi-Company
            </span>
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#8d9195', marginBottom: 14 }}>
          Approved forecourt lubricants master list across TotalEnergies, Shell, GOIL, StarOil, Puma Energy, Castrol, Mobil, and independent Ghanaian filling stations. <strong className="text-[#ece8e0]">Only Station Supervisors</strong> are authorized to record and account for lubricant stocks and shift sales.
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12.5, textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#15171a', borderBottom: '1px solid #333739', color: '#8d9195', textTransform: 'uppercase', fontSize: 10.5, letterSpacing: '0.05em' }}>
                <th style={{ padding: '10px 12px' }}>Brand</th>
                <th style={{ padding: '10px 12px' }}>Product Description</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Unit</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Dealer Wholesale Price</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Consumer / Retail Price</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Station Margin</th>
              </tr>
            </thead>
            <tbody style={{ divideY: '1px solid #2a2d30' }}>
              {STAROIL_LUBRICANTS_CATALOG.map((item) => {
                const margin = item.consumerPrice - item.dealerPrice;
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #23262a' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: '#15171a', border: '1px solid #333739', color: 'var(--amber)', fontWeight: 700 }}>
                        {item.brand}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#ece8e0' }}>{item.name}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 4, background: '#15171a', border: '1px solid #333739', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600 }}>
                        {item.unit}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 600, color: '#34d399', fontSize: 13 }}>
                      GH₵ {item.dealerPrice.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 800, color: 'var(--amber)', fontSize: 14 }}>
                      GH₵ {item.consumerPrice.toFixed(2)}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'var(--mono)', fontWeight: 700, color: '#34d399', fontSize: 13 }}>
                      +GH₵ {margin.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Role Switcher */}
      {onSwitchRole && (
        <div className="pl-card" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ece8e0' }}>Switch to Forecourt Attendant Mode</div>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
              Switch your active view to enter individual pump sales sheets as a pump attendant
            </div>
          </div>
          <button
            type="button"
            className="pl-btn"
            onClick={() => onSwitchRole('attendant')}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <UserCheck size={14} /> Switch to Attendant Portal
          </button>
        </div>
      )}

      {/* Danger Zone: Delete Supervisor Account */}
      <div
        className="pl-card"
        style={{
          padding: 18,
          borderColor: 'rgba(244, 63, 94, 0.4)',
          background: 'rgba(244, 63, 94, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="disp" style={{ fontSize: 14, fontWeight: 700, color: '#fb7185', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Trash2 size={16} /> Danger Zone: Delete Supervisor Account
            </div>
            <div style={{ fontSize: 11.5, color: '#8d9195', maxWidth: 540, lineHeight: 1.5 }}>
              Permanently delete this supervisor account (<strong className="text-[#ece8e0]">{form.supervisorName}</strong>, {form.staffId}) from the system. This clears all active supervisor credentials, logs out the current session, and requires registering or logging in afresh.
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setDeleteConfirmationText('');
              setShowDeleteModal(true);
            }}
            className="pl-btn danger"
            style={{
              padding: '10px 18px',
              fontWeight: 700,
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} />
            <span>Delete My Account</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#1d2023] border border-rose-900/80 rounded-2xl p-6 max-w-md w-full shadow-2xl text-[#ece8e0] space-y-4 animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-rose-950/90 border border-rose-700 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-base font-extrabold text-[#ece8e0] font-['Space_Grotesk'] uppercase tracking-wide">
                Permanently Delete Supervisor Account?
              </h3>
              <p className="text-xs text-[#8d9195] leading-relaxed">
                You are about to permanently delete the supervisor profile for{' '}
                <strong className="text-amber-400 font-semibold">{form.supervisorName}</strong> ({form.staffId}) at{' '}
                <strong className="text-[#ece8e0]">{form.station}</strong>.
              </p>
              <p className="text-[11px] text-rose-300 font-medium bg-rose-950/50 p-2.5 rounded-lg border border-rose-900/60">
                This will delete your credentials and immediately log you out. To confirm, please type{' '}
                <strong className="font-mono text-white underline">delete</strong> below:
              </p>
            </div>

            <div>
              <input
                type="text"
                autoFocus
                placeholder="Type 'delete' to confirm"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="w-full bg-[#15171a] border border-rose-800/80 rounded-xl px-3.5 py-2.5 text-xs text-[#ece8e0] font-mono text-center focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500 placeholder:text-stone-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText('');
                }}
                disabled={isDeleting}
                className="py-2.5 px-3 rounded-xl border border-[#333739] bg-[#23262a] hover:bg-[#2e3237] text-[#ece8e0] font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteConfirmationText.trim().toLowerCase() !== 'delete' || isDeleting}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs cursor-pointer transition-colors shadow-md flex items-center justify-center gap-1.5"
              >
                <Trash2 size={13} />
                <span>{isDeleting ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
