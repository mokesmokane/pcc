-- Create view for episode members with their progress and activity
CREATE OR REPLACE VIEW episode_members_view AS
SELECT
  p.id as user_id,
  p.first_name,
  p.last_name,
  p.username,
  p.avatar_url,
  uep.episode_id,
  COALESCE(uep.percentage_complete, 0) as progress,
  CASE WHEN COALESCE(uep.percentage_complete, 0) >= 95 THEN true ELSE false END as has_finished,
  COALESCE(c.comment_count, 0) as comment_count,
  GREATEST(
    COALESCE(uep.last_updated, NOW() - INTERVAL '30 days'),
    COALESCE(c.last_comment_at, NOW() - INTERVAL '30 days')
  ) as last_activity
FROM profiles p
INNER JOIN user_episode_progress uep ON p.id = uep.user_id
LEFT JOIN (
  SELECT
    user_id,
    episode_id,
    COUNT(*) as comment_count,
    MAX(created_at) as last_comment_at
  FROM comments
  GROUP BY user_id, episode_id
) c ON p.id = c.user_id AND uep.episode_id = c.episode_id::text
WHERE uep.episode_id IS NOT NULL
ORDER BY uep.percentage_complete DESC, c.comment_count DESC;

-- Grant access to authenticated users
GRANT SELECT ON episode_members_view TO authenticated;