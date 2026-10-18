-- Row-level security, privileges and atomic database functions.

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.gizmos enable row level security;
alter table public.gizmo_drafts enable row level security;
alter table public.gizmo_versions enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.reports enable row level security;
alter table public.schedule_codes enable row level security;
alter table public.schedules enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.study_drafts enable row level security;
alter table public.study_assignments enable row level security;
alter table public.study_runs enable row level security;
alter table public.study_attempts enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_versions enable row level security;
alter table public.lesson_publications enable row level security;
alter table public.classroom_sessions enable row level security;
alter table public.classroom_attempts enable row level security;
alter table public.generation_requests enable row level security;
alter table public.usage_counters enable row level security;

-- Defence in depth: browser roles get no write privileges except the ones granted back below.
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon, authenticated;
revoke all on public.usage_counters from anon, authenticated;
revoke select on public.generation_requests, public.user_roles from anon;
grant insert, delete on public.reactions, public.follows to authenticated;
grant insert, delete on public.comments to authenticated;
grant insert on public.reports to authenticated;
grant update (handle, name, bio) on public.profiles to authenticated;

-- Profiles: public creator details are readable by signed-in users (guests included).
create policy profiles_read on public.profiles for select to authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy user_roles_read_own on public.user_roles for select to authenticated using (user_id = auth.uid());

-- Gizmos: published snapshots are public; unpublished rows remain visible only to their owner.
create policy gizmos_read on public.gizmos for select to anon, authenticated
  using (is_public or owner_id = auth.uid());
create policy gizmo_drafts_read_own on public.gizmo_drafts for select to authenticated using (owner_id = auth.uid());
create policy gizmo_versions_read_own on public.gizmo_versions for select to authenticated using (owner_id = auth.uid());

create policy reactions_read_own on public.reactions for select to authenticated using (user_id = auth.uid());
create policy reactions_insert_own on public.reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.gizmos g where g.id = gizmo_id and g.is_public));
create policy reactions_delete_own on public.reactions for delete to authenticated using (user_id = auth.uid());

create policy comments_read_visible on public.comments for select to authenticated
  using (exists (select 1 from public.gizmos g where g.id = gizmo_id and (g.is_public or g.owner_id = auth.uid())));
create policy comments_insert_own on public.comments for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.gizmos g where g.id = gizmo_id and g.is_public));
create policy comments_delete_own on public.comments for delete to authenticated using (user_id = auth.uid());

create policy follows_read_own on public.follows for select to authenticated using (follower_id = auth.uid());
create policy follows_insert_own on public.follows for insert to authenticated with check (follower_id = auth.uid());
create policy follows_delete_own on public.follows for delete to authenticated using (follower_id = auth.uid());

create policy reports_insert_own on public.reports for insert to authenticated with check (reporter_id = auth.uid());
create policy reports_read_own on public.reports for select to authenticated using (reporter_id = auth.uid());

create policy schedules_read_own on public.schedules for select to authenticated using (user_id = auth.uid());
create policy schedule_codes_read_own on public.schedule_codes for select to authenticated using (owner_id = auth.uid());

create policy rooms_read_members on public.rooms for select to authenticated
  using (owner_id = auth.uid() or public.is_room_member(code));
create policy room_members_read_members on public.room_members for select to authenticated
  using (public.is_room_member(code));

create policy study_drafts_read_own on public.study_drafts for select to authenticated using (owner_id = auth.uid() and public.is_teacher());
create policy study_assignments_read_own on public.study_assignments for select to authenticated using (owner_id = auth.uid());
create policy study_runs_read on public.study_runs for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.study_assignments a where a.code = study_runs.code and a.owner_id = auth.uid()));
create policy study_attempts_read on public.study_attempts for select to authenticated
  using (exists (select 1 from public.study_runs r where r.id = run_id and (r.user_id = auth.uid()
    or exists (select 1 from public.study_assignments a where a.code = r.code and a.owner_id = auth.uid()))));

