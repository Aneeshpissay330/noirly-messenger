import auth from '@react-native-firebase/auth';
import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text, useTheme } from 'react-native-paper';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../../app/store';
import {
  clearChatState,
  openDmChat,
  selectChatIdByOther,
  selectMessagesByOther,
  startSubscriptions,
} from '../../../features/messages';
import { MONO } from '../../../theme';

type DocsTabProps = {
  otherUid: string;
}

export default function DocsTab({ otherUid }: DocsTabProps) {
  const theme = useTheme();
  const dispatch = useDispatch();

  const chatId = useSelector((s: RootState) =>
    otherUid ? selectChatIdByOther(s, otherUid) : undefined
  );
  const msgs = useSelector((s: RootState) => {
    const me = auth().currentUser?.uid;
    return otherUid ? selectMessagesByOther(s, otherUid, me) : [];
  });

  useEffect(() => {
    if (otherUid && !chatId) {
      dispatch(openDmChat({ otherUid }) as any);
    }
  }, [dispatch, otherUid, chatId]);

  useEffect(() => {
    if (otherUid && chatId) {
      dispatch(startSubscriptions({ otherUid, chatId, isSelf: false }) as any);
      return () => {
        dispatch(clearChatState({ otherUid }));
      };
    }
  }, [dispatch, otherUid, chatId]);

  const documentMessages = useMemo(
    () => msgs.filter(m => 
      (m.type === 'file' || m.mime) && 
      !m.mime?.startsWith('image/') && 
      !m.mime?.startsWith('video/') && 
      !m.mime?.startsWith('audio/') &&
      !!m.url
    ),
    [msgs]
  );

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: any) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getFileIcon = (mime?: string) => {
    if (!mime) return 'file';
    if (mime.includes('pdf')) return 'file-pdf-box';
    if (mime.includes('word') || mime.includes('doc')) return 'file-word';
    if (mime.includes('excel') || mime.includes('sheet')) return 'file-excel';
    if (mime.includes('powerpoint') || mime.includes('presentation')) return 'file-powerpoint';
    if (mime.includes('zip') || mime.includes('compressed')) return 'zip-box';
    if (mime.includes('text')) return 'file-document';
    return 'file';
  };

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: theme.colors.background }]}>
      {documentMessages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ color: theme.colors.secondary, textAlign: 'center' }}>
            No documents found
          </Text>
        </View>
      ) : (
        documentMessages.map((item) => (
          <List.Item
            key={item.id}
            title={item.name || 'Document'}
            description={`${formatFileSize(item.size)} • ${formatDate(item.createdAt)}`}
            left={(p) => <List.Icon {...p} color={item.mime?.includes('pdf') ? MONO.accentRed : theme.colors.primary} icon={getFileIcon(item.mime)} />}
            style={[styles.item, { backgroundColor: theme.colors.surface }]}
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.secondary }}
            onPress={() => {
              // Handle document opening
            }}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ 
  wrap: { 
    paddingHorizontal: 8,
    flex: 1,
  }, 
  item: { 
    borderRadius: 8,
    marginVertical: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
});