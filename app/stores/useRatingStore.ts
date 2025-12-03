import { create } from 'zustand';

interface PendingRating {
  episodeId: string;
  episodeTitle: string;
  podcastTitle?: string;
  artwork?: string;
}

interface RatingState {
  pendingRating: PendingRating | null;
  setPendingRating: (info: PendingRating | null) => void;
}

export const useRatingStore = create<RatingState>((set) => ({
  pendingRating: null,
  setPendingRating: (info) => set({ pendingRating: info }),
}));
