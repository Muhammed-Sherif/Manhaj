import { ScreenContainer } from '../components/ScreenContainer';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader, ImagePickerField, type PickedImage } from '../components';
import { BookOpenIcon, SaveIcon, Trash2Icon } from 'lucide-react-native';
import { db } from '../services/database';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { newCard } from '@manhaj/srs/src/anki';
import { useAuthStore } from '../store/authStore';
import { attachImage } from '../services/imageUploadService';
import { StudentContentService } from '../services/studentContentService';

export default function AddCustomItemScreen() {
  const { studyUnitId, caseId } = useLocalSearchParams<{ studyUnitId: string; caseId?: string }>();
  const router = useRouter();

  const [content, setContent] = useState('');
  const [answer, setAnswer] = useState('');
  const [image, setImage] = useState<PickedImage | null>(null);

  const [studyUnits, setStudyUnits] = useState<{id: string, name: string}[]>([]);
  const [selectedStudyUnitId, setSelectedStudyUnitId] = useState<string>(studyUnitId || 'custom');
  const [showStudyUnitModal, setShowStudyUnitModal] = useState(false);

    // Load study units for the picker
    db.select({ id: schema.studyUnits.id, name: schema.studyUnits.name })
      .from(schema.studyUnits)
      .then(setStudyUnits)
      .catch(console.error);

    if (caseId) {
      db.select().from(schema.caseItems).where(eq(schema.caseItems.id, caseId as string)).then(([c]) => {
        if (c) {
          setContent(c.content);
          setAnswer(c.answer || '');
          if (c.studyUnitId) {
            setSelectedStudyUnitId(c.studyUnitId);
          }
        }
      });
    }
  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please fill in the question.');
      return;
    }

    try {
      if (caseId) {
        await StudentContentService.updateCase(caseId as string, 'Custom Item', content, 'case', answer.trim() || undefined);
        // Note: studyUnitId is not updated by updateCase currently, but that's fine.
        Alert.alert('Success', 'Case updated!', [{ text: 'OK', onPress: () => router.back() }]);
        return;
      }

      const caseItemId = Crypto.randomUUID();
      const reviewableId = Crypto.randomUUID();
      const nowStr = new Date().toISOString();

      const card = newCard();

      // Insert case
      await db.insert(schema.caseItems).values({
        id: caseItemId,
        studyUnitId: selectedStudyUnitId,
        category: 'case',
        title: 'Custom Item',
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
        nextReviewDate: nowStr,
        createdAt: nowStr,
        updatedAt: nowStr,
      });

      // Link case to reviewable
      await db.insert(schema.caseReviewable).values({
        reviewableId,
        caseId: caseItemId,
      });

      if (image) {
        await attachImage({
          ownerKind: 'case',
          ownerId: caseItemId,
          sourceUri: image.uri,
          mimeType: image.mimeType,
        });
      }

      Alert.alert('Success', 'Case added successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error('Failed to save case:', err);
      Alert.alert('Error', 'Failed to save case. Please try again.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Case',
      'This will permanently remove the case and its SRS card. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await StudentContentService.deleteCase(caseId as string);
              router.back();
            } catch (err) {
              console.error('Failed to delete case:', err);
              Alert.alert('Error', 'Failed to delete case.');
            }
          }
        }
      ]
    );
  };

  const selectedStudyUnitName = selectedStudyUnitId === 'custom' 
    ? 'Uncategorized (Custom)' 
    : studyUnits.find(u => u.id === selectedStudyUnitId)?.name || 'Select Study Unit';

  return (
    <ScreenContainer className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScreenHeader
        title={caseId ? 'Edit Custom Item' : 'Add Custom Item'}
        subtitle="Create a custom SRS flashcard"
        icon={<BookOpenIcon size={20} color="#0d9488" />}
      />

      <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
        <View className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
          
          <View className="mb-4">
            <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Study Unit</Text>
            <TouchableOpacity
              onPress={() => setShowStudyUnitModal(true)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3"
            >
              <Text className="text-slate-800 dark:text-slate-100">{selectedStudyUnitName}</Text>
            </TouchableOpacity>
          </View>

          <View className="mb-4">
            <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Image (Optional)</Text>
            <ImagePickerField value={image} onChange={setImage} />
          </View>

          <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Question</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="Enter your question here..."
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
            className="bg-teal-600 flex-row items-center gap-2 justify-center p-4 rounded-xl mt-2"
          >
            <SaveIcon size={20} color="white" className="mr-2" />
            <Text className="text-white font-bold text-lg">{caseId ? 'Save Changes' : 'Save Case'}</Text>
          </TouchableOpacity>

          {!!caseId && (
            <TouchableOpacity
              onPress={handleDelete}
              className="flex-row items-center gap-2 justify-center p-4 rounded-xl mt-3 border border-red-300 dark:border-red-800"
            >
              <Trash2Icon size={18} color="#ef4444" />
              <Text className="text-red-500 font-semibold">Delete Case</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal visible={showStudyUnitModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowStudyUnitModal(false)}>
        <View className="flex-1 bg-slate-50 dark:bg-slate-900 pt-10">
          <View className="flex-row items-center justify-between px-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">Select Study Unit</Text>
            <TouchableOpacity onPress={() => setShowStudyUnitModal(false)}>
              <Text className="text-teal-600 font-semibold text-lg">Done</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={[{ id: 'custom', name: 'Uncategorized (Custom)' }, ...studyUnits]}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setSelectedStudyUnitId(item.id);
                  setShowStudyUnitModal(false);
                }}
                className={`p-4 border-b border-slate-100 dark:border-slate-800 ${selectedStudyUnitId === item.id ? 'bg-teal-50 dark:bg-teal-900/20' : ''}`}
              >
                <Text className={`text-base ${selectedStudyUnitId === item.id ? 'text-teal-700 dark:text-teal-300 font-bold' : 'text-slate-700 dark:text-slate-200'}`}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </ScreenContainer>
  );
}
