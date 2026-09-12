import React from 'react';
import { View } from 'react-native';
import { BrowseItemCard } from './BrowseItemCard';
import { useBrowseStore } from '../../store/browseStore';

export const TermListView: React.FC = () => {
  const store = useBrowseStore();
  const terms = store.selectedGrade?.terms ?? [];
  const onSelectTerm = store.selectTerm;

  return (
    <View>
      {terms.map((term, index) => (
        <BrowseItemCard
          key={term.id ?? index}
          title={term.name}
          onPress={() => onSelectTerm(term)}
        />
      ))}
    </View>
  );
};
