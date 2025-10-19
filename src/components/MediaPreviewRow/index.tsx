// index.tsx
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React, { useEffect, useMemo } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { List, useTheme } from 'react-native-paper';

// from messages slice
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  clearChatState,
  openDmChat,
  selectChatIdByOther,
  selectMessagesByOther,
  startSubscriptions,
} from '../../features/messages'; // <- adjust path to your slice
// ^ selectors & thunks come from your messages slice :contentReference[oaicite:3]{index=3}

export type RootTabParamList = {
  MediaTabsScreen: { id: string; name?: string };
};

type MediaPreviewRowProps = {
  otherUid?: string;
  userName?: string;
}

const MediaPreviewRow : React.FC<MediaPreviewRowProps> = ({ otherUid, userName }) => {
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();
  const theme = useTheme();

  const dispatch = useAppDispatch();
  const chatId = useAppSelector((s) =>
    otherUid ? selectChatIdByOther(s, otherUid) : undefined
  );
  const msgs = useAppSelector(s => {
    const auth = require('@react-native-firebase/auth').default;
    const me = auth().currentUser?.uid;
    return otherUid ? selectMessagesByOther(s, otherUid, me) : [];
  });

  // Ensure chat exists
  useEffect(() => {
    if (otherUid && !chatId) {
      dispatch(openDmChat({ otherUid }) as any);
    }
  }, [dispatch, otherUid, chatId]);

  // Start live subscriptions once chatId is known
  useEffect(() => {
    if (otherUid && chatId) {
      // isSelf: false when it’s a DM; tweak if you have a self-chat route
      dispatch(startSubscriptions({ otherUid, chatId, isSelf: false }) as any);
      return () => {
        dispatch(clearChatState({ otherUid }));
      };
    }
  }, [dispatch, otherUid, chatId]);

  // Only images for the row
  const images = useMemo(
    () => msgs.filter(m => m.type === 'image' && !!m.url), // m.url is local first, then patched to cloud URL :contentReference[oaicite:4]{index=4}
    [msgs]
  );

  const titleStyle = useMemo(() => ({ 
    fontWeight: 'bold' as const, 
    fontSize: 14, 
    color: theme.colors.onSurface 
  }), [theme.colors.onSurface]);

  const renderRightIcon = React.useCallback((props: any) => (
    <List.Icon {...props} icon="arrow-right" color={theme.colors.secondary} />
  ), [theme.colors.secondary]);

  if (!otherUid) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <List.Item
        title="Media, links and docs"
        titleStyle={titleStyle}
        right={renderRightIcon}
        onPress={() => navigation.navigate('MediaTabsScreen', { id: otherUid, name: userName })}
      />
      <View style={styles.rowContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {images.map(item => (
            <Image
              key={item.id}
              source={{ uri: item.url! }}
              style={styles.image}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // backgroundColor is applied dynamically from theme
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    marginLeft: 16,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
});

export default MediaPreviewRow;
