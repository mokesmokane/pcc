import { getRandomValues } from 'expo-crypto';
import type { Database } from '@nozbe/watermelondb';
import { Q } from '@nozbe/watermelondb';
import type { Observable } from '@nozbe/watermelondb/utils/rx';
import { map, switchMap } from 'rxjs/operators';
import { BaseRepository } from './base.repository';
import type DiscussionQuestion from '../models/discussion-question.model';
import type DiscussionOption from '../models/discussion-option.model';
import type UserDiscussionResponse from '../models/user-discussion-response.model';
import { supabase } from '../../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

// Polyfill crypto.getRandomValues for uuid library
if (typeof global.crypto !== 'object') {
  (global as any).crypto = {};
}
if (typeof global.crypto.getRandomValues !== 'function') {
  global.crypto.getRandomValues = getRandomValues as any;
}

export interface DiscussionTopicWithOptions {
  question: DiscussionQuestion;
  options: DiscussionOption[];
}

export class DiscussionRepository extends BaseRepository<DiscussionQuestion> {
  private optionsCollection: any;
  private responsesCollection: any;

  constructor(database: Database) {
    super(database, 'discussion_questions');
    this.optionsCollection = database.get('discussion_options');
    this.responsesCollection = database.get('user_discussion_responses');
  }

  async upsertFromRemote(remoteData: any): Promise<DiscussionQuestion> {
    const existing = await this.findById(remoteData.id);

    const flatData = {
      episode_id: remoteData.episode_id,
      question: remoteData.question,
      question_type: remoteData.question_type,
      order_position: remoteData.order_position,
      image_url: remoteData.image_url || null,
      synced_at: Date.now(),
      needs_sync: false,
    };

    if (existing) {
      return await this.update(remoteData.id, flatData as any);
    } else {
      return await this.create({
        id: remoteData.id,
        ...flatData,
        created_at: new Date(remoteData.created_at).getTime(),
        updated_at: new Date(remoteData.updated_at).getTime(),
      } as any);
    }
  }

  async markForSync(id: string): Promise<void> {
    await this.update(id, { needsSync: true } as any);
  }

  private async upsertOptionFromRemote(remoteData: any): Promise<void> {
    const optionsCollection = this.optionsCollection;

    try {
      await this.database.write(async function upsertDiscussionOptionFromRemote() {
        const existingById = await optionsCollection
          .query(Q.where('id', remoteData.id))
          .fetch();

        if (existingById.length > 0) {
          await existingById[0].update((option: any) => {
            option.questionId = remoteData.question_id;
            option.value = remoteData.value;
            option.label = remoteData.label;
            option.emoji = remoteData.emoji;
            option.imageUrl = remoteData.image_url;
            option.orderPosition = remoteData.order_position;
            option.syncedAt = Date.now();
            option.needsSync = false;
          });
        } else {
          await optionsCollection.create((option: any) => {
            option._raw.id = remoteData.id;
            option._raw.question_id = remoteData.question_id;
            option._raw.value = remoteData.value;
            option._raw.label = remoteData.label;
            option._raw.emoji = remoteData.emoji || null;
            option._raw.image_url = remoteData.image_url || null;
            option._raw.order_position = remoteData.order_position;
            option._raw.created_at = new Date(remoteData.created_at).getTime();
            option._raw.updated_at = new Date(remoteData.updated_at).getTime();
            option._raw.synced_at = Date.now();
            option._raw.needs_sync = false;
          });
        }
      });
    } catch (error: any) {
      // Handle UNIQUE constraint errors gracefully
      if (error?.message?.includes('SQLITE_CONSTRAINT_PRIMARYKEY') ||
          error?.message?.includes('UNIQUE constraint failed')) {
        console.warn(`Option ${remoteData.id} already exists, updating instead`);

        // Query again and update
        const optionsCollection = this.optionsCollection;
        await this.database.write(async function retryUpdateDiscussionOption() {
          const existing = await optionsCollection
            .query(Q.where('id', remoteData.id))
            .fetch();

          if (existing.length > 0) {
            await existing[0].update((option: any) => {
              option.questionId = remoteData.question_id;
              option.value = remoteData.value;
              option.label = remoteData.label;
              option.emoji = remoteData.emoji;
              option.imageUrl = remoteData.image_url;
              option.orderPosition = remoteData.order_position;
              option.syncedAt = Date.now();
              option.needsSync = false;
            });
          }
        });
      } else {
        throw error;
      }
    }
  }

