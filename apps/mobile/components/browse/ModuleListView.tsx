import React from 'react';
import { View } from 'react-native';
import { BrowseItemCard } from './BrowseItemCard';
import type { StructuredModule } from './types';
import { useBrowseStore } from '../../store/browseStore';

export interface ModuleListViewProps {
  modules?: StructuredModule[];
  onSelectModule?: (module: StructuredModule) => void;
}

export const ModuleListView: React.FC<ModuleListViewProps> = (props) => {
  const store = useBrowseStore();
  const modules = props.modules ?? store.selectedTerm?.modules ?? [];
  const onSelectModule = props.onSelectModule ?? store.selectModule;

  return (
    <View>
      {modules.map((module, index) => (
        <BrowseItemCard
          key={module.id ?? index}
          title={module.name}
          onPress={() => onSelectModule(module)}
        />
      ))}
    </View>
  );
};
