-- Insert episode details for the Ezra Klein & Ross Douthat discussion
-- Note: Replace 'your-episode-id-here' with the actual episode ID from your weekly_selections table

INSERT INTO public.episode_details (episode_id, about, why_we_love_it)
VALUES (
    'your-episode-id-here', -- Replace with actual episode ID
    'Ezra Klein joins Ross Douthat on "Interesting Times" to discuss the current state and future direction of the American left. They explore what kind of unifying project could bring together progressive movements and examine recent political developments and their implications for both the left and the country as a whole.',
    'We chose this episode because watching Ezra and Ross debate is like watching two very polite professors argue over coffee - except the coffee is democracy and the stakes are slightly higher. These two manage to disagree without throwing chairs, which is refreshingly retro these days. Plus, if you''ve ever wanted to understand political coalitions without falling asleep or getting into a Twitter fight, this is your jam. Come for the intellectual sparring, stay for the subtle dad jokes and the moment where they almost (almost!) agree on something.'
)
ON CONFLICT (episode_id)
DO UPDATE SET
    about = EXCLUDED.about,
    why_we_love_it = EXCLUDED.why_we_love_it,
    updated_at = TIMEZONE('utc', NOW());

-- To find your episode ID, you can run:
-- SELECT episode_id, episode_title FROM weekly_selections WHERE episode_title LIKE '%Ezra Klein%' OR episode_title LIKE '%Ross Douthat%';