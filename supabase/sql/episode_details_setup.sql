-- Simple SQL to create episode_details table in Supabase
-- Run this in the Supabase SQL editor

-- Drop existing table if needed (BE CAREFUL - this will delete all data)
-- DROP TABLE IF EXISTS public.episode_details CASCADE;

-- Create the episode_details table
CREATE TABLE public.episode_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    episode_id TEXT NOT NULL UNIQUE,
    about TEXT NOT NULL,
    why_we_love_it TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add index for better performance
CREATE INDEX idx_episode_details_episode_id ON public.episode_details(episode_id);

-- Enable RLS
ALTER TABLE public.episode_details ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read
CREATE POLICY "Public read access" ON public.episode_details
    FOR SELECT USING (true);

-- Only authenticated users can insert (you can make this more restrictive)
CREATE POLICY "Authenticated users can insert" ON public.episode_details
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Only authenticated users can update
CREATE POLICY "Authenticated users can update" ON public.episode_details
    FOR UPDATE
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_episode_details_updated_at
    BEFORE UPDATE ON public.episode_details
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.episode_details TO authenticated;
GRANT ALL ON public.episode_details TO authenticated;

-- Insert sample data for testing
-- You can uncomment and modify these with real episode IDs
/*
INSERT INTO public.episode_details (episode_id, about, why_we_love_it)
VALUES
    (
        'test-episode-1',
        'This episode dives deep into the fascinating world of technology and innovation, exploring how recent advances are shaping our future.',
        'We chose this episode because it offers unique insights from industry leaders and presents complex topics in an accessible way. The host''s interviewing style brings out surprising revelations that will change how you think about technology.'
    ),
    (
        'test-episode-2',
        'A compelling narrative about personal growth and overcoming challenges. The guest shares their journey from struggle to success with raw honesty.',
        'This episode resonated with us because of its authentic storytelling and practical advice. The vulnerability and wisdom shared here can help anyone facing similar challenges.'
    );
*/