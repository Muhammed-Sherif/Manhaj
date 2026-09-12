import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../components';
import { CircleIcon, CheckCircle2Icon, BookOpenIcon, CheckSquareIcon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { db } from '../services/database';
import * as schema from '../db/schema';
import * as Crypto from 'expo-crypto';

export default function AddTaskScreen() {
  const router = useRouter();
  const [taskType, setTaskType] = useState<'zekr' | 'wird' | 'work' | 'study'>('zekr');
  const [recurrence, setRecurrence] = useState<'once' | 'daily' | 'weekly'>('once');
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endTime, setEndTime] = useState<Date>(new Date(new Date().setHours(23, 59, 59, 999)));
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  
  // Wird fields
  const [wirdMode, setWirdMode] = useState<'daily' | 'weekly'>('daily');
  const [startAya, setStartAya] = useState('');
  const [endAya, setEndAya] = useState('');
  const [pageCount, setPageCount] = useState('');

  // Zekr fields
  const [zekrCategories, setZekrCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loadingZekr, setLoadingZekr] = useState(false);

  // Work fields
  const [workCategory, setWorkCategory] = useState<'programming' | 'video_editing'>('programming');
  const [projectName, setProjectName] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [workLink, setWorkLink] = useState('');
  const [workCost, setWorkCost] = useState('');

  // Study fields
  const [studyLectures, setStudyLectures] = useState<any[]>([]);
  const [studyLectureId, setStudyLectureId] = useState('');
  const [studyActivityType, setStudyActivityType] = useState<'watch' | 'solve' | 'revision'>('watch');

  useEffect(() => {
    if (taskType === 'zekr') {
      loadZekrCategories();
    }
    if (taskType === 'study') {
      db.select().from(schema.lectures).then(setStudyLectures);
    }
  }, [taskType]);

  const loadZekrCategories = async () => {
    try {
      setLoadingZekr(true);
      const categories = await db.select().from(schema.zekrCategories);
      setZekrCategories(categories);
      if (categories.length > 0) {
        setSelectedCategoryId(categories[0].id);
      }
    } catch (err) {
      console.error('Failed to load Zekr categories:', err);
    } finally {
      setLoadingZekr(false);
    }
  };

  const handleSave = async () => {
    try {
      const taskId = Crypto.randomUUID();
      const nowStr = new Date().toISOString();

      // Insert Task Superclass
      await db.insert(schema.tasks).values({
        id: taskId,
        taskType,
        recurrence,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'pending',
        createdAt: nowStr,
      });

      if (taskType === 'wird') {
        if (!startAya || !endAya || !pageCount) {
          Alert.alert('Error', 'Please fill in all wird details');
          return;
        }
        await db.insert(schema.wirdTasks).values({
          taskId,
          wirdMode,
          startAya: parseInt(startAya, 10),
          endAya: parseInt(endAya, 10),
          pageCount: parseInt(pageCount, 10),
        });
      } else if (taskType === 'zekr') {
        if (!selectedCategoryId) {
          Alert.alert('Error', 'Please select a Zekr category');
          return;
        }

        // Fetch all catalog items for this category
        const catalogItems = await db.select().from(schema.zekrCatalog).where(
          require('drizzle-orm').eq(schema.zekrCatalog.categoryId, selectedCategoryId)
        );

        if (catalogItems.length === 0) {
          Alert.alert('Error', 'No items found in this category');
          return;
        }

        // Insert a zekrTasks row for each catalog item
        for (const item of catalogItems) {
          await db.insert(schema.zekrTasks).values({
            id: Crypto.randomUUID(),
            taskId,
            zekrId: item.id,
            zekrCount: item.repeatCount || 1,
            zekrAchievedCount: 0,
          });
        }
      } else if (taskType === 'work') {
        if (!projectName || !workCost) {
          Alert.alert('Error', 'Project name and cost are required for work tasks');
          return;
        }
        await db.insert(schema.workTasks).values({
          taskId,
          category: workCategory,
          projectName,
          description: workDescription || null,
          link: workLink || null,
          cost: parseInt(workCost, 10),
        });
      } else if (taskType === 'study') {
        if (!studyLectureId) {
          Alert.alert('Error', 'Please select a lecture for the study task');
          return;
        }
        await db.insert(schema.studyTasks).values({
          taskId,
          lectureId: studyLectureId,
          activityType: studyActivityType,
        });
      }

      Alert.alert('Success', 'Task added successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error('Failed to save task:', err);
      Alert.alert('Error', 'Failed to save task. Please try again.');
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScreenHeader
        title="Add Task"
        subtitle="Create a new daily or weekly task"
        icon={<CheckSquareIcon size={20} color="#0d9488" />}
      />

      <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
        <View className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800">
          
          <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Task Type</Text>
          <View className="flex-row flex-wrap mb-6 gap-2">
            {['zekr', 'wird', 'work', 'study'].map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setTaskType(type as any)}
                className={`px-4 py-2 rounded-full border ${taskType === type ? 'bg-teal-600 border-teal-600' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}
              >
                <Text className={`${taskType === type ? 'text-white' : 'text-slate-600 dark:text-slate-300'} font-medium capitalize`}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2 mt-4">Recurrence</Text>
          <View className="flex-row flex-wrap mb-4 gap-2">
            {['once', 'daily', 'weekly'].map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setRecurrence(type as any)}
                className={`px-4 py-2 rounded-full border ${recurrence === type ? 'bg-teal-600 border-teal-600' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}
              >
                <Text className={`${recurrence === type ? 'text-white' : 'text-slate-600 dark:text-slate-300'} font-medium capitalize`}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View className="flex-row justify-between mb-6">
            <View className="flex-1 mr-2">
              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Start Time</Text>
              <TouchableOpacity
                onPress={() => setShowStartTimePicker(true)}
                className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <Text className="text-slate-800 dark:text-slate-200">
                  {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              {showStartTimePicker && (
                <DateTimePicker
                  value={startTime}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowStartTimePicker(false);
                    if (selectedDate) setStartTime(selectedDate);
                  }}
                />
              )}
            </View>

            <View className="flex-1 ml-2">
              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">End Time</Text>
              <TouchableOpacity
                onPress={() => setShowEndTimePicker(true)}
                className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <Text className="text-slate-800 dark:text-slate-200">
                  {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
              {showEndTimePicker && (
                <DateTimePicker
                  value={endTime}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowEndTimePicker(false);
                    if (selectedDate) setEndTime(selectedDate);
                  }}
                />
              )}
            </View>
          </View>

          {taskType === 'wird' && (
            <View>
              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Wird Mode</Text>
              <View className="flex-row mb-4 space-x-2">
                {['daily', 'weekly'].map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setWirdMode(mode as any)}
                    className={`px-4 mr-2 py-2 rounded-full border ${wirdMode === mode ? 'bg-teal-600 border-teal-600' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}
                  >
                    <Text className={`${wirdMode === mode ? 'text-white' : 'text-slate-600 dark:text-slate-300'} font-medium capitalize`}>
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Start Aya</Text>
              <TextInput
                value={startAya}
                onChangeText={setStartAya}
                placeholder="1"
                keyboardType="numeric"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 mb-4"
              />

              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">End Aya</Text>
              <TextInput
                value={endAya}
                onChangeText={setEndAya}
                placeholder="10"
                keyboardType="numeric"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 mb-4"
              />

              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Page Count</Text>
              <TextInput
                value={pageCount}
                onChangeText={setPageCount}
                placeholder="1"
                keyboardType="numeric"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 mb-4"
              />
            </View>
          )}

          {taskType === 'zekr' && (
            <View>
              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Select Zekr Category</Text>
              {loadingZekr ? (
                <ActivityIndicator color="#0d9488" className="mb-4" />
              ) : (
                <View className="mb-4 space-y-2">
                  {zekrCategories.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setSelectedCategoryId(item.id)}
                      className={`p-3 rounded-lg border flex-row items-center justify-between ${selectedCategoryId === item.id ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'}`}
                    >
                      <Text className={`font-medium flex-1 ${selectedCategoryId === item.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`}>
                        {item.nameEn}
                      </Text>
                      <Text className={`font-medium ml-2 ${selectedCategoryId === item.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`} style={{ fontFamily: 'sans-serif' }}>
                        {item.nameAr}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {zekrCategories.length === 0 && (
                    <Text className="text-slate-500 text-center py-2">No categories available.</Text>
                  )}
                </View>
              )}
            </View>
          )}

          {taskType === 'work' && (
            <View>
              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Category</Text>
              <View className="flex-row mb-4 space-x-2">
                {['programming', 'video_editing'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setWorkCategory(type as any)}
                    className={`px-4 py-2 mr-2 rounded-full border ${workCategory === type ? 'bg-teal-600 border-teal-600' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}
                  >
                    <Text className={`${workCategory === type ? 'text-white' : 'text-slate-600 dark:text-slate-300'} font-medium capitalize`}>
                      {type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Project Name</Text>
              <TextInput
                value={projectName}
                onChangeText={setProjectName}
                placeholder="e.g. Manhaj App"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 mb-4"
              />

              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Cost / Budget</Text>
              <TextInput
                value={workCost}
                onChangeText={setWorkCost}
                placeholder="e.g. 500"
                keyboardType="numeric"
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 mb-4"
              />

              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Link (Optional)</Text>
              <TextInput
                value={workLink}
                onChangeText={setWorkLink}
                placeholder="e.g. https://github.com/..."
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 mb-4"
              />

              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Description (Optional)</Text>
              <TextInput
                value={workDescription}
                onChangeText={setWorkDescription}
                placeholder="Describe the task..."
                multiline
                numberOfLines={3}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 mb-4"
              />
            </View>
          )}

          {taskType === 'study' && (
            <View>
              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Select Lecture</Text>
              {studyLectures.length === 0 ? (
                <Text className="text-slate-500 mb-4">No lectures found.</Text>
              ) : (
                <View className="mb-4 space-y-2">
                  {studyLectures.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setStudyLectureId(item.id)}
                      className={`p-3 rounded-lg border ${studyLectureId === item.id ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'}`}
                    >
                      <Text className={`font-medium ${studyLectureId === item.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`}>
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Activity Type</Text>
              <View className="flex-row mb-6 space-x-2">
                {['watch', 'solve', 'revision'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setStudyActivityType(type as any)}
                    className={`px-4 py-2 mr-2 rounded-full border ${studyActivityType === type ? 'bg-teal-600 border-teal-600' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}
                  >
                    <Text className={`${studyActivityType === type ? 'text-white' : 'text-slate-600 dark:text-slate-300'} font-medium capitalize`}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={handleSave}
            className="bg-teal-600 gap-2 flex-row items-center justify-center p-4 rounded-xl mt-2 mb-8"
          >
            <SaveIcon size={20} color="white" className="mr-2" />
            <Text className="text-white font-bold text-lg">Create Task</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
