import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components';
import { BookOpenIcon } from 'lucide-react-native';
import { db } from '../../services/database';
import * as schema from '../../db/schema.js';

export default function MushafIndexScreen() {
  const router = useRouter();
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    try {
      const data = await db.select().from(schema.quranChapters);
      setChapters(data);
    } catch (err) {
      console.error('Failed to load chapters:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScreenHeader
        title="Al-Mushaf"
        subtitle="Read the Holy Quran"
        icon={<BookOpenIcon size={20} color="#0d9488" />}
      />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : (
        <FlatList
          data={chapters}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/mushaf/${item.id}`)}
              className="bg-white dark:bg-slate-800 p-4 rounded-xl mb-3 shadow-sm border border-slate-100 dark:border-slate-800 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-teal-50 dark:bg-teal-900/30 items-center justify-center mr-4">
                  <Text className="text-teal-700 dark:text-teal-400 font-bold">{item.id}</Text>
                </View>
                <View>
                  <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">{item.nameEn}</Text>
                  <Text className="text-sm text-slate-500">{item.versesCount} Verses</Text>
                </View>
              </View>
              <Text className="text-2xl text-slate-800 dark:text-slate-100 font-bold">{item.nameAr}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
