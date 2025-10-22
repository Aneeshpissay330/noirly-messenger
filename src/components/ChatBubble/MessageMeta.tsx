// src/components/ChatBubble/MessageMeta.tsx
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MONO } from '../../theme';
import type { Message } from '../../types/chat';

type Props = {
  message: Message;
  isMe: boolean;
  theme: any;
  isStarred?: boolean;
  otherUid?: string;
};

// Helper function to determine message status
const getMessageStatus = (message: Message, otherUid?: string): 'pending' | 'sent' | 'delivered' | 'read' => {
  // If we have otherUid, check read/delivered status
  if (otherUid) {
    if (message.readAt?.[otherUid]) {
      return 'read';
    }
    if (message.deliveredAt?.[otherUid]) {
      return 'delivered';
    }
  }
  
  // For self messages, automatically show as delivered
  // since they're successfully saved to Firebase/local state
  return 'delivered';
};

// Helper function to get icon name and count based on status
const getStatusIcon = (status: 'pending' | 'sent' | 'delivered' | 'read') => {
  switch (status) {
    case 'pending':
      return { name: 'clock-outline' as const, count: 1 };
    case 'sent':
      return { name: 'check' as const, count: 1 };
    case 'delivered':
      return { name: 'check-all' as const, count: 1 }; // Using check-all for delivered
    case 'read':
      return { name: 'check-all' as const, count: 1 }; // Using check-all for read, but with different color
    default:
      return { name: 'clock-outline' as const, count: 1 };
  }
};

export default function MessageMeta({
  message,
  isMe,
  theme,
  isStarred,
  otherUid,
}: Props) {
  const messageStatus = getMessageStatus(message, otherUid);
  const statusIcon = getStatusIcon(messageStatus);
  
  return (
    <View style={[styles.metaRow, styles.metaRowEnd]}>
      {isStarred ? (
        <MaterialCommunityIcons
          name="star"
          size={14}
          color={
            isMe
              ? theme.dark
                ? MONO.gray300
                : 'rgba(255,255,255,0.9)'
              : theme.colors.secondary
          }
          style={[styles.starIcon, { color: isMe ? theme.dark ? MONO.gray300 : 'rgba(255,255,255,0.9)' : theme.colors.secondary }]}
        />
      ) : null}
      <Text
        style={[
          styles.timeText,
          {
            color: isMe
              ? theme.dark
                ? MONO.gray300
                : 'rgba(255,255,255,0.9)'
              : theme.colors.secondary,
          },
        ]}
      >
        {(() => {
          const d = new Date(message.createdAt);
          // Build time string without seconds across platforms
          return d.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
        })()}
      </Text>
      {isMe ? (
        <View style={styles.checkContainer}>
          <MaterialCommunityIcons
            name={statusIcon.name}
            size={14}
            color={
              messageStatus === 'read'
                ? theme.colors.primary // Different color for read messages
                : messageStatus === 'pending'
                ? theme.dark
                  ? MONO.gray400
                  : 'rgba(255,255,255,0.7)'
                : theme.dark
                ? MONO.gray300
                : 'rgba(255,255,255,0.9)'
            }
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaRowEnd: {
    justifyContent: 'flex-end',
  },
  starIcon: {
    marginRight: 6,
    opacity: 0.9,
  },
  timeText: {
    fontSize: 12,
  },
  checkContainer: {
    marginLeft: 6,
  },
});
