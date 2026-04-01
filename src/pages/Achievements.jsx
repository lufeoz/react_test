import { useState, useEffect, useMemo } from 'react';
import { useData } from '../contexts/DataContext';

const BADGES = [
  // 규칙 관련
  { id: 'first_rule', icon: '🎯', name: '첫 규칙', desc: '소비 규칙을 처음 만들었어요', check: (d) => d.ruleCount >= 1 },
  { id: 'rule_master', icon: '⚙', name: '규칙 마스터', desc: '규칙을 5개 이상 만들었어요', check: (d) => d.ruleCount >= 5 },
  { id: 'strict_mode', icon: '🔒', name: '엄격 모드', desc: '모든 규칙이 30분 이하', check: (d) => d.ruleCount > 0 && d.allRulesUnder30 },

  // 타이머 관련
  { id: 'first_timer', icon: '⏱', name: '첫 타이머', desc: '타이머를 처음 완료했어요', check: (d) => d.timerCompleted >= 1 },
  { id: 'timer_5', icon: '⏰', name: '시간 수호자', desc: '타이머를 5회 완료했어요', check: (d) => d.timerCompleted >= 5 },
  { id: 'timer_20', icon: '🏆', name: '타임 챔피언', desc: '타이머를 20회 완료했어요', check: (d) => d.timerCompleted >= 20 },

  // 필터 관련
  { id: 'first_filter', icon: '🚫', name: '첫 필터', desc: '노이즈 필터를 처음 설정했어요', check: (d) => d.filterCount >= 1 },
  { id: 'filter_heavy', icon: '🛡', name: '방패막', desc: '필터를 5개 이상 활성화했어요', check: (d) => d.activeFilterCount >= 5 },

  // 리셋 관련
  { id: 'first_reset', icon: '🌿', name: '첫 리셋', desc: '리셋 프로그램을 처음 완료했어요', check: (d) => d.resetCompleted >= 1 },
  { id: 'reset_10', icon: '🧘', name: '마음챙김', desc: '리셋을 10회 완료했어요', check: (d) => d.resetCompleted >= 10 },

  // 다이어트 관련
  { id: 'diet_start', icon: '🌱', name: '다이어트 시작', desc: '디지털 다이어트를 시작했어요', check: (d) => d.dietStarted },
  { id: 'diet_mission', icon: '✅', name: '미션 클리어', desc: '다이어트 미션을 3개 완료했어요', check: (d) => d.missionsCompleted >= 3 },
  { id: 'diet_week', icon: '🔥', name: '일주일 달성', desc: '7일 미션을 모두 완료했어요', check: (d) => d.missionsCompleted >= 7 },

  // 피드 관련
  { id: 'feed_custom', icon: '📡', name: '내 피드', desc: '피드 그룹을 직접 만들었어요', check: (d) => d.feedGroupCount >= 4 },

  // 연속 사용
  { id: 'streak_3', icon: '🔥', name: '3일 연속', desc: '3일 연속 앱을 사용했어요', check: (d) => d.streak >= 3 },
  { id: 'streak_7', icon: '💎', name: '7일 연속', desc: '일주일 연속 사용했어요', check: (d) => d.streak >= 7 },
  { id: 'streak_30', icon: '👑', name: '30일 연속', desc: '한 달 연속 사용했어요', check: (d) => d.streak >= 30 },
];

export default function Achievements() {
  const { load } = useData();
  const [selected, setSelected] = useState(null);

  const data = useMemo(() => {
    const rules = load('consumptionRules') || [];
    const filters = load('noiseFilters') || [];
    const feeds = load('focusFeeds') || [];
    const stats = load('achievementStats') || {};
    const visits = load('visitDays') || [];
    const programs = load('dietPrograms') || {};

    const todayStr = new Date().toISOString().slice(0, 10);
    const allVisits = [...visits];
    if (!allVisits.includes(todayStr)) allVisits.push(todayStr);
    const sorted = [...new Set(allVisits)].sort().reverse();
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < sorted.length; i++) {
      const expected = new Date(d);
      expected.setDate(expected.getDate() - i);
      if (sorted[i] === expected.toISOString().slice(0, 10)) streak++;
      else break;
    }

    const totalMissions = Object.values(programs).reduce(
      (sum, p) => sum + (p.completedDays?.length || 0), 0
    );

    return {
      ruleCount: rules.length,
      allRulesUnder30: rules.length > 0 && rules.every(r => r.limit <= 30),
      filterCount: filters.length,
      activeFilterCount: filters.filter(f => f.enabled).length,
      feedGroupCount: feeds.length,
      timerCompleted: stats.timerCompleted || 0,
      resetCompleted: stats.resetCompleted || 0,
      dietStarted: Object.keys(programs).length > 0,
      missionsCompleted: stats.missionsCompleted || totalMissions,
      streak,
    };
  }, [load]);

  const unlocked = BADGES.filter(b => b.check(data));
  const locked = BADGES.filter(b => !b.check(data));
  const progress = Math.round((unlocked.length / BADGES.length) * 100);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Achievements</h1>
        <p className="page-subtitle">{unlocked.length}/{BADGES.length} 달성</p>
      </header>

      {/* Progress Ring */}
      <div className="achievement-progress">
        <div className="achievement-ring">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" className="achievement-track" />
            <circle cx="60" cy="60" r="52" className="achievement-fill"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
            />
          </svg>
          <div className="achievement-ring-center">
            <span className="achievement-percent">{progress}%</span>
          </div>
        </div>
        <div className="achievement-streak">
          <span className="streak-icon">🔥</span>
          <span className="streak-count">{data.streak}일 연속</span>
        </div>
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div className="badge-section">
          <div className="badge-section-title">달성한 배지</div>
          <div className="badge-grid">
            {unlocked.map(b => (
              <button key={b.id} className="badge-card unlocked" onClick={() => setSelected(selected?.id === b.id ? null : b)}>
                <span className="badge-icon">{b.icon}</span>
                <span className="badge-name">{b.name}</span>
                {selected?.id === b.id && <span className="badge-desc">{b.desc}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div className="badge-section">
          <div className="badge-section-title">도전 중</div>
          <div className="badge-grid">
            {locked.map(b => (
              <button key={b.id} className="badge-card locked" onClick={() => setSelected(selected?.id === b.id ? null : b)}>
                <span className="badge-icon">{b.icon}</span>
                <span className="badge-name">{b.name}</span>
                {selected?.id === b.id && <span className="badge-desc">{b.desc}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
