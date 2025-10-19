// src/components/MessageInfoSheet/index.tsx
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Divider, IconButton, Modal, Portal, Text, useTheme } from 'react-native-paper';
import type { Message } from '../../types/chat';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  message: Message | null;
  meUid?: string | null;
  otherUid?: string | null;
};

function formatTime(iso?: string) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    // Android may include seconds in toLocaleString; build date and time separately.
    const datePart = d.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timePart = d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart}, ${timePart}`;
  } catch {
    return '—';
  }
}

export default function MessageInfoSheet({ visible, onDismiss, message, meUid, otherUid }: Props) {
  const theme = useTheme();

  const sentAt = useMemo(() => (message ? formatTime(message.createdAt) : '—'), [message]);

  const deliveredAt = useMemo(() => {
    if (!message) return '—';
    // Prefer other user's delivery timestamp
    const ts = otherUid && message.deliveredAt ? message.deliveredAt[otherUid] : undefined;
    return formatTime(ts);
  }, [message, otherUid]);

  const readAt = useMemo(() => {
    if (!message) return '—';
    const ts = otherUid && message.readAt ? message.readAt[otherUid] : undefined;
    return formatTime(ts);
  }, [message, otherUid]);

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={[styles.container, { backgroundColor: theme.colors.surface }]}>
        <Card style={{ backgroundColor: theme.colors.surface }}>
          <Card.Title title="Message info" right={(props) => (
            <IconButton {...props} icon="close" onPress={onDismiss} />
          )} />
          <Divider />
          <Card.Content>
            <View style={styles.row}><Text variant="labelMedium">Sent</Text><Text>{sentAt}</Text></View>
            <View style={styles.row}><Text variant="labelMedium">Delivered</Text><Text>{deliveredAt}</Text></View>
            <View style={styles.row}><Text variant="labelMedium">Read</Text><Text>{readAt}</Text></View>
          </Card.Content>
        </Card>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
});
