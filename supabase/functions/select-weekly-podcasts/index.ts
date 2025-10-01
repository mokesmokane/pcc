import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PodcastAPIResponse {
  id: string;
  title: string;
  podcast: {
    title: string;
    publisher: string;
    image: string;
  };
  description: string;
  audio: string;
  audio_length_sec: number;
  pub_date_ms: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Listen Notes API key
    const listenNotesApiKey = Deno.env.get('LISTEN_NOTES_API_KEY');
    
    if (!listenNotesApiKey) {
      throw new Error('Listen Notes API key not configured');
    }

    // Define categories and their search queries
    const categories = [
      { category: 'understand_people', query: 'psychology interview', genre_id: 191 },
      { category: 'need_laugh', query: 'comedy', genre_id: 133 },
      { category: 'social_chat', query: 'culture society', genre_id: 122 },
    ];

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const selectedEpisodes = [];

    // Fetch podcasts for each category
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      
      // Call Listen Notes API
      const response = await fetch(
        `https://listen-api.listennotes.com/api/v2/search?q=${encodeURIComponent(category.query)}&type=episode&genre_ids=${category.genre_id}&sort_by_date=1&safe_mode=0&len_min=20&len_max=90`,
        {
          headers: {
            'X-ListenAPI-Key': listenNotesApiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Listen Notes API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Pick a random episode from top 10 results
        const topEpisodes = data.results.slice(0, 10);
        const randomEpisode = topEpisodes[Math.floor(Math.random() * topEpisodes.length)] as PodcastAPIResponse;

        // First, ensure the podcast exists
        const { data: existingPodcast } = await supabase
          .from('podcasts')
          .select('id')
          .eq('name', randomEpisode.podcast.title)
          .single();

        let podcastId;
        if (!existingPodcast) {
          // Create the podcast
          const { data: newPodcast, error: podcastError } = await supabase
            .from('podcasts')
            .insert({
              name: randomEpisode.podcast.title,
              author: randomEpisode.podcast.publisher,
              artwork_url: randomEpisode.podcast.image,
            })
            .select('id')
            .single();

          if (podcastError) throw podcastError;
          podcastId = newPodcast.id;
        } else {
          podcastId = existingPodcast.id;
        }

        // Check if episode already exists
        const { data: existingEpisode } = await supabase
          .from('episodes')
          .select('id')
          .eq('title', randomEpisode.title)
          .eq('podcast_id', podcastId)
          .single();

        let episodeId;
        if (!existingEpisode) {
          // Create the episode
          const { data: newEpisode, error: episodeError } = await supabase
            .from('episodes')
            .insert({
              podcast_id: podcastId,
              title: randomEpisode.title,
              description: randomEpisode.description,
              audio_url: randomEpisode.audio,
              duration: randomEpisode.audio_length_sec,
              published_at: new Date(randomEpisode.pub_date_ms).toISOString(),
            })
            .select('id')
            .single();

          if (episodeError) throw episodeError;
          episodeId = newEpisode.id;
        } else {
          episodeId = existingEpisode.id;
        }

        selectedEpisodes.push({
          episode_id: episodeId,
          category: category.category,
          order_position: i + 1,
        });
      }
    }

    // Clear any existing selections for this week
    const { error: deleteError } = await supabase
      .from('weekly_selections')
      .delete()
      .eq('week_start', weekStart.toISOString().split('T')[0]);

    if (deleteError) throw deleteError;

    // Insert new selections
    const { error: insertError } = await supabase
      .from('weekly_selections')
      .insert(
        selectedEpisodes.map(selection => ({
          ...selection,
          week_start: weekStart.toISOString().split('T')[0],
        }))
      );

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Weekly podcasts selected successfully',
        count: selectedEpisodes.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});