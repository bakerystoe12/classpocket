-- ClassPocket core schema.
-- Conventions:
--   * Every table has RLS enabled. Policies use auth.uid(); nothing trusts client-supplied owner IDs.
--   * Content whose validity is defined by application Zod schemas (gizmo definitions, timetables,
--     lesson drafts) is written only by server routes through service-role functions that receive the
--     verified caller ID. Browsers holding the publishable key cannot write those tables directly.
--   * Simple social writes (reactions, follows, comments, profile) go through auth.uid()-based
--     functions or RLS-checked inserts and are idempotent.

create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------------------------
-- Identity: profiles and server-granted roles
-- ---------------------------------------------------------------------------------------------
create type public.app_role as enum ('teacher', 'admin');
create type public.reaction_kind as enum ('like', 'save', 'repost');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null check (handle ~ '^[a-zA-Z0-9_.]{2,25}$'),
  name text not null check (char_length(name) between 1 and 40),
  bio text not null default '' check (char_length(bio) <= 160),
  is_guest boolean not null default true,
  follower_count integer not null default 0 check (follower_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Included demo personas are not accounts; nobody may claim their handles.
  constraint profiles_handle_not_persona check (lower(handle) not in ('nova.exe', 'orbitclub', 'softsystems', 'pixelmoss', 'classpocket', 'admin', 'teacher'))
);
create unique index profiles_handle_lower_key on public.profiles (lower(handle));

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_at timestamptz not null default now(),
  note text not null default '' check (char_length(note) <= 200),
  primary key (user_id, role)
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, handle, name, is_guest)
  values (new.id, 'maker_' || substr(replace(new.id::text, '-', ''), 1, 8), 'You', coalesce(new.is_anonymous, false))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$ begin new.updated_at := now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- Upgrading an anonymous identity (e.g. linking an email) clears the guest flag.
create or replace function public.handle_user_updated() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(old.is_anonymous, false) and not coalesce(new.is_anonymous, false) then
    update public.profiles set is_guest = false, updated_at = now() where id = new.id;
  end if;
  return new;
end $$;
create trigger on_auth_user_updated after update of is_anonymous on auth.users for each row execute function public.handle_user_updated();

-- Roles can never be attached to anonymous identities.
create or replace function public.reject_anonymous_roles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from auth.users u where u.id = new.user_id and coalesce(u.is_anonymous, false)) then
    raise exception 'Anonymous guest accounts cannot hold teacher or admin roles.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger user_roles_reject_anonymous before insert or update on public.user_roles for each row execute function public.reject_anonymous_roles();

create or replace function public.has_role(p_user uuid, p_role public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_roles r join auth.users u on u.id = r.user_id
    where r.user_id = p_user and r.role = p_role and not coalesce(u.is_anonymous, false)
  );
$$;
create or replace function public.is_teacher() returns boolean
language sql stable security definer set search_path = '' as $$ select public.has_role(auth.uid(), 'teacher'); $$;

-- ---------------------------------------------------------------------------------------------
-- Gizmos: public published snapshots, private drafts, private version history
-- ---------------------------------------------------------------------------------------------
create table public.gizmos (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,99}$'),
  kind text not null default 'gizmo' check (kind in ('gizmo', 'lesson')),
  owner_id uuid references public.profiles (id) on delete cascade,
  authored boolean not null default false,
  creator_persona text,
  creator_handle text not null,
  is_public boolean not null default true,
  definition jsonb not null,
  schema_version integer not null,
  published_version integer not null default 1,
  published_at timestamptz not null default now(),
  feed_sort timestamptz not null default now(),
  subject text not null,
  engine text not null,
  title text not null check (char_length(title) between 1 and 70),
  caption text not null default '',
  ai_generated boolean not null default false,
  reviewed_by uuid references auth.users (id) on delete set null,
  like_count integer not null default 0 check (like_count >= 0),
  save_count integer not null default 0 check (save_count >= 0),
  repost_count integer not null default 0 check (repost_count >= 0),
  comment_count integer not null default 0 check (comment_count >= 0),
  updated_at timestamptz not null default now(),
  constraint gizmos_owner_or_authored check ((authored and owner_id is null and creator_persona is not null) or (not authored and owner_id is not null and creator_persona is null))
);
create index gizmos_feed_idx on public.gizmos (feed_sort desc, id desc) where is_public;
create index gizmos_subject_feed_idx on public.gizmos (subject, feed_sort desc, id desc) where is_public;
create index gizmos_owner_idx on public.gizmos (owner_id);
create index gizmos_persona_idx on public.gizmos (creator_persona);
create index gizmos_search_idx on public.gizmos using gin ((title || ' ' || caption || ' ' || creator_handle) extensions.gin_trgm_ops);

