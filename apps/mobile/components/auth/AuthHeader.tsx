import React from 'react';
import { View, Text, Image } from 'react-native';

export function AuthHeader() {
  return (
    <View className="mb-8 items-center">
      <Image
        source={require('../../assets/icon.png')}
        className="w-80 h-80 rounded-lg mb-3"
        resizeMode="contain"
      />
      <Text className="text-base text-slate-500 dark:text-slate-400 text-center">Offline-First Student Question Bank</Text>
    </View>
  );
}
