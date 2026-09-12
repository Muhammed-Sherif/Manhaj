import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '../../../services/database';
import * as schema from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { ChevronLeftIcon, CheckCircle2Icon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function ZekrSessionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  const [duas, setDuas] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadSession();
  }, [id]);

  const loadSession = async () => {
    if (!id || typeof id !== 'string') return;
    try {
      setLoading(true);
      // Fetch zekrTasks and join with zekrCatalog
      const rows = await db.select({
        zekrTaskId: schema.zekrTasks.id,
        zekrId: schema.zekrTasks.zekrId,
        zekrCount: schema.zekrTasks.zekrCount,
        zekrAchievedCount: schema.zekrTasks.zekrAchievedCount,
        textAr: schema.zekrCatalog.textAr,
        textEn: schema.zekrCatalog.textEn,
        transliteration: schema.zekrCatalog.transliteration,
        virtue: schema.zekrCatalog.virtue,
        source: schema.zekrCatalog.source,
      })
      .from(schema.zekrTasks)
      .leftJoin(schema.zekrCatalog, eq(schema.zekrTasks.zekrId, schema.zekrCatalog.id))
      .where(eq(schema.zekrTasks.taskId, id));

      if (rows.length === 0) {
        Alert.alert('Error', 'No Zekr found for this task.');
        router.back();
        return;
      }

      setDuas(rows);
      
      // Find first uncompleted dua
      const firstUncompletedIndex = rows.findIndex(r => (r.zekrAchievedCount || 0) < (r.zekrCount || 1));
      
      if (firstUncompletedIndex === -1) {
        // Already fully complete
        Alert.alert('Completed', 'This task is already finished!');
        router.back();
      } else {
        setCurrentIndex(firstUncompletedIndex);
        setCurrentCount(rows[firstUncompletedIndex].zekrAchievedCount || 0);
      }
    } catch (err) {
      console.error('Failed to load Zekr session:', err);
      Alert.alert('Error', 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const handleTap = async () => {
    if (loading || duas.length === 0) return;
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Animate button
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      })
    ]).start();

    const currentDua = duas[currentIndex];
    const targetCount = currentDua.zekrCount || 1;
    const newCount = currentCount + 1;

    // Save achieved count continuously for safety
    try {
      await db.update(schema.zekrTasks)
        .set({ zekrAchievedCount: newCount })
        .where(eq(schema.zekrTasks.id, currentDua.zekrTaskId));
    } catch (err) {
      console.error('Failed to save progress:', err);
    }

    if (newCount >= targetCount) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (currentIndex + 1 < duas.length) {
        // Move to next dua
        setCurrentIndex(currentIndex + 1);
        setCurrentCount(duas[currentIndex + 1].zekrAchievedCount || 0);
      } else {
        // Finished all!
        setCurrentCount(newCount);
        completeTask();
      }
    } else {
      setCurrentCount(newCount);
    }
  };

  const completeTask = async () => {
    if (!id || typeof id !== 'string') return;
    try {
      await db.update(schema.tasks)
        .set({ status: 'done' })
        .where(eq(schema.tasks.id, id));
        
      Alert.alert('Mashallah!', 'You have completed this Adhkar session.', [
        { text: 'Alhamdulillah', onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 dark:bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  if (duas.length === 0) return null;

  const currentDua = duas[currentIndex];
  const targetCount = currentDua?.zekrCount || 1;

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <View className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex-row items-center pt-12">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-slate-200 dark:active:bg-slate-800">
          <ChevronLeftIcon size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="text-slate-800 dark:text-slate-100 text-lg font-semibold ml-2">Adhkar Session</Text>
      </View>

      {/* Progress Bar */}
      <View className="h-1 bg-slate-200 dark:bg-slate-800 w-full">
        <View 
          className="h-full bg-teal-600" 
          style={{ width: `${(currentIndex / duas.length) * 100}%` }} 
        />
      </View>

      <View className="flex-1 p-6 items-center justify-center">
        <Text className="text-slate-500 dark:text-slate-400 font-medium mb-6">
          Dua {currentIndex + 1} of {duas.length}
        </Text>

        {/* Text Container */}
        <View className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm w-full mb-8">
          <Text className="text-slate-800 dark:text-slate-100 text-2xl text-center leading-loose mb-6" style={{ fontFamily: 'sans-serif' }}>
            {currentDua?.textAr}
          </Text>
          <Text className="text-slate-600 dark:text-slate-300 text-base text-center leading-relaxed">
            {currentDua?.textEn}
          </Text>
        </View>

        {/* Tap Area */}
        <TouchableOpacity 
          activeOpacity={1} 
          onPress={handleTap}
          className="items-center justify-center"
        >
          <Animated.View 
            style={{ transform: [{ scale: scaleAnim }] }}
            className="w-40 h-40 rounded-full bg-teal-50 dark:bg-teal-900/30 border-4 border-teal-500 items-center justify-center shadow-lg"
          >
            <Text className="text-teal-700 dark:text-teal-400 text-4xl font-bold">
              {currentCount}
            </Text>
            <Text className="text-teal-600/70 dark:text-teal-400/70 font-medium mt-1">
              of {targetCount}
            </Text>
          </Animated.View>
        </TouchableOpacity>
        
        <Text className="text-slate-400 dark:text-slate-500 mt-6 text-sm">
          Tap the circle to count
        </Text>
      </View>
    </View>
  );
}
