import { DiscussionRepository } from '../data/repositories/discussion.repository';
import type { Database } from '@nozbe/watermelondb';

export interface DiscussionQuestionData {
  id: string;
  episodeId: string;
  question: string;
  questionType: 'agreement' | 'multiple_choice';
  imageUrl?: string | null;
  options: DiscussionOptionData[];
}

export interface DiscussionOptionData {
  value: number;
  label: string;
  emoji?: string | null;
  imageUrl?: string | null;
}

export interface DiscussionStatsData {
  optionValue: number;
  agreeCount: number;
  disagreeCount: number;
  agreePercentage: number;
  disagreePercentage: number;
}

export interface UserResponsesData {
  agreed: number[];
  disagreed: number[];
}

export class DiscussionService {
  private repository: DiscussionRepository;
  private syncCache: Map<string, number> = new Map(); // episodeId -> timestamp
  private readonly SYNC_CACHE_DURATION = 30000; // 30 seconds

  constructor(database: Database) {
    this.repository = new DiscussionRepository(database);
  }

  /**
   * Check if we should sync for an episode (only sync if cache is expired)
   */
  private shouldSync(episodeId: string): boolean {
    const lastSync = this.syncCache.get(episodeId);
    if (!lastSync) return true;

    const now = Date.now();
    return now - lastSync > this.SYNC_CACHE_DURATION;
  }

  /**
   * Mark an episode as synced
   */
  private markSynced(episodeId: string): void {
    this.syncCache.set(episodeId, Date.now());
  }

  /**
   * Invalidate sync cache to force fresh data load
   */
  public invalidateSyncCache(episodeId?: string): void {
    if (episodeId) {
      this.syncCache.delete(episodeId);
    } else {
      this.syncCache.clear();
    }
  }

  /**
   * Load all questions for an episode from remote and local
   */
  async loadQuestionsForEpisode(episodeId: string): Promise<DiscussionQuestionData[]> {
    try {
      // Sync from remote first (only if cache expired)
      if (this.shouldSync(episodeId)) {
        await this.repository.syncQuestionsFromRemote(episodeId);
        this.markSynced(episodeId);
      }

      // Get questions with options
      const questionsWithOptions = await this.repository.getQuestionsForEpisode(episodeId);

      // Convert to service format
      return questionsWithOptions.map((qwo) => ({
        id: qwo.question.id,
        episodeId: qwo.question.episodeId,
        question: qwo.question.question,
        questionType: qwo.question.questionType as 'agreement' | 'multiple_choice',
        imageUrl: qwo.question.imageUrl,
        options: qwo.options.map((opt) => ({
          value: opt.value,
          label: opt.label,
          emoji: opt.emoji,
          imageUrl: opt.imageUrl,
        })),
      }));
    } catch (error) {
      console.error('Failed to load discussion questions:', error);
      throw error;
    }
  }

  /**
   * Load user's responses for an episode from remote and local
   */
  async loadUserResponses(userId: string, episodeId: string): Promise<void> {
    try {
      await this.repository.syncUserResponsesFromRemote(userId, episodeId);
    } catch (error) {
      console.error('Failed to sync user responses:', error);
      throw error;
    }
  }

  /**
   * Get user's responses for a specific question
   */
  async getUserResponses(userId: string, questionId: string): Promise<UserResponsesData> {
    return await this.repository.getUserResponses(userId, questionId);
  }

  /**
   * Save user's response to a question
   */
  async saveResponse(
    userId: string,
    questionId: string,
    optionValue: number,
    responseType: 'agree' | 'disagree'
  ): Promise<void> {
    await this.repository.saveResponse(userId, questionId, optionValue, responseType);
  }

