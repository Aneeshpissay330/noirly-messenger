// src/components/ChatBubble/MessageImage.tsx
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import type { Message } from '../../types/chat';

type Props = {
  message: Message;
  mediaUri?: string;
  isDownloading: boolean;
  onOpenMedia?: (
    items: { src: string; type: 'image' | 'video' }[],
    index: number,
  ) => void;
};

function fitDims(
  w?: number,
  h?: number,
  maxW = 220,
  maxH = 300,
): { width: number; height: number } {
  if (!w || !h) return { width: maxW, height: Math.round((maxW * 9) / 16) };
  const scale = Math.min(maxW / w, maxH / h);
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

export default function MessageImage({
  message,
  mediaUri,
  isDownloading,
  onOpenMedia,
}: Props) {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  if (message.type !== 'image') return null;

  const { width, height } = fitDims(message.width, message.height, 200, 200);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => {
          if (!mediaUri) return;
          if (typeof onOpenMedia === 'function') {
            onOpenMedia([{ src: mediaUri, type: 'image' }], 0);
            return;
          }
          navigation.navigate('MediaViewer', {
            items: [{ src: mediaUri, type: 'image' }],
            initialIndex: 0,
            title: message.name ?? '',
          });
        }}
        style={[styles.mediaBox, { width, height }]}
      >
        {mediaUri ? (
          <Image
            source={{ uri: mediaUri }}
            style={styles.fullImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.mediaPlaceholder,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          >
            <ActivityIndicator size={32} color={theme.colors.primary} />
          </View>
        )}
        {isDownloading ? (
          <View style={styles.mediaOverlay}>
            <ActivityIndicator size={32} color={theme.colors.primary} />
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  mediaBox: {
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
