import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ===== User Settings (rules, filters, feeds, timers) =====
export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_settings')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setSettings(data);
        setLoading(false);
      });
  }, [user]);

  const updateSettings = useCallback(async (field, value) => {
    if (!user) return;
    const { data } = await supabase
      .from('user_settings')
      .update({ [field]: value })
      .eq('id', user.id)
      .select()
      .single();
    if (data) setSettings(data);
    return data;
  }, [user]);

  return { settings, loading, updateSettings };
}

// ===== User Activity (visits, stats, rest, log) =====
export function useActivity() {
  const { user } = useAuth();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_activity')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setActivity(data);
        setLoading(false);
      });
  }, [user]);

  const updateActivity = useCallback(async (field, value) => {
    if (!user) return;
    const { data } = await supabase
      .from('user_activity')
      .update({ [field]: value })
      .eq('id', user.id)
      .select()
      .single();
    if (data) setActivity(data);
    return data;
  }, [user]);

  return { activity, loading, updateActivity };
}

// ===== Posts (community feed) =====
export function usePosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setPosts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const createPost = useCallback(async (post) => {
    if (!user) return;
    const { data, error } = await supabase
      .from('posts')
      .insert({ ...post, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    setPosts(prev => [data, ...prev]);
    return data;
  }, [user]);

  return { posts, loading, fetchPosts, createPost };
}

// ===== Reactions =====
export function useReactions(postIds) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState({});
  const [myReactions, setMyReactions] = useState({});

  useEffect(() => {
    if (!postIds?.length) return;
    // Get reaction counts
    supabase
      .from('post_reactions')
      .select('post_id, reaction_type')
      .in('post_id', postIds)
      .then(({ data }) => {
        const counts = {};
        (data || []).forEach(r => {
          const key = `${r.post_id}-${r.reaction_type}`;
          counts[key] = (counts[key] || 0) + 1;
        });
        setReactions(counts);
      });

    // Get my reactions
    if (user) {
      supabase
        .from('post_reactions')
        .select('post_id, reaction_type')
        .in('post_id', postIds)
        .eq('user_id', user.id)
        .then(({ data }) => {
          const mine = {};
          (data || []).forEach(r => {
            mine[`${r.post_id}-${r.reaction_type}`] = true;
          });
          setMyReactions(mine);
        });
    }
  }, [postIds, user]);

  const toggleReaction = useCallback(async (postId, reactionType) => {
    if (!user) return;
    const key = `${postId}-${reactionType}`;
    if (myReactions[key]) return; // Already reacted

    await supabase.from('post_reactions').insert({
      post_id: postId,
      user_id: user.id,
      reaction_type: reactionType,
    });
    setMyReactions(prev => ({ ...prev, [key]: true }));
    setReactions(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }));
  }, [user, myReactions]);

  return { reactions, myReactions, toggleReaction };
}

// ===== Comments =====
export function useComments(postId) {
  const { user } = useAuth();
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (!postId) return;
    supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments(data || []));
  }, [postId]);

  const addComment = useCallback(async (text, userName) => {
    if (!user || !postId) return;
    const { data } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        user_name: userName,
        text,
      })
      .select()
      .single();
    if (data) setComments(prev => [...prev, data]);
    return data;
  }, [user, postId]);

  return { comments, addComment };
}

// ===== Challenges =====
export function useChallenges() {
  const { user } = useAuth();
  const [joined, setJoined] = useState([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('challenge_members')
      .select('challenge_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        setJoined((data || []).map(d => d.challenge_id));
      });
  }, [user]);

  const joinChallenge = useCallback(async (challengeId) => {
    if (!user) return;
    await supabase.from('challenge_members').insert({
      user_id: user.id,
      challenge_id: challengeId,
    });
    setJoined(prev => [...prev, challengeId]);
  }, [user]);

  return { joined, joinChallenge };
}

// ===== Photo Upload =====
export async function uploadPhoto(userId, file) {
  const ext = file.name.split('.').pop();
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('photos')
    .upload(path, file, { cacheControl: '3600', upsert: false });

  if (error) throw error;

  const { data } = supabase.storage.from('photos').getPublicUrl(path);
  return data.publicUrl;
}
