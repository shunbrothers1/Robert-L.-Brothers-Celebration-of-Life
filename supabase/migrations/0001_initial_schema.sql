-- Celebration of Life — food & supply coordination for a repast.
-- Initial schema for this project's own, dedicated Supabase project.
--
-- Public pages live at /celebration/[slug] and /contribution/[token]; the
-- private admin area is /admin. See the README.
--
-- Security model, in one paragraph: guests (the `anon` role) can read an
-- event's public menu and nothing else. Every guest write — claiming an
-- item, changing/cancelling a claim, suggesting an item — goes through a
-- SECURITY DEFINER function below that validates its input and returns
-- only what that guest needs. Guests have NO direct access to
-- `contributions`, `suggested_items` or `admin_users`, so the contributor
-- list (names, phones, emails) can never be read from the browser.
-- Approved admins (rows in `admin_users`) get full access through RLS.
--
-- Overclaiming is prevented in the database, not just the UI: a trigger on
-- `contributions` locks the food item's row and re-sums every active claim
-- before any insert/update that could add quantity, so two people
-- submitting the last slot at the same moment are serialized and the
-- second one is rejected — whichever path (guest RPC or admin edit) the
-- write came from.

create extension if not exists pgcrypto with schema extensions;

-- Generic "touch updated_at" trigger function, used by several tables below.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------

-- Family admins. Signing in to Supabase Auth isn't enough on its own — an
-- account only gets admin access once it has a row here.
create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  added_by uuid references auth.users(id) on delete set null
);

-- SECURITY DEFINER so policies on admin_users itself can call it without
-- triggering "infinite recursion detected in policy" (a policy on a table
-- can't safely query that same table under RLS).
create or replace function is_memorial_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------

create table if not exists memorial_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  event_name text not null default 'Celebration of Life' check (char_length(event_name) between 1 and 120),
  person_name text not null check (char_length(person_name) between 1 and 120),
  birth_date_text text check (char_length(birth_date_text) <= 60),
  passing_date_text text check (char_length(passing_date_text) <= 60),
  photo_url text check (char_length(photo_url) <= 2000),
  event_date date,
  service_info text check (char_length(service_info) <= 300),
  repast_time_text text check (char_length(repast_time_text) <= 120),
  repast_location_name text check (char_length(repast_location_name) <= 160),
  repast_address text check (char_length(repast_address) <= 300),
  welcome_message text check (char_length(welcome_message) <= 2000) default
    'Thank you for the overwhelming love and support shown to our family during this time. Many of you have asked how you can help with the repast following the service. If you would like to prepare or contribute an item, please select from the list below. Your love, support, and generosity mean more to our family than we can express.',
  -- Sign-ups close at the END of this day in the event's timezone.
  signup_deadline date,
  timezone text not null default 'America/New_York',
  -- Optional memorial section (shown only when settings.show_memorial_section).
  memorial_photo_url text check (char_length(memorial_photo_url) <= 2000),
  biography text check (char_length(biography) <= 8000),
  favorite_quote text check (char_length(favorite_quote) <= 500),
  gallery_urls text[] not null default '{}' check (cardinality(gallery_urls) <= 24),
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function memorial_events_before_write()
returns trigger
language plpgsql
as $$
begin
  -- Reject an unknown timezone up front rather than breaking every later
  -- deadline check that converts with it.
  perform now() at time zone new.timezone;
  new.updated_at = now();
  return new;
end;
$$;

create trigger memorial_events_before_write before insert or update on memorial_events
  for each row execute function memorial_events_before_write();

-- Per-event switches. One row per event, created automatically.
create table if not exists settings (
  event_id uuid primary key references memorial_events(id) on delete cascade,
  show_contributor_names boolean not null default false,
  allow_suggestions boolean not null default true,
  show_memorial_section boolean not null default false,
  -- Manual pause for public sign-ups, independent of the deadline.
  accepting_signups boolean not null default true,
  updated_at timestamptz not null default now()
);

create trigger settings_set_updated_at before update on settings
  for each row execute function set_updated_at();

create or replace function memorial_events_create_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into settings (event_id) values (new.id) on conflict (event_id) do nothing;
  return new;
end;
$$;

create trigger memorial_events_create_settings after insert on memorial_events
  for each row execute function memorial_events_create_settings();

-- ---------------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------------

create table if not exists food_categories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references memorial_events(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  -- Label on the public filter chips ("SIDES", "DRINKS").
  short_name text not null check (char_length(short_name) between 1 and 24),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (id, event_id)
);

create unique index if not exists food_categories_event_name_key
  on food_categories (event_id, lower(name));

create table if not exists food_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references memorial_events(id) on delete cascade,
  category_id uuid not null,
  name text not null check (char_length(name) between 1 and 100),
  -- Serving description, e.g. "Serves about 20" or "Store-bought is fine".
  description text check (char_length(description) <= 300),
  quantity_needed integer not null default 1 check (quantity_needed between 0 and 999),
  -- Plural unit label, e.g. "large trays", "cases", "bags". May be empty.
  unit text not null default '' check (char_length(unit) <= 40),
  is_priority boolean not null default false,
  is_hidden boolean not null default false,
  manually_covered boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, event_id),
  -- Composite key keeps an item's category inside the same event. Deleting
  -- a category that still has items is refused.
  foreign key (category_id, event_id) references food_categories(id, event_id) on delete restrict
);

