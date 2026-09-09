import React, { useState } from 'react';
import { MapPin, Navigation, Calendar, User, Users, Clock, ShieldCheck, CheckCircle2, AlertCircle, Fuel, Check } from 'lucide-react';
import { ShiftRecord, StationConfig } from '../../types';
import { haversineKm, pumpsFor } from '../../utils/calculations';

interface Step1ShiftInfoProps {
  record: ShiftRecord;
  onChange: (updated: ShiftRecord) => void;
  stations: StationConfig[];
  onApplyStationConfig?: (stationName: string) => void;
}

export const Step1ShiftInfo: React.FC<Step1ShiftInfoProps> = ({
  record,
  onChange,
  stations,
  onApplyStationConfig,
}) => {
  const [detecting, setDetecting] = useState(false);
  const [detectMessage, setDetectMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const matchedStation = stations.find(
    (s) => s.name.trim().toLowerCase() === record.station.trim().toLowerCase()
  );

  const ron95PumpCount = record.fuels.ron95?.pumps?.length || 0;
  const isRon95Active = ron95PumpCount > 0;

  const handleToggleRon95 = (active: boolean) => {
    const updatedFuels = { ...record.fuels };
    const updatedStocks = { ...(record.stocks || {}) };

    if (active) {
      const defaultPumps = matchedStation?.pumps?.ron95 && matchedStation.pumps.ron95 > 0
        ? matchedStation.pumps.ron95
        : 2;
      const defaultPrice = matchedStation?.prices?.ron95 || 14.10;

      updatedFuels.ron95 = {
        price: updatedFuels.ron95?.price || defaultPrice,
        pumps: updatedFuels.ron95?.pumps?.length ? updatedFuels.ron95.pumps : pumpsFor(defaultPumps),
      };
      if (!updatedStocks.ron95) {
        updatedStocks.ron95 = {
          openingStock: 0,
          stockReceived: 0,
          physicalClosing: 0,
          notes: '',
        };
      }
    } else {
      updatedFuels.ron95 = {
        price: updatedFuels.ron95?.price || 14.10,
        pumps: [],
      };
    }

    onChange({
      ...record,
      fuels: updatedFuels,
      stocks: updatedStocks,
    });
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setDetectMessage({
        text: 'Geolocation is not supported by your browser.',
        type: 'error',
      });
      return;
    }

    setDetecting(true);
    setDetectMessage({ text: 'Acquiring GPS location...', type: 'info' });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetecting(false);
        const { latitude, longitude } = pos.coords;

        // Find closest station with coords
        let nearest: StationConfig | null = null;
        let minDistance = Infinity;

        stations.forEach((s) => {
          if (s.lat != null && s.lng != null) {
            const dist = haversineKm(latitude, longitude, s.lat, s.lng);
            if (dist < minDistance) {
              minDistance = dist;
              nearest = s;
            }
          }
        });

        if (nearest && minDistance <= 3.0) {
          const distStr = minDistance < 0.1 ? `${Math.round(minDistance * 1000)}m` : `${minDistance.toFixed(1)}km`;
          onChange({
            ...record,
            station: (nearest as StationConfig).name,
          });
          setDetectMessage({
            text: `Detected ${(nearest as StationConfig).name} (${distStr} away)`,
            type: 'success',
          });
          if (onApplyStationConfig) {
            onApplyStationConfig((nearest as StationConfig).name);
          }
        } else {
          setDetectMessage({
            text: `Location acquired (${latitude.toFixed(4)}, ${longitude.toFixed(4)}). No registered station within 3km. Please pick from list.`,
            type: 'info',
          });
        }
      },
      (err) => {
        setDetecting(false);
        setDetectMessage({
          text: `GPS detection failed: ${err.message}. Please select station manually.`,
          type: 'error',
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-stone-900 tracking-tight">Shift Information</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Enter shift details, station branch, and attendant in charge.
        </p>
      </div>

      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200 shadow-xs space-y-4">
        {/* Date Field */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            Date of Shift
          </label>
          <input
            type="date"
            value={record.date}
            onChange={(e) => onChange({ ...record, date: e.target.value })}
            className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-mono"
            required
          />
        </div>

        {/* Attendant & Supervisor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-stone-400" />
              Attendant in Charge
            </label>
            <input
              type="text"
              placeholder="e.g. Daniel Mensah"
              value={record.attendant}
              onChange={(e) => onChange({ ...record, attendant: e.target.value })}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
              Supervisor (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Kofi Asare"
              value={record.supervisor}
              onChange={(e) => onChange({ ...record, supervisor: e.target.value })}
              className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Station Selection + GPS Location Finder */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              Station Branch
            </span>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={detecting}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer disabled:opacity-50"
            >
              <Navigation className={`w-3 h-3 ${detecting ? 'animate-spin' : ''}`} />
              {detecting ? 'Detecting GPS...' : 'Auto-detect GPS'}
            </button>
          </label>

          <div className="flex gap-2">
            <input
              type="text"
              list="stations-datalist"
              placeholder="Select or enter station branch"
              value={record.station}
              onChange={(e) => {
                const val = e.target.value;
                onChange({ ...record, station: val });
                if (onApplyStationConfig && stations.some(s => s.name === val)) {
                  onApplyStationConfig(val);
                }
              }}
              className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
            <datalist id="stations-datalist">
              {stations.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.stationCode ? `[${s.stationCode}] ` : ''}{s.name}
                </option>
              ))}
            </datalist>
          </div>

          {detectMessage && (
            <div
              className={`mt-2 text-xs p-2.5 rounded-lg flex items-start gap-1.5 ${
                detectMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : detectMessage.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {detectMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{detectMessage.text}</span>
            </div>
          )}

          {matchedStation && (
            <div className="mt-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {matchedStation.stationCode && (
                  <span className="font-mono text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                    {matchedStation.stationCode}
                  </span>
                )}
                <span className="font-semibold text-emerald-800">Branch Setup:</span>{' '}
                <span className="text-emerald-700 font-medium">
                  {matchedStation.pumps.pms || 2} PMS · {matchedStation.pumps.ago || 2} AGO ·{' '}
                  {(matchedStation.hasRon95 ?? ((matchedStation.pumps?.ron95 || 0) > 0)) && (matchedStation.pumps?.ron95 || 0) > 0
                    ? `${matchedStation.pumps.ron95} RON95`
                    : 'No RON 95'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onApplyStationConfig && onApplyStationConfig(matchedStation.name)}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline"
              >
                Sync Dispenser Setup
              </button>
            </div>
          )}

          {/* Active Fuel Products for this Shift */}
          <div className="mt-3 bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Fuel className="w-4 h-4 text-emerald-600" />
                Shift Fuel Availability
              </span>
              <span className="text-[10px] text-stone-500 font-medium">
                Customize products active for this shift
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-white border border-emerald-200 rounded-lg p-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <span className="font-bold text-stone-800 block text-[11px]">PMS (Super Petrol)</span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      {record.fuels.pms?.pumps?.length || 0} active nozzles
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  Standard
                </span>
              </div>

              <div className="bg-white border border-amber-200 rounded-lg p-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <div>
                    <span className="font-bold text-stone-800 block text-[11px]">AGO (Diesel Fuel)</span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      {record.fuels.ago?.pumps?.length || 0} active nozzles
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                  Standard
                </span>
              </div>

              <div className={`bg-white border rounded-lg p-2 flex items-center justify-between transition-all ${
                isRon95Active ? 'border-blue-200' : 'border-stone-200 bg-stone-100/50'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${isRon95Active ? 'bg-blue-500' : 'bg-stone-300'}`} />
                  <div>
                    <span className={`font-bold block text-[11px] ${isRon95Active ? 'text-stone-800' : 'text-stone-500'}`}>
                      RON 95 (V-Power)
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      {isRon95Active ? `${ron95PumpCount} nozzles` : 'Not carried'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleToggleRon95(!isRon95Active)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      isRon95Active
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                    }`}
                  >
                    {isRon95Active ? 'Carried' : '+ Enable'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Shift Group & Period */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-stone-400" />
              Shift Group
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['A', 'B'] as const).map((grp) => (
                <button
                  key={grp}
                  type="button"
                  onClick={() => onChange({ ...record, shiftGroup: grp })}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                    record.shiftGroup === grp
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  Group {grp}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              Shift Period
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['Day', 'Night'] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => onChange({ ...record, shiftPeriod: period })}
                  className={`py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                    record.shiftPeriod === period
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                  }`}
                >
                  {period === 'Day' ? '☀️ Day' : '🌙 Night'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Optional Notes */}
        <div>
          <label className="block text-xs font-semibold text-stone-600 mb-1.5">
            Shift Remarks / Incident Notes (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Pump 2 meter reset at 14:00; power outage handled by generator"
            value={record.notes || ''}
            onChange={(e) => onChange({ ...record, notes: e.target.value })}
            className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2 text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );
};
