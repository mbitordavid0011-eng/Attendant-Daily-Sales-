import React, { useState } from 'react';
import {
  CheckSquare,
  ShieldCheck,
  Fuel,
  Droplets,
  CreditCard,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { UserProfile } from '../../types';

interface TaskItem {
  id: string;
  category: 'safety' | 'dispenser' | 'stock' | 'cash' | 'housekeeping';
  title: string;
  description: string;
  required: boolean;
  done: boolean;
  notes?: string;
}

const DEFAULT_TASKS: TaskItem[] = [
  {
    id: 't-safe-1',
    category: 'safety',
    title: 'Fire Extinguisher & Sand Bucket Inspection',
    description: 'Verify 9kg DCP and 5kg CO2 pins are sealed, pressure gauge in green, and sand buckets dry.',
    required: true,
    done: false,
  },
  {
    id: 't-safe-2',
    category: 'safety',
    title: 'Emergency Shut-off Switch (ESD) Clearance',
    description: 'Ensure forecourt main emergency shutoff switch is unobstructed and signage visible.',
    required: true,
    done: false,
  },
  {
    id: 't-disp-1',
    category: 'dispenser',
    title: 'Nozzle, Hose & Swivel Check',
    description: 'Inspect PMS, AGO, and RON 95 dispensing nozzles for leaks, tears, and auto-cutoff operation.',
    required: true,
    done: false,
  },
  {
    id: 't-disp-2',
    category: 'dispenser',
    title: 'Totalizer Mechanical Glass & LCD Verification',
    description: 'Wipe dispenser displays, check backlights, and ensure meter reading digits are sharp.',
    required: true,
    done: false,
  },
  {
    id: 't-stock-1',
    category: 'stock',
    title: 'Underground Tank Opening Dip Measurement',
    description: 'Use calibrated dipstick and water-finding paste to log opening fuel and water levels.',
    required: true,
    done: false,
  },
  {
    id: 't-cash-1',
    category: 'cash',
    title: 'Float & POS Terminal Battery Check',
    description: 'Confirm GH₵ 200 opening float denomination count and charge Ecobank/Stanbic POS terminals.',
    required: true,
    done: false,
  },
  {
    id: 't-house-1',
    category: 'housekeeping',
    title: 'Pylon Price Board & Forecourt Apron Sweeping',
    description: 'Verify electronic price totem matches NPA gazetted pump prices and clean driveway oils.',
    required: false,
    done: false,
  },
  {
    id: 't-house-2',
    category: 'housekeeping',
    title: 'Canopy Lighting & Air/Water Gauge Check',
    description: 'Ensure all LED bay illumination lights and tire inflation gauge operate normally.',
    required: false,
    done: false,
  },
];

export const TasksChecklistView: React.FC<{ profile: UserProfile }> = ({ profile }) => {
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    try {
      const saved = localStorage.getItem('staroil_attendant_tasks');
      return saved ? JSON.parse(saved) : DEFAULT_TASKS;
    } catch {
      return DEFAULT_TASKS;
    }
  });

  const [activeCategory, setActiveCategory] = useState<string>('all');

  const handleToggleTask = (id: string) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    setTasks(updated);
    try {
      localStorage.setItem('staroil_attendant_tasks', JSON.stringify(updated));
    } catch {}
  };

  const handleResetTasks = () => {
    const reset = DEFAULT_TASKS.map((t) => ({ ...t, done: false }));
    setTasks(reset);
    try {
      localStorage.setItem('staroil_attendant_tasks', JSON.stringify(reset));
    } catch {}
  };

  const completedCount = tasks.filter((t) => t.done).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  const categories = [
    { id: 'all', label: 'All Tasks', count: tasks.length },
    { id: 'safety', label: 'Safety & ESD', count: tasks.filter((t) => t.category === 'safety').length },
    { id: 'dispenser', label: 'Pumps & Nozzles', count: tasks.filter((t) => t.category === 'dispenser').length },
    { id: 'stock', label: 'Tanks & Dips', count: tasks.filter((t) => t.category === 'stock').length },
    { id: 'cash', label: 'Cash & POS', count: tasks.filter((t) => t.category === 'cash').length },
    { id: 'housekeeping', label: 'Housekeeping', count: tasks.filter((t) => t.category === 'housekeeping').length },
  ];

  const filteredTasks =
    activeCategory === 'all'
      ? tasks
      : tasks.filter((t) => t.category === activeCategory);

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-[#ece8e0] flex items-center gap-2">
            <CheckSquare className="text-[#e8b93b] w-6 h-6" />
            <span>Daily Forecourt Tasks & Checklist</span>
          </h2>
          <p className="text-xs text-[#8d9195] mt-0.5">
            Operational safety, dispenser inspection, tank dipping & shift opening checks
          </p>
        </div>

        <button
          onClick={handleResetTasks}
          className="pl-btn text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer text-[#8d9195] hover:text-[#ece8e0]"
        >
          <RotateCcw size={13} />
          <span>Reset for New Shift</span>
        </button>
      </div>

      {/* Progress Card */}
      <div className="pl-card p-4 sm:p-5 bg-[#191b1d] border border-[#333739] shadow-xl">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8d9195]">
              Shift Task Completion
            </span>
            <div className="text-2xl font-bold font-mono text-[#e8b93b] mt-0.5">
              {completedCount} of {tasks.length} Completed ({progressPercent}%)
            </div>
          </div>

          <div
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              progressPercent === 100
                ? 'bg-emerald-950 border border-emerald-500 text-emerald-400'
                : 'bg-amber-950 border border-amber-500 text-amber-300'
            }`}
          >
            {progressPercent === 100 ? (
              <>
                <CheckCircle2 size={14} />
                <span>ALL CLEARED</span>
              </>
            ) : (
              <>
                <AlertTriangle size={14} />
                <span>PENDING CHECKS</span>
              </>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#15171a] h-2.5 rounded-full overflow-hidden border border-[#333739]">
          <div
            className="bg-linear-to-r from-[#e8b93b] to-emerald-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#8d9195] mt-2">
          <span>Attendant: {profile.attendant || 'Assigned Attendant'}</span>
          <span>Station: {profile.station || 'StarOil Forecourt'}</span>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeCategory === c.id
                ? 'bg-[#e8b93b] text-black font-bold'
                : 'bg-[#23262a] text-[#8d9195] hover:text-[#ece8e0] border border-[#333739]'
            }`}
          >
            {c.label} ({c.count})
          </button>
        ))}
      </div>

      {/* Task List Items */}
      <div className="space-y-2.5">
        {filteredTasks.map((t) => (
          <div
            key={t.id}
            onClick={() => handleToggleTask(t.id)}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
              t.done
                ? 'bg-[#1b221d] border-emerald-800/60 shadow-xs'
                : 'bg-[#191b1d] border-[#333739] hover:border-[#8d9195]'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => {}} // Handled by parent div
                className="mt-1 w-4 h-4 rounded text-[#e8b93b] focus:ring-[#e8b93b] bg-[#15171a] border-[#333739] cursor-pointer"
              />

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4
                    className={`font-semibold text-xs ${
                      t.done ? 'line-through text-[#8d9195]' : 'text-[#ece8e0]'
                    }`}
                  >
                    {t.title}
                  </h4>
                  {t.required && (
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                      MANDATORY
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8d9195] mt-1 leading-relaxed">
                  {t.description}
                </p>
              </div>
            </div>

            <div className="shrink-0 mt-0.5">
              {t.done ? (
                <CheckCircle2 size={18} className="text-emerald-400" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-[#8d9195] block" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
