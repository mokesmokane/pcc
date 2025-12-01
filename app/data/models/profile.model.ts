import { Model } from '@nozbe/watermelondb';
import { date, field, readonly } from '@nozbe/watermelondb/decorators';

export default class Profile extends Model {
  static table = 'profiles';

  @field('user_id') userId!: string;
  @field('username') username?: string;
  @field('avatar_url') avatarUrl?: string;
  @field('first_name') firstName?: string;
  @field('last_name') lastName?: string;
  @field('location') location?: string;
  @field('bio') bio?: string;

  // Onboarding preferences (stored as JSON strings)
  @field('struggles') struggles?: string; // JSON array of struggle IDs
  @field('interests') interests?: string; // JSON array of interest IDs
  @field('onboarding_completed') onboardingCompleted?: boolean;

  // Timestamps and sync
  @readonly @date('created_at') createdAt!: Date;
  @date('updated_at') updatedAt!: Date;
  @field('synced_at') syncedAt?: number;
  @field('needs_sync') needsSync!: boolean;

  // Helper methods to get/set arrays
  get strugglesArray(): string[] {
    try {
      return this.struggles ? JSON.parse(this.struggles) : [];
    } catch {
      return [];
    }
  }

  get interestsArray(): string[] {
    try {
      return this.interests ? JSON.parse(this.interests) : [];
    } catch {
      return [];
    }
  }
}