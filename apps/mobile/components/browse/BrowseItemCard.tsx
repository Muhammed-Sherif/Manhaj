import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronRightIcon } from 'lucide-react-native';

export interface BrowseItemCardProps {
  title?: string | null;
  description?: string | null;
  onPress: () => void;
  rightIcon?: React.ReactNode;
}

export const BrowseItemCard: React.FC<BrowseItemCardProps> = ({
  title,
  description,
  onPress,
  rightIcon,
}) => {
  return (
    <TouchableOpacity
      className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 shadow-sm"
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="font-semibold text-slate-800 dark:text-slate-100 text-lg">{title ?? ''}</Text>
          {!!description && (
            <Text className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{description}</Text>
          )}
        </View>
        {rightIcon ?? <ChevronRightIcon size={20} color="#94a3b8" />}
      </View>
    </TouchableOpacity>
  );
};
