import {
  ShiftRecord,
  StationConfig,
  CompanyConfig,
  UserProfile,
  FUELS,
  StationCodeAuditEntry,
  WorkerAssignmentAuditEntry,
  AccountClosureAuditEntry,
  AuthUser,
  SupervisorDailySheet,
} from '../types';
import { generateId } from '../utils/calculations';
import { db, auth } from './firebase';
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { getCurrentUser } from './auth';

export const STORAGE_KEYS = {
  PROFILE: 'dsr_user_profile',
  STATIONS: 'dsr_stations',
  COMPANIES: 'dsr_companies',
  RECORDS_PREFIX: 'dsr_rec_',
  STATION_CODE_AUDIT: 'dsr_station_code_audit',
  WORKER_ASSIGNMENT_AUDIT: 'dsr_worker_assignment_audit',
  ACCOUNT_CLOSURE_AUDIT: 'dsr_account_closure_audit',
};

export const INITIAL_COMPANIES: CompanyConfig[] = [
  { id: 'comp_goil', name: 'GOIL PLC', code: 'GOIL' },
  { id: 'comp_total', name: 'TotalEnergies Marketing Ghana', code: 'TOTAL' },
  { id: 'comp_shell', name: 'Vivo Energy (Shell)', code: 'SHELL' },
  { id: 'comp_staroil', name: 'StarOil Ghana', code: 'STAROIL' },
  { id: 'comp_allied', name: 'Allied Oil Ghana', code: 'ALLIED' },
  { id: 'comp_puma', name: 'Puma Energy Ghana', code: 'PUMA' },
  { id: 'comp_zen', name: 'Zen Petroleum', code: 'ZEN' },
  { id: 'comp_frimps', name: 'Frimps Oil', code: 'FRIMPS' },
  { id: 'comp_glory', name: 'Glory Oil', code: 'GLORY' },
  { id: 'comp_crown', name: 'Crown Petroleum', code: 'CROWN' },
  { id: 'comp_independent', name: 'Independent Station', code: 'IND' },
];

export const INITIAL_STATIONS: StationConfig[] = [
  {
    id: 'st_airport_goil',
    name: 'Airport City Energy Hub',
    stationCode: 'GO-ACC-101',
    companyId: 'comp_goil',
    companyName: 'GOIL PLC',
    isActive: true,
    hasRon95: true,
    pumps: { pms: 4, ago: 4, ron95: 2 },
    prices: { pms: 12.95, ago: 13.65, ron95: 14.25 },
    banks: ['Standard Chartered Bank Ghana', 'Zenith Bank Ghana Limited', 'Ecobank Ghana PLC'],
    lat: 5.6015,
    lng: -0.1712,
    locationName: 'Airport Bypass, Accra'
  },
  {
    id: 'st_liberation_total',
    name: 'Liberation Road Flagship',
    stationCode: 'TOT-ACC-201',
    companyId: 'comp_total',
    companyName: 'TotalEnergies Marketing Ghana',
    isActive: true,
    hasRon95: true,
    pumps: { pms: 4, ago: 4, ron95: 2 },
    prices: { pms: 12.95, ago: 13.65, ron95: 14.30 },
    banks: ['Societe Generale Ghana', 'Stanbic Bank Ghana Limited', 'Absa Bank Ghana PLC'],
    lat: 5.5872,
    lng: -0.1834,
    locationName: 'Liberation Road, Accra'
  },
  {
    id: 'st_spintex_shell',
    name: 'Spintex Road Express Station',
    stationCode: 'SHL-ACC-301',
    companyId: 'comp_shell',
    companyName: 'Vivo Energy (Shell)',
    isActive: true,
    hasRon95: true,
    pumps: { pms: 4, ago: 2, ron95: 2 },
    prices: { pms: 12.90, ago: 13.60, ron95: 14.20 },
    banks: ['Stanbic Bank Ghana Limited', 'CalBank PLC', 'GCB Bank PLC'],
    lat: 5.6289,
    lng: -0.1034,
    locationName: 'Spintex Road, Accra'
  },
  {
    id: 'st_tema_staroil',
    name: 'Tema Main Station (Harbour Rd)',
    stationCode: 'SO-TMA-001',
    companyId: 'comp_staroil',
    companyName: 'StarOil Ghana',
    isActive: true,
    hasRon95: false,
    pumps: { pms: 4, ago: 2, ron95: 0 },
    prices: { pms: 12.80, ago: 13.50, ron95: 14.10 },
    banks: ['GCB Bank PLC', 'Ecobank Ghana PLC', 'Fidelity Bank Ghana Limited', 'Stanbic Bank Ghana Limited'],
    lat: 5.6698,
    lng: -0.0166,
    locationName: 'Community 1, Tema'
  },
  {
    id: 'st_kumasi_allied',
    name: 'Kumasi Ahodwo Central Station',
    stationCode: 'ALD-ASI-501',
    companyId: 'comp_allied',
    companyName: 'Allied Oil Ghana',
    isActive: true,
    hasRon95: true,
    pumps: { pms: 4, ago: 4, ron95: 2 },
    prices: { pms: 12.85, ago: 13.55, ron95: 14.15 },
    banks: ['Fidelity Bank Ghana Limited', 'Absa Bank Ghana PLC', 'Ecobank Ghana PLC'],
    lat: 6.6710,
    lng: -1.6244,
    locationName: 'Ahodwo Roundabout, Kumasi'
  },
  {
    id: 'st_takoradi_zen',
    name: 'Takoradi Harbour Bay Station',
    stationCode: 'ZEN-WR-601',
    companyId: 'comp_zen',
    companyName: 'Zen Petroleum',
    isActive: true,
    hasRon95: false,
    pumps: { pms: 3, ago: 3, ron95: 0 },
    prices: { pms: 12.80, ago: 13.50, ron95: 14.10 },
    banks: ['Stanbic Bank Ghana Limited', 'GCB Bank PLC'],
    lat: 4.8967,
    lng: -1.7583,
    locationName: 'Commercial Area, Takoradi'
  },
  {
    id: 'st_kasoa_crown',
    name: 'Kasoa Highway Filling Station',
    stationCode: 'CP-007',
    companyId: 'comp_crown',
    companyName: 'Crown Petroleum (Independent)',
    isActive: true,
    hasRon95: false,
    pumps: { pms: 4, ago: 3, ron95: 0 },
    prices: { pms: 12.80, ago: 13.50, ron95: 14.10 },
    banks: ['GCB Bank PLC', 'CalBank PLC', 'Agricultural Development Bank (ADB) PLC'],
    lat: 5.5342,
    lng: -0.4239,
    locationName: 'Winneba Rd, Kasoa'
  }
];

