import React from 'react';
import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageIcon, XIcon } from 'lucide-react-native';

export interface PickedImage {
  uri: string;
  mimeType: string | null;
}

export interface ImagePickerFieldProps {
  label?: string;
  value: PickedImage | null;
  onChange: (image: PickedImage | null) => void;
}

/**
 * Attach a local image to a card.
 *
 * Only a local file URI leaves this component — nothing is uploaded here. The file is
 * copied into app storage and queued for upload once the card itself has been saved, so
 * the card can be created offline and the image catches up later.
 */
export const ImagePickerField: React.FC<ImagePickerFieldProps> = ({
  label = 'Image (Optional)',
  value,
  onChange,
}) => {
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo access to attach an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    onChange({ uri: asset.uri, mimeType: asset.mimeType ?? null });
  };

  return (
    <View className="mb-4">
      <Text className="text-slate-800 dark:text-slate-100 font-medium mb-2">{label}</Text>

      {value ? (
        <View className="relative">
          <Image
            source={{ uri: value.uri }}
            className="w-full h-44 rounded-lg"
            resizeMode="cover"
          />
          <TouchableOpacity
            className="absolute top-2 right-2 bg-slate-900/70 rounded-full p-2"
            onPress={() => onChange(null)}
          >
            <XIcon size={16} color="white" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          className="bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 items-center justify-center flex-row"
          onPress={pickImage}
        >
          <ImageIcon size={20} color="#0d9488" />
          <Text className="text-slate-600 dark:text-slate-300 font-medium ml-2">Add Image</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
