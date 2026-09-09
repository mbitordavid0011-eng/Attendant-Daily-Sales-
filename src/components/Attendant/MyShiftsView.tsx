import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Clock,
  Play,
  Square,
  CheckCircle2,
  AlertCircle,
  Fuel,
  PlusCircle,
  FileText,
  Calendar,
  ChevronRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { UserProfile, ShiftRecord } from '../../types';

interface MyShiftsViewProps {
  profile: UserProfile;
  records: ShiftRecord[];
  onStartShift: () => void;
  onResumeDraft: (record: ShiftRecord) => void;
  onSelectRecord: (record: ShiftRecord) => void;
}

export const MyShiftsView: React.FC<MyShiftsViewProps> = ({
  profile,
  records,
  onStartShift,
  onResumeDraft,
  onSelectRecord,
}) => {
  const [isClockedIn, setIsClockedIn] = useState<boolean>(() => {
    try {
      return localStorage.getItem('staroil_attendant_clocked_in') === 'true';
    } catch {
      return false;
    }
  });

  const [clockInTime, setClockInTime] = useState<string>(() => {
    try {
      return localStorage.getItem('staroil_clock_in_time') || new Date().toISOString();
    } catch {
      return new Date().toISOString();
    }
  });

  const handleToggleClock = () => {
    if (isClockedIn) {
      setIsClockedIn(false);
      try {
        localStorage.removeItem('staroil_attendant_clocked_in');
        localStorage.removeItem('staroil_clock_in_time');
      } catch {}
    } else {
      const nowIso = new Date().toISOString();
      setIsClockedIn(true);
      setClockInTime(nowIso);
      try {
        localStorage.setItem('staroil_attendant_clocked_in', 'true');
        localStorage.setItem('staroil_clock_in_time', nowIso);
      } catch {}
    }
  };

  const myRecords = records.filter(
    (r) =>
      r.attendant?.trim().toLowerCase() ===
      (profile.attendant || 'Attendant').trim().toLowerCase()
  );

  const pendingDraft = myRecords.find((r) => r.status === 'draft');

  const scheduleDays = React.useMemo(() => {
    const todayObj = new Date();
    const currentDayOfWeek = todayObj.getDay(); // 0 = Sunday, 1 = Monday...
    // Start from Monday of current week
    const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    const monday = new Date(todayObj);
    monday.setDate(todayObj.getDate() + mondayOffset);

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const bayAssignments = [
      'Pump Island 1 (PMS/AGO)',
      'Pump Island 1 (PMS/AGO)',
      'Pump Island 2 (RON 95/AGO)',
      'Forecourt Standby & Relief Bay',
      'Pump Island 1 (PMS/AGO)',
      'Pump Island 2 (PMS/RON95)',
      'Pump Island 1 (PMS/AGO)',
    ];

    const currentAttendantShift = profile.shiftGroup || 'Shift A (Day)';
    const currentAttendantHours = profile.shiftHours || '06:00 - 18:00';
    const assignedPump = profile.assignedPumps || 'Pump Island 1';

    return dayNames.map((name, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isToday = d.toDateString() === todayObj.toDateString();
      const isPast = d < todayObj && !isToday;

      return {
        day: name,
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        shift: currentAttendantShift,
        time: currentAttendantHours,
        bay: assignedPump || bayAssignments[i],
        status: isToday ? 'today' : isPast ? 'completed' : 'upcoming',
      };
    });
  }, [profile.shiftGroup, profile.shiftHours, profile.assignedPumps]);

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-[#ece8e0] flex items-center gap-2">
            <CalendarClock className="text-[#e8b93b] w-6 h-6" />
            <span>Shifts & Schedule</span>
          </h2>
          <p className="text-xs text-[#8d9195] mt-0.5">
            Personal forecourt duty schedule and active shift status
          </p>
        </div>

        <button
          onClick={onStartShift}
          className="pl-btn primary text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer"
        >
          <PlusCircle size={14} />
          <span>New Shift Record</span>
        </button>
      </div>

      {/* Forecourt Duty Status Card */}
      <div className="pl-card p-4 sm:p-5 bg-linear-to-r from-[#1e2124] to-[#15171a] border border-[#333739] shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-[#8d9195]">
                Forecourt Attendance Status
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                  isClockedIn
                    ? 'bg-emerald-950/80 border border-emerald-500 text-emerald-400'
                    : 'bg-[#23262a] border border-[#333739] text-[#8d9195]'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isClockedIn ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {isClockedIn ? 'ON DUTY · CLOCKED IN' : 'STANDBY · READY TO CLOCK IN'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-base sm:text-lg font-bold text-[#ece8e0]">
                {isClockedIn ? 'Active Forecourt Duty' : 'Off-Duty Standby'}
              </span>
              {isClockedIn && (
                <span className="text-xs text-[#8d9195] font-mono bg-[#23262a] px-2 py-0.5 rounded border border-[#333739]">
                  Clocked In: {new Date(clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-[#8d9195] pt-0.5">
              <span>Station: <strong className="text-[#ece8e0]">{profile.station || 'StarOil Forecourt'}</strong></span>
              <span>•</span>
              <span>Attendant: <strong className="text-[#ece8e0]">{profile.attendant || 'Attendant'}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleToggleClock}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                isClockedIn
                  ? 'bg-rose-900/80 hover:bg-rose-800 text-rose-200 border border-rose-600'
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white border border-emerald-500'
              }`}
            >
              {isClockedIn ? (
                <>
                  <Square size={14} className="fill-current" />
                  <span>Clock Out Shift</span>
                </>
              ) : (
                <>
                  <Play size={14} className="fill-current" />
                  <span>Clock In to Shift</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Active Draft Alert if any */}
        {pendingDraft && (
          <div className="mt-4 p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-300">
              <AlertCircle size={15} />
              <span>
                You have an uncompleted shift draft from{' '}
                <strong>{pendingDraft.date} (Group {pendingDraft.shiftGroup})</strong>
              </span>
            </div>
            <button
              onClick={() => onResumeDraft(pendingDraft)}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded text-xs transition-colors cursor-pointer"
            >
              Resume Draft
            </button>
          </div>
        )}

        {/* Multi-Day Account Status Info */}
        <div className="mt-3 p-3 rounded-lg bg-[#15171a] border border-[#2a2d30] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#8d9195]">
            <Calendar className="w-4 h-4 text-[#e8b93b] shrink-0" />
            <span>
              <strong className="text-[#ece8e0]">Multi-Day Continuity:</strong> Your account can stay open across multiple days (e.g. Saturday → Sunday → Monday). It is only officially closed once your supervisor completes accounting.
            </span>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#23262a] border border-amber-600/40 text-amber-300 font-bold shrink-0">
            Open Until Supervisor Closes
          </span>
        </div>
      </div>

      {/* Weekly Roster & Assigned Shifts */}
      <div className="pl-card p-4 space-y-3 bg-[#191b1d] border border-[#333739]">
        <div className="flex items-center justify-between pb-2 border-b border-[#333739]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#e8b93b]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#ece8e0]">
              My Weekly Duty Roster
            </h3>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-[#23262a] text-[#8d9195] border border-[#333739]">
            Supervisor: {profile.supervisor || 'Station Supervisor'}
          </span>
        </div>

        <div className="space-y-2">
          {scheduleDays.map((item, idx) => {
            const isToday = item.status === 'today';
            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border flex items-center justify-between flex-wrap gap-2 transition-colors ${
                  isToday
                    ? 'bg-[#23262a] border-[#e8b93b]/60 ring-1 ring-[#e8b93b]/30'
                    : 'bg-[#1d2023] border-[#333739]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold text-xs ${
                      isToday
                        ? 'bg-[#e8b93b] text-black'
                        : 'bg-[#23262a] text-[#ece8e0]'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-mono">{item.day.slice(0, 3)}</span>
                    <span className="text-[11px]">{item.date.split(' ')[1]}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-[#ece8e0]">{item.shift}</span>
                      {isToday && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                          TODAY
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#8d9195] flex items-center gap-1.5 mt-0.5">
                      <Fuel size={11} />
                      <span>{item.bay}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                      item.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : item.status === 'today'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-[#15171a] text-[#8d9195] border border-[#333739]'
                    }`}
                  >
                    {item.status.toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Shift Submissions by This Attendant */}
      <div className="pl-card p-4 space-y-3 bg-[#191b1d] border border-[#333739]">
        <div className="flex items-center justify-between pb-2 border-b border-[#333739]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#e8b93b]" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#ece8e0]">
              My Past Shift Records ({myRecords.length})
            </h3>
          </div>
        </div>

        {myRecords.length === 0 ? (
          <div className="p-6 text-center text-[#8d9195] text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#e8b93b]" />
            <p className="font-semibold text-[#ece8e0]">No shift records submitted yet.</p>
            <p className="mt-1">Click "New Shift Record" to enter meter readings and reconcile cash.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2a2d30]">
            {myRecords.slice(0, 5).map((rec) => (
              <div
                key={rec.id}
                onClick={() => onSelectRecord(rec)}
                className="py-2.5 flex items-center justify-between hover:bg-[#23262a]/50 px-2 rounded transition-colors cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#ece8e0]">
                    <span>{rec.date}</span>
                    <span className="text-[#8d9195] font-normal">
                      Group {rec.shiftGroup}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8d9195] mt-0.5">
                    Station: {rec.station} · Supervisor: {rec.supervisor}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                      rec.status === 'verified'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : rec.status === 'submitted'
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {rec.status.toUpperCase()}
                  </span>
                  <ChevronRight size={14} className="text-[#8d9195]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
