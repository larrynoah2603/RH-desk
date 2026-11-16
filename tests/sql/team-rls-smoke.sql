-- Disposable Postgres smoke tests. Fails on authorization or schema regressions.
insert into auth.users(id,email,email_confirmed_at,is_anonymous) values
('11111111-1111-4111-8111-111111111111','admin@example.test',now(),false),
('22222222-2222-4222-8222-222222222222','recruiter@example.test',now(),false),
('33333333-3333-4333-8333-333333333333','reader@example.test',now(),false),
('44444444-4444-4444-8444-444444444444','outsider@example.test',now(),false),
('55555555-5555-4555-8555-555555555555','invited@example.test',now(),false);

insert into public.rh_organizations(id,name) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Tenant A'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Tenant B');

insert into public.rh_memberships(organization_id,user_id,role) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','admin'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','recruiter'),
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','33333333-3333-4333-8333-333333333333','viewer'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','44444444-4444-4444-8444-444444444444','admin');

insert into public.rh_workspaces(organization_id,data,revision) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{}'::jsonb,0),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','{}'::jsonb,0);

do $$
declare
  v_name text;
begin
  foreach v_name in array array[
    'rh_team_overview(uuid)',
    'rh_team_invite(uuid,text,text)',
    'rh_team_set_role(uuid,uuid,text)',
    'rh_team_remove_member(uuid,uuid)',
    'rh_team_cancel_invitation(uuid,uuid)'
  ] loop
    if has_function_privilege('anon','public.'||v_name,'EXECUTE') then
      raise exception 'anon can execute protected function %',v_name;
    end if;
    if not has_function_privilege('authenticated','public.'||v_name,'EXECUTE') then
      raise exception 'authenticated cannot call protected function %',v_name;
    end if;
  end loop;
  if has_schema_privilege('authenticated','rh_private','USAGE') then
    raise exception 'authenticated can access private invitations schema';
  end if;
end $$;

-- Recruiter cannot read or update membership through privileged RPC.
set role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',false);
do $$
begin
  begin
    perform public.rh_team_overview('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    raise exception 'recruiter accessed admin listing';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.rh_team_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','untrusted@example.test','admin');
    raise exception 'recruiter granted admin invitation';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- External tenant admin must not read or mutate tenant A.
set role authenticated;
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',false);
do $$
begin
  if (select count(*) from public.rh_workspaces
      where organization_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 0 then
    raise exception 'RLS leaked workspace to another organization';
  end if;
  begin
    perform public.rh_team_overview('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    raise exception 'cross-tenant team listing succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.rh_team_set_role('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','admin');
    raise exception 'cross-tenant privilege escalation succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Tenant admin can invite and manage members but not remove self.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
do $$
declare v_inv uuid;
begin
  if jsonb_array_length(public.rh_team_overview('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')->'members') <> 3 then
    raise exception 'incorrect admin team listing';
  end if;
  v_inv:=public.rh_team_invite('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','invited@example.test','viewer');
  if v_inv is null then raise exception 'invitation was not created'; end if;
  if jsonb_array_length(public.rh_team_overview('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')->'invitations') <> 1 then
    raise exception 'invitation not visible to admin';
  end if;
  perform public.rh_team_set_role('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','22222222-2222-4222-8222-222222222222','viewer');
  begin
    perform public.rh_team_remove_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111');
    raise exception 'admin removed own role';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.rh_team_set_role('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','viewer');
    raise exception 'admin demoted own role';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- A verified Supabase user claims their own email invitation.
set role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',false);
do $$
begin
  if not public.rh_claim_invitation() then raise exception 'verified invite claim failed'; end if;
  if not exists(
    select 1 from public.rh_memberships where user_id=(select auth.uid()) and role='viewer'
  ) then raise exception 'claimed user has no viewer role'; end if;
  begin
    perform public.rh_team_overview('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    raise exception 'claimed viewer can list team';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- Admin revokes the invited member; RLS denies the revoked user afterwards.
set role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',false);
select public.rh_team_remove_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','55555555-5555-4555-8555-555555555555');
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',false);
do $$
begin
  if (select count(*) from public.rh_workspaces
      where organization_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') <> 0 then
    raise exception 'revoked viewer still sees organization workspace';
  end if;
end $$;
reset role;

-- Claim must not have granted direct authenticated write on membership table.
do $$
begin
  if has_table_privilege('authenticated','public.rh_memberships','INSERT') then
    raise exception 'memberships should not be writable by API clients';
  end if;
end $$;

select 'RH Desk team RPC / RLS smoke tests passed' as result;
