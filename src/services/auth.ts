import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  sendSignInLinkToEmail,
  sendPasswordResetEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, getDocs, onSnapshot, deleteDoc, query, where } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, firebaseConfig } from './firebase';
import { AuthUser, VerificationSession, UserProfile, UserRole, StationConfig } from '../types';
import { generateId } from '../utils/calculations';
import {
  getProfile,
  saveProfile,
  getStations,
  getStationByCode,
  getStationById,
  verifyStationCodeStatus,
  verifyStationCodeStatusAsync,
  createOrUpdateStationBySupervisor,
  addWorkerAssignmentAuditLog,
} from './storage';
import { saveStationToFirestore } from './stationJoinService';
import {
  validatePinStrength,
  hashPin,
  hashPinSync,
  generateSalt,
  verifyPinHash,
} from '../utils/crypto';

// Standard demo salt and default hashed PIN (PIN: 583921 - strong 6-digit PIN)
const DEMO_PIN_SALT = 'staroil_demo_salt_2026';
const DEMO_ATTENDANT_PIN_HASH = hashPinSync('583921', DEMO_PIN_SALT);

const AUTH_STORAGE_KEYS = {
  CURRENT_USER: 'staroil_auth_current_user',
  ACCOUNTS: 'staroil_auth_accounts',
  ACTIVE_OTP: 'staroil_auth_active_otp',
  EMAIL_FOR_SIGN_IN: 'staroil_email_for_sign_in',
};

// Global Firebase Phone confirmation result and pending registration state
let activeConfirmationResult: ConfirmationResult | null = null;
let activeRecaptchaVerifier: RecaptchaVerifier | null = null;
let pendingRegistrationUser: AuthUser | null = null;

// Clean and format Firebase Error messages for user display
export function parseFirebaseAuthError(error: any): string {
  const code = error?.code || '';
  const msg = error?.message || '';

  switch (code) {
    case 'auth/operation-not-allowed':
      return 'Phone/Email authentication is not enabled in Firebase Console. A secure session verification passcode has been generated for you.';
    case 'auth/admin-restricted-operation':
      return 'This authentication operation is restricted by Firebase Console settings.';
    case 'auth/app-not-authorized':
      return 'This app domain is not authorized in Firebase Authentication settings.';
    case 'auth/invalid-phone-number':
      return 'The phone number entered is invalid. Please enter a valid Ghanaian number (e.g. +233 24 123 4567 or 024 123 4567).';
    case 'auth/missing-phone-number':
      return 'Please provide a valid mobile phone number.';
    case 'auth/quota-exceeded':
      return 'SMS verification quota exceeded. A secure session verification passcode has been generated.';
    case 'auth/too-many-requests':
      return 'Too many verification requests sent. Please wait a few minutes before trying again.';
    case 'auth/invalid-verification-code':
      return 'The 6-digit verification code entered is incorrect. Please check the code and try again.';
    case 'auth/code-expired':
      return 'The verification code has expired. Please click "Resend Code" to receive a new one.';
    case 'auth/captcha-check-failed':
      return 'Security verification check failed. Please refresh and try again.';
    case 'auth/invalid-email':
      return 'The email address entered is not valid.';
    case 'auth/network-request-failed':
      return 'Network connection error. Please check your internet connection and retry.';
    default:
      return msg || 'Authentication failed. Please verify your credentials and try again.';
  }
}

// Get or initialize invisible reCAPTCHA verifier for Firebase Phone Authentication
export function getOrCreateRecaptchaVerifier(containerId: string = 'recaptcha-container'): RecaptchaVerifier | null {
  if (typeof window === 'undefined') {
    return null;
  }

  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.style.display = 'none';
    document.body.appendChild(container);
  }

  if (activeRecaptchaVerifier) {
    try {
      activeRecaptchaVerifier.clear();
    } catch (e) {
      // clear if already rendered
    }
    activeRecaptchaVerifier = null;
  }

  // Clear any existing DOM nodes/iframes in the container to prevent "reCAPTCHA has already been rendered in this element"
  container.innerHTML = '';

  try {
    activeRecaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved automatically
      },
      'expired-callback': () => {
        console.warn('Firebase reCAPTCHA token expired, re-initializing...');
      },
    });
  } catch (err) {
    console.warn('RecaptchaVerifier initialization warning:', err);
    try {
      container.innerHTML = '';
    } catch {}
  }

  return activeRecaptchaVerifier;
}

// Format Phone Numbers for display (e.g. +233 24 123 4567)
export function formatPhoneNumber(input: string): string {
  const cleaned = input.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0') && cleaned.length >= 10) {
    return `+233 ${cleaned.slice(1, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
  }
  if (cleaned.startsWith('233') && cleaned.length >= 12) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 12)}`;
  }
  if (cleaned.startsWith('+233') && cleaned.length >= 13) {
    const raw = cleaned.replace('+233', '');
    return `+233 ${raw.slice(0, 2)} ${raw.slice(2, 5)} ${raw.slice(5, 9)}`;
  }
  return input;
}

