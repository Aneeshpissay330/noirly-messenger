// src/components/ChatBubble/MessageVideo.tsx
import Icon from '@react-native-vector-icons/material-design-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';
import Video from 'react-native-video';
import { MONO } from '../../theme';
import type { Message } from '../../types/chat';

type Props = {
  message: Message;
  mediaUri?: string;
  isDownloading: boolean;
  isFailed: boolean;
  onOpenMedia?: (
    items: { src: string; type: 'image' | 'video' }[],
    index: number,
  ) => void;
  onRetry?: (messageId: string) => void;
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

export default function MessageVideo({
  message,
  mediaUri,
  isDownloading,
  isFailed,
  onOpenMedia,
  onRetry,
}: Props) {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  if (message.type !== 'video') return null;

  const { width, height } = fitDims(message.width, message.height, 220, 300);

  return (
    <View style={{ marginBottom: 8 }}>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => {
          if (!mediaUri) return;
          if (typeof onOpenMedia === 'function') {
            onOpenMedia([{ src: mediaUri, type: 'video' }], 0);
            return;
          }
          navigation.navigate('MediaViewer', {
            items: [{ src: mediaUri, type: 'video' }],
            initialIndex: 0,
            title: message.name ?? '',
          });
        }}
        style={[
          styles.mediaBox,
          {
            width,
            height,
            backgroundColor: theme.dark ? MONO.gray900 : MONO.gray800,
          },
        ]}
      >
        {mediaUri ? (
          <View style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Video
              source={{ uri: mediaUri }}
              style={{ width: '100%', height: '100%' }}
              paused
              resizeMode="cover"
            />
            {/* Play button overlay */}
            <View
              style={[
                styles.mediaOverlay,
                { backgroundColor: 'rgba(0,0,0,0.3)' },
              ]}
            >
              <View
                style={[
                  styles.playButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                    borderWidth: 2,
                  },
                ]}
              >
                <Icon
                  name="play"
                  size={24}
                  color={theme.colors.primary}
                  style={{ marginLeft: 2 }}
                />
              </View>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.mediaPlaceholderDark,
              { backgroundColor: theme.dark ? MONO.gray800 : MONO.gray700 },
            ]}
          >
            <ActivityIndicator size={32} color={theme.colors.onSurface} />
            <Text
              variant="labelSmall"
              style={{ marginTop: 8, color: theme.colors.onSurface }}
            >
              {isDownloading ? 'Downloading…' : 'Loading…'}
            </Text>
          </View>
        )}
        {isDownloading ? (
          <View style={styles.mediaOverlay}>
            <ActivityIndicator size={32} color={theme.colors.primary} />
          </View>
        ) : null}
        {isFailed ? (
          <View style={styles.mediaOverlay}>
            <TouchableOpacity
              onPress={() => onRetry?.(message.id)}
              style={styles.retryWrap}
            >
              <IconButton icon="refresh" size={18} />
              <Text variant="labelSmall" style={{ marginLeft: 6 }}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mediaBox: {
    borderRadius: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPlaceholderDark: {
    flex: 1,
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
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 18,
  },
});
