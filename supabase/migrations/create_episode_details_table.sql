-- Create episode_details table
CREATE TABLE IF NOT EXISTS public.episode_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    episode_id TEXT NOT NULL UNIQUE,
    about TEXT NOT NULL,
    why_we_love_it TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_episode_details_episode_id ON public.episode_details(episode_id);

-- Enable Row Level Security
ALTER TABLE public.episode_details ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Policy: Anyone can read episode details
CREATE POLICY "Anyone can read episode details" ON public.episode_details
    FOR SELECT
    USING (true);

-- Policy: Only admins can insert episode details
CREATE POLICY "Admins can insert episode details" ON public.episode_details
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM auth.users
            WHERE raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy: Only admins can update episode details
CREATE POLICY "Admins can update episode details" ON public.episode_details
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users
            WHERE raw_user_meta_data->>'role' = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM auth.users
            WHERE raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Policy: Only admins can delete episode details
CREATE POLICY "Admins can delete episode details" ON public.episode_details
    FOR DELETE
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users
            WHERE raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for episode_details table
CREATE TRIGGER handle_episode_details_updated_at
    BEFORE UPDATE ON public.episode_details
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions to authenticated users to read
GRANT SELECT ON public.episode_details TO authenticated;

-- Grant all permissions to service role for backend operations
GRANT ALL ON public.episode_details TO service_role;

-- Add some sample data (optional - remove in production)
-- INSERT INTO public.episode_details (episode_id, about, why_we_love_it) VALUES
-- ('sample-episode-1', 'This is a detailed description about the episode...', 'We love this episode because...'),
-- ('sample-episode-2', 'Another detailed description...', 'This episode stands out because...');