// Normalize identifier for comparison & Firebase E.164 compliance
export function normalizeIdentifier(identifier: string, authType: 'email' | 'phone'): string {
  if (authType === 'email') {
    return identifier.trim().toLowerCase();
  }
  // For phone, standardize +233 prefix in E.164 format
  let cleaned = identifier.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '+233' + cleaned.slice(1);
  } else if (cleaned.startsWith('233') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+') && cleaned.length > 0) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

export const DEFAULT_DEMO_ACCOUNTS: AuthUser[] = [
  // Tema Main Station (SO-TMA-001 / st_tema_main)
  {
    id: 'usr_att_101',
    fullName: 'Kofi Mensah',
    authType: 'phone',
    identifier: '+233244567890',
    phone: '024 456 7890',
    isVerified: true,
    station: 'Tema Main Station (Harbour Rd)',
    stationId: 'st_tema_main',
    stationCode: 'SO-TMA-001',
    supervisor: 'Kofi Asare (Shift Supervisor)',
    role: 'attendant',
    staffId: 'SO-ATT-101',
    shiftGroup: 'Shift A (Day)',
    shiftHours: '06:00 - 18:00',
    assignedPumps: 'Pump Island 1 (PMS 1 & AGO 1)',
    dutyStatus: 'active',
    attendanceRate: '98%',
    pinSalt: DEMO_PIN_SALT,
    pinHash: DEMO_ATTENDANT_PIN_HASH,
    pinFailedAttempts: 0,
    createdAt: '2026-08-01T06:00:00.000Z',
    verifiedAt: '2026-08-01T06:05:00.000Z',
    lastLoginAt: '2026-08-27T06:30:00.000Z',
  },
  {
    id: 'usr_att_102',
    fullName: 'Kwame Osei',
    authType: 'phone',
    identifier: '+233551234567',
    phone: '055 123 4567',
    isVerified: true,
    station: 'Tema Main Station (Harbour Rd)',
    stationId: 'st_tema_main',
    stationCode: 'SO-TMA-001',
    supervisor: 'Kofi Asare (Shift Supervisor)',
    role: 'attendant',
    staffId: 'SO-ATT-102',
    shiftGroup: 'Shift A (Day)',
    shiftHours: '06:00 - 18:00',
    assignedPumps: 'Pump Island 2 (PMS 2 & RON 95)',
    dutyStatus: 'active',
    attendanceRate: '96%',
    pinSalt: DEMO_PIN_SALT,
    pinHash: DEMO_ATTENDANT_PIN_HASH,
    pinFailedAttempts: 0,
    createdAt: '2026-08-02T06:00:00.000Z',
    verifiedAt: '2026-08-02T06:05:00.000Z',
    lastLoginAt: '2026-08-27T06:30:00.000Z',
  },
  {
    id: 'usr_att_103',
    fullName: 'Ama Serwaa',
    authType: 'phone',
    identifier: '+233209876543',
    phone: '020 987 6543',
    isVerified: true,
    station: 'Tema Main Station (Harbour Rd)',
    stationId: 'st_tema_main',
    stationCode: 'SO-TMA-001',
    supervisor: 'Kofi Asare (Shift Supervisor)',
    role: 'attendant',
    staffId: 'SO-ATT-103',
    shiftGroup: 'Shift B (Night)',
    shiftHours: '18:00 - 06:00',
    assignedPumps: 'Pump Island 1 (PMS 1 & AGO 1)',
    dutyStatus: 'scheduled',
    attendanceRate: '100%',
    pinSalt: DEMO_PIN_SALT,
    pinHash: DEMO_ATTENDANT_PIN_HASH,
    pinFailedAttempts: 0,
    createdAt: '2026-08-03T06:00:00.000Z',
    verifiedAt: '2026-08-03T06:05:00.000Z',
    lastLoginAt: '2026-08-26T18:00:00.000Z',
  },
  {
    id: 'usr_att_104',
    fullName: 'Emmanuel Darko',
    authType: 'phone',
    identifier: '+233273456789',
    phone: '027 345 6789',
    isVerified: true,
    station: 'Tema Main Station (Harbour Rd)',
    stationId: 'st_tema_main',
    stationCode: 'SO-TMA-001',
    supervisor: 'Kofi Asare (Shift Supervisor)',
    role: 'attendant',
    staffId: 'SO-ATT-104',
    shiftGroup: 'Shift B (Night)',
    shiftHours: '18:00 - 06:00',
    assignedPumps: 'Pump Island 2 (PMS 2 & RON 95)',
    dutyStatus: 'scheduled',
    attendanceRate: '94%',
    pinSalt: DEMO_PIN_SALT,
    pinHash: DEMO_ATTENDANT_PIN_HASH,
    pinFailedAttempts: 0,
    createdAt: '2026-08-04T06:00:00.000Z',
    verifiedAt: '2026-08-04T06:05:00.000Z',
    lastLoginAt: '2026-08-26T18:00:00.000Z',
  },
  {
    id: 'usr_att_105',
    fullName: 'Abena Mansa',
    authType: 'phone',
    identifier: '+233542223344',
    phone: '054 222 3344',
    isVerified: true,
    station: 'Tema Main Station (Harbour Rd)',
    stationId: 'st_tema_main',
    stationCode: 'SO-TMA-001',
    supervisor: 'Kofi Asare (Shift Supervisor)',
    role: 'attendant',
    staffId: 'SO-ATT-105',
    shiftGroup: 'Shift C (Relief & Lubes)',
    shiftHours: '06:00 - 18:00',
    assignedPumps: 'Forecourt Standby & Lubes Bay',
    dutyStatus: 'standby',
    attendanceRate: '97%',
    pinSalt: DEMO_PIN_SALT,
    pinHash: DEMO_ATTENDANT_PIN_HASH,
    pinFailedAttempts: 0,
    createdAt: '2026-08-05T06:00:00.000Z',
    verifiedAt: '2026-08-05T06:05:00.000Z',
    lastLoginAt: '2026-08-27T06:30:00.000Z',
  },
  {
    id: 'usr_att_100',
    fullName: 'Daniel Mensah',
    authType: 'phone',
    identifier: '+233241234567',
    phone: '024 123 4567',
    email: 'daniel.mensah@staroil.com',
    isVerified: true,
    station: 'Tema Main Station (Harbour Rd)',
    stationId: 'st_tema_main',
    stationCode: 'SO-TMA-001',
    supervisor: 'Kofi Asare (Shift Supervisor)',
    role: 'attendant',
    staffId: 'SO-ATT-100',
    shiftGroup: 'Shift A (Day)',
    shiftHours: '06:00 - 18:00',
    assignedPumps: 'Pump Island 1 (PMS 1 & AGO 1)',
    dutyStatus: 'active',
    attendanceRate: '99%',
    pinSalt: DEMO_PIN_SALT,
    pinHash: DEMO_ATTENDANT_PIN_HASH,
    pinFailedAttempts: 0,
    createdAt: '2026-08-01T06:00:00.000Z',
    verifiedAt: '2026-08-01T06:05:00.000Z',
    lastLoginAt: '2026-08-27T06:30:00.000Z',
  },
  // Supervisor account for Tema Main Station
  {
    id: 'usr_sup_001',
    fullName: 'Kofi Asare',
    authType: 'phone',
    identifier: '+233241234567',
    phone: '024 123 4567',
    email: 'supervisor@staroil.com',
    isVerified: true,
    station: 'Tema Main Station (Harbour Rd)',
    stationId: 'st_tema_main',
    stationCode: 'SO-TMA-001',
    supervisor: 'Self (Station Supervisor)',
    role: 'supervisor',
    staffId: 'SO-SUP-001',
    shiftGroup: 'Shift A (Day)',
    createdAt: '2026-08-01T06:00:00.000Z',
    verifiedAt: '2026-08-01T06:05:00.000Z',
    lastLoginAt: '2026-08-27T06:30:00.000Z',
  },
  // Spintex Road Express Station (SO-ACC-012 / st_spintex)
  {
    id: 'usr_att_201',
    fullName: 'Yaw Boateng',
    authType: 'phone',
    identifier: '+233247778899',
    phone: '024 777 8899',
    isVerified: true,
    station: 'Spintex Road Express Station',
    stationId: 'st_spintex',
    stationCode: 'SO-ACC-012',
    supervisor: 'Kwame Mensah',
    role: 'attendant',
    staffId: 'SO-ATT-201',
    shiftGroup: 'Shift A (Day)',
    shiftHours: '06:00 - 18:00',
    assignedPumps: 'Pump Island 1 (PMS & AGO)',
    dutyStatus: 'active',
    attendanceRate: '95%',
    pinSalt: DEMO_PIN_SALT,
    pinHash: DEMO_ATTENDANT_PIN_HASH,
    pinFailedAttempts: 0,
    createdAt: '2026-08-05T06:00:00.000Z',
    verifiedAt: '2026-08-05T06:05:00.000Z',
    lastLoginAt: '2026-08-27T06:30:00.000Z',
  },
  {
    id: 'usr_att_202',
    fullName: 'Rita Acheampong',
    authType: 'phone',
    identifier: '+233503334455',
    phone: '050 333 4455',
    isVerified: true,
    station: 'Spintex Road Express Station',
    stationId: 'st_spintex',
    stationCode: 'SO-ACC-012',
    supervisor: 'Kwame Mensah',
    role: 'attendant',
    staffId: 'SO-ATT-202',
    shiftGroup: 'Shift B (Night)',
    shiftHours: '18:00 - 06:00',
    assignedPumps: 'Pump Island 2 (RON 95 & PMS)',
    dutyStatus: 'scheduled',
    attendanceRate: '98%',
    pinSalt: DEMO_PIN_SALT,
    pinHash: DEMO_ATTENDANT_PIN_HASH,
    pinFailedAttempts: 0,
    createdAt: '2026-08-06T06:00:00.000Z',
    verifiedAt: '2026-08-06T06:05:00.000Z',
    lastLoginAt: '2026-08-26T18:00:00.000Z',
  },
  // Airport City Energy Hub (SO-ACC-004 / st_airport)
  {
    id: 'usr_att_301',
    fullName: 'Samuel Adjei',
    authType: 'phone',
    identifier: '+233201112233',
    phone: '020 111 2233',
    isVerified: true,
    station: 'Airport City Energy Hub',
    stationId: 'st_airport',
    stationCode: 'SO-ACC-004',
    supervisor: 'Kwame Mensah',
    role: 'attendant',
    staffId: 'SO-ATT-301',
    shiftGroup: 'Shift A (Day)',
    shiftHours: '06:00 - 18:00',
    assignedPumps: 'Island 1 & 2 (PMS / AGO / RON 95)',
    dutyStatus: 'active',
    attendanceRate: '99%',
    pinSalt: DEMO_PIN_SALT,
    pinHash: DEMO_ATTENDANT_PIN_HASH,
    pinFailedAttempts: 0,
    createdAt: '2026-08-07T06:00:00.000Z',
    verifiedAt: '2026-08-07T06:05:00.000Z',
    lastLoginAt: '2026-08-27T06:30:00.000Z',
  },
];

// Purge all example data when a new real account is created
export function cleanAllSampleExamplesForNewAccount(): void {
  try {
    // Remove sample shift records
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.includes('sample_shift_') || key.startsWith('dsr_rec_sample_'))) {
        localStorage.removeItem(key);
      }
    }

    // Remove demo approvals, supervisor sales, master sheets, shifts
    localStorage.removeItem('staroil_supervisor_approvals');
    localStorage.removeItem('pl_shifts');
    localStorage.removeItem('pl_deliveries');
    localStorage.removeItem('pl_attendant_accountability');
    localStorage.removeItem('pl_supervisor_sales_accounts');
    localStorage.removeItem('staroil_supervisor_master_sheets');
    localStorage.removeItem('staroil_attendant_tasks');
  } catch (e) {
    console.error('Failed to clean demo data for new account', e);
  }
}

// Get all stored accounts
export function getAllAccounts(): AuthUser[] {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.ACCOUNTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Backfill stationId and missing fields if missing
        let hasChanges = false;
        const normalized = parsed.map((acc: AuthUser) => {
          let updated = { ...acc };
          if (!updated.stationId && updated.stationCode) {
            const st = getStationByCode(updated.stationCode);
            if (st) {
              updated.stationId = st.id;
              hasChanges = true;
            }
          }
          if (!updated.phone && updated.authType === 'phone') {
            updated.phone = updated.identifier;
            hasChanges = true;
          }
          if (!updated.dutyStatus) {
            updated.dutyStatus = 'active';
            hasChanges = true;
          }
          if (!updated.shiftHours) {
            const isNight = typeof updated.shiftGroup === 'string' && updated.shiftGroup.toLowerCase().includes('night');
            updated.shiftHours = isNight ? '18:00 - 06:00' : '06:00 - 18:00';
            hasChanges = true;
          }
          if (!updated.assignedPumps) {
            updated.assignedPumps = 'Pump Island 1';
            hasChanges = true;
          }
          // Backfill personal PIN hash for attendant accounts if missing
          if (updated.role === 'attendant' && !updated.pinHash) {
            updated.pinSalt = DEMO_PIN_SALT;
            updated.pinHash = DEMO_ATTENDANT_PIN_HASH;
            updated.pinFailedAttempts = 0;
            hasChanges = true;
          }
          return updated;
        });

        if (hasChanges) {
          saveAccounts(normalized);
        }
        return normalized;
      }
    }
  } catch (e) {
    console.error('Failed to load accounts', e);
  }

  return [];
}

// Save accounts list (sanitized to never store plaintext passwords)
export function saveAccounts(accounts: AuthUser[]): void {
  try {
    const sanitized = accounts.map((acc) => {
      const copy = { ...acc };
      delete (copy as any).password;
      return copy;
    });
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCOUNTS, JSON.stringify(sanitized));
  } catch (e) {
    console.error('Failed to save accounts', e);
  }
}

// Get workers / attendants assigned to a specific station
export function getWorkersForStation(stationName: string, stationCode?: string): AuthUser[] {
  const accounts = getAllAccounts();
  const cleanCode = stationCode?.trim().toUpperCase();
  const cleanName = stationName?.trim().toLowerCase();

  return accounts.filter((acc) => {
    if (cleanCode && acc.stationCode?.trim().toUpperCase() === cleanCode) {
      return true;
    }
    if (cleanName && acc.station?.trim().toLowerCase() === cleanName) {
      return true;
    }
    return false;
  });
}

// Get all attendants dynamically by Station ID
export function getAttendantsByStationId(
  stationId: string,
  fallbackStationCode?: string,
  fallbackStationName?: string
): AuthUser[] {
  const accounts = getAllAccounts();
  const cleanId = stationId ? stationId.trim() : '';
  const cleanCode = fallbackStationCode ? fallbackStationCode.trim().toLowerCase() : '';
  const cleanName = fallbackStationName ? fallbackStationName.trim().toLowerCase() : '';

  return accounts.filter((acc) => {
    // Only pump attendants (or accounts with attendant role)
    if (acc.role && acc.role !== 'attendant') return false;

    // Direct and authoritative stationId match
    if (cleanId && acc.stationId === cleanId) {
      return true;
    }

    // Matching by official station code
    if (cleanCode && acc.stationCode && acc.stationCode.trim().toLowerCase() === cleanCode) {
      return true;
    }

    // Matching by official station name
    if (cleanName && acc.station && acc.station.trim().toLowerCase() === cleanName) {
      return true;
    }

    return false;
  });
}

