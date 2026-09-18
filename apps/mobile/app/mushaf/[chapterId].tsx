import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '../../components';
import { BookOpenIcon, CheckCircle2Icon } from 'lucide-react-native';
import { db } from '../../services/database';
import * as schema from '../../db/schema';
import { eq, asc } from 'drizzle-orm';

export default function MushafChapterScreen() {
  const { chapterId, taskId } = useLocalSearchParams();
  const router = useRouter();
  const [chapter, setChapter] = useState<any>(null);
  const [verses, setVerses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (chapterId) {
      loadChapterData();
    }
  }, [chapterId]);

  const loadChapterData = async () => {
    try {
      const ch = await db.select().from(schema.quranChapters).where(eq(schema.quranChapters.id, parseInt(chapterId as string, 10))).limit(1);
      if (ch.length > 0) setChapter(ch[0]);

      const v = await db.select()
        .from(schema.quranVerses)
        .where(eq(schema.quranVerses.chapterId, parseInt(chapterId as string, 10)))
        .orderBy(asc(schema.quranVerses.ayaNumber));
      setVerses(v);
    } catch (err) {
      console.error('Failed to load verses:', err);
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
        title={chapter ? chapter.nameEn : 'Loading...'}
        subtitle={chapter ? chapter.nameAr : ''}
        icon={<BookOpenIcon size={20} color="#0d9488" />}
      />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View className="mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-amber-100 dark:border-slate-700">
            <Text className="text-right text-2xl leading-[48px] text-slate-800 dark:text-slate-100" style={{ fontFamily: 'sans-serif' }}>
              {verses.map(item => (
                <Text key={item.id.toString()}>
                  {item.textAr} <Text className="text-teal-600 text-lg">﴿{item.ayaNumber}﴾</Text>{' '}
                </Text>
              ))}
            </Text>
          </View>
          
          <TouchableOpacity
            className="bg-teal-600 gap-2 p-4 rounded-xl items-center mt-4 mb-8 flex-row justify-center"
            onPress={handleFinish}
          >
            <CheckCircle2Icon size={24} color="#ffffff" className="mr-2" />
            <Text className="text-white font-bold text-lg">Finish Reading</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}