export function getCompanies(): CompanyConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COMPANIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load companies', e);
  }
  saveCompanies(INITIAL_COMPANIES);
  return INITIAL_COMPANIES;
}

export function saveCompanies(companies: CompanyConfig[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  } catch (e) {
    console.error('Failed to save companies', e);
  }
}

export function addCompany(companyName: string, companyCode?: string): CompanyConfig {
  const list = getCompanies();
  const trimmedName = companyName.trim();
  const existing = list.find((c) => c.name.toLowerCase() === trimmedName.toLowerCase());
  if (existing) return existing;

  const newComp: CompanyConfig = {
    id: `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: trimmedName,
    code: companyCode?.trim() || trimmedName.substring(0, 8).toUpperCase(),
    createdAt: new Date().toISOString(),
  };
  const updated = [...list, newComp];
  saveCompanies(updated);
  return newComp;
}

export function getProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load profile', e);
  }
  return {
    attendant: 'Forecourt Attendant',
    station: 'Unassigned',
    stationId: undefined,
    stationCode: undefined,
    companyId: undefined,
    companyName: undefined,
    supervisor: 'Pending Assignment',
  };
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile', e);
  }
}

export function getStations(): StationConfig[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const migrated = parsed.map((st: StationConfig) => {
          const stationCode = typeof st.stationCode === 'string' ? st.stationCode.trim() : String(st.stationCode || '').trim();
          const hasRon95 = st.hasRon95 !== undefined ? st.hasRon95 : (st.pumps?.ron95 !== undefined ? st.pumps.ron95 > 0 : false);
          const isActive = st.isActive !== undefined ? st.isActive : true;
          const companyName = st.companyName || 'Fuel Station';
          const companyId = st.companyId || 'comp_station';
          const pumps = {
            ...st.pumps,
            ron95: hasRon95 ? (st.pumps?.ron95 || 2) : 0,
          };
          return {
            ...st,
            stationCode,
            companyName,
            companyId,
            isActive,
            hasRon95,
            pumps,
          };
        });
        return migrated;
      }
    }
  } catch (e) {
    console.error('Failed to load stations', e);
  }
  // Initialize with defaults if empty
  saveStations(INITIAL_STATIONS);
  return INITIAL_STATIONS;
}

export function saveStations(stations: StationConfig[]): void {
  try {
    const sanitized = stations.map((s) => ({
      ...s,
      stationCode: typeof s.stationCode === 'string' ? s.stationCode.trim() : String(s.stationCode || '').trim(),
      isActive: s.isActive !== undefined ? s.isActive : true,
    }));
    localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(sanitized));
    // Persist all stations to centralized Cloud Firestore
    sanitized.forEach((s) => {
      saveStationToFirestore(s);
    });
  } catch (e) {
    console.error('Failed to save stations', e);
  }
}

// Permanently sync station to Centralized Firestore Database
export async function saveStationToFirestore(station: StationConfig): Promise<void> {
  try {
    const stationDocRef = doc(db, 'stations', station.id);
    const payload = {
      id: station.id,
      name: station.name,
      stationCode: station.stationCode,
      companyId: station.companyId || 'comp_station',
      companyName: station.companyName || 'Fuel Station',
      locationName: station.locationName || '',
      isActive: station.isActive !== undefined ? station.isActive : true,
      hasRon95: !!station.hasRon95,
      pumps: station.pumps || { pms: 4, ago: 4, ron95: 0 },
      prices: station.prices || { pms: 12.8, ago: 13.5, ron95: 14.1 },
      banks: station.banks || ['GCB Bank PLC', 'Ecobank Ghana PLC'],
      updatedAt: new Date().toISOString(),
    };
    await setDoc(stationDocRef, payload, { merge: true });
  } catch (err) {
    console.warn('Firestore station save notice:', err);
  }
}

// Delete station from Centralized Firestore Database
export async function deleteStationFromFirestore(stationId: string): Promise<void> {
  try {
    const stationDocRef = doc(db, 'stations', stationId);
    await deleteDoc(stationDocRef);
  } catch (err) {
    console.warn('Firestore station deletion notice:', err);
  }
}

// Synchronize all stations from Centralized Firestore Database into local cache
export async function syncStationsFromFirestore(): Promise<StationConfig[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'stations'));
    if (!querySnapshot.empty) {
      const remoteStations: StationConfig[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as StationConfig;
        if (data && data.stationCode && data.name) {
          remoteStations.push({
            ...data,
            id: data.id || docSnap.id,
            stationCode: typeof data.stationCode === 'string' ? data.stationCode.trim() : String(data.stationCode || '').trim(),
            companyName: data.companyName || 'Fuel Station',
            companyId: data.companyId || 'comp_station',
            isActive: data.isActive !== undefined ? data.isActive : true,
          });
        }
      });

      if (remoteStations.length > 0) {
        const local = getStations();
        const stationMap = new Map<string, StationConfig>();
        local.forEach((s) => stationMap.set(s.id, s));
        remoteStations.forEach((s) => stationMap.set(s.id, s));
        const merged = Array.from(stationMap.values());
        try {
          localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(merged));
        } catch {}
        return merged;
      }
    } else {
      // Seed Firestore with initial stations if database collection is completely empty
      try {
        INITIAL_STATIONS.forEach((s) => {
          saveStationToFirestore(s);
        });
      } catch (e) {
        console.warn('Seeding initial stations notice:', e);
      }
    }
  } catch (err) {
    console.warn('Firestore stations sync notice:', err);
  }
  return getStations();
}

// Real-time Firestore listener for stations
export function subscribeToStations(
  onUpdate: (stations: StationConfig[]) => void
): () => void {
  try {
    const colRef = collection(db, 'stations');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const remoteList: StationConfig[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as StationConfig;
          if (data && data.stationCode && data.name) {
            remoteList.push({
              ...data,
              id: data.id || docSnap.id,
              stationCode: typeof data.stationCode === 'string' ? data.stationCode.trim() : String(data.stationCode || '').trim(),
              companyName: data.companyName || 'Fuel Station',
              companyId: data.companyId || 'comp_station',
              isActive: data.isActive !== undefined ? data.isActive : true,
            });
          }
        });

        if (remoteList.length > 0) {
          const local = getStations();
          const stationMap = new Map<string, StationConfig>();
          local.forEach((s) => stationMap.set(s.id, s));
          remoteList.forEach((s) => stationMap.set(s.id, s));
          const merged = Array.from(stationMap.values());
          try {
            localStorage.setItem(STORAGE_KEYS.STATIONS, JSON.stringify(merged));
          } catch {}
          onUpdate(merged);
        }
      },
      (err) => {
        console.warn('Real-time stations subscription notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach stations listener:', err);
    return () => {};
  }
}

// Find station by official company station code (exact string match, case-insensitive)
// If companyId is specified, filters within that specific company
export function getStationByCode(code: string, companyId?: string): StationConfig | undefined {
  if (!code || typeof code !== 'string') return undefined;
  const cleanCode = code.trim();
  if (!cleanCode) return undefined;
  const list = getStations();

  if (companyId && companyId.trim()) {
    const cleanComp = companyId.trim().toLowerCase();
    const matchInCompany = list.find(
      (s) =>
        (s.companyId?.toLowerCase() === cleanComp || s.companyName?.toLowerCase() === cleanComp) &&
        s.stationCode &&
        typeof s.stationCode === 'string' &&
        s.stationCode.trim().toLowerCase() === cleanCode.toLowerCase()
    );
    if (matchInCompany) return matchInCompany;
  }

  return list.find(
    (s) => s.stationCode && typeof s.stationCode === 'string' && s.stationCode.trim().toLowerCase() === cleanCode.toLowerCase()
  );
}

// Find station by ID
export function getStationById(id: string): StationConfig | undefined {
  if (!id) return undefined;
  const cleanId = id.trim();
  const list = getStations();
  return list.find((s) => s.id === cleanId);
}

// Create or update a station when configured by a Supervisor / Manager
export function createOrUpdateStationBySupervisor(params: {
  name: string;
  stationCode: string;
  companyName?: string;
  locationName?: string;
  isActive?: boolean;
}): StationConfig {
  const stations = getStations();
  const cleanCode = params.stationCode.trim();
  const cleanName = params.name.trim();
  const compName = params.companyName?.trim() || 'Independent Station';
  
  // Register company if new
  const company = addCompany(compName);
  
  // Check if station already exists by code or name
  const existingIdx = stations.findIndex(
    (s) => s.stationCode.trim().toLowerCase() === cleanCode.toLowerCase()
  );
  
  if (existingIdx >= 0) {
    const updated: StationConfig = {
      ...stations[existingIdx],
      name: cleanName || stations[existingIdx].name,
      companyId: company.id,
      companyName: company.name,
      locationName: params.locationName?.trim() || stations[existingIdx].locationName,
      isActive: params.isActive !== undefined ? params.isActive : true,
    };
    stations[existingIdx] = updated;
    saveStations(stations);
    saveStationToFirestore(updated);
    return updated;
  }
  
  const newStation: StationConfig = {
    id: `st_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: cleanName,
    stationCode: cleanCode,
    companyId: company.id,
    companyName: company.name,
    locationName: params.locationName?.trim() || 'Forecourt Branch',
    isActive: params.isActive !== undefined ? params.isActive : true,
    hasRon95: false,
    pumps: { pms: 4, ago: 2, ron95: 0 },
    prices: { pms: 12.80, ago: 13.50, ron95: 14.10 },
    banks: ['GCB Bank PLC', 'Ecobank Ghana PLC', 'Absa Bank Ghana PLC'],
  };
  
  const updatedList = [...stations, newStation];
  saveStations(updatedList);
  saveStationToFirestore(newStation);
  return newStation;
}

