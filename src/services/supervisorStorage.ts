import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { AttendantAccountabilityRecord, SupervisorSalesAccountRecord } from '../types';

export interface PLShift {
  id: string;
  date: string;
  shiftType: string;
  supervisor: string;
  attendants: any[];
  startTime: string;
  endTime: string;
  super: any;
  ron95: any;
  diesel: any;
  stock: {
    super: any;
    ron95: any;
    diesel: any;
  };
  lubricants?: any[];
  payments?: any;
  expenses: any[];
  credit: any[];
  vouchers: any[];
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

const STORAGE_KEYS = {
  ATTENDANT_ACCOUNTABILITY: 'pl_attendant_accountability',
  SUPERVISOR_SALES_ACCOUNTS: 'pl_supervisor_sales_accounts',
  SHIFTS: 'pl_shifts',
  DELIVERIES: 'pl_deliveries',
};

// ============================================================================
// ATTENDANT ACCOUNTABILITY RECORDS
// ============================================================================

export function getLocalAttendantAccountability(): AttendantAccountabilityRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ATTENDANT_ACCOUNTABILITY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse local attendant accountability', e);
  }
  return [];
}

export function saveLocalAttendantAccountability(records: AttendantAccountabilityRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ATTENDANT_ACCOUNTABILITY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to cache local attendant accountability', e);
  }
}

export async function saveAttendantAccountabilityRecord(
  record: AttendantAccountabilityRecord
): Promise<void> {
  const local = getLocalAttendantAccountability();
  const idx = local.findIndex((r) => r.id === record.id);
  let updated: AttendantAccountabilityRecord[];
  if (idx >= 0) {
    updated = [...local];
    updated[idx] = record;
  } else {
    updated = [record, ...local];
  }
  saveLocalAttendantAccountability(updated);

  try {
    const docRef = doc(db, 'attendant_accountability', record.id);
    await setDoc(docRef, record, { merge: true });
  } catch (err) {
    console.warn('Firestore attendant accountability save notice:', err);
  }
}

export async function saveAllAttendantAccountabilityRecords(
  records: AttendantAccountabilityRecord[]
): Promise<void> {
  saveLocalAttendantAccountability(records);
  try {
    await Promise.all(
      records.map((r) => setDoc(doc(db, 'attendant_accountability', r.id), r, { merge: true }))
    );
  } catch (err) {
    console.warn('Firestore bulk attendant accountability save notice:', err);
  }
}

export async function deleteAttendantAccountabilityRecord(id: string): Promise<void> {
  const local = getLocalAttendantAccountability().filter((r) => r.id !== id);
  saveLocalAttendantAccountability(local);
  try {
    await deleteDoc(doc(db, 'attendant_accountability', id));
  } catch (err) {
    console.warn('Firestore attendant accountability delete notice:', err);
  }
}

export async function syncAttendantAccountabilityFromFirestore(): Promise<
  AttendantAccountabilityRecord[]
