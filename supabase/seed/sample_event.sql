-- Optional sample Celebration of Life event, for local development or a
-- first look at the site. Run it in the Supabase SQL Editor AFTER
-- 0001_initial_schema.sql. Everything it creates is ordinary data —
-- edit or delete it from /admin, or skip this file entirely and create
-- your real event from /admin ("New event" can add the same starter menu).
--
-- Creates a published event at /celebration/sample with the starter menu.

with new_event as (
  insert into memorial_events (
    slug, event_name, person_name, birth_date_text, passing_date_text, event_date,
    service_info, repast_time_text, repast_location_name, repast_address,
    signup_deadline, timezone, biography, favorite_quote, is_published
  ) values (
    'sample',
    'Celebration of Life',
    'James Robert Brown',
    '1938',
    '2026',
    current_date + 10,
    'Homegoing service at 11:00 AM, Greater Hope Baptist Church',
    'Immediately following the service, about 1:00 PM',
    'Greater Hope Fellowship Hall',
    '123 Main Street, Atlanta, GA 30303',
    current_date + 7,
    'America/New_York',
    'A devoted husband, father, grandfather, and friend who never met a stranger.',
    'Leave every place a little better than you found it.',
    true
  )
  on conflict (slug) do nothing
  returning id
)
select seed_default_menu(id) from new_event;

-- Mark a couple of items as most needed, as an example.
update food_items set is_priority = true
where event_id = (select id from memorial_events where slug = 'sample')
  and name in ('Fried Chicken', 'Cases of Bottled Water', 'Ice');
