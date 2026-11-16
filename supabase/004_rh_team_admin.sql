-- RH Desk Online: team administration and invite-only, organization-scoped membership.
-- Apply ONLY after review/approval of the Sprint 4 PR, before deploying /team.
-- No emails are sent, and no Supabase Auth user accounts are created.
-- Security definer functions explicitly validate membership and are callable
-- only by the authenticated role. Anonymous access is denied.

-- Readers cannot SELECT another user's membership directly.
-- The administrator-only RPC below returns only members of their org.

create or replace function public.rh_team_overview(p_org uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_result jsonb;
begin
  if v_user is null or not exists (
    select 1 from public.rh_memberships
    where organization_id = p_org and user_id = v_user and role = 'admin'
  ) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'userId', m.user_id,
        'email', u.email,
        'role', m.role,
        'createdAt', m.created_at
      ) order by m.created_at, m.user_id)
      from public.rh_memberships m
      join auth.users u on u.id = m.user_id
      where m.organization_id = p_org
    ), '[]'::jsonb),
    'invitations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'email', i.email,
        'role', i.role,
        'createdAt', i.created_at,
        'expiresAt', i.expires_at
      ) order by i.created_at desc, i.id)
      from rh_private.rh_invitations i
      where i.organization_id = p_org and i.claimed_at is null
    ), '[]'::jsonb)
  ) into v_result;
  return v_result;
end
$function$;

create or replace function public.rh_team_invite(p_org uuid,p_email text,p_role text)
returns uuid
language plpgsql security definer set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_email text := lower(trim(coalesce(p_email,'')));
  v_invite_id uuid;
begin
  if v_actor is null or not exists (
    select 1 from public.rh_memberships
    where organization_id=p_org and user_id=v_actor and role='admin'
  ) then raise exception 'admin_required' using errcode='42501'; end if;

  if length(v_email) < 5 or length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or p_role is null or p_role not in ('admin','recruiter','viewer') then
    raise exception 'invalid_invitation' using errcode='22023';
  end if;

  -- Serialize concurrent membership management and check again after locking.
  perform 1 from public.rh_organizations where id = p_org for update;
  if not found or not exists (
    select 1 from public.rh_memberships
    where organization_id=p_org and user_id=v_actor and role='admin'
  ) then raise exception 'admin_required' using errcode='42501'; end if;

  if exists (
    select 1 from public.rh_memberships m
    join auth.users u on u.id=m.user_id
    where m.organization_id=p_org and lower(trim(u.email))=v_email
  ) then raise exception 'already_member' using errcode='23505'; end if;

  insert into rh_private.rh_invitations(organization_id,email,role,expires_at)
  values (p_org,v_email,p_role,now()+interval '14 days')
  on conflict (organization_id,email) do update
    set role=excluded.role,created_at=now(),expires_at=now()+interval '14 days',
        claimed_at=null,claimed_user_id=null
  returning id into v_invite_id;

  insert into public.rh_audit_events(organization_id,actor_id,revision,action)
  values (p_org,v_actor,(select revision from public.rh_workspaces where organization_id=p_org),'team.invitation_created');
  return v_invite_id;
end
$function$;

create or replace function public.rh_team_set_role(p_org uuid,p_user uuid,p_role text)
returns boolean
language plpgsql security definer set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_current text;
begin
  if v_actor is null or not exists (
    select 1 from public.rh_memberships
    where organization_id=p_org and user_id=v_actor and role='admin'
  ) then raise exception 'admin_required' using errcode='42501'; end if;
  if p_role is null or p_role not in ('admin','recruiter','viewer') then
    raise exception 'invalid_role' using errcode='22023'; end if;
  if p_user=v_actor then raise exception 'cannot_change_own_role' using errcode='42501'; end if;

  perform 1 from public.rh_organizations where id=p_org for update;
  if not found or not exists (
    select 1 from public.rh_memberships
    where organization_id=p_org and user_id=v_actor and role='admin'
  ) then raise exception 'admin_required' using errcode='42501'; end if;

  select role into v_current from public.rh_memberships
  where organization_id=p_org and user_id=p_user for update;
  if v_current is null then raise exception 'member_not_found' using errcode='22023'; end if;
  if v_current='admin' and p_role<>'admin' and (
    select count(*) from public.rh_memberships where organization_id=p_org and role='admin'
  ) <= 1 then raise exception 'last_admin_required' using errcode='42501'; end if;

  if v_current = p_role then return true; end if;
  update public.rh_memberships set role=p_role where organization_id=p_org and user_id=p_user;
  insert into public.rh_audit_events(organization_id,actor_id,revision,action)
  values (p_org,v_actor,(select revision from public.rh_workspaces where organization_id=p_org),'team.role_changed');
  return true;
