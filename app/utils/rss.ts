/**
 * RSS parsing utilities for podcast feeds
 */

export interface ParsedEpisode {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  pubDateRaw: Date | null;
  duration: string;
  durationSeconds: number;
  audioUrl: string;
}

export interface PodcastFeedInfo {
  title: string;
  author: string;
  artwork: string;
}

/**
 * HTML entity map for decoding
 */
const HTML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
  '&ndash;': '-',
  '&mdash;': '-',
  '&lsquo;': "'",
  '&rsquo;': "'",
  '&ldquo;': '"',
  '&rdquo;': '"',
  '&hellip;': '...',
  '&copy;': '(c)',
  '&reg;': '(R)',
  '&trade;': '(TM)',
  '&bull;': '*',
  '&middot;': '*',
};

/**
 * Decode HTML entities in text
 */
const decodeHTMLEntities = (text: string): string => {
  let result = text;

  // Decode named entities
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    result = result.split(entity).join(char);
  }

  // Decode numeric entities (&#123; or &#x7B;)
  result = result.replace(/&#(\d+);/g, (_, num) =>
    String.fromCharCode(parseInt(num, 10))
  );
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  return result;
};

/**
 * Strip HTML tags from text
 */
const stripHTMLTags = (text: string): string => {
  return text
    .replace(/<br\s*\/?>/gi, '\n')  // Convert <br> to newlines
    .replace(/<p[^>]*>/gi, '\n')     // Convert <p> to newlines
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '');        // Remove all other tags
};

/**
 * Normalize whitespace in text
 */
const normalizeWhitespace = (text: string): string => {
  return text
    .replace(/[\r\n]+/g, '\n')       // Normalize line endings
    .replace(/[ \t]+/g, ' ')         // Collapse multiple spaces/tabs
    .replace(/\n /g, '\n')           // Remove space after newline
    .replace(/ \n/g, '\n')           // Remove space before newline
    .replace(/\n{3,}/g, '\n\n')      // Max 2 consecutive newlines
    .trim();
};

/**
 * Normalize special characters (smart quotes, etc.)
 */
const normalizeSpecialChars = (text: string): string => {
  return text
    // Smart quotes to regular quotes
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")  // Single quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')  // Double quotes
    // Dashes
    .replace(/[\u2013\u2014]/g, '-')              // En/em dash to hyphen
    // Ellipsis
    .replace(/\u2026/g, '...')
    // Other common replacements
    .replace(/\u00A0/g, ' ')                      // Non-breaking space
    .replace(/\u200B/g, '')                       // Zero-width space
    .replace(/\uFEFF/g, '');                      // BOM
};

/**
 * Full text sanitization - use this for all RSS text content
 */
export const sanitizeText = (text: string): string => {
  if (!text) return '';

  let result = text;

  // 1. Remove CDATA wrappers
  result = result.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

  // 2. Decode HTML entities (do this before stripping tags)
  result = decodeHTMLEntities(result);

  // 3. Strip HTML tags
  result = stripHTMLTags(result);

  // 4. Normalize special characters
  result = normalizeSpecialChars(result);

  // 5. Normalize whitespace
  result = normalizeWhitespace(result);

  return result;
};

/**
 * Lighter sanitization for titles (no HTML stripping, just entities and special chars)
 */
export const sanitizeTitle = (text: string): string => {
  if (!text) return '';

  let result = text;

  // Remove CDATA
  result = result.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

  // Decode entities
  result = decodeHTMLEntities(result);

  // Normalize special chars
  result = normalizeSpecialChars(result);

  // Single line, trimmed
  result = result.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

  return result;
};

/**
 * Clean CDATA tags from text (legacy - use sanitizeText instead)
 * @deprecated Use sanitizeText or sanitizeTitle instead
 */
const cleanCDATA = (text: string): string => {
  return sanitizeTitle(text);
};

/**
 * Parse duration string to seconds
 */