// Check station code status (valid, not_found, or inactive) - STRICT LOOKUP, NEVER AUTO-CREATES
export function verifyStationCodeStatus(code: string, companyId?: string): {
  valid: boolean;
  status: 'valid' | 'empty' | 'not_found' | 'inactive';
  station?: StationConfig;
  message: string;
} {
  if (!code || typeof code !== 'string' || !code.trim()) {
    return {
      valid: false,
      status: 'empty',
      message: 'Please enter the official Station Code provided by your station manager.',
    };
  }

  const cleanCode = code.trim();
  const matched = getStationByCode(cleanCode, companyId);

  if (!matched) {
    return {
      valid: false,
      status: 'not_found',
      message: `Station Code "${cleanCode}" is invalid or not registered in the database. Please check with your Station Manager.`,
    };
  }

  if (matched.isActive === false) {
    return {
      valid: false,
      status: 'inactive',
      station: matched,
      message: `Station "${matched.name}" (${matched.stationCode}) is currently marked inactive in the system. Please contact your manager.`,
    };
  }

  return {
    valid: true,
    status: 'valid',
    station: matched,
    message: `Verified: ${matched.name} (${matched.stationCode}) - ${matched.companyName || 'Registered'}`,
  };
}

// Check station code status asynchronously, querying Firestore if not in local cache
export async function verifyStationCodeStatusAsync(
  code: string,
  companyId?: string
): Promise<{
  valid: boolean;
  status: 'valid' | 'empty' | 'not_found' | 'inactive';
  station?: StationConfig;
  message: string;
}> {
  const localCheck = verifyStationCodeStatus(code, companyId);
  if (localCheck.valid || localCheck.status === 'empty' || localCheck.status === 'inactive') {
    return localCheck;
  }

  // Not found in local cache - query Centralized Cloud Firestore
  try {
    const refreshed = await syncStationsFromFirestore();
    const cleanCode = code.trim().toLowerCase();
    const found = refreshed.find(
      (s) => s.stationCode && s.stationCode.trim().toLowerCase() === cleanCode
    );
    if (found) {
      if (found.isActive === false) {
        return {
          valid: false,
          status: 'inactive',
          station: found,
          message: `Station "${found.name}" (${found.stationCode}) is currently marked inactive in the system. Please contact your manager.`,
        };
      }
      return {
        valid: true,
        status: 'valid',
        station: found,
        message: `Verified: ${found.name} (${found.stationCode}) - ${found.companyName || 'Registered'}`,
      };
    }
  } catch (err) {
    console.warn('Firestore station code verification notice:', err);
  }

  return localCheck;
}

