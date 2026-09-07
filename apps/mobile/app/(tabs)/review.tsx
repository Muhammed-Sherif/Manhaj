import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { XCircleIcon, FlagIcon, CheckCircleIcon } from 'lucide-react-native';
import { getWrongOrFlaggedQuestions } from '../../services/syncService';

type FilterType = 'all' | 'wrong' | 'flagged';

export default function ReviewScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterType>('all');
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (error) {
      console.error('Failed to load review questions:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-400">Loading review questions...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-white border-b border-slate-200 px-4 py-3">
        <Text className="text-lg font-semibold text-slate-800">Review Questions</Text>
      </View>

      {/* Filter Tabs */}
      <View className="bg-white border-b border-slate-200">
        <View className="flex-row">
          {(['all', 'wrong', 'flagged'] as FilterType[]).map((filterType) => (
            <TouchableOpacity
              key={filterType}
              className={`flex-1 py-3 ${filter === filterType ? 'border-b-2 border-teal-600' : ''}`}
              onPress={() => setFilter(filterType)}
            >
              <Text
                className={`text-center font-medium ${filter === filterType ? 'text-teal-600' : 'text-slate-500'
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
            <Text className="text-slate-400 text-lg">No questions to review</Text>
          </View>
        ) : (
          questions.map((question) => (
            <TouchableOpacity
              key={question.id}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm"
              onPress={() => router.push(`/solve?mode=review&questionId=${question.id}`)}
            >
              <View className="flex-row items-start mb-3">
                <View className="mr-3 text-2xl">
                  {getSubjectIcon('Cardiology')}
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center mb-1">
                    <Text className="font-semibold text-slate-800">Cardiology</Text>
                    <Text className="text-slate-400 mx-2">•</Text>
                    <Text className="text-slate-500 text-sm">Heart Failure</Text>
                  </View>

                  <Text className="text-slate-700 mb-2" numberOfLines={2}>
                    {question.question_text}
                  </Text>

                  <View className="flex-row items-center">
                    {question.reason === 'wrong' ? (
                      <View className="flex-row items-center bg-red-50 px-2 py-1 rounded">
                        <XCircleIcon size={14} color="#ef4444" />
                        <Text className="text-red-600 text-xs ml-1">Wrong Answer</Text>
                      </View>
                    ) : (
                      <View className="flex-row items-center bg-amber-50 px-2 py-1 rounded">
                        <FlagIcon size={14} color="#f59e0b" />
                        <Text className="text-amber-600 text-xs ml-1">Flagged</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}
