import React, { useState } from 'react';
import {
  Image,
  Modal,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import { XIcon } from 'lucide-react-native';

export interface TappableImageProps {
  uri: string;
  /** Short label used in diagnostic logs, e.g. "question-image". */
  logTag?: string;
  className?: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover';
}

/**
 * An inline image that opens full-screen when tapped.
 *
 * Load success/failure is logged with the exact URI so a broken image can be traced to
 * its URL (relative path, wrong host, private bucket, 403/404, ...).
 */
export const TappableImage: React.FC<TappableImageProps> = ({
  uri,
  logTag = 'image',
  className,
  style,
  resizeMode = 'contain',
}) => {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const { width, height } = useWindowDimensions();

  const handleError = (event: any) => {
    setFailed(true);
    console.warn(
      `[Image:${logTag}] FAILED to load uri="${uri}" error=${JSON.stringify(event?.nativeEvent ?? event)}`
    );
  };

  return (
    <>
      <TouchableOpacity activeOpacity={0.85} onPress={() => setOpen(true)} disabled={failed}>
        <Image
          source={{ uri }}
          className={className}
          style={style}
          resizeMode={resizeMode}
          onLoad={() => console.log(`[Image:${logTag}] loaded uri="${uri}"`)}
          onError={handleError}
        />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <StatusBar hidden={open} />
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
          <TouchableWithoutFeedback onPress={() => setOpen(false)}>
            <View style={{ flex: 1 }}>
              <ScrollView
                maximumZoomScale={4}
                minimumZoomScale={1}
                centerContent
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
              >
                <Image
                  source={{ uri }}
                  style={{ width, height: height * 0.85 }}
                  resizeMode="contain"
                  onError={handleError}
                />
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>

          <TouchableOpacity
            onPress={() => setOpen(false)}
            style={{
              position: 'absolute',
              top: 48,
              right: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 999,
              padding: 10,
            }}
            accessibilityLabel="Close image"
          >
            <XIcon size={22} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
};