// ==========================================
// AUDIT TRAIL SERVICES (STATION CODES, WORKERS, CLOSURES)
// ==========================================

export function getStationCodeAuditLogs(): StationCodeAuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STATION_CODE_AUDIT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load station code audit logs', e);
  }
  return [];
}

export function addStationCodeAuditLog(
  entry: Omit<StationCodeAuditEntry, 'id' | 'timestamp'>
): StationCodeAuditEntry {
  const newEntry: StationCodeAuditEntry = {
    ...entry,
    id: 'sc_audit_' + generateId(),
    timestamp: new Date().toISOString(),
  };
  try {
    const logs = getStationCodeAuditLogs();
    const updated = [newEntry, ...logs];
    localStorage.setItem(STORAGE_KEYS.STATION_CODE_AUDIT, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save station code audit log', e);
  }
  return newEntry;
}

export function getWorkerAssignmentAuditLogs(): WorkerAssignmentAuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WORKER_ASSIGNMENT_AUDIT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load worker assignment audit logs', e);
  }
  return [];
}

export function addWorkerAssignmentAuditLog(
  entry: Omit<WorkerAssignmentAuditEntry, 'id' | 'timestamp'>
): WorkerAssignmentAuditEntry {
  const newEntry: WorkerAssignmentAuditEntry = {
    ...entry,
    id: 'wa_audit_' + generateId(),
    timestamp: new Date().toISOString(),
  };
  try {
    const logs = getWorkerAssignmentAuditLogs();
    const updated = [newEntry, ...logs];
    localStorage.setItem(STORAGE_KEYS.WORKER_ASSIGNMENT_AUDIT, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save worker assignment audit log', e);
  }
  return newEntry;
}

export function getAccountClosureAuditLogs(): AccountClosureAuditEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACCOUNT_CLOSURE_AUDIT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to load account closure audit logs', e);
  }
  return [];
}

