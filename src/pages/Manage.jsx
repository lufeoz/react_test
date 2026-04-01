import { useState } from 'react';
import Home from './Home';
import Rules from './Rules';
import Filter from './Filter';
import Time from './Time';

export default function Manage() {
  const [tab, setTab] = useState('feed');

  return (
    <div className="page">
      <header className="page-header">
        <h1>Manage</h1>
        <p className="page-subtitle">콘텐츠 소비를 내가 컨트롤</p>
      </header>

      <div className="rules-tab-bar">
        <button className={`rules-tab ${tab === 'feed' ? 'active' : ''}`} onClick={() => setTab('feed')}>
          피드
        </button>
        <button className={`rules-tab ${tab === 'rules' ? 'active' : ''}`} onClick={() => setTab('rules')}>
          규칙
        </button>
        <button className={`rules-tab ${tab === 'filter' ? 'active' : ''}`} onClick={() => setTab('filter')}>
          필터
        </button>
        <button className={`rules-tab ${tab === 'time' ? 'active' : ''}`} onClick={() => setTab('time')}>
          타이머
        </button>
      </div>

      <div key={tab} className="tab-fade-in">
        {tab === 'feed' && <Home embedded />}
        {tab === 'rules' && <Rules embedded />}
        {tab === 'filter' && <Filter embedded />}
        {tab === 'time' && <Time embedded />}
      </div>
    </div>
  );
}