end
$function$;

create or replace function public.rh_team_remove_member(p_org uuid,p_user uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
  v_role text;
begin
  if v_actor is null or not exists (
    select 1 from public.rh_memberships
    where organization_id=p_org and user_id=v_actor and role='admin'
  ) then raise exception 'admin_required' using errcode='42501'; end if;
  if p_user=v_actor then raise exception 'cannot_remove_self' using errcode='42501'; end if;
  perform 1 from public.rh_organizations where id=p_org for update;
  if not found or not exists (
    select 1 from public.rh_memberships
    where organization_id=p_org and user_id=v_actor and role='admin'
  ) then raise exception 'admin_required' using errcode='42501'; end if;
  select role into v_role from public.rh_memberships
  where organization_id=p_org and user_id=p_user for update;
  if v_role is null then raise exception 'member_not_found' using errcode='22023'; end if;
  if v_role='admin' and (
    select count(*) from public.rh_memberships where organization_id=p_org and role='admin'
  ) <= 1 then raise exception 'last_admin_required' using errcode='42501'; end if;

  delete from public.rh_memberships where organization_id=p_org and user_id=p_user;
  insert into public.rh_audit_events(organization_id,actor_id,revision,action)
  values (p_org,v_actor,(select revision from public.rh_workspaces where organization_id=p_org),'team.member_removed');
  return true;
end
$function$;

create or replace function public.rh_team_cancel_invitation(p_org uuid,p_invite uuid)
returns boolean
language plpgsql security definer set search_path = ''
as $function$
declare
  v_actor uuid := (select auth.uid());
begin
  if v_actor is null or not exists (
    select 1 from public.rh_memberships
    where organization_id=p_org and user_id=v_actor and role='admin'
  ) then raise exception 'admin_required' using errcode='42501'; end if;

  delete from rh_private.rh_invitations
  where id=p_invite and organization_id=p_org and claimed_at is null;
  if not found then raise exception 'invitation_not_found' using errcode='22023'; end if;

  insert into public.rh_audit_events(organization_id,actor_id,revision,action)
  values (p_org,v_actor,(select revision from public.rh_workspaces where organization_id=p_org),'team.invitation_cancelled');
  return true;
end
$function$;

-- No RPC is executable by anon/Public; an authenticated caller must also
-- satisfy the admin checks above. Never grant SELECT on auth.users.
revoke all on function public.rh_team_overview(uuid) from public,anon,authenticated;
revoke all on function public.rh_team_invite(uuid,text,text) from public,anon,authenticated;
revoke all on function public.rh_team_set_role(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.rh_team_remove_member(uuid,uuid) from public,anon,authenticated;
revoke all on function public.rh_team_cancel_invitation(uuid,uuid) from public,anon,authenticated;

grant execute on function public.rh_team_overview(uuid) to authenticated;
grant execute on function public.rh_team_invite(uuid,text,text) to authenticated;
grant execute on function public.rh_team_set_role(uuid,uuid,text) to authenticated;
grant execute on function public.rh_team_remove_member(uuid,uuid) to authenticated;
grant execute on function public.rh_team_cancel_invitation(uuid,uuid) to authenticated;
