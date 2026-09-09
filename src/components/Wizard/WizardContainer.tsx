import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, Save, Check, CloudCheck, Sparkles, RefreshCw } from 'lucide-react';
import { ShiftRecord, StationConfig, UserProfile } from '../../types';
import { Step1ShiftInfo } from './Step1ShiftInfo';
import { Step2OpeningMeters } from './Step2OpeningMeters';
import { Step3ClosingMeters } from './Step3ClosingMeters';
import { Step4SalesAnalysis } from './Step4SalesAnalysis';
import { Step5TankStocks } from './Step5TankStocks';
import { Step5AccountDrawings } from './Step5AccountDrawings';
import { Step6CashAnalysis } from './Step6CashAnalysis';
import { Step7Reconciliation } from './Step7Reconciliation';
import { saveRecord, saveProfile } from '../../services/storage';
import { useUndoRedo } from '../../utils/useUndoRedo';
import { UndoRedoControls } from '../UndoRedoControls';

interface WizardContainerProps {
  initialRecord: ShiftRecord;
  stations: StationConfig[];
  profile: UserProfile;
  onExit: () => void;
  onSubmitted: (record: ShiftRecord) => void;
}

const STEP_NAMES = [
  'Shift Info',
  'Opening',
  'Closing',
  'Sales',
  'Tank Stocks',
  'Drawings',
  'Cash',
  'Reconcile',
];

