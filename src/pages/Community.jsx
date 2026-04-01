import { useState, useEffect, useMemo } from 'react';
import { useToast } from '../components/Toast';
import { FeedSkeleton, CardListSkeleton } from '../components/Skeleton';
import PullToRefresh from '../components/PullToRefresh';
import { usePosts, useReactions, useChallenges } from '../hooks/useSupabase';
import { useAuth } from '../contexts/AuthContext';
import { useLoginModal } from '../components/Login';

const REST_TYPE_NAMES = {
  speed: '과속형',
  escape: '도피형',
  overload: '과부하형',
  blank: '멍형',
  overthink: '과생각형',
  suppress: '감정 억제형',
  social: '관계 과부하형',
  perfect: '완벽주의형',
};

// Mock community posts with richer data
const MOCK_POSTS = [
  {
    id: 'm1', user: '하늘', type: 'escape', icon: '📱', typeName: '도피형', badge: '7일차',
    missionEmoji: '🍳',
    mission: '폰 없이 파스타 만들어 먹음',
    note: '알리오올리오 했는데 폰 안 보니까 40분이 10분처럼 느껴졌어요. 맛도 더 좋은 느낌',
    photo: null,
    time: '14분 전', reactions: { cheer: 12, metoo: 8, warm: 3 }, comments: [
      { user: '민준', text: '오 맛있겠다! 레시피 공유해주세요', time: '10분 전' },
      { user: '서연', text: '저도 어제 파스타 했는데 폰 안 보니까 확실히 다름', time: '8분 전' },
    ],
  },
  {
    id: 'm2', user: '민준', type: 'speed', icon: '🚀', typeName: '과속형', badge: '3일차',
    missionEmoji: '🧘',
    mission: '아무것도 안 하는 30분 성공',
    note: '진짜 힘들었는데 끝나고 나니까 이상하게 개운함. 15분쯤에 포기할뻔',
    photo: null,
    time: '42분 전', reactions: { cheer: 24, metoo: 15, warm: 7 }, comments: [
      { user: '예은', text: '30분 대단해요... 저는 10분도 힘든데', time: '30분 전' },
    ],
  },
  {
    id: 'm3', user: '서연', type: 'overthink', icon: '🧠', typeName: '과생각형', badge: '5일차',
    missionEmoji: '📝',
    mission: '머릿속 쏟아내기 5분 + 요리',
    note: '종이 두 장을 채웠는데 쓰고 나니까 진짜 가벼워짐. 그 상태로 김치볶음밥 만듦',
    photo: null,
    time: '1시간 전', reactions: { cheer: 18, metoo: 22, warm: 5 }, comments: [
      { user: '도현', text: '저도 써봤는데 진짜 효과 있더라', time: '50분 전' },
      { user: '지우', text: '김치볶음밥 맛있겠다ㅋㅋ', time: '45분 전' },
    ],
  },
  {
    id: 'm4', user: '지우', type: 'overload', icon: '😵', typeName: '과부하형', badge: '2일차',
    missionEmoji: '🛋',
    mission: '바닥 5분 + 샤워까지 성공',
    note: '5분만 눕자 했는데 20분 누워있었음ㅋㅋ 그래도 샤워까지 함. 이게 오늘의 승리',
    photo: null,
    time: '2시간 전', reactions: { cheer: 31, metoo: 19, warm: 12 }, comments: [
      { user: '수아', text: '샤워까지 한 거 진짜 대단해요 👏', time: '1시간 전' },
    ],
  },
  {
    id: 'm5', user: '예은', type: 'suppress', icon: '🎭', typeName: '감정 억제형', badge: '4일차',
    missionEmoji: '🎵',
    mission: '기분 맞는 노래 + 4분 쓰기',
    note: '울 뻔했는데 괜찮았어요. 쓰고 나서 노래 한 곡 더 들었는데 그때 좀 울었음',
    photo: null,
    time: '3시간 전', reactions: { cheer: 15, metoo: 11, warm: 9 }, comments: [],
  },
  {
    id: 'm6', user: '도현', type: 'blank', icon: '🌫', typeName: '멍형', badge: '1일차',
    missionEmoji: '🧹',
    mission: '일어나서 물 마심. 끝',
    note: '편의점까지 갔다 옴. 이게 오늘의 최대치임. 근데 했음.',
    photo: null,
    time: '4시간 전', reactions: { cheer: 42, metoo: 28, warm: 18 }, comments: [
      { user: '준서', text: '했다는 게 중요한 거예요. 진심으로', time: '3시간 전' },
      { user: '하늘', text: '"근데 했음" 이게 제일 좋은 말인듯', time: '3시간 전' },
    ],
  },
  {
    id: 'm7', user: '수아', type: 'social', icon: '🤝', typeName: '관계 과부하형', badge: '6일차',
    missionEmoji: '🔇',
    mission: '알림 끄고 혼자 요리 + 영화',
    note: '카톡 안 보고 파스타 만들고 영화 봤는데 이게 이렇게 편할 줄이야. 죄책감 없는 혼자 시간',
    photo: null,
    time: '5시간 전', reactions: { cheer: 20, metoo: 14, warm: 6 }, comments: [],
  },
  {
    id: 'm8', user: '준서', type: 'perfect', icon: '🎯', typeName: '완벽주의형', badge: '7일차 완료',
    missionEmoji: '🍳',
    mission: '대충 라면 끓여먹고 설거지 안 함',
    note: '계란도 안 넣고 그냥 먹었는데... 맛있었음. 설거지는 내일. 세상 안 무너짐',
    photo: null,
    time: '6시간 전', reactions: { cheer: 35, metoo: 26, warm: 14 }, comments: [
      { user: '지우', text: '"세상 안 무너짐" ㅋㅋㅋ 명언이다', time: '5시간 전' },
    ],
  },
];

