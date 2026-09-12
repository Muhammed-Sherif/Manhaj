import React from 'react';
import { View } from 'react-native';
import { BookOpenIcon } from 'lucide-react-native';
import { ScreenHeader } from '../ScreenHeader';

export interface LectureHeaderProps {
  subjectName?: string | null;
  lectureName?: string | null;
  onBack?: () => void;
}

export const LectureHeader: React.FC<LectureHeaderProps> = ({
  subjectName,
  lectureName,
  onBack,
}) => {
  return (
    <ScreenHeader
      title={subjectName}
      subtitle={lectureName}
      icon={
        <View className="bg-teal-100 rounded-lg p-2">
          <BookOpenIcon size={18} color="#0d9488" />
        </View>
      }
      onBack={onBack}
    />
  );
};