export function addAccountClosureAuditLog(
  entry: Omit<AccountClosureAuditEntry, 'id' | 'timestamp'>
): AccountClosureAuditEntry {
  const newEntry: AccountClosureAuditEntry = {
    ...entry,
    id: 'ac_audit_' + generateId(),
    timestamp: new Date().toISOString(),
  };
  try {
    const logs = getAccountClosureAuditLogs();
    const updated = [newEntry, ...logs];
    localStorage.setItem(STORAGE_KEYS.ACCOUNT_CLOSURE_AUDIT, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save account closure audit log', e);
  }
  return newEntry;
}

function getSampleRecords(): ShiftRecord[] {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  const rec1: ShiftRecord = {
    id: 'sample_shift_1',
    date: today,
    shiftGroup: 'A',
    shiftPeriod: 'Day',
    attendant: 'Daniel Mensah',
    station: 'Tema Main Station (Harbour Rd)',
    supervisor: 'Kofi Asare',
    notes: 'Smooth day shift. No pump breakdowns reported.',
    fuels: {
      pms: {
        price: 12.80,
        pumps: [
          { id: 'p1', name: 'Pump 1 (Island A)', opening: 145200.50, closing: 147650.00, rtt: 10 },
          { id: 'p2', name: 'Pump 2 (Island A)', opening: 210800.00, closing: 213100.50, rtt: 10 },
          { id: 'p3', name: 'Pump 3 (Island B)', opening: 98400.00, closing: 100250.00, rtt: 0 },
          { id: 'p4', name: 'Pump 4 (Island B)', opening: 85200.00, closing: 87100.00, rtt: 0 },
        ],
      },
      ago: {
        price: 13.50,
        pumps: [
          { id: 'p5', name: 'Diesel 1 (Heavy Bay)', opening: 320100.00, closing: 324500.00, rtt: 20 },
          { id: 'p6', name: 'Diesel 2 (Heavy Bay)', opening: 198400.00, closing: 202100.00, rtt: 0 },
        ],
      },
      ron95: {
        price: 14.10,
        pumps: [
          { id: 'p7', name: 'RON95 Premium 1', opening: 45100.00, closing: 46250.00, rtt: 0 },
          { id: 'p8', name: 'RON95 Premium 2', opening: 38200.00, closing: 39150.00, rtt: 0 },
        ],
      },
    },
    approved: [
      { id: 'app1', customer: 'DHL Express Ghana Ltd', reference: 'PO-88392', amount: 15400.00 },
      { id: 'app2', customer: 'Tema Port Logistics Co', reference: 'INV-4029', amount: 8600.00 },
    ],
    evalue: [
      { id: 'ev1', channel: 'MoMo', reference: 'MTN-99824', amount: 18250.00 },
      { id: 'ev2', channel: 'Bank', bank: 'GCB Bank', reference: 'GCB-POS-104', amount: 24500.00 },
      { id: 'ev3', channel: 'Card', reference: 'VISA-4421', amount: 9350.00 },
    ],
    collections: [
      { id: 'col1', customer: 'VIP Jeoun Transport', reference: 'RECPT-0041', amount: 5000.00 },
    ],
    generator: [
      { id: 'gen1', description: 'Station Backup Generator Top-up (50L AGO)', amount: 675.00 },
    ],
    cash: {
      denoms: {
        200: 450, // 90,000
        100: 750, // 75,000
        50: 360,  // 18,000
        20: 320,  // 6,400
        10: 180,  // 1,800
        5: 120,   // 600
        2: 50,    // 100
        1: 25,    // 25
      },
      coins: {
        2.00: 40, // 80
        1.00: 60, // 60
        0.50: 40, // 20
        0.20: 30, // 6
        0.10: 40, // 4
      },
    },
    status: 'submitted',
    revisionOf: null,
    submittedAt: new Date(Date.now() - 7200000).toISOString(),
    createdAt: new Date(Date.now() - 28800000).toISOString(),
    _step: 7,
  };

  const rec2: ShiftRecord = {
    id: 'sample_shift_2',
    date: yesterday,
    shiftGroup: 'B',
    shiftPeriod: 'Night',
    attendant: 'Emmanuel Quaye',
    station: 'Tema Main Station (Harbour Rd)',
    supervisor: 'Kofi Asare',
    notes: 'Night shift completed.',
    fuels: {
      pms: {
        price: 12.80,
        pumps: [
          { id: 'p1', name: 'Pump 1', opening: 142100.00, closing: 145200.50, rtt: 0 },
          { id: 'p2', name: 'Pump 2', opening: 208500.00, closing: 210800.00, rtt: 0 },
          { id: 'p3', name: 'Pump 3', opening: 96900.00, closing: 98400.00, rtt: 0 },
          { id: 'p4', name: 'Pump 4', opening: 83700.00, closing: 85200.00, rtt: 0 },
        ],
      },
      ago: {
        price: 13.50,
        pumps: [
          { id: 'p5', name: 'Diesel 1', opening: 316500.00, closing: 320100.00, rtt: 10 },
          { id: 'p6', name: 'Diesel 2', opening: 195200.00, closing: 198400.00, rtt: 0 },
        ],
      },
      ron95: {
        price: 14.10,
        pumps: [
          { id: 'p7', name: 'RON95 1', opening: 44200.00, closing: 45100.00, rtt: 0 },
          { id: 'p8', name: 'RON95 2', opening: 37400.00, closing: 38200.00, rtt: 0 },
        ],
      },
    },
    approved: [
      { id: 'app3', customer: 'Metro Mass Transit Ltd', reference: 'MMT-7721', amount: 12000.00 },
    ],
    evalue: [
      { id: 'ev4', channel: 'MoMo', reference: 'MTN-8812', amount: 14200.00 },
      { id: 'ev5', channel: 'Bank', bank: 'GCB Bank', reference: 'POS-992', amount: 18500.00 },
    ],
    collections: [],
    generator: [],
    cash: {
      denoms: {
        200: 380,
        100: 620,
        50: 280,
        20: 210,
        10: 150,
        5: 80,
        2: 30,
        1: 10,
      },
      coins: {
        2.00: 20,
        1.00: 30,
        0.50: 20,
        0.20: 10,
        0.10: 10,
      },
    },
    status: 'submitted',
    revisionOf: null,
    submittedAt: new Date(Date.now() - 86400000 + 28800000).toISOString(),
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    _step: 7,
  };

  return [rec1, rec2];
}

export function getAllRecords(): ShiftRecord[] {
  try {
    const records: ShiftRecord[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEYS.RECORDS_PREFIX)) {
        // Skip any legacy sample IDs
        if (key.includes('sample_shift_')) {
          try {
            localStorage.removeItem(key);
          } catch {}
          continue;
        }
        const item = localStorage.getItem(key);
        if (item) {
          try {
            records.push(JSON.parse(item));
          } catch (e) {
            console.error('Failed to parse record:', key, e);
          }
        }
      }
    }

    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (e) {
    console.error('Failed to get records', e);
    return [];
  }
}

