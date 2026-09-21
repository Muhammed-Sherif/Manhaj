import React, { useState } from 'react';
import { View, Text, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Linking from 'expo-linking';
import { ScreenHeader } from '../components';
import { ExternalLinkIcon, FileTextIcon, RefreshCwIcon } from 'lucide-react-native';

export default function PdfScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    url?: string;
    title?: string;
    studyUnitName?: string;
    subjectName?: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [webViewKey, setWebViewKey] = useState(1);

  const rawUrl = params.url || '';

  // Google Docs viewer enables reliable in-app PDF rendering on Android and web
  const pdfUrl = React.useMemo(() => {
    if (!rawUrl) return '';
    if (Platform.OS === 'android') {
      return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(rawUrl)}`;
    }
    return rawUrl;
  }, [rawUrl]);

  const handleOpenExternal = async () => {
    if (rawUrl) {
      const canOpen = await Linking.canOpenURL(rawUrl);
      if (canOpen) {
        await Linking.openURL(rawUrl);
      }
    }
  };

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    setWebViewKey((prev) => prev + 1);
  };

  return (
    <View className="flex-1 bg-slate-900">
      <ScreenHeader
        title={params.subjectName || params.studyUnitName || 'PDF Viewer'}
        subtitle={params.title || 'Document'}
        className="bg-white border-b border-slate-200"
        onBack={() => router.back()}
        rightAccessory={
          rawUrl ? (
            <TouchableOpacity
              onPress={handleOpenExternal}
              className="p-2 bg-slate-100 rounded-lg active:bg-slate-200"
              accessibilityLabel="Open in external browser or viewer"
            >
              <ExternalLinkIcon size={18} color="#475569" />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <View className="flex-1 bg-slate-100 relative">
        {pdfUrl && !hasError ? (
          <WebView
            key={webViewKey}
            source={{ uri: pdfUrl }}
            className="flex-1"
            startInLoadingState
            renderLoading={() => (
              <View className="absolute inset-0 justify-center items-center bg-slate-50 z-10">
                <ActivityIndicator size="large" color="#0d9488" />
                <Text className="mt-3 text-slate-600 font-medium text-sm">Loading PDF document...</Text>
              </View>
            )}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            scalesPageToFit
            javaScriptEnabled
            domStorageEnabled
          />
        ) : (
          <View className="flex-1 justify-center items-center p-6 bg-slate-50">
            <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
              <FileTextIcon size={32} color="#ef4444" />
            </View>
            <Text className="text-lg font-semibold text-slate-800 text-center mb-2">
              {hasError ? 'Failed to display PDF' : 'No PDF document URL provided'}
            </Text>
            <Text className="text-slate-500 text-sm text-center mb-6 max-w-xs">
              {hasError
                ? 'We could not preview this file inside the app. You can try reloading or opening it in an external reader.'
                : 'The selected document does not have a valid file link.'}
            </Text>

            <View className="flex-row space-x-3">
              {hasError && (
                <TouchableOpacity
                  onPress={handleRetry}
                  className="flex-row items-center px-4 py-2.5 bg-white border border-slate-300 rounded-lg shadow-sm mr-3"
                >
                  <RefreshCwIcon size={16} color="#334155" />
                  <Text className="text-slate-700 font-medium text-sm ml-2">Retry</Text>
                </TouchableOpacity>
              )}

              {rawUrl ? (
                <TouchableOpacity
                  onPress={handleOpenExternal}
                  className="flex-row items-center px-4 py-2.5 bg-teal-600 rounded-lg shadow-sm"
                >
                  <ExternalLinkIcon size={16} color="#ffffff" />
                  <Text className="text-white font-medium text-sm ml-2">Open Externally</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
