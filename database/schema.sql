-- Placement Management System — Supabase schema
-- Run this in the Supabase SQL Editor (or via psql) to create tables and RLS policies.

-- =============================================================================
-- TABLES
-- =============================================================================

-- profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  roll_number text unique,
  phone text,
  branch text,
  cgpa float,
  graduation_year int,
  resume_link text,
  is_admin boolean default false
);

-- companies
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text not null,
  description text,
  min_cgpa float,
  allowed_branches text,
  graduation_year int,
  deadline date,
  created_at timestamp default now()
);

-- applications
create table applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references profiles(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  status text default 'Applied',
  applied_on timestamp default now()
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- profiles: users manage their own profile
alter table profiles enable row level security;

create policy "Users manage own profile"
  on profiles
  for all
  using (auth.uid() = id);

-- companies: public read; admin write
alter table companies enable row level security;

create policy "Public read companies"
  on companies
  for select
  using (true);

create policy "Admin write companies"
  on companies
  for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- applications: students manage own; admin read/update all
alter table applications enable row level security;

create policy "Students manage own apps"
  on applications
  for all
  using (auth.uid() = student_id);

create policy "Admin read all apps"
  on applications
  for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

create policy "Admin update apps"
  on applications
  for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- =============================================================================
-- SEED DATA (optional sample companies)
-- =============================================================================

insert into companies (name, role, description, min_cgpa, allowed_branches, graduation_year, deadline)
values
  ('Google', 'Software Engineer', 'Full-time SWE role at Google Hyderabad.', 8.0, 'CSE,ECE,IT', 2025, '2025-07-15'),
  ('Infosys', 'Systems Engineer', 'Campus hire for systems engineering role.', 6.5, 'CSE,ECE,ME,CE,EE,IT', 2025, '2025-08-01'),
  ('Amazon', 'SDE-1', 'Entry-level software development engineer at Amazon.', 7.5, 'CSE,IT', 2025, '2025-07-30'),
  ('Tata Steel', 'Graduate Trainee', 'Core engineering graduate trainee programme.', 6.0, 'ME,CE,EE', 2025, '2025-09-01');

-- =============================================================================
-- ADMIN USER (run after registering via the app; replace email)
-- =============================================================================
-- update profiles
-- set is_admin = true
-- where id = (select id from auth.users where email = 'your@email.com');
