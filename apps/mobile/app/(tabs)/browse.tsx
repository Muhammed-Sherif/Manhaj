import React, { useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { LoadingView, ErrorView } from '../../components';
import { BrowseHeader, BrowseContent } from '../../components/browse';
import { useBrowseStore } from '../../store/browseStore';

export default function BrowseScreen() {
  const { grades, isLoading, error, loadHierarchy } = useBrowseStore();

  useEffect(() => {
    loadHierarchy();
  }, [loadHierarchy]);

  if (isLoading) {
    return <LoadingView message="Loading content..." />;
  }

  if (error) {
    return (
      <ErrorView
        title="Failed to load content"
        message={error}
        onRetry={() => loadHierarchy(true)}
      />
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <BrowseHeader />

      <ScrollView className="flex-1 p-4">
        <BrowseContent />
      </ScrollView>
    </View>
  );
}