create policy lessons_read_own on public.lessons for select to authenticated using (owner_id = auth.uid() and public.is_teacher());
create policy lesson_versions_read_own on public.lesson_versions for select to authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id and l.owner_id = auth.uid()));
create policy lesson_publications_read_own on public.lesson_publications for select to authenticated using (owner_id = auth.uid());
create policy classroom_sessions_read on public.classroom_sessions for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.lesson_publications p where p.code = classroom_sessions.code and p.owner_id = auth.uid()));
create policy classroom_attempts_read on public.classroom_attempts for select to authenticated
  using (exists (select 1 from public.classroom_sessions s where s.id = session_id and (s.user_id = auth.uid()
    or exists (select 1 from public.lesson_publications p where p.code = s.code and p.owner_id = auth.uid()))));

create policy generation_requests_read_own on public.generation_requests for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------------------------
-- Caller-scoped functions (run as the signed-in user; RLS still applies where invoker)
-- ---------------------------------------------------------------------------------------------
create or replace function public.set_reaction(p_gizmo text, p_kind public.reaction_kind, p_on boolean)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_count integer;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  if p_on then
    insert into public.reactions (user_id, gizmo_id, kind) values (auth.uid(), p_gizmo, p_kind) on conflict do nothing;
  else
    delete from public.reactions where user_id = auth.uid() and gizmo_id = p_gizmo and kind = p_kind;
  end if;
  select case p_kind when 'like' then like_count when 'save' then save_count else repost_count end
    into v_count from public.gizmos where id = p_gizmo;
  if v_count is null then raise exception 'Gizmo not found.' using errcode = 'P0002'; end if;
  return jsonb_build_object('on', p_on, 'count', v_count);
end $$;

create or replace function public.set_follow(p_handle text, p_on boolean)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_target uuid; v_persona text;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  if lower(p_handle) in ('nova.exe', 'orbitclub', 'softsystems', 'pixelmoss') then v_persona := lower(p_handle);
  else
    select id into v_target from public.profiles where lower(handle) = lower(p_handle);
    if v_target is null then raise exception 'Creator not found.' using errcode = 'P0002'; end if;
    if v_target = auth.uid() then raise exception 'You cannot follow yourself.' using errcode = '22023'; end if;
  end if;
  if p_on then
    insert into public.follows (follower_id, target_id, target_persona) values (auth.uid(), v_target, v_persona) on conflict do nothing;
  else
    delete from public.follows where follower_id = auth.uid() and target_id is not distinct from v_target and target_persona is not distinct from v_persona;
  end if;
  return jsonb_build_object('on', p_on);
end $$;

create or replace function public.add_comment(p_gizmo text, p_body text, p_client_id uuid)
returns public.comments language plpgsql security invoker set search_path = '' as $$
declare v_row public.comments;
begin
  insert into public.comments (gizmo_id, user_id, client_id, body) values (p_gizmo, auth.uid(), p_client_id, btrim(p_body))
  on conflict (user_id, client_id) do nothing returning * into v_row;
  if v_row.id is null then select * into v_row from public.comments where user_id = auth.uid() and client_id = p_client_id; end if;
  return v_row;
end $$;

create or replace function public.random_code(p_length integer) returns text
language sql volatile set search_path = '' as $$
  select upper(substr(encode(extensions.gen_random_bytes(16), 'hex'), 1, p_length));
$$;

-- Effective timetable: a teacher-managed code overrides the student's own copy.
create or replace function public.schedule_state()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_row public.schedules; v_code public.schedule_codes;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  select * into v_row from public.schedules where user_id = auth.uid();
  if v_row.managed_code is not null then select * into v_code from public.schedule_codes where code = v_row.managed_code; end if;
  return jsonb_build_object(
    'own', v_row.content,
    'effective', coalesce(v_code.content, v_row.content),
    'link', case when v_code.code is null then null else jsonb_build_object('code', v_code.code, 'title', v_code.title) end,
    'isTeacher', public.has_role(auth.uid(), 'teacher'));
end $$;