export const WizardContainer: React.FC<WizardContainerProps> = ({
  initialRecord,
  stations,
  profile,
  onExit,
  onSubmitted,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(initialRecord._step || 1);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<Date>(new Date());
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const currentStepRef = useRef(currentStep);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 2200);
  };

  const {
    state: record,
    set: setRecordWithUndo,
    undo,
    redo,
    canUndo,
    canRedo,
    undoCount,
    redoCount,
  } = useUndoRedo<ShiftRecord>(initialRecord, {
    debounceMs: 300,
    enableShortcuts: true,
    onUndo: (prev) => {
      showToast('↩ Undone last change');
      const draftCopy: ShiftRecord = {
        ...prev,
        status: prev.status === 'submitted' ? 'submitted' : 'draft',
        _step: currentStepRef.current,
      };
      saveRecord(draftCopy);
    },
    onRedo: (next) => {
      showToast('↪ Redone change');
      const draftCopy: ShiftRecord = {
        ...next,
        status: next.status === 'submitted' ? 'submitted' : 'draft',
        _step: currentStepRef.current,
      };
      saveRecord(draftCopy);
    },
  });

  const recordRef = useRef(record);

  useEffect(() => {
    recordRef.current = record;
  }, [record]);

  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // Window unload / visibilitychange auto-save safety net
  useEffect(() => {
    const handleFlushSave = () => {
      if (recordRef.current) {
        const draftCopy: ShiftRecord = {
          ...recordRef.current,
          status: recordRef.current.status === 'submitted' ? 'submitted' : 'draft',
          _step: currentStepRef.current,
        };
        saveRecord(draftCopy);
      }
    };

    window.addEventListener('beforeunload', handleFlushSave);
    window.addEventListener('pagehide', handleFlushSave);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleFlushSave();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleFlushSave);
      window.removeEventListener('pagehide', handleFlushSave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Immediate auto-save on every field modification
  const handleRecordChange = (updated: ShiftRecord, immediateHistory = false) => {
    setRecordWithUndo(updated, { immediate: immediateHistory });
    setIsSaving(true);

    const draftCopy: ShiftRecord = {
      ...updated,
      status: updated.status === 'submitted' ? 'submitted' : 'draft',
      _step: currentStep,
    };
    saveRecord(draftCopy);
    setLastSavedTime(new Date());

    // Briefly show save indicator
    setTimeout(() => {
      setIsSaving(false);
    }, 300);
  };

  const handleStepJump = (stepNumber: number) => {
    setCurrentStep(stepNumber);
    const draftCopy: ShiftRecord = {
      ...record,
      status: record.status === 'submitted' ? 'submitted' : 'draft',
      _step: stepNumber,
    };
    saveRecord(draftCopy);
    setLastSavedTime(new Date());
  };

  const handleExitToDashboard = () => {
    // Ensure draft is saved to localStorage before exiting
    const draft: ShiftRecord = {
      ...record,
      status: record.status === 'submitted' ? 'submitted' : 'draft',
      _step: currentStep,
    };
    saveRecord(draft);
    onExit();
  };

  const handleManualSaveDraft = () => {
    const draft: ShiftRecord = {
      ...record,
      status: 'draft',
      _step: currentStep,
    };
    const success = saveRecord(draft);
    if (success) {
      if (record.attendant || record.station) {
        saveProfile({
          ...profile,
          attendant: record.attendant || profile.attendant,
          station: record.station || profile.station,
          supervisor: record.supervisor || profile.supervisor,
        });
      }
      setLastSavedTime(new Date());
      showToast('Draft saved to storage!');
    } else {
      showToast('Error saving draft');
    }
  };

  const handleNext = () => {
    if (currentStep < 8) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      const draft: ShiftRecord = {
        ...record,
        status: record.status === 'submitted' ? 'submitted' : 'draft',
        _step: nextStep,
      };
      saveRecord(draft);
      setLastSavedTime(new Date());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Final Submit
      const submittedRecord: ShiftRecord = {
        ...record,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        _step: 8,
      };
      const success = saveRecord(submittedRecord);
      if (success) {
        if (record.attendant || record.station) {
          saveProfile({
            ...profile,
            attendant: record.attendant || profile.attendant,
            station: record.station || profile.station,
            supervisor: record.supervisor || profile.supervisor,
          });
        }
        onSubmitted(submittedRecord);
      } else {
        showToast('Failed to save submitted record.');
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      const draft: ShiftRecord = {
        ...record,
        status: record.status === 'submitted' ? 'submitted' : 'draft',
        _step: prevStep,
      };
      saveRecord(draft);
      setLastSavedTime(new Date());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleApplyStationConfig = (stationName: string) => {
    const matched = stations.find(
      (s) => s.name.trim().toLowerCase() === stationName.trim().toLowerCase()
    );
    if (!matched) return;

    // Update fuel dispenser configurations according to station config
    const updatedFuels = { ...record.fuels };
    const carriesRon = matched.hasRon95 !== false && (matched.pumps?.ron95 || 0) > 0;

    Object.keys(matched.pumps).forEach((fuelId) => {
      let pumpCount = matched.pumps[fuelId] !== undefined ? matched.pumps[fuelId] : 2;
      if (fuelId === 'ron95' && !carriesRon) {
        pumpCount = 0;
      }
      const price = matched.prices[fuelId] || record.fuels[fuelId]?.price || 12.50;
      const currentPumps = updatedFuels[fuelId]?.pumps || [];

      let newPumps = [...currentPumps];
      if (pumpCount === 0) {
        newPumps = [];
      } else if (newPumps.length === 0 && pumpCount > 0) {
        for (let i = 0; i < pumpCount; i++) {
          newPumps.push({
            id: `p_${fuelId}_${i + 1}_${Date.now()}`,
            name: `Pump ${i + 1}`,
            opening: 0,
            closing: 0,
            rtt: 0,
          });
        }
      } else if (newPumps.length < pumpCount) {
        // add extra pumps
        for (let i = newPumps.length; i < pumpCount; i++) {
          newPumps.push({
            id: `p_${fuelId}_${i + 1}_${Date.now()}`,
            name: `Pump ${i + 1}`,
            opening: 0,
            closing: 0,
            rtt: 0,
          });
        }
      } else if (newPumps.length > pumpCount && pumpCount > 0) {
        newPumps = newPumps.slice(0, pumpCount);
      }

      updatedFuels[fuelId] = {
        price,
        pumps: newPumps,
      };
    });

    handleRecordChange({
      ...record,
      station: matched.name,
      fuels: updatedFuels,
    });
    showToast(`Applied dispenser setup for ${matched.name}`);
  };

  const matchedStation = stations.find(
    (s) => s.name.trim().toLowerCase() === record.station.trim().toLowerCase()
  );

  return (
    <div className="min-h-screen bg-stone-100 pb-28">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2 animate-fade-in border border-stone-700">
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          {toastMsg}
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-2.5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExitToDashboard}
                className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-stone-900 py-1.5 px-2.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              {/* Undo and Redo Controls */}
              <UndoRedoControls
                canUndo={canUndo}
                canRedo={canRedo}
                onUndo={undo}
                onRedo={redo}
                undoCount={undoCount}
                redoCount={redoCount}
                variant="light"
                size="sm"
                showLabels={false}
              />
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-xs font-extrabold text-stone-900">
                  {record.revisionOf ? 'Revised Record' : 'Daily Sales Record'}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded-full">
                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                  Auto-saved
                </span>
              </div>
              <span className="text-[11px] text-stone-400 block font-mono">
                Step {currentStep} of 8: {STEP_NAMES[currentStep - 1]}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleManualSaveDraft}
                className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer"
                title="Save Draft"
              >
                <Save className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save Draft</span>
              </button>
            </div>
          </div>

          {/* Stepper Dots & Bar */}
          <div className="flex items-center gap-1.5">
            {STEP_NAMES.map((name, idx) => {
              const stepNumber = idx + 1;
              const isCompleted = stepNumber < currentStep;
              const isCurrent = stepNumber === currentStep;

              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleStepJump(stepNumber)}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                    isCurrent
                      ? 'bg-emerald-600'
                      : isCompleted
                      ? 'bg-emerald-300'
                      : 'bg-stone-200'
                  }`}
                  title={`Step ${stepNumber}: ${name}`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Step Content */}
      <main className="max-w-2xl mx-auto px-4 pt-4">
        {currentStep === 1 && (
          <Step1ShiftInfo
            record={record}
            onChange={handleRecordChange}
            stations={stations}
            onApplyStationConfig={handleApplyStationConfig}
          />
        )}
        {currentStep === 2 && (
          <Step2OpeningMeters record={record} onChange={handleRecordChange} />
        )}
        {currentStep === 3 && (
          <Step3ClosingMeters record={record} onChange={handleRecordChange} />
        )}
        {currentStep === 4 && (
          <Step4SalesAnalysis record={record} onChange={handleRecordChange} />
        )}
        {currentStep === 5 && (
          <Step5TankStocks record={record} onChange={handleRecordChange} />
        )}
        {currentStep === 6 && (
          <Step5AccountDrawings
            record={record}
            onChange={handleRecordChange}
            stationConfig={matchedStation}
          />
        )}
        {currentStep === 7 && (
          <Step6CashAnalysis record={record} onChange={handleRecordChange} />
        )}
        {currentStep === 8 && (
          <Step7Reconciliation record={record} onChange={handleRecordChange} />
        )}
      </main>

      {/* Sticky Bottom Action Bar */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200 p-3 shadow-lg mt-8">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="flex-1 py-3 px-4 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExitToDashboard}
              className="flex-1 py-3 px-4 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Exit to Dashboard
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            className={`flex-1 py-3 px-4 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer ${
              currentStep === 8
                ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-500/30'
                : 'bg-stone-900 hover:bg-black'
            }`}
          >
            <span>{currentStep === 8 ? 'Submit & Finalize Shift' : 'Next Step'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
