import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSolveStore } from '../../store/solveStore';
import { TappableImage } from '../TappableImage';
import { toAbsoluteUrl } from '../../services/imageUploadService';

export const QuestionAnswerFooter: React.FC = () => {
  const router = useRouter();
  const { showAnswer, explanation, mode, currentIndex, questions, nextQuestion, previousQuestion } =
    useSolveStore();

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const explanationText = explanation || currentQuestion?.explanation || '';
  const answerImages = (currentQuestion.questionImages ?? []).filter((img) => !!img.isAnswer);

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      nextQuestion();
    } else {
      // Auto-complete study tasks for 'solve' activity
      try {
        if (currentQuestion?.studyUnitId) {
          const { db } = require('../../services/database');
          const schema = require('../../db/schema');
          const { inArray, and, eq } = require('drizzle-orm');
          const { postStudentTasksCompleteStudy } = require('@manhaj/api-client');
          
          // Local update
          const tasksToUpdate = await db.select({ id: schema.tasks.id })
            .from(schema.tasks)
            .innerJoin(schema.studyTasks, eq(schema.tasks.id, schema.studyTasks.taskId))
            .where(and(
              eq(schema.studyTasks.studyUnitId, currentQuestion.studyUnitId),
              eq(schema.studyTasks.activityType, 'solve')
            ));
          
          if (tasksToUpdate.length > 0) {
            await db.update(schema.tasks)
              .set({ status: 'done', endTime: new Date().toISOString() })
              .where(inArray(schema.tasks.id, tasksToUpdate.map((t: any) => t.id)));
              
            // Backend sync (fire and forget)
            postStudentTasksCompleteStudy({ studyUnitId: currentQuestion.studyUnitId, activityType: 'solve' }).catch(console.error);
          }
        }
      } catch (err) {
        console.error('Failed to auto-complete study tasks', err);
      }

      if (mode === 'review') {
        router.back();
        return;
      }

      const message =
        mode === 'unsolved'
          ? 'You have completed all unsolved questions for this studyUnit.'
          : 'You have completed all questions for this studyUnit.';

      Alert.alert('Well Done!', message, [
        { text: 'Back to StudyUnit', onPress: () => router.back() },
      ]);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      previousQuestion();
    }
  };

  return (
    <View className="mt-2 mb-8">
      {/* Explanation */}
      {showAnswer && explanationText ? (
        <View className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm mb-4">
          <Text className="font-semibold text-slate-800 dark:text-slate-100 mb-2 text-base">Explanation</Text>
          <Text className="text-slate-600 dark:text-slate-300 leading-relaxed">{explanationText}</Text>

          <View className="flex-row items-center mt-3 bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
            <CheckCircleIcon size={16} color="#22c55e" />
            <Text className="text-green-600 dark:text-green-400 text-sm ml-2">Verified Explanation</Text>
          </View>
        </View>
      ) : null}

      {/* Navigation Buttons */}
      <View className="flex-row justify-between gap-3">
        {currentIndex > 0 ? (
          <TouchableOpacity
            className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-xl p-4 flex-row items-center justify-center active:bg-slate-300 dark:active:bg-slate-600"
            onPress={handlePrev}
          >
            <ChevronLeftIcon size={20} color="#64748b" className="mr-2" />
            <Text className="text-slate-700 dark:text-slate-300 font-semibold text-lg">
              Previous
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="flex-1" />
        )}

        <TouchableOpacity
          className="flex-1 bg-teal-600 rounded-xl p-4 flex-row items-center justify-center active:bg-teal-700"
          onPress={handleNext}
        >
          <Text className="text-white font-semibold text-lg mr-2">
            {currentIndex < questions.length - 1
              ? 'Next'
              : mode === 'review'
              ? 'Finish Review'
              : 'Finish Session'}
          </Text>
          {currentIndex < questions.length - 1 && <ChevronRightIcon size={20} color="#ffffff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
};
