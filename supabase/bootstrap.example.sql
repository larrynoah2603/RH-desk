-- One-time setup example. Run ONLY in Supabase SQL Editor as an administrator.
-- 1. Create a user in Authentication > Users (invite-only).
-- 2. Replace 'admin@example.com' with the EXACT confirmed email.
-- 3. Run this script once per organization.
do $$
declare
  v_user uuid;
  v_org uuid;
begin
  select id into v_user from auth.users
   where lower(email) = lower('admin@example.com') limit 1;
  if v_user is null then
    raise exception 'Create the user in Supabase Auth first';
  end if;
  insert into public.rh_organizations(name)
  values ('Mon organisation')
  returning id into v_org;

  insert into public.rh_memberships(organization_id,user_id,role)
  values (v_org,v_user,'admin');

  insert into public.rh_workspaces(organization_id,data,revision)
  values (
    v_org,
    jsonb_build_object(
      'version', 1,
      'settings', jsonb_build_object(
        'companyName', 'Mon organisation',
        'contactEmail', 'admin@example.com',
        'hiringLead', 'Administrateur',
        'locale', 'fr', 'theme', 'auto', 'density', 'normal'
      ),
      'jobs', '[]'::jsonb, 'candidates', '[]'::jsonb,
      'interviews', '[]'::jsonb, 'reviews', '[]'::jsonb,
      'offers', '[]'::jsonb, 'activity', '[]'::jsonb,
      'savedAt', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    0
  );
  raise notice 'Organization ID: % (save this for admin operations)', v_org;
end;
$$;

-- To add another existing authenticated user to this organization:
-- insert into public.rh_memberships(organization_id,user_id,role)
-- select '<organization-uuid>'::uuid, id, 'recruiter'
-- from auth.users where lower(email) = lower('colleague@example.com');
-- Roles: admin, recruiter, viewer. Viewer is strictly read-only.
