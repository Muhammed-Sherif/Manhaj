import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import { WifiIcon, WifiOffIcon, CheckCircleIcon, XCircleIcon, ChevronLeftIcon } from 'lucide-react-native';
import { storeAnswer, syncAttempts } from '../services/syncService';
import { getQuestionWithChoices } from '../services/contentSyncService';

const getSubjectIcon = (subject: string) => {
  switch (subject) {
    case 'Cardiology':
      return '❤️';
    case 'Pharmacology':
      return '💊';
    case 'Anatomy':
      return '🫀';
    default:
      return '📚';
  }
};

export default function SolveScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const mode = params.mode as 'solve' | 'review' || 'solve';
  const questionId = params.questionId as string;

  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [question, setQuestion] = useState<any>(null);
  const [explanation, setExplanation] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const currentIndex = 12; // Mock current index
  const totalQuestions = 50; // Mock total

  useEffect(() => {
    loadQuestion();
    setupNetworkListener();
  }, [questionId]);

  const loadQuestion = async () => {
    try {
      const questionData = await getQuestionWithChoices(questionId);
      if (questionData) {
        setQuestion(questionData);
      }
    } catch (error) {
      console.error('Failed to load question:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupNetworkListener = () => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return unsubscribe;
  };

  const handleChoiceSelect = async (choiceId: string) => {
    if (showAnswer) return; // Prevent changing answer after showing result

    setSelectedChoice(choiceId);
    setShowAnswer(true);

    try {
      // Store answer locally first (Step 1 in sequence diagram)
      const result = await storeAnswer({
        id: `attempt-${Date.now()}`,
        questionId: questionId,
        choiceId: choiceId,
        isCorrect: false, // Will be determined by SQLite
        createdAt: new Date().toISOString(),
      });

      setExplanation(result.explanation);

      // Sync to API if internet available (Step 5 in sequence diagram - optional)
      if (isOnline) {
        try {
          await syncAttempts();
        } catch (error) {
          console.error('Sync failed, will retry later:', error);
        }
      }
    } catch (error) {
      console.error('Failed to store answer:', error);
      Alert.alert('Error', 'Failed to save answer');
    }
  };

  const handleContinue = () => {
    if (mode === 'review') {
      router.back();
    } else {
      // Navigate to next question
      Alert.alert('Continue', 'Navigate to next question');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-400">Loading question...</Text>
      </View>
    );
  }

  if (!question) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-400">Question not found</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white border-b border-slate-200 px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ChevronLeftIcon size={24} color="#0d9488" />
          </TouchableOpacity>

          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-2xl mr-2">{getSubjectIcon('Cardiology')}</Text>
              <View className="flex-1">
                {mode === 'solve' ? (
                  <Text className="font-semibold text-slate-800">
                    Question {currentIndex} of {totalQuestions}
                  </Text>
                ) : (
                  <View>
                    <Text className="font-semibold text-slate-800">Cardiology</Text>
                    <Text className="text-slate-500 text-sm">Heart Failure</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Persistent offline indicator */}
          <View className={`flex-row items-center ${isOnline ? 'bg-green-50' : 'bg-amber-50'} px-2 py-1 rounded`}>
            {isOnline ? (
              <WifiIcon size={14} color="#22c55e" />
            ) : (
              <WifiOffIcon size={14} color="#f59e0b" />
            )}
            <Text className={`text-xs ml-1 ${isOnline ? 'text-green-600' : 'text-amber-600'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Question */}
        <View className="bg-white rounded-xl p-5 shadow-sm mb-4">
          <Text className="text-lg text-slate-800 leading-relaxed">
            {question.question_text}
          </Text>
        </View>

        {/* Choices */}
        <View className="space-y-3">
          {question.choices.map((choice: any) => {
            const isSelected = selectedChoice === choice.id;
            const showResult = showAnswer && isSelected;

            return (
              <TouchableOpacity
                key={choice.id}
                className={`border-2 rounded-xl p-4 ${showResult
                    ? choice.is_correct
                      ? 'border-green-500 bg-green-50'
                      : 'border-red-500 bg-red-50'
                    : isSelected
                      ? 'border-teal-600 bg-teal-50'
                      : 'border-slate-200 bg-white'
                  }`}
                onPress={() => handleChoiceSelect(choice.id)}
                disabled={showAnswer}
              >
                <View className="flex-row items-start">
                  <View
                    className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center ${showResult
                        ? choice.is_correct
                          ? 'border-green-500 bg-green-500'
                          : 'border-red-500 bg-red-500'
                        : isSelected
                          ? 'border-teal-600 bg-teal-600'
                          : 'border-slate-300'
                      }`}
                  >
                    {showResult && (
                      choice.is_correct ? (
                        <CheckCircleIcon size={14} color="white" />
                      ) : isSelected ? (
                        <XCircleIcon size={14} color="white" />
                      ) : null)}
                  </View>
                  <Text className="flex-1 text-slate-800">{choice.choice_text}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Explanation (shown after answer) */}
        {showAnswer && (
          <View className="bg-white rounded-xl p-5 shadow-sm mt-4">
            <Text className="font-semibold text-slate-800 mb-2">Explanation</Text>
            <Text className="text-slate-600 leading-relaxed">
              {explanation || question.explanation}
            </Text>

            <View className="flex-row items-center mt-3 bg-slate-50 p-3 rounded-lg">
              <CheckCircleIcon size={16} color="#22c55e" />
              <Text className="text-green-600 text-sm ml-2">Saved on this device</Text>
            </View>
          </View>
        )}

        {/* Continue Button */}
        {showAnswer && (
          <TouchableOpacity
            className="bg-teal-600 rounded-xl p-4 mt-4 items-center"
            onPress={handleContinue}
          >
            <Text className="text-white font-semibold text-lg">
              {mode === 'review' ? 'Back to Review' : 'Next Question'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
