import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export class SupabaseService {
  private client: SupabaseClient;
  private realtimeChannels: Map<string, RealtimeChannel> = new Map();

  constructor(config: SupabaseConfig) {
    this.client = createClient(config.url, config.anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }

  // Get the raw client for direct access
  getClient(): SupabaseClient {
    return this.client;
  }

  // Auth methods
  async signIn(email: string, password: string) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }

  // async signUp(email: string, password: string) {
  //   const { data, error } = await this.client.auth.signUp({
  //     email,
  //     password,
  //   });

  //   if (error) throw error;
  //   return data;
  // }

  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  async getSession() {
    const { data } = await this.client.auth.getSession();
    return data.session;
  }

  async getUser() {
    const { data } = await this.client.auth.getUser();
    return data.user;
  }

  // Subscribe to auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.client.auth.onAuthStateChange(callback);
  }

  // Database operations
  async query<T>(table: string, options?: any): Promise<T[]> {
    const query = this.client.from(table).select(options?.select || '*');

    // Apply filters if provided
    if (options?.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        query.eq(key, value);
      }
    }

    // Apply ordering
    if (options?.orderBy) {
      query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? true,
      });
    }

    // Apply pagination
    if (options?.limit) {
      query.limit(options.limit);
    }
    if (options?.offset) {
      query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as T[];
  }

  async insert<T>(table: string, data: any): Promise<T> {
    const { data: inserted, error } = await this.client
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return inserted as T;
  }

  async update<T>(table: string, id: string, data: any): Promise<T> {
    const { data: updated, error } = await this.client
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated as T;
  }

  async upsert<T>(table: string, data: any): Promise<T> {
    const { data: upserted, error } = await this.client
      .from(table)
      .upsert(data)
      .select()
      .single();

    if (error) throw error;
    return upserted as T;
  }

  async delete(table: string, id: string): Promise<void> {
    const { error } = await this.client.from(table).delete().eq('id', id);
    if (error) throw error;
  }

  // Batch operations
  async batchInsert<T>(table: string, items: any[]): Promise<T[]> {
    const { data, error } = await this.client
      .from(table)
      .insert(items)
      .select();

    if (error) throw error;
    return data as T[];
  }

  async batchUpsert<T>(table: string, items: any[]): Promise<T[]> {
    const { data, error } = await this.client
      .from(table)
      .upsert(items)
      .select();

    if (error) throw error;
    return data as T[];
  }

  // Realtime subscriptions
  subscribeToTable(
    table: string,
    callback: (payload: any) => void,
    options?: {
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      filter?: string;
    }
  ): RealtimeChannel {
    const channel = this.client.channel(`db-${table}`);

    const event = options?.event || '*';
    const filter = options?.filter;

    channel.on(
      'postgres_changes',
      {
        event,
        schema: 'public',
        table,
        filter,
      },
      callback
    );

    channel.subscribe();

    // Store channel for cleanup
    this.realtimeChannels.set(`${table}-${event}`, channel);

    return channel;
  }

  // Unsubscribe from a table
  unsubscribeFromTable(table: string, event: string = '*'): void {
    const key = `${table}-${event}`;
    const channel = this.realtimeChannels.get(key);

    if (channel) {
      channel.unsubscribe();
      this.realtimeChannels.delete(key);
    }
  }

  // Storage operations
  async uploadFile(bucket: string, path: string, file: File | Blob) {
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, file);

    if (error) throw error;
    return data;
  }

  async downloadFile(bucket: string, path: string) {
    const { data, error } = await this.client.storage
      .from(bucket)
      .download(path);

    if (error) throw error;
    return data;
  }

  getFileUrl(bucket: string, path: string): string {
    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  // Clean up
  dispose(): void {
    // Unsubscribe from all realtime channels
    for (const channel of this.realtimeChannels.values()) {
      channel.unsubscribe();
    }
    this.realtimeChannels.clear();
  }
}