// Mock challenges
const CHALLENGES = [
  {
    id: 'c1', name: '7일 저녁 루틴 챌린지', icon: '🌙',
    desc: '매일 저녁 3시간, 쇼츠 대신 진짜 쉼',
    members: 1247, duration: 7, price: null,
    tags: ['무료', '초보 추천'],
  },
  {
    id: 'c2', name: '21일 쉼 마스터 챌린지', icon: '✦',
    desc: '8가지 유형 기법을 모두 경험하고 나만의 루틴 완성',
    members: 389, duration: 21, price: 9900,
    tags: ['인기', '보증금 환급'],
  },
  {
    id: 'c3', name: '폰 없는 저녁 30일', icon: '📱',
    desc: '매일 저녁 3시간 폰 격리. 인증샷 필수. 성공하면 환급',
    members: 562, duration: 30, price: 19900,
    tags: ['하드코어', '보증금 환급'],
  },
  {
    id: 'c4', name: '같이 요리하기 14일', icon: '🍳',
    desc: '매일 저녁 직접 해먹고 인증. 레시피 공유 커뮤니티',
    members: 823, duration: 14, price: 4900,
    tags: ['요리', '보증금 환급'],
  },
];

function formatTime(isoStr) {
  if (!isoStr) return '';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}

export default function Community() {
  const toast = useToast();
  const { user, profile } = useAuth();
  const { requireLogin } = useLoginModal();
  const { posts: dbPosts, fetchPosts } = usePosts();
  const { joined: joinedChallenges, joinChallenge: joinChallengeDb } = useChallenges();
  const [tab, setTab] = useState('feed');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, [tab]);

  const [filterType, setFilterType] = useState('all');
  const [postReactions, setPostReactions] = useState({});
  const [showPayment, setShowPayment] = useState(null);
  const [expandedPost, setExpandedPost] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [localComments, setLocalComments] = useState({});

  const submitComment = (postId) => {
    if (!commentText.trim()) return;
    if (!user) { requireLogin('댓글을 달려면 로그인이 필요합니다'); return; }
    const userName = profile?.name || '나';
    const comment = { user: userName, text: commentText.trim(), time: '방금' };
    const updated = { ...localComments, [postId]: [...(localComments[postId] || []), comment] };
    setLocalComments(updated);
    setCommentText('');
    toast('댓글이 등록되었습니다');
  };

  const reactToPost = (postId, reactionType) => {
    if (!user) { requireLogin('리액션을 하려면 로그인이 필요합니다'); return; }
    const key = `${postId}-${reactionType}`;
    if (postReactions[key]) return;
    setPostReactions(prev => ({ ...prev, [key]: true }));
  };

  const joinChallenge = (challengeId) => {
    joinChallengeDb(challengeId);
    setShowPayment(null);
    toast('챌린지에 참가했습니다!');
  };

  // Merge DB posts (user's own) with mock posts
  const userPosts = dbPosts.map(p => ({
    id: p.id,
    user: p.user_name,
    type: p.type,
    icon: p.icon,
    typeName: p.type_name,
    badge: p.badge,
    missionEmoji: p.mission_emoji,
    mission: p.mission,
    note: p.note,
    photo: p.photo_url,
    time: formatTime(p.created_at),
    reactions: { cheer: 0, metoo: 0, warm: 0 },
    isMe: true,
    comments: [],
  }));

  const allPosts = [...userPosts, ...MOCK_POSTS];

  const filteredPosts = filterType === 'all'
    ? allPosts
    : allPosts.filter(p => p.type === filterType);

  const typeFilters = [
    { id: 'all', label: '전체' },
    { id: 'escape', icon: '📱', label: '도피' },
    { id: 'speed', icon: '🚀', label: '과속' },
    { id: 'overthink', icon: '🧠', label: '과생각' },
    { id: 'overload', icon: '😵', label: '과부하' },
    { id: 'blank', icon: '🌫', label: '멍' },
    { id: 'suppress', icon: '🎭', label: '억제' },
    { id: 'social', icon: '🤝', label: '관계' },
    { id: 'perfect', icon: '🎯', label: '완벽' },
  ];

  // Payment modal
  if (showPayment) {
    const challenge = CHALLENGES.find(c => c.id === showPayment);
    return (
      <div className="page">
        <div className="challenge-payment">
          <button className="paywall-close" onClick={() => setShowPayment(null)}>×</button>

          <div className="challenge-payment-header">
            <span className="challenge-payment-icon">{challenge.icon}</span>
            <h2>{challenge.name}</h2>
            <p className="challenge-payment-desc">{challenge.desc}</p>
          </div>

          <div className="challenge-payment-info">
            <div className="challenge-payment-row">
              <span>기간</span>
              <strong>{challenge.duration}일</strong>
            </div>
            <div className="challenge-payment-row">
              <span>참가비 (보증금)</span>
              <strong>{challenge.price ? `${challenge.price.toLocaleString()}원` : '무료'}</strong>
            </div>
            <div className="challenge-payment-row">
              <span>현재 참가자</span>
              <strong>{challenge.members}명</strong>
            </div>
          </div>

          <div className="challenge-payment-refund">
            <span className="challenge-refund-icon">💰</span>
            <div>
              <p className="challenge-refund-title">보증금 환급 규칙</p>
              <p className="challenge-refund-desc">85% 이상 인증 완료 시 보증금 100% 환급</p>
              <p className="challenge-refund-desc">미달성 시 보증금은 완주자에게 분배</p>
            </div>
          </div>

          <button className="challenge-pay-btn" onClick={() => joinChallenge(challenge.id)}>
            {challenge.price ? `${challenge.price.toLocaleString()}원 결제하고 참가` : '무료로 참가하기'}
          </button>
          <p className="challenge-pay-note">시작 후 24시간 내 취소 가능</p>
        </div>
      </div>
    );
  }

  const handleRefresh = async () => {
    setLoading(true);
    await fetchPosts();
    setTimeout(() => setLoading(false), 300);
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="page">
      <header className="page-header">
        <h1>Together</h1>
        <p className="page-subtitle">같이 쉬면 더 잘 쉬어요</p>
      </header>

      <div className="rules-tab-bar">
        <button className={`rules-tab ${tab === 'feed' ? 'active' : ''}`} onClick={() => setTab('feed')}>
          인증 피드
        </button>
        <button className={`rules-tab ${tab === 'challenge' ? 'active' : ''}`} onClick={() => setTab('challenge')}>
          같이하기
        </button>
      </div>

      {/* ===== FEED ===== */}
      {tab === 'feed' && loading && <FeedSkeleton count={3} />}
      {tab === 'feed' && !loading && (
        <div className="community-feed tab-fade-in">
          {/* Type Filter Chips */}
          <div className="community-type-filters">
            {typeFilters.map(f => (
              <button
                key={f.id}
                className={`community-type-chip ${filterType === f.id ? 'active' : ''}`}
                onClick={() => setFilterType(f.id)}
              >
                {f.icon && <span>{f.icon}</span>} {f.label}
              </button>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="community-empty">
              <p>아직 인증이 없어요</p>
              <p className="community-empty-sub">Rest 탭에서 미션을 완료하고 인증해보세요</p>
            </div>
          )}

          {filteredPosts.map(post => {
            const cheered = postReactions[`${post.id}-cheer`];
            const metooed = postReactions[`${post.id}-metoo`];
            const warmed = postReactions[`${post.id}-warm`];
            const isExpanded = expandedPost === post.id;
            return (
              <div key={post.id} className={`community-card stagger-item ${post.isMe ? 'mine' : ''}`}>
                {/* Header */}
                <div className="community-header">
                  <span className="community-avatar">{post.icon}</span>
                  <div className="community-user-info">
                    <span className="community-name">
                      {post.user}
                      {post.isMe && <span className="community-me-badge">나</span>}
                    </span>
                    <div className="community-meta-row">
                      <span className="community-type-tag">{post.icon} {post.typeName}</span>
                      {post.badge && <span className="community-day-badge">{post.badge}</span>}
                      <span className="community-time">{post.time}</span>
                    </div>
                  </div>
                </div>

                {/* Mission Tag */}
                <div className="community-mission-tag">
                  <span className="community-mission-emoji">{post.missionEmoji || '✓'}</span>
                  <span>{post.mission}</span>
                </div>

                {/* Photo */}
                {post.photo && (
                  <div className="community-photo">
                    <img src={post.photo} alt="인증 사진" />
                  </div>
                )}

                {/* Note */}
                <p className="community-note">{post.note}</p>

                {/* Reactions */}
                <div className="community-reactions" role="group" aria-label="리액션">
                  <button
                    className={`community-reaction-btn ${post.isMe || cheered ? 'active' : ''}`}
                    onClick={() => !post.isMe && reactToPost(post.id, 'cheer')}
                    aria-label={`응원 ${(post.reactions?.cheer || 0) + (cheered ? 1 : 0)}개`}
                    aria-pressed={!!cheered}
                  >
                    👏 {(post.reactions?.cheer || 0) + (cheered ? 1 : 0)}
                  </button>
                  <button
                    className={`community-reaction-btn ${post.isMe || metooed ? 'active' : ''}`}
                    onClick={() => !post.isMe && reactToPost(post.id, 'metoo')}
                    aria-label={`나도 ${(post.reactions?.metoo || 0) + (metooed ? 1 : 0)}개`}
                    aria-pressed={!!metooed}
                  >
                    🙋 나도 {(post.reactions?.metoo || 0) + (metooed ? 1 : 0)}
                  </button>
                  <button
                    className={`community-reaction-btn ${post.isMe || warmed ? 'active' : ''}`}
                    onClick={() => !post.isMe && reactToPost(post.id, 'warm')}
                    aria-label={`따뜻해요 ${(post.reactions?.warm || 0) + (warmed ? 1 : 0)}개`}
                    aria-pressed={!!warmed}
                  >
                    🤗 따뜻해요 {(post.reactions?.warm || 0) + (warmed ? 1 : 0)}
                  </button>
                </div>

                {/* Comments */}
                {(() => {
                  const allComments = [...(post.comments || []), ...(localComments[post.id] || [])];
                  const commentCount = allComments.length;
                  return (
                    <div className="community-comments-section">
                      <button
                        className="community-comments-toggle"
                        onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                      >
                        💬 {commentCount > 0 ? `댓글 ${commentCount}개 ` : '댓글 달기 '}{isExpanded ? '접기' : ''}
                      </button>
                      {isExpanded && (
                        <div className="community-comments-list">
                          {allComments.map((c, i) => (
                            <div key={i} className="community-comment">
                              <span className="comment-user">{c.user}</span>
                              <span className="comment-text">{c.text}</span>
                              <span className="comment-time">{c.time}</span>
                            </div>
                          ))}
                          <div className="community-comment-input">
                            <input
                              type="text"
                              placeholder="댓글 달기..."
                              value={expandedPost === post.id ? commentText : ''}
                              onChange={e => setCommentText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && submitComment(post.id)}
                            />
                            <button className="comment-send-btn" onClick={() => submitComment(post.id)} disabled={!commentText.trim()}>↑</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* ===== CHALLENGES ===== */}
      {tab === 'challenge' && loading && <CardListSkeleton count={4} />}
      {tab === 'challenge' && !loading && (
        <div className="challenge-list tab-fade-in">
          {CHALLENGES.map(c => {
            const joined = joinedChallenges.includes(c.id);
            return (
              <div key={c.id} className={`challenge-card stagger-item ${joined ? 'joined' : ''}`}>
                <div className="challenge-card-top">
                  <span className="challenge-icon">{c.icon}</span>
                  <div className="challenge-info">
                    <h3 className="challenge-name">{c.name}</h3>
                    <p className="challenge-desc">{c.desc}</p>
                    <div className="challenge-tags">
                      {c.tags.map(tag => (
                        <span key={tag} className="challenge-tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="challenge-card-bottom">
                  <div className="challenge-meta">
                    <span>{c.duration}일</span>
                    <span>·</span>
                    <span>{c.members}명 참가중</span>
                  </div>
                  {joined ? (
                    <span className="challenge-joined-badge">참가중</span>
                  ) : (
                    <button className="challenge-join-btn" onClick={() => {
                      if (c.price && !user) {
                        requireLogin('유료 챌린지 참가를 위해 로그인이 필요합니다');
                        return;
                      }
                      c.price ? setShowPayment(c.id) : joinChallenge(c.id);
                    }}>
                      {c.price ? `${c.price.toLocaleString()}원` : '무료'} 참가
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <div className="challenge-info-box">
            <p className="challenge-info-title">💰 보증금 챌린지란?</p>
            <p className="challenge-info-desc">
              참가비를 내고 매일 인증하세요.<br />
              85% 이상 달성하면 보증금 100% 돌려받고,<br />
              미달성 보증금은 완주자에게 나눠집니다.<br />
              <strong>평균 환급액: 참가비의 120~150%</strong>
            </p>
          </div>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