create unique index if not exists food_items_category_name_key
  on food_items (category_id, lower(name));
create index if not exists food_items_event_idx on food_items (event_id);

-- ---------------------------------------------------------------------------
-- Contributions & suggestions
-- ---------------------------------------------------------------------------

create table if not exists contributions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  food_item_id uuid not null,
  contributor_name text not null check (char_length(btrim(contributor_name)) between 1 and 100),
  phone text check (char_length(phone) <= 30),
  email text check (char_length(email) <= 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Number of the item's units claimed ("2" large trays).
  quantity integer not null default 1 check (quantity between 1 and 999),
  -- Free-text amount, used for approved suggestions ("2 dozen").
  amount_detail text check (char_length(amount_detail) <= 100),
  note text check (char_length(note) <= 500),
  status text not null default 'confirmed' check (status in ('confirmed', 'received', 'cancelled')),
  source text not null default 'public' check (source in ('public', 'admin', 'suggestion')),
  -- SHA-256 of the guest's private manage-link token. The token itself is
  -- returned once, at sign-up, and never stored.
  manage_token_hash bytea unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  received_at timestamptz,
  -- Cascade: deleting an item from the menu removes its sign-ups too (the
  -- admin UI warns with the count first).
  foreign key (food_item_id, event_id) references food_items(id, event_id) on delete cascade
);

create index if not exists contributions_item_active_idx
  on contributions (food_item_id) where status <> 'cancelled';
create index if not exists contributions_event_created_idx on contributions (event_id, created_at desc);

