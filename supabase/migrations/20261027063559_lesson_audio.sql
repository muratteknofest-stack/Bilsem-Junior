-- Only the authenticated server reads/writes narration assets. No client grants.
create table public.lesson_audio (
 lesson_id text not null check (lesson_id ~ '^[a-z0-9_]{1,60}$'),
 lesson_version integer not null check (lesson_version > 0),
 step smallint not null check (step between 0 and 3),
 object_path text not null unique,
 narrator text not null check (length(trim(narrator)) between 2 and 120),
 rights_reference text not null check (length(trim(rights_reference)) between 12 and 500),
 human_recording boolean not null check (human_recording = true),
 content_type text not null check (content_type in ('audio/mpeg','audio/wav')),
 bytes integer not null check (bytes between 32 and 3145728),
 uploaded_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 primary key (lesson_id,lesson_version,step)
);
alter table public.lesson_audio enable row level security;
revoke all on public.lesson_audio from public,anon,authenticated;
grant select,insert,update on public.lesson_audio to service_role;
comment on table public.lesson_audio is 'Server-only licensed human narration manifest. No child data; runtime authorizes each download.';

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('bilsem-lesson-audio','bilsem-lesson-audio',false,3145728,array['audio/mpeg','audio/wav'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy bilsem_lesson_audio_server_only on storage.objects as restrictive
for all to anon,authenticated
using (bucket_id <> 'bilsem-lesson-audio')
with check (bucket_id <> 'bilsem-lesson-audio');
