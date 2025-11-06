import { TranscriptSegmentRepository } from '../data/repositories/transcript-segment.repository';
import type TranscriptSegment from '../data/models/transcript-segment.model';
import database from '../db';

export interface TranscriptSegmentData {
  id: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
  isCurrent?: boolean;
  isPast?: boolean;
}

export interface TranscriptDisplay {
  segments: TranscriptSegmentData[];
  currentSegmentIndex: number;
  currentText: string;
  upcomingText: string;
  visibleSegments: TranscriptSegmentData[];
}

class TranscriptService {
  private repository: TranscriptSegmentRepository;

  constructor() {
    this.repository = new TranscriptSegmentRepository(database);
  }

  async loadTranscript(episodeId: string): Promise<TranscriptSegment[]> {
    if (!episodeId) {
      console.log('TranscriptService - No episode ID provided');
      return [];
    }

    try {
      console.log('TranscriptService - Loading transcript for episode:', episodeId);

      // Get from local cache first
      const cached = await this.repository.getEpisodeSegments(episodeId);

      // If we have cached data, return it immediately
      if (cached.length > 0) {
        console.log('✅ Using cached transcript, syncing in background');
        // Sync in background (non-blocking)
        this.repository.syncWithRemote(episodeId).catch(err => {
          console.error('Background transcript sync failed:', err);
        });
        return cached;
      }

      // No cache - sync first (initial load)
      console.log('📥 No cached transcript, performing initial sync');
      await this.repository.syncWithRemote(episodeId);

      // Return newly synced segments
      return await this.repository.getEpisodeSegments(episodeId);
    } catch (err) {
      console.error('Failed to load transcript:', err);
      throw err;
    }
  }

  async getCurrentSegment(episodeId: string, position: number): Promise<TranscriptSegment | null> {
    return await this.repository.getCurrentSegment(episodeId, position);
  }

  formatTranscriptDisplay(
    segments: TranscriptSegment[],
    currentPosition: number,
    windowSize: number = 5
  ): TranscriptDisplay {
    // Find current segment index
    const currentSegmentIndex = segments.findIndex(
      seg => currentPosition >= seg.startSeconds && currentPosition < seg.endSeconds
    );

    // If no current segment found, try to find the closest one
    const effectiveIndex = currentSegmentIndex === -1
      ? segments.findIndex(seg => seg.startSeconds > currentPosition) - 1
      : currentSegmentIndex;

    const safeIndex = Math.max(0, Math.min(effectiveIndex, segments.length - 1));

    // Get visible segments window
    const visibleSegments = this.repository.getSurroundingSegments(segments, safeIndex, windowSize);

    // Build current and upcoming text
    let currentText = '';
    let upcomingText = '';

    segments.forEach((segment, index) => {
      if (index <= safeIndex) {
        currentText += `${segment.text  } `;
      } else {
        upcomingText += `${segment.text  } `;
      }
    });

    // Format segments with metadata
    const formattedSegments: TranscriptSegmentData[] = segments.map((segment, index) => ({
      id: segment.id,
      startSeconds: segment.startSeconds,
      endSeconds: segment.endSeconds,
      text: segment.text,
      isCurrent: index === safeIndex,
      isPast: index < safeIndex,
    }));

    const formattedVisibleSegments: TranscriptSegmentData[] = visibleSegments.map((segment, index) => {
      const globalIndex = segments.findIndex(s => s.id === segment.id);
      return {
        id: segment.id,
        startSeconds: segment.startSeconds,
        endSeconds: segment.endSeconds,
        text: segment.text,
        isCurrent: globalIndex === safeIndex,
        isPast: globalIndex < safeIndex,
      };
    });

    return {
      segments: formattedSegments,
      currentSegmentIndex: safeIndex,
      currentText: currentText.trim(),
      upcomingText: upcomingText.trim(),
      visibleSegments: formattedVisibleSegments,
    };
  }

  // For the mini transcript preview
  formatPreviewText(
    segments: TranscriptSegment[],
    currentPosition: number,
    maxCurrentLength: number = 100,
    maxUpcomingLength: number = 200
  ): { currentText: string; upcomingText: string } {
    const display = this.formatTranscriptDisplay(segments, currentPosition);

    // Limit displayed text for preview
    const displayCurrentText = display.currentText.length > maxCurrentLength
      ? `...${  display.currentText.substring(display.currentText.length - maxCurrentLength)}`
      : display.currentText;

    const displayUpcomingText = display.upcomingText.substring(0, maxUpcomingLength);

    return {
      currentText: displayCurrentText,
      upcomingText: displayUpcomingText,
    };
  }

  async deleteEpisodeTranscript(episodeId: string): Promise<void> {
    await this.repository.deleteEpisodeSegments(episodeId);
  }
}

export const transcriptService = new TranscriptService();