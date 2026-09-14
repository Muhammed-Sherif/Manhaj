import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '../components';
import { Edit3Icon, SaveIcon } from 'lucide-react-native';
import { db } from '../services/database';
import * as schema from '../db/schema.js';
import * as Crypto from 'expo-crypto';
import { newCard } from '@manhaj/srs/src/anki';
import { useAuthStore } from '../store/authStore';

export default function AddNoteScreen() {
  const { lectureId } = useLocalSearchParams<{ lectureId: string }>();
  const router = useRouter();

  const [type, setType] = useState('note');
  const [content, setContent] = useState('');

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter note content.');
      return;
    }

    try {
      const noteId = Crypto.randomUUID();
      const reviewableId = Crypto.randomUUID();
      const nowStr = new Date().toISOString();

      const card = newCard();

      // Insert note
      await db.insert(schema.noteItems).values({
        id: noteId,
        lectureId: lectureId!,
        type,
        content,
        createdAt: nowStr,
      });

      // Insert reviewable item
      await db.insert(schema.reviewableItems).values({
        id: reviewableId,
        userId: useAuthStore.getState().user?.id ?? 'temp_user_id',
        itemType: 'note',
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

      // Link note to reviewable
      await db.insert(schema.noteReviewable).values({
        reviewableId,
        noteId,
      });

      Alert.alert('Success', 'Note added successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error('Failed to save note:', err);
      Alert.alert('Error', 'Failed to save note. Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScreenHeader
        title="Add Note"
        subtitle="Write a personal note or recurring question"
        icon={<Edit3Icon size={20} color="#0d9488" />}
      />

      <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
        <View className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
          


          <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Content</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Type your notes here..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 mb-4 h-48"
          />

          <TouchableOpacity
            onPress={handleSave}
            className="bg-teal-600 flex-row items-center justify-center p-4 rounded-xl mt-2"
          >
            <SaveIcon size={20} color="white" className="mr-2" />
            <Text className="text-white font-bold text-lg">Save Note</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
