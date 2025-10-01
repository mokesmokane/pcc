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
    
    // Parse basic podcast info using regex
    const titleMatch = xmlText.match(/<title>([^<]+)<\/title>/)
    const descriptionMatch = xmlText.match(/<description>(?:<!\[CDATA\[)?([^<\]]+)(?:\]\]>)?<\/description>/)
    const authorMatch = xmlText.match(/<itunes:author>([^<]+)<\/itunes:author>/)
    
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

    const metadata = {
      title: titleMatch ? titleMatch[1].trim() : '',
      description: descriptionMatch ? descriptionMatch[1].trim() : '',
      author: authorMatch ? authorMatch[1].trim() : '',
      image: imageUrl,
      feedUrl: feedUrl
    }

    return new Response(
      JSON.stringify(metadata),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})