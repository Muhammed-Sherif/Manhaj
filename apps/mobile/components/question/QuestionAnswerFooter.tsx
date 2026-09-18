import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { CheckCircleIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSolveStore } from '../../store/solveStore';

export const QuestionAnswerFooter: React.FC = () => {
  const router = useRouter();
  const { showAnswer, explanation, mode, currentIndex, questions, nextQuestion } =
    useSolveStore();

  if (!showAnswer) return null;

  const currentQuestion = questions[currentIndex];
  const explanationText = explanation || currentQuestion?.explanation || '';

  const handleContinue = async () => {
    if (mode === 'review') {
      router.back();
      return;
    }

    if (currentIndex < questions.length - 1) {
      nextQuestion();
    } else {
      // Auto-complete study tasks for 'solve' activity
      try {
        if (currentQuestion?.lectureId) {
          const { db } = require('../../services/database');
          const schema = require('../../db/schema');
          const { inArray, and, eq } = require('drizzle-orm');
          const { postStudentTasksCompleteStudy } = require('@manhaj/api-client');
          
          // Local update
          const tasksToUpdate = await db.select({ id: schema.tasks.id })
            .from(schema.tasks)
            .innerJoin(schema.studyTasks, eq(schema.tasks.id, schema.studyTasks.taskId))
            .where(and(
              eq(schema.studyTasks.lectureId, currentQuestion.lectureId),
              eq(schema.studyTasks.activityType, 'solve')
            ));
          
          if (tasksToUpdate.length > 0) {
            await db.update(schema.tasks)
              .set({ status: 'done', endTime: new Date().toISOString() })
              .where(inArray(schema.tasks.id, tasksToUpdate.map((t: any) => t.id)));
              
            // Backend sync (fire and forget)
            postStudentTasksCompleteStudy({ lectureId: currentQuestion.lectureId, activityType: 'solve' }).catch(console.error);
          }
        }
      } catch (err) {
        console.error('Failed to auto-complete study tasks', err);
      }

      const message =
        mode === 'unsolved'
          ? 'You have completed all unsolved questions for this lecture.'
          : 'You have completed all questions for this lecture.';

      Alert.alert('Well Done!', message, [
        { text: 'Back to Lecture', onPress: () => router.back() },
      ]);
    }
  };

  return (
    <>
      {/* Explanation */}
      <View className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm mt-2 mb-4">
        <Text className="font-semibold text-slate-800 dark:text-slate-100 mb-2 text-base">Explanation</Text>
        <Text className="text-slate-600 dark:text-slate-300 leading-relaxed">{explanationText}</Text>

        <View className="flex-row items-center mt-3 bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
          <CheckCircleIcon size={16} color="#22c55e" />
          <Text className="text-green-600 dark:text-green-400 text-sm ml-2">Verified Explanation</Text>
        </View>
      </View>

      {/* Continue Button */}
      <TouchableOpacity
        className="bg-teal-600 rounded-xl p-4 mb-8 items-center active:bg-teal-700"
        onPress={handleContinue}
      >
        <Text className="text-white font-semibold text-lg">
          {mode === 'review'
            ? 'Back to Review'
            : currentIndex < questions.length - 1
            ? 'Next Question'
            : 'Finish Session'}
        </Text>
      </TouchableOpacity>
    </>
  );
};
