import React from 'react';
import { Calendar, User, Building2, Clock, MapPin, Hash, Shield } from 'lucide-react';
import { SupervisorSalesAccountRecord } from '../../types';

interface SupervisorShiftInfoSectionProps {
  form: SupervisorSalesAccountRecord;
  onUpdateForm: (updated: Partial<SupervisorSalesAccountRecord>) => void;
  supervisorName: string;
  stationName: string;
  stationCode: string;
  disabled?: boolean;
}

export const SupervisorShiftInfoSection: React.FC<SupervisorShiftInfoSectionProps> = ({
  form,
  onUpdateForm,
  supervisorName,
  stationName,
  stationCode,
  disabled = false,
}) => {
  return (
    <div className="bg-[#191c1f] rounded-2xl border border-[#333739] p-4 sm:p-5 space-y-4">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#333739] pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-[#e8b93b]/15 text-[#e8b93b] flex items-center justify-center font-mono font-bold text-xs border border-[#e8b93b]/30">
            1
          </span>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#ece8e0] uppercase tracking-wide flex items-center gap-2 font-['Space_Grotesk']">
              <Calendar className="w-4 h-4 text-[#e8b93b]" />
              1. Shift Information
            </h3>
            <p className="text-xs text-[#8d9195]">
              Station identity, date, and supervisor shift details for this station closing account.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            form.accountState === 'closed'
              ? 'bg-stone-800 text-stone-300 border border-stone-700'
              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
          }`}>
            {form.accountState === 'closed' ? '🔒 Account Closed' : '🟢 Open Shift'}
          </span>
        </div>
      </div>

      {/* FORM FIELDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
        {/* Date */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#8d9195] uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={13} className="text-[#e8b93b]" />
            Date
          </label>
          <input
            type="date"
            disabled={disabled}
            value={form.date || new Date().toISOString().slice(0, 10)}
            onChange={(e) => onUpdateForm({ date: e.target.value })}
            className="w-full bg-[#15171a] border border-[#333739] focus:border-[#e8b93b] rounded-xl px-3 py-2 text-xs text-[#ece8e0] font-mono outline-hidden disabled:opacity-60"
          />
        </div>

        {/* Supervisor Name */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#8d9195] uppercase tracking-wider flex items-center gap-1.5">
            <User size={13} className="text-[#e8b93b]" />
            Supervisor Name
          </label>
          <input
            type="text"
            disabled={disabled}
            value={form.supervisorName || supervisorName}
            onChange={(e) => onUpdateForm({ supervisorName: e.target.value })}
            placeholder="Supervisor Full Name"
            className="w-full bg-[#15171a] border border-[#333739] focus:border-[#e8b93b] rounded-xl px-3 py-2 text-xs text-[#ece8e0] font-semibold outline-hidden disabled:opacity-60"
          />
        </div>

        {/* Station Code */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#8d9195] uppercase tracking-wider flex items-center gap-1.5">
            <Hash size={13} className="text-[#e8b93b]" />
            Station Code
          </label>
          <input
            type="text"
            disabled={disabled}
            value={form.stationCode || stationCode}
            onChange={(e) => onUpdateForm({ stationCode: e.target.value })}
            placeholder="e.g. SO-TMA-001"
            className="w-full bg-[#15171a] border border-[#333739] focus:border-[#e8b93b] rounded-xl px-3 py-2 text-xs text-[#ece8e0] font-mono font-bold outline-hidden disabled:opacity-60"
          />
        </div>

        {/* Station Name */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#8d9195] uppercase tracking-wider flex items-center gap-1.5">
            <Building2 size={13} className="text-[#e8b93b]" />
            Station Name
          </label>
          <input
            type="text"
            disabled={disabled}
            value={form.station || stationName}
            onChange={(e) => onUpdateForm({ station: e.target.value })}
            placeholder="e.g. Tema Main Station"
            className="w-full bg-[#15171a] border border-[#333739] focus:border-[#e8b93b] rounded-xl px-3 py-2 text-xs text-[#ece8e0] font-semibold outline-hidden disabled:opacity-60"
          />
        </div>

        {/* Shift Selection */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-[#8d9195] uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={13} className="text-[#e8b93b]" />
            Shift
          </label>
          <select
            disabled={disabled}
            value={form.shiftType || 'Shift A — Day (06:00 – 18:00)'}
            onChange={(e) => onUpdateForm({ shiftType: e.target.value })}
            className="w-full bg-[#15171a] border border-[#333739] focus:border-[#e8b93b] rounded-xl px-3 py-2 text-xs text-[#ece8e0] font-medium outline-hidden disabled:opacity-60 cursor-pointer"
          >
            <option value="Shift A — Day (06:00 – 18:00)">Shift A — Day (06:00 – 18:00)</option>
            <option value="Shift B — Night (18:00 – 06:00)">Shift B — Night (18:00 – 06:00)</option>
            <option value="24-Hour Continuous Shift">24-Hour Continuous Shift</option>
            <option value="Custom Supervisor Shift">Custom Supervisor Shift</option>
          </select>
        </div>
      </div>
    </div>
  );
};
