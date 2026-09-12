import { create } from 'zustand';
import { storeAnswer, syncAttempts } from '../services/syncService';

export interface Choice {
  id: string;
  questionId?: string;
  choiceText: string;
  isCorrect: boolean | number;
}

export interface Question {
  id: string;
  questionText: string;
  explanation?: string | null;
  choices?: Choice[];
  lectureId?: string | null;
  createdBy?: string | null;
  source?: string | null;
  lecture?: {
    id?: string;
    subjectId?: string;
    name?: string;
    description?: string;
    subject?: {
      id?: string;
      moduleId?: string;
      name?: string;
      description?: string;
    } | null;
  } | null;
}

export type SolveMode = 'solve' | 'review' | 'unsolved';

interface SolveState {
  questions: Question[];
  currentIndex: number;
  selectedChoice: string | null;
  showAnswer: boolean;
  explanation: string;
  loading: boolean;
  mode: SolveMode;

  // Actions
  setMode: (mode: SolveMode) => void;
  setLoading: (loading: boolean) => void;
  setQuestions: (questions: Question[]) => void;
  setError: () => void;
  selectChoice: (choiceId: string, isOnline: boolean) => Promise<void>;
  nextQuestion: () => void;
  resetSession: () => void;
}

export const useSolveStore = create<SolveState>((set, get) => ({
  questions: [],
  currentIndex: 0,
  selectedChoice: null,
  showAnswer: false,
  explanation: '',
  loading: true,
  mode: 'solve',

  setMode: (mode) => set({ mode }),
  setLoading: (loading) => set({ loading }),

  setQuestions: (questions) =>
    set({
      questions,
      currentIndex: 0,
      selectedChoice: null,
      showAnswer: false,
      explanation: '',
      loading: false,
    }),

  setError: () =>
    set({
      questions: [],
      loading: false,
    }),

  selectChoice: async (choiceId, isOnline) => {
    const { showAnswer, questions, currentIndex } = get();
    const currentQuestion = questions[currentIndex];
    if (showAnswer || !currentQuestion) return;

    let finalExplanation = currentQuestion.explanation || '';

    try {
      const result = await storeAnswer({
        id: `attempt-${Date.now()}`,
        questionId: currentQuestion.id,
        choiceId,
        isCorrect: false,
        createdAt: new Date().toISOString(),
      });

      if (result?.explanation) {
        finalExplanation = result.explanation;
      }

      if (isOnline) {
        syncAttempts().catch((err) =>
          console.warn('Sync failed, will retry later:', err)
        );
      }
    } catch (error) {
      console.warn('Local store attempt note:', error);
    } finally {
      set({
        selectedChoice: choiceId,
        showAnswer: true,
        explanation: finalExplanation,
      });
    }
  },

  nextQuestion: () => {
    const { currentIndex } = get();
    set({
      currentIndex: currentIndex + 1,
      selectedChoice: null,
      showAnswer: false,
      explanation: '',
    });
  },

  resetSession: () =>
    set({
      questions: [],
      currentIndex: 0,
      selectedChoice: null,
      showAnswer: false,
      explanation: '',
      loading: true,
    }),
}));
