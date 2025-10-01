-- Alter the existing user_episode_progress table to new structure
BEGIN;

-- Drop the existing unique constraint to recreate it later
ALTER TABLE public.user_episode_progress DROP CONSTRAINT IF EXISTS user_episode_progress_user_id_episode_id_key;

-- Drop the foreign key constraint first if it exists
ALTER TABLE public.user_episode_progress DROP CONSTRAINT IF EXISTS user_episode_progress_episode_id_fkey;

-- Change episode_id to VARCHAR to match the new requirement
ALTER TABLE public.user_episode_progress
  ALTER COLUMN episode_id TYPE VARCHAR(255) USING episode_id::VARCHAR(255);

-- Rename progress to current_position and change to FLOAT
ALTER TABLE public.user_episode_progress
  RENAME COLUMN progress TO current_position;

ALTER TABLE public.user_episode_progress
  ALTER COLUMN current_position TYPE FLOAT USING current_position::FLOAT;

-- Add total_duration column
ALTER TABLE public.user_episode_progress
  ADD COLUMN IF NOT EXISTS total_duration FLOAT DEFAULT 0;

-- Drop the completed column as we'll calculate it from percentage
ALTER TABLE public.user_episode_progress
  DROP COLUMN IF EXISTS completed;

-- Add percentage_complete as a generated column
ALTER TABLE public.user_episode_progress
  ADD COLUMN IF NOT EXISTS percentage_complete FLOAT GENERATED ALWAYS AS (
    CASE
      WHEN total_duration > 0 THEN (current_position / total_duration * 100)
      ELSE 0
    END
  ) STORED;

-- Add last_updated column if it doesn't exist
ALTER TABLE public.user_episode_progress
  ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Rename updated_at to created_at if it exists
ALTER TABLE public.user_episode_progress
  RENAME COLUMN updated_at TO created_at;

-- Re-create the unique constraint
ALTER TABLE public.user_episode_progress
  ADD CONSTRAINT user_episode_progress_user_episode_key UNIQUE(user_id, episode_id);

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_episode_progress_episode_id ON public.user_episode_progress(episode_id);
CREATE INDEX IF NOT EXISTS idx_user_episode_progress_user_episode ON public.user_episode_progress(user_id, episode_id);

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view their own progress" ON public.user_episode_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON public.user_episode_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON public.user_episode_progress;
DROP POLICY IF EXISTS "Users can delete their own progress" ON public.user_episode_progress;

CREATE POLICY "Users can view their own progress"
    ON public.user_episode_progress
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
    ON public.user_episode_progress
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
    ON public.user_episode_progress
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress"
    ON public.user_episode_progress
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create or replace the upsert function
CREATE OR REPLACE FUNCTION public.upsert_episode_progress(
    p_episode_id VARCHAR(255),
    p_current_position FLOAT,
    p_total_duration FLOAT
)
RETURNS public.user_episode_progress
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result public.user_episode_progress;
BEGIN
    INSERT INTO public.user_episode_progress (
        user_id,
        episode_id,
        current_position,
        total_duration,
        last_updated
    )
    VALUES (
        auth.uid(),
        p_episode_id,
        p_current_position,
        p_total_duration,
        NOW()
    )
    ON CONFLICT (user_id, episode_id)
    DO UPDATE SET
        current_position = EXCLUDED.current_position,
        total_duration = EXCLUDED.total_duration,
        last_updated = NOW()
    RETURNING * INTO v_result;

    RETURN v_result;
END;
$$;

COMMIT;