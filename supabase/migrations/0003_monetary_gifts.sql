-- Optional "Monetary Gifts" option: lets guests who can't cook or shop
-- send a gift straight to the family (Cash App, Zelle, Venmo, PayPal,
-- GoFundMe, or any link). The site only displays these details; no money
-- passes through it. Configured from Event Settings. Guests read these
-- columns directly from memorial_events (they may already read published
-- events). Run once after 0001; safe to run again.

alter table memorial_events
  add column if not exists giving_enabled boolean not null default false,
  add column if not exists giving_title text check (char_length(giving_title) <= 80),
  add column if not exists giving_message text check (char_length(giving_message) <= 1500),
  add column if not exists giving_methods jsonb not null default '[]'::jsonb
    check (jsonb_typeof(giving_methods) = 'array' and jsonb_array_length(giving_methods) <= 8);