create table if not exists suggested_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references memorial_events(id) on delete cascade,
  contributor_name text not null check (char_length(btrim(contributor_name)) between 1 and 100),
  phone text check (char_length(phone) <= 30),
  email text check (char_length(email) <= 200 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  item_name text not null check (char_length(btrim(item_name)) between 1 and 100),
  quantity_text text check (char_length(quantity_text) <= 100),
  note text check (char_length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'withdrawn')),
  manage_token_hash bytea unique,
  contribution_id uuid references contributions(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists suggested_items_event_status_idx on suggested_items (event_id, status);

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

-- THE overclaim guard. Runs for every insert/update on contributions,
-- including admin edits through RLS. Locking the item row serializes
-- concurrent claims on the same item; under READ COMMITTED each statement
-- below takes a fresh snapshot, so the second of two simultaneous claims
-- sees the first one's committed row once it gets the lock.
create or replace function enforce_contribution_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_needed integer;
  v_claimed integer;
begin
  new.updated_at = now();
  if new.status = 'cancelled' then
    if tg_op = 'UPDATE' and old.status <> 'cancelled' then new.cancelled_at = now(); end if;
    return new;
  end if;
  if new.status = 'received' and (tg_op = 'INSERT' or old.status <> 'received') then
    new.received_at = now();
  elsif new.status <> 'received' then
    new.received_at = null;
  end if;
  new.cancelled_at = null;

  -- Shrinking (or not changing) an already-active claim on the same item
  -- can never overclaim, so skip the lock.
  if tg_op = 'UPDATE' and old.status <> 'cancelled'
     and new.food_item_id = old.food_item_id and new.quantity <= old.quantity then
    return new;
  end if;

  select quantity_needed into v_needed from food_items where id = new.food_item_id for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  select coalesce(sum(quantity), 0) into v_claimed
  from contributions
  where food_item_id = new.food_item_id and status <> 'cancelled' and id <> new.id;

  if v_claimed + new.quantity > v_needed then
    raise exception 'ITEM_FULL'
      using errcode = 'P0001', hint = greatest(v_needed - v_claimed, 0)::text;
  end if;
  return new;
end;
$$;

create trigger contributions_enforce_capacity before insert or update on contributions
  for each row execute function enforce_contribution_capacity();

-- Lowering an item's quantity below what people already signed up for
-- would silently overclaim it — refuse instead.
create or replace function food_items_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed integer;
begin
  new.updated_at = now();
  if new.quantity_needed < old.quantity_needed then
    select coalesce(sum(quantity), 0) into v_claimed
    from contributions where food_item_id = new.id and status <> 'cancelled';
    if new.quantity_needed < v_claimed then
      raise exception 'BELOW_CLAIMED' using errcode = 'P0001', hint = v_claimed::text;
    end if;
  end if;
  return new;
end;
$$;

create trigger food_items_before_update before update on food_items
  for each row execute function food_items_before_update();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table admin_users enable row level security;
alter table memorial_events enable row level security;
alter table settings enable row level security;
alter table food_categories enable row level security;
alter table food_items enable row level security;
alter table contributions enable row level security;
alter table suggested_items enable row level security;

-- Belt and braces on top of RLS: anon can't even attempt these tables.
revoke all on admin_users, contributions, suggested_items from anon;

create policy "admins read admin list" on admin_users for select
  using (user_id = auth.uid() or is_memorial_admin());
-- Adding goes through add_memorial_admin(); removing yourself is refused so
-- the last admin can't lock everyone out by accident.
create policy "admins remove other admins" on admin_users for delete
  using (is_memorial_admin() and user_id <> auth.uid());

create policy "public reads published events" on memorial_events for select
  using (is_published or is_memorial_admin());
create policy "admins manage events" on memorial_events for all
  using (is_memorial_admin()) with check (is_memorial_admin());

create policy "public reads published settings" on settings for select
  using (is_memorial_admin() or exists (
    select 1 from memorial_events e where e.id = settings.event_id and e.is_published));
create policy "admins manage settings" on settings for all
  using (is_memorial_admin()) with check (is_memorial_admin());

create policy "public reads published categories" on food_categories for select
  using (is_memorial_admin() or exists (
    select 1 from memorial_events e where e.id = food_categories.event_id and e.is_published));
create policy "admins manage categories" on food_categories for all
  using (is_memorial_admin()) with check (is_memorial_admin());

create policy "public reads visible items" on food_items for select
  using (is_memorial_admin() or (not is_hidden and exists (
    select 1 from memorial_events e where e.id = food_items.event_id and e.is_published)));
create policy "admins manage items" on food_items for all
  using (is_memorial_admin()) with check (is_memorial_admin());

-- Contributor data: admins only. No public policy exists at all.
create policy "admins manage contributions" on contributions for all
  using (is_memorial_admin()) with check (is_memorial_admin());
create policy "admins manage suggestions" on suggested_items for all
  using (is_memorial_admin()) with check (is_memorial_admin());

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function memorial_signups_open(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select e.is_published and s.accepting_signups
       and (e.signup_deadline is null
            or now() < ((e.signup_deadline + 1)::timestamp at time zone e.timezone))
    from memorial_events e join settings s on s.event_id = e.id
    where e.id = p_event_id
  ), false);
