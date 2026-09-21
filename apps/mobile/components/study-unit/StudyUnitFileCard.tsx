import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRightIcon, FileTextIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { StudyUnitDetails, StudyUnitFile } from '@manhaj/api-client';

export interface StudyUnitFileCardProps {
  file: StudyUnitFile;
  studyUnit?: StudyUnitDetails | null;
  onPress?: (file: StudyUnitFile) => void;
}

export const StudyUnitFileCard: React.FC<StudyUnitFileCardProps> = ({ file, studyUnit, onPress }) => {
  const router = useRouter();

  const handleFilePress = () => {
    if (onPress) {
      onPress(file);
      return;
    }
    router.push({
      pathname: '/pdf',
      params: {
        id: file.id ?? '',
        url: file.fileUrl ?? '',
        title: file.sourceName ?? 'Document',
        studyUnitName: studyUnit?.name ?? '',
        subjectName: studyUnit?.subject?.name ?? '',
      },
    });
  };

  return (
    <TouchableOpacity
      className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 shadow-sm border border-slate-100 dark:border-slate-700/60"
      onPress={handleFilePress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center">
        <View className="bg-blue-100 dark:bg-blue-900/40 rounded-lg p-3 mr-3">
          <FileTextIcon size={20} color="#3b82f6" />
        </View>
        <View className="flex-1">
          <Text className="font-semibold text-slate-800 dark:text-slate-100">{file.sourceName ?? 'StudyUnit Note'}</Text>
          <Text className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{(file.fileType ?? 'pdf').toUpperCase()}</Text>
        </View>
        <ChevronRightIcon size={20} color="#94a3b8" />
      </View>
    </TouchableOpacity>
  );
};
