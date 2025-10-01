import { Database } from '@nozbe/watermelondb';
import { ChangeSet, Change, OutboxItem, SyncState } from '../../types';
// import { OutboxRepository } from '../../data/repositories/outbox.repository';
// import { SyncStateRepository } from '../../data/repositories/sync-state.repository';
import { ConflictResolver } from './conflict.resolver';
import { NetworkManager } from '../network/network.manager';

export interface SyncEngineConfig {
  database: Database;
  networkManager: NetworkManager;
  syncInterval?: number;
  batchSize?: number;
  maxRetries?: number;
  enableRealtime?: boolean;
}

export class SyncEngine {
  private isPulling = false;
  private isPushing = false;
  private syncInterval?: NodeJS.Timeout;
  private realtimeSubscription?: any;

  private outboxRepo: OutboxRepository;
  private syncStateRepo: SyncStateRepository;
  private conflictResolver: ConflictResolver;

  constructor(private config: SyncEngineConfig) {
    this.outboxRepo = new OutboxRepository(config.database);
    this.syncStateRepo = new SyncStateRepository(config.database);
    this.conflictResolver = new ConflictResolver();
  }

  // Initialize sync engine
  async initialize(): Promise<void> {
    // Start periodic sync
    if (this.config.syncInterval) {
      this.startPeriodicSync();
    }

    // Subscribe to realtime changes if enabled
    if (this.config.enableRealtime) {
      await this.subscribeToRealtime();
    }

    // Do initial sync
    await this.sync();
  }

  // Main sync orchestrator
  async sync(): Promise<void> {
    await Promise.all([
      this.pullChanges(),
      this.pushChanges()
    ]);
  }

  // Pull changes from server
  private async pullChanges(): Promise<void> {
    if (this.isPulling) return;
    this.isPulling = true;

    try {
      // Get last sync token
      const syncState = await this.syncStateRepo.getSyncState('main');
      const lastToken = syncState?.lastToken;

      // Fetch changes from server
      const changeSet = await this.config.networkManager.pullChanges(lastToken);

      if (changeSet.changes.length === 0) {
        return;
      }

      // Apply changes in a transaction
      await this.config.database.write(async () => {
        for (const change of changeSet.changes) {
          await this.applyChange(change);
        }

        // Update sync token
        await this.syncStateRepo.updateSyncState('main', {
          lastToken: changeSet.nextToken,
          lastSyncedAt: new Date()
        });
      });

      // If there are more changes, continue pulling
      if (changeSet.hasMore) {
        await this.pullChanges();
      }
    } catch (error) {
      console.error('Pull failed:', error);
      throw error;
    } finally {
      this.isPulling = false;
    }
  }

  // Push local changes to server
  private async pushChanges(): Promise<void> {
    if (this.isPushing) return;
    this.isPushing = true;

    try {
      // Get pending outbox items
      const pendingItems = await this.outboxRepo.getPendingItems(
        this.config.batchSize || 10
      );

      if (pendingItems.length === 0) {
        return;
      }

      // Mark items as sending
      await this.outboxRepo.markAsSending(pendingItems.map(i => i.id));

      try {
        // Send batch to server
        const results = await this.config.networkManager.pushChanges(pendingItems);

        // Process results
        await this.config.database.write(async () => {
          for (let i = 0; i < results.length; i++) {
            const item = pendingItems[i];
            const result = results[i];

            if (result.success) {
              // Remove from outbox
              await this.outboxRepo.remove(item.id);

              // Apply server response (authoritative version)
              if (result.record) {
                await this.applyServerResponse(item.type, result.record);
              }
            } else {
              // Handle error
              await this.outboxRepo.markAsError(
                item.id,
                result.error || 'Unknown error'
              );
            }
          }
        });

        // Continue if there are more items
        const hasMore = await this.outboxRepo.hasPendingItems();
        if (hasMore) {
          await this.pushChanges();
        }
      } catch (error) {
        // Mark all as error
        await this.outboxRepo.markAsError(
          pendingItems.map(i => i.id),
          error instanceof Error ? error.message : 'Network error'
        );
        throw error;
      }
    } catch (error) {
      console.error('Push failed:', error);
      throw error;
    } finally {
      this.isPushing = false;
    }
  }

  // Apply a change from the server
  private async applyChange(change: Change): Promise<void> {
    const collection = this.config.database.get(change.table);

    switch (change.operation) {
      case 'INSERT':
      case 'UPDATE':
        // Check for conflicts
        const existingRecord = await collection
          .find(change.record.id)
          .catch(() => null);

        if (existingRecord) {
          // Resolve conflict
          const resolved = await this.conflictResolver.resolve(
            change.table,
            existingRecord._raw,
            change.record
          );

          await existingRecord.update((record: any) => {
            Object.assign(record._raw, resolved);
          });
        } else {
          // Create new record
          await collection.create((record: any) => {
            Object.assign(record._raw, change.record);
          });
        }
        break;

      case 'DELETE':
        const recordToDelete = await collection
          .find(change.record.id)
          .catch(() => null);

        if (recordToDelete) {
          await recordToDelete.markAsDeleted();
        }
        break;
    }
  }

  // Apply server response after successful push
  private async applyServerResponse(type: string, serverRecord: any): Promise<void> {
    // Map outbox type to table
    const table = this.mapTypeToTable(type);
    if (!table) return;

    const collection = this.config.database.get(table);
    const record = await collection.find(serverRecord.id).catch(() => null);

    if (record) {
      await record.update((r: any) => {
        // Update with server's authoritative version
        Object.assign(r._raw, {
          ...serverRecord,
          sync_status: 'synced',
          last_synced_at: Date.now()
        });
      });
    }
  }

  // Subscribe to realtime changes
  private async subscribeToRealtime(): Promise<void> {
    this.realtimeSubscription = await this.config.networkManager.subscribeToChanges(
      async (change: Change) => {
        // Apply change immediately
        await this.config.database.write(async () => {
          await this.applyChange(change);
        });
      }
    );
  }

  // Start periodic sync
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(
      () => this.sync(),
      this.config.syncInterval || 30000
    );
  }

  // Stop sync engine
  async stop(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    if (this.realtimeSubscription) {
      await this.realtimeSubscription.unsubscribe();
    }
  }

  // Utility: map outbox type to table name
  private mapTypeToTable(type: string): string | null {
    const mapping: Record<string, string> = {
      'EPISODE_LIKE': 'reactions',
      'COMMENT_CREATE': 'comments',
      'PLAYLIST_ADD': 'playlist_items',
      'PROGRESS_UPDATE': 'playback_progress',
      // Add more mappings as needed
    };
    return mapping[type] || null;
  }
}