begin;

alter table public.problems
  add column allowed_languages text[]
  constraint problems_allowed_languages_check check (
    allowed_languages is null or (
      array_ndims(allowed_languages) = 1
      and cardinality(allowed_languages) between 1 and 3
      and allowed_languages <@ array['miniscript', 'python', 'cpp']::text[]
    )
  );

comment on column public.problems.allowed_languages is
  'Languages accepted for library submissions. NULL allows every supported language.';

commit;
