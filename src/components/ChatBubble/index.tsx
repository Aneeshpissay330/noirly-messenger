// src/components/ChatBubble/index.tsx
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MONO } from '../../theme';
import type { Message } from '../../types/chat';
import MessageContextMenu from '../MessageContextMenu';
import MessageInfoSheet from '../MessageInfoSheet';
import MessageAudio from './MessageAudio';
import MessageDocument from './MessageDocument';
import MessageImage from './MessageImage';
import MessageMeta from './MessageMeta';
import MessageVideo from './MessageVideo';
import SelectionCheckbox from './SelectionCheckbox';

type Props = {
  message: Message;
  isMe: boolean;
  _showAvatar?: boolean;
  showName?: boolean;
  otherUid?: string; // for Info: whose delivery/read times to show
  onRetry?: (messageId: string) => void; // optional retry handler
  onOpenMedia?: (
    items: { src: string; type: 'image' | 'video' }[],
    index: number,
  ) => void;
  onLongPress?: (message: Message) => void; // for delete functionality
  isSelectionMode?: boolean; // whether selection mode is active
  isSelected?: boolean; // whether this message is selected
  onToggleSelect?: (messageId: string) => void; // toggle selection callback
  onToggleStar?: (message: Message) => void; // star/unstar
  isStarred?: boolean; // whether message is starred (from selector)
};

export default function ChatBubble({
  message,
  isMe,
  _showAvatar = !isMe,
  showName = false,
  onRetry,
  onOpenMedia,
  onLongPress,
  otherUid,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onToggleStar,
  isStarred = false,
}: Props) {
  const theme = useTheme();

  // Use monochrome theme colors
  const bubbleBg = isMe ? theme.colors.primary : theme.colors.surface;
  const textColor = isMe ? theme.colors.onPrimary : theme.colors.onSurface;
  const borderColor = theme.colors.outline;
  const nameColor = isMe
    ? theme.dark
      ? MONO.gray300
      : MONO.white
    : theme.colors.secondary;

  const [showContextMenu, setShowContextMenu] = useState(false);
  const [touchPosition, setTouchPosition] = useState({ x: 0, y: 0 });
  const [showInfo, setShowInfo] = useState(false);

  const isDownloading =
    message.downloadStatus === 'pending' ||
    message.downloadStatus === 'downloading';
  const isFailed = message.downloadStatus === 'failed';

  // prefer localPath if available, else remote url
  const mediaUri = message.localPath || message.url;

  return (
    <Pressable
      onLongPress={event => {
        if (isSelectionMode) {
          onLongPress?.(message);
          return;
        }

        const { pageX, pageY } = event.nativeEvent;
        setTouchPosition({ x: pageX, y: pageY });
        setShowContextMenu(true);
        console.log('Long press detected on message:', message.id);
      }}
      onPress={() => {
        if (isSelectionMode) {
          onToggleSelect?.(message.id);
        } else {
          console.log('Short press on message:', message.id);
        }
      }}
      delayLongPress={400}
      style={[
        styles.row,
        {
          justifyContent: isMe ? 'flex-end' : 'flex-start',
          backgroundColor:
            isSelectionMode && isSelected
              ? theme.colors.primaryContainer
              : isSelectionMode
              ? theme.colors.surfaceVariant
              : 'transparent',
        },
      ]}
    >
      {/* optional avatar placeholder */}
      {/* {!isMe && showAvatar ? (
        <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceVariant }]} />
      ) : null} */}

      <View style={{ maxWidth: '78%' }}>
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: bubbleBg,
              borderColor: isMe ? 'transparent' : borderColor,
              borderWidth: isMe ? 0 : 1,
              borderBottomLeftRadius: isMe ? 16 : 6,
              borderBottomRightRadius: isMe ? 6 : 16,
              opacity: isSelectionMode && !isSelected ? 0.8 : 1,
            },
          ]}
        >
          {/* Selection checkbox */}
          <SelectionCheckbox
            isSelectionMode={isSelectionMode}
            isSelected={isSelected}
            theme={theme}
          />
          {/* Sender name (group chats) */}
          {showName ? (
            <Text
              variant="labelSmall"
              style={{ marginBottom: 2, color: nameColor }}
            >
              {message.userId}
            </Text>
          ) : null}

          {/* Media Components */}
          <MessageImage
            message={message}
            mediaUri={mediaUri}
            isDownloading={isDownloading}
            onOpenMedia={onOpenMedia}
          />

          <MessageVideo
            message={message}
            mediaUri={mediaUri}
            isDownloading={isDownloading}
            isFailed={isFailed}
            onOpenMedia={onOpenMedia}
            onRetry={onRetry}
          />

          {/* Document Component */}
          <MessageDocument
            message={message}
            mediaUri={mediaUri}
            isDownloading={isDownloading}
            isFailed={isFailed}
            isMe={isMe}
            textColor={textColor}
            onRetry={onRetry}
          />

          {/* Audio Component */}
          <MessageAudio message={message} mediaUri={mediaUri} />

          {/* Text */}
          {message.text ? (
            <Text variant="bodyMedium" style={{ color: textColor }}>
              {message.text}
            </Text>
          ) : null}

          {/* Meta Component */}
          <MessageMeta
            message={message}
            isMe={isMe}
            theme={theme}
            isStarred={isStarred}
          />
        </View>
      </View>

      {isMe ? <View style={{ width: 24 }} /> : null}

      <MessageContextMenu
        visible={showContextMenu}
        onClose={() => setShowContextMenu(false)}
        message={message}
        position={touchPosition}
        isMe={isMe}
        onDelete={msg => {
          onLongPress?.(msg); // This will trigger the existing delete flow
        }}
        onInfo={() => setShowInfo(true)}
        onStar={msg => onToggleStar?.(msg)}
        onUnstar={msg => onToggleStar?.(msg)}
        isStarred={isStarred}
      />
      <MessageInfoSheet
        visible={showInfo}
        onDismiss={() => setShowInfo(false)}
        message={message}
        otherUid={otherUid}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginVertical: 2,
    marginHorizontal: 4,
    borderRadius: 8,
    gap: 8,
    minHeight: 44, // Ensure minimum touch target size
  },
  bubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
});