export const parseDurationToSeconds = (duration: string): number => {
  if (!duration) return 0;

  // Handle HH:MM:SS or MM:SS format
  if (duration.includes(':')) {
    const parts = duration.split(':').map(p => parseInt(p));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
  }

  // Handle pure seconds
  const seconds = parseInt(duration);
  return isNaN(seconds) ? 0 : seconds;
};

/**
 * Format duration for display
 */
export const formatDuration = (duration: string): string => {
  if (duration.includes(':')) {
    return duration;
  }

  const seconds = parseInt(duration);
  if (isNaN(seconds)) return '';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
};

/**
 * Format date string for display
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateString;
  }
};

/**
 * Parse raw date string to Date object
 */
export const parseDate = (dateString: string): Date | null => {
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

/**
 * Extract artwork URL from RSS feed XML
 */
export const extractArtwork = (xmlText: string): string => {
  // Try itunes:image first
  const itunesImageMatch = xmlText.match(/<itunes:image[^>]*href="([^"]*)"/i);
  if (itunesImageMatch) return itunesImageMatch[1];

  // Fallback to regular image tag
  const imageMatch = xmlText.match(/<image[^>]*>[\s\S]*?<url>([^<]*)<\/url>/i);
  if (imageMatch) return imageMatch[1];

  return '';
};

/**
 * Extract author from RSS feed XML
 */
export const extractAuthor = (xmlText: string): string => {
  const authorMatch = xmlText.match(/<itunes:author>([^<]*)<\/itunes:author>/i);
  return authorMatch ? sanitizeTitle(authorMatch[1]) : '';
};

/**
 * Extract podcast title from RSS feed XML
 */
export const extractTitle = (xmlText: string): string => {
  // Get channel title, not item titles
  const channelMatch = xmlText.match(/<channel[^>]*>([\s\S]*?)<item/i);
  if (channelMatch) {
    const titleMatch = channelMatch[1].match(/<title>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
      return sanitizeTitle(titleMatch[1]);
    }
  }
  return '';
};

/**
 * Parse RSS feed and extract episodes
 */
export const parseRSSEpisodes = (xmlText: string): ParsedEpisode[] => {
  const episodes: ParsedEpisode[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const matches = xmlText.matchAll(itemRegex);

  for (const match of matches) {
    const itemContent = match[1];

    const titleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/i);
    const descMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/i);
    const enclosureMatch = itemContent.match(/<enclosure[^>]*url="([^"]*)"[^>]*>/i);
    const pubDateMatch = itemContent.match(/<pubDate>(.*?)<\/pubDate>/i);
    const durationMatch = itemContent.match(/<itunes:duration>(.*?)<\/itunes:duration>/i);
    const guidMatch = itemContent.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);

    if (titleMatch && enclosureMatch) {
      const rawDuration = durationMatch ? durationMatch[1] : '';
      const durationSeconds = parseDurationToSeconds(rawDuration);
      const duration = durationSeconds > 0 ? formatDuration(rawDuration) : '';
      const rawPubDate = pubDateMatch ? pubDateMatch[1] : '';
      const pubDate = rawPubDate ? formatDate(rawPubDate) : '';
      const pubDateRaw = rawPubDate ? parseDate(rawPubDate) : null;
      const audioUrl = enclosureMatch[1];

      // Use sanitizers for clean text
      const title = sanitizeTitle(titleMatch[1]);
      const description = descMatch ? sanitizeText(descMatch[1]) : '';
      const id = guidMatch ? sanitizeTitle(guidMatch[1]) : audioUrl;

      episodes.push({
        id,
        title,
        description,
        pubDate,
        pubDateRaw,
        duration,
        durationSeconds,
        audioUrl,
      });
    }
  }

  return episodes;
};

/**
 * Parse RSS feed and extract feed info (title, author, artwork)
 */
export const parseFeedInfo = (xmlText: string): PodcastFeedInfo => {
  return {
    title: extractTitle(xmlText),
    author: extractAuthor(xmlText),
    artwork: extractArtwork(xmlText),
  };
};
