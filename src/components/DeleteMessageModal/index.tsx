import React from 'react';
import { Modal, View, StyleSheet } from 'react-native';
import { Text, Button, useTheme, Surface } from 'react-native-paper';
import type { Message } from '../../types/chat';

type Props = {
  visible: boolean;
  message: Message | null;
  messageCount?: number;
  isMe: boolean;
  onDismiss: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
};

export default function DeleteMessageModal({
  visible,
  message,
  messageCount = 1,
  isMe,
  onDismiss,
  onDeleteForMe,
  onDeleteForEveryone,
}: Props) {
  const theme = useTheme();

  if (!message) return null;

  console.log('DeleteMessageModal rendered with:', { visible, messageId: message.id, isMe });

  const getMessagePreview = () => {
    if (message.type === 'text') {
      return message.text?.substring(0, 50) + (message.text && message.text.length > 50 ? '...' : '');
    }
    switch (message.type) {
      case 'image':
        return '📷 Photo';
      case 'video':
        return '🎥 Video';
      case 'audio':
        return '🎵 Audio';
      case 'file':
        return `📄 ${message.name || 'File'}`;
      default:
        return 'Message';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Surface style={[styles.container, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
              Delete {messageCount === 1 ? 'message' : `${messageCount} messages`}?
            </Text>
          </View>
          
          <View style={styles.messagePreview}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {messageCount === 1 ? getMessagePreview() : `${messageCount} messages selected`}
            </Text>
          </View>

          <View style={styles.actions}>
            <Button
              mode="text"
              onPress={onDeleteForMe}
              textColor={theme.colors.error}
              style={styles.actionButton}
              labelStyle={styles.buttonLabel}
            >
              Delete for me
            </Button>
            
            {isMe && (
              <Button
                mode="text"
                onPress={onDeleteForEveryone}
                textColor={theme.colors.error}
                style={styles.actionButton}
                labelStyle={styles.buttonLabel}
              >
                Delete for everyone
              </Button>
            )}
            
            <Button
              mode="text"
              onPress={onDismiss}
              textColor={theme.colors.primary}
              style={styles.actionButton}
              labelStyle={styles.buttonLabel}
            >
              Cancel
            </Button>
          </View>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    padding: 20,
    elevation: 8,
  },
  header: {
    marginBottom: 16,
  },
  messagePreview: {
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },
  actionButton: {
    marginHorizontal: 0,
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});