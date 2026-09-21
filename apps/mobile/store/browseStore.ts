import { create } from 'zustand';
import type {
  NavigationLevel,
  StructuredGrade,
  StructuredTerm,
  StructuredModule,
  StructuredSubject,
} from '../components/browse/types';
import { getContentHierarchy } from '@manhaj/api-client';
import { getHierarchyFromSqlite, saveHierarchyToSqlite } from '../services/contentSyncService';

export interface BrowseState {
  grades: StructuredGrade[];
  currentLevel: NavigationLevel;
  selectedGrade: StructuredGrade | null;
  selectedTerm: StructuredTerm | null;
  selectedModule: StructuredModule | null;
  selectedSubject: StructuredSubject | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setGrades: (grades: StructuredGrade[]) => void;
  loadHierarchy: (forceRefresh?: boolean) => Promise<void>;
  selectGrade: (grade: StructuredGrade) => void;
  selectTerm: (term: StructuredTerm) => void;
  selectModule: (module: StructuredModule) => void;
  selectSubject: (subject: StructuredSubject) => void;
  navigateBack: () => void;
  resetNavigation: () => void;
  jumpToLevel: (level: NavigationLevel) => void;
}

export const useBrowseStore = create<BrowseState>((set, get) => ({
  grades: [],
  currentLevel: 'grades',
  selectedGrade: null,
  selectedTerm: null,
  selectedModule: null,
  selectedSubject: null,
  isLoading: false,
  error: null,

  setGrades: (grades) => set({ grades }),

  loadHierarchy: async (forceRefresh = false) => {
    // 1. Fetch from SQLite first (Offline-First / Availability-First)
    try {
      const localHierarchy = await getHierarchyFromSqlite();
      if (localHierarchy && localHierarchy.length > 0) {
        set({ grades: localHierarchy as StructuredGrade[], isLoading: false, error: null });

        // If not force refreshing, run background revalidation
        if (!forceRefresh) {
          try {
            const apiRes = await getContentHierarchy();
            if (apiRes?.data && apiRes.data.length > 0) {
              await saveHierarchyToSqlite(apiRes.data);
              set({ grades: apiRes.data as StructuredGrade[] });
            }
          } catch (bgErr) {
            console.log('[BrowseStore] Background sync skipped/failed:', bgErr);
          }
          return;
        }
      }
    } catch (sqliteErr) {
      console.warn('[BrowseStore] Failed to read hierarchy from SQLite:', sqliteErr);
    }

    // 2. Local is empty or forceRefresh requested -> fetch from API
    set({ isLoading: true, error: null });
    try {
      const apiRes = await getContentHierarchy();
      if (apiRes?.data && apiRes.data.length > 0) {
        await saveHierarchyToSqlite(apiRes.data);
        set({ grades: apiRes.data as StructuredGrade[], isLoading: false, error: null });
      } else {
        set({ isLoading: false });
      }
    } catch (apiErr: any) {
      const currentGrades = get().grades;
      if (!currentGrades || currentGrades.length === 0) {
        set({
          error: apiErr?.message || 'Failed to load content. Please check your connection.',
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    }
  },

  selectGrade: (grade) =>
    set({
      selectedGrade: grade,
      selectedTerm: null,
      selectedModule: null,
      selectedSubject: null,
      currentLevel: 'terms',
    }),

  selectTerm: (term) =>
    set({
      selectedTerm: term,
      selectedModule: null,
      selectedSubject: null,
      currentLevel: 'modules',
    }),

  selectModule: (module) =>
    set({
      selectedModule: module,
      selectedSubject: null,
      currentLevel: 'subjects',
    }),

  selectSubject: (subject) =>
    set({
      selectedSubject: subject,
      currentLevel: 'studyUnits',
    }),

  navigateBack: () =>
    set((state) => {
      switch (state.currentLevel) {
        case 'terms':
          return { currentLevel: 'grades', selectedGrade: null };
        case 'modules':
          return { currentLevel: 'terms', selectedTerm: null };
        case 'subjects':
          return { currentLevel: 'modules', selectedModule: null };
        case 'studyUnits':
          return { currentLevel: 'subjects', selectedSubject: null };
        default:
          return state;
      }
    }),

  resetNavigation: () =>
    set({
      currentLevel: 'grades',
      selectedGrade: null,
      selectedTerm: null,
      selectedModule: null,
      selectedSubject: null,
    }),

  jumpToLevel: (level) =>
    set((state) => {
      switch (level) {
        case 'grades':
          return {
            currentLevel: 'grades',
            selectedGrade: null,
            selectedTerm: null,
            selectedModule: null,
            selectedSubject: null,
          };
        case 'terms':
          return {
            currentLevel: 'terms',
            selectedTerm: null,
            selectedModule: null,
            selectedSubject: null,
          };
        case 'modules':
          return {
            currentLevel: 'modules',
            selectedModule: null,
            selectedSubject: null,
          };
        case 'subjects':
          return {
            currentLevel: 'subjects',
            selectedSubject: null,
          };
        default:
          return state;
      }
    }),
}));
