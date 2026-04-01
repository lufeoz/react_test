const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || '';

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

// Persistent cache: survives within session + localStorage for channel IDs
const cache = new Map();

function cacheKey(type, query) {
  return `${type}:${query}`;
}

// Save/load channel ID cache to localStorage to avoid repeat search calls
function loadChannelCache() {
  try {
    const saved = localStorage.getItem('yt_channel_cache');
    if (saved) {
      const entries = JSON.parse(saved);
      entries.forEach(([k, v]) => cache.set(k, v));
    }
  } catch { /* ignore */ }
}

function saveChannelToCache(name, channelId) {
  const key = cacheKey('channel', name);
  cache.set(key, channelId);
  // Persist channel ID mappings to localStorage
  try {
    const entries = [];
    cache.forEach((v, k) => { if (k.startsWith('channel:')) entries.push([k, v]); });
    localStorage.setItem('yt_channel_cache', JSON.stringify(entries));
  } catch { /* ignore */ }
}

loadChannelCache();

/**
 * Search for a YouTube channel by name and return its channel ID.
 * Uses search API (100 units) but results are cached persistently.
 */
export async function findChannelId(channelName) {
  const key = cacheKey('channel', channelName);
  if (cache.has(key)) return cache.get(key);

  const params = new URLSearchParams({
    part: 'snippet',
    q: channelName,
    type: 'channel',
    maxResults: '1',
    key: API_KEY,
  });

  const res = await fetch(`${BASE_URL}/search?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `YouTube API ${res.status}`);
  }
  const data = await res.json();

  const channelId = data.items?.[0]?.id?.channelId || null;
  if (channelId) saveChannelToCache(channelName, channelId);
  return channelId;
}

/**
 * Fetch recent videos using the channel's uploads playlist (1 unit instead of 100).
 * Every YouTube channel has an uploads playlist: replace "UC" prefix with "UU".
 */
export async function fetchChannelVideos(channelId, maxResults = 5) {
  const uploadsPlaylistId = 'UU' + channelId.slice(2);
  return fetchPlaylistVideos(uploadsPlaylistId, maxResults);
}

/**
 * Fetch playlists for a channel (1 unit).
 */
export async function fetchChannelPlaylists(channelId) {
  const key = cacheKey('playlists', channelId);
  if (cache.has(key)) return cache.get(key);

  const params = new URLSearchParams({
    part: 'snippet',
    channelId,
    maxResults: '20',
    key: API_KEY,
  });

  const res = await fetch(`${BASE_URL}/playlists?${params}`);
  if (!res.ok) throw new Error('YouTube API 요청 실패');
  const data = await res.json();

  const playlists = (data.items || []).map(item => ({
    id: item.id,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.medium?.url || '',
  }));

  cache.set(key, playlists);
  return playlists;
}

/**
 * Fetch videos from a specific playlist (1 unit).
 */
export async function fetchPlaylistVideos(playlistId, maxResults = 5) {
  const key = cacheKey('playlistVideos', `${playlistId}:${maxResults}`);
  if (cache.has(key)) return cache.get(key);

  const params = new URLSearchParams({
    part: 'snippet',
    playlistId,
    maxResults: String(maxResults),
    key: API_KEY,
  });

  const res = await fetch(`${BASE_URL}/playlistItems?${params}`);
  if (!res.ok) throw new Error('YouTube API 요청 실패');
  const data = await res.json();

  const videoIds = data.items
    .map(item => item.snippet?.resourceId?.videoId)
    .filter(Boolean);

  let durations = {};
  let durationSecs = {};
  if (videoIds.length > 0) {
    const detailParams = new URLSearchParams({
      part: 'contentDetails',
      id: videoIds.join(','),
      key: API_KEY,
    });
    const detailRes = await fetch(`${BASE_URL}/videos?${detailParams}`);
    if (detailRes.ok) {
      const detailData = await detailRes.json();
      detailData.items?.forEach(item => {
        durations[item.id] = parseDuration(item.contentDetails.duration);
        durationSecs[item.id] = parseDurationSeconds(item.contentDetails.duration);
      });
    }
  }

  const videos = data.items
    .filter(item => item.snippet?.resourceId?.videoId)
    .map(item => ({
      id: item.snippet.resourceId.videoId,
      videoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      uploaded: formatRelativeDate(item.snippet.publishedAt),
      duration: durations[item.snippet.resourceId.videoId] || '',
      durationSeconds: durationSecs[item.snippet.resourceId.videoId] || 0,
      thumbnail: item.snippet.thumbnails?.medium?.url || '',
    }));

  cache.set(key, videos);
  return videos;
}

/**
 * Fetch playlists for a channel by name.
 */
export async function fetchPlaylistsByChannelName(channelName) {
  if (!API_KEY) return [];
  try {
    const channelId = await findChannelId(channelName);
    if (!channelId) return [];
    return await fetchChannelPlaylists(channelId);
  } catch (err) {
    console.error(`[YouTube] 재생목록 실패 (${channelName}):`, err.message);
    return [];
  }
}

/**
 * Fetch videos for a channel by name.
 * Cost: 100 units first time (search), 2 units after (cached channel ID + playlistItems + videos).
 */
export async function fetchVideosByChannelName(channelName, maxResults = 5) {
  if (!API_KEY) return [];
  try {
    const channelId = await findChannelId(channelName);
    if (!channelId) {
      console.warn(`[YouTube] 채널 못 찾음: ${channelName}`);
      return [];
    }
    return await fetchChannelVideos(channelId, maxResults);
  } catch (err) {
    console.error(`[YouTube] 영상 실패 (${channelName}):`, err.message);
    return [];
  }
}

function parseDuration(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const h = match[1] ? `${match[1]}:` : '';
  const m = match[2] || '0';
  const s = (match[3] || '0').padStart(2, '0');
  return h ? `${h}${m.padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function parseDurationSeconds(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] || 0) * 3600) + (parseInt(match[2] || 0) * 60) + parseInt(match[3] || 0);
}

function formatRelativeDate(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHr < 24) return `${diffHr}시간 전`;
  if (diffDay === 0) return '오늘';
  if (diffDay === 1) return '어제';
  if (diffDay < 7) return `${diffDay}일 전`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}주 전`;
  return `${Math.floor(diffDay / 30)}개월 전`;
}

/**
 * Search YouTube channels by query (for autocomplete).
 * Returns channel name, ID, thumbnail, subscriber info.
 */
export async function searchChannels(query, maxResults = 5) {
  if (!API_KEY || !query.trim()) return [];
  const key = cacheKey('search', `${query}:${maxResults}`);
  if (cache.has(key)) return cache.get(key);

  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'channel',
    maxResults: String(maxResults),
    key: API_KEY,
  });

  try {
    const res = await fetch(`${BASE_URL}/search?${params}`);
    if (!res.ok) return [];
    const data = await res.json();

    const channels = (data.items || []).map(item => ({
      id: item.id.channelId,
      name: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails?.default?.url || '',
      description: item.snippet.description?.slice(0, 60) || '',
    }));

    cache.set(key, channels);
    return channels;
  } catch {
    return [];
  }
}

export function hasApiKey() {
  return !!API_KEY;
}
