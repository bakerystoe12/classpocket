-- Private bucket for teacher lesson PDFs. Browsers upload directly with a short-lived signed upload
-- token, so files never pass through a Vercel Function request body. Objects live under
-- <teacher-user-id>/<random>.pdf and are deleted by the server after text extraction.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-sources', 'lesson-sources', false, 10485760, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy lesson_sources_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'lesson-sources' and (storage.foldername(name))[1] = auth.uid()::text and public.is_teacher());
create policy lesson_sources_read_own on storage.objects for select to authenticated
  using (bucket_id = 'lesson-sources' and (storage.foldername(name))[1] = auth.uid()::text and public.is_teacher());
create policy lesson_sources_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'lesson-sources' and (storage.foldername(name))[1] = auth.uid()::text and public.is_teacher());
