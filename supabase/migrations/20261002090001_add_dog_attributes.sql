-- add discovery attributes to dogs: size (single, nullable) and traits
-- (multi, keyed). Both nullable/defaulted so existing rows stay valid.
-- Filtering happens client-side over a small region set, so no GIN index.

alter table dogs
  add column size text check (size in ('small', 'medium', 'large'));

alter table dogs
  add column traits text[] not null default '{}';

-- existing RLS policies on dogs are table-wide (select/insert/update/delete),
-- so they already cover the new columns; no policy change needed.