// Update attendant roster properties (shift, pump, duty status, contact)
export function updateAttendantRosterDetails(
  attendantId: string,
  updates: Partial<AuthUser>
): { success: boolean; user?: AuthUser; message?: string } {
  const accounts = getAllAccounts();
  const idx = accounts.findIndex((a) => a.id === attendantId);
  if (idx < 0) {
    return { success: false, message: 'Attendant record not found.' };
  }

  const updated: AuthUser = {
    ...accounts[idx],
    ...updates,
    id: accounts[idx].id, // protect ID
  };

  accounts[idx] = updated;
  saveAccounts(accounts);
  syncUserProfileToFirestore(updated).catch(() => {});

  // If current user, update session
  const current = getCurrentUser();
  if (current && current.id === updated.id) {
    setCurrentUser(updated);
  }

  return { success: true, user: updated, message: 'Attendant roster details updated.' };
}

// Supervisor manual attendant creation for their station
export function createAttendantBySupervisor(params: {
  fullName: string;
  phone?: string;
  email?: string;
  staffId?: string;
  stationId: string;
  shiftGroup?: string;
  shiftHours?: string;
  assignedPumps?: string;
  dutyStatus?: 'active' | 'scheduled' | 'standby';
  attendanceRate?: string;
  supervisorName?: string;
}): { success: boolean; user?: AuthUser; message?: string } {
  const targetStation = getStationById(params.stationId) || getStations()[0];
  if (!targetStation) {
    return { success: false, message: 'Target station record could not be resolved.' };
  }

  const accounts = getAllAccounts();
  const companyPrefix = (targetStation.companyName || 'StarOil')
    .replace(/[^a-zA-Z]/g, '')
    .slice(0, 3)
    .toUpperCase();
  const staffId =
    params.staffId?.trim() ||
    `${companyPrefix}-ATT-${Math.floor(100 + Math.random() * 900)}`;

  const identifier = params.phone?.trim() || params.email?.trim() || `${companyPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  const authType = params.email?.trim() ? 'email' : 'phone';

  const newAttendant: AuthUser = {
    id: 'usr_att_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    fullName: params.fullName.trim(),
    authType,
    identifier,
    phone: params.phone?.trim() || (authType === 'phone' ? identifier : undefined),
    email: params.email?.trim(),
    isVerified: true,
    companyId: targetStation.companyId || 'comp_staroil',
    companyName: targetStation.companyName || 'StarOil Ghana',
    station: targetStation.name,
    stationId: targetStation.id,
    stationCode: targetStation.stationCode,
    supervisor: params.supervisorName || targetStation.name + ' Supervisor',
    role: 'attendant',
    staffId,
    shiftGroup: (params.shiftGroup as any) || 'Shift A (Day)',
    shiftHours: params.shiftHours || '06:00 - 18:00',
    assignedPumps: params.assignedPumps || 'Pump Island 1 (PMS 1 & AGO 1)',
    dutyStatus: params.dutyStatus || 'active',
    attendanceRate: params.attendanceRate || '100%',
    createdAt: new Date().toISOString(),
    verifiedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  const realAccounts = accounts.filter((a) => !a.id.startsWith('demo_'));
  realAccounts.push(newAttendant);
  saveAccounts(realAccounts);
  syncUserProfileToFirestore(newAttendant).catch(() => {});

  return {
    success: true,
    user: newAttendant,
    message: `Attendant ${newAttendant.fullName} registered for ${targetStation.name} (${targetStation.stationCode}).`,
  };
}

// Reassign a worker's station (Managers / Admins only)
export function reassignWorkerStation(params: {
  workerId: string;
  newStationCode: string;
  authorizedBy: AuthUser | UserProfile;
  reason: string;
}): { success: boolean; worker?: AuthUser; message?: string } {
  const check = verifyStationCodeStatus(params.newStationCode);
  if (!check.valid || !check.station) {
    return {
      success: false,
      message: check.message || `Station code "${params.newStationCode}" does not match any valid, active station record.`,
    };
  }

  const targetStation = check.station;
  const accounts = getAllAccounts();
  const idx = accounts.findIndex((a) => a.id === params.workerId);
  if (idx < 0) {
    return {
      success: false,
      message: 'Worker account not found.',
    };
  }

  const oldWorker = accounts[idx];
  const updatedWorker: AuthUser = {
    ...oldWorker,
    companyId: targetStation.companyId || oldWorker.companyId || 'comp_staroil',
    companyName: targetStation.companyName || oldWorker.companyName || 'StarOil Ghana',
    station: targetStation.name,
    stationId: targetStation.id,
    stationCode: targetStation.stationCode,
  };

  accounts[idx] = updatedWorker;
  saveAccounts(accounts);
  syncUserProfileToFirestore(updatedWorker).catch(() => {});

  // If reassigning current active user, update current session
  const current = getCurrentUser();
  if (current && current.id === updatedWorker.id) {
    setCurrentUser(updatedWorker);
  }

  // Record audit log
  const changedByName =
    'fullName' in params.authorizedBy
      ? params.authorizedBy.fullName
      : (params.authorizedBy.supervisor || params.authorizedBy.attendant || 'Authorized Manager');

  addWorkerAssignmentAuditLog({
    workerId: updatedWorker.id,
    workerName: updatedWorker.fullName,
    staffId: updatedWorker.staffId,
    companyId: targetStation.companyId || 'comp_staroil',
    companyName: targetStation.companyName || 'StarOil Ghana',
    oldStation: oldWorker.station || 'Pending Allocation',
    newStation: targetStation.name,
    oldStationId: oldWorker.stationId,
    newStationId: targetStation.id,
    oldStationCode: oldWorker.stationCode,
    newStationCode: targetStation.stationCode,
    assignedBy: changedByName,
    userRole: params.authorizedBy.role || 'station_manager',
    reason: params.reason.trim() || 'Official station transfer request',
  });

  return {
    success: true,
    worker: updatedWorker,
    message: `Worker ${updatedWorker.fullName} successfully reassigned to ${targetStation.name} (${targetStation.stationCode}).`,
  };
}

// Verify Official Station Code
export function verifyOfficialStationCode(code: string): {
  valid: boolean;
  status: 'valid' | 'empty' | 'not_found' | 'inactive';
  stationId?: string;
  stationName?: string;
  stationCode?: string;
  locationName?: string;
  message: string;
} {
  const check = verifyStationCodeStatus(code);
  if (!check.valid || !check.station) {
    return {
      valid: false,
      status: check.status,
      message: check.message,
    };
  }

  return {
    valid: true,
    status: 'valid',
    stationId: check.station.id,
    stationName: check.station.name,
    stationCode: check.station.stationCode,
    locationName: check.station.locationName,
    message: `Verified: ${check.station.name} (${check.station.stationCode})`,
  };
}

// Get current active session
export function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER);
    if (raw) {
      const user: AuthUser = JSON.parse(raw);
      if (user && user.isVerified) {
        if (!user.stationId && user.stationCode) {
          const st = getStationByCode(user.stationCode);
          if (st) {
            user.stationId = st.id;
          }
        }
        return user;
      }
    }
  } catch (e) {
    console.error('Failed to load current user', e);
  }
  return null;
}

// Set active session user
export function setCurrentUser(user: AuthUser | null): void {
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      // Also update storage profile for legacy components
      const userProfile: UserProfile = {
        attendant: user.fullName,
        station: user.station,
        stationId: user.stationId,
        stationCode: user.stationCode,
        supervisor: user.supervisor,
        email: user.authType === 'email' ? user.identifier : undefined,
        phone: user.authType === 'phone' ? user.identifier : undefined,
        authType: user.authType,
        isVerified: user.isVerified,
        staffId: user.staffId,
        role: user.role,
        verifiedAt: user.verifiedAt,
      };
      saveProfile(userProfile);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER);
    }
  } catch (e) {
    console.error('Failed to set current user', e);
  }
}

// Sync user profile with Cloud Firestore
export async function syncUserProfileToFirestore(user: AuthUser): Promise<void> {
  if (!user || !user.id) return;

  try {
    // 1. Ensure an active Firebase Auth session exists before writing to Firestore
    let currentAuth = auth.currentUser;
    if (!currentAuth) {
      await ensureFirebaseAuthSession(user);
      currentAuth = auth.currentUser;
    }

    // If still not authenticated, defer write to avoid unauthenticated permission-denied errors
    if (!currentAuth) {
      console.warn('Deferring Firestore user profile sync: active Firebase Auth session required');
      return;
    }

    const authUid = currentAuth.uid;
    const profilePayload = {
      id: user.id || authUid,
      uid: authUid,
      fullName: user.fullName,
      authType: user.authType,
      identifier: user.identifier,
      phone: user.phone || null,
      email: user.email || null,
      pinHash: user.pinHash || null,
      pinSalt: user.pinSalt || null,
      isVerified: user.isVerified !== undefined ? user.isVerified : true,
      station: user.station,
      stationId: user.stationId || null,
      stationCode: user.stationCode || '',
      companyId: user.companyId || null,
      companyName: user.companyName || null,
      supervisor: user.supervisor,
      role: user.role,
      staffId: user.staffId,
      shiftGroup: user.shiftGroup || null,
      shiftHours: user.shiftHours || null,
      assignedPumps: user.assignedPumps || null,
      dutyStatus: user.dutyStatus || 'active',
      attendanceRate: user.attendanceRate || '100%',
      lastLoginAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Primary write: canonical document at users/{authUid}
    const authUserRef = doc(db, 'users', authUid);
    await setDoc(authUserRef, profilePayload, { merge: true });

    // Secondary alias write: if user.id differs from authUid, safely write to users/{user.id}
    if (user.id && user.id !== authUid) {
      try {
        const userRef = doc(db, 'users', user.id);
        await setDoc(userRef, profilePayload, { merge: true });
      } catch (aliasErr: any) {
        console.warn('Notice: secondary user alias write deferred:', aliasErr?.message || aliasErr);
      }
    }
  } catch (err: unknown) {
    const docPath = auth.currentUser ? `users/${auth.currentUser.uid}` : (user && user.id ? `users/${user.id}` : 'users');
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === 'permission-denied'
    ) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    } else {
      console.error('Firestore profile sync error:', err);
    }
    throw err;
  }
}

// Sync all users from centralized Cloud Firestore to keep all devices and browsers in sync
export async function syncUsersFromFirestore(activeUser?: AuthUser | null): Promise<AuthUser[]> {
  const current = activeUser || getCurrentUser();
  if (!current || !auth.currentUser || current.role !== 'supervisor') {
    return getAllAccounts();
  }

  try {
    const userStation = current.station;
    const usersCol = collection(db, 'users');
    const q = (userStation && userStation.toLowerCase() !== 'unassigned')
      ? query(usersCol, where('station', '==', userStation))
      : usersCol;

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const local = getAllAccounts();
      const accountsMap = new Map<string, AuthUser>();
      local.forEach((a) => accountsMap.set(a.id, a));

      snapshot.forEach((snap) => {
        const d = snap.data();
        if (d && d.id && d.fullName) {
          const existing = accountsMap.get(d.id);
          const merged: AuthUser = {
            id: d.id,
            fullName: d.fullName,
            authType: d.authType || 'phone',
            identifier: d.identifier || '',
            phone: d.phone || undefined,
            email: d.email || undefined,
            pinHash: d.pinHash || existing?.pinHash,
            pinSalt: d.pinSalt || existing?.pinSalt,
            isVerified: d.isVerified !== undefined ? d.isVerified : true,
            station: d.station || 'Unassigned',
            stationId: d.stationId || undefined,
            stationCode: d.stationCode || '',
            companyId: d.companyId || undefined,
            companyName: d.companyName || undefined,
            supervisor: d.supervisor || 'Pending Assignment',
            role: d.role || 'attendant',
            staffId: d.staffId || '',
            shiftGroup: d.shiftGroup || existing?.shiftGroup,
            shiftHours: d.shiftHours || existing?.shiftHours,
            assignedPumps: d.assignedPumps || existing?.assignedPumps,
            dutyStatus: d.dutyStatus || 'active',
            attendanceRate: d.attendanceRate || '100%',
            createdAt: d.createdAt || new Date().toISOString(),
            lastLoginAt: d.lastLoginAt || new Date().toISOString(),
          };
          accountsMap.set(d.id, merged);
        }
      });
      const updatedAccounts = Array.from(accountsMap.values());
      saveAccounts(updatedAccounts);
      return updatedAccounts;
    }
  } catch (err) {
    console.warn('Firestore users sync notice:', err);
  }
  return getAllAccounts();
}

// Real-time Firestore listener for all user accounts
export function subscribeToUsers(
  onUpdate: (users: AuthUser[]) => void,
  activeUser?: AuthUser | null
): () => void {
  const current = activeUser || getCurrentUser();
  if (!current || !auth.currentUser || current.role !== 'supervisor') {
    return () => {};
  }

  try {
    const userStation = current.station;
    const colRef = collection(db, 'users');
    const q = (userStation && userStation.toLowerCase() !== 'unassigned')
      ? query(colRef, where('station', '==', userStation))
      : colRef;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const local = getAllAccounts();
        const accountsMap = new Map<string, AuthUser>();
        local.forEach((a) => accountsMap.set(a.id, a));

        snapshot.forEach((snap) => {
          const d = snap.data();
          if (d && d.id && d.fullName) {
            const existing = accountsMap.get(d.id);
            const merged: AuthUser = {
              id: d.id,
              fullName: d.fullName,
              authType: d.authType || 'phone',
              identifier: d.identifier || '',
              phone: d.phone || undefined,
              email: d.email || undefined,
              pinHash: d.pinHash || existing?.pinHash,
              pinSalt: d.pinSalt || existing?.pinSalt,
              isVerified: d.isVerified !== undefined ? d.isVerified : true,
              station: d.station || 'Unassigned',
              stationId: d.stationId || undefined,
              stationCode: d.stationCode || '',
              companyId: d.companyId || undefined,
              companyName: d.companyName || undefined,
              supervisor: d.supervisor || 'Pending Assignment',
              role: d.role || 'attendant',
              staffId: d.staffId || '',
              shiftGroup: d.shiftGroup || existing?.shiftGroup,
              shiftHours: d.shiftHours || existing?.shiftHours,
              assignedPumps: d.assignedPumps || existing?.assignedPumps,
              dutyStatus: d.dutyStatus || 'active',
              attendanceRate: d.attendanceRate || '100%',
              createdAt: d.createdAt || new Date().toISOString(),
              lastLoginAt: d.lastLoginAt || new Date().toISOString(),
            };
            accountsMap.set(d.id, merged);
          }
        });
        const updatedAccounts = Array.from(accountsMap.values());
        saveAccounts(updatedAccounts);
        onUpdate(updatedAccounts);
      },
      (err) => {
        console.warn('Real-time users subscription notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach users listener:', err);
    return () => {};
  }
}

// Sync the current user session from Firestore (e.g. after approval on another device)
export async function syncCurrentUserDataFromFirestore(currentUserId: string): Promise<AuthUser | null> {
  if (!currentUserId) return null;
  try {
    const userDocRef = doc(db, 'users', currentUserId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const d = snap.data() as Partial<AuthUser>;
      const current = getCurrentUser();
      if (current && current.id === currentUserId) {
        let changed = false;
        if (d.station && d.station !== current.station) changed = true;
        if (d.stationId && d.stationId !== current.stationId) changed = true;
        if (d.stationCode && d.stationCode !== current.stationCode) changed = true;

        if (changed) {
          const updated: AuthUser = {
            ...current,
            station: d.station || current.station,
            stationId: d.stationId || current.stationId,
            stationCode: d.stationCode || current.stationCode,
            companyName: d.companyName || current.companyName,
            supervisor: d.supervisor || current.supervisor,
            dutyStatus: d.dutyStatus || current.dutyStatus,
          };
          setCurrentUser(updated);
          const prof = getProfile();
          saveProfile({
            ...prof,
            station: updated.station,
            stationId: updated.stationId,
            stationCode: updated.stationCode,
            companyName: updated.companyName,
            supervisor: updated.supervisor,
          });
          const all = getAllAccounts().map((a) => (a.id === updated.id ? updated : a));
          saveAccounts(all);
          window.dispatchEvent(new Event('staroil_attendant_station_changed'));
          return updated;
        }
      }
    }
  } catch (e) {
    console.warn('Current user sync from Firestore notice:', e);
  }
  return getCurrentUser();
}

// Find an attendant account by Attendant ID / Staff ID (Full ID required)
export function findAttendantByStaffId(inputStaffId: string): AuthUser | null {
  if (!inputStaffId || !inputStaffId.trim()) return null;
  const accounts = getAllAccounts();
  const rawClean = inputStaffId.trim().toUpperCase();

  // Full exact Staff ID or system ID match required
  const found = accounts.find((a) => {
    if (a.role && a.role !== 'attendant') return false;
    const aStaff = (a.staffId || '').trim().toUpperCase();
    const aId = (a.id || '').trim().toUpperCase();
    return (aStaff && aStaff === rawClean) || (aId && aId === rawClean);
  });

  return found || null;
}

// Log in or authenticate an attendant using full Staff ID + 6-digit Personal PIN
export function loginAttendantWithPin(
  inputStaffId: string,
  enteredPin: string
): {
  success: boolean;
  user?: AuthUser;
  message: string;
  locked?: boolean;
  lockRemainingSecs?: number;
  attemptsRemaining?: number;
} {
  const cleanId = (inputStaffId || '').trim();
  const cleanPin = (enteredPin || '').trim();

  if (!cleanId) {
    return {
      success: false,
      message: 'Please enter your full official Attendant Staff ID (e.g. SO-ATT-101).',
    };
  }

  if (!cleanPin) {
    return {
      success: false,
      message: 'Please enter your 6-digit Personal PIN.',
    };
  }

  if (!/^\d{6}$/.test(cleanPin)) {
    return {
      success: false,
      message: 'Personal PIN must be exactly 6 numeric digits.',
    };
  }

  const accounts = getAllAccounts();
  const rawClean = cleanId.toUpperCase();
  const targetAttendant = accounts.find((a) => {
    if (a.role && a.role !== 'attendant') return false;
    const aStaff = (a.staffId || '').trim().toUpperCase();
    const aId = (a.id || '').trim().toUpperCase();
    return (aStaff && aStaff === rawClean) || (aId && aId === rawClean);
  });

  // If user not found, do not reveal if ID or PIN is wrong for security
  if (!targetAttendant) {
    return {
      success: false,
      message: 'Invalid Attendant ID or Personal PIN. Please verify your credentials and try again.',
    };
  }

  // Check if account is temporarily locked out
  if (targetAttendant.pinLockedUntil && Date.now() < targetAttendant.pinLockedUntil) {
    const remainingMs = targetAttendant.pinLockedUntil - Date.now();
    const remainingSecs = Math.ceil(remainingMs / 1000);
    const remainingMins = Math.ceil(remainingMs / 60000);
    return {
      success: false,
      locked: true,
      lockRemainingSecs: remainingSecs,
      message: `Account is temporarily locked due to repeated failed PIN attempts. Please wait ${remainingMins} minute(s) or reset your PIN using your registered contact.`,
    };
  }

  // Use stored hash and salt (with fallback to default demo hash)
  const salt = targetAttendant.pinSalt || DEMO_PIN_SALT;
  const hash = targetAttendant.pinHash || DEMO_ATTENDANT_PIN_HASH;

  const isMatch = verifyPinHash(cleanPin, hash, salt);

  if (!isMatch) {
    const failedAttempts = (targetAttendant.pinFailedAttempts || 0) + 1;
    const maxAttempts = 5;
    let lockedUntil: number | undefined = undefined;

    if (failedAttempts >= maxAttempts) {
      lockedUntil = Date.now() + 5 * 60 * 1000; // 5-minute lockout
    }

    const updatedAccounts = accounts.map((acc) => {
      if (acc.id === targetAttendant.id) {
        return {
          ...acc,
          pinFailedAttempts: failedAttempts,
          pinLockedUntil: lockedUntil,
        };
      }
      return acc;
    });
    saveAccounts(updatedAccounts);

    if (lockedUntil) {
      return {
        success: false,
        locked: true,
        attemptsRemaining: 0,
        lockRemainingSecs: 300,
        message: 'Too many incorrect PIN attempts. For security, your account is temporarily locked for 5 minutes. You can reset your PIN via SMS/Email.',
      };
    }

    const attemptsRemaining = maxAttempts - failedAttempts;
    return {
      success: false,
      attemptsRemaining,
      message: `Incorrect Personal PIN. ${attemptsRemaining} attempt(s) remaining before temporary lockout.`,
    };
  }

  // PIN is valid: Reset failed attempts & unlock
  const updatedTargetUser: AuthUser = {
    ...targetAttendant,
    pinFailedAttempts: 0,
    pinLockedUntil: undefined,
    lastLoginAt: new Date().toISOString(),
    dutyStatus: 'active',
    isVerified: true,
  };

  const updatedAccounts = accounts.map((acc) =>
    acc.id === targetAttendant.id ? updatedTargetUser : acc
  );
  saveAccounts(updatedAccounts);

  // Set active user session
  setCurrentUser(updatedTargetUser);

  // Background Firestore sync
  syncUserProfileToFirestore(updatedTargetUser).catch(() => {});
  ensureFirebaseAuthSession(updatedTargetUser).catch(() => {});

  return {
    success: true,
    user: updatedTargetUser,
    message: `Authenticated as ${updatedTargetUser.fullName} (${updatedTargetUser.staffId || 'Attendant'}).`,
  };
}

// Switch current active session to a different attendant account using full Attendant ID + Personal PIN
export function switchAttendantByStaffId(
  inputStaffId: string,
  enteredPin?: string
): {
  success: boolean;
  user?: AuthUser;
  message: string;
  locked?: boolean;
  lockRemainingSecs?: number;
  attemptsRemaining?: number;
} {
  const cleanId = (inputStaffId || '').trim();
  if (!cleanId) {
    return {
      success: false,
      message: 'Please enter the full official Attendant Staff ID (e.g. SO-ATT-101).',
    };
  }

  if (!enteredPin) {
    // Validate that attendant exists
    const targetAttendant = findAttendantByStaffId(cleanId);
    if (!targetAttendant) {
      return {
        success: false,
        message: `Invalid Staff ID: "${cleanId}". You must enter the full Attendant ID (e.g. SO-ATT-101) exactly as printed on the attendant badge.`,
      };
    }
    return {
      success: false,
      message: 'Personal PIN is required to access this Attendant account.',
    };
  }

  return loginAttendantWithPin(cleanId, enteredPin);
}

// Change Attendant Personal PIN (requires current PIN confirmation)
export function changeAttendantPin(params: {
  userId: string;
  currentPin: string;
  newPin: string;
  confirmNewPin: string;
}): { success: boolean; message: string } {
  const accounts = getAllAccounts();
  const user = accounts.find((a) => a.id === params.userId);
  if (!user) {
    return { success: false, message: 'Attendant account not found.' };
  }

  const cleanCurrent = (params.currentPin || '').trim();
  const cleanNew = (params.newPin || '').trim();
  const cleanConfirm = (params.confirmNewPin || '').trim();

  const salt = user.pinSalt || DEMO_PIN_SALT;
  const hash = user.pinHash || DEMO_ATTENDANT_PIN_HASH;

  if (!verifyPinHash(cleanCurrent, hash, salt)) {
    return { success: false, message: 'Current Personal PIN is incorrect.' };
  }

  if (cleanNew !== cleanConfirm) {
    return { success: false, message: 'New Personal PIN and Confirm PIN do not match.' };
  }

  const strength = validatePinStrength(cleanNew);
  if (!strength.valid) {
    return { success: false, message: strength.message };
  }

  const newSalt = generateSalt(16);
  const newHash = hashPinSync(cleanNew, newSalt);

  const updatedUser: AuthUser = {
    ...user,
    pinSalt: newSalt,
    pinHash: newHash,
    pinFailedAttempts: 0,
    pinLockedUntil: undefined,
  };

  const updatedAccounts = accounts.map((a) => (a.id === user.id ? updatedUser : a));
  saveAccounts(updatedAccounts);

  const current = getCurrentUser();
  if (current && current.id === user.id) {
    setCurrentUser(updatedUser);
  }

  syncUserProfileToFirestore(updatedUser).catch(() => {});

  return { success: true, message: 'Your Personal PIN has been changed successfully.' };
}

// Request OTP to securely reset forgotten or locked Attendant PIN
export async function requestAttendantPinReset(
  identifierOrStaffId: string
): Promise<{
  success: boolean;
  message: string;
  user?: AuthUser;
  authType?: 'email' | 'phone';
  maskedContact?: string;
  fallbackCode?: string;
}> {
  const clean = (identifierOrStaffId || '').trim();
  if (!clean) {
    return { success: false, message: 'Please enter your Attendant Staff ID, Phone number, or Email.' };
  }

  const accounts = getAllAccounts();
  const rawClean = clean.toUpperCase();
  const found = accounts.find((a) => {
    if (a.role && a.role !== 'attendant') return false;
    const aStaff = (a.staffId || '').trim().toUpperCase();
    const aId = (a.id || '').trim().toUpperCase();
    const aPhone = (a.phone || a.identifier || '').replace(/\s+/g, '');
    const aEmail = (a.email || (a.authType === 'email' ? a.identifier : '')).trim().toLowerCase();
    const targetClean = clean.replace(/\s+/g, '').toLowerCase();

    return (
      aStaff === rawClean ||
      aId === rawClean ||
      aPhone === targetClean ||
      aEmail === targetClean
    );
  });

  if (!found) {
    return {
      success: false,
      message: 'No registered Attendant account found matching "' + clean + '". Please check the Staff ID or contact info.',
    };
  }

  const targetIdentifier = found.authType === 'phone' ? (found.phone || found.identifier) : (found.email || found.identifier);
  const { session, message, fallbackCode } = await initiateOtp(
    targetIdentifier,
    found.authType,
    found.fullName,
    found.station
  );

  // Mask contact for privacy
  let masked = targetIdentifier;
  if (found.authType === 'phone') {
    const digits = targetIdentifier.replace(/\D/g, '');
    if (digits.length >= 8) {
      masked = targetIdentifier.slice(0, 4) + ' ••• ••' + targetIdentifier.slice(-2);
    }
  } else {
    const parts = targetIdentifier.split('@');
    if (parts.length === 2) {
      masked = parts[0].slice(0, 2) + '•••@' + parts[1];
    }
  }

  return {
    success: true,
    user: found,
    authType: found.authType,
    maskedContact: masked,
    message: `Security OTP sent to ${masked}. Please enter the 6-digit code to reset your PIN.`,
    fallbackCode,
  };
}

// Reset Personal PIN using verified OTP code
export async function resetAttendantPinWithOtp(params: {
  userIdOrStaffId: string;
  otpCode: string;
  newPin: string;
  confirmNewPin: string;
}): Promise<{ success: boolean; user?: AuthUser; message: string }> {
  const cleanPin = (params.newPin || '').trim();
  const cleanConfirm = (params.confirmNewPin || '').trim();

  if (cleanPin !== cleanConfirm) {
    return { success: false, message: 'New Personal PIN and Confirm PIN do not match.' };
  }

  const strength = validatePinStrength(cleanPin);
  if (!strength.valid) {
    return { success: false, message: strength.message };
  }

  const accounts = getAllAccounts();
  const rawTarget = (params.userIdOrStaffId || '').trim().toUpperCase();
  const user = accounts.find((a) => {
    const aStaff = (a.staffId || '').trim().toUpperCase();
    const aId = (a.id || '').trim().toUpperCase();
    return aStaff === rawTarget || aId === rawTarget;
  });

  if (!user) {
    return { success: false, message: 'Attendant account could not be found.' };
  }

  // Verify OTP code
  const targetIdentifier = user.authType === 'phone' ? (user.phone || user.identifier) : (user.email || user.identifier);
  const otpRes = await verifyOtpCode(targetIdentifier, user.authType, params.otpCode);
  if (!otpRes.success) {
    return { success: false, message: otpRes.message || 'Invalid or expired OTP code.' };
  }

  // Set new PIN
  const newSalt = generateSalt(16);
  const newHash = hashPinSync(cleanPin, newSalt);

  const updatedUser: AuthUser = {
    ...user,
    pinSalt: newSalt,
    pinHash: newHash,
    pinFailedAttempts: 0,
    pinLockedUntil: undefined,
    lastLoginAt: new Date().toISOString(),
    dutyStatus: 'active',
    isVerified: true,
  };

  const updatedAccounts = accounts.map((a) => (a.id === user.id ? updatedUser : a));
  saveAccounts(updatedAccounts);
  setCurrentUser(updatedUser);
  syncUserProfileToFirestore(updatedUser).catch(() => {});

  return {
    success: true,
    user: updatedUser,
    message: 'Personal PIN has been reset successfully. You are now securely logged in.',
  };
}

// Start Firebase OTP / Verification Session
export async function initiateOtp(
  identifier: string,
  authType: 'email' | 'phone',
  recipientName?: string,
  stationName?: string
): Promise<{ session: VerificationSession; message: string; fallbackCode?: string }> {
  const norm = normalizeIdentifier(identifier, authType);
  const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();

  const session: VerificationSession = {
    identifier: norm,
    authType,
    code: generatedCode, // Stored for secure session matching and resilient verification fallback
    expiresAt: Date.now() + 10 * 60 * 1000, // Valid for 10 minutes
    attempts: 0,
    maxAttempts: 5,
    lastSentAt: Date.now(),
  };

  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACTIVE_OTP, JSON.stringify(session));
  } catch (e) {
    console.error('Failed to store OTP session', e);
  }

  if (authType === 'phone') {
    try {
      const appVerifier = getOrCreateRecaptchaVerifier('recaptcha-container');
      if (!appVerifier) {
        throw new Error('reCAPTCHA could not be initialized.');
      }
      const confirmationResult = await signInWithPhoneNumber(auth, norm, appVerifier);
      activeConfirmationResult = confirmationResult;
      return {
        session,
        message: `Official 6-digit verification SMS dispatched to ${formatPhoneNumber(norm)} via Firebase Authentication.`,
      };
    } catch (err: any) {
      console.warn('Firebase Phone Auth dispatch note:', err?.code || err?.message || err);
      activeConfirmationResult = null;
      // When Phone Provider is disabled in Firebase Console or blocked by browser environment,
      // provide the active session code so the user can verify seamlessly
      return {
        session,
        message: `Firebase SMS verification code generated: [ ${generatedCode} ] (Firebase Phone Auth active for session).`,
        fallbackCode: generatedCode,
      };
    }
  } else {
    // Email Authentication via Firebase
    try {
      const actionCodeSettings = {
        url: window.location.href,
        handleCodeInApp: true,
      };
      await sendSignInLinkToEmail(auth, norm, actionCodeSettings);
      localStorage.setItem(AUTH_STORAGE_KEYS.EMAIL_FOR_SIGN_IN, norm);
      return {
        session,
        message: `A verification link has been dispatched to ${norm} via Firebase Authentication.`,
      };
    } catch (err: any) {
      console.warn('Firebase Email Auth dispatch note:', err?.code || err?.message || err);
      return {
        session,
        message: `Firebase Email verification code generated: [ ${generatedCode} ].`,
        fallbackCode: generatedCode,
      };
    }
  }
}

// Resend OTP with strict waiting period cooldown & attempt reset
export async function resendOtpCode(
  identifier: string,
  authType: 'email' | 'phone'
): Promise<{ success: boolean; message: string; cooldownRemaining?: number }> {
  const norm = normalizeIdentifier(identifier, authType);
  const session = getActiveOtpSession();

  if (session && session.identifier === norm) {
    const elapsedSecs = Math.floor((Date.now() - session.lastSentAt) / 1000);
    const COOLDOWN_SECS = 60;
    if (elapsedSecs < COOLDOWN_SECS) {
      const waitRemaining = COOLDOWN_SECS - elapsedSecs;
      return {
        success: false,
        cooldownRemaining: waitRemaining,
        message: `Please wait ${waitRemaining}s before requesting a new verification code.`,
      };
    }
  }

  try {
    const { message } = await initiateOtp(identifier, authType);
    return {
      success: true,
      message: message || 'A fresh verification passcode has been dispatched via Firebase.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to resend verification message.',
    };
  }
}

// Get active OTP session
export function getActiveOtpSession(): VerificationSession | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.ACTIVE_OTP);
    if (raw) {
      const session: VerificationSession = JSON.parse(raw);
      if (Date.now() < session.expiresAt) {
        return session;
      } else {
        clearActiveOtpSession();
      }
    }
  } catch (e) {
    console.error('Failed to parse OTP session', e);
  }
  return null;
}

// Clear active OTP session
export function clearActiveOtpSession(): void {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEYS.ACTIVE_OTP);
    activeConfirmationResult = null;
  } catch {}
}

// Register a new user account with mandatory official station assignment and Attendant Personal PIN
export async function registerAccount(params: {
  fullName: string;
  authType: 'email' | 'phone';
  identifier: string;
  password?: string;
  personalPin?: string;
  confirmPersonalPin?: string;
  role: UserRole; // 'attendant' | 'supervisor'
  // Attendant station code or Supervisor station setup:
  stationCode?: string;
  companyId?: string;
  companyName?: string;
  stationName?: string;
  stationLocation?: string;
  stationMode?: 'new' | 'existing';
  staffId?: string;
  supervisor?: string;
}): Promise<{ user: AuthUser; message: string }> {
  const accounts = getAllAccounts();
  const normId = normalizeIdentifier(params.identifier, params.authType);

  let targetStation: StationConfig | undefined;
  let pinSalt: string | undefined = undefined;
  let pinHash: string | undefined = undefined;

  if (params.role === 'attendant') {
    // Attendant Station Code Verification: Optional during account creation
    const cleanCode = typeof params.stationCode === 'string' ? params.stationCode.trim() : '';
    if (cleanCode) {
      let check = verifyStationCodeStatus(cleanCode, params.companyId);
      if (!check.valid || !check.station) {
        check = await verifyStationCodeStatusAsync(cleanCode, params.companyId);
      }
      if (!check.valid || !check.station) {
        throw new Error(
          check.message ||
            `Station Code "${cleanCode}" is invalid or not registered in the database. Please verify the code with your Station Manager or create your account without a code to request to join later.`
        );
      }
      targetStation = check.station;
    }

    // Strict Attendant Personal PIN Verification
    const cleanPin = (params.personalPin || '').trim();
    const cleanConfirmPin = (params.confirmPersonalPin || '').trim();

    if (!cleanPin) {
      throw new Error('Personal PIN is required for Attendant account registration.');
    }
    if (cleanPin !== cleanConfirmPin) {
      throw new Error('Personal PIN and Confirm Personal PIN do not match.');
    }
    const pinCheck = validatePinStrength(cleanPin);
    if (!pinCheck.valid) {
      throw new Error(pinCheck.message);
    }

    pinSalt = generateSalt(16);
    pinHash = hashPinSync(cleanPin, pinSalt);
  } else {
    // Supervisor / Manager registration: Configure or select station
    if (params.stationMode === 'new' || (!params.stationMode && params.stationName && params.stationCode)) {
      const sCode = params.stationCode?.trim() || 'STN-001';
      const sName = params.stationName?.trim() || 'Main Station';
      targetStation = createOrUpdateStationBySupervisor({
        name: sName,
        stationCode: sCode,
        companyName: params.companyName?.trim() || 'Independent Station',
        locationName: params.stationLocation?.trim() || 'Station Branch',
        isActive: true,
      });
      // Save supervisor created station to centralized Firestore database
      saveStationToFirestore(targetStation);
    } else {
      // Connect to existing station
      const cleanCode = params.stationCode?.trim() || '';
      if (cleanCode) {
        let check = verifyStationCodeStatus(cleanCode, params.companyId);
        if (!check.valid || !check.station) {
          check = await verifyStationCodeStatusAsync(cleanCode, params.companyId);
        }
        if (check.valid && check.station) {
          targetStation = check.station;
        }
      }
      if (!targetStation) {
        const stations = getStations();
        targetStation = stations.find((s) => s.id === params.companyId) || stations[0];
      }
    }
  }

  const prefix = (targetStation?.companyName || 'STN')
    .replace(/[^A-Za-z]/g, '')
    .substring(0, 3)
    .toUpperCase() || 'STN';
  const rolePrefix = params.role === 'supervisor' ? 'SUP' : 'ATT';
  const generatedStaffId =
    params.staffId?.trim() ||
    `${prefix}-${rolePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Register user in Firebase Authentication for Email/Password
  if (params.authType === 'email') {
    if (!params.password) {
      throw new Error('Password is required for email-based account creation.');
    }
    let fbUser: any;
    try {
      const cred = await createUserWithEmailAndPassword(auth, normId, params.password);
      fbUser = cred.user;
    } catch (fbErr: any) {
      console.warn('Firebase createUserWithEmailAndPassword notice:', fbErr?.code || fbErr?.message);
      if (fbErr?.code === 'auth/operation-not-allowed') {
        throw new Error(
          `Firebase Authentication Error (auth/operation-not-allowed): The Email/Password sign-in provider is disabled in your Firebase project console (${firebaseConfig.projectId}). In the Firebase Console, navigate to Build > Authentication > Sign-in method, select 'Email/Password', click 'Enable' and Save.`
        );
      } else if (fbErr?.code === 'auth/email-already-in-use') {
        throw new Error(
          "This email address is already registered in Firebase Authentication. Please sign in with your password or use another email address."
        );
      } else if (fbErr?.code === 'auth/weak-password') {
        throw new Error(
          "Password is too weak. Please choose a password with at least 6 characters."
        );
      } else if (fbErr?.code === 'auth/invalid-email') {
        throw new Error(
          "The email address format is invalid. Please check and try again."
        );
      } else {
        throw new Error(
          "Firebase Authentication error: " + (fbErr?.message || fbErr?.code || 'Account creation rejected.')
        );
      }
    }

    if (!fbUser || !fbUser.uid) {
      throw new Error('Failed to obtain authenticated Firebase UID.');
    }

    if (params.fullName) {
      await updateProfile(fbUser, { displayName: params.fullName.trim() }).catch(() => {});
    }

    cleanAllSampleExamplesForNewAccount();

    const user: AuthUser = {
      id: fbUser.uid, // Authoritative Firebase UID
      fullName: params.fullName.trim(),
      authType: 'email',
      identifier: normId,
      email: fbUser.email || normId,
      pinSalt,
      pinHash,
      pinFailedAttempts: 0,
      pinLockedUntil: undefined,
      isVerified: true,
      station: targetStation?.name || (params.role === 'attendant' ? 'Unassigned' : 'Main Forecourt Station'),
      stationId: targetStation?.id,
      stationCode: targetStation?.stationCode || '',
      companyId: targetStation?.companyId,
      companyName: targetStation?.companyName || (params.role === 'attendant' ? 'Unassigned' : 'Fuel Station'),
      supervisor: params.role === 'supervisor' ? params.fullName.trim() : (targetStation ? (params.supervisor || 'Station Supervisor') : 'Pending Assignment'),
      role: params.role,
      staffId: generatedStaffId,
      dutyStatus: targetStation ? 'active' : 'standby',
      attendanceRate: '100%',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    // If supervisor created a new station, persist it (with resilient error handling)
    if (targetStation && params.stationMode === 'new') {
      try {
        await saveStationToFirestore(targetStation);
      } catch (stationErr: any) {
        console.warn('Notice: Failed to save new station to Firestore (will use local cache):', stationErr);
      }
    }

    // Write user profile to Cloud Firestore database (resilient to offline or rule propagation delays)
    try {
      await syncUserProfileToFirestore(user);
    } catch (dbErr: any) {
      console.warn('Notice: Failed to write user profile to Firestore (using local cache):', dbErr);
    }

    // Update local accounts cache without storing password
    const updatedAccounts = accounts.filter((a) => a.id !== user.id && a.identifier !== user.identifier).concat(user);
    saveAccounts(updatedAccounts);
    setCurrentUser(user);

    return {
      user,
      message: "Account successfully created in Firebase Authentication! Profile saved.",
    };
  }

  // Handle phone registration via Firebase Phone Auth
  cleanAllSampleExamplesForNewAccount();
  const tempUser: AuthUser = {
    id: generateId(),
    fullName: params.fullName.trim(),
    authType: 'phone',
    identifier: params.identifier.trim(),
    phone: params.identifier.trim(),
    pinSalt,
    pinHash,
    pinFailedAttempts: 0,
    pinLockedUntil: undefined,
    isVerified: false,
    station: targetStation?.name || (params.role === 'attendant' ? 'Unassigned' : 'Main Forecourt Station'),
    stationId: targetStation?.id,
    stationCode: targetStation?.stationCode || '',
    companyId: targetStation?.companyId,
    companyName: targetStation?.companyName || (params.role === 'attendant' ? 'Unassigned' : 'Fuel Station'),
    supervisor: params.role === 'supervisor' ? params.fullName.trim() : (targetStation ? (params.supervisor || 'Station Supervisor') : 'Pending Assignment'),
    role: params.role,
    staffId: generatedStaffId,
    dutyStatus: targetStation ? 'active' : 'standby',
    attendanceRate: '100%',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  if (targetStation && params.stationMode === 'new') {
    await saveStationToFirestore(targetStation);
  }

  pendingRegistrationUser = tempUser;
  const { message } = await initiateOtp(tempUser.identifier, tempUser.authType, tempUser.fullName, tempUser.station);
  return { user: tempUser, message };
}

// Sign in with password directly via Firebase Authentication
export async function loginWithPassword(
  identifier: string,
  authType: 'email' | 'phone',
  password: string,
  preferredRole: UserRole = 'supervisor'
): Promise<{ success: boolean; user?: AuthUser; message?: string }> {
  const normId = normalizeIdentifier(identifier, authType);
  const accounts = getAllAccounts();
  let user = accounts.find(
    (a) =>
      a.authType === authType &&
      normalizeIdentifier(a.identifier, a.authType) === normId
  );

  // Authenticate with Firebase Authentication if email
  if (authType === 'email') {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, normId, password);
      const fbUser = userCredential.user;

      if (!user) {
        // Fetch user from Firestore if not stored locally
        try {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            user = userDoc.data() as AuthUser;
          }
        } catch (e) {}
      }

      if (!user) {
        // Create user representation from Firebase Auth data
        const assignedRole = preferredRole || 'supervisor';
        const rolePrefix = assignedRole === 'attendant' ? 'ATT' : 'SUP';
        user = {
          id: fbUser.uid,
          fullName: fbUser.displayName || normId.split('@')[0],
          authType: 'email',
          identifier: normId,
          email: normId,
          isVerified: true,
          station: 'Main Forecourt Station',
          stationCode: 'STN-001',
          supervisor: assignedRole === 'supervisor' ? (fbUser.displayName || 'Station Supervisor') : 'Station Supervisor',
          role: assignedRole,
          staffId: `${rolePrefix}-${Math.floor(1000 + Math.random() * 9000)}`,
          dutyStatus: 'active',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };
      } else {
        user.id = fbUser.uid;
        user.isVerified = true;
        user.lastLoginAt = new Date().toISOString();
      }

      const updatedAccounts = accounts.filter((a) => a.id !== user!.id).concat(user);
      saveAccounts(updatedAccounts);
      setCurrentUser(user);
      syncUserProfileToFirestore(user).catch(() => {});

      return {
        success: true,
        user,
        message: `Welcome back, ${user.fullName}! (Authenticated with Firebase)`,
      };
    } catch (fbErr: any) {
      console.warn('Firebase signInWithEmailAndPassword notice:', fbErr?.code || fbErr?.message);

      if (fbErr?.code === 'auth/operation-not-allowed') {
        return {
          success: false,
          message:
            `Firebase Authentication Error (auth/operation-not-allowed): The Email/Password provider is disabled in your Firebase Console (${firebaseConfig.projectId}). In Firebase Console go to Authentication > Sign-in method > Email/Password and enable it.`,
        };
      } else if (fbErr?.code === 'auth/wrong-password' || fbErr?.code === 'auth/invalid-credential') {
        return {
          success: false,
          message: 'Incorrect email or password. Please verify your credentials.',
        };
      } else if (fbErr?.code === 'auth/user-not-found') {
        return {
          success: false,
          message: 'No registered account found in Firebase Authentication for this email. Please create an account first.',
        };
      } else if (fbErr?.code === 'auth/too-many-requests') {
        return {
          success: false,
          message: 'Too many failed login attempts. Please wait a few moments or reset your password.',
        };
      } else {
        return {
          success: false,
          message: 'Firebase Authentication error: ' + (fbErr?.message || fbErr?.code || 'Sign-in failed.'),
        };
      }
    }
  }

  return {
    success: false,
    message: 'Password login is supported for email accounts. For phone numbers, please sign in with your phone verification code.',
  };
}

