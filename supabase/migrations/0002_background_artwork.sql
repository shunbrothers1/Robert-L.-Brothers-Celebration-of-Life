-- Optional background artwork for an event's page header (for example the
-- floral design from the funeral program), uploaded from Event Settings.
--
-- Run once in the Supabase SQL Editor after 0001_initial_schema.sql. Safe to
-- run again: it only adds a column and refreshes one function.

alter table memorial_events
  add column if not exists background_image_url text
  check (char_length(background_image_url) <= 2000);

-- Same as in 0001, plus background_image_url in the public event JSON.
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
      'background_image_url', v_event.background_image_url,
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

-- "create or replace" keeps the existing grants, but restate them so this
-- file is correct on its own.
revoke execute on function get_public_event(text) from public;
grant execute on function get_public_event(text) to anon, authenticated;
