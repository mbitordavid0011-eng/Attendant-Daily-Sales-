import React from 'react';
import { Undo2, Redo2 } from 'lucide-react';

interface UndoRedoControlsProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  undoCount?: number;
  redoCount?: number;
  size?: 'sm' | 'md';
  variant?: 'dark' | 'light';
  showLabels?: boolean;
  className?: string;
}

export const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  undoCount,
  redoCount,
  size = 'sm',
  variant = 'light',
  showLabels = false,
  className = '',
}) => {
  const isDark = variant === 'dark';

  const baseButtonClass =
    size === 'sm'
      ? 'px-2 py-1 text-xs gap-1 rounded-md'
      : 'px-2.5 py-1.5 text-xs gap-1.5 rounded-lg';

  const darkEnabledClass =
    'bg-[#23262a] hover:bg-[#2c3036] text-[#ece8e0] border border-[#333739] hover:border-[#e8b93b]/60 active:scale-95 transition-all shadow-xs';
  const darkDisabledClass =
    'bg-[#1a1c1e] text-[#555a60] border border-[#26282c] cursor-not-allowed opacity-50';

  const lightEnabledClass =
    'bg-stone-50 hover:bg-stone-100 text-stone-800 border border-stone-300 hover:border-stone-400 active:scale-95 transition-all shadow-xs';
  const lightDisabledClass =
    'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed opacity-50';

  const iconSize = size === 'sm' ? 14 : 16;

  return (
    <div
      id="undo-redo-controls"
      className={`inline-flex items-center gap-1 ${className}`}
      role="group"
      aria-label="Undo and redo actions"
    >
      {/* Undo Button */}
      <button
        id="btn-undo-action"
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        title={canUndo ? `Undo (Ctrl+Z / Cmd+Z)${undoCount ? ` [${undoCount} available]` : ''}` : 'Nothing to undo'}
        className={`inline-flex items-center font-medium cursor-pointer transition-colors ${baseButtonClass} ${
          canUndo
            ? isDark
              ? darkEnabledClass
              : lightEnabledClass
            : isDark
            ? darkDisabledClass
            : lightDisabledClass
        }`}
        aria-label="Undo last edit"
      >
        <Undo2 size={iconSize} className="shrink-0" />
        {showLabels && <span className="font-semibold">Undo</span>}
        {undoCount !== undefined && undoCount > 0 && (
          <span
            className={`text-[10px] font-mono px-1 rounded-full ${
              isDark ? 'bg-[#15171a] text-[#e8b93b]' : 'bg-stone-200 text-stone-700'
            }`}
          >
            {undoCount}
          </span>
        )}
      </button>

      {/* Redo Button */}
      <button
        id="btn-redo-action"
        type="button"
        onClick={onRedo}
        disabled={!canRedo}
        title={canRedo ? `Redo (Ctrl+Y / Cmd+Shift+Z)${redoCount ? ` [${redoCount} available]` : ''}` : 'Nothing to redo'}
        className={`inline-flex items-center font-medium cursor-pointer transition-colors ${baseButtonClass} ${
          canRedo
            ? isDark
              ? darkEnabledClass
              : lightEnabledClass
            : isDark
            ? darkDisabledClass
            : lightDisabledClass
        }`}
        aria-label="Redo previous edit"
      >
        <Redo2 size={iconSize} className="shrink-0" />
        {showLabels && <span className="font-semibold">Redo</span>}
        {redoCount !== undefined && redoCount > 0 && (
          <span
            className={`text-[10px] font-mono px-1 rounded-full ${
              isDark ? 'bg-[#15171a] text-[#e8b93b]' : 'bg-stone-200 text-stone-700'
            }`}
          >
            {redoCount}
          </span>
        )}
      </button>
    </div>
  );
};
