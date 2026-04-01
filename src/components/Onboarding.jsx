import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const STEPS = [
  {
    id: 'welcome',
    title: '환영합니다',
    subtitle: '내가 선택한 콘텐츠만,\n내가 정한 방식으로.',
  },
  {
    id: 'problem',
    title: '이런 경험 있으신가요?',
    subtitle: '',
    items: [
      { icon: '📱', text: '쇼츠를 보다가 1시간이 지나있었다' },
      { icon: '🎯', text: '알고리즘이 보여주는 대로 콘텐츠를 봤다' },
      { icon: '😴', text: '자기 전에 폰을 보다가 늦게 잤다' },
      { icon: '🔄', text: '의미 없는 스크롤을 반복했다' },
    ],
  },
  {
    id: 'feeds',
    title: '어떤 콘텐츠에 관심있나요?',
    subtitle: '피드 그룹을 선택하세요',
  },
  {
    id: 'rules',
    title: '소비 규칙을 정해볼까요?',
    subtitle: '나중에 언제든 바꿀 수 있어요',
  },
  {
    id: 'done',
    title: '준비 완료!',
    subtitle: '이제 콘텐츠 소비를\n당신이 컨트롤합니다.',
  },
];

const FEED_PRESETS = [
  { icon: '🎨', name: '디자인', selected: false },
  { icon: '💻', name: '개발', selected: false },
  { icon: '📚', name: '책 & 생각', selected: false },
  { icon: '🎵', name: '음악', selected: false },
  { icon: '🏃', name: '운동 & 건강', selected: false },
  { icon: '🍳', name: '요리', selected: false },
  { icon: '📰', name: '뉴스', selected: false },
  { icon: '🎮', name: '게임', selected: false },
  { icon: '👥', name: '친구', selected: false },
  { icon: '📸', name: '사진 & 영상', selected: false },
];

const RULE_PRESETS = [
  { icon: '▶', category: 'YouTube', limit: 30, unit: 'min/day', enabled: true },
  { icon: '💬', category: 'SNS', limit: 20, unit: 'min/day', enabled: true },
  { icon: '📰', category: '뉴스', limit: 5, unit: 'articles/day', enabled: false },
  { icon: '⚡', category: '쇼츠/릴스', limit: 0, unit: 'min/day', enabled: false },
];

