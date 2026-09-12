import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '../components';
import { Edit3Icon, SaveIcon } from 'lucide-react-native';
import { db } from '../services/database';
import * as schema from '../db/schema';
import * as Crypto from 'expo-crypto';
import { calculateSM2 } from '../utils/sm2';

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

      // Default SM-2 properties
      const sm2Initial = calculateSM2(4, {
        repetitionCount: 0,
        easeFactor: 2.5,
        interval: 0,
      });

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
        itemType: 'note',
        interval: sm2Initial.interval,
        easeFactor: sm2Initial.easeFactor,
        repetitionCount: sm2Initial.repetitionCount,
        nextReviewDate: sm2Initial.nextReviewDate.toISOString(),
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
          
          <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Type</Text>
          <View className="flex-row mb-4 space-x-2">
            {['note', 'recurring_question'].map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setType(cat)}
                className={`px-4 py-2 rounded-full border ${type === cat ? 'bg-teal-600 border-teal-600' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}
              >
                <Text className={`${type === cat ? 'text-white' : 'text-slate-600 dark:text-slate-300'} font-medium capitalize`}>
                  {cat.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

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
