import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { Rating } from '@manhaj/srs/src/anki';
import { ScreenHeader, ReviewChoices } from '../components';
import { BookOpenIcon, CheckCircleIcon } from 'lucide-react-native';
import { resolveImageUri } from '../services/imageUploadService';
import {
  buildCustomStudyQueue,
  gradeStudyCard,
  DEFAULT_STUDY_FILTERS,
  type CustomStudyFilters,
  type StudyCard,
} from '../services/customStudyService';

export default function FlashcardsScreen() {
  const router = useRouter();
  // A custom-study session arrives as its filter set, JSON-encoded because expo-router
  // params are strings and the filters are a nested object. Absent the param this is the
  // ordinary SRS session: every due question, case, note and summary.
  const { filters: filtersParam } = useLocalSearchParams<{ filters?: string }>();

  const filters = useMemo<CustomStudyFilters>(() => {
    if (!filtersParam) return DEFAULT_STUDY_FILTERS;
    try {
      return { ...DEFAULT_STUDY_FILTERS, ...JSON.parse(filtersParam) };
    } catch {
      return DEFAULT_STUDY_FILTERS;
    }
  }, [filtersParam]);

  const isCustomStudy = !!filtersParam;

  const [items, setItems] = useState<StudyCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, [filters]);

  // Resolve the current card's image, preferring the local file and falling back to the
  // server copy — the device that attached it has the file, another device does not.
  useEffect(() => {
    let cancelled = false;

    const resolve = async () => {
      const current = items[currentIndex];

      if (!current?.data) {
        if (!cancelled) setImageUri(null);
        return;
      }

      const uri = await resolveImageUri(
        current.data.imageLocalPath ?? null,
        current.data.imageUrl ?? null
      );

      if (!cancelled) setImageUri(uri);
    };

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [items, currentIndex]);

  const loadItems = async () => {
    try {
      const userId = useAuthStore.getState().user?.id ?? 'temp_user_id';
      setItems(await buildCustomStudyQueue(filters, userId));
    } catch (err) {
      console.error('Failed to load flashcards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async (rating: Rating) => {
    const currentItem = items[currentIndex];
    const userId = useAuthStore.getState().user?.id ?? 'temp_user_id';

    try {
      await gradeStudyCard(currentItem, rating, userId);

      // Move to next
      setShowAnswer(false);
      setCurrentIndex(prev => prev + 1);
    } catch (err) {
      console.error('Failed to update flashcard:', err);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-900">
        <Text className="text-slate-500">Loading your due reviews...</Text>
      </View>
    );
  }

  if (currentIndex >= items.length) {
    const emptyQueue = items.length === 0;
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
        <ScreenHeader
          title={isCustomStudy ? 'Custom Study' : 'SRS Review'}
          icon={<BookOpenIcon size={20} color="#0d9488" />}
        />
        <View className="flex-1 justify-center items-center p-6">
          <CheckCircleIcon size={64} color="#10b981" className="mb-4" />
          <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 text-center">
            {emptyQueue && isCustomStudy ? 'Nothing matches yet' : "You're all caught up!"}
          </Text>
          <Text className="text-slate-500 text-center mb-6">
            {emptyQueue
              ? isCustomStudy
                ? 'No cards match these filters. Try widening the scope, or include content you have not reviewed before.'
                : 'You have no cards due for review right now.'
              : 'You have reviewed every card in this session.'}
          </Text>
          <TouchableOpacity
            className="bg-teal-600 px-6 py-3 rounded-full"
            onPress={() => router.back()}
          >
            <Text className="text-white font-bold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentItem: any = items[currentIndex];
  const { data, itemType } = currentItem;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScreenHeader
        title={`Review (${currentIndex + 1} of ${items.length})`}
        subtitle={itemType.toUpperCase()}
        icon={<BookOpenIcon size={20} color="#0d9488" />}
      />

      <ScrollView className="flex-1 p-4" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 min-h-[300px]">
          {/* Lecture Name for Questions */}
          {itemType === 'question' && currentItem.lecture && (
            <View className="mb-3">
              <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                {currentItem.lecture.name}
              </Text>
            </View>
          )}

          {/* Question / Front of Card */}
          <Text className="text-sm font-semibold text-teal-600 mb-2 uppercase">
            {itemType === 'case' ? data.category : itemType}
          </Text>
          <Text className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            {data.title || data.type || 'Question'}
          </Text>
          <Text className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
            {data.content || data.questionText}
          </Text>

          {/* Only case and note cards carry images; questions never do. */}
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              className="w-full h-52 rounded-xl mb-6"
              resizeMode="contain"
            />
          )}

          {/* Options belong to the question, not to the answer: a student cannot attempt an
              MCQ without seeing the alternatives, so they sit on the front unmarked and only
              the correct one lights up on reveal. */}
          {itemType === 'question' && currentItem.choices?.length > 0 && (
            <View className="mb-2">
              <ReviewChoices choices={currentItem.choices} showAnswer={showAnswer} />
            </View>
          )}

          {/* Answer / Back of Card */}
          {showAnswer ? (
            <View className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Text className="text-sm font-semibold text-slate-500 mb-2 uppercase">Answer</Text>
              {itemType === 'question' && currentItem.choices?.length > 0 ? (
                <Text className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  The correct option is highlighted above.
                </Text>
              ) : (
                <Text className="text-lg text-slate-800 dark:text-slate-200 leading-relaxed">
                  {itemType === 'question'
                    ? currentItem.writtenAnswer || data.explanation || 'No written answer provided.'
                    : data.answer || data.explanation || 'No written answer provided.'}
                </Text>
              )}
            </View>
          ) : (
            <TouchableOpacity 
              className="mt-auto bg-slate-100 dark:bg-slate-700 p-4 rounded-xl items-center"
              onPress={() => setShowAnswer(true)}
            >
              <Text className="text-slate-800 dark:text-slate-200 font-bold">Show Answer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Grading Buttons */}
        {showAnswer && (
          <View className="mt-6 flex-row justify-between space-x-2 gap-2">
            {(['again', 'hard', 'good', 'easy'] as const).map((rating) => (
              <TouchableOpacity
                key={rating}
                className={`flex-1 p-3 rounded-xl items-center justify-center ${
                  rating === 'again' ? 'bg-red-100 dark:bg-red-900/30' : 
                  rating === 'hard' ? 'bg-orange-100 dark:bg-orange-900/30' : 
                  rating === 'good' ? 'bg-blue-100 dark:bg-blue-900/30' :
                  'bg-green-100 dark:bg-green-900/30'
                }`}
                onPress={() => handleGrade(rating)}
              >
                <Text className={`font-bold text-sm capitalize ${
                  rating === 'again' ? 'text-red-700 dark:text-red-400' : 
                  rating === 'hard' ? 'text-orange-700 dark:text-orange-400' : 
                  rating === 'good' ? 'text-blue-700 dark:text-blue-400' :
                  'text-green-700 dark:text-green-400'
                }`}>
                  {rating === 'again' ? 'Forgot' : rating}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
