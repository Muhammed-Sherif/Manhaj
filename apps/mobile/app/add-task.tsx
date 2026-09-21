import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../components';
import { CircleIcon, CheckCircle2Icon, BookOpenIcon, CheckSquareIcon, SaveIcon, ChevronRightIcon, CheckIcon, Edit2Icon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Modal from '../components/Modal';
import { db } from '../services/database';
import * as schema from '../db/schema';
import * as Crypto from 'expo-crypto';
import { formatTime } from '../utils/format';

export default function AddTaskScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [taskType, setTaskType] = useState<'zekr' | 'wird' | 'work' | 'study'>('zekr');
  const [recurrence, setRecurrence] = useState<'once' | 'daily' | 'weekly'>('daily');
  const [startTime, setStartTime] = useState(new Date(new Date().setHours(5, 0, 0, 0)));
  const [endTime, setEndTime] = useState(new Date(new Date().setHours(6, 0, 0, 0)));
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Wird fields
  const [wirdMode, setWirdMode] = useState<'by_ayat' | 'by_pages'>('by_ayat');

  // by_pages
  const [startPage, setStartPage] = useState('');
  const [endPage, setEndPage] = useState('');

  // by_ayat
  const [quranChapters, setQuranChapters] = useState<any[]>([]);
  const [startChapterId, setStartChapterId] = useState<number | null>(null);
  const [startChapterVerses, setStartChapterVerses] = useState<any[]>([]);
  const [startVerseId, setStartVerseId] = useState<string | null>(null);

  const [endChapterId, setEndChapterId] = useState<number | null>(null);
  const [endChapterVerses, setEndChapterVerses] = useState<any[]>([]);
  const [endVerseId, setEndVerseId] = useState<string | null>(null);

  // Zekr State
  const [zekrCategories, setZekrCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [selectedZekrId, setSelectedZekrId] = useState<string | null>(null);
  const [loadingZekr, setLoadingZekr] = useState(false);
  const [showZekrCategoryModal, setShowZekrCategoryModal] = useState(false);
  const [showZekrDuaModal, setShowZekrDuaModal] = useState(false);

  // Wird selection modal state
  const [showStartSurahModal, setShowStartSurahModal] = useState(false);
  const [showStartAyahModal, setShowStartAyahModal] = useState(false);
  const [showEndSurahModal, setShowEndSurahModal] = useState(false);
  const [showEndAyahModal, setShowEndAyahModal] = useState(false);

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
  const [showLectureModal, setShowLectureModal] = useState(false);

  useEffect(() => {
    if (taskType === 'zekr') {
      loadZekrCategories();
    }
    if (taskType === 'study') {
      db.select().from(schema.lectures).then(setStudyLectures);
    }
    if (taskType === 'wird') {
      db.select().from(schema.quranChapters).then(setQuranChapters);
    }
  }, [taskType]);

  useEffect(() => {
    if (id) {
      loadExistingTask(id as string);
    }
  }, [id]);

  const loadExistingTask = async (taskId: string) => {
    try {
      const [task] = await db.select().from(schema.tasks).where(require('drizzle-orm').eq(schema.tasks.id, taskId));
      if (!task) return;

      setTaskType(task.taskType as any);
      setRecurrence(task.recurrence as any);
      if (task.startTime) setStartTime(new Date(task.startTime));
      if (task.endTime) setEndTime(new Date(task.endTime));

      if (task.taskType === 'zekr') {
        const [zekrData] = await db.select().from(schema.zekrTasks).where(require('drizzle-orm').eq(schema.zekrTasks.taskId, taskId));
        if (zekrData) {
          if (zekrData.categoryId) setSelectedCategoryId(zekrData.categoryId);
          if (zekrData.zekrId) setSelectedZekrId(zekrData.zekrId);
        }
      } else if (task.taskType === 'wird') {
        const [wirdData] = await db.select().from(schema.wirdTasks).where(require('drizzle-orm').eq(schema.wirdTasks.taskId, taskId));
        if (wirdData) {
          setWirdMode(wirdData.wirdMode as any);
          if (wirdData.wirdMode === 'by_pages') {
            setStartPage(wirdData.startPage?.toString() || '');
            setEndPage(wirdData.endPage?.toString() || '');
          } else {
            setStartVerseId(wirdData.startVerseId || null);
            setEndVerseId(wirdData.endVerseId || null);
          }
        }
      } else if (task.taskType === 'work') {
        const [workData] = await db.select().from(schema.workTasks).where(require('drizzle-orm').eq(schema.workTasks.taskId, taskId));
        if (workData) {
          setWorkCategory(workData.category as any);
          setProjectName(workData.projectName || '');
          setWorkCost(workData.cost?.toString() || '');
          setWorkLink(workData.link || '');
          setWorkDescription(workData.description || '');
        }
      } else if (task.taskType === 'study') {
        const [studyData] = await db.select().from(schema.studyTasks).where(require('drizzle-orm').eq(schema.studyTasks.taskId, taskId));
        if (studyData) {
          setStudyLectureId(studyData.lectureId || '');
          setStudyActivityType(studyData.activityType as any);
        }
      }
    } catch (err) {
      console.error('Failed to load existing task:', err);
    }
  };

  useEffect(() => {
    if (startChapterId) {
      db.select()
        .from(schema.quranVerses)
        .where(require('drizzle-orm').eq(schema.quranVerses.chapterId, startChapterId))
        .orderBy(require('drizzle-orm').asc(schema.quranVerses.ayaNumber))
        .then(setStartChapterVerses);
      setStartVerseId(null);
    } else {
      setStartChapterVerses([]);
      setStartVerseId(null);
    }
  }, [startChapterId]);

  useEffect(() => {
    if (endChapterId) {
      db.select()
        .from(schema.quranVerses)
        .where(require('drizzle-orm').eq(schema.quranVerses.chapterId, endChapterId))
        .orderBy(require('drizzle-orm').asc(schema.quranVerses.ayaNumber))
        .then(setEndChapterVerses);
      setEndVerseId(null);
    } else {
      setEndChapterVerses([]);
      setEndVerseId(null);
    }
  }, [endChapterId]);

  const loadZekrCategories = async () => {
    try {
      setLoadingZekr(true);
      const categories = await db.select().from(schema.zekrCategories);
      setZekrCategories(categories);
      if (categories.length > 0) {
        // Auto-select first category and preload its items
        await handleCategorySelect(categories[0].id);
      }
    } catch (err) {
      console.error('Failed to load Zekr categories:', err);
    } finally {
      setLoadingZekr(false);
    }
  };

  const handleCategorySelect = async (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedZekrId(null); // reset dua selection when category changes
    try {
      const items = await db.select().from(schema.zekrCatalog).where(
        require('drizzle-orm').eq(schema.zekrCatalog.categoryId, categoryId)
      );
      setCatalogItems(items);
    } catch (err) {
      console.error('Failed to load catalog items:', err);
    }
  };

  const handleSave = async () => {
    try {
      const taskId = id ? (id as string) : Crypto.randomUUID();
      const nowStr = new Date().toISOString();

      const taskData = {
        taskType,
        recurrence,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'pending' as const,
        updatedAt: nowStr,
      };

      if (id) {
        await db.update(schema.tasks)
          .set(taskData)
          .where(require('drizzle-orm').eq(schema.tasks.id, taskId));

        // Delete old subclass rows to start fresh for this task
        await db.delete(schema.zekrTasks).where(require('drizzle-orm').eq(schema.zekrTasks.taskId, taskId));
        await db.delete(schema.wirdTasks).where(require('drizzle-orm').eq(schema.wirdTasks.taskId, taskId));
        await db.delete(schema.workTasks).where(require('drizzle-orm').eq(schema.workTasks.taskId, taskId));
        await db.delete(schema.studyTasks).where(require('drizzle-orm').eq(schema.studyTasks.taskId, taskId));
      } else {
        await db.insert(schema.tasks).values({
          id: taskId,
          ...taskData,
          createdAt: nowStr,
        });
      }

      if (taskType === 'wird') {
        if (wirdMode === 'by_pages') {
          if (!startPage || !endPage) {
            Alert.alert('Error', 'Please fill in both start and end pages');
            return;
          }
          const startP = parseInt(startPage, 10);
          const endP = parseInt(endPage, 10);
          if (startP < 1 || endP > 604 || startP > endP) {
            Alert.alert('Error', 'Invalid page range (1-604)');
            return;
          }
          await db.insert(schema.wirdTasks).values({
            taskId,
            wirdMode: 'by_pages',
            startPage: startP,
            endPage: endP,
            lastAchievedPage: startP - 1, // Progress starts right before the start page
          });
        } else {
          if (!startVerseId || !endVerseId) {
            Alert.alert('Error', 'Please select both start and end verses');
            return;
          }
          await db.insert(schema.wirdTasks).values({
            taskId,
            wirdMode: 'by_ayat',
            startVerseId,
            endVerseId,
          });
        }
      } else if (taskType === 'zekr') {
        if (!selectedCategoryId) {
          Alert.alert('Error', 'Please select a Zekr category');
          return;
        }
        // Single row: whole category (categoryId) or one specific dua (zekrId)
        await db.insert(schema.zekrTasks).values({
          taskId,
          categoryId: selectedZekrId ? null : selectedCategoryId,
          zekrId: selectedZekrId,
        });
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
  // ── Derived display values for the picker rows ─────────────────────────────
  const selectedCategory = zekrCategories.find((c) => c.id === selectedCategoryId);
  const startChapter = quranChapters.find((c) => c.id === startChapterId);
  const endChapter = quranChapters.find((c) => c.id === endChapterId);
  const startVerse = startChapterVerses.find((v) => v.id === startVerseId);
  const endVerse = endChapterVerses.find((v) => v.id === endVerseId);

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <ScreenHeader
        title={id ? "Edit Task" : "Add Task"}
        subtitle={id ? "Update your existing task" : "Create a new daily or weekly task"}
        icon={id ? <Edit2Icon size={20} color="#0d9488" /> : <CheckSquareIcon size={20} color="#0d9488" />}
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
                  {formatTime(startTime)}
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
                    if (event.type === 'set' && selectedDate) setStartTime(selectedDate);
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
                  {formatTime(endTime)}
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
                    if (event.type === 'set' && selectedDate) setEndTime(selectedDate);
                  }}
                />
              )}
            </View>
          </View>

          {taskType === 'wird' && (
            <View>
              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Mode</Text>
              <View className="flex-row mb-6 space-x-2">
                {['by_ayat', 'by_pages'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setWirdMode(type as any)}
                    className={`px-4 py-2 mr-2 rounded-full border ${wirdMode === type ? 'bg-teal-600 border-teal-600' : 'bg-transparent border-slate-300 dark:border-slate-600'}`}
                  >
                    <Text className={`${wirdMode === type ? 'text-white' : 'text-slate-600 dark:text-slate-300'} font-medium capitalize`}>
                      {type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {wirdMode === 'by_pages' ? (
                <View>
                  <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Start Page</Text>
                  <TextInput
                    value={startPage}
                    onChangeText={setStartPage}
                    placeholder="1"
                    keyboardType="numeric"
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 mb-4"
                  />

                  <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">End Page</Text>
                  <TextInput
                    value={endPage}
                    onChangeText={setEndPage}
                    placeholder="10"
                    keyboardType="numeric"
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-800 dark:text-slate-100 mb-4"
                  />
                </View>
              ) : (
                <View>
                  {/* Start Aya Selection */}
                  <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2 mt-2">Start Surah</Text>
                  <TouchableOpacity
                    onPress={() => setShowStartSurahModal(true)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex-row items-center justify-between mb-4"
                  >
                    <Text className={`font-medium ${startChapter ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                      {startChapter ? `${startChapter.id}. ${startChapter.nameEn}` : 'Select a Surah'}
                    </Text>
                    <ChevronRightIcon size={20} color="#94a3b8" />
                  </TouchableOpacity>

                  {startChapterId && (
                    <View>
                      <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Start Ayah</Text>
                      <TouchableOpacity
                        onPress={() => setShowStartAyahModal(true)}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex-row items-center justify-between mb-4"
                      >
                        <Text className={`font-medium ${startVerse ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                          {startVerse ? `Ayah ${startVerse.ayaNumber}` : 'Select an Ayah'}
                        </Text>
                        <ChevronRightIcon size={20} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* End Aya Selection */}
                  <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2 mt-4">End Surah</Text>
                  <TouchableOpacity
                    onPress={() => setShowEndSurahModal(true)}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex-row items-center justify-between mb-4"
                  >
                    <Text className={`font-medium ${endChapter ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                      {endChapter ? `${endChapter.id}. ${endChapter.nameEn}` : 'Select a Surah'}
                    </Text>
                    <ChevronRightIcon size={20} color="#94a3b8" />
                  </TouchableOpacity>

                  {endChapterId && (
                    <View>
                      <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">End Ayah</Text>
                      <TouchableOpacity
                        onPress={() => setShowEndAyahModal(true)}
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex-row items-center justify-between mb-4"
                      >
                        <Text className={`font-medium ${endVerse ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                          {endVerse ? `Ayah ${endVerse.ayaNumber}` : 'Select an Ayah'}
                        </Text>
                        <ChevronRightIcon size={20} color="#94a3b8" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {taskType === 'zekr' && (
            <View>
              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Select Zekr Category</Text>
              {loadingZekr ? (
                <ActivityIndicator color="#0d9488" className="mb-4" />
              ) : (
                <TouchableOpacity
                  onPress={() => setShowZekrCategoryModal(true)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex-row items-center justify-between mb-4"
                >
                  <View className="flex-1 flex-row items-center justify-between mr-2">
                    <Text className={`font-medium flex-1 ${selectedCategory ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}>
                      {selectedCategory ? selectedCategory.nameEn : 'Select a category'}
                    </Text>
                    {selectedCategory && (
                      <Text className="font-medium ml-2 text-slate-800 dark:text-slate-100" style={{ fontFamily: 'sans-serif' }}>
                        {selectedCategory.nameAr}
                      </Text>
                    )}
                  </View>
                  <ChevronRightIcon size={20} color="#94a3b8" />
                </TouchableOpacity>
              )}

              <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">Specific Dua (Optional)</Text>
              <TouchableOpacity
                onPress={() => {
                  if (!selectedCategoryId) {
                    Alert.alert('Error', 'Please select a Zekr category first');
                    return;
                  }
                  setShowZekrDuaModal(true);
                }}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex-row items-center justify-between mb-4"
              >
                <Text
                  className={`font-medium flex-1 ${selectedZekrId ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}
                  numberOfLines={1}
                >
                  {selectedZekrId
                    ? (catalogItems.find((d) => d.id === selectedZekrId)?.textEn || 'Selected dua')
                    : 'Whole category (all duas)'}
                </Text>
                <ChevronRightIcon size={20} color="#94a3b8" />
              </TouchableOpacity>
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
                <TouchableOpacity
                  onPress={() => setShowLectureModal(true)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex-row items-center justify-between mb-4"
                >
                  <Text
                    className={`font-medium flex-1 ${studyLectureId ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}`}
                    numberOfLines={1}
                  >
                    {studyLectures.find((l) => l.id === studyLectureId)?.name || 'Select a lecture'}
                  </Text>
                  <ChevronRightIcon size={20} color="#94a3b8" />
                </TouchableOpacity>
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
        </View>


        <TouchableOpacity
          onPress={handleSave}
          className="bg-teal-600 gap-2 flex-row items-center justify-center p-4 rounded-xl mt-2 mb-8"
        >
          <SaveIcon size={20} color="white" className="mr-2" />
          <Text className="text-white font-bold text-lg">{id ? "Save Changes" : "Create Task"}</Text>
        </TouchableOpacity>
      </ScrollView >
      {/* ── Zekr Category Modal ─────────────────────────────────────────── */}
      < Modal
        visible={showZekrCategoryModal}
        onClose={() => setShowZekrCategoryModal(false)
        }
        title="Select Zekr Category"
      >
        {
          zekrCategories.length === 0 ? (
            <Text className="text-slate-500 text-center py-2">No categories available.</Text>
          ) : (
            zekrCategories.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => {
                  void handleCategorySelect(item.id);
                  setShowZekrCategoryModal(false);
                }}
                className={`p-3 mb-2 rounded-lg border flex-row items-center justify-between ${selectedCategoryId === item.id ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'}`}
              >
                <Text className={`font-medium flex-1 ${selectedCategoryId === item.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`}>
                  {item.nameEn}
                </Text>
                <Text className={`font-medium ml-2 ${selectedCategoryId === item.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`} style={{ fontFamily: 'sans-serif' }}>
                  {item.nameAr}
                </Text>
                {selectedCategoryId === item.id && <CheckIcon size={18} color="#0d9488" className="ml-2" />}
              </TouchableOpacity>
            ))
          )
        }
      </Modal >

      {/* ── Zekr Dua Modal ──────────────────────────────────────────────── */}
      < Modal
        visible={showZekrDuaModal}
        onClose={() => setShowZekrDuaModal(false)}
        title="Select Dua (Optional)"
      >
        {
          catalogItems.length === 0 ? (
            <Text className="text-slate-500 text-center py-2">No duas in this category.</Text>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => {
                  setSelectedZekrId(null);
                  setShowZekrDuaModal(false);
                }}
                className={`p-3 mb-2 rounded-lg border flex-row items-center justify-between ${selectedZekrId === null ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'}`}
              >
                <Text className={`font-medium flex-1 ${selectedZekrId === null ? 'text-teal-700 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`}>
                  Whole category (all duas)
                </Text>
                {selectedZekrId === null && <CheckIcon size={18} color="#0d9488" className="ml-2" />}
              </TouchableOpacity>
              {catalogItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    setSelectedZekrId(item.id);
                    setShowZekrDuaModal(false);
                  }}
                  className={`p-3 mb-2 rounded-lg border ${selectedZekrId === item.id ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'}`}
                >
                  <Text
                    className={`font-medium ${selectedZekrId === item.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`}
                    numberOfLines={2}
                  >
                    {item.textEn}
                  </Text>
                  <Text
                    className={`mt-1 ${selectedZekrId === item.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-600 dark:text-slate-300'}`}
                    style={{ fontFamily: 'sans-serif' }}
                    numberOfLines={2}
                  >
                    {item.textAr}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )
        }
      </Modal >

      {/* ── Lecture Modal ───────────────────────────────────────────────── */}
      < Modal
        visible={showLectureModal}
        onClose={() => setShowLectureModal(false)}
        title="Select Lecture"
      >
        {
          studyLectures.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                setStudyLectureId(item.id);
                setShowLectureModal(false);
              }}
              className={`p-3 mb-2 rounded-lg border flex-row items-center justify-between ${studyLectureId === item.id ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'}`}
            >
              <Text className={`font-medium flex-1 ${studyLectureId === item.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`}>
                {item.name}
              </Text>
              {studyLectureId === item.id && <CheckIcon size={18} color="#0d9488" className="ml-2" />}
            </TouchableOpacity>
          ))
        }
      </Modal >

      {/* ── Start Surah Modal ───────────────────────────────────────────── */}
      < Modal
        visible={showStartSurahModal}
        onClose={() => setShowStartSurahModal(false)}
        title="Select Start Surah"
      >
        {
          quranChapters.map((chapter) => (
            <TouchableOpacity
              key={chapter.id}
              onPress={() => {
                setStartChapterId(chapter.id);
                setShowStartSurahModal(false);
              }}
              className={`p-3 mb-2 rounded-lg border flex-row items-center justify-between ${startChapterId === chapter.id ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'}`}
            >
              <Text className={`font-medium flex-1 ${startChapterId === chapter.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`}>
                {chapter.id}. {chapter.nameEn}
              </Text>
              <Text className={`font-medium ml-2 ${startChapterId === chapter.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`} style={{ fontFamily: 'sans-serif' }}>
                {chapter.nameAr}
              </Text>
              {startChapterId === chapter.id && <CheckIcon size={18} color="#0d9488" className="ml-2" />}
            </TouchableOpacity>
          ))
        }
      </Modal >

      {/* ── Start Ayah Modal ────────────────────────────────────────────── */}
      < Modal
        visible={showStartAyahModal}
        onClose={() => setShowStartAyahModal(false)}
        title={`Select Start Ayah${startChapter ? ` — ${startChapter.nameEn}` : ''}`}
      >
        {
          startChapterVerses.map((verse) => (
            <TouchableOpacity
              key={verse.id}
              onPress={() => {
                setStartVerseId(verse.id);
                setShowStartAyahModal(false);
              }}
              className={`p-3 mb-2 rounded-lg border flex-row items-center justify-between ${startVerseId === verse.id ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'}`}
            >
              <Text className={`font-medium ${startVerseId === verse.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`}>
                Ayah {verse.ayaNumber}
              </Text>
              {startVerseId === verse.id && <CheckIcon size={18} color="#0d9488" />}
            </TouchableOpacity>
          ))
        }
      </Modal >

      {/* ── End Surah Modal ─────────────────────────────────────────────── */}
      < Modal
        visible={showEndSurahModal}
        onClose={() => setShowEndSurahModal(false)}
        title="Select End Surah"
      >
        {
          quranChapters.map((chapter) => (
            <TouchableOpacity
              key={chapter.id}
              onPress={() => {
                setEndChapterId(chapter.id);
                setShowEndSurahModal(false);
              }}
              className={`p-3 mb-2 rounded-lg border flex-row items-center justify-between ${endChapterId === chapter.id ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'}`}
            >
              <Text className={`font-medium flex-1 ${endChapterId === chapter.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`}>
                {chapter.id}. {chapter.nameEn}
              </Text>
              <Text className={`font-medium ml-2 ${endChapterId === chapter.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`} style={{ fontFamily: 'sans-serif' }}>
                {chapter.nameAr}
              </Text>
              {endChapterId === chapter.id && <CheckIcon size={18} color="#0d9488" className="ml-2" />}
            </TouchableOpacity>
          ))
        }
      </Modal >

      {/* ── End Ayah Modal ──────────────────────────────────────────────── */}
      < Modal
        visible={showEndAyahModal}
        onClose={() => setShowEndAyahModal(false)}
        title={`Select End Ayah${endChapter ? ` — ${endChapter.nameEn}` : ''}`}
      >
        {
          endChapterVerses.map((verse) => (
            <TouchableOpacity
              key={verse.id}
              onPress={() => {
                setEndVerseId(verse.id);
                setShowEndAyahModal(false);
              }}
              className={`p-3 mb-2 rounded-lg border flex-row items-center justify-between ${endVerseId === verse.id ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900'}`}
            >
              <Text className={`font-medium ${endVerseId === verse.id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-800 dark:text-slate-100'}`}>
                Ayah {verse.ayaNumber}
              </Text>
              {endVerseId === verse.id && <CheckIcon size={18} color="#0d9488" />}
            </TouchableOpacity>
          ))
        }
      </Modal >
    </View >
  );
}
