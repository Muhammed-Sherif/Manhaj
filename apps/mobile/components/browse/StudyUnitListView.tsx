import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { StudyUnit } from '@manhaj/api-client';
import { StudyUnitItemCard } from './StudyUnitItemCard';
import { useBrowseStore } from '../../store/browseStore';

export interface StudyUnitListViewProps {
  studyUnits?: StudyUnit[];
  onSelectStudyUnit?: (studyUnit: StudyUnit) => void;
}

export const StudyUnitListView: React.FC<StudyUnitListViewProps> = (props) => {
  const router = useRouter();
  const store = useBrowseStore();

  const studyUnits = (props.studyUnits ?? store.selectedSubject?.studyUnits ?? []) as StudyUnit[];
  const onSelectStudyUnit =
    props.onSelectStudyUnit ??
    ((studyUnit: StudyUnit) => {
      router.push(`/study-unit?id=${studyUnit.id}`);
    });

  return (
    <View>
      {studyUnits.map((studyUnit, index) => (
        <StudyUnitItemCard
          key={studyUnit.id ?? index}
          studyUnit={studyUnit}
          onPress={onSelectStudyUnit}
        />
      ))}
    </View>
  );
};
