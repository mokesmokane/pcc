import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface TranscriptSegment {
  id: number;
  episode_id: string;
  start_seconds: number;
  end_seconds: number;
  text: string;
}

export function useTranscriptSegments(episodeId: string | undefined) {
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!episodeId) {
      setSegments([]);
      return;
    }

    const fetchSegments = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('transcript_segments')
          .select('*')
          .eq('episode_id', episodeId)
          .order('start_seconds', { ascending: true });

        if (error) throw error;

        setSegments(data || []);
      } catch (err) {
        console.error('Error fetching transcript segments:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch transcript');
        setSegments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSegments();
  }, [episodeId]);

  return { segments, loading, error };
}

export function getCurrentSegments(
  segments: TranscriptSegment[],
  currentPosition: number,
  windowSize: number = 5
): {
  currentSegmentIndex: number;
  visibleSegments: TranscriptSegment[];
  currentText: string;
  upcomingText: string;
} {
  // Find the current segment based on playback position
  const currentSegmentIndex = segments.findIndex(
    (seg) => currentPosition >= seg.start_seconds && currentPosition < seg.end_seconds
  );

  // If no current segment found, try to find the closest one
  const effectiveIndex = currentSegmentIndex === -1
    ? segments.findIndex(seg => seg.start_seconds > currentPosition) - 1
    : currentSegmentIndex;

  const safeIndex = Math.max(0, Math.min(effectiveIndex, segments.length - 1));

  // Get visible segments window (current + some before/after)
  const startIdx = Math.max(0, safeIndex - Math.floor(windowSize / 2));
  const endIdx = Math.min(segments.length, startIdx + windowSize);
  const visibleSegments = segments.slice(startIdx, endIdx);

  // Build current and upcoming text
  let currentText = '';
  let upcomingText = '';

  segments.forEach((segment, index) => {
    if (index <= safeIndex) {
      currentText += segment.text + ' ';
    } else {
      upcomingText += segment.text + ' ';
    }
  });

  return {
    currentSegmentIndex: safeIndex,
    visibleSegments,
    currentText: currentText.trim(),
    upcomingText: upcomingText.trim(),
  };
}