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

type AudioTabProps = {
  otherUid: string;
}

const AudioTab: React.FC<AudioTabProps> = ({ otherUid }) => {
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

  const audioMessages = useMemo(
    () => msgs.filter(m => (m.type === 'audio' || m.mime?.includes('audio/')) && !!m.url),
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

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AudioContent 
        audioMessages={audioMessages}
        theme={theme}
        formatFileSize={formatFileSize}
        formatDate={formatDate}
      />
    </ScrollView>
  );
};

const AudioIcon = (props: any, theme: any) => (
  <List.Icon {...props} color={theme.colors.primary} icon="music" />
);

const AudioContent = ({ 
  audioMessages, 
  theme, 
  formatFileSize, 
  formatDate 
}: {
  audioMessages: any[];
  theme: any;
  formatFileSize: (bytes?: number) => string;
  formatDate: (timestamp: any) => string;
}) => {
  if (audioMessages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.secondary }]}>
          No audio messages found
        </Text>
      </View>
    );
  }

  return (
    <>
      {audioMessages.map((item) => (
        <List.Item
          key={item.id}
          title={item.name || 'Audio message'}
          description={`${formatFileSize(item.size)} • ${formatDate(item.createdAt)}`}
          left={(p) => AudioIcon(p, theme)}
          style={[styles.item, { backgroundColor: theme.colors.surface }]}
          titleStyle={{ color: theme.colors.onSurface }}
          descriptionStyle={{ color: theme.colors.secondary }}
          onPress={() => {
            // Handle audio playback
          }}
        />
      ))}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  item: {
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    textAlign: 'center',
  },
});

export default AudioTab;