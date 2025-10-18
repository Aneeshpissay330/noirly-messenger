// app/(tabs)/personal/index.tsx
import React, { useEffect } from 'react';
import { FlatList, StyleSheet, View, Pressable } from 'react-native';
import { useTheme } from 'react-native-paper';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import ChatItem from '../../../components/ChatItem';
import { ensureAvatar } from '../../../utils/chat';
import { useSelfChatRow } from '../../../hooks/useSelfChat';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { selectChatRows, syncMyChats, clearChats } from '../../../features/chat';

type RootNavigation = { ChatView: { id: string; type?: 'group'; name?: string; avatar?: string }; ContactScreen: undefined };

const Personal = () => {
  const navigation = useNavigation<NavigationProp<RootNavigation>>();
  const theme = useTheme();
  const selfChat = useSelfChatRow();
  const dispatch = useAppDispatch();
  const chats = useAppSelector(selectChatRows);

  useEffect(() => {
    dispatch(syncMyChats());
    return () => { dispatch(clearChats()); };
  }, [dispatch]);

  const data = selfChat ? [selfChat, ...chats] : chats;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ChatItem
            name={item.name}
            avatar={ensureAvatar(item.avatar)}
            lastMessage={item.lastMessage ?? ''}
            date={item.date}
            unreadCount={item.unreadCount ?? 0}
            pinned={!!item.pinned}
            online={!!item.online}
            showDivider={index < data.length - 1}
            onPress={() =>
              navigation.navigate('ChatView', {
                id: item.id,
                name: item.name ?? 'Chat',
                avatar: item.avatar ?? '',
              })
            }
          />
        )}
      />
      <Pressable
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.primary,
            borderWidth: 2,
            borderRadius: 10,
            width: 56,
            height: 56,
            justifyContent: 'center',
            alignItems: 'center',
          }
        ]}
        onPress={() => navigation.navigate('ContactScreen')}
      >
        <MaterialCommunityIcons 
          name="plus" 
          size={24} 
          color={theme.colors.primary} 
        />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({ fab: { position: 'absolute', margin: 16, right: 0, bottom: 0 } });
export default Personal;
