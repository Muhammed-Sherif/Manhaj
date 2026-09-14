import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '../../components';
import { BookOpenIcon, PlusIcon, CheckCircle2Icon } from 'lucide-react-native';
import { db } from '../../services/database';
import * as schema from '../../db/schema';
import { eq } from 'drizzle-orm';

export default function AzkarCategoryScreen() {
  const { categoryId, taskId } = useLocalSearchParams();
  const router = useRouter();
  const [category, setCategory] = useState<any>(null);
  const [duas, setDuas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (categoryId) {
      loadCategoryData();
    }
  }, [categoryId]);

  const loadCategoryData = async () => {
    try {
      const cat = await db.select().from(schema.zekrCategories).where(eq(schema.zekrCategories.id, categoryId as string)).limit(1);
      if (cat.length > 0) setCategory(cat[0]);

      const items = await db.select().from(schema.zekrCatalog).where(eq(schema.zekrCatalog.categoryId, categoryId as string));
      setDuas(items);
    } catch (err) {
      console.error('Failed to load duas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (taskId && typeof taskId === 'string') {
      try {
        await db.update(schema.tasks).set({ status: 'done' }).where(eq(schema.tasks.id, taskId));
      } catch (err) {
        console.error('Failed to update task:', err);
      }
    }
    router.back();
  };

  return (
    <View className="flex-1 bg-amber-50 dark:bg-slate-900">
      <ScreenHeader
        title={category ? category.nameEn : 'Loading...'}
        subtitle={category ? category.nameAr : ''}
        icon={<BookOpenIcon size={20} color="#0d9488" />}
      />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : (
        <FlatList
          data={duas}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View className="mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-amber-100 dark:border-slate-700">
              {item.textAr && (
                <Text className="text-right text-2xl leading-[48px] text-slate-800 dark:text-slate-100 mb-4" style={{ fontFamily: 'sans-serif' }}>
                  {item.textAr}
                </Text>
              )}
              {item.textEn && (
                <Text className="text-left text-lg text-slate-600 dark:text-slate-300 mb-4 italic">
                  {item.textEn}
                </Text>
              )}
              <View className="flex-row justify-between items-center mt-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                <Text className="text-slate-500 font-bold">Repeat: {item.repeatCount || 1}</Text>
                
                <TouchableOpacity
                  className="bg-teal-100 dark:bg-teal-900/40 px-3 py-1.5 rounded-full flex-row items-center"
                  onPress={() => router.push('/add-task')}
                >
                  <PlusIcon size={16} color="#0d9488" />
                  <Text className="text-teal-700 dark:text-teal-400 font-bold ml-1">Add to Tasks</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListFooterComponent={() => (
            <TouchableOpacity
              className="bg-teal-600 p-4 gap-2 rounded-xl items-center mt-4 mb-8 flex-row justify-center"
              onPress={handleFinish}
            >
              <CheckCircle2Icon size={24} color="#ffffff" className="mr-2" />
              <Text className="text-white font-bold text-lg">Finish Reading</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
