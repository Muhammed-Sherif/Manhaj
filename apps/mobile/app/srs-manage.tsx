import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ScreenHeader, LoadingView } from '../components';
import { Trash2Icon, PlusIcon, FlagIcon } from 'lucide-react-native';
import { db } from '../services/database';
import * as schema from '../db/schema';
import { eq, isNull } from 'drizzle-orm';
import { useAuthStore } from '../store/authStore';
import { StudentContentService } from '../services/studentContentService';

export default function SrsManageScreen() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    try {
      setLoading(true);
      const userId = useAuthStore.getState().user?.id ?? 'temp_user_id';
      
      const reviewables = await db.select().from(schema.reviewableItems)
        .where(eq(schema.reviewableItems.userId, userId));

      const reviewableMap = new Map(reviewables.map(r => [r.id, r]));

      // 1. Questions
      const qrRows = await db.select({
        reviewableId: schema.questionReviewable.reviewableId,
        questionText: schema.questions.questionText
      })
      .from(schema.questionReviewable)
      .innerJoin(schema.questions, eq(schema.questionReviewable.questionId, schema.questions.id));

      // 2. Cases
      const crRows = await db.select({
        reviewableId: schema.caseReviewable.reviewableId,
        caseId: schema.caseItems.id,
        title: schema.caseItems.title,
        content: schema.caseItems.content
      })
      .from(schema.caseReviewable)
      .innerJoin(schema.caseItems, eq(schema.caseReviewable.caseId, schema.caseItems.id));

      // 3. Notes
      const nrRows = await db.select({
        reviewableId: schema.noteReviewable.reviewableId,
        noteId: schema.noteItems.id,
        content: schema.noteItems.content,
        type: schema.noteItems.type
      })
      .from(schema.noteReviewable)
      .innerJoin(schema.noteItems, eq(schema.noteReviewable.noteId, schema.noteItems.id));

      const combined = [];
      
      for (const row of qrRows) {
        if (reviewableMap.has(row.reviewableId)) {
          combined.push({
            ...reviewableMap.get(row.reviewableId),
            contentPreview: row.questionText,
            deleteType: 'question'
          });
        }
      }

      for (const row of crRows) {
        if (reviewableMap.has(row.reviewableId)) {
          combined.push({
            ...reviewableMap.get(row.reviewableId),
            contentPreview: row.title + ': ' + row.content,
            deleteType: 'case',
            targetId: row.caseId
          });
        }
      }

      for (const row of nrRows) {
        if (reviewableMap.has(row.reviewableId)) {
          combined.push({
            ...reviewableMap.get(row.reviewableId),
            contentPreview: row.type.toUpperCase() + ': ' + row.content,
            deleteType: 'note',
            targetId: row.noteId
          });
        }
      }
      
      combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setItems(combined);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [])
  );

  const handleDelete = (item: any) => {
    Alert.alert(
      'Remove from SRS',
      'Are you sure you want to remove this item from your reviews? (If it is a custom note/case, it will also be deleted completely).',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              if (item.deleteType === 'question') {
                await db.delete(schema.reviewableItems).where(eq(schema.reviewableItems.id, item.id));
              } else if (item.deleteType === 'case') {
                await StudentContentService.deleteCase(item.targetId);
              } else if (item.deleteType === 'note') {
                await StudentContentService.deleteNote(item.targetId);
              }
              loadItems();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete');
            }
        }}
      ]
    );
  };

  const handleAddCustom = () => {
    Alert.alert(
      'Create Custom Item',
      'What would you like to create? (You can attach images to both).',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Custom Case', onPress: () => router.push('/add-case?studyUnitId=custom') },
        { text: 'Custom Note', onPress: () => router.push('/add-note?studyUnitId=custom&type=note') }
      ]
    );
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScreenHeader
        title="SRS Manager"
        subtitle="Manage all your reviewable items"
        icon={<FlagIcon size={20} color="#f59e0b" />}
      />

      <View className="flex-row p-4 gap-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <TouchableOpacity
          onPress={handleAddCustom}
          className="bg-teal-600 flex-1 flex-row items-center justify-center p-3 rounded-xl shadow-sm"
        >
          <PlusIcon size={18} color="white" />
          <Text className="text-white font-bold ml-2">Create Custom Item</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingView />
      ) : (
        <ScrollView className="flex-1 p-4">
          {items.length === 0 ? (
             <Text className="text-slate-500 text-center mt-10">You have no reviewable items.</Text>
          ) : (
            items.map((item, index) => (
              <View key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl mb-3 shadow-sm border border-slate-100 dark:border-slate-800">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-xs font-semibold text-teal-600 uppercase mb-1">{item.itemType}</Text>
                    <Text className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed" numberOfLines={3}>
                      {item.contentPreview}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(item)} className="p-2 bg-red-50 dark:bg-red-900/20 rounded-full">
                    <Trash2Icon size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
