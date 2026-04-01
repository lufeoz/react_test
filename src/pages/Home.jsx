import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useToast } from '../components/Toast';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useLoginModal } from '../components/Login';
import { fetchVideosByChannelName, fetchPlaylistsByChannelName, fetchPlaylistVideos, findChannelId, searchChannels, hasApiKey } from '../lib/youtube';


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

export default function Home({ embedded = false, manageOnly = false }) {
  const toast = useToast();
  const { user } = useAuth();
  const { requireLogin } = useLoginModal();
  const { load, save } = useData();
  const [feeds, setFeeds] = useState(() => {
    return load('focusFeeds') || DEFAULT_FEEDS;
  });
  const [activeFeed, setActiveFeed] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupIcon, setNewGroupIcon] = useState('📌');
  const [showAddChannel, setShowAddChannel] = useState(null);
  const [newChannelName, setNewChannelName] = useState('');
  const [ytVideos, setYtVideos] = useState({});  // { channelName: [videos] }
  const [ytLoading, setYtLoading] = useState(false);
  const [playlistPicker, setPlaylistPicker] = useState(null); // { groupId, channelId, channelName, playlists, loading }
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [dateRange, setDateRange] = useState(''); // '' | '1w' | '1m' | '3m'


  // Fetch YouTube videos for all active YouTube channels
  const fetchYouTubeVideos = useCallback(async (feedList) => {
    if (!hasApiKey()) {
      console.warn('[Feed] API 키 없음');
      return;
    }

    const ytChannels = feedList.flatMap(f =>
      f.channels.filter(c => c.active && c.platform === 'YouTube').map(c => ({
        name: c.name,
        playlists: c.playlists || [],
        group: f.name,
        groupIcon: f.icon,
      }))
    );

    console.log('[Feed] YouTube 채널 목록:', ytChannels.map(c => c.name));
    if (ytChannels.length === 0) return;

    setYtLoading(true);
    const results = {};
    await Promise.all(
      ytChannels.map(async (ch) => {
        try {
          let videos = [];
          if (ch.playlists.length > 0) {
            const plVideos = await Promise.all(
              ch.playlists.map(plId => fetchPlaylistVideos(plId, 5))
            );
            videos = plVideos.flat();
          } else {
            videos = await fetchVideosByChannelName(ch.name, 5);
          }
          console.log(`[Feed] ${ch.name}: ${videos.length}개 영상`);
          results[ch.name] = videos.map(v => ({
            ...v,
            group: ch.group,
            groupIcon: ch.groupIcon,
          }));
        } catch (err) {
          console.error(`[Feed] ${ch.name} 실패:`, err);
          results[ch.name] = [];
        }
      })
    );
    setYtVideos(prev => ({ ...prev, ...results }));
    setYtLoading(false);
  }, []);

  // Fetch on mount and when feeds change
  useEffect(() => {
    fetchYouTubeVideos(feeds);
  }, [feeds, fetchYouTubeVideos]);

  // Open playlist picker for a channel
  const openPlaylistPicker = async (groupId, channel) => {
    setPlaylistPicker({ groupId, channelId: channel.id, channelName: channel.name, playlists: [], loading: true, selected: channel.playlists || [] });
    const playlists = await fetchPlaylistsByChannelName(channel.name);
    setPlaylistPicker(prev => prev ? { ...prev, playlists, loading: false } : null);
  };

  // Toggle a playlist selection
  const togglePlaylist = (playlistId) => {
    setPlaylistPicker(prev => {
      if (!prev) return null;
      const selected = prev.selected.includes(playlistId)
        ? prev.selected.filter(id => id !== playlistId)
        : [...prev.selected, playlistId];
      return { ...prev, selected };
    });
  };

  // Save selected playlists to the channel
  const savePlaylistSelection = () => {
    if (!playlistPicker) return;
    const { groupId, channelId, selected } = playlistPicker;
    const updated = feeds.map(f => {
      if (f.id !== groupId) return f;
      return {
        ...f,
        channels: f.channels.map(c =>
          c.id === channelId ? { ...c, playlists: selected } : c
        ),
      };
    });
    saveFeeds(updated);
    setPlaylistPicker(null);
    setViewMode('feed');
    toast(selected.length > 0 ? `재생목록 ${selected.length}개 선택됨` : '전체 최신 영상으로 설정됨');
  };

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

  const [addingChannel, setAddingChannel] = useState(false);
  const [channelSuggestions, setChannelSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimerRef = useRef(null);

  const handleChannelInput = (value) => {
    setNewChannelName(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!value.trim() || !hasApiKey()) {
      setChannelSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      const results = await searchChannels(value.trim());
      setChannelSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 400);
  };

  const selectSuggestion = (suggestion) => {
    setNewChannelName(suggestion.name);
    setShowSuggestions(false);
    setChannelSuggestions([]);
  };

  const addChannel = async (groupId) => {
    if (!newChannelName.trim() || addingChannel) return;
    const channelName = newChannelName.trim();

    // Verify channel exists on YouTube
    if (hasApiKey()) {
      setAddingChannel(true);
      try {
        const channelId = await findChannelId(channelName);
        if (!channelId) {
          toast('채널을 찾을 수 없습니다. 이름을 확인해주세요', 'error');
          setAddingChannel(false);
          return;
        }
      } catch {
        toast('채널 확인 중 오류가 발생했습니다', 'error');
        setAddingChannel(false);
        return;
      }
      setAddingChannel(false);
    }

    const newId = Date.now();
    const updated = feeds.map(f => {
      if (f.id !== groupId) return f;
      return {
        ...f,
        channels: [...f.channels, {
          id: newId,
          name: channelName,
          platform: 'YouTube',
          active: true,
        }],
      };
    });
    saveFeeds(updated);
    setNewChannelName('');
    setShowAddChannel(null);
    toast('채널이 추가되었습니다');

    // Open playlist picker for the new channel
    if (hasApiKey()) {
      openPlaylistPicker(groupId, { id: newId, name: channelName, playlists: [] });
    }
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
    const targetFeeds = activeFeed === null
      ? feeds
      : feeds.filter(f => f.id === activeFeed);

    let result = targetFeeds.flatMap(feed =>
      feed.channels
        .filter(c => c.active && c.platform === 'YouTube')
        .flatMap(c => (ytVideos[c.name] || []).map(v => ({
          ...v,
          group: feed.name,
          groupIcon: feed.icon,
        })))
    );

    // Date range filter
    if (dateRange) {
      const now = new Date();
      const daysMap = { '1w': 7, '1m': 30, '3m': 90 };
      const days = daysMap[dateRange] || 0;
      const cutoff = new Date(now.getTime() - days * 86400000).toISOString();
      result = result.filter(v => v.publishedAt && v.publishedAt >= cutoff);
    }

    // Sort
    result.sort((a, b) => {
      if (!a.publishedAt || !b.publishedAt) return 0;
      return sortOrder === 'newest'
        ? new Date(b.publishedAt) - new Date(a.publishedAt)
        : new Date(a.publishedAt) - new Date(b.publishedAt);
    });

    return result;
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

  // Channel management content (used in settings panel)
  const manageContent = (
    <>
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
                      {ch.playlists?.length > 0 && (
                        <span className="channel-playlist-badge">{ch.playlists.length}개 목록만</span>
                      )}
                    </div>
                    <div className="channel-actions">
                      {hasApiKey() && (
                        <button
                          className="btn-playlist"
                          onClick={(e) => { e.stopPropagation(); openPlaylistPicker(feed.id, ch); }}
                          title="재생목록 필터"
                        >
                          필터
                        </button>
                      )}
                      <button className="btn-remove" onClick={() => removeChannel(feed.id, ch.id)}>×</button>
                    </div>
                  </div>
                ))}
                {feed.channels.length === 0 && (
                  <p className="empty-hint">채널을 추가해보세요</p>
                )}
              </div>
              {showAddChannel === feed.id && (
                <div className="add-channel-wrapper">
                  <div className="add-channel-simple">
                    <input
                      type="text"
                      placeholder="YouTube 채널명 입력"
                      value={newChannelName}
                      onChange={e => handleChannelInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addChannel(feed.id)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      onFocus={() => channelSuggestions.length > 0 && setShowSuggestions(true)}
                      disabled={addingChannel}
                      autoFocus
                    />
                    <button className="btn-small" onClick={() => addChannel(feed.id)} disabled={addingChannel}>
                      {addingChannel ? '확인 중...' : '추가'}
                    </button>
                  </div>
                  {showSuggestions && (
                    <div className="channel-suggestions">
                      {channelSuggestions.map(ch => (
                        <button
                          key={ch.id}
                          className="channel-suggestion"
                          onMouseDown={() => selectSuggestion(ch)}
                        >
                          <img src={ch.thumbnail} alt="" className="suggestion-thumb" />
                          <div className="suggestion-info">
                            <span className="suggestion-name">{ch.name}</span>
                            {ch.description && <span className="suggestion-desc">{ch.description}</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
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

      {/* Playlist Picker Modal */}
      {playlistPicker && (
        <div className="login-modal-overlay" onClick={() => setPlaylistPicker(null)}>
          <div className="login-modal playlist-modal" onClick={e => e.stopPropagation()}>
            <button className="login-modal-close" onClick={() => setPlaylistPicker(null)}>×</button>
            <h2 className="login-title">재생목록 선택</h2>
            <p className="login-reason">{playlistPicker.channelName}에서 가져올 재생목록을 선택하세요</p>

            {playlistPicker.loading ? (
              <div className="empty-state">
                <p className="empty-icon">⏳</p>
                <p className="empty-text">재생목록 불러오는 중...</p>
              </div>
            ) : playlistPicker.playlists.length === 0 ? (
              <div className="empty-state">
                <p className="empty-icon">📭</p>
                <p className="empty-text">재생목록이 없습니다</p>
              </div>
            ) : (
              <div className="playlist-list">
                {playlistPicker.playlists.map(pl => (
                  <label key={pl.id} className={`playlist-item ${playlistPicker.selected.includes(pl.id) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={playlistPicker.selected.includes(pl.id)}
                      onChange={() => togglePlaylist(pl.id)}
                    />
                    {pl.thumbnail && <img src={pl.thumbnail} alt="" className="playlist-thumb" />}
                    <span className="playlist-title">{pl.title}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="playlist-actions">
              <button className="login-btn" onClick={savePlaylistSelection}>
                {playlistPicker.selected.length > 0
                  ? `${playlistPicker.selected.length}개 선택 완료`
                  : '선택 완료'}
              </button>
              <button className="playlist-skip" onClick={() => { setPlaylistPicker(null); toast('전체 최신 영상으로 설정됨'); }}>
                건너뛰기 — 전체 영상 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Feed content (main view)
  const feedContent = (
    <>
      <div className="feed-toolbar">
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
        <div className="feed-filter-row">
          <select
            className="feed-select"
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
          >
            <option value="">전체 기간</option>
            <option value="1w">최근 1주일</option>
            <option value="1m">최근 1개월</option>
            <option value="3m">최근 3개월</option>
          </select>
          <select
            className="feed-select"
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
          >
            <option value="newest">최신순</option>
            <option value="oldest">오래된순</option>
          </select>
        </div>
      </div>

      <div className="video-list">
        {videos.length === 0 && ytLoading ? (
          <div className="empty-state">
            <p className="empty-icon">⏳</p>
            <p className="empty-text">영상을 불러오는 중...</p>
          </div>
        ) : videos.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">📭</p>
            <p className="empty-text">{hasApiKey() ? '이 피드에 콘텐츠가 없습니다' : 'YouTube API 키를 설정해주세요'}</p>
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
    </>
  );

  if (manageOnly) return manageContent;
  if (embedded) return feedContent;

  return (
    <div className="page">
      <header className="page-header-inline">
        <h1>Focus Feed</h1>
        <p className="page-subtitle-inline">내가 선택한 콘텐츠만</p>
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
