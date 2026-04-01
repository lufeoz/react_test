import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

// Maps localStorage keys → Supabase table+field
const STORAGE_MAP = {
  consumptionRules: { table: 'settings', field: 'consumption_rules' },
  noiseFilters: { table: 'settings', field: 'noise_filters' },
  focusFeeds: { table: 'settings', field: 'focus_feeds' },
  timeContainers: { table: 'settings', field: 'time_containers' },
  visitDays: { table: 'activity', field: 'visit_days' },
  achievementStats: { table: 'activity', field: 'achievement_stats' },
  restCompleted: { table: 'activity', field: 'rest_completed' },
  dailyLog: { table: 'activity', field: 'daily_log' },
  dietPrograms: { table: 'activity', field: 'diet_programs' },
};

function safeJsonParse(str, fallback) {
  try { return str ? JSON.parse(str) : fallback; }
  catch { return fallback; }
}

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load data: Supabase if logged in, localStorage otherwise
  useEffect(() => {
    if (user) {
      Promise.all([
        supabase.from('user_settings').select('*').eq('id', user.id).single(),
        supabase.from('user_activity').select('*').eq('id', user.id).single(),
      ]).then(([settingsRes, activityRes]) => {
        setSettings(settingsRes.data);
        setActivity(activityRes.data);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [user]);

  // ===== localStorage helpers (for non-logged-in users) =====
  const localLoad = useCallback((key) => {
    const raw = localStorage.getItem(key);
    if (key === 'achievementStats' || key === 'restCompleted' || key === 'dailyLog' || key === 'dietPrograms') {
      return safeJsonParse(raw, {});
    }
    return safeJsonParse(raw, null);
  }, []);

  const localSave = useCallback((key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
  }, []);

  // ===== Supabase helpers =====
  const updateSettings = useCallback(async (field, value) => {
    if (!user) return;
    setSettings(prev => prev ? { ...prev, [field]: value } : prev);
    const { error } = await supabase.from('user_settings').update({ [field]: value }).eq('id', user.id);
    if (error) {
      const { data } = await supabase.from('user_settings').select('*').eq('id', user.id).single();
      if (data) setSettings(data);
    }
  }, [user]);

  const updateActivity = useCallback(async (field, value) => {
    if (!user) return;
    setActivity(prev => prev ? { ...prev, [field]: value } : prev);
    const { error } = await supabase.from('user_activity').update({ [field]: value }).eq('id', user.id);
    if (error) {
      const { data } = await supabase.from('user_activity').select('*').eq('id', user.id).single();
      if (data) setActivity(data);
    }
  }, [user]);

  // ===== Unified save/load =====
  const save = useCallback(async (key, value) => {
    const mapping = STORAGE_MAP[key];
    if (!mapping) return;

    if (!user) {
      // No login → localStorage
      localSave(key, value);
      return;
    }

    if (mapping.table === 'settings') {
      await updateSettings(mapping.field, value);
    } else {
      await updateActivity(mapping.field, value);
    }
  }, [user, localSave, updateSettings, updateActivity]);

  const load = useCallback((key) => {
    const mapping = STORAGE_MAP[key];
    if (!mapping) return null;

    if (!user) {
      // No login → localStorage
      return localLoad(key);
    }

    if (mapping.table === 'settings') {
      return settings?.[mapping.field] ?? null;
    } else {
      return activity?.[mapping.field] ?? null;
    }
  }, [user, settings, activity, localLoad]);

  const value = {
    settings,
    activity,
    loading,
    save,
    load,
    updateSettings,
    updateActivity,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
