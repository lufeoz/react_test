import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSkeleton } from '../components/Skeleton';
import PullToRefresh from '../components/PullToRefresh';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

const REST_TYPE_NAMES = {
  speed: { icon: '🚀', name: '과속형' },
  escape: { icon: '📱', name: '도피형' },
  overload: { icon: '😵', name: '과부하형' },
  blank: { icon: '🌫', name: '멍형' },
  overthink: { icon: '🧠', name: '과생각형' },
  suppress: { icon: '🎭', name: '감정 억제형' },
  social: { icon: '🤝', name: '관계 과부하형' },
  perfect: { icon: '🎯', name: '완벽주의형' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { load, save, loading: dataLoading } = useData();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!dataLoading) {
      const timer = setTimeout(() => setReady(true), 300);
      return () => clearTimeout(timer);
    }
  }, [dataLoading]);

  const restType = profile?.rest_type;
  const typeInfo = REST_TYPE_NAMES[restType];

  const today = useMemo(() => {
    if (dataLoading) return { totalLimit: 0, ruleCount: 0, timerDone: 0, resetDone: 0, streak: 0, restDone: 0 };

    const rules = load('consumptionRules') || [];
    const achStats = load('achievementStats') || {};
    const visits = [...(load('visitDays') || [])];
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!visits.includes(todayStr)) {
      visits.push(todayStr);
      save('visitDays', visits);
    }
    const activeRules = rules.filter(r => r.enabled);
    const totalLimit = activeRules.reduce((s, r) => s + (r.limit || 0), 0);
    const timerDone = achStats.timerCompleted || 0;
    const resetDone = achStats.resetCompleted || 0;
    const restCompleted = load('restCompleted') || {};
    const todayRest = restCompleted[todayStr] || [];

    const sorted = [...new Set(visits)].sort().reverse();
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < sorted.length; i++) {
      const expected = new Date(d);
      expected.setDate(expected.getDate() - i);
      if (sorted[i] === expected.toISOString().slice(0, 10)) streak++;
      else break;
    }
    return { totalLimit, ruleCount: activeRules.length, timerDone, resetDone, streak, restDone: todayRest.length };
  }, [dataLoading, load, save]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return '좋은 아침이에요';
    if (h < 18) return '오늘도 수고했어요';
    return '오늘 저녁은 어떻게 쉴까요?';
  }, []);

  const handleRefresh = () => {
    setReady(false);
    return new Promise(resolve => setTimeout(() => {
      setReady(true);
      resolve();
    }, 500));
  };

  if (!ready) {
    return (
      <div className="page">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="page">
      <header className="page-header">
        <h1>{greeting}</h1>
        {profile?.name && <p className="page-subtitle">{profile.name}님</p>}
      </header>

      {/* Streak + Quick Stats */}
      <div className="dash-stats stagger-item">
        <div className="dash-stat-main">
          <span className="dash-streak-num">{today.streak}</span>
          <span className="dash-streak-label">일 연속</span>
        </div>
        <div className="dash-stat-chips">
          <div className="dash-chip">
            <span className="dash-chip-value">{today.totalLimit}</span>
            <span className="dash-chip-label">분 예산</span>
          </div>
          <div className="dash-chip">
            <span className="dash-chip-value">{today.restDone}</span>
            <span className="dash-chip-label">쉼 미션</span>
          </div>
          <div className="dash-chip">
            <span className="dash-chip-value">{today.timerDone}</span>
            <span className="dash-chip-label">타이머</span>
          </div>
        </div>
      </div>

      {/* Rest Type Card */}
      {typeInfo ? (
        <button className="dash-rest-card stagger-item" onClick={() => navigate('/rest')}>
          <div className="dash-rest-left">
            <span className="dash-rest-icon">{typeInfo.icon}</span>
            <div>
              <span className="dash-rest-type">{typeInfo.name}</span>
              <span className="dash-rest-sub">오늘의 쉼 미션 보기</span>
            </div>
          </div>
          <span className="dash-rest-arrow">→</span>
        </button>
      ) : (
        <button className="dash-rest-card stagger-item no-type" onClick={() => navigate('/rest')}>
          <div className="dash-rest-left">
            <span className="dash-rest-icon">?</span>
            <div>
              <span className="dash-rest-type">쉼 유형 테스트</span>
              <span className="dash-rest-sub">나는 왜 못 쉴까? 알아보기</span>
            </div>
          </div>
          <span className="dash-rest-arrow">→</span>
        </button>
      )}

      {/* Daily Progress */}
      {today.restDone >= 3 && (
        <div className="dash-complete-banner">
          <span className="dash-complete-icon">✓</span>
          <span>오늘 쉼 미션을 모두 완료했어요!</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="dash-section-title">빠른 실행</div>
      <div className="dash-actions stagger-item">
        <button className="dash-action" onClick={() => navigate('/manage')} aria-label="소비 관리 페이지로 이동">
          <span className="dash-action-icon" aria-hidden="true">⚙</span>
          <span>소비 관리</span>
        </button>
        <button className="dash-action" onClick={() => navigate('/rest')} aria-label="쉼 미션 페이지로 이동">
          <span className="dash-action-icon" aria-hidden="true">↻</span>
          <span>쉼 미션</span>
        </button>
        <button className="dash-action" onClick={() => navigate('/community')} aria-label="커뮤니티 페이지로 이동">
          <span className="dash-action-icon" aria-hidden="true">◎</span>
          <span>커뮤니티</span>
        </button>
      </div>

      {/* Consumption Summary */}
      {today.ruleCount > 0 && (
        <>
          <div className="dash-section-title">소비 현황</div>
          <div className="dash-consumption">
            <div className="dash-consumption-row">
              <span>활성 규칙</span>
              <strong>{today.ruleCount}개</strong>
            </div>
            <div className="dash-consumption-row">
              <span>일일 예산</span>
              <strong>{today.totalLimit}분</strong>
            </div>
            <div className="dash-consumption-row">
              <span>오늘 타이머 완료</span>
              <strong>{today.timerDone}회</strong>
            </div>
            <button className="dash-consumption-link" onClick={() => navigate('/manage')}>
              규칙 관리하기 →
            </button>
          </div>
        </>
      )}
    </div>
    </PullToRefresh>
  );
}
