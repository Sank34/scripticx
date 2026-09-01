begin;

-- Storage owns the object only after the upload request passes INSERT RLS.
-- Requiring owner_id during WITH CHECK can therefore reject valid uploads.
-- The authenticated active-membership check already scopes writes to the
-- group UUID used as the first path segment.
drop policy if exists study_group_attachments_storage_insert on storage.objects;
create policy study_group_attachments_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'study-group-attachments'
    and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
    and public.study_group_active_role(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    ) is not null
  );

commit;
