import { useState, useMemo } from 'react';
import { useToast } from '../components/Toast';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useLoginModal } from '../components/Login';

const SAMPLE_VIDEOS = {
  '디자인': [
    { id: 'v1', title: 'Figma for Beginners', channel: 'Figma', videoId: 'FTFaQWZBqQ8', duration: '24:03', uploaded: '2일 전' },
    { id: 'v2', title: 'UI Design Tutorial', channel: 'Figma', videoId: 'HZuk6Wkx_Eg', duration: '14:21', uploaded: '5일 전' },
    { id: 'v3', title: 'Design Systems Explained', channel: 'Dribbble Weekly', videoId: 'Dtd40cHQQlk', duration: '10:47', uploaded: '1일 전' },
  ],
  '개발': [
    { id: 'v4', title: 'React in 100 Seconds', channel: 'Fireship', videoId: 'Tn6-PIqc4UM', duration: '2:19', uploaded: '3일 전' },
    { id: 'v5', title: 'JavaScript Promises', channel: 'Fireship', videoId: 'RvYYCGs45L4', duration: '11:28', uploaded: '1일 전' },
    { id: 'v6', title: 'CSS in 100 Seconds', channel: 'Fireship', videoId: 'OEV8gMkCHXQ', duration: '2:15', uploaded: '4일 전' },
  ],
  '책 & 생각': [
    { id: 'v7', title: 'The Power of Reading', channel: '책 읽는 밤', videoId: 'Y_Z0YhGBaKI', duration: '15:03', uploaded: '2일 전' },
    { id: 'v8', title: 'How to Read More Books', channel: '책 읽는 밤', videoId: 'lIW5jBrrsS0', duration: '12:44', uploaded: '6일 전' },
  ],
  '친구': [
    { id: 'v9', title: '주말 브이로그', channel: '민수', videoId: null, duration: '', uploaded: '오늘' },
    { id: 'v10', title: '카페 추천', channel: '지연', videoId: null, duration: '', uploaded: '어제' },
  ],
};

const DEFAULT_FEEDS = [
  {
    id: 1,
    name: '디자인',
    icon: '🎨',
    channels: [
      { id: 1, name: 'Figma', platform: 'YouTube', active: true },
      { id: 2, name: 'Dribbble Weekly', platform: 'Newsletter', active: true },
    ],
  },
  {
    id: 2,
    name: '개발',
    icon: '💻',
    channels: [
      { id: 3, name: 'Fireship', platform: 'YouTube', active: true },
      { id: 4, name: 'Theo', platform: 'YouTube', active: true },
    ],
  },
  {
    id: 3,
    name: '책 & 생각',
    icon: '📚',
    channels: [
      { id: 5, name: '책 읽는 밤', platform: 'YouTube', active: true },
    ],
  },
  {
    id: 4,
    name: '친구',
    icon: '👥',
    channels: [
      { id: 6, name: '가까운 친구 8명', platform: 'Instagram', active: true },
    ],
  },
];

