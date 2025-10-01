import { ChapterRepository } from '../data/repositories/chapter.repository';
import Chapter from '../data/models/chapter.model';
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

      // Sync with remote first
      await this.repository.syncWithRemote(episodeId);

      // Return local chapters
      return await this.repository.getEpisodeChapters(episodeId);
    } catch (err) {
      console.error('Failed to load chapters:', err);
      throw err;
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