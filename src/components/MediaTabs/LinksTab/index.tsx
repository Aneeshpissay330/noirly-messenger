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

type LinksTabProps = {
  otherUid: string;
}

export default function LinksTab({ otherUid }: LinksTabProps) {
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

  const linkMessages = useMemo(
    () => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      return msgs.filter(m => m.text && urlRegex.test(m.text));
    },
    [msgs]
  );

  const extractUrl = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);
    return match ? match[0] : text;
  };

  const formatDate = (timestamp: any) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Shared today';
    if (diffDays === 2) return 'Shared yesterday';
    if (diffDays <= 7) return `Shared ${diffDays} days ago`;
    return `Shared on ${date.toLocaleDateString()}`;
  };

  return (
    <ScrollView style={[styles.wrap, { backgroundColor: theme.colors.background }]}>
      <LinksContent 
        linkMessages={linkMessages}
        theme={theme}
        extractUrl={extractUrl}
        formatDate={formatDate}
      />
    </ScrollView>
  );
}

const LinkIcon = (props: any, theme: any) => (
  <List.Icon {...props} color={theme.colors.primary} icon="link-variant" />
);

const LinksContent = ({ 
  linkMessages, 
  theme, 
  extractUrl, 
  formatDate 
}: {
  linkMessages: any[];
  theme: any;
  extractUrl: (text: string) => string;
  formatDate: (timestamp: any) => string;
}) => {
  if (linkMessages.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.secondary }]}>
          No links found
        </Text>
      </View>
    );
  }

  return (
    <>
      {linkMessages.map((item) => {
        const url = extractUrl(item.text || '');
        const domain = url.replace(/^https?:\/\//, '').split('/')[0];
        return (
          <List.Item
            key={item.id}
            title={domain}
            description={formatDate(item.createdAt)}
            left={(p) => LinkIcon(p, theme)}
            style={[styles.item, { backgroundColor: theme.colors.surface }]}
            titleStyle={{ color: theme.colors.onSurface }}
            descriptionStyle={{ color: theme.colors.secondary }}
            onPress={() => {
              // Handle link opening
            }}
          />
        );
      })}
    </>
  );
};

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
  emptyText: {
    textAlign: 'center',
  },
});