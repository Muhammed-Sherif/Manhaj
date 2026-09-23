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
  mcqQuestion?: { questionId: string } | null;
  writtenQuestion?: { questionId: string; writtenAnswer: string } | null;
  questionImages?: { id: string; imageUrl: string; displayOrder: number; isAnswer: number }[];
  studyUnitId?: string | null;
  createdBy?: string | null;
  source?: string | null;
  studyUnit?: {
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
  hasEvaluatedWritten: boolean;

  // Actions
  setMode: (mode: SolveMode) => void;
  setLoading: (loading: boolean) => void;
  setQuestions: (questions: Question[]) => void;
  setError: () => void;
  selectChoice: (choiceId: string, isOnline: boolean) => Promise<void>;
  submitWrittenAnswer: (isCorrect: boolean, isOnline: boolean) => Promise<void>;
  revealAnswer: () => void;
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
  hasEvaluatedWritten: false,

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
      hasEvaluatedWritten: false,
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

  submitWrittenAnswer: async (isCorrect, isOnline) => {
    const { questions, currentIndex } = get();
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    let finalExplanation = currentQuestion.explanation || '';

    try {
      const result = await storeAnswer({
        id: `attempt-${Date.now()}`,
        questionId: currentQuestion.id,
        isCorrect,
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
        hasEvaluatedWritten: true,
        explanation: finalExplanation,
      });
    }
  },

  revealAnswer: () => {
    const { showAnswer, questions, currentIndex } = get();
    if (showAnswer) return;
    const currentQuestion = questions[currentIndex];
    set({
      showAnswer: true,
      explanation: currentQuestion?.explanation || '',
    });
  },

  nextQuestion: () => {
    const { currentIndex } = get();
    set({
      currentIndex: currentIndex + 1,
      selectedChoice: null,
      showAnswer: false,
      explanation: '',
      hasEvaluatedWritten: false,
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
      hasEvaluatedWritten: false,
    }),
}));
