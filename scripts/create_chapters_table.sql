-- Create chapters table
CREATE TABLE IF NOT EXISTS public.chapters (
  id BIGSERIAL PRIMARY KEY,
  episode_id UUID NOT NULL,
  title TEXT NOT NULL,
  start_seconds NUMERIC NOT NULL,
  end_seconds NUMERIC NOT NULL,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT chapters_time_check CHECK (end_seconds > start_seconds)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS chapters_episode_id_idx ON public.chapters USING btree (episode_id);
CREATE INDEX IF NOT EXISTS chapters_time_idx ON public.chapters USING btree (episode_id, start_seconds);

-- Add comment
COMMENT ON TABLE public.chapters IS 'Podcast episode chapters with titles and timestamps';