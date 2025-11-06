import { ChapterRepository } from '../data/repositories/chapter.repository';
import type Chapter from '../data/models/chapter.model';
import database from '../db';

export interface ChapterData {
  id: string;
  title: string;
  description?: string;
  startSeconds: number;
  endSeconds?: number;
  isCurrent?: boolean;
  isPast?: boolean;
}

class ChapterService {
  private repository: ChapterRepository;

  constructor() {
    this.repository = new ChapterRepository(database);
  }

  async loadChapters(episodeId: string): Promise<Chapter[]> {
    if (!episodeId) {
      return [];
    }

    try {
      // Get from local cache first
      const cached = await this.repository.getEpisodeChapters(episodeId);

      // If we have cached data, return it immediately
      if (cached.length > 0) {
        console.log('✅ Using cached chapters, syncing in background');
        // Sync in background (non-blocking)
        this.repository.syncWithRemote(episodeId).catch(err => {
          console.error('Background chapter sync failed:', err);
        });
        return cached;
      }

      // No cache - sync first (initial load)
      console.log('📥 No cached chapters, performing initial sync');
      await this.repository.syncWithRemote(episodeId);

      // Return newly synced chapters (may be empty array if episode has no chapters)
      const chapters = await this.repository.getEpisodeChapters(episodeId);

      if (chapters.length === 0) {
        console.log('ℹ️ Episode has no chapters');
      }

      return chapters;
    } catch (err) {
      console.error('Failed to load chapters:', err);
      // Return empty array instead of throwing - no chapters is a valid state
      return [];
    }
  }

  async getCurrentChapter(episodeId: string, position: number): Promise<Chapter | null> {
    return await this.repository.getCurrentChapter(episodeId, position);
  }

  formatChapters(chapters: Chapter[], currentPosition: number): ChapterData[] {
    return chapters.map((chapter) => {
      const isCurrent = this.isCurrentChapter(chapter, chapters, currentPosition);
      const isPast = currentPosition > (chapter.endSeconds || chapter.startSeconds);

      return {
        id: chapter.id,
        title: chapter.title,
        description: chapter.description,
        startSeconds: chapter.startSeconds,
        endSeconds: chapter.endSeconds,
        isCurrent,
        isPast,
      };
    });
  }

  private isCurrentChapter(chapter: Chapter, allChapters: Chapter[], position: number): boolean {
    const index = allChapters.indexOf(chapter);

    if (chapter.endSeconds) {
      return position >= chapter.startSeconds && position < chapter.endSeconds;
    } else {
      // If no end time, check if this is the last chapter or if position is before the next chapter
      if (index === allChapters.length - 1) {
        // Last chapter
        return position >= chapter.startSeconds;
      } else {
        const nextChapter = allChapters[index + 1];
        return position >= chapter.startSeconds && position < nextChapter.startSeconds;
      }
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  async deleteEpisodeChapters(episodeId: string): Promise<void> {
    await this.repository.deleteEpisodeChapters(episodeId);
  }
}

export const chapterService = new ChapterService();