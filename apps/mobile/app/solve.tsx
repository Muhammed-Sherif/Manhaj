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
import { TappableImage } from '../components/TappableImage';
import { toAbsoluteUrl } from '../services/imageUploadService';

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

      // DIAGNOSTICS:
      if (studyUnitId) {
        try {
          const { getStudyUnitDetails, getQuestionsByStudyUnit } = require('../services/contentSyncService');
          const { db } = require('../services/database');
          const { questions: qSchema } = require('../db/schema');
          const { eq, isNull, isNotNull, and } = require('drizzle-orm');

          // Fresh DB read — total questions for this studyUnit regardless of deletedAt
          const allForUnit = await db.select({ id: qSchema.id, deletedAt: qSchema.deletedAt, studyUnitId: qSchema.studyUnitId })
            .from(qSchema)
            .where(eq(qSchema.studyUnitId, studyUnitId));

          const totalInUnit = allForUnit.length;
          const liveInUnit = allForUnit.filter((q: any) => !q.deletedAt).length;
          const deletedInUnit = allForUnit.filter((q: any) => !!q.deletedAt).length;

          console.log(`[DIAGNOSTICS] studyUnit ${studyUnitId}: total=${totalInUnit}, live(deletedAt=null)=${liveInUnit}, soft-deleted(deletedAt set)=${deletedInUnit}`);

          // Check if any tombstones STILL have this studyUnitId (would mean batch UPDATE failed)
          if (deletedInUnit > 0) {
            const leakedIds = allForUnit.filter((q: any) => !!q.deletedAt).map((q: any) => q.id);
            console.warn(`[DIAGNOSTICS] ⚠️  ${deletedInUnit} soft-deleted questions still have studyUnitId="${studyUnitId}" — batch UPDATE may not have worked! IDs: ${leakedIds.slice(0, 5).join(', ')}...`);
          }

          // The count users see in the UI (the isNull filter)
          const su = await getStudyUnitDetails(studyUnitId);
          console.log(`[DIAGNOSTICS] getStudyUnitDetails (isNull filter) returned ${su?.questions?.length ?? 'undefined'} questions`);

          const allQs = await getQuestionsByStudyUnit(studyUnitId);
          console.log(`[DIAGNOSTICS] getQuestionsByStudyUnit (isNull filter) returned ${allQs?.length ?? 'undefined'} questions`);
        } catch (err: any) {
          console.log(`[DIAGNOSTICS] error:`, err.message);
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
          
          console.log(`[SolveScreen] Loaded ${list.length} questions for studyUnit: ${studyUnitId}`);
          console.log(`[SolveScreen] Question IDs loaded: ${list.map(q => q.id).join(', ')}`);
          
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
          
          {(() => {
            const all: any[] = currentQuestion.questionImages?.length ?
            currentQuestion.questionImages :
            (currentQuestion as any).images || [];
            // Answer images belong to the answer reveal, not the question.
            const images = all.filter((img: any) => !img.isAnswer);

            console.log(
              `[SolveScreen] question ${currentQuestion.id}: ${all.length} image(s) total, ${images.length} question image(s)` +
              (all.length ? ` urls=${all.map((i: any) => i.imageUrl).join(', ')}` : ''));

            if (images.length === 0) return null;

            return (
              <View className="mb-4">
                {[...images].
                sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)).
                map((img: any) =>
                <View key={img.id} className="mb-2">
                      <TappableImage
                    uri={toAbsoluteUrl(img.imageUrl)}
                    logTag="solve-question-image"
                    style={{ width: '100%', height: 192 }}
                    className="rounded-lg bg-slate-100 dark:bg-slate-700"
                    resizeMode="contain" />
                    </View>
                )}
              </View>);

          })()}

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