create or replace function public.schedule_by_code(p_code text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case when auth.uid() is null then null else
    (select jsonb_build_object('code', c.code, 'kind', c.kind, 'title', c.title, 'schedule', c.content)
     from public.schedule_codes c where c.code = upper(p_code)) end;
$$;

create or replace function public.share_schedule(p_kind text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_row public.schedules; v_code text;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  if p_kind not in ('personal', 'teacher') then raise exception 'Unknown share kind.' using errcode = '22023'; end if;
  if p_kind = 'teacher' and not public.has_role(auth.uid(), 'teacher') then
    raise exception 'Teacher sign-in required to publish a managed timetable.' using errcode = '42501';
  end if;
  select * into v_row from public.schedules where user_id = auth.uid();
  if v_row.managed_code is not null then raise exception 'A teacher-managed timetable cannot be re-shared as your own.' using errcode = '42501'; end if;
  if v_row.content is null or not coalesce((v_row.content->>'enabled')::boolean, false) or jsonb_array_length(coalesce(v_row.content->'slots', '[]'::jsonb)) = 0 then
    raise exception 'Save an enabled timetable with at least one class before sharing.' using errcode = '22023';
  end if;
  loop
    v_code := public.random_code(12);
    exit when not exists (select 1 from public.schedule_codes where code = v_code);
  end loop;
  insert into public.schedule_codes (code, owner_id, kind, title, content) values (v_code, auth.uid(), p_kind, v_row.content->>'title', v_row.content);
  return v_code;
end $$;

create or replace function public.join_schedule(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_row public.schedules; v_code public.schedule_codes;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  select * into v_row from public.schedules where user_id = auth.uid() for update;
  if v_row.managed_code is not null then
    raise exception 'Ask your teacher to release the current managed timetable before changing schedules.' using errcode = '42501';
  end if;
  select * into v_code from public.schedule_codes where code = upper(p_code);
  if v_code.code is null then raise exception 'Schedule code not found.' using errcode = 'P0002'; end if;
  if v_code.kind = 'teacher' and v_code.owner_id = auth.uid() then raise exception 'This is your own class timetable.' using errcode = '22023'; end if;
  insert into public.schedules (user_id, content, managed_code, updated_at)
  values (auth.uid(), v_code.content, case when v_code.kind = 'teacher' then v_code.code end, now())
  on conflict (user_id) do update set content = excluded.content, managed_code = excluded.managed_code, updated_at = now();
end $$;

create or replace function public.teacher_enrolments()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('code', c.code, 'title', c.title, 'updatedAt', c.updated_at,
    'students', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'handle', p.handle) order by p.handle), '[]'::jsonb)
                 from public.schedules s join public.profiles p on p.id = s.user_id where s.managed_code = c.code))
    order by c.created_at desc), '[]'::jsonb)
  from public.schedule_codes c
  where c.owner_id = auth.uid() and c.kind = 'teacher' and public.has_role(auth.uid(), 'teacher');
$$;

