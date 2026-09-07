import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeftIcon, PlayIcon, FileTextIcon, WifiIcon, WifiOffIcon, CheckCircleIcon } from 'lucide-react-native';

// Mock data - in production, this would come from local SQLite
const mockLecture = {
  id: '1',
  name: 'Heart Failure',
  description: 'Pathophysiology and management of heart failure',
  subject: 'Cardiology',
  videos: [
    {
      id: '1',
      sourceName: 'College Recording',
      url: 'https://example.com/video1.mp4',
      duration: 1800, // 30 minutes
    },
    {
      id: '2',
      sourceName: 'External Course',
      url: 'https://example.com/video2.mp4',
      duration: 2400, // 40 minutes
    },
  ],
  files: [
    {
      id: '1',
      sourceName: 'Lecture Notes',
      fileUrl: 'https://example.com/notes.pdf',
      fileType: 'pdf',
    },
    {
      id: '2',
      sourceName: 'Summary',
      fileUrl: 'https://example.com/summary.pdf',
      fileType: 'pdf',
    },
  ],
  questions: [
    {
      id: '1',
      questionText: 'What is the primary mechanism of action of ACE inhibitors?',
    },
    {
      id: '2',
      questionText: 'Which class of drugs is first-line for heart failure?',
    },
  ],
};

const getSubjectIcon = (subject: string) => {
  switch (subject) {
    case 'Cardiology':
      return '❤️';
    case 'Pharmacology':
      return '💊';
    case 'Anatomy':
      return '🫀';
    default:
      return '📚';
  }
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
};

export default function LectureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isOnline, setIsOnline] = useState(true); // In production, use NetInfo

  const lecture = mockLecture;

  const handleVideoPress = (video: any) => {
    // In production, open video player with resume from last position
    Alert.alert('Video Player', `Play: ${video.sourceName}`);
  };

  const handleFilePress = (file: any) => {
    // In production, open file viewer
    Alert.alert('File Viewer', `Open: ${file.sourceName}`);
  };

  const handleSolveQuestions = () => {
    router.push(`/solve?mode=solve&lectureId=${lecture.id}`);
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-white border-b border-slate-200 px-4 py-3">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <ChevronLeftIcon size={24} color="#0d9488" />
          </TouchableOpacity>

          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-2xl mr-2">{getSubjectIcon(lecture.subject)}</Text>
              <View className="flex-1">
                <Text className="font-semibold text-slate-800">{lecture.subject}</Text>
                <Text className="text-slate-500 text-sm">{lecture.name}</Text>
              </View>
            </View>
          </View>

          {/* Offline indicator */}
          <View className={`flex-row items-center ${isOnline ? 'bg-green-50' : 'bg-amber-50'} px-2 py-1 rounded`}>
            {isOnline ? (
              <WifiIcon size={14} color="#22c55e" />
            ) : (
              <WifiOffIcon size={14} color="#f59e0b" />
            )}
            <Text className={`text-xs ml-1 ${isOnline ? 'text-green-600' : 'text-amber-600'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Lecture Info */}
        <View className="bg-white rounded-xl p-5 shadow-sm mb-4">
          <Text className="text-lg font-semibold text-slate-800 mb-2">{lecture.name}</Text>
          <Text className="text-slate-600 leading-relaxed">{lecture.description}</Text>
        </View>

        {/* Videos */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-slate-800 mb-3">Videos</Text>

          {lecture.videos.map((video) => (
            <TouchableOpacity
              key={video.id}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm"
              onPress={() => handleVideoPress(video)}
            >
              <View className="flex-row items-center">
                <View className="bg-teal-100 rounded-lg p-3 mr-3">
                  <PlayIcon size={20} color="#0d9488" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-slate-800">{video.sourceName}</Text>
                  <Text className="text-slate-500 text-sm">{formatDuration(video.duration)}</Text>
                </View>
                <ChevronLeftIcon size={20} color="#94a3b8" style={{ transform: [{ rotate: '180deg' }] }} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Files */}
        <View className="mb-4">
          <Text className="text-lg font-semibold text-slate-800 mb-3">Files & Notes</Text>

          {lecture.files.map((file) => (
            <TouchableOpacity
              key={file.id}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm"
              onPress={() => handleFilePress(file)}
            >
              <View className="flex-row items-center">
                <View className="bg-blue-100 rounded-lg p-3 mr-3">
                  <FileTextIcon size={20} color="#3b82f6" />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-slate-800">{file.sourceName}</Text>
                  <Text className="text-slate-500 text-sm">{file.fileType.toUpperCase()}</Text>
                </View>
                <ChevronLeftIcon size={20} color="#94a3b8" style={{ transform: [{ rotate: '180deg' }] }} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Practice Questions */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-slate-800">Practice Questions</Text>
            <View className="flex-row items-center bg-green-50 px-2 py-1 rounded">
              <CheckCircleIcon size={14} color="#22c55e" />
              <Text className="text-green-600 text-xs ml-1">Available Offline</Text>
            </View>
          </View>

          <TouchableOpacity
            className="bg-teal-600 rounded-xl p-4 items-center shadow-sm"
            onPress={handleSolveQuestions}
          >
            <Text className="text-white font-semibold text-lg">
              Start Solving ({lecture.questions.length} questions)
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
