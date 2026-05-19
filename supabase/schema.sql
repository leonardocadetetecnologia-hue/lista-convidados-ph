create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  instagram text not null,
  phone text not null,
  email text not null,
  cpf text not null,
  event_name text not null default 'PH',
  created_at timestamptz not null default now(),
  constraint guests_full_name_min_length check (char_length(trim(full_name)) >= 3),
  constraint guests_full_name_no_digits check (full_name !~ '[0-9]'),
  constraint guests_email_format check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$'),
  constraint guests_phone_digits check (phone ~ '^[0-9]{10,11}$'),
  constraint guests_cpf_digits check (cpf ~ '^[0-9]{11}$')
);

alter table public.guests enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'guests_full_name_no_digits'
  ) then
    alter table public.guests
    add constraint guests_full_name_no_digits check (full_name !~ '[0-9]');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'guests_email_format'
  ) then
    alter table public.guests
    add constraint guests_email_format
    check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$');
  end if;
end
$$;

drop policy if exists "Guests can register themselves" on public.guests;
create policy "Guests can register themselves"
on public.guests
for insert
to anon
with check (true);

create index if not exists guests_created_at_idx on public.guests (created_at desc);
create index if not exists guests_event_name_idx on public.guests (event_name);
create unique index if not exists guests_event_full_name_unique_idx
on public.guests (event_name, lower(regexp_replace(btrim(full_name), '\s+', ' ', 'g')));
