import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '../../components';
import { BookOpenIcon, CheckSquareIcon, CheckCircle2Icon } from 'lucide-react-native';
import { db } from '../../services/database';
import * as schema from '../../db/schema';
import { inArray, between, asc, eq } from 'drizzle-orm';

export default function MushafRangeScreen() {
  const { start, end, startPage, endPage, mode, taskId } = useLocalSearchParams();
  const router = useRouter();
  const [verses, setVerses] = useState<any[]>([]);
  const [chapters, setChapters] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mode === 'by_pages' && startPage && endPage) {
      loadRangeByPages();
    } else if (start && end) {
      loadRangeByAyat();
    }
  }, [start, end, startPage, endPage, mode]);

  const loadRangeByPages = async () => {
    try {
      // Load all verses in the page range
      const v = await db.select().from(schema.quranVerses).where(
        between(schema.quranVerses.page, parseInt(startPage as string, 10), parseInt(endPage as string, 10))
      ).orderBy(asc(schema.quranVerses.chapterId), asc(schema.quranVerses.ayaNumber));
      setVerses(v);

      if (v.length > 0) {
        const chapterIds = [...new Set(v.map(verse => verse.chapterId))];
        const ch = await db.select().from(schema.quranChapters).where(inArray(schema.quranChapters.id, chapterIds));
        const chapterMap = ch.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {});
        setChapters(chapterMap);
      }
    } catch (err) {
      console.error('Failed to load verses by pages:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRangeByAyat = async () => {
    try {
      const boundaryVerses = await db.select().from(schema.quranVerses).where(
        inArray(schema.quranVerses.id, [start as string, end as string])
      );
      
      if (boundaryVerses.length !== 2) return;
      
      const sortedBoundaries = boundaryVerses.sort((a, b) => {
        if (a.chapterId !== b.chapterId) return a.chapterId - b.chapterId;
        return a.ayaNumber - b.ayaNumber;
      });
      
      const startV = sortedBoundaries[0];
      const endV = sortedBoundaries[1];

      const allVerses = await db.select().from(schema.quranVerses).where(
        between(schema.quranVerses.chapterId, startV.chapterId, endV.chapterId)
      ).orderBy(asc(schema.quranVerses.chapterId), asc(schema.quranVerses.ayaNumber));

      const filteredVerses = allVerses.filter(v => {
        if (v.chapterId === startV.chapterId && v.chapterId === endV.chapterId) {
          return v.ayaNumber >= startV.ayaNumber && v.ayaNumber <= endV.ayaNumber;
        }
        if (v.chapterId === startV.chapterId) {
          return v.ayaNumber >= startV.ayaNumber;
        }
        if (v.chapterId === endV.chapterId) {
          return v.ayaNumber <= endV.ayaNumber;
        }
        return true; 
      });

      setVerses(filteredVerses);

      if (filteredVerses.length > 0) {
        const chapterIds = [...new Set(filteredVerses.map(verse => verse.chapterId))];
        const ch = await db.select().from(schema.quranChapters).where(inArray(schema.quranChapters.id, chapterIds));
        const chapterMap = ch.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {});
        setChapters(chapterMap);
      }
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
        title="Wird Task Viewer"
        subtitle="Read your assigned portion"
        icon={<CheckSquareIcon size={20} color="#0d9488" />}
      />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {Object.values(
            verses.reduce((acc, verse) => {
              if (!acc[verse.chapterId]) acc[verse.chapterId] = [];
              acc[verse.chapterId].push(verse);
              return acc;
            }, {} as Record<number, any[]>)
          ).map((chapterVerses: any[]) => {
            const chapterId = chapterVerses[0].chapterId;
            const chapter = chapters[chapterId];
            return (
              <View key={chapterId}>
                {chapter && (
                  <View className="items-center my-6 py-4 border-b border-t border-amber-200 dark:border-amber-800">
                    <Text className="text-xl font-bold text-slate-800 dark:text-slate-200">{chapter.nameEn}</Text>
                    <Text className="text-2xl font-bold text-teal-700 dark:text-teal-500 mt-1">{chapter.nameAr}</Text>
                  </View>
                )}
                <View className="mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-amber-100 dark:border-slate-700">
                  <Text className="text-right text-2xl leading-[48px] text-slate-800 dark:text-slate-100" style={{ fontFamily: 'sans-serif' }}>
                    {chapterVerses.map(item => (
                      <Text key={item.id.toString()}>
                        {item.textAr} <Text className="text-teal-600 text-lg">﴿{item.ayaNumber}﴾</Text>{' '}
                      </Text>
                    ))}
                  </Text>
                </View>
              </View>
            );
          })}
          
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
