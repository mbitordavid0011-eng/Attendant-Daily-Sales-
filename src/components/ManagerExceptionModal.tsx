import React, { useState } from 'react';
import { X, ShieldAlert, KeyRound, CheckCircle2, UserCheck } from 'lucide-react';

interface ManagerExceptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorize: (managerName: string, notes: string) => void;
  unresolvedCount: number;
  totalShortage: number;
  shiftDate: string;
  shiftType: string;
}

export const ManagerExceptionModal: React.FC<ManagerExceptionModalProps> = ({
  isOpen,
  onClose,
  onAuthorize,
  unresolvedCount,
  totalShortage,
  shiftDate,
  shiftType,
}) => {
  const [managerName, setManagerName] = useState('Station Manager');
  const [pin, setPin] = useState('');
  const [notes, setNotes] = useState('Authorized shift closure pending attendant shortage investigation.');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!managerName.trim()) {
      setError('Manager name is required.');
      return;
    }
    if (!pin.trim() || pin.length < 4) {
      setError('Enter a valid 4-digit Manager PIN (e.g. 1234, 9999).');
      return;
    }
    setError('');
    onAuthorize(managerName.trim(), notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3">
      <div className="bg-[#1d2023] border border-[#333739] text-[#ece8e0] rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-4 bg-[#15171a] border-b border-[#333739] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-800 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#ece8e0] uppercase font-['Space_Grotesk']">
                Manager Authorization Exception
              </h3>
              <p className="text-[11px] text-[#8d9195]">
                Override end-of-shift closure block
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-[#8d9195] hover:text-[#ece8e0] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 text-xs">
          <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/50 space-y-1 text-rose-200">
            <div className="flex items-center gap-2 font-bold text-rose-300">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Unresolved Attendant Discrepancies</span>
            </div>
            <p className="text-[11px] text-[#8d9195]">
              {unresolvedCount} attendant(s) have un-reconciled accounts with a net discrepancy of{' '}
              <b className="text-rose-400 font-mono">
                {totalShortage < 0 ? `-GH₵ ${Math.abs(totalShortage).toFixed(2)}` : `GH₵ ${totalShortage.toFixed(2)}`}
              </b>
              . Standard policy requires all accounts to be balanced before closing.
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#8d9195] uppercase block mb-1">
              Authorizing Manager
            </label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="e.g. Station Manager / Operations Officer"
              className="w-full px-3 py-2 bg-[#23262a] border border-[#333739] rounded text-xs text-[#ece8e0] focus:outline-1 focus:outline-[#e8b93b]"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#8d9195] uppercase block mb-1">
              Manager Authorization PIN
            </label>
            <div className="relative">
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full px-3 py-2 bg-[#23262a] border border-[#333739] rounded text-sm font-mono text-center tracking-widest text-[#e8b93b] focus:outline-1 focus:outline-[#e8b93b]"
              />
              <KeyRound className="w-4 h-4 text-[#8d9195] absolute right-3 top-2.5" />
            </div>
            <span className="text-[10px] text-[#8d9195] block mt-1">
              Default demo code: 1234 or any 4-digit code
            </span>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[#8d9195] uppercase block mb-1">
              Exception Investigation Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="State why this shift is authorized to close with outstanding balance..."
              className="w-full p-2 bg-[#23262a] border border-[#333739] rounded text-xs text-[#ece8e0] focus:outline-1 focus:outline-[#e8b93b]"
            />
          </div>

          {error && (
            <div className="p-2 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px]">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#333739]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg bg-[#23262a] text-[#ece8e0] hover:bg-[#333739] text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Authorize & Close Shift</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