export default function Onboarding({ onComplete }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [selectedFeeds, setSelectedFeeds] = useState(FEED_PRESETS.map(f => ({ ...f })));
  const [selectedRules, setSelectedRules] = useState(RULE_PRESETS.map((r, i) => ({ ...r, id: i + 1 })));
  const [saving, setSaving] = useState(false);

  const current = STEPS[step];

  const toggleFeed = (index) => {
    setSelectedFeeds(prev => prev.map((f, i) => i === index ? { ...f, selected: !f.selected } : f));
  };

  const toggleRule = (index) => {
    setSelectedRules(prev => prev.map((r, i) => i === index ? { ...r, enabled: !r.enabled } : r));
  };

  const adjustLimit = (index, delta) => {
    setSelectedRules(prev => prev.map((r, i) => {
      if (i !== index) return r;
      const newLimit = Math.max(0, r.limit + delta);
      return { ...r, limit: newLimit };
    }));
  };

  const finish = async () => {
    setSaving(true);

    const feeds = selectedFeeds
      .filter(f => f.selected)
      .map((f, i) => ({
        id: i + 1,
        name: f.name,
        icon: f.icon,
        channels: [],
      }));

    const rules = selectedRules
      .filter(r => r.enabled)
      .map((r, i) => ({ ...r, id: Date.now() + i }));

    try {
      // Save settings to Supabase
      await supabase.from('user_settings').update({
        focus_feeds: feeds,
        consumption_rules: rules,
      }).eq('id', user.id);

      // Mark onboarding done
      await supabase.from('profiles').update({
        onboarding_done: true,
      }).eq('id', user.id);
      localStorage.setItem('onboarding_done', 'true');

      onComplete();
    } catch {
      // Fallback to localStorage if Supabase fails
      if (feeds.length > 0) {
        localStorage.setItem('focusFeeds', JSON.stringify(feeds));
      }
      if (rules.length > 0) {
        localStorage.setItem('consumptionRules', JSON.stringify(rules));
      }
      localStorage.setItem('onboardingDone', 'true');
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else finish();
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const canProceed = () => {
    if (current.id === 'feeds') return selectedFeeds.some(f => f.selected);
    return !saving;
  };

  return (
    <div className="onboarding">
      {/* Progress */}
      <div className="onboarding-progress">
        {STEPS.map((_, i) => (
          <div key={i} className={`progress-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
        ))}
      </div>

      <div className="onboarding-content">
        {/* Welcome */}
        {current.id === 'welcome' && (
          <div className="onboarding-hero">
            <div className="hero-logo">◉</div>
            <h1 className="hero-title">{current.title}</h1>
            <p className="hero-subtitle">{current.subtitle}</p>
          </div>
        )}

        {/* Problem */}
        {current.id === 'problem' && (
          <div className="onboarding-section">
            <h2 className="onboarding-title">{current.title}</h2>
            <div className="problem-list">
              {current.items.map((item, i) => (
                <div key={i} className="problem-item">
                  <span className="problem-icon">{item.icon}</span>
                  <span className="problem-text">{item.text}</span>
                </div>
              ))}
            </div>
            <p className="onboarding-message">
              이 앱은 알고리즘이 아니라<br />
              <strong>당신의 규칙</strong>으로 콘텐츠를 봅니다.
            </p>
          </div>
        )}

        {/* Feed Selection */}
        {current.id === 'feeds' && (
          <div className="onboarding-section">
            <h2 className="onboarding-title">{current.title}</h2>
            <p className="onboarding-hint">{current.subtitle}</p>
            <div className="feed-select-grid">
              {selectedFeeds.map((feed, i) => (
                <button
                  key={i}
                  className={`feed-select-item ${feed.selected ? 'selected' : ''}`}
                  onClick={() => toggleFeed(i)}
                >
                  <span className="feed-select-icon">{feed.icon}</span>
                  <span className="feed-select-name">{feed.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rules */}
        {current.id === 'rules' && (
          <div className="onboarding-section">
            <h2 className="onboarding-title">{current.title}</h2>
            <p className="onboarding-hint">{current.subtitle}</p>
            <div className="rule-select-list">
              {selectedRules.map((rule, i) => (
                <div key={i} className={`rule-select-item ${rule.enabled ? 'active' : ''}`}>
                  <div className="rule-select-top" onClick={() => toggleRule(i)}>
                    <span className={`toggle ${rule.enabled ? 'on' : 'off'}`} />
                    <span className="rule-select-icon">{rule.icon}</span>
                    <span className="rule-select-category">{rule.category}</span>
                  </div>
                  {rule.enabled && (
                    <div className="rule-select-config">
                      <button className="btn-adjust" onClick={() => adjustLimit(i, -5)}>−</button>
                      <span className="rule-select-value">{rule.limit}</span>
                      <button className="btn-adjust" onClick={() => adjustLimit(i, 5)}>+</button>
                      <span className="rule-select-unit">{rule.unit}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Done */}
        {current.id === 'done' && (
          <div className="onboarding-hero">
            <div className="hero-logo done">✓</div>
            <h1 className="hero-title">{current.title}</h1>
            <p className="hero-subtitle">{current.subtitle}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="onboarding-nav">
        {step > 0 && (
          <button className="btn-onboarding-back" onClick={back}>이전</button>
        )}
        <button
          className="btn-onboarding-next"
          onClick={next}
          disabled={!canProceed()}
        >
          {saving ? '저장 중...' : step === STEPS.length - 1 ? '시작하기' : '다음'}
        </button>
      </div>
    </div>
  );
}
