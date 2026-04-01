import { useState, useEffect, useMemo } from 'react';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useLoginModal } from '../components/Login';

// === Badge Definitions ===
const BADGES = [
  { id: 'first_rule', icon: '🎯', name: '첫 규칙', desc: '소비 규칙을 처음 만들었어요', check: (d) => d.ruleCount >= 1 },
  { id: 'rule_master', icon: '⚙', name: '규칙 마스터', desc: '규칙을 5개 이상 만들었어요', check: (d) => d.ruleCount >= 5 },
  { id: 'strict_mode', icon: '🔒', name: '엄격 모드', desc: '모든 규칙이 30분 이하', check: (d) => d.ruleCount > 0 && d.allRulesUnder30 },
  { id: 'first_timer', icon: '⏱', name: '첫 타이머', desc: '타이머를 처음 완료했어요', check: (d) => d.timerCompleted >= 1 },
  { id: 'timer_5', icon: '⏰', name: '시간 수호자', desc: '타이머를 5회 완료했어요', check: (d) => d.timerCompleted >= 5 },
  { id: 'timer_20', icon: '🏆', name: '타임 챔피언', desc: '타이머를 20회 완료했어요', check: (d) => d.timerCompleted >= 20 },
  { id: 'first_filter', icon: '🚫', name: '첫 필터', desc: '노이즈 필터를 처음 설정했어요', check: (d) => d.filterCount >= 1 },
  { id: 'filter_heavy', icon: '🛡', name: '방패막', desc: '필터를 5개 이상 활성화했어요', check: (d) => d.activeFilterCount >= 5 },
  { id: 'first_reset', icon: '🌿', name: '첫 리셋', desc: '리셋 프로그램을 처음 완료했어요', check: (d) => d.resetCompleted >= 1 },
  { id: 'reset_10', icon: '🧘', name: '마음챙김', desc: '리셋을 10회 완료했어요', check: (d) => d.resetCompleted >= 10 },
  { id: 'diet_start', icon: '🌱', name: '다이어트 시작', desc: '디지털 다이어트를 시작했어요', check: (d) => d.dietStarted },
  { id: 'diet_mission', icon: '✅', name: '미션 클리어', desc: '다이어트 미션을 3개 완료했어요', check: (d) => d.missionsCompleted >= 3 },
  { id: 'diet_week', icon: '🔥', name: '일주일 달성', desc: '7일 미션을 모두 완료했어요', check: (d) => d.missionsCompleted >= 7 },
  { id: 'feed_custom', icon: '📡', name: '내 피드', desc: '피드 그룹을 직접 만들었어요', check: (d) => d.feedGroupCount >= 4 },
  { id: 'streak_3', icon: '🔥', name: '3일 연속', desc: '3일 연속 앱을 사용했어요', check: (d) => d.streak >= 3 },
  { id: 'streak_7', icon: '💎', name: '7일 연속', desc: '일주일 연속 사용했어요', check: (d) => d.streak >= 7 },
  { id: 'streak_30', icon: '👑', name: '30일 연속', desc: '한 달 연속 사용했어요', check: (d) => d.streak >= 30 },
];

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// Log a daily activity increment
export function logDailyActivity(type) {
  // This still uses localStorage as a quick write - DataContext will sync
  const log = JSON.parse(localStorage.getItem('dailyLog') || '{}');
  const today = new Date().toISOString().slice(0, 10);
  if (!log[today]) log[today] = { timer: 0, reset: 0, mission: 0 };
  log[today][type] = (log[today][type] || 0) + 1;
  localStorage.setItem('dailyLog', JSON.stringify(log));
}