  private async upsertResponseFromRemote(remoteData: any): Promise<void> {
    const responsesCollection = this.responsesCollection;

    try {
      await this.database.write(async function upsertDiscussionResponseFromRemote() {
        // Query for existing record by ID
        const existingById = await responsesCollection
          .query(Q.where('id', remoteData.id))
          .fetch();

        if (existingById.length > 0) {
          // Update existing record
          await existingById[0].update((response: any) => {
            response.userId = remoteData.user_id;
            response.questionId = remoteData.question_id;
            response.optionValue = remoteData.option_value;
            response.responseType = remoteData.response_type;
            response.syncedAt = Date.now();
            response.needsSync = false;
          });
        } else {
          // Create new record
          await responsesCollection.create((response: any) => {
            response._raw.id = remoteData.id;
            response._raw.user_id = remoteData.user_id;
            response._raw.question_id = remoteData.question_id;
            response._raw.option_value = remoteData.option_value;
            response._raw.response_type = remoteData.response_type;
            response._raw.created_at = new Date(remoteData.created_at).getTime();
            response._raw.updated_at = new Date(remoteData.updated_at).getTime();
            response._raw.synced_at = Date.now();
            response._raw.needs_sync = false;
          });
        }
      });
    } catch (error: any) {
      // Handle UNIQUE constraint errors gracefully
      if (error?.message?.includes('SQLITE_CONSTRAINT_PRIMARYKEY') ||
          error?.message?.includes('UNIQUE constraint failed')) {
        console.warn(`Response ${remoteData.id} already exists, updating instead`);

        // Query again and update (record must exist now)
        const responsesCollection = this.responsesCollection;
        await this.database.write(async function retryUpdateDiscussionResponse() {
          const existing = await responsesCollection
            .query(Q.where('id', remoteData.id))
            .fetch();

          if (existing.length > 0) {
            await existing[0].update((response: any) => {
              response.userId = remoteData.user_id;
              response.questionId = remoteData.question_id;
              response.optionValue = remoteData.option_value;
              response.responseType = remoteData.response_type;
              response.syncedAt = Date.now();
              response.needsSync = false;
            });
          }
        });
      } else {
        // Re-throw other errors
        throw error;
      }
    }
  }

  // Get all questions for an episode with their options (one-time fetch)
  async getQuestionsForEpisode(episodeId: string): Promise<DiscussionTopicWithOptions[]> {
    const questions = await this.query([
      Q.where('episode_id', episodeId),
      Q.sortBy('order_position', Q.asc),
    ]);

    const questionsWithOptions = await Promise.all(
      questions.map(async (question) => {
        const options = await this.optionsCollection
          .query(
            Q.where('question_id', question.id),
            Q.sortBy('order_position', Q.asc)
          )
          .fetch();

        return { question, options };
      })
    );

    return questionsWithOptions;
  }

  // REACTIVE: Observe all questions for an episode with their options
  observeQuestionsForEpisode(episodeId: string): Observable<DiscussionTopicWithOptions[]> {
    return this.collection
      .query(
        Q.where('episode_id', episodeId),
        Q.sortBy('order_position', Q.asc)
      )
      .observe()
      .pipe(
        switchMap(async (questions: DiscussionQuestion[]) => {
          // For each question, fetch its options
          const questionsWithOptions = await Promise.all(
            questions.map(async (question) => {
              const options = await this.optionsCollection
                .query(
                  Q.where('question_id', question.id),
                  Q.sortBy('order_position', Q.asc)
                )
                .fetch();

              return { question, options };
            })
          );

          return questionsWithOptions;
        })
      );
  }

