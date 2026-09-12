import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CheckCircleIcon, XCircleIcon } from 'lucide-react-native';
import { useSolveStore } from '../../store/solveStore';

export interface QuestionChoicesProps {
  isOnline?: boolean;
}

export const QuestionChoices: React.FC<QuestionChoicesProps> = ({ isOnline = true }) => {
  const { questions, currentIndex, selectedChoice, showAnswer, selectChoice } = useSolveStore();
  const currentQuestion = questions[currentIndex];

  if (!currentQuestion) return null;

  const choices = currentQuestion.choices ?? [];

  return (
    <View className="space-y-3">
      {choices.map((choice) => {
        const isSelected = selectedChoice === choice.id;
        const isCorrect = Boolean(choice.isCorrect);

        // After answering: correct answer → green; wrong selection → red
        const showGreen = showAnswer && isCorrect;
        const showRed = showAnswer && isSelected && !isCorrect;

        return (
          <TouchableOpacity
            key={choice.id}
            className={`border-2 rounded-xl p-4 mb-3 ${
              showGreen
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : showRed
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : isSelected
                ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20'
                : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700'
            }`}
            onPress={() => selectChoice(choice.id, isOnline)}
            disabled={showAnswer}
          >
            <View className="flex-row items-start">
              <View
                className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                  showGreen
                    ? 'border-green-500 bg-green-500'
                    : showRed
                    ? 'border-red-500 bg-red-500'
                    : isSelected
                    ? 'border-teal-600 bg-teal-600'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {showGreen && <CheckCircleIcon size={14} color="white" />}
                {showRed && <XCircleIcon size={14} color="white" />}
              </View>
              <Text
                className={`flex-1 text-base ${
                  showGreen
                    ? 'text-green-800 dark:text-green-300 font-semibold'
                    : showRed
                    ? 'text-red-800 dark:text-red-300'
                    : 'text-slate-800 dark:text-slate-100'
                }`}
              >
                {choice.choiceText}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
