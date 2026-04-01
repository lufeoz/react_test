import { useState } from 'react';
import Home from './Home';
import Rules from './Rules';
import Filter from './Filter';
import Time from './Time';

const SETTING_TABS = [
  { id: 'channels', label: '채널', icon: '▶' },
  { id: 'rules', label: '규칙', icon: '⚙' },
  { id: 'filter', label: '필터', icon: '◇' },
  { id: 'time', label: '타이머', icon: '⏱' },
];

export default function Manage() {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState('channels');
  const [feedKey, setFeedKey] = useState(0);

  const closeSettings = () => {
    setShowSettings(false);
    setFeedKey(k => k + 1); // Force feed to re-mount and re-fetch
  };

  return (
    <div className="page">
      <header className="page-header-inline">
        <h1>Manage</h1>
        <p className="page-subtitle-inline">콘텐츠 소비를 내가 컨트롤</p>
        <button
          className="settings-gear"
          onClick={() => setShowSettings(true)}
          title="설정"
        >
          ⚙
        </button>
      </header>

      <Home key={feedKey} embedded />

      {showSettings && (
        <div className="settings-overlay" onClick={closeSettings}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>
            <div className="settings-header">
              <h2>설정</h2>
              <button className="settings-close" onClick={closeSettings}>×</button>
            </div>
            <div className="settings-tabs">
              {SETTING_TABS.map(t => (
                <button
                  key={t.id}
                  className={`settings-tab ${settingsTab === t.id ? 'active' : ''}`}
                  onClick={() => setSettingsTab(t.id)}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
            <div className="settings-content">
              {settingsTab === 'channels' && <Home embedded manageOnly />}
              {settingsTab === 'rules' && <Rules embedded />}
              {settingsTab === 'filter' && <Filter embedded />}
              {settingsTab === 'time' && <Time embedded />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
