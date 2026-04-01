import { useState, useEffect, useRef } from 'react';
import { logDailyActivity } from './MyPage';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useLoginModal } from '../components/Login';
import Filter from './Filter';

// === Rules Data ===
const DEFAULT_RULES = [
  { id: 1, icon: '▶', category: 'YouTube', limit: 30, unit: 'min', enabled: true, timeSlot: 'evening', timeLabel: '저녁' },
  { id: 2, icon: '💬', category: 'SNS', limit: 20, unit: 'min', enabled: true, timeSlot: 'free', timeLabel: '자유' },
  { id: 3, icon: '📰', category: '뉴스', limit: 10, unit: 'min', enabled: true, timeSlot: 'morning', timeLabel: '아침' },
];

const TIME_SLOTS = [
  { value: 'morning', label: '아침', icon: '🌅' },
  { value: 'afternoon', label: '오후', icon: '☀️' },
  { value: 'evening', label: '저녁', icon: '🌙' },
  { value: 'free', label: '자유', icon: '⏰' },
];

const ICON_OPTIONS = ['▶', '💬', '📰', '📱', '🎮', '🐦', '📸', '🎵', '📌'];

// === Time Container Data ===
const DEFAULT_CONTAINERS = [
  { id: 1, name: 'Morning', icon: '🌅', items: [{ label: '뉴스', minutes: 10 }], active: false },
  { id: 2, name: 'Evening', icon: '🌙', items: [{ label: '유튜브', minutes: 20 }, { label: 'SNS', minutes: 10 }], active: false },
  { id: 3, name: 'Weekend', icon: '☀️', items: [{ label: '자유 시간', minutes: 60 }], active: false },
];

const CONTAINER_ICONS = ['⏰', '🌅', '🌙', '☀️', '🍽', '🏠'];