create or replace function public.release_enrolment(p_code text, p_student uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.has_role(auth.uid(), 'teacher') or not exists (
    select 1 from public.schedule_codes where code = p_code and owner_id = auth.uid() and kind = 'teacher') then
    raise exception 'Only the teacher who published this timetable can release students from it.' using errcode = '42501';
  end if;
  update public.schedules set managed_code = null, updated_at = now() where user_id = p_student and managed_code = p_code;
end $$;

create or replace function public.create_room(p_gizmo text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_draft public.gizmo_drafts; v_code text;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  select * into v_draft from public.gizmo_drafts where id = p_gizmo and owner_id = auth.uid();
  if v_draft.id is null then raise exception 'Save your own custom gizmo before inviting friends.' using errcode = '42501'; end if;
  loop
    v_code := public.random_code(12);
    exit when not exists (select 1 from public.rooms where code = v_code);
  end loop;
  insert into public.rooms (code, owner_id, gizmo_id, source_version, snapshot) values (v_code, auth.uid(), v_draft.id, v_draft.version, v_draft.definition);
  insert into public.room_members (code, user_id) values (v_code, auth.uid());
  return v_code;
end $$;

create or replace function public.join_room(p_code text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  if not exists (select 1 from public.rooms where code = upper(p_code)) then raise exception 'Room not found. Check the invite code.' using errcode = 'P0002'; end if;
  insert into public.room_members (code, user_id) values (upper(p_code), auth.uid()) on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Service-role functions: called only by server routes after Zod validation, with a verified actor
-- ---------------------------------------------------------------------------------------------
create or replace function public.save_gizmo_draft(p_actor uuid, p_id text, p_definition jsonb, p_schema_version integer,
  p_expected_version integer, p_provenance jsonb, p_note text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_draft public.gizmo_drafts; v_version integer;
begin
  select * into v_draft from public.gizmo_drafts where id = p_id for update;
  if v_draft.id is null then
    if p_expected_version <> 0 then raise exception 'This draft no longer exists. Reopen it before saving.' using errcode = '40001'; end if;
    if exists (select 1 from public.gizmos where id = p_id) then raise exception 'Only the owner can edit this gizmo.' using errcode = '42501'; end if;
    v_version := 1;
    insert into public.gizmo_drafts (id, owner_id, definition, schema_version, version) values (p_id, p_actor, p_definition, p_schema_version, 1);
  else
    if v_draft.owner_id <> p_actor then raise exception 'Only the owner can edit this gizmo.' using errcode = '42501'; end if;
    if v_draft.version <> p_expected_version then raise exception 'This draft changed in another tab. Reopen it before saving.' using errcode = '40001'; end if;
    v_version := v_draft.version + 1;
    update public.gizmo_drafts set definition = p_definition, schema_version = p_schema_version, version = v_version, updated_at = now() where id = p_id;
  end if;
  insert into public.gizmo_versions (gizmo_id, version, owner_id, definition, provenance, note)
  values (p_id, v_version, p_actor, p_definition, coalesce(p_provenance, '{}'::jsonb), coalesce(p_note, ''));
  return v_version;
end $$;

create or replace function public.publish_gizmo(p_actor uuid, p_id text, p_expected_version integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_draft public.gizmo_drafts; v_handle text;
begin
  select * into v_draft from public.gizmo_drafts where id = p_id for update;
  if v_draft.id is null or v_draft.owner_id <> p_actor then raise exception 'Only the owner can publish this gizmo.' using errcode = '42501'; end if;
  if v_draft.version <> p_expected_version then raise exception 'Draft changed. Review the latest version before publishing.' using errcode = '40001'; end if;
  select handle into v_handle from public.profiles where id = p_actor;
  insert into public.gizmos (id, owner_id, authored, creator_handle, is_public, definition, schema_version, published_version, published_at, feed_sort,
    subject, engine, title, caption, ai_generated)
  values (p_id, p_actor, false, v_handle, true, v_draft.definition, v_draft.schema_version, v_draft.version, now(), now(),
    v_draft.definition->>'subject', v_draft.definition->>'engine', v_draft.definition->>'title', coalesce(v_draft.definition->>'caption', ''),
    coalesce(v_draft.definition #>> '{provenance,kind}', '') = 'ai')
  on conflict (id) do update set definition = excluded.definition, schema_version = excluded.schema_version, published_version = excluded.published_version,
    published_at = now(), is_public = true, subject = excluded.subject, engine = excluded.engine, title = excluded.title, caption = excluded.caption,
    ai_generated = excluded.ai_generated, reviewed_by = null, updated_at = now()
  where public.gizmos.owner_id = p_actor;
  if not found then raise exception 'Only the owner can publish this gizmo.' using errcode = '42501'; end if;
  return v_draft.version;
end $$;

create or replace function public.unpublish_gizmo(p_actor uuid, p_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.gizmos set is_public = false, updated_at = now() where id = p_id and owner_id = p_actor;
  if not found then raise exception 'Only the owner can unpublish this gizmo.' using errcode = '42501'; end if;
end $$;

create or replace function public.restore_gizmo_version(p_actor uuid, p_id text, p_version integer, p_expected_version integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_old public.gizmo_versions;
begin
  select * into v_old from public.gizmo_versions where gizmo_id = p_id and version = p_version and owner_id = p_actor;
  if v_old.gizmo_id is null then raise exception 'Saved version not found.' using errcode = 'P0002'; end if;
  return public.save_gizmo_draft(p_actor, p_id, v_old.definition, (v_old.definition->>'schemaVersion')::integer, p_expected_version,
    v_old.provenance, 'Restored version ' || p_version);
end $$;

create or replace function public.save_schedule(p_actor uuid, p_content jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_row public.schedules;
begin
  select * into v_row from public.schedules where user_id = p_actor for update;
  if v_row.managed_code is not null then
    raise exception 'Teacher-managed timetable. Your teacher must release it before you can change it.' using errcode = '42501';
  end if;
  insert into public.schedules (user_id, content, updated_at) values (p_actor, p_content, now())
  on conflict (user_id) do update set content = excluded.content, updated_at = now();
  if public.has_role(p_actor, 'teacher') then
    update public.schedule_codes set content = p_content, title = p_content->>'title', updated_at = now()
    where owner_id = p_actor and kind = 'teacher';
  end if;
end $$;

-- Atomic quota check + idempotent request registration.
create or replace function public.begin_generation(p_actor uuid, p_request_id uuid, p_kind text, p_model text, p_prompt_chars integer,
  p_user_daily integer, p_global_daily integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_existing public.generation_requests; v_user integer; v_global integer; v_day date := (now() at time zone 'utc')::date;
begin
  select * into v_existing from public.generation_requests where user_id = p_actor and request_id = p_request_id;
  if v_existing.id is not null then return jsonb_build_object('ok', false, 'reason', 'duplicate', 'status', v_existing.status); end if;
  insert into public.usage_counters (scope, window_start, used) values ('global', v_day, 0), ('user:' || p_actor, v_day, 0) on conflict do nothing;
  -- Lock global first, then the user row, in a fixed order to avoid deadlocks.
  select used into v_global from public.usage_counters where scope = 'global' and window_start = v_day for update;
  select used into v_user from public.usage_counters where scope = 'user:' || p_actor and window_start = v_day for update;
  if v_global >= p_global_daily then return jsonb_build_object('ok', false, 'reason', 'global-quota'); end if;
  if v_user >= p_user_daily then return jsonb_build_object('ok', false, 'reason', 'user-quota'); end if;
  update public.usage_counters set used = used + 1 where window_start = v_day and scope in ('global', 'user:' || p_actor);
  insert into public.generation_requests (user_id, request_id, kind, model, prompt_chars) values (p_actor, p_request_id, p_kind, p_model, p_prompt_chars);
  return jsonb_build_object('ok', true, 'userRemaining', p_user_daily - v_user - 1, 'globalRemaining', p_global_daily - v_global - 1);
end $$;

create or replace function public.finish_generation(p_actor uuid, p_request_id uuid, p_status text, p_error text,
  p_input_tokens integer, p_output_tokens integer, p_gizmo text)
returns void language sql security definer set search_path = '' as $$
  update public.generation_requests set status = p_status, error_code = p_error, input_tokens = p_input_tokens,
    output_tokens = p_output_tokens, gizmo_id = p_gizmo, finished_at = now()
  where user_id = p_actor and request_id = p_request_id;
$$;

create or replace function public.save_lesson(p_actor uuid, p_id uuid, p_content jsonb, p_expected_version integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_row public.lessons; v_id uuid := coalesce(p_id, gen_random_uuid()); v_version integer;
begin
  if not public.has_role(p_actor, 'teacher') then raise exception 'Teacher access required.' using errcode = '42501'; end if;
  if p_id is null then
    v_version := 1;
    insert into public.lessons (id, owner_id, content, version) values (v_id, p_actor, p_content, 1);
  else
    select * into v_row from public.lessons where id = p_id for update;
    if v_row.id is null or v_row.owner_id <> p_actor then raise exception 'Lesson not found.' using errcode = 'P0002'; end if;
    if v_row.version <> p_expected_version then raise exception 'This draft changed in another tab. Reload before saving.' using errcode = '40001'; end if;
    v_version := v_row.version + 1;
    update public.lessons set content = p_content, version = v_version, updated_at = now() where id = p_id;
  end if;
  insert into public.lesson_versions (lesson_id, version, content) values (v_id, v_version, p_content);
  return jsonb_build_object('id', v_id, 'version', v_version);
end $$;

-- Lock down execution: caller-scoped functions for signed-in users, the rest for the service role only.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.set_reaction(text, public.reaction_kind, boolean), public.set_follow(text, boolean),
  public.add_comment(text, text, uuid), public.schedule_state(), public.schedule_by_code(text), public.share_schedule(text),
  public.join_schedule(text), public.teacher_enrolments(), public.release_enrolment(text, uuid), public.create_room(text),
  public.join_room(text), public.is_room_member(text), public.is_teacher()
  to authenticated;
grant execute on all functions in schema public to service_role;
