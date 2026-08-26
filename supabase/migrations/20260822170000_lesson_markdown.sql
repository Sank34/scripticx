-- Store authored lesson bodies inside the existing content_i18n JSON so the
-- application remains compatible during a rolling deploy (no new column is
-- required before the frontend is published).
update public.lessons
set content_i18n = coalesce(content_i18n, '{}'::jsonb) || jsonb_build_object(
  'markdown',
  jsonb_build_object(
    'en', trim(
      coalesce(transcript_i18n ->> 'en', '') ||
      case when nullif(trim(example_code), '') is not null
        then E'\n\n## Example\n\n```miniscript\n' || trim(example_code) || E'\n```'
        else '' end ||
      case when nullif(trim(sample_input), '') is not null
        then E'\n\n## Sample input\n\n```text\n' || trim(sample_input) || E'\n```'
        else '' end
    ),
    'ro', trim(
      coalesce(transcript_i18n ->> 'ro', transcript_i18n ->> 'en', '') ||
      case when nullif(trim(example_code), '') is not null
        then E'\n\n## Exemplu\n\n```miniscript\n' || trim(example_code) || E'\n```'
        else '' end ||
      case when nullif(trim(sample_input), '') is not null
        then E'\n\n## Date de intrare\n\n```text\n' || trim(sample_input) || E'\n```'
        else '' end
    )
  )
)
where jsonb_typeof(content_i18n -> 'markdown') is distinct from 'object';
