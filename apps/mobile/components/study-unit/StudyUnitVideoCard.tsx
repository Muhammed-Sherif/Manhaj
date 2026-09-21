import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  ChevronRightIcon,
  PlayIcon,
  DownloadIcon,
  CheckCircle2Icon,
  Trash2Icon,
  HardDriveIcon,
} from 'lucide-react-native';
import type { StudyUnitDetails, StudyUnitVideo } from '@manhaj/api-client';
import { formatDuration } from '../../utils';
import { useRouter } from 'expo-router';
import {
  downloadStudyUnitVideo,
  deleteDownloadedVideo,
  verifyLocalVideoExists,
} from '../../services/videoDownloadService';

export interface StudyUnitVideoCardProps {
  video: StudyUnitVideo & { localFilePath?: string | null };
  studyUnit?: StudyUnitDetails | null;
  onVideoUpdated?: () => void;
}

export const StudyUnitVideoCard: React.FC<StudyUnitVideoCardProps> = ({
  video,
  studyUnit,
  onVideoUpdated,
}) => {
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [localPath, setLocalPath] = useState<string | null>(video.localFilePath ?? null);

  useEffect(() => {
    let isMounted = true;
    async function checkLocalFile() {
      const exists = await verifyLocalVideoExists(video.localFilePath);
      if (isMounted) {
        setIsDownloaded(exists);
        setLocalPath(exists ? (video.localFilePath ?? null) : null);
      }
    }
    checkLocalFile();
    return () => {
      isMounted = false;
    };
  }, [video.localFilePath]);

  const handleDownload = async () => {
    if (isDownloading || isDownloaded || !video.id || !video.url) return;

    setIsDownloading(true);
    setDownloadPercent(0);

    try {
      const uri = await downloadStudyUnitVideo(video.id, video.url, (percent) => {
        setDownloadPercent(percent);
      });
      setIsDownloaded(true);
      setLocalPath(uri);
      onVideoUpdated?.();
    } catch (error) {
      console.warn('[StudyUnitVideoCard] Download failed:', error);
    } finally {
      setIsDownloading(false);
      setDownloadPercent(null);
    }
  };

  const handleDeleteLocal = async () => {
    if (!video.id) return;
    try {
      await deleteDownloadedVideo(video.id, localPath);
      setIsDownloaded(false);
      setLocalPath(null);
      onVideoUpdated?.();
    } catch (error) {
      console.warn('[StudyUnitVideoCard] Delete local failed:', error);
    }
  };

  const handleVideoPress = () => {
    router.push({
      pathname: '/video',
      params: {
        id: video.id ?? '',
        url: video.url ?? '',
        localFilePath: localPath ?? '',
        title: video.sourceName ?? 'StudyUnit Video',
        studyUnitName: studyUnit?.name ?? '',
        subjectName: studyUnit?.subject?.name ?? '',
      },
    });
  };

  return (
    <View className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 shadow-sm border border-slate-100 dark:border-slate-700/60">
      <View className="flex-row items-center">
        {/* Play Icon click */}
        <TouchableOpacity
          onPress={handleVideoPress}
          activeOpacity={0.7}
          className="flex-row items-center flex-1 mr-2"
        >
          <View
            className={`rounded-lg p-3 mr-3 ${
              isDownloaded
                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                : 'bg-teal-100 dark:bg-teal-900/40'
            }`}
          >
            <PlayIcon size={20} color={isDownloaded ? '#059669' : '#0d9488'} />
          </View>

          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="font-semibold text-slate-800 dark:text-slate-100 flex-1" numberOfLines={1}>
                {video.sourceName ?? 'Video Recording'}
              </Text>
            </View>

            <View className="flex-row items-center gap-2 mt-1">
              <Text className="text-slate-500 dark:text-slate-400 text-xs">{formatDuration(video.duration)}</Text>

              {isDownloaded && (
                <View className="flex-row items-center bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                  <HardDriveIcon size={11} color="#059669" />
                  <Text className="text-emerald-700 dark:text-emerald-400 text-[10px] font-medium ml-1">Offline</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Action button: Download or Delete */}
        <View className="flex-row items-center gap-1">
          {isDownloaded ? (
            <TouchableOpacity
              onPress={handleDeleteLocal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 mr-1"
            >
              <Trash2Icon size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : isDownloading ? (
            <View className="flex-row items-center px-2 py-1 bg-teal-50 dark:bg-teal-950/40 rounded-lg mr-1">
              <ActivityIndicator size="small" color="#0d9488" />
              <Text className="text-teal-700 dark:text-teal-400 text-xs font-semibold ml-1.5 font-mono">
                {downloadPercent ?? 0}%
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleDownload}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 active:bg-slate-200 dark:active:bg-slate-600 mr-1"
            >
              <DownloadIcon size={16} color="#0d9488" />
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleVideoPress} activeOpacity={0.7} className="p-1">
            <ChevronRightIcon size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
