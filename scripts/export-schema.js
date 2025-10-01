const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function exportSchema() {
  try {
    // Get all tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);

      // Try alternative: list known tables
      console.log('\n=== Known Tables (based on code) ===\n');
      const knownTables = [
        'weekly_selections',
        'podcast_episodes',
        'user_weekly_choices',
        'users'
      ];

      for (const table of knownTables) {
        console.log(`\nTable: ${table}`);
        console.log('-'.repeat(40));

        // Try to get a sample row to understand structure
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        if (data && data.length > 0) {
          console.log('Columns:', Object.keys(data[0]).join(', '));
          console.log('Sample row:', JSON.stringify(data[0], null, 2));
        } else if (error) {
          console.log('Error:', error.message);
        } else {
          console.log('No data found');
        }
      }

      // Specifically check weekly_selections with join
      console.log('\n=== Weekly Selections with Episodes ===\n');
      const { data: selections, error: selectionsError } = await supabase
        .from('weekly_selections')
        .select(`
          *,
          podcast_episode:podcast_episodes (*)
        `)
        .limit(3);

      if (selections) {
        console.log('Weekly selections structure:');
        console.log(JSON.stringify(selections, null, 2));
      } else if (selectionsError) {
        console.log('Error fetching weekly selections:', selectionsError);
      }

      return;
    }

    console.log('=== Supabase Schema Export ===\n');
    console.log('Tables found:', tables.map(t => t.table_name).join(', '));

    // For each table, get its columns
    for (const table of tables) {
      const { data: columns, error: columnsError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'public')
        .eq('table_name', table.table_name);

      if (columnsError) {
        console.error(`Error fetching columns for ${table.table_name}:`, columnsError);
        continue;
      }

      console.log(`\nTable: ${table.table_name}`);
      console.log('-'.repeat(40));
      columns.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
      });
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

exportSchema();