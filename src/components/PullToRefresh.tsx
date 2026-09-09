import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { RefreshCw, ArrowDown, Check } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  isRefreshing: boolean;
  children: ReactNode;
  disabled?: boolean;
  variant?: 'light' | 'dark';
}

const PULL_THRESHOLD = 65; // px required to trigger refresh
const MAX_PULL_DISTANCE = 110; // maximum visual pull down

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  isRefreshing,
  children,
  disabled = false,
  variant = 'light',
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const startY = useRef<number | null>(null);
  const startX = useRef<number | null>(null);
  const isPullingRef = useRef<boolean>(false);
  const pullDistanceRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevRefreshingRef = useRef<boolean>(isRefreshing);

  // Keep pullDistanceRef synchronized with pullDistance state
  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  // Watch refreshing state transition to display brief checkmark and reset
  useEffect(() => {
    // If was refreshing and now finished
    if (prevRefreshingRef.current && !isRefreshing) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setPullDistance(0);
        pullDistanceRef.current = 0;
        setShowSuccess(false);
        setIsPulling(false);
        isPullingRef.current = false;
      }, 400);
      return () => clearTimeout(timer);
    }
    prevRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  // Global touch and pointer listeners for downward swipe from the top
  useEffect(() => {
    if (disabled) return;

    const getScrollTop = () => {
      return (
        window.scrollY ||
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        (containerRef.current ? containerRef.current.scrollTop : 0) ||
        0
      );
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (disabled || isRefreshing) return;
      if (getScrollTop() > 5) return;

      if (e.touches && e.touches.length === 1) {
        startY.current = e.touches[0].clientY;
        startX.current = e.touches[0].clientX;
        isPullingRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (startY.current === null || startX.current === null || disabled || isRefreshing) return;
      if (getScrollTop() > 5 && !isPullingRef.current) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const diffY = currentY - startY.current;
      const diffX = Math.abs(currentX - startX.current);

      // Only engage if movement is predominantly vertical downward
      if (diffY > 8 && diffY > diffX && getScrollTop() <= 5) {
        isPullingRef.current = true;
        setIsPulling(true);

        // Apply logarithmic / damping curve for natural rubber-band pull
        const damping = 0.45;
        const calculated = Math.min(diffY * damping, MAX_PULL_DISTANCE);
        pullDistanceRef.current = calculated;
        setPullDistance(calculated);

        if (e.cancelable && diffY > 15) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (startY.current === null) return;
      const wasPulling = isPullingRef.current;
      const currentDistance = pullDistanceRef.current;
      startY.current = null;
      startX.current = null;
      isPullingRef.current = false;
      setIsPulling(false);

      if (wasPulling) {
        if (currentDistance >= PULL_THRESHOLD && !isRefreshing) {
          setPullDistance(52); // Maintain header pill height while fetching
          pullDistanceRef.current = 52;
          // Execute onRefresh cleanly outside React state updater lifecycle
          setTimeout(() => {
            onRefresh();
          }, 0);
        } else {
          setPullDistance(0);
          pullDistanceRef.current = 0;
        }
      }
    };

    // Pointer events for desktop / mouse drag down
    let isPointerDown = false;

    const handlePointerDown = (e: PointerEvent) => {
      if (disabled || isRefreshing) return;
      // Only left mouse button or touch
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (getScrollTop() > 5) return;

      startY.current = e.clientY;
      startX.current = e.clientX;
      isPointerDown = true;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPointerDown || startY.current === null || startX.current === null || disabled || isRefreshing) return;
      if (getScrollTop() > 5 && !isPullingRef.current) return;

      const diffY = e.clientY - startY.current;
      const diffX = Math.abs(e.clientX - startX.current);

      if (diffY > 8 && diffY > diffX && getScrollTop() <= 5) {
        isPullingRef.current = true;
        setIsPulling(true);

        const damping = 0.4;
        const calculated = Math.min(diffY * damping, MAX_PULL_DISTANCE);
        pullDistanceRef.current = calculated;
        setPullDistance(calculated);
      }
    };

    const handlePointerUp = () => {
      if (!isPointerDown) return;
      isPointerDown = false;
      const wasPulling = isPullingRef.current;
      const currentDistance = pullDistanceRef.current;
      startY.current = null;
      startX.current = null;
      isPullingRef.current = false;
      setIsPulling(false);

      if (wasPulling) {
        if (currentDistance >= PULL_THRESHOLD && !isRefreshing) {
          setPullDistance(52);
          pullDistanceRef.current = 52;
          // Execute onRefresh cleanly outside React state updater lifecycle
          setTimeout(() => {
            onRefresh();
          }, 0);
        } else {
          setPullDistance(0);
          pullDistanceRef.current = 0;
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);

      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [disabled, isRefreshing, onRefresh]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const isThresholdMet = pullDistance >= PULL_THRESHOLD;
  const isDark = variant === 'dark';

  return (
    <div ref={containerRef} className="relative w-full max-w-full overflow-hidden">
      {/* Pull to Refresh Indicator Container */}
      <div
        className="overflow-hidden transition-all duration-200 ease-out flex flex-col items-center justify-center pointer-events-none select-none"
        style={{
          height: isRefreshing ? '52px' : `${pullDistance}px`,
          opacity: pullDistance > 8 || isRefreshing ? 1 : 0,
        }}
      >
        <div
          className={`flex items-center gap-2 py-1.5 px-3.5 rounded-full shadow-md text-xs font-semibold backdrop-blur-md border transition-all ${
            isDark
              ? 'bg-[#1e2124]/95 border-[#333739] text-[#ece8e0]'
              : 'bg-white/95 border-stone-200 text-stone-700'
          }`}
        >
          {showSuccess ? (
            <>
              <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
              <span className="text-emerald-600 font-bold text-[11px]">Refreshed!</span>
            </>
          ) : isRefreshing ? (
            <>
              <RefreshCw
                className={`w-3.5 h-3.5 animate-spin ${
                  isDark ? 'text-[#e8b93b]' : 'text-emerald-600'
                }`}
              />
              <span className="text-[11px]">Refreshing data...</span>
            </>
          ) : (
            <>
              <div
                className="transition-transform duration-150"
                style={{
                  transform: `rotate(${isThresholdMet ? 180 : progress * 180}deg)`,
                }}
              >
                <ArrowDown
                  className={`w-3.5 h-3.5 transition-colors ${
                    isThresholdMet
                      ? isDark
                        ? 'text-[#e8b93b]'
                        : 'text-emerald-600'
                      : isDark
                      ? 'text-[#8d9195]'
                      : 'text-stone-400'
                  }`}
                />
              </div>
              <span className="text-[11px]">
                {isThresholdMet ? 'Release to refresh' : 'Swipe down to refresh'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Content with soft rubber-band translation */}
      <div
        className="transition-transform duration-150 ease-out w-full max-w-full min-w-0"
        style={{
          transform:
            isPulling && pullDistance > 0
              ? `translateY(${pullDistance * 0.22}px)`
              : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};
