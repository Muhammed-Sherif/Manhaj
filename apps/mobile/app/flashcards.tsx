import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { db } from '../services/database';
import * as schema from '../db/schema';
import { eq, lte } from 'drizzle-orm';
import { calculateSM2 } from '../utils/sm2';
import { ScreenHeader } from '../components';
import { BookOpenIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react-native';

export default function FlashcardsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDueItems();
  }, []);

  const loadDueItems = async () => {
    try {
      const nowStr = new Date().toISOString();
      const dueItems = await db
        .select()
        .from(schema.reviewableItems)
        .where(lte(schema.reviewableItems.nextReviewDate, nowStr));
      
      const hydratedItems = await Promise.all(dueItems.map(async (item) => {
        if (item.itemType === 'case') {
          const [caseLink] = await db.select().from(schema.caseReviewable).where(eq(schema.caseReviewable.reviewableId, item.id));
          if (caseLink) {
            const [caseData] = await db.select().from(schema.caseItems).where(eq(schema.caseItems.id, caseLink.caseId));
            return { ...item, data: caseData };
          }
        } else if (item.itemType === 'note') {
          const [noteLink] = await db.select().from(schema.noteReviewable).where(eq(schema.noteReviewable.reviewableId, item.id));
          if (noteLink) {
            const [noteData] = await db.select().from(schema.noteItems).where(eq(schema.noteItems.id, noteLink.noteId));
            return { ...item, data: noteData };
          }
        } else if (item.itemType === 'question') {
          const [qLink] = await db.select().from(schema.questionReviewable).where(eq(schema.questionReviewable.reviewableId, item.id));
          if (qLink) {
            const [qData] = await db.select().from(schema.questions).where(eq(schema.questions.id, qLink.questionId));
            return { ...item, data: qData };
          }
        }
        return item;
      }));

      setItems(hydratedItems.filter(i => i.data)); // Only valid items
    } catch (err) {
      console.error('Failed to load flashcards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async (grade: number) => {
    const currentItem = items[currentIndex];
    
    // Calculate new SM2 parameters
    const nextParams = calculateSM2(grade, {
      interval: currentItem.interval,
      easeFactor: currentItem.easeFactor,
      repetitionCount: currentItem.repetitionCount,
    });

    try {
      // Update locally
      await db.update(schema.reviewableItems).set({
        interval: nextParams.interval,
        easeFactor: nextParams.easeFactor,
        repetitionCount: nextParams.repetitionCount,
        nextReviewDate: nextParams.nextReviewDate.toISOString(),
        lastReviewedAt: new Date().toISOString(),
      }).where(eq(schema.reviewableItems.id, currentItem.id));

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
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
        <ScreenHeader title="SRS Review" icon={<BookOpenIcon size={20} color="#0d9488" />} />
        <View className="flex-1 justify-center items-center p-6">
          <CheckCircleIcon size={64} color="#10b981" className="mb-4" />
          <Text className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 text-center">
            You're all caught up!
          </Text>
          <Text className="text-slate-500 text-center mb-6">
            You've reviewed all your due flashcards for today.
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

  const currentItem = items[currentIndex];
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

          {/* Answer / Back of Card */}
          {showAnswer ? (
            <View className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <Text className="text-sm font-semibold text-slate-500 mb-2 uppercase">Answer</Text>
              <Text className="text-lg text-slate-800 dark:text-slate-200 leading-relaxed">
                {data.answer || data.explanation || "No written answer provided."}
              </Text>
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
          <View className="mt-6 flex-row justify-between space-x-2">
            {[1, 2, 3, 4, 5].map((grade) => (
              <TouchableOpacity
                key={grade}
                className={`flex-1 p-4 rounded-xl items-center justify-center ${
                  grade <= 2 ? 'bg-red-100 dark:bg-red-900/30' : 
                  grade === 3 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 
                  'bg-green-100 dark:bg-green-900/30'
                }`}
                onPress={() => handleGrade(grade)}
              >
                <Text className={`font-bold text-lg ${
                  grade <= 2 ? 'text-red-700 dark:text-red-400' : 
                  grade === 3 ? 'text-yellow-700 dark:text-yellow-400' : 
                  'text-green-700 dark:text-green-400'
                }`}>
                  {grade}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