> {
  try {
    const snap = await getDocs(collection(db, 'attendant_accountability'));
    if (!snap.empty) {
      const remoteList: AttendantAccountabilityRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as AttendantAccountabilityRecord;
        if (data && data.id) {
          remoteList.push(data);
        }
      });
      if (remoteList.length > 0) {
        const local = getLocalAttendantAccountability();
        const map = new Map<string, AttendantAccountabilityRecord>();
        local.forEach((r) => map.set(r.id, r));
        remoteList.forEach((r) => map.set(r.id, r));
        const merged = Array.from(map.values()).sort((a, b) =>
          (b.createdAt || '').localeCompare(a.createdAt || '')
        );
        saveLocalAttendantAccountability(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Firestore attendant accountability sync notice:', err);
  }
  return getLocalAttendantAccountability();
}

export function subscribeToAttendantAccountability(
  onUpdate: (records: AttendantAccountabilityRecord[]) => void
): () => void {
  try {
    const colRef = collection(db, 'attendant_accountability');
    const unsubscribe = onSnapshot(
      colRef,
      (snap) => {
        const remoteList: AttendantAccountabilityRecord[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as AttendantAccountabilityRecord;
          if (data && data.id) {
            remoteList.push(data);
          }
        });

        const local = getLocalAttendantAccountability();
        const map = new Map<string, AttendantAccountabilityRecord>();
        local.forEach((r) => map.set(r.id, r));
        remoteList.forEach((r) => map.set(r.id, r));

        const merged = Array.from(map.values()).sort((a, b) =>
          (b.createdAt || '').localeCompare(a.createdAt || '')
        );
        saveLocalAttendantAccountability(merged);
        onUpdate(merged);
      },
      (err) => {
        console.warn('Real-time attendant accountability subscription notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach attendant accountability listener:', err);
    return () => {};
  }
}

// ============================================================================
// SUPERVISOR SALES ACCOUNT RECORDS
// ============================================================================

export function getLocalSupervisorSalesAccounts(): SupervisorSalesAccountRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SUPERVISOR_SALES_ACCOUNTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse local supervisor sales accounts', e);
  }
  return [];
}

export function saveLocalSupervisorSalesAccounts(
  records: SupervisorSalesAccountRecord[]
): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SUPERVISOR_SALES_ACCOUNTS, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to cache local supervisor sales accounts', e);
  }
}

export async function saveSupervisorSalesAccountRecord(
  record: SupervisorSalesAccountRecord
): Promise<void> {
  const local = getLocalSupervisorSalesAccounts();
  const idx = local.findIndex((r) => r.id === record.id);
  let updated: SupervisorSalesAccountRecord[];
  if (idx >= 0) {
    updated = [...local];
    updated[idx] = record;
  } else {
    updated = [record, ...local];
  }
  saveLocalSupervisorSalesAccounts(updated);

  try {
    const docRef = doc(db, 'supervisor_sales_accounts', record.id);
    await setDoc(docRef, record, { merge: true });
  } catch (err) {
    console.warn('Firestore supervisor sales account save notice:', err);
  }
}

export async function deleteSupervisorSalesAccountRecord(id: string): Promise<void> {
  const local = getLocalSupervisorSalesAccounts().filter((r) => r.id !== id);
  saveLocalSupervisorSalesAccounts(local);
  try {
    await deleteDoc(doc(db, 'supervisor_sales_accounts', id));
  } catch (err) {
    console.warn('Firestore supervisor sales account delete notice:', err);
  }
}

export async function syncSupervisorSalesAccountsFromFirestore(): Promise<
  SupervisorSalesAccountRecord[]
> {
  try {
    const snap = await getDocs(collection(db, 'supervisor_sales_accounts'));
    if (!snap.empty) {
      const remoteList: SupervisorSalesAccountRecord[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as SupervisorSalesAccountRecord;
        if (data && data.id) {
          remoteList.push(data);
        }
      });
      if (remoteList.length > 0) {
        const local = getLocalSupervisorSalesAccounts();
        const map = new Map<string, SupervisorSalesAccountRecord>();
        local.forEach((r) => map.set(r.id, r));
        remoteList.forEach((r) => map.set(r.id, r));
        const merged = Array.from(map.values()).sort((a, b) =>
          (b.date || '').localeCompare(a.date || '')
        );
        saveLocalSupervisorSalesAccounts(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Firestore supervisor sales accounts sync notice:', err);
  }
  return getLocalSupervisorSalesAccounts();
}

export function subscribeToSupervisorSalesAccounts(
  onUpdate: (records: SupervisorSalesAccountRecord[]) => void
): () => void {
  try {
    const colRef = collection(db, 'supervisor_sales_accounts');
    const unsubscribe = onSnapshot(
      colRef,
      (snap) => {
        const remoteList: SupervisorSalesAccountRecord[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as SupervisorSalesAccountRecord;
          if (data && data.id) {
            remoteList.push(data);
          }
        });

        const local = getLocalSupervisorSalesAccounts();
        const map = new Map<string, SupervisorSalesAccountRecord>();
        local.forEach((r) => map.set(r.id, r));
        remoteList.forEach((r) => map.set(r.id, r));

        const merged = Array.from(map.values()).sort((a, b) =>
          (b.date || '').localeCompare(a.date || '')
        );
        saveLocalSupervisorSalesAccounts(merged);
        onUpdate(merged);
      },
      (err) => {
        console.warn('Real-time supervisor sales accounts subscription notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach supervisor sales accounts listener:', err);
    return () => {};
  }
}

// ============================================================================
// SUPERVISOR SHIFTS (PLShift)
// ============================================================================

export function getLocalSupervisorShifts(): PLShift[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHIFTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse local supervisor shifts', e);
  }
  return [];
}

export function saveLocalSupervisorShifts(shifts: PLShift[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));
  } catch (e) {
    console.error('Failed to cache local supervisor shifts', e);
  }
}

