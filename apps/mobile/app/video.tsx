import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import NetInfo from '@react-native-community/netinfo';
import { ScreenHeader } from '../components';
import {
  CheckCircle2Icon,
  WifiOffIcon,
  HardDriveIcon,
  GlobeIcon,
  ArrowLeftIcon,
} from 'lucide-react-native';
import {
  resolveVideoUrl,
  verifyLocalVideoExists,
} from '../services/videoDownloadService';

export default function VideoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    url?: string;
    localFilePath?: string;
    title?: string;
    studyUnitName?: string;
    subjectName?: string;
  }>();

  const [isLoadingSource, setIsLoadingSource] = useState(true);
  const [playbackMode, setPlaybackMode] = useState<'offline' | 'online' | 'unavailable_offline'>(
    'online'
  );
  const [resolvedUri, setResolvedUri] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    async function resolveSource() {
      setIsLoadingSource(true);

      // 1. Check if local file exists on disk
      const hasLocalFile = await verifyLocalVideoExists(params.localFilePath);

      if (hasLocalFile && params.localFilePath) {
        if (isMounted) {
          setResolvedUri(params.localFilePath);
          setPlaybackMode('offline');
          setIsLoadingSource(false);
        }
        return;
      }

      // 2. If no local file, check internet connection for streaming
      const net = await NetInfo.fetch();
      const isOnline = Boolean(net.isConnected && net.isInternetReachable !== false);

      if (isMounted) {
        if (isOnline && params.url) {
          setResolvedUri(resolveVideoUrl(params.url));
          setPlaybackMode('online');
        } else {
          setPlaybackMode('unavailable_offline');
        }
        setIsLoadingSource(false);
      }
    }

    resolveSource();

    return () => {
      isMounted = false;
    };
  }, [params.localFilePath, params.url]);

  const player = useVideoPlayer(resolvedUri, (p) => {
    p.loop = false;
    if (resolvedUri) {
      p.play();
    }
  });

  return (
    <View className="flex-1 bg-slate-900">
      <ScreenHeader
        title={params.subjectName || params.studyUnitName || 'Video Player'}
        subtitle={params.title || 'StudyUnit Video'}
        className="bg-white border-b border-slate-200"
        onBack={() => router.back()}
      />

      {isLoadingSource ? (
        <View className="w-full aspect-video bg-black justify-center items-center">
          <ActivityIndicator size="large" color="#0d9488" />
          <Text className="text-slate-400 text-xs mt-2">Checking video source...</Text>
        </View>
      ) : playbackMode === 'unavailable_offline' ? (
        <View className="w-full aspect-video bg-slate-950 justify-center items-center p-6 text-center">
          <View className="bg-slate-800/80 p-3 rounded-full mb-3">
            <WifiOffIcon size={28} color="#94a3b8" />
          </View>
          <Text className="text-white font-bold text-base mb-1">Unavailable Offline</Text>
          <Text className="text-slate-400 text-xs text-center mb-4 max-w-[280px]">
            This video hasn't been downloaded yet. Connect to the internet to stream or download it for offline viewing.
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center bg-teal-600 px-4 py-2 rounded-lg active:bg-teal-700"
          >
            <ArrowLeftIcon size={14} color="#ffffff" />
            <Text className="text-white font-semibold text-xs ml-1.5">Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="w-full aspect-video bg-black justify-center items-center">
          {resolvedUri ? (
            <VideoView
              style={{ width: '100%', height: '100%' }}
              player={player}
              nativeControls
              allowsPictureInPicture
              startsPictureInPictureAutomatically
            />
          ) : (
            <Text className="text-slate-400">No video stream URL provided</Text>
          )}
        </View>
      )}

      <ScrollView className="flex-1 bg-slate-50 p-4">
        <View className="bg-white rounded-xl p-5 shadow-sm mb-4 border border-slate-100">
          <Text className="text-xl font-bold text-slate-800 mb-1">
            {params.title || 'StudyUnit Video'}
          </Text>
          {!!params.studyUnitName && (
            <Text className="text-slate-500 text-sm mb-3">StudyUnit: {params.studyUnitName}</Text>
          )}

          <View className="flex-row items-center gap-2 flex-wrap">
            {playbackMode === 'offline' && (
              <View className="flex-row items-center bg-emerald-50 px-3 py-1.5 rounded-lg">
                <HardDriveIcon size={15} color="#059669" />
                <Text className="text-emerald-700 text-xs font-semibold ml-1.5">
                  Playing from Local Storage (Offline)
                </Text>
              </View>
            )}

            {playbackMode === 'online' && (
              <View className="flex-row items-center bg-teal-50 px-3 py-1.5 rounded-lg">
                <GlobeIcon size={15} color="#0d9488" />
                <Text className="text-teal-700 text-xs font-semibold ml-1.5">
                  Streaming Online (HTTP 206)
                </Text>
              </View>
            )}

            {playbackMode === 'unavailable_offline' && (
              <View className="flex-row items-center bg-amber-50 px-3 py-1.5 rounded-lg">
                <WifiOffIcon size={15} color="#d97706" />
                <Text className="text-amber-700 text-xs font-semibold ml-1.5">
                  Offline - Download Required
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
