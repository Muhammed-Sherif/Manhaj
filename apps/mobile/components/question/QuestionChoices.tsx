import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { CheckCircleIcon, XCircleIcon } from 'lucide-react-native';
import { useSolveStore } from '../../store/solveStore';

export interface QuestionChoicesProps {
  isOnline?: boolean;
}

export const QuestionChoices: React.FC<QuestionChoicesProps> = ({ isOnline = true }) => {
  const { questions, currentIndex, selectedChoice, showAnswer, hasEvaluatedWritten, selectChoice, revealAnswer, submitWrittenAnswer } = useSolveStore();
  const currentQuestion = questions[currentIndex];
  const [writtenText, setWrittenText] = useState('');

  // Reset local state when question changes
  React.useEffect(() => {
    setWrittenText('');
  }, [currentQuestion?.id]);

  if (!currentQuestion) return null;

  if (currentQuestion.writtenQuestion) {
    return (
      <View className="space-y-4">
        <View className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700">
          <TextInput
            multiline
            numberOfLines={4}
            className="text-base text-slate-800 dark:text-slate-100 min-h-[100px]"
            placeholder="Type your answer here..."
            placeholderTextColor="#94a3b8"
            value={writtenText}
            onChangeText={setWrittenText}
            editable={!showAnswer}
            style={{ textAlignVertical: 'top' }}
          />
        </View>

        {!showAnswer ? (
          <TouchableOpacity
            className="bg-teal-600 rounded-xl p-4 items-center justify-center flex-row shadow-sm"
            onPress={() => revealAnswer()}
          >
            <Text className="text-white text-base font-semibold">Show Answer</Text>
          </TouchableOpacity>
        ) : (
          <View className="space-y-3">
            <View className="bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 mt-2">
              <Text className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Model Answer:
              </Text>
              <Text className="text-base text-slate-800 dark:text-slate-100">
                {currentQuestion.writtenQuestion.writtenAnswer}
              </Text>
            </View>

            {!hasEvaluatedWritten && (
              <View className="mt-4">
                <Text className="text-center font-medium text-slate-600 dark:text-slate-300 mb-3">
                  How did you do?
                </Text>
                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    className="flex-1 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-xl p-4 items-center justify-center flex-row shadow-sm"
                    onPress={() => submitWrittenAnswer(false, isOnline)}
                  >
                    <XCircleIcon size={20} color="#ef4444" style={{ marginRight: 8 }} />
                    <Text className="text-red-700 dark:text-red-400 font-semibold">I got it wrong</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    className="flex-1 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-xl p-4 items-center justify-center flex-row shadow-sm ml-3"
                    onPress={() => submitWrittenAnswer(true, isOnline)}
                  >
                    <CheckCircleIcon size={20} color="#22c55e" style={{ marginRight: 8 }} />
                    <Text className="text-green-700 dark:text-green-400 font-semibold">I got it right</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

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