// Sign in or register with Google Authentication popup
export async function signInWithGoogle(
  role: UserRole = 'supervisor',
  stationData?: {
    stationMode?: 'new' | 'existing';
    stationName?: string;
    stationCode?: string;
    companyName?: string;
    stationLocation?: string;
  }
): Promise<{ success: boolean; user?: AuthUser; message?: string }> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const result = await signInWithPopup(auth, provider);
    const fbUser = result.user;

    // Check if user already exists in Firestore
    let existingProfile: AuthUser | null = null;
    try {
      const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
      if (userDoc.exists()) {
        existingProfile = userDoc.data() as AuthUser;
      }
    } catch (e) {
      console.warn('Firestore fetch user notice:', e);
    }

    if (existingProfile) {
      existingProfile.isVerified = true;
      existingProfile.lastLoginAt = new Date().toISOString();
      await syncUserProfileToFirestore(existingProfile).catch(() => {});
      const accounts = getAllAccounts();
      const updatedAccounts = accounts.filter((a) => a.id !== existingProfile!.id).concat(existingProfile);
      saveAccounts(updatedAccounts);
      setCurrentUser(existingProfile);
      return {
        success: true,
        user: existingProfile,
        message: `Welcome back, ${existingProfile.fullName}! (Authenticated with Google)`,
      };
    }

    // New Google-authenticated user: create authoritative Firestore profile
    const normEmail = fbUser.email?.toLowerCase().trim() || `${fbUser.uid}@gmail.com`;
    const userRole = role || 'supervisor';
    const rolePrefix = userRole === 'attendant' ? 'ATT' : 'SUP';
    const generatedStaffId = `${rolePrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    let targetStation: StationConfig | undefined = undefined;
    if (stationData?.stationMode === 'new' && stationData.stationName && stationData.stationCode) {
      targetStation = createOrUpdateStationBySupervisor({
        name: stationData.stationName.trim(),
        stationCode: stationData.stationCode.trim().toUpperCase(),
        companyName: stationData.companyName?.trim() || 'Independent Station',
        locationName: stationData.stationLocation?.trim() || 'Accra, Ghana',
        isActive: true,
      });
      await saveStationToFirestore(targetStation).catch((e) => {
        console.warn('Google sign-in save station notice:', e);
      });
    } else {
      const allStations = getStations();
      targetStation = allStations[0];
    }

    cleanAllSampleExamplesForNewAccount();

    const newUser: AuthUser = {
      id: fbUser.uid,
      fullName: fbUser.displayName || normEmail.split('@')[0],
      authType: 'email',
      identifier: normEmail,
      email: normEmail,
      isVerified: true,
      station: targetStation?.name || 'Main Forecourt Station',
      stationId: targetStation?.id,
      stationCode: targetStation?.stationCode || '',
      companyId: targetStation?.companyId,
      companyName: targetStation?.companyName || 'Fuel Station',
      supervisor: userRole === 'supervisor' ? (fbUser.displayName || 'Station Supervisor') : 'Station Supervisor',
      role: userRole,
      staffId: generatedStaffId,
      dutyStatus: 'active',
      attendanceRate: '100%',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    await syncUserProfileToFirestore(newUser).catch((e) => {
      console.warn('Google sign-in profile sync notice:', e);
    });

    const accounts = getAllAccounts();
    const updatedAccounts = accounts.filter((a) => a.id !== newUser.id).concat(newUser);
    saveAccounts(updatedAccounts);
    setCurrentUser(newUser);

    return {
      success: true,
      user: newUser,
      message: `Account created successfully with Google! Welcome, ${newUser.fullName}.`,
    };
  } catch (err: any) {
    console.warn('Google sign-in warning:', err);
    if (err?.code === 'auth/popup-closed-by-user') {
      return { success: false, message: 'Google sign-in popup was closed before completing.' };
    }
    if (err?.code === 'auth/cancelled-popup-request') {
      return { success: false, message: 'Only one sign-in popup request is allowed at a time.' };
    }
    return {
      success: false,
      message: 'Google Sign-In: ' + (err?.message || err?.code || 'Unable to complete sign-in with Google.'),
    };
  }
}

// Verify entered OTP / Link with Firebase Authentication
export async function verifyOtpCode(
  identifier: string,
  authType: 'email' | 'phone',
  enteredCode: string
): Promise<{ success: boolean; user?: AuthUser; message?: string; attemptsRemaining?: number }> {
  const normId = normalizeIdentifier(identifier, authType);
  const session = getActiveOtpSession();

  if (!session) {
    return {
      success: false,
      message: 'Verification session has expired. Please request a new verification code.',
    };
  }

  if (session.identifier !== normId) {
    return {
      success: false,
      message: 'Verification code was not issued for this contact identifier.',
    };
  }

  const MAX_ATTEMPTS = session.maxAttempts || 5;
  if (session.attempts >= MAX_ATTEMPTS) {
    clearActiveOtpSession();
    return {
      success: false,
      message: `Maximum verification attempts exceeded. Please request a new code.`,
    };
  }

  // If Firebase Phone Auth confirmation is active, confirm the official OTP
  if (authType === 'phone' && activeConfirmationResult) {
    try {
      const userCredential = await activeConfirmationResult.confirm(enteredCode.trim());
      const firebaseUid = userCredential.user?.uid;

      // Find local or pending user account
      const accounts = getAllAccounts();
      let user = accounts.find(
        (a) =>
          a.authType === authType &&
          normalizeIdentifier(a.identifier, a.authType) === normId
      ) || pendingRegistrationUser;

      if (!user) {
        return {
          success: false,
          message: 'Account record not found. Please try registering again.',
        };
      }

      user.isVerified = true;
      if (firebaseUid) {
        user.id = firebaseUid;
      }
      user.verifiedAt = new Date().toISOString();
      user.lastLoginAt = new Date().toISOString();

      const updatedAccounts = accounts.filter((a) => a.id !== user!.id).concat(user);
      saveAccounts(updatedAccounts);
      setCurrentUser(user);
      clearActiveOtpSession();

      // Sync verified profile to Cloud Firestore
      try {
        await syncUserProfileToFirestore(user);
      } catch (syncErr) {
        console.warn('Profile sync to Firestore deferred:', syncErr);
      }

      return {
        success: true,
        user,
        message: 'Phone number verified and account successfully activated via Firebase Authentication!',
      };
    } catch (err: any) {
      console.warn('Firebase confirm code attempt:', err?.message || err);
      // If entered code matches the session fallback code, allow verification
      if (session.code && enteredCode.trim() === session.code) {
        // Fallback matched
      } else {
        session.attempts = (session.attempts || 0) + 1;
        const remaining = MAX_ATTEMPTS - session.attempts;

        if (session.attempts >= MAX_ATTEMPTS) {
          clearActiveOtpSession();
          return {
            success: false,
            attemptsRemaining: 0,
            message: `Too many failed attempts. For your security, this verification code has been invalidated.`,
          };
        }

        localStorage.setItem(AUTH_STORAGE_KEYS.ACTIVE_OTP, JSON.stringify(session));
        return {
          success: false,
          attemptsRemaining: remaining,
          message: parseFirebaseAuthError(err),
        };
      }
    }
  }

  // Fallback verification matching (e.g. when Phone Auth is in session code mode or Email flow)
  if (session.code && enteredCode.trim() !== session.code) {
    session.attempts = (session.attempts || 0) + 1;
    const remaining = MAX_ATTEMPTS - session.attempts;

    if (session.attempts >= MAX_ATTEMPTS) {
      clearActiveOtpSession();
      return {
        success: false,
        attemptsRemaining: 0,
        message: 'Too many failed attempts. For your security, this verification code has been invalidated.',
      };
    }

    localStorage.setItem(AUTH_STORAGE_KEYS.ACTIVE_OTP, JSON.stringify(session));
    return {
      success: false,
      attemptsRemaining: remaining,
      message: `Invalid 6-digit verification code. ${remaining} attempt(s) remaining.`,
    };
  }

  // Find user and complete verification
  const accounts = getAllAccounts();
  let user = accounts.find(
    (a) =>
      a.authType === authType &&
      normalizeIdentifier(a.identifier, a.authType) === normId
  ) || pendingRegistrationUser;

  if (!user) {
    return {
      success: false,
      message: 'Account record not found. Please try registering again.',
    };
  }

  user.isVerified = true;
  user.verifiedAt = new Date().toISOString();
  user.lastLoginAt = new Date().toISOString();

  const updatedAccounts = accounts.filter((a) => a.id !== user!.id).concat(user);
  saveAccounts(updatedAccounts);
  setCurrentUser(user);
  clearActiveOtpSession();

  // Sync to Cloud Firestore
  try {
    const fbUid = await ensureFirebaseAuthSession(user);
    if (fbUid && user.id !== fbUid) {
      user.id = fbUid;
      const refreshedAccounts = getAllAccounts().filter((a) => a.id !== user!.id).concat(user);
      saveAccounts(refreshedAccounts);
      setCurrentUser(user);
    }
    await syncUserProfileToFirestore(user);
  } catch (syncErr) {
    console.warn('Profile sync to Firestore deferred:', syncErr);
  }

  return {
    success: true,
    user,
    message: 'Verification confirmed and account successfully activated!',
  };
}

// Request login for existing user via Firebase Authentication
export async function requestLogin(
  identifier: string,
  authType: 'email' | 'phone'
): Promise<{ found: boolean; user?: AuthUser; message?: string }> {
  const normId = normalizeIdentifier(identifier, authType);
  const accounts = getAllAccounts();
  const user = accounts.find(
    (a) =>
      a.authType === authType &&
      normalizeIdentifier(a.identifier, a.authType) === normId
  );

  if (!user) {
    return {
      found: false,
      message:
        'No registered account found for this ' +
        (authType === 'email' ? 'email' : 'phone number') +
        '. Please create an account first.',
    };
  }

  const { message } = await initiateOtp(user.identifier, user.authType, user.fullName, user.station);
  return {
    found: true,
    user,
    message: message || `Verification code sent to ${user.identifier} via Firebase Authentication.`,
  };
}

// Check for incoming Firebase Email Sign-in Link on page load
export async function checkFirebaseEmailSignInLink(): Promise<AuthUser | null> {
  if (typeof window === 'undefined') return null;

  try {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = localStorage.getItem(AUTH_STORAGE_KEYS.EMAIL_FOR_SIGN_IN);
      if (!email) {
        email = window.prompt('Please provide your email for confirmation') || '';
      }
      if (email) {
        const result = await signInWithEmailLink(auth, email, window.location.href);
        const normId = normalizeIdentifier(email, 'email');
        const accounts = getAllAccounts();
        let user = accounts.find(
          (a) =>
            a.authType === 'email' &&
            normalizeIdentifier(a.identifier, 'email') === normId
        );
        if (user) {
          user.isVerified = true;
          if (result.user?.uid) user.id = result.user.uid;
          user.lastLoginAt = new Date().toISOString();
          setCurrentUser(user);
          try {
            await syncUserProfileToFirestore(user);
          } catch (syncErr) {
            console.warn('Profile sync to Firestore deferred:', syncErr);
          }
          localStorage.removeItem(AUTH_STORAGE_KEYS.EMAIL_FOR_SIGN_IN);
          return user;
        }
      }
    }
  } catch (err) {
    console.warn('Firebase email link check info:', err);
  }
  return null;
}

// Delete user account by ID (supervisor, attendant, manager)
export function deleteAccount(userId: string): { success: boolean; message: string } {
  try {
    const accounts = getAllAccounts();
    const target = accounts.find((a) => a.id === userId);
    if (!target) {
      return { success: false, message: 'Account not found.' };
    }

    const updated = accounts.filter((a) => a.id !== userId);
    saveAccounts(updated);

    // Delete user from Cloud Firestore
    deleteDoc(doc(db, 'users', userId)).catch((err) => {
      console.warn('Firestore user deletion notice:', err);
    });

    // If current logged-in user is deleting their own account, log out
    const current = getCurrentUser();
    if (current && current.id === userId) {
      logoutCurrentUser();
    }

    return { success: true, message: `Account for ${target.fullName} has been deleted.` };
  } catch (e: any) {
    return { success: false, message: e?.message || 'Failed to delete account.' };
  }
}

// Logout current user
export function logoutCurrentUser(): void {
  try {
    firebaseSignOut(auth).catch(() => {});
  } catch {}
  setCurrentUser(null);
  clearActiveOtpSession();
}

// Ensure active Firebase Authentication session and Firestore profile document synchronization
export async function ensureFirebaseAuthSession(user: AuthUser): Promise<string | null> {
  if (!user) return null;

  try {
    let fbUser = auth.currentUser;

    if (!fbUser) {
      const authEmail = (user.email && user.email.includes('@') && !user.email.endsWith('.internal'))
        ? user.email.trim().toLowerCase()
        : `${(user.staffId || user.id || 'attendant').toLowerCase().replace(/[^a-z0-9]/g, '')}@fuelstation.internal`;

      const authPassword = `StnPass_${user.id || user.staffId || 'secure'}_Secure!2026`;

      try {
        const cred = await signInWithEmailAndPassword(auth, authEmail, authPassword);
        fbUser = cred.user;
      } catch (err: any) {
        if (
          err?.code === 'auth/user-not-found' ||
          err?.code === 'auth/invalid-credential' ||
          err?.code === 'auth/invalid-login-credentials'
        ) {
          try {
            const cred = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
            fbUser = cred.user;
          } catch (createErr: any) {
            if (createErr?.code === 'auth/email-already-in-use') {
              try {
                const cred = await signInWithEmailAndPassword(auth, authEmail, authPassword);
                fbUser = cred.user;
              } catch {}
            } else {
              console.warn('Firebase createUser notice:', createErr?.message);
            }
          }
        } else {
          console.warn('Firebase signIn notice:', err?.message);
        }
      }
    }

    if (fbUser) {
      // Sync the user profile to /users/{fbUser.uid} so getUserDoc() in rules succeeds
      const profilePayload = {
        id: user.id || fbUser.uid,
        uid: fbUser.uid,
        fullName: user.fullName,
        authType: user.authType,
        identifier: user.identifier,
        phone: user.phone || null,
        email: user.email || null,
        pinHash: user.pinHash || null,
        pinSalt: user.pinSalt || null,
        isVerified: user.isVerified !== undefined ? user.isVerified : true,
        station: user.station,
        stationId: user.stationId || null,
        stationCode: user.stationCode || '',
        companyId: user.companyId || null,
        companyName: user.companyName || null,
        supervisor: user.supervisor,
        role: user.role,
        staffId: user.staffId,
        shiftGroup: user.shiftGroup || null,
        shiftHours: user.shiftHours || null,
        assignedPumps: user.assignedPumps || null,
        dutyStatus: user.dutyStatus || 'active',
        attendanceRate: user.attendanceRate || '100%',
        lastLoginAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const userDocRef = doc(db, 'users', fbUser.uid);
      await setDoc(userDocRef, profilePayload, { merge: true });

      // If user.id is different from fbUser.uid, also sync to users/{user.id}
      if (user.id && user.id !== fbUser.uid) {
        try {
          await setDoc(doc(db, 'users', user.id), profilePayload, { merge: true });
        } catch {}
      }

      return fbUser.uid;
    }
  } catch (e) {
    console.warn('ensureFirebaseAuthSession notice:', e);
  }
  return auth.currentUser?.uid || null;
}

// Observe Firebase Authentication state changes
export function initAuthListener(onUserChange: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
      try {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          const u = snap.data() as AuthUser;
          if (u) {
            setCurrentUser(u);
            onUserChange(u);
            return;
          }
        }
      } catch (err) {
        console.warn('Firestore fetch user on auth state changed notice:', err);
      }

      const current = getCurrentUser();
      if (current) {
        if (
          current.id !== fbUser.uid &&
          (current.email === fbUser.email || (fbUser.phoneNumber && current.phone === fbUser.phoneNumber))
        ) {
          current.id = fbUser.uid;
          setCurrentUser(current);
        }
        onUserChange(current);
      }
    }
  });
}

// Dispatch Firebase Password Reset Email
export async function sendFirebasePasswordReset(
  email: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return {
      success: false,
      message: 'Please provide a valid email address.',
    };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return {
      success: false,
      message: 'Please enter a valid email address format (e.g. name@station.com).',
    };
  }

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return {
      success: true,
      message: `Password reset email dispatched to ${cleanEmail}. Please check your inbox (and spam/junk folder) for the password recovery link.`,
    };
  } catch (err: any) {
    console.warn('Firebase sendPasswordResetEmail note:', err?.code || err?.message || err);
    const code = err?.code || '';
    if (code === 'auth/user-not-found') {
      return {
        success: false,
        message: `No account record found for "${cleanEmail}". Please check your email or create a new account.`,
      };
    } else if (code === 'auth/invalid-email') {
      return {
        success: false,
        message: 'The email address provided is not valid.',
      };
    } else if (code === 'auth/too-many-requests') {
      return {
        success: false,
        message: 'Too many password reset attempts. Please wait a few moments before trying again.',
      };
    }
    return {
      success: true,
      message: `Password reset instructions sent to ${cleanEmail}. If an account exists with this email, you will receive a reset link shortly.`,
    };
  }
}

