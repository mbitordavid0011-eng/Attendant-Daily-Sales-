import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { StationConfig, StationJoinRequest, AuthUser, UserProfile } from '../types';
import {
  getStations,
  saveStations,
  getStationById,
  saveProfile,
  getProfile,
  addWorkerAssignmentAuditLog,
} from './storage';
import {
  getAllAccounts,
  saveAccounts,
  getCurrentUser,
  setCurrentUser,
  syncUserProfileToFirestore,
} from './auth';

const STORAGE_JOIN_REQUESTS_KEY = 'staroil_station_join_requests';

// Local storage helpers for join requests (offline/immediate cache)
export function getLocalJoinRequests(): StationJoinRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_JOIN_REQUESTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Failed to read local join requests', e);
  }
  return [];
}

export function saveLocalJoinRequests(requests: StationJoinRequest[]): void {
  try {
    localStorage.setItem(STORAGE_JOIN_REQUESTS_KEY, JSON.stringify(requests));
    // Dispatch storage event so all components react immediately
    window.dispatchEvent(new Event('staroil_join_requests_updated'));
    window.dispatchEvent(new Event('join_requests_updated'));
  } catch (e) {
    console.error('Failed to save local join requests', e);
  }
}

// Automatically ensure an Attendant Accountability ledger record is created in Firestore & local cache
export async function ensureAttendantAccountabilityRecord(params: {
  userId: string;
  attendantName: string;
  staffId: string;
  stationName: string;
  phone?: string;
}): Promise<void> {
  try {
    let localSaved: any[] = [];
    try {
      const raw = localStorage.getItem('attendant_accountability');
      if (raw) localSaved = JSON.parse(raw);
    } catch {}

    const existing = localSaved.find(
      (r) =>
        (r.attendantName && r.attendantName.trim().toLowerCase() === params.attendantName.trim().toLowerCase()) ||
        (params.staffId && r.staffId && r.staffId.trim().toUpperCase() === params.staffId.trim().toUpperCase())
    );

    if (existing) return;

    const newRec = {
      id: 'att_rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      attendantName: params.attendantName.trim(),
      staffId: params.staffId?.trim() || `ATT-${Math.floor(100 + Math.random() * 900)}`,
      phone: params.phone?.trim() || '',
      shiftType: 'Shift A — Day',
      date: new Date().toISOString().slice(0, 10),
      station: params.stationName.trim(),
      assignedPumps: ['Pump 1 (PMS)'],
      accountState: 'open',
      startDate: new Date().toISOString().slice(0, 10),
      isMultiDay: false,
      daysOpen: 1,
      dayLogs: [],
      meterReadings: [
        {
          id: 'mr_' + Date.now(),
          pumpName: 'Pump 1 (PMS)',
          fuelType: 'super',
          timeSlot: '06:00 – 18:00',
          openingMeter: 0,
          closingMeter: 0,
          rtt: 0,
          unitPrice: 13.27,
          litresSold: 0,
          totalSales: 0,
        },
      ],
      payments: { cash: 0, visa: 0, momo: 0, bank: 0, credit: 0, other: 0 },
      expenses: [],
      actualCashCounted: 0,
      supervisorNotes: 'Newly assigned attendant on station roster.',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    localSaved.push(newRec);
    try {
      localStorage.setItem('attendant_accountability', JSON.stringify(localSaved));
    } catch {}

    // Save to Firestore
    try {
      await setDoc(doc(db, 'attendant_accountability', newRec.id), newRec, { merge: true });
    } catch (e) {
      console.warn('Firestore accountability save notice:', e);
    }

    window.dispatchEvent(new Event('staroil_attendant_accountability_updated'));
  } catch (err) {
    console.warn('ensureAttendantAccountabilityRecord notice:', err);
  }
}

// Save or sync station to centralized Firestore database
export async function saveStationToFirestore(station: StationConfig): Promise<void> {
  const path = `stations/${station.id}`;
  try {
    const stationRef = doc(db, 'stations', station.id);
    await setDoc(
      stationRef,
      {
        id: station.id,
        name: station.name,
        stationCode: (station.stationCode || '').trim(),
        companyId: station.companyId || '',
        companyName: station.companyName || '',
        locationName: station.locationName || '',
        isActive: station.isActive !== undefined ? station.isActive : true,
        pumps: station.pumps || {},
        prices: station.prices || {},
        banks: station.banks || [],
        hasRon95: station.hasRon95 || false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err: unknown) {
    console.warn('Firestore station save notice:', err);
  }
}

// Sync stations from Firestore into local cache
export async function syncStationsFromFirestore(): Promise<StationConfig[]> {
  try {
    const stationsCol = collection(db, 'stations');
    const snapshot = await getDocs(stationsCol);
    if (!snapshot.empty) {
      const remoteStations: StationConfig[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.name && data.stationCode) {
          remoteStations.push({
            id: docSnap.id,
            name: data.name,
            stationCode: String(data.stationCode || '').trim(),
            companyId: data.companyId || 'comp_staroil',
            companyName: data.companyName || 'StarOil Ghana',
            locationName: data.locationName || 'Branch Location',
            isActive: data.isActive !== undefined ? data.isActive : true,
            hasRon95: data.hasRon95 || false,
            pumps: data.pumps || { pms: 4, ago: 2, ron95: 0 },
            prices: data.prices || { pms: 12.8, ago: 13.5, ron95: 14.1 },
            banks: data.banks || ['GCB Bank PLC', 'Ecobank Ghana PLC'],
          });
        }
      });

      if (remoteStations.length > 0) {
        // Merge remote with local stations
        const local = getStations();
        const mergedMap = new Map<string, StationConfig>();
        local.forEach((s) => mergedMap.set(s.id, s));
        remoteStations.forEach((s) => mergedMap.set(s.id, s));
        const merged = Array.from(mergedMap.values());
        saveStations(merged);
        return merged;
      }
    } else {
      // If Firestore stations collection is empty, seed with current local stations
      const local = getStations();
      for (const st of local) {
        await saveStationToFirestore(st);
      }
    }
  } catch (err: unknown) {
    console.warn('Firestore stations fetch notice:', err);
  }
  return getStations();
}

// Find station by exact code in centralized database (Firestore + local cache)
export async function findStationByExactCode(
  code: string
): Promise<{ found: boolean; station?: StationConfig; message: string }> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return {
      found: false,
      message: 'Please enter the official Station Code provided by your station manager.',
    };
  }

  // First sync / check Firestore directly
  try {
    const stationsCol = collection(db, 'stations');
    const snapshot = await getDocs(stationsCol);
    if (!snapshot.empty) {
      let matchedRemote: StationConfig | undefined;
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (
          data &&
          data.stationCode &&
          String(data.stationCode).trim().toUpperCase() === cleanCode
        ) {
          matchedRemote = {
            id: docSnap.id,
            name: data.name,
            stationCode: String(data.stationCode).trim(),
            companyId: data.companyId || 'comp_staroil',
            companyName: data.companyName || 'StarOil Ghana',
            locationName: data.locationName || 'Branch Location',
            isActive: data.isActive !== undefined ? data.isActive : true,
            hasRon95: data.hasRon95 || false,
            pumps: data.pumps || { pms: 4, ago: 2, ron95: 0 },
            prices: data.prices || { pms: 12.8, ago: 13.5, ron95: 14.1 },
            banks: data.banks || ['GCB Bank PLC', 'Ecobank Ghana PLC'],
          };
        }
      });

      if (matchedRemote) {
        if (matchedRemote.isActive === false) {
          return {
            found: false,
            station: matchedRemote,
            message: `Station "${matchedRemote.name}" (${matchedRemote.stationCode}) is currently marked inactive in the system.`,
          };
        }
        return {
          found: true,
          station: matchedRemote,
          message: `Station verified: ${matchedRemote.name} (${matchedRemote.stationCode})`,
        };
      }
    }
  } catch (err) {
    console.warn('Firestore station search notice:', err);
  }

  // Fallback to local station registry
  const localStations = getStations();
  const matchedLocal = localStations.find(
    (s) => s.stationCode && s.stationCode.trim().toUpperCase() === cleanCode
  );

  if (matchedLocal) {
    if (matchedLocal.isActive === false) {
      return {
        found: false,
        station: matchedLocal,
        message: `Station "${matchedLocal.name}" (${matchedLocal.stationCode}) is currently marked inactive in the system.`,
      };
    }
    // Also sync this local station to Firestore so other devices find it immediately
    saveStationToFirestore(matchedLocal);
    return {
      found: true,
      station: matchedLocal,
      message: `Station verified: ${matchedLocal.name} (${matchedLocal.stationCode})`,
    };
  }

  return {
    found: false,
    message: `Station Code "${cleanCode}" was not found in the centralized database. Please verify the code with your Station Manager or request to join.`,
  };
}

