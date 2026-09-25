-- Run once in Supabase: SQL Editor > New query > paste > Run
create extension if not exists citext;

-- Who may log in. Each faculty can have several login emails mapping to ONE owner_email (their official email).
create table if not exists allowed_emails (
  email citext primary key,
  owner_email citext not null,
  name text,
  added_at timestamptz default now()
);
alter table allowed_emails enable row level security; -- no policies: browser can never read/write it

create table if not exists portfolios (
  id uuid primary key default gen_random_uuid(),
  owner_email citext unique not null,
  slug text unique not null,
  status text not null default 'draft' check (status in ('draft','published')),
  data jsonb not null,
  cv_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table portfolios enable row level security;

create table if not exists portfolio_versions (
  id bigint generated always as identity primary key,
  portfolio_id uuid references portfolios(id) on delete cascade,
  data jsonb not null,
  saved_at timestamptz default now()
);
alter table portfolio_versions enable row level security;

-- Grant standard permissions to Supabase roles
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all privileges on all tables in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all functions in schema public to postgres, anon, authenticated, service_role;
grant all privileges on all sequences in schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

create or replace function my_owner_email() returns citext
language sql security definer stable set search_path = public as $$
  select owner_email from allowed_emails where email = (auth.jwt() ->> 'email')::citext limit 1;
$$;

drop policy if exists "owner manages own" on portfolios;
create policy "owner manages own" on portfolios for all to authenticated
  using (owner_email = my_owner_email()) with check (owner_email = my_owner_email());
drop policy if exists "public reads published" on portfolios;
create policy "public reads published" on portfolios for select to anon, authenticated
  using (status = 'published');

create or replace function snapshot_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin insert into portfolio_versions(portfolio_id, data) values (new.id, new.data); return new; end $$;
drop trigger if exists portfolios_snapshot on portfolios;
create trigger portfolios_snapshot after insert or update of data on portfolios
  for each row execute function snapshot_version();

-- Private bucket for uploaded CVs (accessed only by the server with the service key)
insert into storage.buckets (id, name, public) values ('cvs', 'cvs', false) on conflict do nothing;

-- Public bucket for faculty profile photos (viewable by anyone with the link)
insert into storage.buckets (id, name, public) values ('photos', 'photos', true) on conflict (id) do update set public = true;

-- Allowlist: (official email, personal email). Both can log in and open the SAME portfolio.
with f(off, pers) as (values
 ('rkchaurasia@iujaipur.edu.in','chaurasia.rajk@gmail.com'),
 ('mkalla@iujaipur.edu.in','mukeshcalla@gmail.com'),
 ('parya@iujaipur.edu.in','aryapramod@gmail.com'),
 ('subhsh@iujaipur.edu.in','sharmasubh@gmail.com'),
 ('gauravaishnav.btech2024@iujaipur.edu.in','gauravaishnav.btech2024@iujaipur.edu.in'),
 ('nmanglani@iujaipur.edu.in','er.neerajmanglani23@gmail.com'),
 ('rpatel@iujaipur.edu.in','radhapatel094@gmail.com'),
 ('nehaag@iujaipur.edu.in','meet2neha.261@gmail.com'),
 ('svsingh@iujaipur.edu.in','physatyavir@gmail.com'),
 ('snayak@iujaipur.edu.in','somen.nayak1987@outlook.com'),
 ('vkverma@iujaipur.edu.in','vikasverma1988@gmail.com'),
 ('abhatnagar@iujaipur.edu.in','bhatnagar.adarsh@rediffmail.com'),
 ('ssingh@iujaipur.edu.in','sakshisingh161b191@gmail.com'),
 ('surbhijain@iujaipur.edu.in','surbhijain17nov@gmail.com'),
 ('akmishra@iujaipur.edu.in','mishra.ashvini@gmail.com'),
 ('gpatidar@iujaipur.edu.in','patidar.gopal27@gmail.com'),
 ('mtrihotri@iujaipur.edu.in','manindratrihotri@gmail.com'))
insert into allowed_emails (email, owner_email)
select e, off from f, lateral (values (off),(pers)) v(e)
on conflict (email) do nothing;

-- To add a person later:
-- insert into allowed_emails (email, owner_email) values ('new@iujaipur.edu.in','new@iujaipur.edu.in');
-- To revoke: delete from allowed_emails where owner_email = 'x@iujaipur.edu.in';
