-- RH Desk: secure email invitations, independently verified by Supabase Auth.
-- No user is created and no invitation email is sent by this migration.
create schema if not exists rh_private;
revoke all on schema rh_private from public, anon, authenticated;

create table if not exists rh_private.rh_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.rh_organizations(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and char_length(email) <= 254),
  role text not null check (role in ('admin','recruiter','viewer')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  claimed_at timestamptz,
  claimed_user_id uuid references auth.users(id) on delete set null,
  unique (organization_id,email)
);
revoke all on rh_private.rh_invitations from public, anon, authenticated;

-- Security definer is intentional: users are forbidden to insert memberships
-- themselves. The caller cannot specify the email, organization or role.
create or replace function public.rh_claim_invitation()
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid;
  v_email text;
  v_invite rh_private.rh_invitations%rowtype;
begin
  v_user := (select auth.uid());
  if v_user is null then return false; end if;

  select lower(trim(u.email)) into v_email
  from auth.users as u
  where u.id = v_user
    and u.email is not null
    and u.email_confirmed_at is not null
    and coalesce(u.is_anonymous,false) = false;
  if v_email is null then return false; end if;

  select * into v_invite
  from rh_private.rh_invitations i
  where i.email = v_email
    and i.claimed_at is null
    and i.expires_at > now()
  order by i.created_at, i.id
  for update skip locked limit 1;
  if not found then return false; end if;

  insert into public.rh_memberships(organization_id,user_id,role)
  values (v_invite.organization_id,v_user,v_invite.role)
  on conflict (organization_id,user_id) do nothing;

  if not exists (
    select 1 from public.rh_memberships m
    where m.organization_id = v_invite.organization_id
      and m.user_id = v_user and m.role = v_invite.role
  ) then return false; end if;

  update rh_private.rh_invitations
  set claimed_at = now(), claimed_user_id = v_user
  where id = v_invite.id and claimed_at is null;

  return true;
end;
$$;

revoke all on function public.rh_claim_invitation() from public, anon, authenticated;
grant execute on function public.rh_claim_invitation() to authenticated;