export function getRecordById(id: string): ShiftRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RECORDS_PREFIX + id);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to get record ' + id, e);
  }
  return null;
}

// Synchronize shift record to Centralized Firestore Database
export async function saveRecordToFirestore(record: ShiftRecord): Promise<void> {
  try {
    const docRef = doc(db, 'shift_records', record.id);
    // Sanitize object to remove undefined properties before persisting to Firestore
    const sanitized = JSON.parse(JSON.stringify(record));

    // Ensure station, stationId, stationCode, attendant, attendantId are consistently populated
    const user = getCurrentUser();
    if (!sanitized.station && user?.station) sanitized.station = user.station;
    if (!sanitized.stationId && user?.stationId) sanitized.stationId = user.stationId;
    if (!sanitized.stationCode && user?.stationCode) sanitized.stationCode = user.stationCode;
    if (!sanitized.attendant && user?.fullName) sanitized.attendant = user.fullName;
    if (!sanitized.attendantId && user?.id) sanitized.attendantId = user.id;
    if (auth.currentUser?.uid) sanitized.userId = auth.currentUser.uid;

    await setDoc(docRef, sanitized, { merge: true });
  } catch (err) {
    console.warn('Firestore shift record save notice:', err);
  }
}

// Synchronize all shift records from Centralized Firestore Database into local cache
export async function syncRecordsFromFirestore(activeUser?: AuthUser | null): Promise<ShiftRecord[]> {
  const user = activeUser || getCurrentUser();
  if (!user || !auth.currentUser) {
    return getAllRecords();
  }

  const userStation = user.station;
  if (!userStation || userStation.toLowerCase() === 'unassigned' || userStation.toLowerCase() === 'pending assignment') {
    return getAllRecords();
  }

  try {
    const recordsCol = collection(db, 'shift_records');
    let q;

    if (user.role === 'supervisor') {
      // Supervisor queries records belonging to their assigned station
      q = query(recordsCol, where('station', '==', userStation));
    } else {
      // Attendant queries their own shift records for their assigned station
      const attendantName = user.fullName || user.staffId || '';
      q = query(
        recordsCol,
        where('station', '==', userStation),
        where('attendant', '==', attendantName)
      );
    }

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const remoteRecords: ShiftRecord[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as ShiftRecord;
        if (data && data.id) {
          remoteRecords.push(data);
          try {
            localStorage.setItem(STORAGE_KEYS.RECORDS_PREFIX + data.id, JSON.stringify(data));
          } catch {}
        }
      });
      if (remoteRecords.length > 0) {
        return remoteRecords.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      }
    }
  } catch (err) {
    console.warn('Firestore shift records sync notice:', err);
  }
  return getAllRecords();
}

