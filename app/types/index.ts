// Core domain types - keep these abstract from DB implementation

export interface Entity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface SyncableEntity extends Entity {
  localId?: string;
  serverId?: string;
  lastSyncedAt?: Date;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
}

export interface User {
  id: string;
  email: string;
  username?: string;
  avatarUrl?: string;
}

// Outbox pattern for offline-first mutations
export interface OutboxItem {
  id: string;
  type: string;
  payload: Record<string, any>;
  operationId: string; // For idempotency
  createdAt: Date;
  retryCount: number;
  status: 'pending' | 'sending' | 'error';
  errorMessage?: string;
}

// Sync metadata
export interface SyncState {
  scope: string;
  lastToken?: string;
  lastSyncedAt?: Date;
  updatedAt: Date;
}

// Change feed from server
export interface Change<T = any> {
  table: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record: T;
  timestamp: string;
  version: number;
}

export interface ChangeSet {
  changes: Change[];
  nextToken: string;
  hasMore: boolean;
}

// Conflict resolution strategies
export type ConflictStrategy =
  | 'server-wins'
  | 'client-wins'
  | 'latest-timestamp'
  | 'max-value'
  | 'custom';

export interface ConflictRule {
  table: string;
  field?: string;
  strategy: ConflictStrategy;
  resolver?: (local: any, remote: any) => any;
}