import React from 'react';
import { View } from 'react-native';
import { BookOpenIcon } from 'lucide-react-native';
import { ScreenHeader } from '../ScreenHeader';

export interface StudyUnitHeaderProps {
  subjectName?: string | null;
  studyUnitName?: string | null;
  onBack?: () => void;
}

export const StudyUnitHeader: React.FC<StudyUnitHeaderProps> = ({
  subjectName,
  studyUnitName,
  onBack,
}) => {
  return (
    <ScreenHeader
      title={subjectName}
      subtitle={studyUnitName}
      icon={
        <View className="bg-teal-100 rounded-lg p-2">
          <BookOpenIcon size={18} color="#0d9488" />
        </View>
      }
      onBack={onBack}
    />
  );
};