  // Save user response locally only (returns response ID for batch sync)
  async saveResponseLocal(
    userId: string,
    questionId: string,
    optionValue: number,
    responseType: 'agree' | 'disagree'
  ): Promise<string> {
    console.log('saveResponseLocal - Saving locally:', { userId, questionId, optionValue, responseType });

    let responseId: string | null = null;
    const responsesCollection = this.responsesCollection;

    await this.database.write(async function saveDiscussionResponseLocally() {
      // Check if response already exists
      const existing = await responsesCollection
        .query(
          Q.where('user_id', userId),
          Q.where('question_id', questionId),
          Q.where('option_value', optionValue)
        )
        .fetch();

      if (existing.length > 0) {
        console.log('saveResponseLocal - Updating existing response');
        responseId = existing[0].id;
        // Update existing response
        await existing[0].update((response: any) => {
          response.responseType = responseType;
          response.updatedAt = Date.now();
          response.needsSync = true;
        });
      } else {
        // Create new response with UUID
        responseId = uuidv4();
        console.log('saveResponseLocal - Creating new response with ID:', responseId);
        await responsesCollection.create((response: any) => {
          response._raw.id = responseId;
          response._raw.user_id = userId;
          response._raw.question_id = questionId;
          response._raw.option_value = optionValue;
          response._raw.response_type = responseType;
          response._raw.created_at = Date.now();
          response._raw.updated_at = Date.now();
          response._raw.needs_sync = true;
        });
        console.log('saveResponseLocal - Response created locally');
      }
    });

    return responseId!;
  }

  // Save user response (with immediate sync for single-save operations)
  async saveResponse(
    userId: string,
    questionId: string,
    optionValue: number,
    responseType: 'agree' | 'disagree'
  ): Promise<void> {
    const responseId = await this.saveResponseLocal(userId, questionId, optionValue, responseType);

    // Immediately sync this specific response to Supabase
    console.log('saveResponse - Syncing to Supabase immediately');
    await this.syncSingleResponse(responseId);
  }

  // Get user's responses for a question (one-time fetch)
  async getUserResponses(
    userId: string,
    questionId: string
  ): Promise<{ agreed: number[]; disagreed: number[] }> {
    const responses = await this.responsesCollection
      .query(Q.where('user_id', userId), Q.where('question_id', questionId))
      .fetch();

    return {
      agreed: responses.filter((r: any) => r.responseType === 'agree').map((r: any) => r.optionValue),
      disagreed: responses
        .filter((r: any) => r.responseType === 'disagree')
        .map((r: any) => r.optionValue),
    };
  }

  // REACTIVE: Observe user's responses for all questions in an episode
  observeUserResponsesForEpisode(
    userId: string,
    episodeId: string
  ): Observable<Record<string, { agreed: number[]; disagreed: number[] }>> {
    // Observe questions for this episode, then switch to observing responses
    return this.collection
      .query(Q.where('episode_id', episodeId))
      .observeWithColumns(['id'])
      .pipe(
        switchMap((questions: any[]) => {
          const questionIds = questions.map(q => q.id);

          // If no questions, return empty map
          if (questionIds.length === 0) {
            // Return a static observable with empty map
            return new (require('rxjs').BehaviorSubject)({});
          }

          // Observe all responses for this user and these questions
          return this.responsesCollection
            .query(
              Q.where('user_id', userId),
              Q.where('question_id', Q.oneOf(questionIds))
            )
            .observe()
            .pipe(
              map((responses: any[]) => {
                // Group responses by question ID
                const responsesMap: Record<string, { agreed: number[]; disagreed: number[] }> = {};

                // Initialize all questions with empty arrays
                for (const qId of questionIds) {
                  responsesMap[qId] = { agreed: [], disagreed: [] };
                }

                // Fill in actual responses
                for (const response of responses) {
                  if (response.responseType === 'agree') {
                    responsesMap[response.questionId].agreed.push(response.optionValue);
                  } else {
                    responsesMap[response.questionId].disagreed.push(response.optionValue);
                  }
                }

                return responsesMap;
              })
            );
        })
      );
  }

