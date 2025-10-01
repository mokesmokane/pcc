require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('SUPABASE_KEY:', supabaseKey ? 'Set' : 'Missing');
  process.exit(1);
}

console.log('Supabase URL:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQueries() {
  console.log('\n=== Testing Direct Queries ===\n');

  // Test 1: Simple query without join
  console.log('1. Testing simple query for weekly_selections:');
  const { data: simple, error: simpleError } = await supabase
    .from('weekly_selections')
    .select('*')
    .eq('week_start', '2025-09-22');

  if (simpleError) {
    console.error('Error:', simpleError);
  } else {
    console.log('Found', simple?.length || 0, 'items');
    if (simple && simple.length > 0) {
      console.log('First item:', simple[0]);
    }
  }

  // Test 2: Query with join
  console.log('\n2. Testing query with podcast_episodes join:');
  const { data: joined, error: joinError } = await supabase
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
    .eq('week_start', '2025-09-22')
    .order('order_position');

  if (joinError) {
    console.error('Error:', joinError);
  } else {
    console.log('Found', joined?.length || 0, 'items');
    if (joined && joined.length > 0) {
      console.log('First item with join:', JSON.stringify(joined[0], null, 2));
    }
  }

  // Test 3: Check podcast_episodes table
  console.log('\n3. Testing podcast_episodes table directly:');
  const episodeIds = [
    'ff1f6c13-8910-4d13-bb43-290f6e3bc54f',
    'd3f15428-1291-4a3c-9ae2-3fec1dea9c3d',
    'a04d27f6-1beb-4722-974b-b3e034669763'
  ];

  for (const id of episodeIds) {
    const { data: episode, error: episodeError } = await supabase
      .from('podcast_episodes')
      .select('id, episode_title, podcast_title')
      .eq('id', id)
      .single();

    if (episodeError) {
      console.log(`Episode ${id}: ERROR -`, episodeError.message);
    } else if (episode) {
      console.log(`Episode ${id}: ${episode.episode_title}`);
    } else {
      console.log(`Episode ${id}: Not found`);
    }
  }

  // Test 4: Check all tables
  console.log('\n4. Checking available tables:');
  const tables = ['weekly_selections', 'podcast_episodes', 'user_weekly_choices'];
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`Table ${table}: ERROR - ${error.message}`);
    } else {
      console.log(`Table ${table}: ${count} rows`);
    }
  }
}

testQueries();