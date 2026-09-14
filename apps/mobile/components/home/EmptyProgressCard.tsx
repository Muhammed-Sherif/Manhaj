import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpenIcon } from 'lucide-react-native';

interface EmptyProgressCardProps {
  onPress?: () => void;
}

export function EmptyProgressCard({ onPress }: EmptyProgressCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      className="bg-slate-200 dark:bg-slate-800 rounded-2xl p-6 items-center justify-center border-2 border-teal-500 active:bg-slate-300"
      onPress={onPress ?? (() => router.push('/browse'))}
      activeOpacity={0.8}
    >
      <BookOpenIcon size={32} color="#0d9488" />
      <Text className="text-slate-600 dark:text-slate-300 font-semibold mt-2">
        Start Your First Lecture
      </Text>
    </TouchableOpacity>
  );
}
