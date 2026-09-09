import React, { useRef, useState, useEffect, useCallback } from 'react';
import { PenLine, RotateCcw, Check, X } from 'lucide-react';
import { UndoRedoControls } from './UndoRedoControls';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
}

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureDataUrl: string) => void;
  title: string;
  signerName: string;
  initialSignature?: string;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title,
  signerName,
  initialSignature,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStrokes, setRedoStrokes] = useState<Stroke[]>([]);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Redraw all strokes onto canvas
  const redrawCanvas = useCallback((strokesToDraw: Stroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokesToDraw.forEach((stroke) => {
      if (stroke.points.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });

    setHasDrawn(strokesToDraw.length > 0);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Handle HiDPI screens
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      ctx.scale(ratio, ratio);

      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Load initial signature if provided
      if (initialSignature) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, rect.width, rect.height);
          setHasDrawn(true);
        };
        img.src = initialSignature;
      } else {
        setHasDrawn(false);
        setStrokes([]);
        setRedoStrokes([]);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, initialSignature]);

  // Keyboard shortcut support (Ctrl+Z for undo stroke, Ctrl+Y for redo stroke)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (!isCtrlOrCmd) return;

      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, strokes, redoStrokes]);

  if (!isOpen) return null;

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    setIsDrawing(true);
    setCurrentStroke([pt]);
    setHasDrawn(true);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pt = getCoordinates(e);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    setCurrentStroke((prev) => [...prev, pt]);
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.closePath();
    setIsDrawing(false);

    if (currentStroke.length > 0) {
      const newStrokes = [...strokes, { points: currentStroke }];
      setStrokes(newStrokes);
      setRedoStrokes([]); // clear redo on new stroke
      setCurrentStroke([]);
    }
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const last = strokes[strokes.length - 1];
    const remaining = strokes.slice(0, strokes.length - 1);
    setStrokes(remaining);
    setRedoStrokes((prev) => [last, ...prev]);
    redrawCanvas(remaining);
  };

  const handleRedo = () => {
    if (redoStrokes.length === 0) return;
    const next = redoStrokes[0];
    const remaining = redoStrokes.slice(1);
    const newStrokes = [...strokes, next];
    setStrokes(newStrokes);
    setRedoStrokes(remaining);
    redrawCanvas(newStrokes);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio);
    setStrokes([]);
    setRedoStrokes([]);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <PenLine className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">{title}</h3>
              <p className="text-[11px] text-stone-400">Signer: {signerName || 'Authorized Officer'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-800 text-stone-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="p-4 space-y-3 bg-stone-50">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-stone-500">Sign in box below</span>
            <UndoRedoControls
              canUndo={strokes.length > 0}
              canRedo={redoStrokes.length > 0}
              onUndo={handleUndo}
              onRedo={handleRedo}
              undoCount={strokes.length}
              redoCount={redoStrokes.length}
              variant="light"
              size="sm"
              showLabels={true}
            />
          </div>

          <div className="relative bg-white rounded-2xl border-2 border-dashed border-stone-300 overflow-hidden shadow-inner touch-none">
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-44 cursor-crosshair block"
            />
            {!hasDrawn && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-stone-400">
                <PenLine className="w-6 h-6 mb-1 opacity-50 stroke-[1.5]" />
                <span className="text-xs font-semibold">Draw your digital signature here</span>
                <span className="text-[10px] text-stone-400">Touch or click and drag</span>
              </div>
            )}
            <div className="absolute bottom-2 left-4 right-4 border-b border-stone-200 pointer-events-none" />
            <div className="absolute bottom-1 right-3 text-[9px] text-stone-300 font-mono pointer-events-none">
              Sign above line
            </div>
          </div>

          <p className="text-[10px] text-stone-500 leading-tight text-center">
            By signing, you authenticate that the declared cash, meter litres, and dipping records for this shift are accurate.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-white border-t border-stone-200 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={clearCanvas}
            disabled={!hasDrawn}
            className="px-3 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasDrawn}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-40"
            >
              <Check className="w-4 h-4" /> Save Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
