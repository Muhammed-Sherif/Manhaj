import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpenIcon , NotebookIcon } from 'lucide-react-native';
import {
  LoadingView,
  ErrorView,
  ScreenHeader,
  LectureVideoCard,
  LectureFileCard,
  LectureQuestionsCard,
} from '../components';
import { useGetLecture } from '../lib/useGetLecture';

export default function LectureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { lecture, isLoading, error, refetch } = useGetLecture(id);
  console.log(lecture)
  if (isLoading && !lecture) {
    return <LoadingView message="Loading lecture..." />;
  }

  if (error && !lecture) {
    return (
      <ErrorView
        title="Failed to load lecture"
        message={error}
        onRetry={refetch}
      />
    );
  }

  if (!lecture) {
    return (
      <ErrorView
        title="Lecture not found"
        message="The requested lecture could not be found."
        onRetry={refetch}
      />
    );
  }

  const videos = lecture.lectureVideos ?? lecture.videos ?? [];
  const files = lecture.lectureFiles ?? lecture.files ?? [];

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <ScreenHeader
        title={lecture.subject?.name}
        subtitle={lecture.name}
        icon={
          <View className="bg-teal-100 dark:bg-teal-900/40 rounded-lg p-2">
            <BookOpenIcon size={18} color="#0d9488" />
          </View>
        }
      />

      <ScrollView className="flex-1 p-4">
        {/* Lecture Info */}
        <View className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm mb-4 border border-slate-100 dark:border-slate-800">
          <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
            {lecture.name}
          </Text>
          {!!lecture.description && (
            <Text className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {lecture.description}
            </Text>
          )}
        </View>

        {/* Videos Section */}
        {videos.length > 0 && (
          <View className="mb-4">
            <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
              Videos
            </Text>
            {videos.map((video, index) => (
              <LectureVideoCard
                key={video.id ?? index}
                video={video}
                lecture={lecture}
                onVideoUpdated={refetch}
              />
            ))}
          </View>
        )}

        {/* Files Section */}
        {files.length > 0 && (
          <View className="mb-4">
            <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-3">
              Files & Notes
            </Text>
            {files.map((file, index) => (
              <LectureFileCard
                key={file.id ?? index}
                file={file}
                lecture={lecture}
              />
            ))}
          </View>
        )}

        {/* Practice Questions */}
        <LectureQuestionsCard lecture={lecture} />

        {/* Private Student Notes & Cases */}
        <View className="mt-6 mb-8 gap-2 flex-row justify-between space-x-3">
          <TouchableOpacity 
            className="flex-1 bg-white gap-2 dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex-row items-center justify-center"
            onPress={() => router.push(`/add-note?lectureId=${lecture.id}` as any)}
          >
            <NotebookIcon size={20} color="#0d9488" className="mr-2" />
            <Text className="font-semibold text-slate-800 dark:text-slate-100">Add Note</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 bg-white gap-2 dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex-row items-center justify-center"
            onPress={() => router.push(`/add-case?lectureId=${lecture.id}` as any)}
          >
            <BookOpenIcon size={20} color="#0d9488" className="mr-2" />
            <Text className="font-semibold text-slate-800 dark:text-slate-100">Add Case</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