  /**
   * Save all responses for a question (handles multiple options)
   * Saves locally first, then syncs to Supabase in background
   */
  async saveAllResponses(
    userId: string,
    questionId: string,
    agreedValues: number[],
    allOptionValues: number[]
  ): Promise<string[]> {
    console.log('[DiscussionService] Saving all responses for question:', questionId);

    // Save all responses locally first (fast, doesn't block UI)
    const responseIds: string[] = [];
    for (const optionValue of allOptionValues) {
      const responseType = agreedValues.includes(optionValue) ? 'agree' : 'disagree';
      const responseId = await this.repository.saveResponseLocal(userId, questionId, optionValue, responseType);
      responseIds.push(responseId);
    }

    console.log('[DiscussionService] Saved', responseIds.length, 'responses locally');

    // Return response IDs so caller can trigger background sync
    return responseIds;
  }

  /**
   * Sync responses to Supabase (can be called in background)
   */
  async syncResponsesToRemote(responseIds: string[]): Promise<void> {
    console.log('[DiscussionService] Batch syncing', responseIds.length, 'responses to Supabase');
    await this.repository.syncMultipleResponses(responseIds);
    console.log('[DiscussionService] All responses synced successfully');
  }

  /**
   * Clear all user's responses for a question
   */
  async clearUserResponses(userId: string, questionId: string): Promise<void> {
    await this.repository.clearUserResponses(userId, questionId);
  }

  /**
   * Check if user has completed a question (answered all options)
   */
  async hasUserCompletedQuestion(userId: string, questionId: string): Promise<boolean> {
    return await this.repository.hasUserCompletedQuestion(userId, questionId);
  }

  /**
   * Get statistics for a question
   */
  async getQuestionStats(questionId: string): Promise<DiscussionStatsData[]> {
    return await this.repository.getQuestionStats(questionId);
  }

  /**
   * Get poll progress for an episode (percentage of completed questions)
   */
  async getPollProgress(
    userId: string,
    episodeId: string
  ): Promise<{ progress: number; isCompleted: boolean; totalQuestions: number; completedCount: number }> {
    try {
      // Sync data first (only if cache expired)
      if (this.shouldSync(episodeId)) {
        await this.repository.syncQuestionsFromRemote(episodeId);
        await this.repository.syncUserResponsesFromRemote(userId, episodeId);
        this.markSynced(episodeId);
      }

      // Get all questions
      const questions = await this.repository.getQuestionsForEpisode(episodeId);

      if (questions.length === 0) {
        return { progress: 0, isCompleted: false, totalQuestions: 0, completedCount: 0 };
      }

      // Count completed questions
      let completedCount = 0;
      for (const questionWithOptions of questions) {
        const hasCompleted = await this.repository.hasUserCompletedQuestion(
          userId,
          questionWithOptions.question.id
        );
        if (hasCompleted) {
          completedCount++;
        }
      }

      const progress = (completedCount / questions.length) * 100;
      const isCompleted = completedCount === questions.length;

      return {
        progress,
        isCompleted,
        totalQuestions: questions.length,
        completedCount,
      };
    } catch (error) {
      console.error('Failed to get poll progress:', error);
      return { progress: 0, isCompleted: false, totalQuestions: 0, completedCount: 0 };
    }
  }

  /**
   * Get unanswered questions for a user
   */
  async getUnansweredQuestions(userId: string, episodeId: string): Promise<DiscussionQuestionData[]> {
    try {
      // Sync data first (only if cache expired)
      if (this.shouldSync(episodeId)) {
        await this.repository.syncQuestionsFromRemote(episodeId);
        await this.repository.syncUserResponsesFromRemote(userId, episodeId);
        this.markSynced(episodeId);
      }

      // Get all questions
      const allQuestions = await this.loadQuestionsForEpisode(episodeId);

      // Filter to unanswered
      const unansweredQuestions: DiscussionQuestionData[] = [];
      for (const question of allQuestions) {
        const hasCompleted = await this.repository.hasUserCompletedQuestion(userId, question.id);
        if (!hasCompleted) {
          unansweredQuestions.push(question);
        }
      }

      return unansweredQuestions;
    } catch (error) {
      console.error('Failed to get unanswered questions:', error);
      throw error;
    }
  }
}