$$;

-- "Tasha Brown" -> "Tasha B." — the most a guest ever sees of anyone else.
create or replace function memorial_public_name(p_name text)
returns text
language sql
immutable
as $$
  select case
    when array_length(parts, 1) > 1 then parts[1] || ' ' || upper(left(parts[array_length(parts, 1)], 1)) || '.'
    else parts[1]
  end
  from (select regexp_split_to_array(btrim(p_name), '\s+') as parts) p;
$$;

create or replace function memorial_new_token()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select translate(encode(gen_random_bytes(24), 'base64'), '+/', '-_');
$$;

create or replace function memorial_token_hash(p_token text)
returns bytea
language sql
immutable
set search_path = public, extensions
as $$
  select digest(coalesce(p_token, ''), 'sha256');
$$;

create or replace function memorial_clean(p_value text, p_max integer)
returns text
language plpgsql
immutable
as $$
declare
  v text := nullif(btrim(coalesce(p_value, '')), '');
begin
  if v is not null and char_length(v) > p_max then
    raise exception 'INVALID_INPUT' using errcode = 'P0001', hint = 'too_long';
  end if;
  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public functions (callable by anon)
-- ---------------------------------------------------------------------------

-- Everything the public page needs, in one call: the event, its switches,
-- categories, visible items with live claimed counts, and — only when the
-- family turned it on — "Tasha B."-style first names. Never contact info.
create or replace function get_public_event(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_event memorial_events;
  v_settings settings;
begin
  select * into v_event from memorial_events where slug = lower(btrim(p_slug));
  if not found or not (v_event.is_published or is_memorial_admin()) then
    return null;
  end if;
  select * into v_settings from settings where event_id = v_event.id;

  return jsonb_build_object(
    'event', jsonb_build_object(
      'id', v_event.id,
      'slug', v_event.slug,
      'event_name', v_event.event_name,
      'person_name', v_event.person_name,
      'birth_date_text', v_event.birth_date_text,
      'passing_date_text', v_event.passing_date_text,
      'photo_url', v_event.photo_url,
      'event_date', v_event.event_date,
      'service_info', v_event.service_info,
      'repast_time_text', v_event.repast_time_text,
      'repast_location_name', v_event.repast_location_name,
      'repast_address', v_event.repast_address,
      'welcome_message', v_event.welcome_message,
      'signup_deadline', v_event.signup_deadline,
      'is_published', v_event.is_published,
      'memorial', case when v_settings.show_memorial_section then jsonb_build_object(
        'photo_url', v_event.memorial_photo_url,
        'biography', v_event.biography,
        'favorite_quote', v_event.favorite_quote,
        'gallery_urls', to_jsonb(v_event.gallery_urls)
      ) end
    ),
    'settings', jsonb_build_object(
      'show_contributor_names', v_settings.show_contributor_names,
      'allow_suggestions', v_settings.allow_suggestions,
      'show_memorial_section', v_settings.show_memorial_section
    ),
    'signups_open', memorial_signups_open(v_event.id),
    'deadline_passed', v_event.signup_deadline is not null
      and now() >= ((v_event.signup_deadline + 1)::timestamp at time zone v_event.timezone),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'short_name', c.short_name, 'sort_order', c.sort_order
      ) order by c.sort_order, c.name)
      from food_categories c where c.event_id = v_event.id
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'category_id', i.category_id,
        'name', i.name,
        'description', i.description,
        'quantity_needed', i.quantity_needed,
        'quantity_claimed', coalesce(a.claimed, 0),
        'unit', i.unit,
        'is_priority', i.is_priority,
        'manually_covered', i.manually_covered,
        'sort_order', i.sort_order,
        'claimed_by', case when v_settings.show_contributor_names
          then coalesce(a.names, '[]'::jsonb) else '[]'::jsonb end
      ) order by i.is_priority desc, i.sort_order, i.name)
      from food_items i
      left join lateral (
        select sum(c.quantity) as claimed,
               jsonb_agg(distinct memorial_public_name(c.contributor_name)) as names
        from contributions c
        where c.food_item_id = i.id and c.status <> 'cancelled'
      ) a on true
      where i.event_id = v_event.id and not i.is_hidden
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function claim_food_item(
  p_item_id uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_quantity integer,
  p_note text,
  p_acknowledged boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_item food_items;
  v_claimed integer;
  v_token text;
  v_id uuid;
  v_name text := memorial_clean(p_name, 100);
begin
  if not coalesce(p_acknowledged, false) then
    raise exception 'ACK_REQUIRED' using errcode = 'P0001';
  end if;
  if v_name is null then
    raise exception 'INVALID_INPUT' using errcode = 'P0001', hint = 'name';
  end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'INVALID_INPUT' using errcode = 'P0001', hint = 'quantity';
  end if;

  -- Lock first, then read: the same lock the capacity trigger takes, so
  -- the remaining count we report back is the real one.
  select * into v_item from food_items where id = p_item_id for update;
  if not found or v_item.is_hidden then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if not memorial_signups_open(v_item.event_id) then
    raise exception 'SIGNUPS_CLOSED' using errcode = 'P0001';
  end if;
  if v_item.manually_covered then
    raise exception 'ITEM_COVERED' using errcode = 'P0001';
  end if;

  select coalesce(sum(quantity), 0) into v_claimed
  from contributions where food_item_id = v_item.id and status <> 'cancelled';
  if v_claimed >= v_item.quantity_needed then
    raise exception 'ITEM_COVERED' using errcode = 'P0001';
  end if;
  if v_claimed + p_quantity > v_item.quantity_needed then
    raise exception 'ITEM_FULL' using errcode = 'P0001', hint = (v_item.quantity_needed - v_claimed)::text;
  end if;

  v_token := memorial_new_token();
  insert into contributions (
    event_id, food_item_id, contributor_name, phone, email, quantity, note, source, manage_token_hash
  ) values (
    v_item.event_id, v_item.id, v_name, memorial_clean(p_phone, 30), lower(memorial_clean(p_email, 200)),
    p_quantity, memorial_clean(p_note, 500), 'public', memorial_token_hash(v_token)
  ) returning id into v_id;

  return jsonb_build_object(
    'contribution_id', v_id,
    'token', v_token,
    'item_name', v_item.name,
    'quantity', p_quantity,
    'unit', v_item.unit
  );
end;
$$;

-- What a guest sees on their private manage link. Works for both claims
-- and suggestions (an approved suggestion's contribution reuses the
-- suggestion's token, so the same link keeps working after approval).
create or replace function get_contribution_by_token(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_hash bytea := memorial_token_hash(p_token);
  v_c contributions;
  v_s suggested_items;
  v_item food_items;
  v_event memorial_events;
  v_claimed integer;
begin
  if p_token is null or char_length(p_token) < 20 then return null; end if;

  select * into v_c from contributions where manage_token_hash = v_hash;
  if found then
    select * into v_item from food_items where id = v_c.food_item_id;
    select * into v_event from memorial_events where id = v_c.event_id;
    select coalesce(sum(quantity), 0) into v_claimed
    from contributions where food_item_id = v_item.id and status <> 'cancelled' and id <> v_c.id;
    return jsonb_build_object(
      'kind', 'contribution',
      'status', v_c.status,
      'contributor_name', v_c.contributor_name,
      'item_name', v_item.name,
      'unit', v_item.unit,
      'quantity', v_c.quantity,
      'amount_detail', v_c.amount_detail,
      'note', v_c.note,
      'max_quantity', greatest(v_item.quantity_needed - v_claimed, v_c.quantity),
      'signups_open', memorial_signups_open(v_event.id),
      'created_at', v_c.created_at,
      'event', jsonb_build_object('slug', v_event.slug, 'person_name', v_event.person_name,
        'event_name', v_event.event_name, 'event_date', v_event.event_date,
        'repast_time_text', v_event.repast_time_text,
        'repast_location_name', v_event.repast_location_name, 'repast_address', v_event.repast_address)
    );
  end if;

  select * into v_s from suggested_items where manage_token_hash = v_hash;
  if found then
    select * into v_event from memorial_events where id = v_s.event_id;
    return jsonb_build_object(
      'kind', 'suggestion',
      'status', v_s.status,
      'contributor_name', v_s.contributor_name,
      'item_name', v_s.item_name,
      'amount_detail', v_s.quantity_text,
      'note', v_s.note,
      'created_at', v_s.created_at,
      'event', jsonb_build_object('slug', v_event.slug, 'person_name', v_event.person_name,
        'event_name', v_event.event_name, 'event_date', v_event.event_date,
        'repast_time_text', v_event.repast_time_text,
        'repast_location_name', v_event.repast_location_name, 'repast_address', v_event.repast_address)
    );
  end if;
  return null;
end;
$$;

-- Change the amount on your own claim. Lowering is always allowed (while
-- the claim is active); raising needs open sign-ups and spare capacity,
-- which the capacity trigger re-checks under the item lock.
create or replace function update_contribution_by_token(p_token text, p_quantity integer, p_note text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_c contributions;
begin
  select * into v_c from contributions where manage_token_hash = memorial_token_hash(p_token) for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if v_c.status <> 'confirmed' then raise exception 'NOT_EDITABLE' using errcode = 'P0001'; end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'INVALID_INPUT' using errcode = 'P0001', hint = 'quantity';
  end if;
  if p_quantity > v_c.quantity and not memorial_signups_open(v_c.event_id) then
    raise exception 'SIGNUPS_CLOSED' using errcode = 'P0001';
  end if;

  update contributions
     set quantity = p_quantity, note = memorial_clean(p_note, 500)
   where id = v_c.id;
  return get_contribution_by_token(p_token);
end;
$$;

-- Cancel your own claim (or withdraw a pending suggestion). Cancelling
-- frees the quantity immediately, since only non-cancelled rows count.
create or replace function cancel_contribution_by_token(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_hash bytea := memorial_token_hash(p_token);
begin
  update contributions set status = 'cancelled'
   where manage_token_hash = v_hash and status = 'confirmed';
  if found then return get_contribution_by_token(p_token); end if;

  update suggested_items set status = 'withdrawn'
   where manage_token_hash = v_hash and status = 'pending';
  if found then return get_contribution_by_token(p_token); end if;

  if exists (select 1 from contributions where manage_token_hash = v_hash)
     or exists (select 1 from suggested_items where manage_token_hash = v_hash) then
    raise exception 'NOT_EDITABLE' using errcode = 'P0001';
  end if;
  raise exception 'NOT_FOUND' using errcode = 'P0001';
end;
$$;

-- "Bring something else": never confirmed automatically — it waits for a
-- family admin to approve or decline it, so it can't create a duplicate.
create or replace function submit_suggested_item(
  p_slug text,
  p_name text,
  p_phone text,
  p_email text,
  p_item_name text,
  p_quantity_text text,
  p_note text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_event memorial_events;
  v_token text;
  v_name text := memorial_clean(p_name, 100);
  v_item text := memorial_clean(p_item_name, 100);
begin
  select * into v_event from memorial_events where slug = lower(btrim(p_slug)) and is_published;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if not (select allow_suggestions from settings where event_id = v_event.id) then
    raise exception 'SUGGESTIONS_OFF' using errcode = 'P0001';
  end if;
  if not memorial_signups_open(v_event.id) then
    raise exception 'SIGNUPS_CLOSED' using errcode = 'P0001';
  end if;
  if v_name is null then raise exception 'INVALID_INPUT' using errcode = 'P0001', hint = 'name'; end if;
  if v_item is null then raise exception 'INVALID_INPUT' using errcode = 'P0001', hint = 'item'; end if;

  v_token := memorial_new_token();
  insert into suggested_items (
    event_id, contributor_name, phone, email, item_name, quantity_text, note, manage_token_hash
  ) values (
    v_event.id, v_name, memorial_clean(p_phone, 30), lower(memorial_clean(p_email, 200)), v_item,
    memorial_clean(p_quantity_text, 100), memorial_clean(p_note, 500), memorial_token_hash(v_token)
  );
  return jsonb_build_object('token', v_token, 'item_name', v_item, 'status', 'pending');
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin functions
-- ---------------------------------------------------------------------------

-- Approving a suggestion adds it to the public menu as an already-covered
-- item (so nobody else signs up for the same dish) and creates the
-- matching confirmed contribution, atomically.
create or replace function approve_suggested_item(p_suggestion_id uuid, p_category_id uuid default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_s suggested_items;
  v_category_id uuid := p_category_id;
  v_item_id uuid;
  v_contribution_id uuid;
begin
  if not is_memorial_admin() then raise exception 'NOT_AUTHORIZED' using errcode = '42501'; end if;

  select * into v_s from suggested_items where id = p_suggestion_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0001'; end if;
  if v_s.status <> 'pending' then raise exception 'NOT_EDITABLE' using errcode = 'P0001'; end if;

  if v_category_id is null then
    select id into v_category_id from food_categories
     where event_id = v_s.event_id and lower(name) = 'other';
    if v_category_id is null then
      insert into food_categories (event_id, name, short_name, sort_order)
      values (v_s.event_id, 'Other', 'OTHER', 1000) returning id into v_category_id;
    end if;
  elsif not exists (select 1 from food_categories where id = v_category_id and event_id = v_s.event_id) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;

  -- Reuse an existing same-named item in that category if there is one
  -- (bumping its quantity to make room), otherwise create a new one.
  select id into v_item_id from food_items
   where category_id = v_category_id and lower(name) = lower(v_s.item_name) for update;
  if v_item_id is null then
    insert into food_items (event_id, category_id, name, description, quantity_needed, unit, sort_order)
    values (v_s.event_id, v_category_id, v_s.item_name, v_s.quantity_text, 1, '', 1000)
    returning id into v_item_id;
  else
    update food_items set quantity_needed = quantity_needed + 1 where id = v_item_id;
  end if;

  insert into contributions (
    event_id, food_item_id, contributor_name, phone, email, quantity, amount_detail, note,
    source, manage_token_hash
  ) values (
    v_s.event_id, v_item_id, v_s.contributor_name, v_s.phone, v_s.email, 1, v_s.quantity_text, v_s.note,
    'suggestion', v_s.manage_token_hash
  ) returning id into v_contribution_id;

  -- The token now lives on the contribution; clear it here so lookups are
  -- unambiguous.
  update suggested_items
     set status = 'approved', contribution_id = v_contribution_id, manage_token_hash = null,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = v_s.id;
  return v_contribution_id;
end;
$$;

-- Lets an existing admin approve another person's account. They must have
-- an Auth account first (Supabase dashboard → Authentication → Add user).
create or replace function add_memorial_admin(p_email text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_email text;
begin
  if not is_memorial_admin() then raise exception 'NOT_AUTHORIZED' using errcode = '42501'; end if;
  select id, email into v_user_id, v_email from auth.users where lower(email) = lower(btrim(p_email));
  if v_user_id is null then raise exception 'NO_ACCOUNT' using errcode = 'P0001'; end if;
  insert into admin_users (user_id, email, added_by) values (v_user_id, v_email, auth.uid())
  on conflict (user_id) do nothing;
  return v_user_id;
end;
$$;

-- Starter menu for a new event. Purely a convenience — every category and
-- item it creates is editable/deletable from /admin afterwards, and an
-- event can be created without it.
create or replace function seed_default_menu(p_event_id uuid)
returns void
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_cat uuid;
  r record;
begin
  if not is_memorial_admin() and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'NOT_AUTHORIZED' using errcode = '42501';
  end if;

  for r in
    select * from (values
      (1, 'Main Dishes', 'MAIN DISHES', array[
        'Fried Chicken|3|large trays', 'Baked Chicken|2|large trays', 'BBQ Chicken|2|large trays',
        'Meatballs|1|large tray', 'Ham|1|whole ham', 'Fish|2|large trays']),
      (2, 'Side Dishes', 'SIDES', array[
        'Macaroni & Cheese|3|large trays', 'Collard Greens|2|large trays', 'Green Beans|2|large trays',
        'Yellow Rice|1|large tray', 'White Rice|1|large tray', 'Potato Salad|2|large bowls',
        'Candied Yams|2|large trays', 'Dressing/Stuffing|2|large trays']),
      (3, 'Appetizers', 'APPETIZERS', array[
        'Wings|2|large trays', 'Meatballs|1|large tray', 'Vegetable Tray|1|tray', 'Fruit Tray|2|trays',
        'Cheese & Cracker Tray|1|tray']),
      (4, 'Desserts', 'DESSERTS', array[
        'Banana Pudding|2|large pans', 'Cake|2|cakes', 'Pound Cake|2|cakes', 'Peach Cobbler|2|large pans',
        'Cookies|2|dozen', 'Brownies|2|pans']),
      (5, 'Beverages', 'DRINKS', array[
        'Cases of Bottled Water|4|cases', 'Soda|4|2-liter bottles', 'Sweet Tea|2|gallons',
        'Lemonade|2|gallons', 'Juice|2|gallons']),
      (6, 'Supplies', 'SUPPLIES', array[
        'Ice|4|bags', 'Plates|2|packs of 100', 'Cups|2|packs of 100', 'Napkins|2|packs',
        'Plastic Utensils|2|boxes', 'Aluminum Foil|2|rolls', 'Serving Utensils|1|set',
        'To-Go Containers|2|packs']),
      (7, 'Other', 'OTHER', array[]::text[])
    ) as t(sort_order, name, short_name, items)
  loop
    insert into food_categories (event_id, name, short_name, sort_order)
    values (p_event_id, r.name, r.short_name, r.sort_order * 10)
    on conflict do nothing
    returning id into v_cat;
    if v_cat is null then continue; end if;

    insert into food_items (event_id, category_id, name, quantity_needed, unit, sort_order)
    select p_event_id, v_cat, split_part(x.item, '|', 1), split_part(x.item, '|', 2)::integer,
           split_part(x.item, '|', 3), x.ord * 10
    from unnest(r.items) with ordinality as x(item, ord);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke execute on function
  get_public_event(text),
  claim_food_item(uuid, text, text, text, integer, text, boolean),
  get_contribution_by_token(text),
  update_contribution_by_token(text, integer, text),
  cancel_contribution_by_token(text),
  submit_suggested_item(text, text, text, text, text, text, text),
  approve_suggested_item(uuid, uuid),
  add_memorial_admin(text),
  seed_default_menu(uuid),
  memorial_signups_open(uuid),
  memorial_new_token(),
  enforce_contribution_capacity(),
  food_items_before_update(),
  memorial_events_create_settings()
from public;

grant execute on function
  get_public_event(text),
  claim_food_item(uuid, text, text, text, integer, text, boolean),
  get_contribution_by_token(text),
  update_contribution_by_token(text, integer, text),
  cancel_contribution_by_token(text),
  submit_suggested_item(text, text, text, text, text, text, text)
to anon, authenticated;

grant execute on function
  approve_suggested_item(uuid, uuid),
  add_memorial_admin(text),
  seed_default_menu(uuid),
  memorial_signups_open(uuid)
to authenticated;

-- ---------------------------------------------------------------------------
-- Photo storage
-- ---------------------------------------------------------------------------

-- Public-read bucket for the memorial photos admins upload. Only admins
-- can write; file names are random UUIDs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('memorial-photos', 'memorial-photos', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

create policy "memorial admins upload photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'memorial-photos' and public.is_memorial_admin());
create policy "memorial admins update photos" on storage.objects for update to authenticated
  using (bucket_id = 'memorial-photos' and public.is_memorial_admin());
create policy "memorial admins delete photos" on storage.objects for delete to authenticated
  using (bucket_id = 'memorial-photos' and public.is_memorial_admin());
