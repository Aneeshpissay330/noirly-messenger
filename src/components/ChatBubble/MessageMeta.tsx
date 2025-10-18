// src/components/ChatBubble/MessageMeta.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { MONO } from '../../theme';
import type { Message } from '../../types/chat';

type Props = {
  message: Message;
  isMe: boolean;
  theme: any;
  isStarred?: boolean;
};

export default function MessageMeta({ message, isMe, theme, isStarred }: Props) {
  return (
    <View style={[styles.metaRow, { justifyContent: 'flex-end' }]}>
      {isStarred ? (
        <MaterialCommunityIcons
          name="star"
          size={14}
          color={isMe ? (theme.dark ? MONO.gray300 : 'rgba(255,255,255,0.9)') : theme.colors.secondary}
          style={{ marginRight: 6, opacity: 0.9 }}
        />
      ) : null}
      <Text
        style={[
          styles.timeText,
          {
            color: isMe ? 
              (theme.dark ? MONO.gray300 : 'rgba(255,255,255,0.9)') : 
              theme.colors.secondary 
          }
        ]}
      >
        {(() => {
          const d = new Date(message.createdAt);
          // Build time string without seconds across platforms
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        })()}
      </Text>
      {isMe ? (
        <View style={{ marginLeft: 6 }}>
          <Text>✓✓</Text>
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
  timeText: {
    fontSize: 12,
  },
});