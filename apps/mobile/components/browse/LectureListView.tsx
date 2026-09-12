import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import type { Lecture } from '@manhaj/api-client';
import { LectureItemCard } from './LectureItemCard';
import { useBrowseStore } from '../../store/browseStore';

export interface LectureListViewProps {
  lectures?: Lecture[];
  onSelectLecture?: (lecture: Lecture) => void;
}

export const LectureListView: React.FC<LectureListViewProps> = (props) => {
  const router = useRouter();
  const store = useBrowseStore();

  const lectures = (props.lectures ?? store.selectedSubject?.lectures ?? []) as Lecture[];
  const onSelectLecture =
    props.onSelectLecture ??
    ((lecture: Lecture) => {
      router.push(`/lecture?id=${lecture.id}`);
    });

  return (
    <View>
      {lectures.map((lecture, index) => (
        <LectureItemCard
          key={lecture.id ?? index}
          lecture={lecture}
          onPress={onSelectLecture}
        />
      ))}
    </View>
  );
};
