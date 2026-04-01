-- ============================================
-- Supabase Migration: Digital Consumption Manager
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. profiles: 사용자 프로필
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  goal text default '',
  rest_type text default null,
  subscription text default 'free',
  onboarding_done boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. user_settings: 규칙, 필터, 피드, 타이머 (JSONB)
create table if not exists public.user_settings (
  id uuid primary key references auth.users(id) on delete cascade,
  consumption_rules jsonb default '[]'::jsonb,
  noise_filters jsonb default '[]'::jsonb,
  focus_feeds jsonb default '[]'::jsonb,
  time_containers jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. user_activity: 방문, 통계, 미션기록, 로그 (JSONB)
create table if not exists public.user_activity (
  id uuid primary key references auth.users(id) on delete cascade,
  visit_days jsonb default '[]'::jsonb,
  achievement_stats jsonb default '{}'::jsonb,
  rest_completed jsonb default '{}'::jsonb,
  daily_log jsonb default '{}'::jsonb,
  diet_programs jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. posts: 인증글 (사진은 Storage URL)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null default '',
  type text default '',
  type_name text default '',
  icon text default '',
  mission text default '',
  mission_emoji text default '',
  note text default '',
  photo_url text default null,
  badge text default '',
  created_at timestamptz default now()
);

-- 5. post_reactions: 리액션
create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('cheer', 'metoo', 'warm')),
  created_at timestamptz default now(),
  unique(post_id, user_id, reaction_type)
);

-- 6. post_comments: 댓글
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  user_name text not null default '',
  text text not null,
  created_at timestamptz default now()
);

-- 7. challenge_members: 챌린지 참가
create table if not exists public.challenge_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id text not null,
  joined_at timestamptz default now(),
  unique(user_id, challenge_id)
);

-- ============================================
-- Indexes
-- ============================================
create index if not exists idx_posts_user_id on public.posts(user_id);
create index if not exists idx_posts_created_at on public.posts(created_at desc);
create index if not exists idx_post_reactions_post_id on public.post_reactions(post_id);
create index if not exists idx_post_comments_post_id on public.post_comments(post_id);
create index if not exists idx_challenge_members_user_id on public.challenge_members(user_id);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_activity enable row level security;
alter table public.posts enable row level security;
alter table public.post_reactions enable row level security;
alter table public.post_comments enable row level security;
alter table public.challenge_members enable row level security;

-- profiles: own row only
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- user_settings: own row only
create policy "Users can view own settings" on public.user_settings for select using (auth.uid() = id);
create policy "Users can insert own settings" on public.user_settings for insert with check (auth.uid() = id);
create policy "Users can update own settings" on public.user_settings for update using (auth.uid() = id);

-- user_activity: own row only
create policy "Users can view own activity" on public.user_activity for select using (auth.uid() = id);
create policy "Users can insert own activity" on public.user_activity for insert with check (auth.uid() = id);
create policy "Users can update own activity" on public.user_activity for update using (auth.uid() = id);

-- posts: anyone can read, own can write
create policy "Anyone can view posts" on public.posts for select using (true);
create policy "Users can insert own posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can delete own posts" on public.posts for delete using (auth.uid() = user_id);

-- post_reactions: anyone can read, own can write
create policy "Anyone can view reactions" on public.post_reactions for select using (true);
create policy "Users can insert own reactions" on public.post_reactions for insert with check (auth.uid() = user_id);
create policy "Users can delete own reactions" on public.post_reactions for delete using (auth.uid() = user_id);

-- post_comments: anyone can read, own can write
create policy "Anyone can view comments" on public.post_comments for select using (true);
create policy "Users can insert own comments" on public.post_comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own comments" on public.post_comments for delete using (auth.uid() = user_id);

-- challenge_members: anyone can read (for member count), own can write
create policy "Anyone can view challenge members" on public.challenge_members for select using (true);
create policy "Users can join challenges" on public.challenge_members for insert with check (auth.uid() = user_id);
create policy "Users can leave challenges" on public.challenge_members for delete using (auth.uid() = user_id);

-- ============================================
-- Updated_at trigger
-- ============================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.user_settings
  for each row execute function public.handle_updated_at();
create trigger set_updated_at before update on public.user_activity
  for each row execute function public.handle_updated_at();

-- ============================================
-- Auto-create profile + settings + activity on signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  insert into public.user_settings (id) values (new.id);
  insert into public.user_activity (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- Storage bucket for photos
-- ============================================
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
  on conflict (id) do nothing;

create policy "Anyone can view photos" on storage.objects for select using (bucket_id = 'photos');
create policy "Authenticated users can upload photos" on storage.objects for insert with check (bucket_id = 'photos' and auth.role() = 'authenticated');
create policy "Users can delete own photos" on storage.objects for delete using (bucket_id = 'photos' and auth.uid()::text = (storage.foldername(name))[1]);