create table public.gizmo_drafts (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]{2,99}$'),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  definition jsonb not null,
  schema_version integer not null,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gizmo_drafts_owner_idx on public.gizmo_drafts (owner_id, updated_at desc);

create table public.gizmo_versions (
  gizmo_id text not null references public.gizmo_drafts (id) on delete cascade,
  version integer not null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  definition jsonb not null,
  provenance jsonb not null default '{}'::jsonb,
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  primary key (gizmo_id, version)
);

create table public.reactions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  gizmo_id text not null references public.gizmos (id) on delete cascade,
  kind public.reaction_kind not null,
  created_at timestamptz not null default now(),
  primary key (user_id, gizmo_id, kind)
);
create index reactions_user_kind_idx on public.reactions (user_id, kind, created_at desc);
create index reactions_gizmo_idx on public.reactions (gizmo_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  gizmo_id text not null references public.gizmos (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index comments_gizmo_idx on public.comments (gizmo_id, created_at, id);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid references public.profiles (id) on delete cascade,
  target_persona text check (target_persona in ('nova.exe', 'orbitclub', 'softsystems', 'pixelmoss')),
  created_at timestamptz not null default now(),
  constraint follows_one_target check ((target_id is null) <> (target_persona is null)),
  constraint follows_not_self check (target_id is distinct from follower_id)
);
create unique index follows_unique_idx on public.follows (follower_id, coalesce(target_id::text, target_persona));
create index follows_target_idx on public.follows (target_id);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  gizmo_id text not null references public.gizmos (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 300),
  created_at timestamptz not null default now(),
  unique (reporter_id, gizmo_id)
);

-- Denormalised counters keep feed queries bounded; triggers keep them exact.
create or replace function public.bump_reaction_count() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_kind public.reaction_kind; v_gizmo text; v_delta integer;
begin
  if tg_op = 'INSERT' then v_kind := new.kind; v_gizmo := new.gizmo_id; v_delta := 1;
  else v_kind := old.kind; v_gizmo := old.gizmo_id; v_delta := -1; end if;
  update public.gizmos set
    like_count = like_count + case when v_kind = 'like' then v_delta else 0 end,
    save_count = save_count + case when v_kind = 'save' then v_delta else 0 end,
    repost_count = repost_count + case when v_kind = 'repost' then v_delta else 0 end
  where id = v_gizmo;
  return null;
end $$;
create trigger reactions_count after insert or delete on public.reactions for each row execute function public.bump_reaction_count();

create or replace function public.bump_comment_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.gizmos set comment_count = comment_count + case when tg_op = 'INSERT' then 1 else -1 end
  where id = coalesce(new.gizmo_id, old.gizmo_id);
  return null;
end $$;
create trigger comments_count after insert or delete on public.comments for each row execute function public.bump_comment_count();

create or replace function public.bump_follower_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.target_id, old.target_id) is not null then
    update public.profiles set follower_count = follower_count + case when tg_op = 'INSERT' then 1 else -1 end
    where id = coalesce(new.target_id, old.target_id);
  end if;
  return null;
end $$;
create trigger follows_count after insert or delete on public.follows for each row execute function public.bump_follower_count();

-- Handle changes propagate to the denormalised creator handle.
create or replace function public.sync_creator_handle() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.handle is distinct from old.handle then
    update public.gizmos set creator_handle = new.handle where owner_id = new.id;
  end if;
  return new;
end $$;
create trigger profiles_sync_handle after update of handle on public.profiles for each row execute function public.sync_creator_handle();

