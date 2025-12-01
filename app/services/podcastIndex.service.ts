import * as Crypto from 'expo-crypto';

// API credentials from https://api.podcastindex.org/
const API_KEY = 'DB2ATTVNNQG7CGVZ5LPH';
const API_SECRET = 's5mR#CNgfs5ZFLH6CF2JneA$pDafta#4NPmVLEAa';
const BASE_URL = 'https://api.podcastindex.org/api/1.0';
const USER_AGENT = 'PodcastClub/1.0';

export interface PodcastSearchResult {
  id: number;
  title: string;
  url: string;
  author: string;
  image: string;
  artwork: string;
  description: string;
  categories: Record<string, string>;
}

interface SearchResponse {
  status: string;
  feeds: PodcastSearchResult[];
  count: number;
  description: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const ts = Math.floor(Date.now() / 1000);
  const authString = API_KEY + API_SECRET + ts.toString();

  // Create SHA1 hash
  const hashDigest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA1,
    authString
  );

  return {
    'User-Agent': USER_AGENT,
    'X-Auth-Date': ts.toString(),
    'X-Auth-Key': API_KEY,
    'Authorization': hashDigest,
  };
}

export async function searchPodcasts(query: string): Promise<PodcastSearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  try {
    const headers = await getAuthHeaders();
    const encodedQuery = encodeURIComponent(query);
    const url = `${BASE_URL}/search/byterm?q=${encodedQuery}&max=20`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: SearchResponse = await response.json();

    if (data.status === 'true' && data.feeds) {
      return data.feeds;
    }

    return [];
  } catch (error) {
    console.error('Podcast search error:', error);
    throw error;
  }
}

export async function getPodcastByFeedUrl(feedUrl: string): Promise<PodcastSearchResult | null> {
  try {
    const headers = await getAuthHeaders();
    const encodedUrl = encodeURIComponent(feedUrl);
    const url = `${BASE_URL}/podcasts/byfeedurl?url=${encodedUrl}`;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.status === 'true' && data.feed) {
      return data.feed;
    }

    return null;
  } catch (error) {
    console.error('Podcast lookup error:', error);
    throw error;
  }
}