export default function Home({ embedded = false }) {
  const toast = useToast();
  const { user } = useAuth();
  const { requireLogin } = useLoginModal();
  const { load, save } = useData();
  const [feeds, setFeeds] = useState(() => {
    return load('focusFeeds') || DEFAULT_FEEDS;
  });
  const [activeFeed, setActiveFeed] = useState(null);
  const [viewMode, setViewMode] = useState('feed'); // 'feed' | 'manage'
  const [playingVideo, setPlayingVideo] = useState(null);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupIcon, setNewGroupIcon] = useState('📌');
  const [showAddChannel, setShowAddChannel] = useState(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelPlatform, setNewChannelPlatform] = useState('YouTube');

  const saveFeeds = (updated) => {
    setFeeds(updated);
    save('focusFeeds', updated);
  };

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    const updated = [...feeds, {
      id: Date.now(),
      name: newGroupName.trim(),
      icon: newGroupIcon,
      channels: [],
    }];
    saveFeeds(updated);
    setNewGroupName('');
    setNewGroupIcon('📌');
    setShowAddGroup(false);
    toast('그룹이 추가되었습니다');
  };

  const removeGroup = (groupId) => {
    saveFeeds(feeds.filter(f => f.id !== groupId));
    if (activeFeed === groupId) setActiveFeed(null);
    toast('그룹이 삭제되었습니다');
  };

  const addChannel = (groupId) => {
    if (!newChannelName.trim()) return;
    const updated = feeds.map(f => {
      if (f.id !== groupId) return f;
      return {
        ...f,
        channels: [...f.channels, {
          id: Date.now(),
          name: newChannelName.trim(),
          platform: newChannelPlatform,
          active: true,
        }],
      };
    });
    saveFeeds(updated);
    setNewChannelName('');
    setShowAddChannel(null);
    toast('채널이 추가되었습니다');
  };

  const toggleChannel = (groupId, channelId) => {
    const updated = feeds.map(f => {
      if (f.id !== groupId) return f;
      return {
        ...f,
        channels: f.channels.map(c =>
          c.id === channelId ? { ...c, active: !c.active } : c
        ),
      };
    });
    saveFeeds(updated);
  };

  const removeChannel = (groupId, channelId) => {
    const updated = feeds.map(f => {
      if (f.id !== groupId) return f;
      return { ...f, channels: f.channels.filter(c => c.id !== channelId) };
    });
    saveFeeds(updated);
  };

  // Get videos for current feed selection
  const getVideos = () => {
    if (activeFeed === null) {
      return feeds.flatMap(feed => (SAMPLE_VIDEOS[feed.name] || []).map(v => ({ ...v, group: feed.name, groupIcon: feed.icon })));
    }
    const feed = feeds.find(f => f.id === activeFeed);
    if (!feed) return [];
    return (SAMPLE_VIDEOS[feed.name] || []).map(v => ({ ...v, group: feed.name, groupIcon: feed.icon }));
  };

  const videos = getVideos();

  // Today's summary
  const today = useMemo(() => {
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
    // streak
    const sorted = [...new Set(visits)].sort().reverse();
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < sorted.length; i++) {
      const expected = new Date(d);
      expected.setDate(expected.getDate() - i);
      if (sorted[i] === expected.toISOString().slice(0, 10)) streak++;
      else break;
    }
    return { totalLimit, ruleCount: activeRules.length, timerDone, resetDone, streak };
  }, []);

  // Playing a video
  if (playingVideo) {
    return (
      <div className="page">
        <div className="video-player">
          <button className="video-back" onClick={() => setPlayingVideo(null)}>← 돌아가기</button>
          {playingVideo.videoId ? (
            <div className="video-embed">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${playingVideo.videoId}?autoplay=1&rel=0`}
                title={playingVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
          ) : (
            <div className="video-placeholder">
              <span className="placeholder-icon">📱</span>
              <span className="placeholder-text">SNS 콘텐츠</span>
            </div>
          )}
          <div className="video-info">
            <h2 className="video-title">{playingVideo.title}</h2>
            <div className="video-meta">
              <span className="video-channel">{playingVideo.channel}</span>
              <span className="video-uploaded">{playingVideo.uploaded}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const feedContent = (
    <>
      <div className="feed-header-row">
        <button
          className={`mode-toggle ${viewMode === 'manage' ? 'active' : ''}`}
          onClick={() => {
            if (viewMode === 'feed' && !user) {
              requireLogin('피드를 관리하려면 로그인이 필요합니다');
              return;
            }
            setViewMode(viewMode === 'feed' ? 'manage' : 'feed');
          }}
        >
          {viewMode === 'feed' ? '채널 관리' : '피드 보기'}
        </button>
      </div>

      <div className="feed-tabs">
        <button
          className={`feed-tab ${activeFeed === null ? 'active' : ''}`}
          onClick={() => setActiveFeed(null)}
        >
          전체
        </button>
        {feeds.map(feed => (
          <button
            key={feed.id}
            className={`feed-tab ${activeFeed === feed.id ? 'active' : ''}`}
            onClick={() => setActiveFeed(feed.id)}
          >
            {feed.icon} {feed.name}
          </button>
        ))}
      </div>

      {viewMode === 'feed' ? (
        /* ===== Feed View: Video List ===== */
        <div className="video-list">
          {videos.length === 0 ? (
            <div className="empty-state">
              <p className="empty-icon">📭</p>
              <p className="empty-text">이 피드에 콘텐츠가 없습니다</p>
              <button className="btn-small" onClick={() => setViewMode('manage')}>채널 추가하기</button>
            </div>
          ) : (
            videos.map(video => (
              <div
                key={video.id}
                className="video-card"
                onClick={() => setPlayingVideo(video)}
              >
                <div className="video-thumbnail">
                  {video.videoId ? (
                    <img
                      src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                      alt={video.title}
                    />
                  ) : (
                    <div className="thumb-placeholder">📱</div>
                  )}
                  {video.duration && <span className="video-duration">{video.duration}</span>}
                </div>
                <div className="video-card-info">
                  <p className="video-card-title">{video.title}</p>
                  <div className="video-card-meta">
                    <span>{video.channel}</span>
                    <span className="meta-dot">·</span>
                    <span>{video.uploaded}</span>
                    {activeFeed === null && (
                      <>
                        <span className="meta-dot">·</span>
                        <span className="video-group-tag">{video.groupIcon} {video.group}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ===== Manage View: Channel Management ===== */
        <div className="feed-groups">
          {feeds.map(feed => (
            <div key={feed.id} className="feed-group-card">
              <div className="feed-group-header">
                <span className="feed-group-title">
                  {feed.icon} {feed.name}
                </span>
                <div className="feed-group-actions">
                  <button
                    className="btn-icon"
                    onClick={() => setShowAddChannel(showAddChannel === feed.id ? null : feed.id)}
                  >+</button>
                  <button className="btn-icon btn-danger" onClick={() => removeGroup(feed.id)}>×</button>
                </div>
              </div>
              <div className="channel-list">
                {feed.channels.map(ch => (
                  <div key={ch.id} className={`channel-item ${ch.active ? '' : 'muted'}`}>
                    <div className="channel-info" onClick={() => toggleChannel(feed.id, ch.id)}>
                      <span className={`channel-dot ${ch.active ? 'on' : 'off'}`} />
                      <span className="channel-name">{ch.name}</span>
                      <span className="channel-platform">{ch.platform}</span>
                    </div>
                    <button className="btn-remove" onClick={() => removeChannel(feed.id, ch.id)}>×</button>
                  </div>
                ))}
                {feed.channels.length === 0 && (
                  <p className="empty-hint">채널을 추가해보세요</p>
                )}
              </div>
              {showAddChannel === feed.id && (
                <div className="add-form inline-form">
                  <input
                    type="text"
                    placeholder="채널 이름"
                    value={newChannelName}
                    onChange={e => setNewChannelName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addChannel(feed.id)}
                  />
                  <select value={newChannelPlatform} onChange={e => setNewChannelPlatform(e.target.value)}>
                    <option>YouTube</option>
                    <option>Instagram</option>
                    <option>Twitter</option>
                    <option>Newsletter</option>
                    <option>Blog</option>
                    <option>Podcast</option>
                  </select>
                  <button className="btn-small" onClick={() => addChannel(feed.id)}>추가</button>
                </div>
              )}
            </div>
          ))}

          {showAddGroup ? (
            <div className="feed-group-card add-group-card">
              <div className="add-form">
                <div className="add-form-row">
                  <select value={newGroupIcon} onChange={e => setNewGroupIcon(e.target.value)} className="icon-select">
                    <option>📌</option>
                    <option>🎨</option>
                    <option>💻</option>
                    <option>📚</option>
                    <option>🎵</option>
                    <option>🏃</option>
                    <option>🍳</option>
                    <option>👥</option>
                    <option>📰</option>
                    <option>🎮</option>
                  </select>
                  <input
                    type="text"
                    placeholder="그룹 이름 (예: 음악)"
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addGroup()}
                    autoFocus
                  />
                </div>
                <div className="add-form-actions">
                  <button className="btn-small" onClick={addGroup}>만들기</button>
                  <button className="btn-small btn-ghost" onClick={() => setShowAddGroup(false)}>취소</button>
                </div>
              </div>
            </div>
          ) : (
            <button className="add-group-btn" onClick={() => setShowAddGroup(true)}>
              + 새 그룹 만들기
            </button>
          )}
        </div>
      )}
    </>
  );

  if (embedded) return feedContent;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header-row">
          <div>
            <h1>Focus Feed</h1>
            <p className="page-subtitle">내가 선택한 콘텐츠만</p>
          </div>
        </div>
      </header>

      <div className="today-summary">
        <div className="today-summary-main">
          <span className="today-label">오늘의 콘텐츠 예산</span>
          <span className="today-limit">{today.totalLimit}분</span>
        </div>
        <div className="today-chips">
          <span className="today-chip">🔥 {today.streak}일 연속</span>
          <span className="today-chip">⚙ 규칙 {today.ruleCount}개</span>
          <span className="today-chip">⏱ 타이머 {today.timerDone}회</span>
          <span className="today-chip">↻ 리셋 {today.resetDone}회</span>
        </div>
      </div>

      {feedContent}
    </div>
  );
}
