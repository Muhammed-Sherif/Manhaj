import React from 'react';
import { Modal as RNModal, View, Text, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import { XIcon } from 'lucide-react-native';

interface ModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function Modal({ visible, onClose, title, children }: ModalProps) {
    return (
        <RNModal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
                <View className="bg-white dark:bg-slate-800 rounded-t-2xl max-h-[80%]" onStartShouldSetResponder={() => true}>
                    <View className="flex-row justify-between items-center p-5 border-b border-slate-200 dark:border-slate-700">
                        <Text className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</Text>
                        <TouchableOpacity onPress={onClose} className="p-1">
                            <XIcon size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                    <ScrollView className="p-5">{children}</ScrollView>
                </View>
            </Pressable>
        </RNModal>
    );
}