export async function saveSupervisorShiftRecord(shift: PLShift): Promise<void> {
  const local = getLocalSupervisorShifts();
  const others = local.filter((s) => s.id !== shift.id);
  const updated = [...others, shift].sort((a, b) =>
    a.date + a.shiftType < b.date + b.shiftType ? 1 : -1
  );
  saveLocalSupervisorShifts(updated);

  try {
    const docRef = doc(db, 'supervisor_shifts', shift.id);
    await setDoc(docRef, shift, { merge: true });
  } catch (err) {
    console.warn('Firestore supervisor shift save notice:', err);
  }
}

export async function deleteSupervisorShiftRecord(id: string): Promise<void> {
  const local = getLocalSupervisorShifts().filter((s) => s.id !== id);
  saveLocalSupervisorShifts(local);
  try {
    await deleteDoc(doc(db, 'supervisor_shifts', id));
  } catch (err) {
    console.warn('Firestore supervisor shift delete notice:', err);
  }
}

export async function syncSupervisorShiftsFromFirestore(): Promise<PLShift[]> {
  try {
    const snap = await getDocs(collection(db, 'supervisor_shifts'));
    if (!snap.empty) {
      const remoteList: PLShift[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as PLShift;
        if (data && data.id) {
          remoteList.push(data);
        }
      });
      if (remoteList.length > 0) {
        const local = getLocalSupervisorShifts();
        const map = new Map<string, PLShift>();
        local.forEach((s) => map.set(s.id, s));
        remoteList.forEach((s) => map.set(s.id, s));
        const merged = Array.from(map.values()).sort((a, b) =>
          a.date + a.shiftType < b.date + b.shiftType ? 1 : -1
        );
        saveLocalSupervisorShifts(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Firestore supervisor shifts sync notice:', err);
  }
  return getLocalSupervisorShifts();
}

export function subscribeToSupervisorShifts(
  onUpdate: (shifts: PLShift[]) => void
): () => void {
  try {
    const colRef = collection(db, 'supervisor_shifts');
    const unsubscribe = onSnapshot(
      colRef,
      (snap) => {
        const remoteList: PLShift[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as PLShift;
          if (data && data.id) {
            remoteList.push(data);
          }
        });

        const local = getLocalSupervisorShifts();
        const map = new Map<string, PLShift>();
        local.forEach((s) => map.set(s.id, s));
        remoteList.forEach((s) => map.set(s.id, s));

        const merged = Array.from(map.values()).sort((a, b) =>
          a.date + a.shiftType < b.date + b.shiftType ? 1 : -1
        );
        saveLocalSupervisorShifts(merged);
        onUpdate(merged);
      },
      (err) => {
        console.warn('Real-time supervisor shifts subscription notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach supervisor shifts listener:', err);
    return () => {};
  }
}

// ============================================================================
// SUPERVISOR DELIVERIES (PLDelivery)
// ============================================================================

export function getLocalSupervisorDeliveries(): PLDelivery[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELIVERIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse local supervisor deliveries', e);
  }
  return [];
}

export function saveLocalSupervisorDeliveries(deliveries: PLDelivery[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DELIVERIES, JSON.stringify(deliveries));
  } catch (e) {
    console.error('Failed to cache local supervisor deliveries', e);
  }
}

export async function saveSupervisorDeliveryRecord(delivery: PLDelivery): Promise<void> {
  const local = getLocalSupervisorDeliveries();
  const updated = [delivery, ...local.filter((x) => x.id !== delivery.id)];
  saveLocalSupervisorDeliveries(updated);

  try {
    const docRef = doc(db, 'supervisor_deliveries', delivery.id);
    await setDoc(docRef, delivery, { merge: true });
  } catch (err) {
    console.warn('Firestore supervisor delivery save notice:', err);
  }
}

export async function deleteSupervisorDeliveryRecord(id: string): Promise<void> {
  const local = getLocalSupervisorDeliveries().filter((d) => d.id !== id);
  saveLocalSupervisorDeliveries(local);
  try {
    await deleteDoc(doc(db, 'supervisor_deliveries', id));
  } catch (err) {
    console.warn('Firestore supervisor delivery delete notice:', err);
  }
}

export async function syncSupervisorDeliveriesFromFirestore(): Promise<PLDelivery[]> {
  try {
    const snap = await getDocs(collection(db, 'supervisor_deliveries'));
    if (!snap.empty) {
      const remoteList: PLDelivery[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as PLDelivery;
        if (data && data.id) {
          remoteList.push(data);
        }
      });
      if (remoteList.length > 0) {
        const local = getLocalSupervisorDeliveries();
        const map = new Map<string, PLDelivery>();
        local.forEach((d) => map.set(d.id, d));
        remoteList.forEach((d) => map.set(d.id, d));
        const merged = Array.from(map.values()).sort((a, b) =>
          (b.date || '').localeCompare(a.date || '')
        );
        saveLocalSupervisorDeliveries(merged);
        return merged;
      }
    }
  } catch (err) {
    console.warn('Firestore supervisor deliveries sync notice:', err);
  }
  return getLocalSupervisorDeliveries();
}

