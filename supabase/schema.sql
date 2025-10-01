-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Podcast episodes table - stores everything we need to display
CREATE TABLE podcast_episodes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- RSS/Episode identifiers
  rss_feed_url TEXT NOT NULL,
  episode_guid TEXT NOT NULL,
  
  -- Display information
  episode_title TEXT NOT NULL,
  podcast_title TEXT NOT NULL,
  podcast_author TEXT,
  episode_description TEXT,
  audio_url TEXT NOT NULL,
  duration INTEGER, -- in seconds
  published_at TIMESTAMP WITH TIME ZONE,
  artwork_url TEXT,
  
  -- Our custom content
  about_this_podcast TEXT, -- Our description of the podcast series
  why_we_chose_it TEXT, -- Why this specific episode was selected
  category TEXT, -- 'understand_people', 'need_laugh', 'social_chat', 'wild_card'
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  
  -- Ensure we don't duplicate episodes
  UNIQUE(rss_feed_url, episode_guid)
);

-- Weekly selections table - just references to episodes
CREATE TABLE weekly_selections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  week_start DATE NOT NULL,
  episode_id UUID REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  order_position INTEGER NOT NULL, -- 1, 2, or 3
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(week_start, order_position)
);

-- Chat messages table
CREATE TABLE chat_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  episode_id UUID REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- User profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- User episode progress table
CREATE TABLE user_episode_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0, -- progress in seconds
  completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, episode_id)
);

-- Wild card history (track what users have spun)
CREATE TABLE wild_card_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id UUID REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  selected_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX idx_episodes_category ON podcast_episodes(category);
CREATE INDEX idx_weekly_selections_week ON weekly_selections(week_start);
CREATE INDEX idx_chat_messages_episode ON chat_messages(episode_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);
CREATE INDEX idx_user_progress_user ON user_episode_progress(user_id);
CREATE INDEX idx_wild_card_user ON wild_card_history(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE podcast_episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_episode_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE wild_card_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Everyone can read episodes and selections
CREATE POLICY "Public episodes access" ON podcast_episodes FOR SELECT USING (true);
CREATE POLICY "Public episodes insert" ON podcast_episodes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public episodes update" ON podcast_episodes FOR UPDATE USING (true);
CREATE POLICY "Public weekly selections access" ON weekly_selections FOR SELECT USING (true);
CREATE POLICY "Public weekly selections insert" ON weekly_selections FOR INSERT WITH CHECK (true);
CREATE POLICY "Public weekly selections update" ON weekly_selections FOR UPDATE USING (true);

-- Chat messages: users can read all and create their own
CREATE POLICY "Read all chat messages" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Users can create own messages" ON chat_messages FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Profiles: public read, own update
CREATE POLICY "Public profiles access" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE 
  USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- User progress: own only
CREATE POLICY "Users can view own progress" ON user_episode_progress FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON user_episode_progress FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON user_episode_progress FOR UPDATE 
  USING (auth.uid() = user_id);

-- Wild card history: own only
CREATE POLICY "Users can view own wild cards" ON wild_card_history FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wild cards" ON wild_card_history FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON podcast_episodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_episode_progress_updated_at BEFORE UPDATE ON user_episode_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();