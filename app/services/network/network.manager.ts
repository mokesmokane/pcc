import type { SupabaseService } from '../supabase/supabase.client';
import type { Change, ChangeSet, OutboxItem } from '../../types';

export interface PushResult {
  success: boolean;
  record?: any;
  error?: string;
}

export class NetworkManager {
  constructor(private supabase: SupabaseService) {}

  // Pull changes from server
  async pullChanges(lastToken?: string): Promise<ChangeSet> {
    try {
      // In a real app, this would be a custom endpoint
      // For now, we'll simulate with Supabase queries
      const changes: Change[] = [];

      // Fetch recent updates from each table
      const tables = ['podcasts', 'episodes', 'comments'];

      for (const table of tables) {
        const query = this.supabase.getClient()
          .from(table)
          .select('*');

        // If we have a token (timestamp), only get newer items
        if (lastToken) {
          query.gt('updated_at', lastToken);
        }

        query.order('updated_at', { ascending: true }).limit(100);

        const { data, error } = await query;

        if (!error && data) {
          for (const record of data) {
            changes.push({
              table,
              operation: 'UPDATE',
              record,
              timestamp: record.updated_at,
              version: record.version || 1,
            });
          }
        }
      }

      // Generate next token (latest timestamp)
      const nextToken = changes.length > 0
        ? changes[changes.length - 1].timestamp
        : lastToken || new Date().toISOString();

      return {
        changes,
        nextToken,
        hasMore: changes.length === 100,
      };
    } catch (error) {
      console.error('Failed to pull changes:', error);
      throw error;
    }
  }

  // Push changes to server
  async pushChanges(items: OutboxItem[]): Promise<PushResult[]> {
    const results: PushResult[] = [];

    for (const item of items) {
      try {
        const result = await this.pushSingleChange(item);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  private async pushSingleChange(item: OutboxItem): Promise<PushResult> {
    try {
      // Route based on mutation type
      switch (item.type) {
        case 'REACTION_ADD':
          return await this.pushReaction(item);

        case 'COMMENT_CREATE':
          return await this.pushComment(item);

        case 'PLAYLIST_ADD':
          return await this.pushPlaylistItem(item);

        case 'PROGRESS_UPDATE':
          return await this.pushProgress(item);

        default:
          return {
            success: false,
            error: `Unknown mutation type: ${item.type}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async pushReaction(item: OutboxItem): Promise<PushResult> {
    const { data, error } = await this.supabase.getClient()
      .from('reactions')
      .upsert({
        ...item.payload,
        operation_id: item.operationId,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, record: data };
  }

  private async pushComment(item: OutboxItem): Promise<PushResult> {
    const { data, error } = await this.supabase.getClient()
      .from('comments')
      .insert({
        ...item.payload,
        operation_id: item.operationId,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, record: data };
  }

  private async pushPlaylistItem(item: OutboxItem): Promise<PushResult> {
    const { data, error } = await this.supabase.getClient()
      .from('playlist_items')
      .upsert({
        ...item.payload,
        operation_id: item.operationId,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, record: data };
  }

  private async pushProgress(item: OutboxItem): Promise<PushResult> {
    const { data, error } = await this.supabase.getClient()
      .from('playback_progress')
      .upsert({
        ...item.payload,
        operation_id: item.operationId,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, record: data };
  }

  // Subscribe to realtime changes
  async subscribeToChanges(
    callback: (change: Change) => void
  ): Promise<{ unsubscribe: () => void }> {
    const channels: any[] = [];

    // Subscribe to each table
    const tables = ['podcasts', 'episodes', 'comments', 'reactions', 'playlists'];

    for (const table of tables) {
      const channel = this.supabase.subscribeToTable(
        table,
        (payload) => {
          const change: Change = {
            table,
            operation: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            record: payload.new || payload.old,
            timestamp: new Date().toISOString(),
            version: payload.new?.version || 1,
          };
          callback(change);
        },
        { event: '*' }
      );
      channels.push(channel);
    }

    return {
      unsubscribe: () => {
        channels.forEach(channel => channel.unsubscribe());
      },
    };
  }

  // Check connectivity
  async isOnline(): Promise<boolean> {
    try {
      // Try a lightweight query
      const { error } = await this.supabase.getClient()
        .from('podcasts')
        .select('id')
        .limit(1);

      return !error;
    } catch {
      return false;
    }
  }
}