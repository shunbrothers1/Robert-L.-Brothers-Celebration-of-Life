-- Optional background artwork for an event's page header (for example the
-- floral design from the funeral program), uploaded from Event Settings.
-- Guests read it straight from memorial_events, which they may already
-- read for published events. Run once after 0001; safe to run again.

alter table memorial_events add column if not exists background_image_url text
  check (char_length(background_image_url) <= 2000);
