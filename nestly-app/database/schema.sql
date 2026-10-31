-- Nestly V1 database schema (PostgreSQL / Supabase)
-- Run this in the Supabase SQL editor (or `supabase db push`) on a fresh project.
-- Enables UUID generation, defines the V1 tables, and adds baseline
-- Row Level Security so each community's data stays scoped to its members.

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------
-- USERS (extends Supabase auth.users with app-level profile fields)
-- ---------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text unique,
  phone text,
  profile_photo text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- COMMUNITIES
-- ---------------------------------------------------------------------
create table if not exists public.communities (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  address text,
  latitude double precision,
  longitude double precision,
  admin_id uuid references public.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  community_id uuid not null references public.communities (id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  joined_at timestamptz not null default now(),
  unique (user_id, community_id)
);

-- ---------------------------------------------------------------------
-- POSTS & COMMENTS (Community Feed)
-- ---------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  community_id uuid not null references public.communities (id) on delete cascade,
  category text not null default 'General'
    check (category in ('General','Complaint','Lost & Found','Event','Recommendation','Buy/Sell','Emergency','Help Needed')),
  title text,
  content text not null,
  image text,
  created_at timestamptz not null default now()
);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ISSUES (Report a Problem / civic-tech tracker)
-- ---------------------------------------------------------------------
create sequence if not exists issue_seq start 1024;

create table if not exists public.issues (
  id text primary key default ('NEST-' || nextval('issue_seq')::text),
  user_id uuid not null references public.users (id) on delete cascade,
  community_id uuid not null references public.communities (id) on delete cascade,
  category text not null
    check (category in ('Road','Street Light','Water','Garbage','Parking','Noise','Stray Animals','Environment','Electricity','Maintenance','Other')),
  description text not null,
  image text,
  latitude double precision,
  longitude double precision,
  status text not null default 'Reported'
    check (status in ('Reported','Assigned','In Progress','Resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- SERVICES (Local service providers directory)
-- ---------------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default uuid_generate_v4(),
  provider_id uuid not null references public.users (id) on delete cascade,
  community_id uuid references public.communities (id),
  category text not null,
  name text not null,
  description text,
  location text,
  latitude double precision,
  longitude double precision,
  starting_price numeric,
  rating numeric default 0,
  verified boolean default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- EVENTS (Activities / Community Events)
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid not null references public.communities (id) on delete cascade,
  creator_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  description text,
  date timestamptz not null,
  location text,
  capacity int,
  created_at timestamptz not null default now()
);

create table if not exists public.event_participants (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- ---------------------------------------------------------------------
-- MARKETPLACE (V2)
-- ---------------------------------------------------------------------
create table if not exists public.marketplace (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.users (id) on delete cascade,
  community_id uuid references public.communities (id),
  title text not null,
  price numeric,
  description text,
  category text,
  image text,
  status text not null default 'available' check (status in ('available','sold','reserved')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ANNOUNCEMENTS (admin-posted notices)
-- ---------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default uuid_generate_v4(),
  community_id uuid not null references public.communities (id) on delete cascade,
  author_id uuid not null references public.users (id),
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- ROW LEVEL SECURITY (baseline policies - tighten before production)
-- ---------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.issues enable row level security;
alter table public.services enable row level security;
alter table public.events enable row level security;
alter table public.marketplace enable row level security;
alter table public.notifications enable row level security;
alter table public.announcements enable row level security;

-- Users can read their own row and update it.
create policy "Users can view own profile" on public.users
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- Any authenticated user can view communities (needed to browse/join).
create policy "Authenticated users can view communities" on public.communities
  for select using (auth.role() = 'authenticated');

-- Members can see and manage their own membership rows.
create policy "Users can view their memberships" on public.community_members
  for select using (auth.uid() = user_id);
create policy "Users can request to join" on public.community_members
  for insert with check (auth.uid() = user_id);

-- Posts/issues/services/events: readable by any approved member of that
-- community; writable by the authenticated owner. Adjust the `exists`
-- subquery to your approval flow as the app matures.
create policy "Members can view community posts" on public.posts
  for select using (
    exists (
      select 1 from public.community_members cm
      where cm.community_id = posts.community_id
        and cm.user_id = auth.uid()
        and cm.status = 'approved'
    )
  );
create policy "Members can create posts" on public.posts
  for insert with check (auth.uid() = user_id);

create policy "Members can view community issues" on public.issues
  for select using (
    exists (
      select 1 from public.community_members cm
      where cm.community_id = issues.community_id
        and cm.user_id = auth.uid()
        and cm.status = 'approved'
    )
  );
create policy "Members can report issues" on public.issues
  for insert with check (auth.uid() = user_id);

create policy "Anyone authenticated can view services" on public.services
  for select using (auth.role() = 'authenticated');
create policy "Providers manage own services" on public.services
  for all using (auth.uid() = provider_id);

create policy "Users view own notifications" on public.notifications
  for select using (auth.uid() = user_id);
