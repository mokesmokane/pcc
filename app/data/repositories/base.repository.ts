import { Observable } from '@nozbe/watermelondb/utils/rx';
import type { Collection, Database, Model } from '@nozbe/watermelondb';

// Base repository interface - all repos follow this pattern
export interface IRepository<T extends Model> {
  // Read operations - always from local DB
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  query(conditions: any): Promise<T[]>;

  // Live queries - reactive subscriptions
  observeById(id: string): Observable<T | null>;
  observeAll(): Observable<T[]>;
  observeQuery(conditions: any): Observable<T[]>;

  // Write operations - write local first, then sync
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;

  // Batch operations
  batchCreate(items: Partial<T>[]): Promise<T[]>;
  batchUpdate(updates: { id: string; data: Partial<T> }[]): Promise<T[]>;
  batchDelete(ids: string[]): Promise<void>;

  // Sync operations
  upsertFromRemote(remoteData: any): Promise<T>;
  markForSync(id: string): Promise<void>;
}

// Base implementation that other repos extend
export abstract class BaseRepository<T extends Model> implements IRepository<T> {
  protected collection: Collection<T>;

  constructor(
    protected database: Database,
    protected tableName: string
  ) {
    this.collection = database.get<T>(tableName);
  }

  async findById(id: string): Promise<T | null> {
    try {
      return await this.collection.find(id);
    } catch {
      return null;
    }
  }

  async findAll(): Promise<T[]> {
    return await this.collection.query().fetch();
  }

  async query(conditions: any): Promise<T[]> {
    return await this.collection.query(...conditions).fetch();
  }

  observeById(id: string): Observable<T | null> {
    return new Observable(observer => {
      this.collection.find(id)
        .then(model => model.observe())
        .then(subscription => subscription.subscribe(observer))
        .catch(() => observer.next(null));
      return () => {};
    });
  }

  observeAll(): Observable<T[]> {
    return this.collection.query().observe();
  }

  observeQuery(conditions: any): Observable<T[]> {
    return this.collection.query(...conditions).observe();
  }

  async create(data: Partial<T>): Promise<T> {
    const collection = this.collection;
    const prepareCreate = this.prepareCreate.bind(this);

    return await this.database.write(async function baseRepositoryCreate() {
      return await collection.create((record: any) => {
        Object.assign(record._raw, prepareCreate(data));
      });
    });
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const collection = this.collection;
    const prepareUpdate = this.prepareUpdate.bind(this);

    return await this.database.write(async function baseRepositoryUpdate() {
      const record = await collection.find(id);
      return await record.update((r: any) => {
        Object.assign(r._raw, prepareUpdate(data));
      });
    });
  }

  async delete(id: string): Promise<void> {
    const collection = this.collection;

    await this.database.write(async function baseRepositoryDelete() {
      const record = await collection.find(id);
      await record.markAsDeleted();
    });
  }

  async batchCreate(items: Partial<T>[]): Promise<T[]> {
    const collection = this.collection;
    const prepareCreate = this.prepareCreate.bind(this);

    return await this.database.write(async function baseRepositoryBatchCreate() {
      const records = await Promise.all(
        items.map(item =>
          collection.create((record: any) => {
            Object.assign(record._raw, prepareCreate(item));
          })
        )
      );
      return records;
    });
  }

  async batchUpdate(updates: { id: string; data: Partial<T> }[]): Promise<T[]> {
    const collection = this.collection;
    const prepareUpdate = this.prepareUpdate.bind(this);

    return await this.database.write(async function baseRepositoryBatchUpdate() {
      const records = await Promise.all(
        updates.map(async ({ id, data }) => {
          const record = await collection.find(id);
          return await record.update((r: any) => {
            Object.assign(r._raw, prepareUpdate(data));
          });
        })
      );
      return records;
    });
  }

  async batchDelete(ids: string[]): Promise<void> {
    const collection = this.collection;

    await this.database.write(async function baseRepositoryBatchDelete() {
      const records = await Promise.all(ids.map(id => collection.find(id)));
      await Promise.all(records.map(r => r.markAsDeleted()));
    });
  }

  abstract upsertFromRemote(remoteData: any): Promise<T>;
  abstract markForSync(id: string): Promise<void>;

  // Override these to transform data before save
  protected prepareCreate(data: Partial<T>): any {
    return {
      ...data,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
  }

  protected prepareUpdate(data: Partial<T>): any {
    return {
      ...data,
      updated_at: Date.now(),
    };
  }
}