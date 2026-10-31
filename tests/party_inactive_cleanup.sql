-- DEVELOPMENT ONLY: synthetic members and all data changes roll back.
begin;
do $test$
declare admin_id uuid; assigned text[];
begin
  select id into admin_id from public.profiles where approved and role='admin' limit 1;
  assert admin_id is not null,'Approved development admin required';
  perform set_config('request.jwt.claim.sub',admin_id::text,true);
  perform set_config('request.jwt.claim.role','authenticated',true);
  update public.planner_state set state=jsonb_set(state,'{roster}',
    coalesce(state->'roster','[]'::jsonb)||'[
      {"id":"inactive-party-test-a","name":"Party Cleanup A","cls":"High Priest","status":"active"},
      {"id":"inactive-party-test-b","name":"Party Cleanup B","cls":"Paladin","status":"active"},
      {"id":"inactive-party-test-c","name":"Party Cleanup C","cls":"High Wizard","status":"active"}
    ]'::jsonb) where id=1;
  insert into public.party_templates(party_no,member_ids,updated_at)
  values(29,array['inactive-party-test-a','inactive-party-test-b','inactive-party-test-c'],now()),
        (30,array['inactive-party-test-b','inactive-party-test-a'],now())
  on conflict(party_no) do update set member_ids=excluded.member_ids,updated_at=excluded.updated_at;

  update public.planner_state set state=jsonb_set(state,'{roster}',(
    select jsonb_agg(case when m->>'id'='inactive-party-test-b'
      then jsonb_set(m,'{status}','"inactive"'::jsonb) else m end order by position)
    from jsonb_array_elements(state->'roster') with ordinality as roster(m,position)
  )) where id=1;
  select member_ids into assigned from public.party_templates where party_no=29;
  assert assigned=array['inactive-party-test-a','inactive-party-test-c'],'Retain active members in order';
  select member_ids into assigned from public.party_templates where party_no=30;
  assert assigned=array['inactive-party-test-a'],'Remove inactive member from every party';

  update public.party_templates set member_ids=array['inactive-party-test-b','inactive-party-test-c'] where party_no=30;
  select member_ids into assigned from public.party_templates where party_no=30;
  assert assigned=array['inactive-party-test-c'],'Stale saves cannot restore inactive members';
  update public.party_templates set member_ids=array['inactive-party-test-b'] where party_no=30;
  select member_ids into assigned from public.party_templates where party_no=30;
  assert assigned=array[]::text[],'Party can become empty';

  update public.planner_state set state=jsonb_set(state,'{roster}',(
    select jsonb_agg(case when m->>'id'='inactive-party-test-b'
      then jsonb_set(m,'{status}','"active"'::jsonb) else m end order by position)
    from jsonb_array_elements(state->'roster') with ordinality as roster(m,position)
  )) where id=1;
  select member_ids into assigned from public.party_templates where party_no=30;
  assert assigned=array[]::text[],'Reactivation must not restore previous parties';
  assert not has_function_privilege('anon','private.remove_inactive_party_members()','execute');
  assert not has_function_privilege('authenticated','private.filter_inactive_party_members()','execute');
end;
$test$;
rollback;

