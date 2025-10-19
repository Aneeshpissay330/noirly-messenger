// src/components/ChatBubble/MessageDocument.tsx
import { viewDocument } from '@react-native-documents/viewer';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Pdf from 'react-native-pdf';
import { useUserDoc } from '../../hooks/useUserDoc';
import { MONO } from '../../theme';
import type { Message } from '../../types/chat';
import { downloadFileToCache } from '../../utils/download';

type Props = {
  message: Message;
  mediaUri?: string;
  isDownloading: boolean;
  isFailed: boolean;
  isMe: boolean;
  textColor: string;
  onRetry?: (messageId: string) => void;
};

function getDocumentIcon(mime?: string) {
  if (!mime) return '📄';
  if (mime.includes('pdf')) return '📕';
  if (mime.includes('word') || mime.includes('doc')) return '📄';
  if (mime.includes('excel') || mime.includes('sheet')) return '📊';
  if (mime.includes('powerpoint') || mime.includes('presentation')) return '📊';
  if (mime.includes('zip') || mime.includes('compressed')) return '🗜️';
  if (mime.includes('text')) return '📝';
  return '📄';
}

function formatFileSize(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileType(mime?: string) {
  if (!mime) return 'FILE';
  const parts = mime.split('/');
  if (parts.length > 1) {
    return parts[1].toUpperCase();
  }
  return 'FILE';
}

function isDocLike(mime?: string) {
  if (!mime) return false;
  if (mime.startsWith('image/')) return false;
  if (mime.startsWith('video/')) return false;
  if (mime.startsWith('audio/')) return false;
  return true;
}

export default function MessageDocument({
  message,
  mediaUri,
  isDownloading,
  isFailed,
  isMe,
  textColor,
  onRetry,
}: Props) {
  const theme = useTheme();
  const { userDoc } = useUserDoc();
  const [isOpening, setIsOpening] = useState(false);

  const shouldShowDocument =
    (mediaUri &&
      (isDocLike(message.mime) || message.type === 'file' || message.name)) ||
    (!mediaUri &&
      (isDocLike(message.mime) || message.type === 'file' || message.name) &&
      isDownloading);

  if (!shouldShowDocument) return null;

  async function openAttachment(uri?: string) {
    try {
      if (!uri) return;

      const isRemote = /^https?:\/\//i.test(uri);
      const amReceiver = !!userDoc && message.userId !== userDoc.uid;
      let finalUri = uri;

      if (isRemote && amReceiver) {
        setIsOpening(true);
        try {
          const filename = message.name || message.id;
          finalUri = await downloadFileToCache({ url: uri, filename });
        } finally {
          setIsOpening(false);
        }
      }

      await viewDocument({ uri: finalUri, mimeType: message.mime });
    } catch (e) {
      Alert.alert(
        'Cannot open file',
        'Try downloading from the chat details or copy the link.',
      );
    }
  }

  return (
    <View style={[styles.container, message.text ? styles.containerWithText : styles.containerWithoutText]}>
      <TouchableOpacity
        activeOpacity={0.85}
        disabled={isOpening}
        onPress={() => mediaUri && openAttachment(mediaUri)}
        style={[
          styles.documentCard,
          {
            backgroundColor: isMe
              ? theme.dark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.05)'
              : theme.colors.surfaceVariant,
            borderColor: isMe
              ? theme.dark
                ? 'rgba(255,255,255,0.2)'
                : 'rgba(0,0,0,0.1)'
              : theme.colors.outline,
          },
          styles.cardBorder,
        ]}
      >
        <View
          style={[
            styles.documentThumbnail,
            {
              backgroundColor: isMe
                ? theme.dark
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(0,0,0,0.03)'
                : theme.colors.surface,
            },
          ]}
        >
          <View style={styles.documentPreview}>
            {/* PDF Preview */}
            {mediaUri &&
            (message.mime?.includes('pdf') ||
              message.name?.toLowerCase().endsWith('.pdf')) ? (
              <Pdf
                source={{ uri: mediaUri, cache: true }}
                style={styles.pdfContainer}
                page={1}
                scale={1}
                minScale={0.5}
                maxScale={3}
                horizontal={false}
                enablePaging={false}
                enableRTL={false}
                enableAnnotationRendering={false}
                enableAntialiasing={true}
                fitPolicy={0}
                spacing={0}
                onLoadComplete={() => {}}
                onPageChanged={() => {}}
                onError={() => {}}
                renderActivityIndicator={() => (
                  <View style={styles.pdfLoader}>
                    <ActivityIndicator
                      size={20}
                      color={theme.colors.secondary}
                    />
                  </View>
                )}
              />
            ) : mediaUri &&
              (message.mime?.startsWith('text/') ||
                message.name?.toLowerCase().match(/\.(txt|doc|docx)$/)) ? (
              <View
                style={[
                  styles.textDocPreview,
                  {
                    backgroundColor: isMe
                      ? theme.dark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.05)'
                      : theme.colors.surface,
                  },
                ]}
              >
                <Text style={[styles.documentIcon, { color: theme.colors.secondary }]}>
                  {getDocumentIcon(message.mime)}
                </Text>
                <Text
                  style={[
                    styles.fileTypeText,
                    { color: theme.colors.secondary },
                  ]}
                >
                  {getFileType(message.mime)}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.defaultDocPreview,
                  {
                    backgroundColor: isMe
                      ? theme.dark
                        ? 'rgba(255,255,255,0.1)'
                        : 'rgba(0,0,0,0.05)'
                      : theme.colors.surface,
                  },
                ]}
              >
                <View>
                  <View
                    style={[
                      styles.headerBar,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  />
                  <View
                    style={[
                      styles.contentLine,
                      { backgroundColor: theme.colors.outline },
                    ]}
                  />
                  <View
                    style={[
                      styles.contentLine,
                      styles.contentLine80,
                      { backgroundColor: theme.colors.outline },
                    ]}
                  />
                  <View
                    style={[
                      styles.contentLine,
                      styles.contentLine70,
                      { backgroundColor: theme.colors.outline },
                    ]}
                  />
                </View>

                <View style={styles.bodyContainer}>
                  {[...Array(4)].map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.bodyLine,
                        i === 3 ? styles.bodyLineShort : styles.bodyLineFull,
                        {
                          backgroundColor: theme.colors.outline,
                        },
                      ]}
                    />
                  ))}
                </View>

                <View
                  style={[
                    styles.footerBar,
                    { backgroundColor: theme.colors.secondary },
                  ]}
                />
              </View>
            )}
          </View>
        </View>

        <View
          style={[
            styles.documentInfo,
            isMe ? styles.documentInfoTransparent : { backgroundColor: theme.colors.surface },
          ]}
        >
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.documentTitle,
              { color: isMe ? textColor : theme.colors.onSurface },
            ]}
          >
            {message.name ?? 'Attachment'}
          </Text>
          {isOpening && (
            <View style={styles.loadingIndicator}>
              <ActivityIndicator
                size={14}
                color={isMe ? textColor : theme.colors.secondary}
              />
            </View>
          )}

          <View style={styles.documentMeta}>
            <Text
              style={[
                styles.documentMetaText,
                {
                  color: isMe
                    ? theme.dark
                      ? MONO.gray300
                      : 'rgba(255,255,255,0.9)'
                    : theme.colors.secondary,
                },
              ]}
            >
              {formatFileSize(message.size)} • {getFileType(message.mime)}
            </Text>
          </View>

          {isDownloading && (
            <View style={styles.downloadingIndicator}>
              <ActivityIndicator
                size={12}
                color={isMe ? textColor : theme.colors.secondary}
              />
              <Text
                style={[
                  styles.downloadingText,
                  {
                    color: isMe
                      ? theme.dark
                        ? MONO.gray300
                        : 'rgba(255,255,255,0.9)'
                      : theme.colors.secondary,
                  },
                ]}
              >
                Downloading...
              </Text>
            </View>
          )}

          {isFailed && (
            <TouchableOpacity
              onPress={() => onRetry?.(message.id)}
              style={[
                styles.retryButton,
                isMe ? styles.retryButtonMe : styles.retryButtonOther,
              ]}
            >
              <Text
                style={[
                  styles.retryButtonText,
                  { color: isMe ? textColor : MONO.accentRed },
                ]}
              >
                Retry
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Empty style for the root container
  },
  containerWithText: {
    marginBottom: 8,
  },
  containerWithoutText: {
    marginBottom: 0,
  },
  documentCard: {
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: 280,
    minWidth: 200,
  },
  cardBorder: {
    borderWidth: 1,
  },
  documentThumbnail: {
    width: '100%',
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  documentPreview: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  textDocPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentIcon: {
    fontSize: 28,
  },
  fileTypeText: {
    fontSize: 10,
    marginTop: 4,
  },
  defaultDocPreview: {
    width: '85%',
    height: '75%',
    borderRadius: 6,
    padding: 8,
    justifyContent: 'space-between',
  },
  headerBar: {
    height: 12,
    borderRadius: 2,
    marginBottom: 4,
    width: '60%',
  },
  contentLine: {
    height: 2,
    borderRadius: 1,
    marginBottom: 2,
  },
  contentLine80: {
    width: '80%',
  },
  contentLine70: {
    width: '70%',
  },
  bodyContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  bodyLine: {
    height: 1.5,
    borderRadius: 1,
  },
  bodyLineFull: {
    width: '100%',
  },
  bodyLineShort: {
    width: '50%',
  },
  footerBar: {
    height: 4,
    borderRadius: 1,
    width: '30%',
  },
  documentInfo: {
    padding: 12,
  },
  documentInfoTransparent: {
    backgroundColor: 'transparent',
  },
  documentTitle: {
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 18,
  },
  loadingIndicator: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  documentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  documentMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  downloadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  downloadingText: {
    fontSize: 11,
    fontWeight: '500',
  },
  retryButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-end',
  },
  retryButtonMe: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  retryButtonOther: {
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  retryButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pdfLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});
