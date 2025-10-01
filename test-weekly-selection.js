require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWeeklySelections() {
  // Calculate week start (Monday)
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - diff);
  weekStart.setHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  console.log('Testing weekly selections fetch');
  console.log('Today:', now.toDateString());
  console.log('Calculated week start (Monday):', weekStartStr);

  try {
    // Test direct query
    const { data, error } = await supabase
      .from('weekly_selections')
      .select(`
        *,
        podcast_episode:podcast_episodes (
          id,
          episode_title,
          podcast_title,
          episode_description,
          audio_url,
          artwork_url,
          duration,
          category,
          published_at
        )
      `)
      .eq('week_start', weekStartStr)
      .order('order_position');

    if (error) {
      console.error('Error:', error);
    } else {
      if (data && data.length > 0) {
        data.forEach((selection, i) => {
          console.log(`\n${i + 1}. Episode:`, selection.podcast_episode?.episode_title || 'No episode data');
          console.log('   Podcast:', selection.podcast_episode?.podcast_title || 'N/A');
          console.log('   Category:', selection.podcast_episode?.category || 'N/A');
        });
      }
    }

    // Also check what week_starts exist in the database
    console.log('\n--- Checking all week_starts in database ---');
    const { data: allWeeks, error: weeksError } = await supabase
      .from('weekly_selections')
      .select('week_start')
      .order('week_start', { ascending: false })
      .limit(5);

    if (weeksError) {
      console.error('Error fetching weeks:', weeksError);
    } else {
      console.log('Available week_starts in database:');
      const uniqueWeeks = [...new Set(allWeeks.map(w => w.week_start))];
      uniqueWeeks.forEach(week => {
        console.log('  -', week);
      });
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testWeeklySelections();