export function subscribeToSupervisorDeliveries(
  onUpdate: (deliveries: PLDelivery[]) => void
): () => void {
  try {
    const colRef = collection(db, 'supervisor_deliveries');
    const unsubscribe = onSnapshot(
      colRef,
      (snap) => {
        const remoteList: PLDelivery[] = [];
        snap.forEach((docSnap) => {
          const data = docSnap.data() as PLDelivery;
          if (data && data.id) {
            remoteList.push(data);
          }
        });

        const local = getLocalSupervisorDeliveries();
        const map = new Map<string, PLDelivery>();
        local.forEach((d) => map.set(d.id, d));
        remoteList.forEach((d) => map.set(d.id, d));

        const merged = Array.from(map.values()).sort((a, b) =>
          (b.date || '').localeCompare(a.date || '')
        );
        saveLocalSupervisorDeliveries(merged);
        onUpdate(merged);
      },
      (err) => {
        console.warn('Real-time supervisor deliveries subscription notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach supervisor deliveries listener:', err);
    return () => {};
  }
}

// Convenience bulk functions & aliases for cross-device synchronization
export async function saveSupervisorSalesAccounts(
  records: SupervisorSalesAccountRecord[]
): Promise<void> {
  saveLocalSupervisorSalesAccounts(records);
  try {
    await Promise.all(
      records.map((r) => setDoc(doc(db, 'supervisor_sales_accounts', r.id), r, { merge: true }))
    );
  } catch (err) {
    console.warn('Firestore bulk supervisor sales accounts save notice:', err);
  }
}

export const fetchSupervisorSalesAccounts = syncSupervisorSalesAccountsFromFirestore;
export const saveAttendantAccountabilityRecords = saveAllAttendantAccountabilityRecords;
export const fetchAttendantAccountabilityRecords = syncAttendantAccountabilityFromFirestore;
export const subscribeToAttendantAccountabilityRecords = subscribeToAttendantAccountability;

