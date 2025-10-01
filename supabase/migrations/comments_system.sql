-- Comments system tables for podcast episodes

-- Main comments table
CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  episode_id UUID REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For replies
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Indexes for performance
  CONSTRAINT comments_content_length CHECK (char_length(content) <= 5000)
);

-- Comment reactions table
CREATE TABLE comment_reactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),

  -- Ensure one reaction per emoji per user per comment
  UNIQUE(comment_id, user_id, emoji)
);

-- Create indexes for better query performance
CREATE INDEX idx_comments_episode ON comments(episode_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);
CREATE INDEX idx_reactions_comment ON comment_reactions(comment_id);
CREATE INDEX idx_reactions_user ON comment_reactions(user_id);

-- Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments

-- Everyone can read comments
CREATE POLICY "Public comments read access"
  ON comments FOR SELECT
  USING (true);

-- Authenticated users can create comments
CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for reactions

-- Everyone can read reactions
CREATE POLICY "Public reactions read access"
  ON comment_reactions FOR SELECT
  USING (true);

-- Authenticated users can create reactions
CREATE POLICY "Authenticated users can create reactions"
  ON comment_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete own reactions"
  ON comment_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- View to get comment counts per episode
CREATE VIEW episode_comment_counts AS
SELECT
  episode_id,
  COUNT(*) as comment_count
FROM comments
WHERE parent_id IS NULL  -- Only count top-level comments
GROUP BY episode_id;

-- View to get comment with user info and reaction counts
CREATE VIEW comments_with_details AS
SELECT
  c.id,
  c.episode_id,
  c.user_id,
  c.content,
  c.parent_id,
  c.created_at,
  c.updated_at,
  p.username,
  p.avatar_url,
  (
    SELECT COUNT(*)
    FROM comments replies
    WHERE replies.parent_id = c.id
  ) as reply_count,
  (
    SELECT json_agg(
      json_build_object(
        'emoji', cr.emoji,
        'count', reaction_counts.count,
        'userReacted', EXISTS(
          SELECT 1 FROM comment_reactions
          WHERE comment_id = c.id
          AND emoji = cr.emoji
          AND user_id = auth.uid()
        )
      )
    )
    FROM (
      SELECT emoji, COUNT(*) as count
      FROM comment_reactions
      WHERE comment_id = c.id
      GROUP BY emoji
    ) reaction_counts
    JOIN comment_reactions cr ON cr.comment_id = c.id AND cr.emoji = reaction_counts.emoji
    GROUP BY cr.emoji, reaction_counts.count
  ) as reactions
FROM comments c
LEFT JOIN profiles p ON c.user_id = p.id;

-- Function to get comments for an episode with all details
CREATE OR REPLACE FUNCTION get_episode_comments(
  p_episode_id UUID,
  p_parent_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  episode_id UUID,
  user_id UUID,
  content TEXT,
  parent_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  username TEXT,
  avatar_url TEXT,
  reply_count BIGINT,
  reactions JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.episode_id,
    c.user_id,
    c.content,
    c.parent_id,
    c.created_at,
    c.updated_at,
    p.username,
    p.avatar_url,
    (
      SELECT COUNT(*)
      FROM comments replies
      WHERE replies.parent_id = c.id
    ) as reply_count,
    (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'emoji', reaction_data.emoji,
            'count', reaction_data.count,
            'userReacted', reaction_data.user_reacted
          )
        ),
        '[]'::jsonb
      )
      FROM (
        SELECT
          cr.emoji,
          COUNT(*) as count,
          bool_or(cr.user_id = auth.uid()) as user_reacted
        FROM comment_reactions cr
        WHERE cr.comment_id = c.id
        GROUP BY cr.emoji
      ) reaction_data
    ) as reactions
  FROM comments c
  LEFT JOIN profiles p ON c.user_id = p.id
  WHERE c.episode_id = p_episode_id
    AND (c.parent_id IS NULL OR c.parent_id = p_parent_id)
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to toggle reaction
CREATE OR REPLACE FUNCTION toggle_comment_reaction(
  p_comment_id UUID,
  p_emoji VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if reaction exists
  SELECT EXISTS(
    SELECT 1 FROM comment_reactions
    WHERE comment_id = p_comment_id
    AND user_id = auth.uid()
    AND emoji = p_emoji
  ) INTO v_exists;

  IF v_exists THEN
    -- Remove reaction
    DELETE FROM comment_reactions
    WHERE comment_id = p_comment_id
    AND user_id = auth.uid()
    AND emoji = p_emoji;
    RETURN FALSE;
  ELSE
    -- Add reaction
    INSERT INTO comment_reactions (comment_id, user_id, emoji)
    VALUES (p_comment_id, auth.uid(), p_emoji);
    RETURN TRUE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for functions
GRANT EXECUTE ON FUNCTION get_episode_comments TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_comment_reaction TO authenticated;
GRANT SELECT ON episode_comment_counts TO authenticated, anon;
GRANT SELECT ON comments_with_details TO authenticated, anon;