export default function MyPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { user, profile, updateProfile, signOut } = useAuth();
  const { load, save } = useData();
  const { requireLogin } = useLoginModal();
  const [tab, setTab] = useState('profile');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: profile?.name || '', goal: profile?.goal || '' });
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (profile) setDraft({ name: profile.name || '', goal: profile.goal || '' });
  }, [profile]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const data = useMemo(() => {
    const rules = load('consumptionRules') || [];
    const filters = load('noiseFilters') || [];
    const feeds = load('focusFeeds') || [];
    const containers = load('timeContainers') || [];
    const achStats = load('achievementStats') || {};
    const visits = load('visitDays') || [];
    const programs = load('dietPrograms') || {};

    // Streak calculation
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
      activeRules: rules.filter(r => r.enabled).length,
      allRulesUnder30: rules.length > 0 && rules.every(r => r.limit <= 30),
      dailyLimit: rules.filter(r => r.enabled).reduce((s, r) => s + (r.limit || 0), 0),
      filterCount: filters.length,
      activeFilterCount: filters.filter(f => f.enabled).length,
      feedGroupCount: feeds.length,
      containerCount: containers.length,
      timerCompleted: achStats.timerCompleted || 0,
      resetCompleted: achStats.resetCompleted || 0,
      dietStarted: !!programs && Object.keys(programs).length > 0,
      missionsCompleted: achStats.missionsCompleted || totalMissions,
      totalVisits: allVisits.length,
      streak,
    };
  }, [load]);

  const weeklyData = useMemo(() => {
    const log = load('dailyLog') || {};
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entry = log[key] || { timer: 0, reset: 0, mission: 0 };
      days.push({
        key,
        label: DAY_LABELS[d.getDay()],
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        isToday: i === 0,
        ...entry,
      });
    }
    return days;
  }, [load]);

  const saveProfile = async () => {
    try {
      await updateProfile({ name: draft.name, goal: draft.goal });
      setEditing(false);
      toast('프로필이 저장되었습니다');
    } catch {
      toast('저장에 실패했습니다', 'error');
    }
  };

  const resetOnboarding = async () => {
    if (!await confirm('온보딩을 다시 시작할까요?')) return;
    await updateProfile({ onboarding_done: false });
    window.location.reload();
  };

  const handleLogout = async () => {
    if (!await confirm('로그아웃 하시겠습니까?')) return;
    await signOut();
  };

  const resetAllData = async () => {
    if (!await confirm('모든 데이터가 삭제됩니다.\n이 작업은 되돌릴 수 없습니다.')) return;
    localStorage.clear();
    await signOut();
  };

  const unlocked = BADGES.filter(b => b.check(data));
  const locked = BADGES.filter(b => !b.check(data));
  const badgeProgress = Math.round((unlocked.length / BADGES.length) * 100);

  // Not logged in → login prompt
  if (!user) {
    return (
      <div className="page">
        <header className="page-header">
          <h1>My Page</h1>
          <p className="page-subtitle">내 소비 관리 현황</p>
        </header>
        <div className="empty-state" style={{ marginTop: 40 }}>
          <p className="empty-icon">⊙</p>
          <p className="empty-text">로그인하면 내 데이터를 관리할 수 있어요</p>
          <p className="empty-sub">소비 기록, 배지, 리포트를 확인하세요</p>
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => requireLogin('마이페이지를 이용하려면 로그인이 필요합니다')}>
            로그인 / 가입하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>My Page</h1>
        <p className="page-subtitle">내 소비 관리 현황</p>
      </header>

      {/* Profile */}
      <div className="mypage-profile">
        <div className="mypage-avatar">
          {profile?.name ? profile.name[0].toUpperCase() : '?'}
        </div>
        {editing ? (
          <div className="mypage-edit-form">
            <input type="text" placeholder="이름" value={draft.name}
              onChange={e => setDraft({ ...draft, name: e.target.value })}
              className="mypage-input" autoFocus />
            <input type="text" placeholder="목표 (예: 하루 1시간 이하 소비)" value={draft.goal}
              onChange={e => setDraft({ ...draft, goal: e.target.value })}
              className="mypage-input" />
            <div className="mypage-edit-actions">
              <button className="btn-small" onClick={saveProfile}>저장</button>
              <button className="btn-small btn-ghost" onClick={() => { setDraft({ name: profile?.name || '', goal: profile?.goal || '' }); setEditing(false); }}>취소</button>
            </div>
          </div>
        ) : (
          <div className="mypage-info" onClick={() => setEditing(true)}>
            <span className="mypage-name">{profile?.name || '이름을 설정하세요'}</span>
            <span className="mypage-goal">{profile?.goal || '목표를 설정하세요'}</span>
            <span className="mypage-edit-hint">탭하여 수정</span>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="rules-tab-bar">
        <button className={`rules-tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
          내 현황
        </button>
        <button className={`rules-tab ${tab === 'report' ? 'active' : ''}`} onClick={() => setTab('report')}>
          리포트
        </button>
        <button className={`rules-tab ${tab === 'badges' ? 'active' : ''}`} onClick={() => setTab('badges')}>
          배지
        </button>
        <button className={`rules-tab ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>
          설정
        </button>
      </div>

      {/* ===== PROFILE TAB ===== */}
      {tab === 'profile' && (
        <>
          <div className="mypage-section">
            <div className="mypage-section-title">활동 요약</div>
            <div className="mypage-stats-grid">
              <div className="mypage-stat">
                <span className="mypage-stat-value">{data.streak || 0}</span>
                <span className="mypage-stat-label">연속 사용일</span>
              </div>
              <div className="mypage-stat">
                <span className="mypage-stat-value">{data.timerCompleted || 0}</span>
                <span className="mypage-stat-label">타이머 완료</span>
              </div>
              <div className="mypage-stat">
                <span className="mypage-stat-value">{data.resetCompleted || 0}</span>
                <span className="mypage-stat-label">리셋 완료</span>
              </div>
              <div className="mypage-stat">
                <span className="mypage-stat-value">{data.missionsCompleted || 0}</span>
                <span className="mypage-stat-label">미션 완료</span>
              </div>
            </div>
          </div>

          <div className="mypage-section">
            <div className="mypage-section-title">현재 설정</div>
            <div className="mypage-settings-list">
              <div className="mypage-setting-row">
                <span className="mypage-setting-icon">⚙</span>
                <span className="mypage-setting-label">활성 규칙</span>
                <span className="mypage-setting-value">{data.activeRules || 0}개</span>
              </div>
              <div className="mypage-setting-row">
                <span className="mypage-setting-icon">⏱</span>
                <span className="mypage-setting-label">일일 제한</span>
                <span className="mypage-setting-value">{data.dailyLimit || 0}분</span>
              </div>
              <div className="mypage-setting-row">
                <span className="mypage-setting-icon">✕</span>
                <span className="mypage-setting-label">활성 필터</span>
                <span className="mypage-setting-value">{data.activeFilterCount || 0}개</span>
              </div>
              <div className="mypage-setting-row">
                <span className="mypage-setting-icon">◷</span>
                <span className="mypage-setting-label">타임 컨테이너</span>
                <span className="mypage-setting-value">{data.containerCount || 0}개</span>
              </div>
              <div className="mypage-setting-row">
                <span className="mypage-setting-icon">📅</span>
                <span className="mypage-setting-label">총 방문일</span>
                <span className="mypage-setting-value">{data.totalVisits || 0}일</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ===== REPORT TAB ===== */}
      {tab === 'report' && (() => {
        const weekTotal = { timer: 0, reset: 0, mission: 0 };
        weeklyData.forEach(d => { weekTotal.timer += d.timer; weekTotal.reset += d.reset; weekTotal.mission += d.mission; });
        const maxVal = Math.max(1, ...weeklyData.map(d => d.timer + d.reset + d.mission));
        return (
          <>
            <div className="mypage-section">
              <div className="mypage-section-title">이번 주 요약</div>
              <div className="mypage-stats-grid">
                <div className="mypage-stat">
                  <span className="mypage-stat-value">{weekTotal.timer}</span>
                  <span className="mypage-stat-label">타이머 완료</span>
                </div>
                <div className="mypage-stat">
                  <span className="mypage-stat-value">{weekTotal.reset}</span>
                  <span className="mypage-stat-label">리셋 완료</span>
                </div>
                <div className="mypage-stat">
                  <span className="mypage-stat-value">{weekTotal.mission}</span>
                  <span className="mypage-stat-label">미션 완료</span>
                </div>
                <div className="mypage-stat">
                  <span className="mypage-stat-value">{weekTotal.timer + weekTotal.reset + weekTotal.mission}</span>
                  <span className="mypage-stat-label">총 활동</span>
                </div>
              </div>
            </div>

            <div className="mypage-section">
              <div className="mypage-section-title">일별 활동</div>
              <div className="weekly-chart">
                {weeklyData.map(d => {
                  const total = d.timer + d.reset + d.mission;
                  const height = Math.max(4, (total / maxVal) * 100);
                  return (
                    <div key={d.key} className={`weekly-bar-col ${d.isToday ? 'today' : ''}`}>
                      <div className="weekly-bar-wrap">
                        <div className="weekly-bar" style={{ height: `${height}%` }}>
                          {d.timer > 0 && <div className="bar-segment bar-timer" style={{ flex: d.timer }} />}
                          {d.reset > 0 && <div className="bar-segment bar-reset" style={{ flex: d.reset }} />}
                          {d.mission > 0 && <div className="bar-segment bar-mission" style={{ flex: d.mission }} />}
                          {total === 0 && <div className="bar-segment bar-empty" style={{ flex: 1 }} />}
                        </div>
                        {total > 0 && <span className="weekly-bar-value">{total}</span>}
                      </div>
                      <span className="weekly-bar-label">{d.label}</span>
                      <span className="weekly-bar-date">{d.date}</span>
                    </div>
                  );
                })}
              </div>
              <div className="weekly-legend">
                <span className="legend-item"><span className="legend-dot timer" />타이머</span>
                <span className="legend-item"><span className="legend-dot reset" />리셋</span>
                <span className="legend-item"><span className="legend-dot mission" />미션</span>
              </div>
            </div>
          </>
        );
      })()}

      {/* ===== BADGES TAB ===== */}
      {tab === 'badges' && (
        <>
          <div className="achievement-progress">
            <div className="achievement-ring">
              <svg viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" className="achievement-track" />
                <circle cx="60" cy="60" r="52" className="achievement-fill"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  strokeDashoffset={`${2 * Math.PI * 52 * (1 - badgeProgress / 100)}`}
                />
              </svg>
              <div className="achievement-ring-center">
                <span className="achievement-percent">{badgeProgress}%</span>
              </div>
            </div>
            <div className="achievement-streak">
              <span className="streak-icon">🔥</span>
              <span className="streak-count">{data.streak}일 연속</span>
            </div>
          </div>

          {unlocked.length > 0 && (
            <div className="badge-section">
              <div className="badge-section-title">달성한 배지</div>
              <div className="badge-grid">
                {unlocked.map(b => (
                  <button key={b.id} className="badge-card unlocked"
                    onClick={() => setSelectedBadge(selectedBadge?.id === b.id ? null : b)}>
                    <span className="badge-icon">{b.icon}</span>
                    <span className="badge-name">{b.name}</span>
                    {selectedBadge?.id === b.id && <span className="badge-desc">{b.desc}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {locked.length > 0 && (
            <div className="badge-section">
              <div className="badge-section-title">도전 중</div>
              <div className="badge-grid">
                {locked.map(b => (
                  <button key={b.id} className="badge-card locked"
                    onClick={() => setSelectedBadge(selectedBadge?.id === b.id ? null : b)}>
                    <span className="badge-icon">{b.icon}</span>
                    <span className="badge-name">{b.name}</span>
                    {selectedBadge?.id === b.id && <span className="badge-desc">{b.desc}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== SETTINGS TAB ===== */}
      {tab === 'settings' && (
        <div className="mypage-section">
          <div className="mypage-section-title">화면</div>
          <div className="mypage-settings-list" style={{ marginBottom: 20 }}>
            <div className="mypage-setting-row">
              <span className="mypage-setting-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
              <span className="mypage-setting-label">테마</span>
              <div
                className={`switch ${theme === 'dark' ? 'on' : 'off'}`}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <div className="switch-thumb" />
              </div>
            </div>
            <div className="mypage-setting-hint">
              {theme === 'dark' ? '다크 모드' : '라이트 모드'}
            </div>
          </div>

          <div className="mypage-section-title">계정</div>
          <div className="mypage-actions">
            {user ? (
              <>
                <button className="mypage-action-btn" onClick={resetOnboarding}>
                  <span>↻</span>
                  <span>온보딩 다시 하기</span>
                </button>
                <button className="mypage-action-btn danger" onClick={resetAllData}>
                  <span>⚠</span>
                  <span>모든 데이터 초기화</span>
                </button>
                <button className="mypage-action-btn" onClick={handleLogout}>
                  <span>↩</span>
                  <span>로그아웃</span>
                </button>
              </>
            ) : (
              <button className="mypage-action-btn" onClick={() => requireLogin('데이터를 클라우드에 저장하려면 로그인하세요')}>
                <span>→</span>
                <span>로그인 / 가입하기</span>
              </button>
            )}
          </div>
          <div className="mypage-version">DigiControl v1.0</div>
        </div>
      )}
    </div>
  );
}
