import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader, ImagePickerField, type PickedImage } from '../components';
import { Edit3Icon, SaveIcon, Trash2Icon } from 'lucide-react-native';
import { db } from '../services/database';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { newCard } from '@manhaj/srs/src/anki';
import { useAuthStore } from '../store/authStore';
import { attachImage } from '../services/imageUploadService';
import { StudentContentService } from '../services/studentContentService';

export default function AddNoteScreen() {
  const { lectureId, noteId, type: presetType } = useLocalSearchParams<{ lectureId: string; noteId?: string; type?: string }>();
  const router = useRouter();

  const [type, setType] = useState(presetType || 'note');
  const [content, setContent] = useState('');
  const [image, setImage] = useState<PickedImage | null>(null);

  useEffect(() => {
    if (noteId) {
      db.select().from(schema.noteItems).where(eq(schema.noteItems.id, noteId)).then(([note]) => {
        if (note) {
          setType(note.type);
          setContent(note.content);
        }
      });
    }
  }, [noteId]);

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please enter note content.');
      return;
    }

    try {
      if (noteId) {
        await StudentContentService.updateNote(noteId as string, content, type);
        Alert.alert('Success', 'Note updated!', [{ text: 'OK', onPress: () => router.back() }]);
        return;
      }

      const noteItemId = Crypto.randomUUID();
      const reviewableId = Crypto.randomUUID();
      const nowStr = new Date().toISOString();

      const card = newCard();

      // Insert note
      await db.insert(schema.noteItems).values({
        id: noteItemId,
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
        nextReviewDate: nowStr,
        createdAt: nowStr,
        updatedAt: nowStr,
      });

      // Link note to reviewable
      await db.insert(schema.noteReviewable).values({
        reviewableId,
        noteId: noteItemId,
      });

      if (image) {
        await attachImage({
          ownerKind: 'note',
          ownerId: noteItemId,
          sourceUri: image.uri,
          mimeType: image.mimeType,
        });
      }

      Alert.alert('Success', 'Note added successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error('Failed to save note:', err);
      Alert.alert('Error', 'Failed to save note. Please try again.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Note',
      'This will permanently remove the note and its SRS card. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await StudentContentService.deleteNote(noteId as string);
              router.back();
            } catch (err) {
              console.error('Failed to delete note:', err);
              Alert.alert('Error', 'Failed to delete note.');
            }
          }
        }
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScreenHeader
        title={noteId ? (type === 'summary' ? 'Edit Summary' : 'Edit Note') : (type === 'summary' ? 'Add Summary' : 'Add Note')}
        subtitle={type === 'summary' ? 'A personal study summary for this lecture' : 'Write a personal note or recurring question'}
        icon={<Edit3Icon size={20} color="#0d9488" />}
      />

      <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
        <View className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">

          <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Content</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder={type === 'summary' ? 'Write your lecture summary here...' : 'Type your notes here...'}
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 mb-4 h-48"
          />

          {type !== 'summary' && <ImagePickerField value={image} onChange={setImage} />}

          <TouchableOpacity
            onPress={handleSave}
            className="bg-teal-600 flex-row items-center gap-2 justify-center p-4 rounded-xl mt-2"
          >
            <SaveIcon size={20} color="white" className="mr-2" />
            <Text className="text-white font-bold text-lg">{noteId ? 'Save Changes' : (type === 'summary' ? 'Save Summary' : 'Save Note')}</Text>
          </TouchableOpacity>

          {!!noteId && (
            <TouchableOpacity
              onPress={handleDelete}
              className="flex-row items-center gap-2 justify-center p-4 rounded-xl mt-3 border border-red-300 dark:border-red-800"
            >
              <Trash2Icon size={18} color="#ef4444" />
              <Text className="text-red-500 font-semibold">Delete {type === 'summary' ? 'Summary' : 'Note'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
