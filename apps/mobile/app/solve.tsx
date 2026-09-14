import React, { useState, useEffect, use } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { BrainCircuitIcon, RepeatIcon } from 'lucide-react-native';
import { db } from '../services/database';
import * as schema from '../db/schema.js';
import * as Crypto from 'expo-crypto';
import { useAuthStore } from '../store/authStore';
import { fetchUnsolvedQuestions, fetchAllQuestions } from '../services/questionService';
import { getQuestionWithChoices } from '../services/contentSyncService';
import {
  ScreenHeader,
  LoadingView,
  ErrorView,
  QuestionFlagButton,
} from '../components';
import {
  QuestionChoices,
  QuestionAnswerFooter,
  QuestionSRSButton,
} from '../components/question';
import { useSolveStore, type Question, type SolveMode } from '../store/solveStore';

export default function SolveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mode = ((params.mode as SolveMode) || 'solve');
  const questionId = params.questionId as string | undefined;
  const lectureId = params.lectureId as string | undefined;

  const {
    questions,
    currentIndex,
    loading,
    setMode,
    setLoading,
    setQuestions,
    setError,
  } = useSolveStore();

  const { user } = useAuthStore();

  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setMode(mode);
    loadQuestions();

    const unsubscribe = NetInfo.addEventListener((netState) => {
      setIsOnline(netState.isConnected ?? false);
    });
    return unsubscribe;
  }, [questionId, lectureId, mode]);

  const loadQuestions = async () => {
    try {
      setLoading(true);

      // Scenario 1: Specific questionId passed
      if (questionId) {
        const single = await getQuestionWithChoices(questionId);
        if (single) {
          setQuestions([single]);
          return;
        }
      }

      // Scenario 2: lectureId passed (from LectureQuestionsCard)
      if (lectureId) {
        let list: Question[] = [];

        if (mode === 'unsolved') {
          list = await fetchUnsolvedQuestions(lectureId);
        } else {
          list = await fetchAllQuestions(lectureId);
        }
        if (list.length > 0) {
          setQuestions(list);
          return;
        }
      }

      setError();
    } catch (error) {
      console.error('Failed to load questions:', error);
      setError();
    }
  };

  if (loading) {
    return <LoadingView message="Loading questions..." />;
  }

  const currentQuestion = questions[currentIndex] ?? null;

  if (!currentQuestion) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900 justify-center items-center p-4">
        <Text className="text-slate-600 dark:text-slate-400 text-center text-lg font-medium mb-2">
          No Questions Available
        </Text>
        <Text className="text-slate-500 dark:text-slate-500 text-center text-sm">
          {mode === 'unsolved' 
            ? "You've answered all questions for this lecture. Great job!" 
            : "No practice questions are available for this lecture yet."}
        </Text>
      </View>
    );
  }

  const questionText = currentQuestion.questionText;
  const headerTitle =
    mode === 'solve' || mode === 'unsolved'
      ? `Question ${currentIndex + 1} of ${questions.length}`
      : currentQuestion.lecture?.name || 'Review Question';
  const headerSubtitle = mode === 'review' ? currentQuestion.lecture?.subject?.name : undefined;
  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScreenHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        onBack={() => router.back()}
      />

      <ScrollView className="flex-1 p-4">
        {/* Question Text with Flag Button */}
        <View className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm mb-4">
          <View className="flex-row items-start justify-between">
            <Text className="flex-1 text-lg text-slate-800 dark:text-slate-100 leading-relaxed mr-3">
              {questionText}
            </Text>
            <View className="flex-row gap-2 items-center space-x-3">
              <QuestionSRSButton questionId={currentQuestion.id} />
              <QuestionFlagButton questionId={currentQuestion.id} isOnline={isOnline} />
            </View>
          </View>
        </View>

        {/* Choices Component connected directly to Zustand Store */}
        <QuestionChoices isOnline={isOnline} />

        {/* Explanation & Continue Button connected directly to Zustand Store */}
        <QuestionAnswerFooter />
      </ScrollView>
    </View>
  );
}
