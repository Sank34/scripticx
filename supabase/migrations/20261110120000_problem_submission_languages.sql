begin;

alter table public.submissions
  add column language text not null default 'miniscript'
  check (language in ('miniscript', 'python', 'cpp'));

commit;