// Load daily records directly from Firestore (falls back to local cache if offline)
export async function loadRecordsFromFirestore(activeUser?: AuthUser | null): Promise<ShiftRecord[]> {
  return syncRecordsFromFirestore(activeUser);
}

// Subscribe to real-time updates for shift records in Firestore
export function subscribeToShiftRecords(
  onUpdate: (records: ShiftRecord[]) => void,
  activeUser?: AuthUser | null
): () => void {
  const user = activeUser || getCurrentUser();
  if (!user || !auth.currentUser) {
    return () => {};
  }

  const userStation = user.station;
  if (!userStation || userStation.toLowerCase() === 'unassigned' || userStation.toLowerCase() === 'pending assignment') {
    return () => {};
  }

  try {
    const recordsCol = collection(db, 'shift_records');
    let q;

    if (user.role === 'supervisor') {
      // Supervisor subscribes to all records belonging to their assigned station
      q = query(recordsCol, where('station', '==', userStation));
    } else {
      // Attendant subscribes to their own shift records for their assigned station
      const attendantName = user.fullName || user.staffId || '';
      q = query(
        recordsCol,
        where('station', '==', userStation),
        where('attendant', '==', attendantName)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const remoteList: ShiftRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ShiftRecord;
          if (data && data.id) {
            remoteList.push(data);
            try {
              localStorage.setItem(STORAGE_KEYS.RECORDS_PREFIX + data.id, JSON.stringify(data));
            } catch {}
          }
        });

        // Merge remote list with any local drafts
        const local = getAllRecords();
        const map = new Map<string, ShiftRecord>();
        local.forEach((r) => map.set(r.id, r));
        remoteList.forEach((r) => map.set(r.id, r));

        const combined = Array.from(map.values()).sort((a, b) =>
          (b.createdAt || '').localeCompare(a.createdAt || '')
        );
        onUpdate(combined);
      },
      (error) => {
        console.warn('Firestore real-time records subscription notice:', error);
      }
    );
    return unsubscribe;
  } catch (e) {
    console.warn('Failed to attach Firestore real-time listener:', e);
    return () => {};
  }
}

export function saveRecord(record: ShiftRecord): boolean {
  try {
    localStorage.setItem(STORAGE_KEYS.RECORDS_PREFIX + record.id, JSON.stringify(record));
    saveRecordToFirestore(record);
    return true;
  } catch (e) {
    console.error('Failed to save record', e);
    return false;
  }
}

export function deleteRecord(id: string): boolean {
  try {
    localStorage.removeItem(STORAGE_KEYS.RECORDS_PREFIX + id);
    // Delete from Cloud Firestore as well
    const docRef = doc(db, 'shift_records', id);
    deleteDoc(docRef).catch((err) => {
      console.warn('Firestore shift record deletion notice:', err);
    });
    return true;
  } catch (e) {
    console.error('Failed to delete record', e);
    return false;
  }
}

// ==========================================
// SUPERVISOR DAILY MASTER EXCEL SHEETS
// ==========================================
const SUPERVISOR_SHEETS_KEY = 'dsr_supervisor_master_sheets';

// Synchronize supervisor sheet to Centralized Firestore Database
export async function saveSupervisorSheetToFirestore(sheet: import('../types').SupervisorDailySheet): Promise<void> {
  try {
    const docRef = doc(db, 'supervisor_sheets', sheet.id);
    await setDoc(docRef, sheet, { merge: true });
  } catch (err) {
    console.warn('Firestore supervisor sheet save notice:', err);
  }
}

// Synchronize supervisor sheets from Centralized Firestore Database into local cache
export async function syncSupervisorSheetsFromFirestore(): Promise<import('../types').SupervisorDailySheet[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'supervisor_sheets'));
    if (!querySnapshot.empty) {
      const remoteSheets: import('../types').SupervisorDailySheet[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as import('../types').SupervisorDailySheet;
        if (data && data.id && data.station) {
          remoteSheets.push(data);
        }
      });
      if (remoteSheets.length > 0) {
        const local = getAllSupervisorSheets();
        const map = new Map<string, import('../types').SupervisorDailySheet>();
        local.forEach((s) => map.set(s.id, s));
        remoteSheets.forEach((s) => map.set(s.id, s));
        const merged = Array.from(map.values());
        saveSupervisorSheets(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Firestore supervisor sheets sync notice:', err);
  }
  return getAllSupervisorSheets();
}

