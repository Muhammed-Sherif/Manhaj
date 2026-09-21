import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CheckCircleIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { type StudyUnit } from '@manhaj/api-client';

export interface StudyUnitQuestionsCardProps {
  studyUnit;
  onStartSolving?: () => void;
}

export const StudyUnitQuestionsCard: React.FC<StudyUnitQuestionsCardProps> = ({
  studyUnit,
  onStartSolving,
}) => {
  const router = useRouter();

  const handleSolveAll = () => {
    if (onStartSolving) {
      onStartSolving();
      return;
    }
    if (!studyUnit.id) return;
    router.push(`/solve?mode=solve&studyUnitId=${studyUnit.id}`);
  };

  const handleSolveUnsolved = () => {
    if (!studyUnit.id) return;
    router.push(`/solve?mode=unsolved&studyUnitId=${studyUnit.id}`);
  };

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100">Practice Questions</Text>
      </View>
      <View className="flex-row gap-3 items-stretch mb-3">
        <TouchableOpacity
          className="flex-1 bg-teal-600 rounded-xl p-4 items-center justify-center shadow-sm active:bg-teal-700"
          onPress={handleSolveAll}
          disabled={studyUnit.questions?.length === 0}
          style={{ opacity: studyUnit.questions?.length === 0 ? 0.6 : 1 }}
        >
          <Text className="text-white font-semibold text-base text-center">
            {studyUnit.questions?.length > 0
              ? `Solve All (${studyUnit.questions?.length} questions)`
              : 'No questions available yet'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-slate-600 dark:bg-slate-700 rounded-xl px-4 py-4 items-center justify-center shadow-sm active:bg-slate-700 dark:active:bg-slate-600"
          onPress={handleSolveUnsolved}
          disabled={studyUnit.questions?.length === 0}
          style={{ opacity: studyUnit.questions?.length === 0 ? 0.6 : 1 }}
        >
          <Text className="text-white font-semibold text-sm text-center">
            Solve Unsolved
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