  // Clear user's responses for a question
  async clearUserResponses(userId: string, questionId: string): Promise<void> {
    console.log('clearUserResponses - Clearing responses for:', { userId, questionId });

    const responsesCollection = this.responsesCollection;

    await this.database.write(async function clearUserDiscussionResponses() {
      const responses = await responsesCollection
        .query(Q.where('user_id', userId), Q.where('question_id', questionId))
        .fetch();

      console.log('clearUserResponses - Found responses to delete:', responses.length);

      // Delete from Supabase first
      for (const response of responses) {
        try {
          const { error } = await supabase
            .from('user_discussion_responses')
            .delete()
            .eq('id', response.id);

          if (error) {
            console.error('clearUserResponses - Failed to delete from Supabase:', error);
          }
        } catch (err) {
          console.error('clearUserResponses - Error deleting response:', err);
        }

        // Then delete locally
        await response.markAsDeleted();
      }

      console.log('clearUserResponses - Responses cleared successfully');
    });
  }

  // Check if user has completed a question (responded to all options)
  async hasUserCompletedQuestion(userId: string, questionId: string): Promise<boolean> {
    const options = await this.optionsCollection.query(Q.where('question_id', questionId)).fetch();

    const responses = await this.responsesCollection
      .query(Q.where('user_id', userId), Q.where('question_id', questionId))
      .fetch();

    return responses.length === options.length;
  }

  // Get response statistics for a question
  async getQuestionStats(questionId: string): Promise<
    Array<{
      optionValue: number;
      agreeCount: number;
      disagreeCount: number;
      agreePercentage: number;
      disagreePercentage: number;
    }>
  > {
    const options = await this.optionsCollection
      .query(Q.where('question_id', questionId), Q.sortBy('order_position', Q.asc))
      .fetch();

    const allResponses = await this.responsesCollection
      .query(Q.where('question_id', questionId))
      .fetch();

    const totalUsers = new Set(allResponses.map((r: any) => r.userId)).size;

    const stats = options.map((option: any) => {
      const optionResponses = allResponses.filter((r: any) => r.optionValue === option.value);
      const agreeCount = optionResponses.filter((r: any) => r.responseType === 'agree').length;
      const disagreeCount = optionResponses.filter((r: any) => r.responseType === 'disagree').length;

      return {
        optionValue: option.value,
        agreeCount,
        disagreeCount,
        agreePercentage: totalUsers > 0 ? (agreeCount / totalUsers) * 100 : 0,
        disagreePercentage: totalUsers > 0 ? (disagreeCount / totalUsers) * 100 : 0,
      };
    });

    return stats;
  }

  // Sync questions and options from remote
  async syncQuestionsFromRemote(episodeId: string): Promise<void> {
    try {
      const { data: questions, error: questionsError } = await supabase
        .from('discussion_questions')
        .select(
          `
          *,
          discussion_options (*)
        `
        )
        .eq('episode_id', episodeId)
        .order('order_position');

      if (questionsError) {
        console.error('Error syncing discussion questions:', questionsError);
        throw questionsError;
      }

      if (!questions || questions.length === 0) {
        // No questions found - this is normal, no need to log
        return;
      }

      for (const remoteQuestion of questions) {
        await this.upsertFromRemote(remoteQuestion);

        // Upsert options
        if (remoteQuestion.discussion_options) {
          for (const remoteOption of remoteQuestion.discussion_options) {
            await this.upsertOptionFromRemote(remoteOption);
          }
        }
      }
    } catch (error) {
      console.error('Failed to sync discussion questions:', error);
      throw error;
    }
  }

  // Sync a single response immediately to remote (for real-time sync)
  async syncSingleResponse(responseId: string): Promise<void> {
    try {
      console.log('syncSingleResponse - Syncing response:', responseId);

      const responses = await this.responsesCollection
        .query(Q.where('id', responseId))
        .fetch();

      if (responses.length === 0) {
        console.warn('syncSingleResponse - Response not found:', responseId);
        return;
      }

      const response = responses[0];

      console.log('syncSingleResponse - Upserting to Supabase:', {
        id: response.id,
        user_id: response.userId,
        question_id: response.questionId,
        option_value: response.optionValue,
        response_type: response.responseType,
      });

      const { data, error } = await supabase.from('user_discussion_responses').upsert({
        id: response.id,
        user_id: response.userId,
        question_id: response.questionId,
        option_value: response.optionValue,
        response_type: response.responseType,
        created_at: new Date(response.createdAt).toISOString(),
        updated_at: new Date(response.updatedAt).toISOString(),
      }).select();

      if (!error) {
        console.log('syncSingleResponse - Successfully synced to Supabase:', data);
        await this.database.write(async function markSingleDiscussionResponseAsSynced() {
          await response.update((r: any) => {
            r.needsSync = false;
            r.syncedAt = Date.now();
          });
        });
        console.log('syncSingleResponse - Marked response as synced');
      } else {
        console.error('syncSingleResponse - Failed to sync response:', error);
        throw error; // Propagate error so mutation can handle it
      }
    } catch (error) {
      console.error('syncSingleResponse - Error during sync:', error);
      throw error; // Propagate error so mutation can handle it
    }
  }

