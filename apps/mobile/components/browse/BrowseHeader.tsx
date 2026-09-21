import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronRightIcon, ChevronLeftIcon, HomeIcon } from 'lucide-react-native';
import { useBrowseStore } from '../../store/browseStore';
import type { NavigationLevel } from './types';

export interface NamedHierarchyNode {
  name?: string | null;
}

/**
 * Builds breadcrumb title from the active hierarchy levels (preserved for compatibility)
 */
export const buildBreadcrumb = (levels: {
  selectedGrade?: NamedHierarchyNode | null;
  selectedTerm?: NamedHierarchyNode | null;
  selectedModule?: NamedHierarchyNode | null;
  selectedSubject?: NamedHierarchyNode | null;
}): string => {
  const parts: string[] = [];
  if (levels.selectedGrade?.name) parts.push(levels.selectedGrade.name);
  if (levels.selectedTerm?.name) parts.push(levels.selectedTerm.name);
  if (levels.selectedModule?.name) parts.push(levels.selectedModule.name);
  if (levels.selectedSubject?.name) parts.push(levels.selectedSubject.name);
  return parts.join(' > ');
};

interface BreadcrumbItem {
  id: string;
  label: string;
  level: NavigationLevel;
  isCurrent: boolean;
  onPress: () => void;
}

export const BrowseHeader: React.FC = () => {
  const {
    currentLevel,
    selectedGrade,
    selectedTerm,
    selectedModule,
    selectedSubject,
    navigateBack,
    jumpToLevel,
  } = useBrowseStore();

  const scrollViewRef = useRef<ScrollView>(null);
  const canGoBack = currentLevel !== 'grades';

  // Build the list of breadcrumb items based on current hierarchy state
  const items: BreadcrumbItem[] = [];

  // Level 1: Root / Grades
  items.push({
    id: 'grades',
    label: 'All Grades',
    level: 'grades',
    isCurrent: currentLevel === 'grades',
    onPress: () => jumpToLevel('grades'),
  });

  // Level 2: Grade -> Terms
  if (selectedGrade?.name) {
    items.push({
      id: 'terms',
      label: selectedGrade.name,
      level: 'terms',
      isCurrent: currentLevel === 'terms',
      onPress: () => jumpToLevel('terms'),
    });
  }

  // Level 3: Term -> Modules
  if (selectedTerm?.name) {
    items.push({
      id: 'modules',
      label: selectedTerm.name,
      level: 'modules',
      isCurrent: currentLevel === 'modules',
      onPress: () => jumpToLevel('modules'),
    });
  }

  // Level 4: Module -> Subjects
  if (selectedModule?.name) {
    items.push({
      id: 'subjects',
      label: selectedModule.name,
      level: 'subjects',
      isCurrent: currentLevel === 'subjects',
      onPress: () => jumpToLevel('subjects'),
    });
  }

  // Level 5: Subject -> StudyUnits
  if (selectedSubject?.name) {
    items.push({
      id: 'studyUnits',
      label: selectedSubject.name,
      level: 'studyUnits',
      isCurrent: currentLevel === 'studyUnits',
      onPress: () => {},
    });
  }

  // Auto-scroll to right when descending into deeper hierarchy
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [currentLevel, items.length]);

  return (
    <View className="bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 px-3 py-2.5">
      <View className="flex-row items-center">
        {/* Quick Back Button when deep in hierarchy */}
        {canGoBack && (
          <TouchableOpacity
            onPress={navigateBack}
            className="w-9 h-9 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-900/80 items-center justify-center mr-2 active:bg-teal-100"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Go back one level"
          >
            <ChevronLeftIcon size={20} color="#0d9488" />
          </TouchableOpacity>
        )}

        {/* Modern Pill Breadcrumb Container */}
        <View className="flex-1 bg-slate-50 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl px-2.5 py-1.5 shadow-sm">
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ alignItems: 'center' }}
            keyboardShouldPersistTaps="handled"
          >
            {items.map((item, index) => {
              const isFirst = index === 0;
              const isLast = item.isCurrent;

              return (
                <React.Fragment key={item.id}>
                  {/* Chevron Separator */}
                  {!isFirst && (
                    <View className="mx-1.5 items-center justify-center opacity-40">
                      <ChevronRightIcon size={14} color="#0d9488" />
                    </View>
                  )}

                  {/* Breadcrumb Item Button */}
                  <TouchableOpacity
                    onPress={item.onPress}
                    disabled={isLast}
                    activeOpacity={0.7}
                    className={`flex-row items-center rounded-xl px-2.5 py-1.5 transition-all ${
                      isLast
                        ? 'bg-teal-600 shadow-sm shadow-teal-700/20'
                        : 'bg-white/80 dark:bg-slate-700/60 border border-slate-200/60 dark:border-slate-600/50 active:bg-slate-100'
                    }`}
                  >
                    {isFirst && (
                      <View className="mr-1.5">
                        <HomeIcon
                          size={14}
                          color={isLast ? '#ffffff' : '#0d9488'}
                          strokeWidth={2.2}
                        />
                      </View>
                    )}

                    <Text
                      className={`text-xs ${
                        isLast
                          ? 'font-bold text-white'
                          : 'font-semibold text-slate-700 dark:text-slate-200'
                      }`}
                      numberOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};
