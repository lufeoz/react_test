import { useState, useRef, useCallback } from 'react';
import './PullToRefresh.css';

export default function PullToRefresh({ onRefresh, children }) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const threshold = 70;

  const handleTouchStart = useCallback((e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!pulling || refreshing) return;
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.5, 100));
    }
  }, [pulling, refreshing]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance >= threshold && !refreshing) {
      setRefreshing(true);
      setPullDistance(50);
      const done = onRefresh?.();
      if (done instanceof Promise) {
        done.finally(() => {
          setRefreshing(false);
          setPullDistance(0);
          setPulling(false);
        });
      } else {
        setTimeout(() => {
          setRefreshing(false);
          setPullDistance(0);
          setPulling(false);
        }, 600);
      }
    } else {
      setPullDistance(0);
      setPulling(false);
    }
  }, [pullDistance, refreshing, onRefresh]);

  return (
    <div
      ref={containerRef}
      className="pull-to-refresh"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`ptr-indicator ${pullDistance >= threshold ? 'ready' : ''} ${refreshing ? 'refreshing' : ''}`}
        style={{ height: pullDistance, opacity: Math.min(pullDistance / threshold, 1) }}
      >
        <div className={`ptr-spinner ${refreshing ? 'spinning' : ''}`}>
          {refreshing ? '↻' : pullDistance >= threshold ? '↓' : '↓'}
        </div>
        <span className="ptr-text">
          {refreshing ? '새로고침 중...' : pullDistance >= threshold ? '놓으면 새로고침' : '당겨서 새로고침'}
        </span>
      </div>
      <div style={{ transform: `translateY(${pullDistance}px)`, transition: pulling && pullDistance > 0 ? 'none' : 'transform 0.3s ease' }}>
        {children}
      </div>
    </div>
  );
}