  // Sync multiple responses in batch (for efficient bulk operations)
  async syncMultipleResponses(responseIds: string[]): Promise<void> {
    try {
      console.log('syncMultipleResponses - Syncing', responseIds.length, 'responses');

      if (responseIds.length === 0) {
        return;
      }

      // Fetch all responses from local DB
      const responses = await this.responsesCollection
        .query(Q.where('id', Q.oneOf(responseIds)))
        .fetch();

      console.log('syncMultipleResponses - Found', responses.length, 'responses to sync');

      if (responses.length === 0) {
        console.warn('syncMultipleResponses - No responses found');
        return;
      }

      // Prepare batch upsert data
      const upsertData = responses.map((response: any) => ({
        id: response.id,
        user_id: response.userId,
        question_id: response.questionId,
        option_value: response.optionValue,
        response_type: response.responseType,
        created_at: new Date(response.createdAt).toISOString(),
        updated_at: new Date(response.updatedAt).toISOString(),
      }));

      console.log('syncMultipleResponses - Batch upserting to Supabase:', upsertData);

      // Batch upsert to Supabase
      const { data, error } = await supabase
        .from('user_discussion_responses')
        .upsert(upsertData)
        .select();

      if (!error) {
        console.log('syncMultipleResponses - Successfully synced', data?.length || 0, 'responses to Supabase');

        // Mark all as synced in local DB
        await this.database.write(async function markMultipleDiscussionResponsesAsSynced() {
          for (const response of responses) {
            await response.update((r: any) => {
              r.needsSync = false;
              r.syncedAt = Date.now();
            });
          }
        });
        console.log('syncMultipleResponses - Marked all responses as synced');
      } else {
        console.error('syncMultipleResponses - Failed to batch sync responses:', error);
        throw error; // Propagate error so mutation can handle it
      }
    } catch (error) {
      console.error('syncMultipleResponses - Error during batch sync:', error);
      throw error; // Propagate error so mutation can handle it
    }
  }

  // Sync user responses to remote (batch sync)
  async syncUserResponses(userId: string): Promise<void> {
    try {
      console.log('syncUserResponses - Starting sync for user:', userId);

      const needsSync = await this.responsesCollection
        .query(Q.where('user_id', userId), Q.where('needs_sync', true))
        .fetch();

      console.log('syncUserResponses - Found responses needing sync:', needsSync.length);

      for (const response of needsSync) {
        console.log('syncUserResponses - Syncing response:', {
          id: response.id,
          user_id: response.userId,
          question_id: response.questionId,
          option_value: response.optionValue,
          response_type: response.responseType,
        });

        const { data, error } = await supabase.from('user_discussion_responses').upsert({
          id: response.id,
          user_id: response.userId,
          question_id: response.questionId,
          option_value: response.optionValue,
          response_type: response.responseType,
          created_at: new Date(response.createdAt).toISOString(),
          updated_at: new Date(response.updatedAt).toISOString(),
        }).select();

        if (!error) {
          console.log('syncUserResponses - Successfully synced response to Supabase:', data);
          await this.database.write(async function markUserDiscussionResponseAsSynced() {
            await response.update((r: any) => {
              r.needsSync = false;
              r.syncedAt = Date.now();
            });
          });
          console.log('syncUserResponses - Marked response as synced');
        } else {
          console.error('syncUserResponses - Failed to sync response:', error);
        }
      }

      console.log('syncUserResponses - Sync complete');
    } catch (error) {
      console.error('syncUserResponses - Error during sync:', error);
    }
  }

