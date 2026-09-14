import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../components';
import { BookOpenIcon } from 'lucide-react-native';
import { db } from '../../services/database';
import * as schema from '../../db/schema.js';

export default function AzkarIndexScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await db.select().from(schema.zekrCategories);
      setCategories(data);
    } catch (err) {
      console.error('Failed to load azkar categories:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScreenHeader
        title="Azkar & Duas"
        subtitle="Browse Hisn Al-Muslim"
        icon={<BookOpenIcon size={20} color="#0d9488" />}
      />

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0d9488" />
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/azkar/${item.id}`)}
              className="bg-white dark:bg-slate-800 p-4 rounded-xl mb-3 shadow-sm border border-slate-100 dark:border-slate-800 flex-row items-center justify-between"
            >
              <View className="flex-1 mr-4">
                <Text className="text-lg font-bold text-slate-800 dark:text-slate-100">{item.nameEn}</Text>
              </View>
              <Text className="text-2xl text-slate-800 dark:text-slate-100 font-bold text-right" style={{ fontFamily: 'sans-serif' }}>
                {item.nameAr}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
