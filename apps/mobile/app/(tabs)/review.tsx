import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { XCircleIcon, FlagIcon, CheckCircleIcon, BookOpenIcon } from 'lucide-react-native';
import { getWrongOrFlaggedQuestions } from '../../services/syncService';
import { db } from '../../services/database';
import * as schema from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { useRouter } from 'expo-router';

type FilterType = 'all' | 'wrong' | 'flagged';

export default function ReviewScreen() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [questionChoices, setQuestionChoices] = useState<Map<string, any[]>>(new Map());

  useEffect(() => {
    loadQuestions();
  }, [filter]);

  const loadQuestions = async () => {
    try {
      const allQuestions = await getWrongOrFlaggedQuestions();
      const filtered = allQuestions.filter((q: any) => {
        if (filter === 'all') return true;
        return q.reason === filter;
      });
      setQuestions(filtered);
      
      // Load all choices for questions
      const choicesMap = new Map<string, any[]>();
      
      for (const question of filtered) {
        // Get all choices for the question
        try {
          const choices = await db
            .select()
            .from(schema.choices)
            .where(eq(schema.choices.questionId, question.id));
          
          console.log('Question:', question.id, 'Choices:', choices);
          console.log('Selected choice ID:', question.attempt?.choiceId);
          
          if (choices.length > 0) {
            choicesMap.set(question.id, choices);
          }
        } catch (error) {
          console.warn('Failed to get choices:', error);
        }
      }
      setQuestionChoices(choicesMap);
    } catch (error) {
      console.error('Failed to load review questions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center">
        <Text className="text-slate-400 dark:text-slate-500">Loading review questions...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <View className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100">Review Questions</Text>
      </View>

      {/* Filter Tabs */}
      <View className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <View className="flex-row">
          {(['all', 'wrong', 'flagged'] as FilterType[]).map((filterType) => (
            <TouchableOpacity
              key={filterType}
              className={`flex-1 py-3 ${filter === filterType ? 'border-b-2 border-teal-600' : ''}`}
              onPress={() => setFilter(filterType)}
            >
              <Text
                className={`text-center font-medium ${filter === filterType ? 'text-teal-600' : 'text-slate-500 dark:text-slate-400'
                  }`}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {questions.length === 0 ? (
          <View className="items-center justify-center py-12">
            <Text className="text-slate-400 dark:text-slate-500 text-lg">No questions to review</Text>
          </View>
        ) : (
          questions.map((question) => {
            const choices = questionChoices.get(question.id) || [];
            const selectedChoiceId = question.attempt?.choiceId;
            const correctChoice = choices.find(c => c.isCorrect === 1);
            const correctChoiceId = correctChoice?.id || null;
            
            console.log('Rendering question:', question.id);
            console.log('Choices:', choices);
            console.log('Selected ID:', selectedChoiceId);
            console.log('Correct choice:', correctChoice);
            console.log('Correct ID:', correctChoiceId);

            return (
              <View
                key={question.id}
                className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 shadow-sm"
              >
                <View className="flex-row items-start mb-3">
                  <View className="mr-3 mt-0.5">
                    <View className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900 items-center justify-center">
                      <BookOpenIcon size={18} color="#0d9488" />
                    </View>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center mb-1 flex-wrap">
                      <Text className="font-semibold text-teal-800 dark:text-teal-300 text-sm">
                        {question.subjectName || 'General'}
                      </Text>
                      {question.lectureName && (
                        <>
                          <Text className="text-slate-400 dark:text-slate-500 mx-2">•</Text>
                          <Text className="text-slate-500 dark:text-slate-400 text-xs" numberOfLines={1}>
                            {question.lectureName}
                          </Text>
                        </>
                      )}
                    </View>

                    <Text className="text-slate-700 dark:text-slate-300 mb-3 font-medium" numberOfLines={3}>
                      {question.questionText || question.question_text || 'Question'}
                    </Text>

                    {/* Choices */}
                    {choices.length > 0 && (
                      <View className="space-y-2 mb-3">
                        {choices.map((choice) => {
                          const isSelected = choice.id === selectedChoiceId;
                          const isCorrect = choice.isCorrect === 1;
                          
                          let bgClass = 'bg-slate-50 dark:bg-slate-700/50';
                          let borderClass = 'border-slate-200 dark:border-slate-600';
                          let textClass = 'text-slate-700 dark:text-slate-300';
                          let radioBorder = 'border-slate-300 dark:border-slate-500';
                          let radioBg = '';
                          
                          if (isSelected && isCorrect) {
                            // User selected the correct answer
                            bgClass = 'bg-green-50 dark:bg-green-900/30';
                            borderClass = 'border-green-300 dark:border-green-700';
                            textClass = 'text-green-800 dark:text-green-300';
                            radioBorder = 'border-green-500 bg-green-500';
                            radioBg = 'bg-white';
                          } else if (isSelected) {
                            // User selected a wrong answer
                            bgClass = 'bg-red-50 dark:bg-red-900/30';
                            borderClass = 'border-red-300 dark:border-red-700';
                            textClass = 'text-red-800 dark:text-red-300';
                            radioBorder = 'border-red-500 bg-red-500';
                            radioBg = 'bg-white';
                          } else if (isCorrect) {
                            // Correct answer (not selected by user)
                            bgClass = 'bg-green-50 dark:bg-green-900/20';
                            borderClass = 'border-green-200 dark:border-green-800';
                            textClass = 'text-green-700 dark:text-green-400';
                            radioBorder = 'border-green-500';
                          }

                          return (
                            <View
                              key={choice.id}
                              className={`p-3 rounded-lg border ${bgClass} ${borderClass}`}
                            >
                              <View className="flex-row items-center">
                                <View className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${radioBorder}`}>
                                  {radioBg && <View className={`w-2.5 h-2.5 rounded-full ${radioBg}`} />}
                                  {isCorrect && !isSelected && <CheckCircleIcon size={12} color="#22c55e" />}
                                </View>
                                <Text className={`flex-1 text-sm ${textClass}`}>
                                  {choice.choiceText}
                                </Text>
                                {isSelected && isCorrect && (
                                  <Text className="text-xs text-green-600 dark:text-green-400 ml-2">Your choice</Text>
                                )}
                                {isSelected && !isCorrect && (
                                  <Text className="text-xs text-red-600 dark:text-red-400 ml-2">Incorrect</Text>
                                )}
                                {isCorrect && !isSelected && (
                                  <Text className="text-xs text-green-600 dark:text-green-400 ml-2">Correct</Text>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}

                    <View className="flex-row items-center">
                      {question.reason === 'wrong' ? (
                        <View className="flex-row items-center bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                          <XCircleIcon size={14} color="#ef4444" />
                          <Text className="text-red-600 dark:text-red-400 text-xs ml-1">Incorrect</Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                          <FlagIcon size={14} color="#f59e0b" />
                          <Text className="text-amber-600 dark:text-amber-400 text-xs ml-1">Flagged</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