// OPTION 1: Join a station immediately using an official Station Code
export async function joinStationByCode(
  userId: string,
  stationCode: string
): Promise<{ success: boolean; station?: StationConfig; user?: AuthUser; message: string }> {
  const result = await findStationByExactCode(stationCode);
  if (!result.found || !result.station) {
    return {
      success: false,
      message: result.message,
    };
  }

  const station = result.station;

  // 1. Update user in local accounts
  const accounts = getAllAccounts();
  const userIdx = accounts.findIndex((a) => a.id === userId);
  let updatedUser: AuthUser;

  if (userIdx >= 0) {
    const prev = accounts[userIdx];
    updatedUser = {
      ...prev,
      station: station.name,
      stationId: station.id,
      stationCode: station.stationCode,
      companyId: station.companyId,
      companyName: station.companyName,
      supervisor: station.name + ' Supervisor',
    };
    accounts[userIdx] = updatedUser;
    saveAccounts(accounts);
  } else {
    // Current user fallback
    const current = getCurrentUser();
    if (current && current.id === userId) {
      updatedUser = {
        ...current,
        station: station.name,
        stationId: station.id,
        stationCode: station.stationCode,
        companyId: station.companyId,
        companyName: station.companyName,
        supervisor: station.name + ' Supervisor',
      };
      saveAccounts([...accounts, updatedUser]);
    } else {
      return {
        success: false,
        message: 'Attendant user record not found. Please log in again.',
      };
    }
  }

  // 2. Update current active user session and profile
  const current = getCurrentUser();
  if (current && current.id === userId) {
    setCurrentUser(updatedUser);
    const prof = getProfile();
    const updatedProf: UserProfile = {
      ...prof,
      station: station.name,
      stationId: station.id,
      stationCode: station.stationCode,
      companyId: station.companyId,
      companyName: station.companyName,
      supervisor: station.name + ' Supervisor',
    };
    saveProfile(updatedProf);
  }

  // 3. Save permanently to Centralized Cloud Database (Firestore)
  try {
    await syncUserProfileToFirestore(updatedUser);
  } catch (syncErr) {
    console.warn('Station join user profile sync to Firestore deferred:', syncErr);
  }

  // 4. Log worker assignment audit
  try {
    addWorkerAssignmentAuditLog({
      workerId: updatedUser.id,
      workerName: updatedUser.fullName,
      companyId: station.companyId,
      companyName: station.companyName,
      staffId: updatedUser.staffId,
      oldStation: 'Unassigned',
      newStation: station.name,
      oldStationId: undefined,
      newStationId: station.id,
      oldStationCode: undefined,
      newStationCode: station.stationCode,
      assignedBy: updatedUser.fullName + ' (Self-Assigned via Station Code)',
      userRole: 'attendant',
      reason: `Direct station assignment via official Station Code ${station.stationCode}`,
    });
  } catch (e) {
    console.warn('Worker audit log notice:', e);
  }

  // Ensure accountability record exists in Firestore and local state
  try {
    await ensureAttendantAccountabilityRecord({
      userId: updatedUser.id,
      attendantName: updatedUser.fullName,
      staffId: updatedUser.staffId || '',
      stationName: station.name,
      phone: updatedUser.phone,
    });
  } catch (e) {
    console.warn('Accountability record provisioning notice:', e);
  }

  // Notify UI
  window.dispatchEvent(new Event('staroil_attendant_station_changed'));
  window.dispatchEvent(new Event('staroil_team_roster_updated'));
  window.dispatchEvent(new Event('staroil_attendant_accountability_updated'));

  return {
    success: true,
    station,
    user: updatedUser,
    message: `Successfully joined ${station.name} (${station.stationCode}). Station roster and records are now connected!`,
  };
}

