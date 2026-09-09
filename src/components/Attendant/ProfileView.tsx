import React, { useState } from 'react';
import {
  User,
  ShieldCheck,
  Building,
  Phone,
  Mail,
  Award,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Briefcase,
  IdCard,
  MapPin,
  Sparkles,
  Users,
  ArrowRightLeft,
  KeyRound,
  UserCheck,
} from 'lucide-react';
import { UserProfile, StationConfig, AuthUser } from '../../types';
import { getCurrentUser } from '../../services/auth';

interface ProfileViewProps {
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onSwitchRole?: (role: 'attendant' | 'supervisor') => void;
  onAttendantSwitched?: (newUser: AuthUser) => void;
  stations?: StationConfig[];
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onSaveProfile,
  onSwitchRole,
  onAttendantSwitched,
  stations = [],
}) => {
  const currentUser = getCurrentUser();
  const [formData, setFormData] = useState<UserProfile>(() => ({
    ...profile,
    attendant: profile.attendant || currentUser?.fullName || 'Daniel Mensah',
    supervisor: profile.supervisor || currentUser?.supervisor || 'Kofi Asare',
    staffId: profile.staffId || currentUser?.staffId || 'SO-ATT-2026',
    phone: profile.phone || (currentUser?.authType === 'phone' ? currentUser.identifier : '024 123 4567'),
    email: profile.email || (currentUser?.authType === 'email' ? currentUser.identifier : 'attendant@staroil.com.gh'),
    station: profile.station || currentUser?.station || 'Tema Main Station (Harbour Rd)',
    stationCode: profile.stationCode || currentUser?.stationCode || 'SO-TMA-001',
    role: profile.role || currentUser?.role || 'attendant',
  }));

  const [savedSuccess, setSavedSuccess] = useState(false);

  const isSupervisor = formData.role === 'supervisor' || formData.role === 'station_manager';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const displayName = isSupervisor
    ? (formData.supervisor || formData.attendant || 'StarOil Supervisor')
    : (formData.attendant || 'StarOil Attendant');

  const initials = displayName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SO';

  return (
    <div className="space-y-5 pb-16 max-w-3xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
              isSupervisor ? 'bg-amber-500/20 text-amber-800 border border-amber-400/40' : 'bg-emerald-500/20 text-emerald-800 border border-emerald-400/40'
            }`}>
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              {isSupervisor ? 'Supervisor Account' : 'Attendant Profile'}
            </span>
            {formData.stationCode && (
              <span className="text-xs font-mono text-stone-500 font-bold">
                {formData.stationCode}
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-stone-900 tracking-tight mt-1 flex items-center gap-2">
            <User className="w-6 h-6 text-amber-600" />
            <span>Personal Information & Profile</span>
          </h1>
          <p className="text-xs text-stone-600">
            View and manage your official staff ID credentials, assigned station branch, contact details, and forecourt identity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSupervisor && onSwitchRole && (
            <button
              type="button"
              onClick={() => onSwitchRole('attendant')}
              className="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto bg-stone-900 text-white hover:bg-stone-800 border-stone-700"
            >
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>Switch to Attendant Mode</span>
            </button>
          )}
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold flex items-center gap-2.5 shadow-xs">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>Your personal information has been saved successfully and synced across StarOil records.</span>
        </div>
      )}

      {/* Official Identity Badge Card */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-white rounded-3xl p-6 shadow-xl border border-stone-800 relative overflow-hidden">
        {/* Glow & Watermark */}
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 right-4 text-[70px] font-black text-stone-800/30 select-none pointer-events-none leading-none">
          STAROIL
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar Initials */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-300 text-stone-950 font-black text-3xl flex items-center justify-center shadow-lg border-2 border-amber-300/40 shrink-0">
            {initials}
          </div>

          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                {displayName}
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider border ${
                isSupervisor
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {isSupervisor ? 'STATION SUPERVISOR' : 'FORECOURT ATTENDANT'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-stone-800 text-stone-300 border border-stone-700">
                VERIFIED OPERATOR
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-xs text-stone-300">
              <div className="flex items-center gap-2">
                <IdCard className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Staff ID: <strong className="font-mono text-white">{formData.staffId || 'SO-ATT-2026'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Station: <strong className="text-white">{formData.station || 'Tema Main Station'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Phone: <strong className="text-stone-200">{formData.phone || '024 123 4567'}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">Email: <strong className="text-stone-200">{formData.email || 'attendant@staroil.com.gh'}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editable Personal Information Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-5">
        <div className="pb-3 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-stone-800 flex items-center gap-2">
              <User className="w-4 h-4 text-amber-600" />
              Personal Profile Details
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Edit your personal details below to update records and shift receipts.
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-stone-100 text-stone-600 rounded-lg border border-stone-200">
            Auto-Sync
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              value={isSupervisor ? (formData.supervisor || formData.attendant) : formData.attendant}
              onChange={(e) => {
                const val = e.target.value;
                if (isSupervisor) {
                  setFormData({ ...formData, supervisor: val, attendant: val });
                } else {
                  setFormData({ ...formData, attendant: val });
                }
              }}
              placeholder="e.g. Daniel Mensah"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">
              Staff ID / Employee Code
            </label>
            <input
              type="text"
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-semibold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              value={formData.staffId || ''}
              onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
              placeholder="SO-ATT-001"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">
              Primary Phone Number
            </label>
            <input
              type="tel"
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="024 123 4567"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="attendant@staroil.com.gh"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">
              Assigned Station Branch
            </label>
            <input
              type="text"
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              value={formData.station}
              onChange={(e) => setFormData({ ...formData, station: e.target.value })}
              placeholder="Tema Main Station (Harbour Rd)"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-stone-700 mb-1">
              Station Supervisor In-Charge
            </label>
            <input
              type="text"
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-900 focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              value={formData.supervisor}
              onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
              placeholder="Kofi Asare"
              required
            />
          </div>
        </div>

        <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
          <span className="text-[11px] text-stone-500">
            Changes apply to your forecourt daily reports and shift sign-offs.
          </span>
          <button
            type="submit"
            className="py-2.5 px-5 rounded-2xl bg-stone-900 hover:bg-black text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Save size={15} />
            <span>Save Personal Info</span>
          </button>
        </div>
      </form>

      {/* Emergency & Forecourt Support Helpline */}
      <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-xs space-y-2.5">
        <h4 className="font-extrabold text-stone-800 uppercase text-[11px] flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-amber-600" />
          Emergency Station Contacts & Forecourt Support
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs">
            <span className="text-[10px] text-stone-500 block font-semibold">Station Supervisor</span>
            <strong className="text-emerald-700 font-mono text-sm block mt-0.5">054 889 2011</strong>
            <span className="text-[9.5px] text-stone-400">Direct Shift Support</span>
          </div>
          <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs">
            <span className="text-[10px] text-stone-500 block font-semibold">Ghana National Fire Service</span>
            <strong className="text-rose-700 font-mono text-sm block mt-0.5">192 / 112</strong>
            <span className="text-[9.5px] text-stone-400">Emergency Response</span>
          </div>
          <div className="p-3 rounded-xl bg-white border border-stone-200 shadow-2xs">
            <span className="text-[10px] text-stone-500 block font-semibold">Ghana Police Service</span>
            <strong className="text-blue-700 font-mono text-sm block mt-0.5">191 / 18555</strong>
            <span className="text-[9.5px] text-stone-400">Security & Forecourt Safety</span>
          </div>
        </div>
      </div>
    </div>
  );
};

