import { create } from "zustand";
import { persist } from "zustand/middleware";

import suggestionUrl from "../../assets/new-sug.json?url";

export interface SuggestionItem {
  prompt: string;
  display?: string;
}

export interface SuggestionCategory {
  name: string;
  items: SuggestionItem[];
}

export interface SuggestionData {
  [lang: string]: {
    chat: SuggestionCategory[];
  };
}

interface SuggestionStorage {
  cachedSuggestions: SuggestionData | null;
  lastFetchTime: number | null;
  setCachedSuggestions: (data: SuggestionData) => void;
  clearCache: () => void;
}

export const useSuggestionStore = create<SuggestionStorage>()(
  persist(
    (set) => ({
      cachedSuggestions: null,
      lastFetchTime: null,
      setCachedSuggestions: (data) =>
        set({ cachedSuggestions: data, lastFetchTime: Date.now() }),
      clearCache: () => set({ cachedSuggestions: null, lastFetchTime: null }),
    }),
    {
      name: "suggestion-storage",
    },
  ),
);

export async function fetchSuggestions(): Promise<SuggestionData> {
  const response = await fetch(suggestionUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch suggestions");
  }
  return await response.json();
}