export default function Rules({ embedded = false }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { user } = useAuth();
  const { requireLogin } = useLoginModal();
  const { load, save } = useData();
  const [tab, setTab] = useState('rules');

  // === Rules State ===
  const [rules, setRules] = useState(() => {
    return load('consumptionRules') || DEFAULT_RULES;
  });
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({ category: '', icon: '📌', limit: 30, unit: 'min', timeSlot: 'free', timeLabel: '자유' });
  const [activeRuleTimer, setActiveRuleTimer] = useState(null);
  const [ruleRemaining, setRuleRemaining] = useState(0);
  const ruleIntervalRef = useRef(null);

  // === Container State ===
  const [containers, setContainers] = useState(() => {
    return load('timeContainers') || DEFAULT_CONTAINERS;
  });
  const [activeContainerTimer, setActiveContainerTimer] = useState(null);
  const [containerRemaining, setContainerRemaining] = useState(0);
  const [showAddContainer, setShowAddContainer] = useState(false);
  const [newContainer, setNewContainer] = useState({ name: '', icon: '⏰', minutes: 30 });
  const containerIntervalRef = useRef(null);

  // === Rules Logic ===
  const saveRules = (updated) => { setRules(updated); save('consumptionRules', updated); };
  const toggleRule = (id) => saveRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  const updateLimit = (id, delta) => saveRules(rules.map(r => r.id !== id ? r : { ...r, limit: Math.max(0, r.limit + delta) }));
  const updateSlot = (id, slot) => {
    const label = TIME_SLOTS.find(s => s.value === slot)?.label || slot;
    saveRules(rules.map(r => r.id === id ? { ...r, timeSlot: slot, timeLabel: label } : r));
  };
  const removeRule = async (id) => {
    if (!await confirm('이 규칙을 삭제할까요?')) return;
    saveRules(rules.filter(r => r.id !== id));
    if (activeRuleTimer?.id === id) stopRuleTimer();
    toast('규칙이 삭제되었습니다');
  };
  const addRule = () => {
    if (!newRule.category.trim()) return;
    saveRules([...rules, { ...newRule, id: Date.now(), category: newRule.category.trim(), enabled: true }]);
    setNewRule({ category: '', icon: '📌', limit: 30, unit: 'min', timeSlot: 'free', timeLabel: '자유' });
    setShowAddRule(false);
    toast('규칙이 추가되었습니다');
  };
  const startRuleTimer = (rule) => { setActiveRuleTimer(rule); setRuleRemaining(rule.limit * 60); };
  const stopRuleTimer = () => { setActiveRuleTimer(null); setRuleRemaining(0); if (ruleIntervalRef.current) clearInterval(ruleIntervalRef.current); };

  useEffect(() => {
    if (activeRuleTimer && ruleRemaining > 0) {
      ruleIntervalRef.current = setInterval(() => {
        setRuleRemaining(prev => { if (prev <= 1) { clearInterval(ruleIntervalRef.current); return 0; } return prev - 1; });
      }, 1000);
      return () => clearInterval(ruleIntervalRef.current);
    }
  }, [activeRuleTimer, ruleRemaining > 0]);

  // === Container Logic ===
  const saveContainers = (updated) => { setContainers(updated); save('timeContainers', updated); };
  const removeContainer = (id) => saveContainers(containers.filter(c => c.id !== id));
  const startContainerTimer = (container) => {
    const totalMinutes = container.items.reduce((sum, i) => sum + i.minutes, 0);
    setActiveContainerTimer(container);
    setContainerRemaining(totalMinutes * 60);
  };
  const stopContainerTimer = () => { setActiveContainerTimer(null); setContainerRemaining(0); if (containerIntervalRef.current) clearInterval(containerIntervalRef.current); };
  const addContainer = () => {
    if (!newContainer.name.trim()) return;
    saveContainers([...containers, { id: Date.now(), name: newContainer.name.trim(), icon: newContainer.icon, items: [{ label: '콘텐츠', minutes: newContainer.minutes }], active: false }]);
    setNewContainer({ name: '', icon: '⏰', minutes: 30 });
    setShowAddContainer(false);
  };

  useEffect(() => {
    if (activeContainerTimer && containerRemaining > 0) {
      containerIntervalRef.current = setInterval(() => {
        setContainerRemaining(prev => { if (prev <= 1) { clearInterval(containerIntervalRef.current); setActiveContainerTimer(null); return 0; } return prev - 1; });
      }, 1000);
      return () => clearInterval(containerIntervalRef.current);
    }
  }, [activeContainerTimer, containerRemaining > 0]);

  // === Shared Helpers ===
  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const ruleProgress = activeRuleTimer ? ((activeRuleTimer.limit * 60 - ruleRemaining) / (activeRuleTimer.limit * 60)) * 100 : 0;
  const containerTotalSec = activeContainerTimer ? activeContainerTimer.items.reduce((s, i) => s + i.minutes, 0) * 60 : 1;
  const containerProgress = activeContainerTimer ? ((containerTotalSec - containerRemaining) / containerTotalSec) * 100 : 0;

  const grouped = TIME_SLOTS.map(slot => ({
    ...slot,
    rules: rules.filter(r => r.timeSlot === slot.value && r.enabled),
  })).filter(g => g.rules.length > 0);
  const disabledRules = rules.filter(r => !r.enabled);

  const rulesContent = (
    <>
      {/* Tab Switcher */}
      <div className="rules-tab-bar">
        <button className={`rules-tab ${tab === 'rules' ? 'active' : ''}`} onClick={() => setTab('rules')}>
          규칙
        </button>
        <button className={`rules-tab ${tab === 'time' ? 'active' : ''}`} onClick={() => setTab('time')}>
          시간
        </button>
        <button className={`rules-tab ${tab === 'filter' ? 'active' : ''}`} onClick={() => setTab('filter')}>
          필터
        </button>
      </div>

      {/* ===== RULES TAB ===== */}
      {tab === 'rules' && (
        <>
          {activeRuleTimer && (
            <div className="rule-timer">
              <div className="rule-timer-ring">
                <svg viewBox="0 0 120 120" className="timer-svg">
                  <circle cx="60" cy="60" r="54" className="timer-track" />
                  <circle cx="60" cy="60" r="54" className="timer-progress"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - ruleProgress / 100)}`}
                  />
                </svg>
                <div className="timer-center">
                  <span className="timer-time">{fmt(ruleRemaining)}</span>
                  <span className="timer-label">{activeRuleTimer.icon} {activeRuleTimer.category}</span>
                </div>
              </div>
              {ruleRemaining === 0 ? (
                <div className="timer-done">
                  <p className="timer-done-text">시간 끝!</p>
                  <button className="btn-primary" onClick={() => {
                    const stats = load('achievementStats') || {};
                    stats.timerCompleted = (stats.timerCompleted || 0) + 1;
                    save('achievementStats', stats);
                    logDailyActivity('timer');
                    stopRuleTimer();
                  }}>확인</button>
                </div>
              ) : (
                <button className="btn-stop" onClick={stopRuleTimer}>중지</button>
              )}
            </div>
          )}

          {grouped.length === 0 && disabledRules.length === 0 && (
            <div className="empty-state">
              <p className="empty-icon">⚙</p>
              <p className="empty-text">아직 규칙이 없어요</p>
              <p className="empty-sub">콘텐츠 소비 시간을 직접 정해보세요</p>
            </div>
          )}

          {grouped.map(group => (
            <div key={group.value} className="rule-time-group">
              <div className="rule-time-header">
                <span>{group.icon} {group.label}</span>
                <span className="rule-time-total">{group.rules.reduce((s, r) => s + r.limit, 0)}분</span>
              </div>
              {group.rules.map(rule => (
                <div key={rule.id} className="rule-card">
                  <div className="rule-top">
                    <div className="rule-title" onClick={() => toggleRule(rule.id)}>
                      <span className="toggle on" />
                      <span className="rule-icon">{rule.icon}</span>
                      <span className="rule-category">{rule.category}</span>
                    </div>
                    <div className="rule-actions">
                      {!activeRuleTimer && rule.limit > 0 && (
                        <button className="btn-start" onClick={() => startRuleTimer(rule)}>▶</button>
                      )}
                      <button className="btn-remove" onClick={() => removeRule(rule.id)}>×</button>
                    </div>
                  </div>
                  <div className="rule-config">
                    <div className="rule-limit">
                      <button className="btn-adjust" onClick={() => updateLimit(rule.id, -5)} disabled={rule.limit <= 0}>−</button>
                      <span className="rule-value">{rule.limit}</span>
                      <span className="rule-value-unit">분</span>
                      <button className="btn-adjust" onClick={() => updateLimit(rule.id, 5)}>+</button>
                    </div>
                    <select className="rule-slot-select" value={rule.timeSlot} onChange={e => updateSlot(rule.id, e.target.value)}>
                      {TIME_SLOTS.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {disabledRules.length > 0 && (
            <div className="rule-time-group disabled-group">
              <div className="rule-time-header"><span>비활성</span></div>
              {disabledRules.map(rule => (
                <div key={rule.id} className="rule-card disabled">
                  <div className="rule-top">
                    <div className="rule-title" onClick={() => toggleRule(rule.id)}>
                      <span className="toggle off" />
                      <span className="rule-icon">{rule.icon}</span>
                      <span className="rule-category">{rule.category}</span>
                    </div>
                    <button className="btn-remove" onClick={() => removeRule(rule.id)}>×</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {rules.some(r => r.enabled) && (
            <div className="rule-total-bar">
              하루 총 <strong>{rules.filter(r => r.enabled).reduce((s, r) => s + r.limit, 0)}분</strong> 콘텐츠 소비
            </div>
          )}

          {showAddRule ? (
            <div className="rule-card add-rule-card">
              <div className="add-form">
                <div className="add-form-row">
                  <select value={newRule.icon} onChange={e => setNewRule({ ...newRule, icon: e.target.value })} className="icon-select">
                    {ICON_OPTIONS.map(ic => <option key={ic}>{ic}</option>)}
                  </select>
                  <input type="text" placeholder="카테고리 (예: TikTok)" value={newRule.category}
                    onChange={e => setNewRule({ ...newRule, category: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && addRule()} autoFocus
                  />
                </div>
                <div className="add-form-row">
                  <input type="number" value={newRule.limit} onChange={e => setNewRule({ ...newRule, limit: parseInt(e.target.value, 10) || 0 })}
                    min="0" className="limit-input" />
                  <span className="unit-label">분</span>
                  <select value={newRule.timeSlot} onChange={e => {
                    const label = TIME_SLOTS.find(s => s.value === e.target.value)?.label;
                    setNewRule({ ...newRule, timeSlot: e.target.value, timeLabel: label });
                  }}>
                    {TIME_SLOTS.map(s => <option key={s.value} value={s.value}>{s.icon} {s.label}</option>)}
                  </select>
                </div>
                <div className="add-form-actions">
                  <button className="btn-small" onClick={addRule}>추가</button>
                  <button className="btn-small btn-ghost" onClick={() => setShowAddRule(false)}>취소</button>
                </div>
              </div>
            </div>
          ) : (
            <button className="add-group-btn" onClick={() => {
              if (!user) { requireLogin('규칙을 만들려면 로그인이 필요합니다'); return; }
              setShowAddRule(true);
            }}>+ 새 규칙 만들기</button>
          )}
        </>
      )}

      {/* ===== TIME CONTAINER TAB ===== */}
      {tab === 'time' && (
        <>
          {activeContainerTimer && (
            <div className="timer-active">
              <div className="timer-ring">
                <svg viewBox="0 0 120 120" className="timer-svg">
                  <circle cx="60" cy="60" r="54" className="timer-track" />
                  <circle cx="60" cy="60" r="54" className="timer-progress"
                    strokeDasharray={`${2 * Math.PI * 54}`}
                    strokeDashoffset={`${2 * Math.PI * 54 * (1 - containerProgress / 100)}`}
                  />
                </svg>
                <div className="timer-center">
                  <span className="timer-time">{fmt(containerRemaining)}</span>
                  <span className="timer-label">{activeContainerTimer.icon} {activeContainerTimer.name}</span>
                </div>
              </div>
              <button className="btn-stop" onClick={stopContainerTimer}>중지</button>
            </div>
          )}

          <div className="container-list">
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
                      {!activeContainerTimer && (
                        <button className="btn-start" onClick={() => startContainerTimer(container)}>시작</button>
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

          {showAddContainer ? (
            <div className="rule-card add-rule-card">
              <div className="add-form">
                <div className="add-form-row">
                  <select value={newContainer.icon} onChange={e => setNewContainer({ ...newContainer, icon: e.target.value })} className="icon-select">
                    {CONTAINER_ICONS.map(ic => <option key={ic}>{ic}</option>)}
                  </select>
                  <input type="text" placeholder="컨테이너 이름 (예: Lunch)" value={newContainer.name}
                    onChange={e => setNewContainer({ ...newContainer, name: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && addContainer()} autoFocus
                  />
                </div>
                <div className="add-form-row">
                  <input type="number" value={newContainer.minutes}
                    onChange={e => setNewContainer({ ...newContainer, minutes: parseInt(e.target.value, 10) || 0 })}
                    min="1" className="limit-input" />
                  <span className="unit-label">분</span>
                </div>
                <div className="add-form-actions">
                  <button className="btn-small" onClick={addContainer}>만들기</button>
                  <button className="btn-small btn-ghost" onClick={() => setShowAddContainer(false)}>취소</button>
                </div>
              </div>
            </div>
          ) : (
            <button className="add-group-btn" onClick={() => {
              if (!user) { requireLogin('타이머를 만들려면 로그인이 필요합니다'); return; }
              setShowAddContainer(true);
            }}>+ 새 컨테이너 만들기</button>
          )}
        </>
      )}

      {/* ===== FILTER TAB ===== */}
      {tab === 'filter' && <Filter embedded />}
    </>
  );

  if (embedded) return rulesContent;

  return (
    <div className="page">
      <header className="page-header">
        <h1>Rules</h1>
        <p className="page-subtitle">소비 규칙 · 시간 · 필터</p>
      </header>
      {rulesContent}
    </div>
  );
}
