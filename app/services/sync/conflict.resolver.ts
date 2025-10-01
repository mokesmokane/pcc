import { ConflictStrategy, ConflictRule } from '../../types';

export class ConflictResolver {
  private rules: Map<string, ConflictRule[]> = new Map();

  constructor() {
    this.setupDefaultRules();
  }

  private setupDefaultRules(): void {
    // Podcast/Episode catalog - server wins
    this.addRule({
      table: 'podcasts',
      strategy: 'server-wins'
    });
    this.addRule({
      table: 'episodes',
      strategy: 'server-wins'
    });

    // Playback progress - max value with timestamp check
    this.addRule({
      table: 'playback_progress',
      field: 'position_ms',
      strategy: 'custom',
      resolver: (local: any, remote: any) => {
        const timeDiff = Math.abs(local.updated_at - remote.updated_at);

        // If updates are within 5 minutes, take the max position
        if (timeDiff < 5 * 60 * 1000) {
          return {
            ...remote,
            position_ms: Math.max(local.position_ms, remote.position_ms),
            updated_at: Math.max(local.updated_at, remote.updated_at)
          };
        }

        // Otherwise, latest timestamp wins
        return local.updated_at > remote.updated_at ? local : remote;
      }
    });

    // Comments - append-only, no conflicts
    this.addRule({
      table: 'comments',
      strategy: 'server-wins'
    });

    // Reactions/likes - idempotent operations
    this.addRule({
      table: 'reactions',
      strategy: 'server-wins'
    });

    // Playlists - latest timestamp
    this.addRule({
      table: 'playlists',
      strategy: 'latest-timestamp'
    });

    // Playlist items - operation-based, idempotent
    this.addRule({
      table: 'playlist_items',
      strategy: 'server-wins'
    });

    // Downloads - local only, no conflict
    this.addRule({
      table: 'downloads',
      strategy: 'client-wins'
    });
  }

  addRule(rule: ConflictRule): void {
    const tableRules = this.rules.get(rule.table) || [];
    tableRules.push(rule);
    this.rules.set(rule.table, tableRules);
  }

  async resolve(table: string, local: any, remote: any): Promise<any> {
    const tableRules = this.rules.get(table) || [];

    // Apply rules in order
    for (const rule of tableRules) {
      if (rule.field && local[rule.field] === remote[rule.field]) {
        continue; // No conflict for this field
      }

      switch (rule.strategy) {
        case 'server-wins':
          return remote;

        case 'client-wins':
          return local;

        case 'latest-timestamp':
          return local.updated_at > remote.updated_at ? local : remote;

        case 'max-value':
          if (rule.field) {
            return {
              ...remote,
              [rule.field]: Math.max(local[rule.field], remote[rule.field])
            };
          }
          return remote;

        case 'custom':
          if (rule.resolver) {
            return rule.resolver(local, remote);
          }
          return remote;

        default:
          return remote;
      }
    }

    // Default: server wins
    return remote;
  }

  // Check if a conflict exists
  hasConflict(table: string, local: any, remote: any): boolean {
    // Simple version check
    if (local.version && remote.version) {
      return local.version !== remote.version;
    }

    // Timestamp check
    if (local.updated_at && remote.updated_at) {
      return local.updated_at !== remote.updated_at;
    }

    return false;
  }
}