-- ---------------------------------------------------------------------------------------------
-- Timetables, sharing codes and teacher-managed enrolments
-- ---------------------------------------------------------------------------------------------
create table public.schedule_codes (
  code text primary key check (code ~ '^[A-F0-9]{12}$'),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('personal', 'teacher')),
  title text not null check (char_length(title) between 1 and 70),
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index schedule_codes_owner_idx on public.schedule_codes (owner_id, kind);

create table public.schedules (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  content jsonb not null,
  managed_code text references public.schedule_codes (code) on delete set null,
  updated_at timestamptz not null default now()
);
create index schedules_managed_idx on public.schedules (managed_code) where managed_code is not null;

-- ---------------------------------------------------------------------------------------------
-- Invite rooms: immutable snapshots plus persisted membership
-- ---------------------------------------------------------------------------------------------
create table public.rooms (
  code text primary key check (code ~ '^[A-F0-9]{12}$'),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  gizmo_id text not null,
  source_version integer not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);
create index rooms_owner_idx on public.rooms (owner_id);
create table public.room_members (
  code text not null references public.rooms (code) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (code, user_id)
);
create index room_members_user_idx on public.room_members (user_id, joined_at desc);

create or replace function public.is_room_member(p_code text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.room_members m where m.code = p_code and m.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------------------------
-- Topic sessions (/study)
-- ---------------------------------------------------------------------------------------------
create table public.study_drafts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  content jsonb not null,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index study_drafts_owner_idx on public.study_drafts (owner_id, created_at desc);
create table public.study_assignments (
  code text primary key check (code ~ '^[A-Z0-9]{6}$'),
  draft_id uuid references public.study_drafts (id) on delete set null,
  owner_id uuid references public.profiles (id) on delete cascade,
  content jsonb not null,
  version integer not null,
  created_at timestamptz not null default now()
);
create index study_assignments_draft_idx on public.study_assignments (draft_id);
create table public.study_runs (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.study_assignments (code) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 30),
  missions jsonb not null,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index study_runs_code_idx on public.study_runs (code, created_at);
create index study_runs_user_idx on public.study_runs (user_id, created_at desc);
create table public.study_attempts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.study_runs (id) on delete cascade,
  mission_id text not null,
  answer text not null,
  correct boolean not null,
  created_at timestamptz not null default now()
);
create index study_attempts_run_idx on public.study_attempts (run_id, created_at);

-- ---------------------------------------------------------------------------------------------
-- Classroom lessons (/classroom, /play)
-- ---------------------------------------------------------------------------------------------
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  content jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
create index lessons_owner_idx on public.lessons (owner_id, updated_at desc);
create table public.lesson_versions (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  version integer not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  primary key (lesson_id, version)
);
create table public.lesson_publications (
  code text primary key check (code ~ '^[A-Z0-9]{6}$'),
  lesson_id uuid references public.lessons (id) on delete set null,
  owner_id uuid references public.profiles (id) on delete cascade,
  version integer not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);
create index lesson_publications_lesson_idx on public.lesson_publications (lesson_id, created_at desc);
create table public.classroom_sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null references public.lesson_publications (code) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 1 and 30),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (code, user_id)
);
create table public.classroom_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.classroom_sessions (id) on delete cascade,
  activity_id text not null,
  correct boolean not null,
  answer jsonb not null,
  feedback text not null,
  created_at timestamptz not null default now()
);
create index classroom_attempts_session_idx on public.classroom_attempts (session_id, created_at);

-- ---------------------------------------------------------------------------------------------
-- AI generation accounting
-- ---------------------------------------------------------------------------------------------
create table public.generation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  request_id uuid not null,
  kind text not null check (kind in ('gizmo', 'gizmo-edit', 'idea', 'lesson')),
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'rejected')),
  provider text not null default 'groq',
  model text not null default '',
  prompt_chars integer not null default 0,
  input_tokens integer,
  output_tokens integer,
  error_code text,
  gizmo_id text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (user_id, request_id)
);
create index generation_requests_user_idx on public.generation_requests (user_id, created_at desc);

create table public.usage_counters (
  scope text not null,
  window_start date not null,
  used integer not null default 0 check (used >= 0),
  primary key (scope, window_start)
);
