-- Creator pilot: immutable share snapshots (private link or public showcase) and remix lineage.
-- Snapshots are copies of a saved draft version; editing the source never changes them.

create table public.creator_shares (
  token text primary key check (token ~ '^[a-f0-9]{48}$'),
  gizmo_id text not null references public.gizmo_drafts (id) on delete cascade,
  version integer not null,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  snapshot jsonb not null,
  visibility text not null check (visibility in ('private', 'public')),
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create index creator_shares_owner_idx on public.creator_shares (owner_id, gizmo_id, created_at desc);
create index creator_shares_showcase_idx on public.creator_shares (created_at desc) where visibility = 'public' and not revoked;
create unique index creator_shares_live_unique on public.creator_shares (gizmo_id, version, visibility) where not revoked;

create table public.creator_forks (
  gizmo_id text primary key references public.gizmo_drafts (id) on delete cascade,
  parent_id text not null,
  parent_version integer not null,
  parent_token text not null,
  parent_creator text not null,
  parent_title text not null
);

alter table public.creator_shares enable row level security;
alter table public.creator_forks enable row level security;
revoke insert, update, delete, truncate, references, trigger on public.creator_shares, public.creator_forks from anon, authenticated;
create policy creator_shares_read_own on public.creator_shares for select to authenticated using (owner_id = auth.uid());
create policy creator_forks_read_own on public.creator_forks for select to authenticated
  using (exists (select 1 from public.gizmo_drafts d where d.id = gizmo_id and d.owner_id = auth.uid()));

alter table public.generation_requests drop constraint generation_requests_kind_check;
alter table public.generation_requests add constraint generation_requests_kind_check check (kind in ('gizmo', 'gizmo-edit', 'idea', 'lesson', 'creator'));

-- Anyone signed in who holds a live token can play that snapshot. The parent token of a remix is only
-- revealed while the parent link is live and public (or owned by the caller), so private links don't leak.
create or replace function public.creator_share(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare v_share public.creator_shares; v_fork public.creator_forks; v_parent public.creator_shares; v_creator text; v_name text;
begin
  if auth.uid() is null then raise exception 'Sign in first.' using errcode = '28000'; end if;
  select * into v_share from public.creator_shares where token = p_token and not revoked;
  if v_share.token is null then raise exception 'This link is unavailable or has been revoked.' using errcode = 'P0002'; end if;
  select handle, name into v_creator, v_name from public.profiles where id = v_share.owner_id;
  select * into v_fork from public.creator_forks where gizmo_id = v_share.gizmo_id;
  if v_fork.gizmo_id is not null then select * into v_parent from public.creator_shares where token = v_fork.parent_token; end if;
  return jsonb_build_object('gizmo', v_share.snapshot || jsonb_build_object('id', v_share.gizmo_id, 'creator', v_creator, 'creatorName', v_name),
    'version', v_share.version, 'visibility', v_share.visibility, 'owned', v_share.owner_id = auth.uid(),
    'lineage', case when v_fork.gizmo_id is null then null else
      jsonb_build_object('parent', v_fork.parent_id, 'parent_version', v_fork.parent_version, 'creator', v_fork.parent_creator, 'title', v_fork.parent_title)
      || case when v_parent.token is not null and not v_parent.revoked and (v_parent.visibility = 'public' or v_parent.owner_id = auth.uid())
              then jsonb_build_object('parent_token', v_parent.token) else '{}'::jsonb end end);
end $$;

create or replace function public.creator_showcase()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(y.item order by y.created_at desc), '[]'::jsonb) from (
    select x.item, x.created_at from (
      select distinct on (s.gizmo_id) s.created_at,
        jsonb_build_object('token', s.token, 'version', s.version,
          'gizmo', s.snapshot || jsonb_build_object('id', s.gizmo_id, 'creator', p.handle, 'creatorName', p.name)) as item
      from public.creator_shares s join public.profiles p on p.id = s.owner_id
      where s.visibility = 'public' and not s.revoked and auth.uid() is not null
      order by s.gizmo_id, s.created_at desc) x
    order by x.created_at desc limit 20) y;
$$;

create or replace function public.create_share(p_actor uuid, p_gizmo text, p_version integer, p_visibility text, p_token text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_draft public.gizmo_drafts; v_existing text;
begin
  select * into v_draft from public.gizmo_drafts where id = p_gizmo for update;
  if v_draft.id is null or v_draft.owner_id <> p_actor then raise exception 'This project is not yours or no longer exists.' using errcode = '42501'; end if;
  if v_draft.version <> p_version then raise exception 'Save or reopen the current version before sharing.' using errcode = '40001'; end if;
  if p_visibility = 'public' and not exists (select 1 from public.gizmos g where g.id = p_gizmo and g.is_public and g.published_version = p_version) then
    raise exception 'Publish this version before adding it to the showcase.' using errcode = '22023';
  end if;
  select token into v_existing from public.creator_shares where gizmo_id = p_gizmo and version = p_version and visibility = p_visibility and not revoked;
  if v_existing is not null then return v_existing; end if;
  insert into public.creator_shares (token, gizmo_id, version, owner_id, snapshot, visibility) values (p_token, p_gizmo, p_version, p_actor, v_draft.definition, p_visibility);
  return p_token;
end $$;

create or replace function public.revoke_share(p_actor uuid, p_token text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.creator_shares set revoked = true where token = p_token and owner_id = p_actor;
  if not found then raise exception 'That link is not yours.' using errcode = '42501'; end if;
end $$;

-- A remix is a new draft owned by the caller, copied from a live snapshot, with recorded lineage.
create or replace function public.remix_share(p_actor uuid, p_token text, p_id text)
returns text language plpgsql security definer set search_path = '' as $$
declare v_share public.creator_shares; v_parent_handle text; v_def jsonb; v_title text;
begin
  select * into v_share from public.creator_shares where token = p_token and not revoked;
  if v_share.token is null then raise exception 'This link is unavailable or has been revoked.' using errcode = 'P0002'; end if;
  if (select name from public.profiles where id = p_actor) = 'You' then raise exception 'Choose your display name before making a remix.' using errcode = '22023'; end if;
  select handle into v_parent_handle from public.profiles where id = v_share.owner_id;
  v_title := v_share.snapshot->>'title';
  v_def := v_share.snapshot || jsonb_build_object('title', left(v_title || ' remix', 70),
    'attribution', left('Remixed from ' || v_title || ' by @' || v_parent_handle, 200),
    'provenance', jsonb_build_object('kind', 'remix', 'remixOf', v_share.gizmo_id, 'reviewed', false));
  perform public.save_gizmo_draft(p_actor, p_id, v_def, (v_def->>'schemaVersion')::integer, 0, v_def->'provenance', 'Remix of a shared snapshot');
  insert into public.creator_forks values (p_id, v_share.gizmo_id, v_share.version, v_share.token, v_parent_handle, v_title);
  return p_id;
end $$;

-- Unpublishing also revokes that project's public showcase links; private snapshots and remixes stay.
create or replace function public.unpublish_gizmo(p_actor uuid, p_id text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.gizmos set is_public = false, updated_at = now() where id = p_id and owner_id = p_actor;
  if not found then raise exception 'Only the owner can unpublish this gizmo.' using errcode = '42501'; end if;
  update public.creator_shares set revoked = true where gizmo_id = p_id and owner_id = p_actor and visibility = 'public';
end $$;

revoke execute on function public.creator_share(text), public.creator_showcase(), public.create_share(uuid, text, integer, text, text),
  public.revoke_share(uuid, text), public.remix_share(uuid, text, text), public.unpublish_gizmo(uuid, text) from public, anon, authenticated;
grant execute on function public.creator_share(text), public.creator_showcase() to authenticated;
grant execute on function public.creator_share(text), public.creator_showcase(), public.create_share(uuid, text, integer, text, text),
  public.revoke_share(uuid, text), public.remix_share(uuid, text, text), public.unpublish_gizmo(uuid, text) to service_role;
