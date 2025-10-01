import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { feedUrl } = await req.json()
    
    if (!feedUrl) {
      return new Response(
        JSON.stringify({ error: 'feedUrl is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Fetch the RSS feed
    const response = await fetch(feedUrl)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch RSS feed: ${response.status}`)
    }

    const xmlText = await response.text()
    
    // Parse basic podcast info using regex (since we can't use complex XML parsers in Deno easily)
    const titleMatch = xmlText.match(/<title>([^<]+)<\/title>/)
    const descriptionMatch = xmlText.match(/<description>(?:<!\[CDATA\[)?([^<\]]+)(?:\]\]>)?<\/description>/)
    
    // Extract image URL - try multiple formats
    let imageUrl = ''
    const itunesImageMatch = xmlText.match(/<itunes:image\s+href="([^"]+)"/)
    const imageUrlMatch = xmlText.match(/<image>\s*<url>([^<]+)<\/url>/)
    const mediaThumbMatch = xmlText.match(/<media:thumbnail\s+url="([^"]+)"/)
    
    if (itunesImageMatch) {
      imageUrl = itunesImageMatch[1]
    } else if (imageUrlMatch) {
      imageUrl = imageUrlMatch[1]
    } else if (mediaThumbMatch) {
      imageUrl = mediaThumbMatch[1]
    }

    // Extract episodes
    const episodes = []
    const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g)
    
    for (const match of itemMatches) {
      const itemXml = match[1]
      
      const episodeTitleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([^<\]]+)(?:\]\]>)?<\/title>/)
      const episodeDescMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([^<\]]+)(?:\]\]>)?<\/description>/)
      const pubDateMatch = itemXml.match(/<pubDate>([^<]+)<\/pubDate>/)
      const guidMatch = itemXml.match(/<guid[^>]*>([^<]+)<\/guid>/)
      const enclosureMatch = itemXml.match(/<enclosure[^>]+url="([^"]+)"/)
      const durationMatch = itemXml.match(/<itunes:duration>([^<]+)<\/itunes:duration>/)
      
      if (episodeTitleMatch && enclosureMatch) {
        episodes.push({
          title: episodeTitleMatch[1].trim(),
          description: episodeDescMatch ? episodeDescMatch[1].trim() : '',
          pubDate: pubDateMatch ? pubDateMatch[1].trim() : '',
          guid: guidMatch ? guidMatch[1].trim() : enclosureMatch[1],
          audioUrl: enclosureMatch[1],
          duration: durationMatch ? durationMatch[1].trim() : ''
        })
      }
      
      // Limit to 20 episodes
      if (episodes.length >= 20) break
    }

    const podcastData = {
      title: titleMatch ? titleMatch[1].trim() : '',
      description: descriptionMatch ? descriptionMatch[1].trim() : '',
      image: imageUrl,
      episodes
    }

    return new Response(
      JSON.stringify(podcastData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})