  // Sync user responses from remote
  async syncUserResponsesFromRemote(userId: string, episodeId: string): Promise<void> {
    try {
      // Get all question IDs for this episode
      const questions = await this.query([Q.where('episode_id', episodeId)]);
      const questionIds = questions.map((q) => q.id);

      if (questionIds.length === 0) {
        return;
      }

      // Fetch user's responses from remote
      const { data: remoteResponses, error } = await supabase
        .from('user_discussion_responses')
        .select('*')
        .eq('user_id', userId)
        .in('question_id', questionIds);

      if (error) {
        console.error('Error syncing user responses:', error);
        throw error;
      }

      if (!remoteResponses || remoteResponses.length === 0) {
        return;
      }

      for (const remoteResponse of remoteResponses) {
        await this.upsertResponseFromRemote(remoteResponse);
      }

      console.log(`Synced ${remoteResponses.length} user responses`);
    } catch (error) {
      console.error('Failed to sync user responses from remote:', error);
    }
  }

  async pushLocalChanges(): Promise<void> {
    // Sync questions
    const needsSyncQuestions = await this.query([Q.where('needs_sync', true)]);

    for (const question of needsSyncQuestions) {
      try {
        const { error } = await supabase.from('discussion_questions').upsert({
          id: question.id,
          episode_id: question.episodeId,
          question: question.question,
          question_type: question.questionType,
          order_position: question.orderPosition,
          image_url: question.imageUrl,
          created_at: new Date(question.createdAt).toISOString(),
          updated_at: new Date(question.updatedAt).toISOString(),
        });

        if (!error) {
          await this.update(question.id, {
            needsSync: false,
            syncedAt: Date.now(),
          } as any);
        }
      } catch (error) {
        console.error(`Failed to sync question ${question.id}:`, error);
      }
    }

    // Sync options
    const needsSyncOptions = await this.optionsCollection
      .query(Q.where('needs_sync', true))
      .fetch();

    for (const option of needsSyncOptions) {
      try {
        const { error } = await supabase.from('discussion_options').upsert({
          id: option.id,
          question_id: option.questionId,
          value: option.value,
          label: option.label,
          emoji: option.emoji,
          image_url: option.imageUrl,
          order_position: option.orderPosition,
          created_at: new Date(option.createdAt).toISOString(),
          updated_at: new Date(option.updatedAt).toISOString(),
        });

        if (!error) {
          await this.database.write(async function markDiscussionOptionAsSynced() {
            await option.update((o: any) => {
              o.needsSync = false;
              o.syncedAt = Date.now();
            });
          });
        }
      } catch (error) {
        console.error(`Failed to sync option ${option.id}:`, error);
      }
    }

    // Sync responses
    const needsSyncResponses = await this.responsesCollection
      .query(Q.where('needs_sync', true))
      .fetch();

    for (const response of needsSyncResponses) {
      try {
        const { error } = await supabase.from('user_discussion_responses').upsert({
          id: response.id,
          user_id: response.userId,
          question_id: response.questionId,
          option_value: response.optionValue,
          response_type: response.responseType,
          created_at: new Date(response.createdAt).toISOString(),
          updated_at: new Date(response.updatedAt).toISOString(),
        });

        if (!error) {
          await this.database.write(async function markPushedDiscussionResponseAsSynced() {
            await response.update((r: any) => {
              r.needsSync = false;
              r.syncedAt = Date.now();
            });
          });
        }
      } catch (error) {
        console.error(`Failed to sync response ${response.id}:`, error);
      }
    }
  }

  // Override to use snake_case fields
  protected prepareCreate(data: any): any {
    return {
      ...data,
      created_at: data.created_at || Date.now(),
      updated_at: data.updated_at || Date.now(),
    };
  }

  protected prepareUpdate(data: any): any {
    return {
      ...data,
      updated_at: Date.now(),
    };
  }
}

export const createDiscussionRepository = (database: Database) => {
  return new DiscussionRepository(database);
};