// OPTION 2: Submit a Station Join Request
export async function submitStationJoinRequest(params: {
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
  notes?: string;
}): Promise<{ success: boolean; request: StationJoinRequest; message: string }> {
  const reqId = `join_req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const newRequest: StationJoinRequest = {
    id: reqId,
    userId: params.userId,
    attendantName: params.attendantName.trim(),
    attendantIdentifier: params.attendantIdentifier.trim(),
    attendantPhone: params.attendantPhone?.trim(),
    attendantEmail: params.attendantEmail?.trim(),
    staffId: params.staffId?.trim(),
    stationId: params.stationId.trim(),
    stationName: params.stationName.trim(),
    stationCode: params.stationCode.trim(),
    companyName: params.companyName?.trim() || 'Independent Station',
    status: 'pending',
    requestDate: new Date().toISOString(),
    notes: params.notes?.trim(),
  };

  // 1. Save to local cache
  const local = getLocalJoinRequests();
  // If user already had a pending request for this station, replace or append
  const filtered = local.filter(
    (r) => !(r.userId === newRequest.userId && r.status === 'pending')
  );
  saveLocalJoinRequests([newRequest, ...filtered]);

  // 2. Save to Centralized Firestore Database
  try {
    const reqRef = doc(db, 'station_join_requests', reqId);
    await setDoc(reqRef, newRequest);
  } catch (err: unknown) {
    console.warn('Firestore join request save notice:', err);
  }

  return {
    success: true,
    request: newRequest,
    message: `Station join request submitted for ${newRequest.stationName}. Your Station Supervisor / Manager will review and approve your account.`,
  };
}

// Fetch all join requests from Centralized Firestore (with fallback to local)
export async function fetchAllJoinRequests(): Promise<StationJoinRequest[]> {
  try {
    const colRef = collection(db, 'station_join_requests');
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list: StationJoinRequest[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as StationJoinRequest;
        if (data && data.id && data.userId) {
          list.push(data);
        }
      });
      // Sort newest first
      list.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
      saveLocalJoinRequests(list);
      return list;
    }
  } catch (err) {
    console.warn('Firestore join requests fetch notice:', err);
  }
  return getLocalJoinRequests();
}

// Get join requests submitted by a specific Attendant
export async function getAttendantJoinRequests(
  userId: string
): Promise<StationJoinRequest[]> {
  const all = await fetchAllJoinRequests();
  return all.filter((r) => r.userId === userId);
}

// Get pending join requests for a supervisor's station
export async function getPendingJoinRequestsForStation(
  stationId?: string,
  stationCode?: string,
  stationName?: string
): Promise<StationJoinRequest[]> {
  const all = await fetchAllJoinRequests();
  const cleanId = (stationId || '').trim();
  const cleanCode = (stationCode || '').trim().toUpperCase();
  const cleanName = (stationName || '').trim().toLowerCase();

  return all.filter((r) => {
    if (r.status !== 'pending') return false;
    if (cleanId && r.stationId === cleanId) return true;
    if (cleanCode && r.stationCode.trim().toUpperCase() === cleanCode) return true;
    if (cleanName && r.stationName.trim().toLowerCase() === cleanName) return true;
    // If supervisor station is broad or default, show all matching or unassigned
    return false;
  });
}

// SUPERVISOR / MANAGER ACTION: Approve or Reject a Station Join Request
export async function reviewStationJoinRequest(params: {
  requestId: string;
  decision: 'approved' | 'rejected';
  reviewerName: string;
  reviewerRole: string;
  rejectionReason?: string;
}): Promise<{ success: boolean; request: StationJoinRequest; message: string }> {
  const all = await fetchAllJoinRequests();
  const targetReq = all.find((r) => r.id === params.requestId);
  if (!targetReq) {
    throw new Error(`Station join request "${params.requestId}" not found.`);
  }

  const updatedReq: StationJoinRequest = {
    ...targetReq,
    status: params.decision,
    reviewedBy: params.reviewerName,
    reviewedAt: new Date().toISOString(),
    rejectionReason: params.rejectionReason?.trim(),
  };

  // 1. Update in local cache
  const updatedList = all.map((r) => (r.id === params.requestId ? updatedReq : r));
  saveLocalJoinRequests(updatedList);

  // 2. Update in Firestore
  try {
    const reqRef = doc(db, 'station_join_requests', params.requestId);
    await setDoc(reqRef, updatedReq, { merge: true });
  } catch (err) {
    console.warn('Firestore join request review update notice:', err);
  }

  // 3. If APPROVED: Permanently assign attendant to station!
  if (params.decision === 'approved') {
    const targetUserId = targetReq.userId;
    const accounts = getAllAccounts();
    const userIdx = accounts.findIndex((a) => a.id === targetUserId);
    let targetUser: AuthUser | undefined;

    if (userIdx >= 0) {
      const prev = accounts[userIdx];
      targetUser = {
        ...prev,
        station: targetReq.stationName,
        stationId: targetReq.stationId,
        stationCode: targetReq.stationCode,
        companyName: targetReq.companyName || prev.companyName,
        supervisor: params.reviewerName,
        dutyStatus: 'active',
      };
      accounts[userIdx] = targetUser;
      saveAccounts(accounts);
    } else {
      // If user account is on another device or newly fetched from Firestore
      try {
        const userDocRef = doc(db, 'users', targetUserId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const uData = userSnap.data() as Partial<AuthUser>;
          targetUser = {
            id: targetUserId,
            fullName: uData.fullName || targetReq.attendantName,
            authType: (uData.authType as any) || 'phone',
            identifier: uData.identifier || targetReq.attendantIdentifier,
            phone: uData.phone || targetReq.attendantPhone,
            email: uData.email || targetReq.attendantEmail,
            isVerified: true,
            station: targetReq.stationName,
            stationId: targetReq.stationId,
            stationCode: targetReq.stationCode,
            companyName: targetReq.companyName || 'Fuel Station',
            supervisor: params.reviewerName,
            role: 'attendant',
            staffId: targetReq.staffId || uData.staffId || `ATT-${Math.floor(1000 + Math.random() * 9000)}`,
            dutyStatus: 'active',
            attendanceRate: '100%',
            createdAt: uData.createdAt || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
          saveAccounts([...accounts, targetUser]);
        }
      } catch (e) {
        console.warn('User fetch from Firestore notice:', e);
      }
    }

    // Permanently sync updated user profile to Firestore
    if (targetUser) {
      try {
        await syncUserProfileToFirestore(targetUser);
      } catch (syncErr) {
        console.warn('User profile sync to Firestore deferred:', syncErr);
      }
    } else {
      // Direct Firestore document patch
      try {
        const userDocRef = doc(db, 'users', targetUserId);
        await setDoc(
          userDocRef,
          {
            id: targetUserId,
            station: targetReq.stationName,
            stationId: targetReq.stationId,
            stationCode: targetReq.stationCode,
            companyName: targetReq.companyName || 'Fuel Station',
            supervisor: params.reviewerName,
            dutyStatus: 'active',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Direct Firestore user patch notice:', e);
      }
    }

    // Ensure accountability record exists in Firestore and local state
    try {
      await ensureAttendantAccountabilityRecord({
        userId: targetReq.userId,
        attendantName: targetReq.attendantName,
        staffId: targetReq.staffId || '',
        stationName: targetReq.stationName,
        phone: targetReq.attendantPhone,
      });
    } catch (e) {
      console.warn('Accountability record provisioning notice:', e);
    }

    // Add Worker Assignment Audit Log
    try {
      addWorkerAssignmentAuditLog({
        workerId: targetReq.userId,
        workerName: targetReq.attendantName,
        companyName: targetReq.companyName,
        staffId: targetReq.staffId,
        oldStation: 'Unassigned',
        newStation: targetReq.stationName,
        newStationId: targetReq.stationId,
        newStationCode: targetReq.stationCode,
        assignedBy: params.reviewerName,
        userRole: params.reviewerRole,
        reason: `Approved station-join request #${params.requestId.substring(0, 8)}`,
      });
    } catch (e) {
      console.warn('Worker audit log notice:', e);
    }

    // Notify listeners so Team Roster reloads immediately
    window.dispatchEvent(new Event('staroil_attendant_station_changed'));
    window.dispatchEvent(new Event('staroil_team_roster_updated'));
    window.dispatchEvent(new Event('staroil_attendant_accountability_updated'));

    return {
      success: true,
      request: updatedReq,
      message: `Approved ${targetReq.attendantName} to join ${targetReq.stationName}. Attendant is now assigned to the station team roster!`,
    };
  }

  // If REJECTED
  window.dispatchEvent(new Event('staroil_join_requests_updated'));
  return {
    success: true,
    request: updatedReq,
    message: `Station join request for ${targetReq.attendantName} was rejected. Attendant account remains active without station assignment.`,
  };
}

// Real-time listener for join requests across devices
export function subscribeToJoinRequests(
  onUpdate: (requests: StationJoinRequest[]) => void
): () => void {
  try {
    const colRef = collection(db, 'station_join_requests');
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        const local = getLocalJoinRequests();
        const map = new Map<string, StationJoinRequest>();
        local.forEach((r) => map.set(r.id, r));

        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as StationJoinRequest;
          if (d && d.id) {
            map.set(d.id, d);
          }
        });

        const list = Array.from(map.values()).sort(
          (a, b) => new Date(b.requestDate || 0).getTime() - new Date(a.requestDate || 0).getTime()
        );
        saveLocalJoinRequests(list);
        onUpdate(list);
      },
      (err) => {
        console.warn('Real-time join requests subscription notice:', err);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Failed to attach join requests listener:', err);
    return () => {};
  }
}

