import React from 'react';
import { View } from 'react-native';
import { BrowseItemCard } from './BrowseItemCard';
import { useBrowseStore } from '../../store/browseStore';

export const GradeListView = () => {
  const store = useBrowseStore();
  const grades = store.grades;
  const onSelectGrade = store.selectGrade;

  return (
    <View>
      {grades.map((grade, index) => (
        <BrowseItemCard
          key={grade.id ?? index}
          title={grade.name}
          description={grade.description}
          onPress={() => onSelectGrade(grade)}
        />
      ))}
    </View>
  );
};
