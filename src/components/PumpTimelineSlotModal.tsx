import React, { useState } from 'react';
import { X, Clock, Plus, Trash2, Fuel, Save, User } from 'lucide-react';
import { PumpTimeSlotAssignment, AttendantAccountabilityRecord } from '../types';
import { useUndoRedo } from '../utils/useUndoRedo';
import { UndoRedoControls } from './UndoRedoControls';

interface PumpTimelineSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendants: AttendantAccountabilityRecord[];
  onSaveAssignments: (updatedAttendants: AttendantAccountabilityRecord[]) => void;
}

interface TimelineRow {
  id: string;
  pumpName: string;
  fuelType: 'super' | 'diesel' | 'ron95';
  startTime: string;
  endTime: string;
  attendantName: string;
  openingMeter: number;
  closingMeter: number;
  rtt: number;
}

export const PumpTimelineSlotModal: React.FC<PumpTimelineSlotModalProps> = ({
  isOpen,
  onClose,
  attendants,
  onSaveAssignments,
}) => {
  const initialRows = React.useMemo(() => {
    const rows: TimelineRow[] = [];

    attendants.forEach((att) => {
      (att.meterReadings || []).forEach((mr) => {
        const timeParts = (mr.timeSlot || '06:00 – 14:00').split('–').map((s) => s.trim());
        rows.push({
          id: mr.id || Math.random().toString(36),
          pumpName: mr.pumpName,
          fuelType: mr.fuelType,
          startTime: timeParts[0] || '06:00',
          endTime: timeParts[1] || '14:00',
          attendantName: att.attendantName,
          openingMeter: mr.openingMeter,
          closingMeter: mr.closingMeter,
          rtt: mr.rtt,
        });
      });
    });

    if (rows.length === 0) {
      rows.push(
        {
          id: 't_1',
          pumpName: 'Super 1',
          fuelType: 'super',
          startTime: '06:00',
          endTime: '10:00',
          attendantName: 'BRIGHT',
          openingMeter: 100000.0,
          closingMeter: 100450.0,
          rtt: 0,
        },
        {
          id: 't_2',
          pumpName: 'Super 1',
          fuelType: 'super',
          startTime: '10:00',
          endTime: '14:00',
          attendantName: 'DAVID',
          openingMeter: 100450.0,
          closingMeter: 100900.0,
          rtt: 0,
        },
        {
          id: 't_3',
          pumpName: 'Super 1',
          fuelType: 'super',
          startTime: '14:00',
          endTime: '18:00',
          attendantName: 'SARAH',
          openingMeter: 100900.0,
          closingMeter: 101350.0,
          rtt: 0,
        }
      );
    }
    return rows;
  }, [attendants]);

  const {
    state: timelineRows,
    set: setTimelineRows,
    undo,
    redo,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
  } = useUndoRedo<TimelineRow[]>(initialRows, {
    debounceMs: 300,
    enableShortcuts: isOpen,
  });

  if (!isOpen) return null;

  const attendantNames = Array.from(
    new Set([
      ...attendants.map((a) => a.attendantName),
      'BRIGHT',
      'DAVID',
      'SARAH',
      'JOHNSON',
      'LINDA',
    ])
  );

  const addSlot = (pumpName: string = 'Super 1') => {
    const newSlot: TimelineRow = {
      id: 'slot_' + Date.now().toString(36),
      pumpName,
      fuelType: pumpName.toLowerCase().includes('diesel') ? 'diesel' : 'super',
      startTime: '06:00',
      endTime: '14:00',
      attendantName: attendantNames[0] || 'Attendant',
      openingMeter: 0,
      closingMeter: 0,
      rtt: 0,
    };
    setTimelineRows((prev) => [...prev, newSlot]);
  };

  const updateRow = (id: string, field: keyof TimelineRow, val: any) => {
    setTimelineRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    );
  };

  const removeRow = (id: string) => {
    setTimelineRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSave = () => {
    // Re-map timeline slots into attendant meter readings
    const updatedAttendants: AttendantAccountabilityRecord[] = structuredClone(attendants);

    // Group timeline rows by attendant
    const byAttendant: Record<string, TimelineRow[]> = {};
    timelineRows.forEach((row) => {
      if (!byAttendant[row.attendantName]) byAttendant[row.attendantName] = [];
      byAttendant[row.attendantName].push(row);
    });

    Object.entries(byAttendant).forEach(([attName, rows]) => {
      let targetAtt = updatedAttendants.find(
        (a) => a.attendantName.toUpperCase() === attName.toUpperCase()
      );

      if (!targetAtt) {
        targetAtt = {
          id: 'att_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4),
          attendantName: attName,
          staffId: 'EMP-' + Math.floor(100 + Math.random() * 900),
          shiftType: 'Shift A — Day',
          date: new Date().toISOString().slice(0, 10),
          station: 'Tema Main Station',
          assignedPumps: [],
          meterReadings: [],
          payments: { cash: 0, visa: 0, momo: 0, bank: 0, credit: 0, other: 0 },
          expenses: [],
          actualCashCounted: 0,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updatedAttendants.push(targetAtt);
      }

      targetAtt.assignedPumps = Array.from(new Set(rows.map((r) => r.pumpName)));
      targetAtt.meterReadings = rows.map((r) => {
        const netLitres = Math.max(0, r.closingMeter - r.openingMeter - r.rtt);
        const unitPrice = r.fuelType === 'diesel' ? 16.1 : 13.27;
        return {
          id: r.id,
          pumpName: r.pumpName,
          fuelType: r.fuelType,
          timeSlot: `${r.startTime} – ${r.endTime}`,
          openingMeter: r.openingMeter,
          closingMeter: r.closingMeter,
          rtt: r.rtt,
          unitPrice,
          litresSold: netLitres,
          totalSales: netLitres * unitPrice,
        };
      });
    });

    onSaveAssignments(updatedAttendants);
    onClose();
  };

  // Group timeline by pump
  const pumps = ['Super 1', 'Super 2', 'Super 3', 'Super 4', 'Diesel 1', 'Diesel 2', 'Diesel 3', 'Diesel 4'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="bg-[#1d2023] border border-[#333739] text-[#ece8e0] rounded-xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#15171a] border-b border-[#333739] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#23262a] border border-[#333739] flex items-center justify-center text-[#e8b93b]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#ece8e0] uppercase font-['Space_Grotesk']">
                Time-Based Pump Assignment System
              </h3>
              <p className="text-[11px] text-[#8d9195]">
                Assign multiple attendants to pumps during specific shift time slots
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <UndoRedoControls
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              undoCount={undoCount}
              redoCount={redoCount}
              variant="dark"
              size="sm"
              showLabels={false}
            />
            <button
              onClick={onClose}
              className="p-1 rounded text-[#8d9195] hover:text-[#ece8e0] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          <div className="p-3 rounded-lg bg-[#23262a] border border-[#333739] text-[11px] text-[#8d9195] leading-relaxed">
            💡 <b className="text-[#ece8e0]">Forecourt Rotation Principle:</b> When an attendant hands over a pump mid-shift (e.g. Pump 1 operated by Bright from 06:00–10:00, then David from 10:00–14:00, then Sarah from 14:00–18:00), the system tracks each attendant's opening and closing meters to calculate individual liters and cash accountability.
          </div>

          <div className="space-y-3">
            {timelineRows.map((row, idx) => {
              const netLitres = Math.max(0, row.closingMeter - row.openingMeter - row.rtt);

              return (
                <div
                  key={row.id || idx}
                  className="p-3 rounded-lg bg-[#15171a] border border-[#333739] flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                >
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <select
                      value={row.pumpName}
                      onChange={(e) => {
                        const val = e.target.value;
                        const fType = val.toLowerCase().includes('diesel') ? 'diesel' : 'super';
                        updateRow(row.id, 'pumpName', val);
                        updateRow(row.id, 'fuelType', fType);
                      }}
                      className="px-2 py-1.5 bg-[#23262a] border border-[#333739] rounded font-bold text-xs text-[#e8b93b]"
                    >
                      {pumps.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1 bg-[#23262a] px-2 py-1 rounded border border-[#333739]">
                      <Clock className="w-3.5 h-3.5 text-[#8d9195]" />
                      <input
                        type="time"
                        value={row.startTime}
                        onChange={(e) => updateRow(row.id, 'startTime', e.target.value)}
                        className="bg-transparent text-xs font-mono text-[#ece8e0] focus:outline-none"
                      />
                      <span className="text-[#8d9195]">–</span>
                      <input
                        type="time"
                        value={row.endTime}
                        onChange={(e) => updateRow(row.id, 'endTime', e.target.value)}
                        className="bg-transparent text-xs font-mono text-[#ece8e0] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1 bg-[#23262a] px-2 py-1 rounded border border-[#333739]">
                      <User className="w-3.5 h-3.5 text-[#8d9195]" />
                      <select
                        value={row.attendantName}
                        onChange={(e) => updateRow(row.id, 'attendantName', e.target.value)}
                        className="bg-transparent text-xs font-bold text-[#ece8e0] focus:outline-none"
                      >
                        {attendantNames.map((name) => (
                          <option key={name} value={name} className="bg-[#1d2023] text-[#ece8e0]">
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="text-right">
                        <span className="text-[9px] text-[#8d9195] block uppercase">Opening</span>
                        <input
                          type="number"
                          step="0.01"
                          value={row.openingMeter || ''}
                          onChange={(e) =>
                            updateRow(row.id, 'openingMeter', parseFloat(e.target.value) || 0)
                          }
                          className="w-24 px-1.5 py-1 bg-[#23262a] border border-[#333739] rounded font-mono text-right text-xs text-[#ece8e0]"
                        />
                      </div>

                      <div className="text-right">
                        <span className="text-[9px] text-[#8d9195] block uppercase">Closing</span>
                        <input
                          type="number"
                          step="0.01"
                          value={row.closingMeter || ''}
                          onChange={(e) =>
                            updateRow(row.id, 'closingMeter', parseFloat(e.target.value) || 0)
                          }
                          className="w-24 px-1.5 py-1 bg-[#23262a] border border-[#333739] rounded font-mono text-right text-xs text-[#ece8e0]"
                        />
                      </div>
                    </div>

                    <div className="text-right min-w-[70px]">
                      <span className="text-[9px] text-[#8d9195] block uppercase">Dispensed</span>
                      <span className="font-mono font-bold text-xs text-emerald-400">
                        {netLitres.toFixed(2)} L
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="p-1.5 text-[#8d9195] hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => addSlot('Super 1')}
              className="px-3 py-2 rounded-lg bg-[#23262a] hover:bg-[#333739] text-[#ece8e0] text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-[#333739]"
            >
              <Plus className="w-3.5 h-3.5 text-[#e8b93b]" />
              <span>Add Rotation Slot</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#15171a] border-t border-[#333739] flex items-center justify-between">
          <span className="text-xs text-[#8d9195]">
            Total Time Slots: <b className="text-[#ece8e0]">{timelineRows.length}</b>
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-[#23262a] text-[#ece8e0] hover:bg-[#333739] text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-[#e8b93b] hover:bg-[#e8b93b]/90 text-[#15171a] text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Apply Pump Rotation to Attendants</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