export function createDefaultSupervisorSheet(
  profile: UserProfile,
  station: StationConfig,
  dateStr?: string
): import('../types').SupervisorDailySheet {
  const today = dateStr || new Date().toISOString().split('T')[0];
  const superPumpCount = station.pumps?.pms || 4;
  const dieselPumpCount = station.pumps?.ago || 6;
  const ron95PumpCount = station.hasRon95 ? (station.pumps?.ron95 || 2) : 0;

  const superPumps: import('../types').SupervisorPumpData[] = Array.from({ length: superPumpCount }, () => ({
    closing: 0,
    opening: 0,
    rtt: 0,
  }));

  const dieselPumps: import('../types').SupervisorPumpData[] = Array.from({ length: dieselPumpCount }, () => ({
    closing: 0,
    opening: 0,
    rtt: 0,
  }));

  const defaultLubricants: import('../types').SupervisorLubeItem[] = [
    { id: generateId(), name: 'SAE 40 1L', unitPrice: 64, qty: 0, amount: 0 },
    { id: generateId(), name: 'SAE 40 4L', unitPrice: 250, qty: 0, amount: 0 },
    { id: generateId(), name: 'SUPER CAMEL 1L', unitPrice: 85, qty: 0, amount: 0 },
    { id: generateId(), name: 'GEAR OIL 90 1L', unitPrice: 120, qty: 0, amount: 0 },
    { id: generateId(), name: 'ATF D-III 1L', unitPrice: 95, qty: 0, amount: 0 },
  ];

  const defaultExpenses: import('../types').SupervisorExpenseItem[] = [
    { id: generateId(), category: 'rpay', description: 'R-PAY Mobile Sales', amount: 0 },
    { id: generateId(), category: 'tingg', description: 'TINGG Payment Terminal', amount: 0 },
    { id: generateId(), category: 'visa', description: 'VISA / Card POS Swipe', amount: 0 },
    { id: generateId(), category: 'operational', description: 'Operational Expenses', amount: 0 },
    { id: generateId(), category: 'genset', description: 'Genset Fuel', amount: 0 },
    { id: generateId(), category: 'water', description: 'Water Bill / Utilities', amount: 0 },
  ];

  return {
    id: `sup_sheet_${generateId()}`,
    date: today,
    station: station.name,
    stationCode: station.stationCode,
    supervisor: profile.supervisor || 'Shift Supervisor',
    status: 'draft',
    superFuel: {
      unitPrice: station.prices?.pms || 13.27,
      pumps: superPumps,
      attendantPairs: [
        { pumpRange: 'Pumps 1 - 2', attendantNames: '', amount: 0 },
        { pumpRange: 'Pumps 3 - 4', attendantNames: '', amount: 0 },
      ],
    },
    dieselFuel: {
      unitPrice: station.prices?.ago || 16.10,
      pumps: dieselPumps,
      attendantPairs: [
        { pumpRange: 'Pumps 1 - 2', attendantNames: '', amount: 0 },
        { pumpRange: 'Pumps 3 - 4', attendantNames: '', amount: 0 },
      ],
    },
    ron95Fuel: station.hasRon95 ? {
      unitPrice: station.prices?.ron95 || 14.25,
      pumps: Array.from({ length: ron95PumpCount }, () => ({ closing: 0, opening: 0, rtt: 0 })),
      attendantPairs: [{ pumpRange: 'Pumps 1 - 2', attendantNames: '', amount: 0 }],
    } : undefined,
    stockAccount: {
      super: { openingStock: 0, stockReceived: 0, closingStockDip: 0 },
      diesel: { openingStock: 0, stockReceived: 0, closingStockDip: 0 },
      ron95: station.hasRon95 ? { openingStock: 0, stockReceived: 0, closingStockDip: 0 } : undefined,
    },
    lubricants: defaultLubricants,
    expenses: defaultExpenses,
    creditSales: 0,
    starcardFunding: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function getAllSupervisorSheets(): import('../types').SupervisorDailySheet[] {
  try {
    const raw = localStorage.getItem(SUPERVISOR_SHEETS_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load supervisor sheets', e);
  }

  return [];
}

export function clearAllSupervisorSheets(): void {
  try {
    localStorage.setItem(SUPERVISOR_SHEETS_KEY, JSON.stringify([]));
  } catch (e) {
    console.error('Failed to clear supervisor sheets', e);
  }
}

export function saveSupervisorSheets(sheets: import('../types').SupervisorDailySheet[]): void {
  try {
    localStorage.setItem(SUPERVISOR_SHEETS_KEY, JSON.stringify(sheets));
  } catch (e) {
    console.error('Failed to save supervisor sheets', e);
  }
}

export function saveSupervisorSheet(sheet: import('../types').SupervisorDailySheet): boolean {
  try {
    const list = getAllSupervisorSheets();
    const idx = list.findIndex((s) => s.id === sheet.id);
    let updated: import('../types').SupervisorDailySheet[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = { ...sheet, updatedAt: new Date().toISOString() };
    } else {
      updated = [sheet, ...list];
    }
    saveSupervisorSheets(updated);
    saveSupervisorSheetToFirestore(sheet);
    return true;
  } catch (e) {
    console.error('Failed to save single supervisor sheet', e);
    return false;
  }
}

export function deleteSupervisorSheet(id: string): boolean {
  try {
    const list = getAllSupervisorSheets();
    const updated = list.filter((s) => s.id !== id);
    saveSupervisorSheets(updated);
    return true;
  } catch (e) {
    console.error('Failed to delete supervisor sheet', e);
    return false;
  }
}

