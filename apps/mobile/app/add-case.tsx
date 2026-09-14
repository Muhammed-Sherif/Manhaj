import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '../components';
import { BookOpenIcon, SaveIcon } from 'lucide-react-native';
import { db } from '../services/database';
import * as schema from '../db/schema.js';
import * as Crypto from 'expo-crypto';
import { newCard } from '@manhaj/srs/src/anki';
import { useAuthStore } from '../store/authStore';

export default function AddCaseScreen() {
  const { lectureId } = useLocalSearchParams<{ lectureId: string }>();
  const router = useRouter();

  const [category, setCategory] = useState('disease');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [answer, setAnswer] = useState('');

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'Please fill in both title and content.');
      return;
    }

    try {
      const caseId = Crypto.randomUUID();
      const reviewableId = Crypto.randomUUID();
      const nowStr = new Date().toISOString();

      const card = newCard();

      // Insert case
      await db.insert(schema.caseItems).values({
        id: caseId,
        lectureId: lectureId!,
        category,
        title,
        content,
        answer: answer.trim() || null,
        createdAt: nowStr,
      });

      // Insert reviewable item
      await db.insert(schema.reviewableItems).values({
        id: reviewableId,
        userId: useAuthStore.getState().user?.id ?? 'temp_user_id',
        itemType: 'case',
        state: card.state,
        currentStepIndex: card.currentStepIndex,
        interval: card.interval,
        easeFactor: card.easeFactor,
        repetitionCount: card.repetitionCount,
        lapses: card.lapses,
        nextReviewDate: nowStr, // new cards are due immediately
        createdAt: nowStr,
        updatedAt: nowStr,
      });

      // Link case to reviewable
      await db.insert(schema.caseReviewable).values({
        reviewableId,
        caseId,
      });

      Alert.alert('Success', 'Case added successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error('Failed to save case:', err);
      Alert.alert('Error', 'Failed to save case. Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScreenHeader
        title="Add Case"
        subtitle="Create a custom case study"
        icon={<BookOpenIcon size={20} color="#0d9488" />}
      />

      <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
        <View className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
          
          <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Category</Text>
          <View className="flex-row mb-4 space-x-2">
            {['disease', 'drug', 'case'].map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                className={`px-4 py-2 mr-2 rounded-full border ${category === cat ? 'bg-teal-600 border-teal-600' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}
              >
                <Text className={`${category === cat ? 'text-white' : 'text-slate-600 dark:text-slate-300'} font-medium capitalize`}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Type 2 Diabetes"
            placeholderTextColor="#94a3b8"
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 mb-4"
          />

          <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Details (Question / Scenario)</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Enter case details or scenario here..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 mb-4 h-32"
          />

          <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Answer (Optional)</Text>
          <TextInput
            value={answer}
            onChangeText={setAnswer}
            placeholder="Enter the answer or key points..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 mb-4 h-32"
          />

          <TouchableOpacity
            onPress={handleSave}
            className="bg-teal-600 flex-row items-center justify-center p-4 rounded-xl mt-2"
          >
            <SaveIcon size={20} color="white" className="mr-2" />
            <Text className="text-white font-bold text-lg">Save Case</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
