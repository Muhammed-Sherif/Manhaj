import React from 'react';
import { View } from 'react-native';
import { BrowseItemCard } from './BrowseItemCard';
import type { StructuredSubject } from './types';
import { useBrowseStore } from '../../store/browseStore';

export interface SubjectListViewProps {
  subjects?: StructuredSubject[];
  onSelectSubject?: (subject: StructuredSubject) => void;
}

export const SubjectListView: React.FC<SubjectListViewProps> = (props) => {
  const store = useBrowseStore();
  const subjects = props.subjects ?? store.selectedModule?.subjects ?? [];
  const onSelectSubject = props.onSelectSubject ?? store.selectSubject;

  return (
    <View>
      {subjects.map((subject, index) => (
        <BrowseItemCard
          key={subject.id ?? index}
          title={subject.name}
          onPress={() => onSelectSubject(subject)}
        />
      ))}
    </View>
  );
};
