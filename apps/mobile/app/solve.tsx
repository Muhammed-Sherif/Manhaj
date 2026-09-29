import { ScreenContainer } from '../components/ScreenContainer';
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from '../store/authStore';
import { fetchUnsolvedQuestions, fetchAllQuestions } from '../services/questionService';
import { getQuestionWithChoices } from '../services/contentSyncService';
import {
  ScreenHeader,
  LoadingView,
  QuestionFlagButton } from
'../components';
import {
  QuestionChoices,
  QuestionAnswerFooter,
  QuestionSRSButton } from
'../components/question';
import { useSolveStore, type Question, type SolveMode } from '../store/solveStore';

export default function SolveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mode = params.mode as SolveMode || 'solve';
  const questionId = params.questionId as string | undefined;
  const studyUnitId = params.studyUnitId as string | undefined;

  const {
    questions,
    currentIndex,
    loading,
    setMode,
    setLoading,
    setQuestions,
    setError
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
  }, [questionId, studyUnitId, mode]);

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

      // Scenario 2: studyUnitId passed (from StudyUnitQuestionsCard)
      if (studyUnitId) {
        let list: Question[] = [];

        if (mode === 'unsolved') {
          list = await fetchUnsolvedQuestions(studyUnitId);
        } else {
          list = await fetchAllQuestions(studyUnitId);
        }
        if (list.length > 0) {
          list.sort((a, b) => {
            const aId = a.telegramMessageId ?? 0;
            const bId = b.telegramMessageId ?? 0;
            return aId - bId;
          });
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
      <ScreenContainer className="flex-1 bg-slate-50 dark:bg-slate-900 justify-center items-center p-4">
        <Text className="text-slate-600 dark:text-slate-400 text-center text-lg font-medium mb-2">
          No Questions Available
        </Text>
        <Text className="text-slate-500 dark:text-slate-500 text-center text-sm">
          {mode === 'unsolved' ?
          "You've answered all questions for this studyUnit. Great job!" :
          "No practice questions are available for this studyUnit yet."}
        </Text>
      </ScreenContainer>);

  }

  const questionText = currentQuestion.questionText;
  const headerTitle =
  mode === 'review' ?
  `Review ${currentIndex + 1} of ${questions.length}` :
  `Question ${currentIndex + 1} of ${questions.length}`;
  
  const headerSubtitle = mode === 'review' ? 
  (currentQuestion.studyUnit?.name || currentQuestion.studyUnit?.subject?.name) : undefined;
  return (
    <ScreenContainer className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScreenHeader
        title={headerTitle}
        subtitle={headerSubtitle}
        onBack={() => router.back()} />
      

      <ScrollView className="flex-1 p-4">
        {/* Question Text with Flag Button and Images */}
        <View className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm mb-4">
          
          {(currentQuestion.questionImages && currentQuestion.questionImages.length > 0 ||
          (currentQuestion as any).images && (currentQuestion as any).images.length > 0) &&
          <View className="mb-4">
              {(() => {
              const images = currentQuestion.questionImages?.length ? currentQuestion.questionImages : (currentQuestion as any).images || [];
              return images.
              sort((a: any, b: any) => a.displayOrder - b.displayOrder).
              map((img: any) =>
              <Image
                key={img.id}
                source={{ uri: img.imageUrl }}
                className="w-full h-48 rounded-lg bg-slate-100 dark:bg-slate-700 mb-2"
                resizeMode="contain" />

              );
            })()}
            </View>
          }

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
    </ScreenContainer>);

}