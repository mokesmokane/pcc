-- Supabase Schema Export
-- Generated from actual database inspection

-- Table: weekly_selections
-- ----------------------------------------
-- id: uuid (primary key)
-- week_start: date
-- episode_id: uuid (foreign key to podcast_episodes.id)
-- order_position: integer
-- created_at: timestamp with time zone

-- Sample data:
-- {
--   "id": "1c5df7ca-2e62-4474-9663-cb1dcdf35b43",
--   "week_start": "2025-09-22",
--   "episode_id": "ff1f6c13-8910-4d13-bb43-290f6e3bc54f",
--   "order_position": 1,
--   "created_at": "2025-09-23T13:25:58.691304+00:00"
-- }

-- Table: podcast_episodes
-- ----------------------------------------
-- id: uuid (primary key)
-- rss_feed_url: text
-- episode_guid: text
-- episode_title: text
-- podcast_title: text
-- podcast_author: text (nullable)
-- episode_description: text
-- audio_url: text
-- duration: integer (seconds)
-- published_at: timestamp with time zone
-- artwork_url: text
-- about_this_podcast: text (nullable)
-- why_we_chose_it: text (nullable)
-- category: text (values: 'understand_people', 'need_laugh', 'social_chat')
-- created_at: timestamp with time zone
-- updated_at: timestamp with time zone

-- Sample data:
-- {
--   "id": "ff1f6c13-8910-4d13-bb43-290f6e3bc54f",
--   "episode_title": "Ezra Klein Is Worried — but Not About a Radicalized Left",
--   "podcast_title": "Interesting Times with Ross Douthat",
--   "audio_url": "https://dts.podtrac.com/redirect.mp3/...",
--   "duration": 0,
--   "artwork_url": "https://image.simplecastcdn.com/...",
--   "category": "understand_people",
--   ...
-- }

-- Table: user_weekly_choices
-- ----------------------------------------
-- id: uuid (primary key)
-- user_id: uuid (foreign key to auth.users.id)
-- episode_id: uuid (foreign key to podcast_episodes.id)
-- week_start: date
-- chosen_at: timestamp with time zone

-- Sample data:
-- {
--   "id": "ea736ef1-db9d-43fc-ade5-7a0b6ace1de0",
--   "user_id": "59c7b0c5-f6c5-4858-ad04-52621d40ef04",
--   "episode_id": "ff1f6c13-8910-4d13-bb43-290f6e3bc54f",
--   "week_start": "2025-09-20",
--   "chosen_at": "2025-09-23T17:05:50.815+00:00"
-- }

-- Relationships:
-- weekly_selections.episode_id -> podcast_episodes.id
-- user_weekly_choices.episode_id -> podcast_episodes.id
-- user_weekly_choices.user_id -> auth.users.id

-- Current week's data (2025-09-22):
-- 3 weekly selections with order_positions 1, 2, 3
-- Each linked to a podcast_episode with categories:
--   1. understand_people - "Ezra Klein Is Worried..."
--   2. need_laugh - "The Lower Courts Punch Up"
--   3. social_chat - "Replaceable You"
