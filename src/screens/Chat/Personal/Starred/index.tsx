import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { FlatList, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../../../app/hooks';
import ChatBubble from '../../../../components/ChatBubble';
import {
  selectStarredMessagesByOther,
  toggleStarred,
} from '../../../../features/messages';
import type { Message } from '../../../../types/chat';

// Route params for Starred screen
// id: other user's uid for the chat
// name: optional display name for header title

type StarredRouteParams = {
  StarredMessages: { id: string; name?: string };
};

export default function StarredMessages() {
  const theme = useTheme();
  const route = useRoute<RouteProp<StarredRouteParams, 'StarredMessages'>>();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const otherUid = route.params?.id as string;
  const messages = useAppSelector(s =>
    selectStarredMessagesByOther(s, otherUid),
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: route.params?.name ? `${route.params.name} • Starred` : 'Starred',
    });
  }, [navigation, route.params?.name]);

  const renderItem = useCallback(
    ({ item }: { item: Message }) => (
      <ChatBubble
        message={item}
        isMe={false}
        otherUid={otherUid}
        showAvatar={false}
        showName={false}
        onToggleStar={msg => {
          dispatch(toggleStarred({ otherUid, id: msg.id }));
        }}
        isStarred
      />
    ),
    [dispatch, otherUid],
  );

  const containerStyle = useMemo(
    () => ({ flex: 1, backgroundColor: theme.colors.background }),
    [theme.colors.background],
  );

  const contentContainerStyle = useMemo(
    () => ({ paddingVertical: 8 }),
    [],
  );

  return (
    <View style={containerStyle}>
      <FlatList
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderItem}
        contentContainerStyle={contentContainerStyle}
      />
    </View>
  );
}
