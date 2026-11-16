-- RH Desk: organization-scoped workspaces and authenticated access.
-- Run in Supabase SQL Editor after reviewing the schema.
-- No public signup or anonymous access is granted here.

create extension if not exists pgcrypto;

create table if not exists public.rh_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table if not exists public.rh_memberships (
  organization_id uuid not null references public.rh_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','recruiter','viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);
create index if not exists rh_memberships_user_idx on public.rh_memberships(user_id);

create table if not exists public.rh_workspaces (
  organization_id uuid primary key references public.rh_organizations(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.rh_audit_events (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.rh_organizations(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  revision bigint not null,
  action text not null,
  created_at timestamptz not null default now()
);
create index if not exists rh_audit_org_idx on public.rh_audit_events(organization_id,created_at desc);

alter table public.rh_organizations enable row level security;
alter table public.rh_memberships enable row level security;
alter table public.rh_workspaces enable row level security;
alter table public.rh_audit_events enable row level security;

-- All user lookups are constrained to membership of the requesting user.
drop policy if exists "rh members read their membership" on public.rh_memberships;
create policy "rh members read their membership" on public.rh_memberships
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "rh members read their org" on public.rh_organizations;
create policy "rh members read their org" on public.rh_organizations
  for select to authenticated using (
    exists (
      select 1 from public.rh_memberships m
      where m.organization_id = id and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "rh members read workspace" on public.rh_workspaces;
create policy "rh members read workspace" on public.rh_workspaces
  for select to authenticated using (
    exists (
      select 1 from public.rh_memberships m
      where m.organization_id = rh_workspaces.organization_id and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "rh admins view audit" on public.rh_audit_events;
create policy "rh admins view audit" on public.rh_audit_events
  for select to authenticated using (
    exists (
      select 1 from public.rh_memberships m
      where m.organization_id = rh_audit_events.organization_id
        and m.user_id = (select auth.uid()) and m.role = 'admin'
    )
  );

-- Read-only grants for authenticated users; there are NO insert/update/delete
-- grants or policies on the tables. Writes require the checked RPC below.
revoke all on public.rh_organizations, public.rh_memberships,
  public.rh_workspaces, public.rh_audit_events from anon, authenticated;
grant select on public.rh_organizations, public.rh_memberships,
  public.rh_workspaces, public.rh_audit_events to authenticated;

-- SECURITY DEFINER is necessary because direct writes are denied.
-- This function checks the actual auth.uid() against membership, pins the
-- search path, validates a snapshot, and uses optimistic concurrency.
create or replace function public.rh_save_workspace(
  p_org uuid, p_data jsonb, p_expected_revision bigint
) returns bigint
language plpgsql security definer set search_path = ''
as $$
declare v_next bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.rh_memberships m
    where m.organization_id = p_org and m.user_id = (select auth.uid())
      and m.role in ('admin','recruiter')
  ) then
    raise exception 'access_denied' using errcode = '42501';
  end if;
  if p_data is null
    or jsonb_typeof(p_data) != 'object'
    or p_data->>'version' != '1'
    or jsonb_typeof(p_data->'jobs') != 'array'
    or jsonb_typeof(p_data->'candidates') != 'array'
    or octet_length(p_data::text) > 1048576 then
    raise exception 'invalid_snapshot' using errcode = '22023';
  end if;

  update public.rh_workspaces
  set data = p_data, revision = revision + 1, updated_at = now()
  where organization_id = p_org and revision = p_expected_revision
  returning revision into v_next;

  if not found then
    raise exception 'revision_conflict' using errcode = '40001';
  end if;

  insert into public.rh_audit_events(organization_id, actor_id, revision, action)
    values (p_org, (select auth.uid()), v_next, 'workspace.saved');
  return v_next;
end;
$$;

revoke all on function public.rh_save_workspace(uuid,jsonb,bigint) from public, anon;
grant execute on function public.rh_save_workspace(uuid,jsonb,bigint) to authenticated;

-- The Supabase project must disable public self-signup for invite-only users.
-- Bootstrap a workspace using the accompanying bootstrap.example.sql.
