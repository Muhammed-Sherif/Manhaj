import React from 'react';
import { View, Text } from 'react-native';
import { CheckCircleIcon } from 'lucide-react-native';

export interface ReviewChoice {
  id: string;
  choiceText: string;
  isCorrect: boolean | number;
}

export interface ReviewChoicesProps {
  choices: ReviewChoice[];
  showAnswer: boolean;
}

/**
 * Read-only choice list for SRS review.
 *
 * Deliberately presentational, and a separate component from `QuestionChoices`: that one
 * is bound to `solveStore` and exists to capture an answer and score it. Here the student
 * is self-assessing against the SM-2 scale, so there is nothing to select — options stay
 * unmarked until `showAnswer`, and then only the correct one is highlighted.
 */
export const ReviewChoices: React.FC<ReviewChoicesProps> = ({ choices, showAnswer }) => {
  if (choices.length === 0) return null;

  return (
    <View className="space-y-3">
      {choices.map((choice) => {
        const showGreen = showAnswer && Boolean(choice.isCorrect);

        return (
          <View
            key={choice.id}
            className={`border-2 rounded-xl p-4 mb-3 ${
              showGreen
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700'
            }`}
          >
            <View className="flex-row items-start">
              <View
                className={`w-6 h-6 rounded-full border-2 mr-3 items-center justify-center ${
                  showGreen
                    ? 'border-green-500 bg-green-500'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {showGreen && <CheckCircleIcon size={14} color="white" />}
              </View>
              <Text
                className={`flex-1 text-base ${
                  showGreen
                    ? 'text-green-800 dark:text-green-300 font-semibold'
                    : 'text-slate-800 dark:text-slate-100'
                }`}
              >
                {choice.choiceText}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};
