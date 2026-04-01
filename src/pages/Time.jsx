import { useState, useEffect, useRef } from 'react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { useData } from '../contexts/DataContext';

const DEFAULT_CONTAINERS = [
  { id: 1, name: 'Morning', icon: '🌅', items: [{ label: '뉴스', minutes: 10 }], active: false },
  { id: 2, name: 'Evening', icon: '🌙', items: [{ label: '유튜브', minutes: 20 }, { label: 'SNS', minutes: 10 }], active: false },
  { id: 3, name: 'Weekend', icon: '☀️', items: [{ label: '자유 시간', minutes: 60 }], active: false },
];

export default function Time({ embedded = false }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { load, save } = useData();
  const [containers, setContainers] = useState(() => {
    return load('timeContainers') || DEFAULT_CONTAINERS;
  });
  const [activeTimer, setActiveTimer] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [newContainer, setNewContainer] = useState({ name: '', icon: '⏰', minutes: 30 });
  const intervalRef = useRef(null);

  const saveContainers = (updated) => {
    setContainers(updated);
    save('timeContainers', updated);
  };

  const startTimer = (container) => {
    const totalMinutes = container.items.reduce((sum, i) => sum + i.minutes, 0);
    setActiveTimer(container);
    setRemaining(totalMinutes * 60);
  };

  const stopTimer = () => {
    setActiveTimer(null);
    setRemaining(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => {
    if (activeTimer && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            setActiveTimer(null);
            toast('타이머가 완료되었습니다!');
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(intervalRef.current);
    }
  }, [activeTimer, remaining > 0]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const removeContainer = async (id) => {
    if (!await confirm('이 컨테이너를 삭제할까요?')) return;
    saveContainers(containers.filter(c => c.id !== id));
    toast('컨테이너가 삭제되었습니다');
  };

  const addContainer = () => {
    if (!newContainer.name.trim()) return;
    saveContainers([...containers, {
      id: Date.now(),
      name: newContainer.name.trim(),
      icon: newContainer.icon,
      items: [{ label: '콘텐츠', minutes: newContainer.minutes }],
      active: false,
    }]);
    setNewContainer({ name: '', icon: '⏰', minutes: 30 });
    setShowAdd(false);
    toast('컨테이너가 추가되었습니다');
  };

  const progress = activeTimer
    ? ((activeTimer.items.reduce((s, i) => s + i.minutes, 0) * 60 - remaining) /
       (activeTimer.items.reduce((s, i) => s + i.minutes, 0) * 60)) * 100
    : 0;

  const content = (
    <>
      {activeTimer && (
        <div className="timer-active">
          <div className="timer-ring">
            <svg viewBox="0 0 120 120" className="timer-svg">
              <circle cx="60" cy="60" r="54" className="timer-track" />
              <circle
                cx="60" cy="60" r="54"
                className="timer-progress"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - progress / 100)}`}
              />
            </svg>
            <div className="timer-center">
              <span className="timer-time">{formatTime(remaining)}</span>
              <span className="timer-label">{activeTimer.icon} {activeTimer.name}</span>
            </div>
          </div>
          <button className="btn-stop" onClick={stopTimer}>중지</button>
        </div>
      )}

      <div className="container-list">
        {containers.length === 0 && (
          <div className="empty-state">
            <p className="empty-icon">⏰</p>
            <p className="empty-text">아직 컨테이너가 없어요</p>
            <p className="empty-sub">시간을 정해두고 콘텐츠를 소비해보세요</p>
          </div>
        )}
        {containers.map(container => {
          const totalMin = container.items.reduce((s, i) => s + i.minutes, 0);
          return (
            <div key={container.id} className="container-card">
              <div className="container-header">
                <div className="container-title">
                  <span>{container.icon}</span>
                  <span>{container.name}</span>
                  <span className="container-total">{totalMin}분</span>
                </div>
                <div className="container-actions">
                  {!activeTimer && (
                    <button className="btn-start" onClick={() => startTimer(container)}>시작</button>
                  )}
                  <button className="btn-remove" onClick={() => removeContainer(container.id)}>×</button>
                </div>
              </div>
              <div className="container-items">
                {container.items.map((item, i) => (
                  <div key={i} className="container-item">
                    <span>{item.label}</span>
                    <span className="item-minutes">{item.minutes}분</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {showAdd ? (
        <div className="rule-card add-rule-card">
          <div className="add-form">
            <div className="add-form-row">
              <select value={newContainer.icon} onChange={e => setNewContainer({ ...newContainer, icon: e.target.value })} className="icon-select">
                <option>⏰</option>
                <option>🌅</option>
                <option>🌙</option>
                <option>☀️</option>
                <option>🍽</option>
                <option>🏠</option>
              </select>
              <input
                type="text"
                placeholder="컨테이너 이름 (예: Lunch)"
                value={newContainer.name}
                onChange={e => setNewContainer({ ...newContainer, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && addContainer()}
                autoFocus
              />
            </div>
            <div className="add-form-row">
              <input
                type="number"
                value={newContainer.minutes}
                onChange={e => setNewContainer({ ...newContainer, minutes: parseInt(e.target.value, 10) || 0 })}
                min="1"
                className="limit-input"
              />
              <span className="unit-label">분</span>
            </div>
            <div className="add-form-actions">
              <button className="btn-small" onClick={addContainer}>만들기</button>
              <button className="btn-small btn-ghost" onClick={() => setShowAdd(false)}>취소</button>
            </div>
          </div>
        </div>
      ) : (
        <button className="add-group-btn" onClick={() => setShowAdd(true)}>
          + 새 컨테이너 만들기
        </button>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Time Container</h1>
        <p className="page-subtitle">콘텐츠 소비 시간을 컨테이너로 관리</p>
      </header>
      {content}
    </div>
  );
}
