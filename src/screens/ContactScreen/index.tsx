import { NavigationProp, useNavigation } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import React, { useEffect, useLayoutEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  List,
  Text,
  useTheme,
} from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import {
  normalizeVariants,
  selectContactsStatus,
  selectMatchedUsers,
  syncContacts,
} from '../../features/contacts';
import { useUserDoc } from '../../hooks/useUserDoc';

export type RootNavigationParamList = {
  ChatView: { id: string; name?: string; avatar?: string };
};

const EmptyComponent = () => (
  <View style={styles.emptyContainer}>
    <Text>No matches found.</Text>
  </View>
);

const ContactScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<NavigationProp<RootNavigationParamList>>();
  const theme = useTheme();
  const { userDoc } = useUserDoc();
  const status = useAppSelector(selectContactsStatus);
  const matched = useAppSelector(selectMatchedUsers);

  useEffect(() => {
    dispatch(
      syncContacts({ myPhoneNumber: userDoc?.phoneNumber ?? undefined }),
    );
  }, [dispatch, userDoc?.phoneNumber]);

  const renderHeaderRight = React.useCallback(() => 
    status === 'loading' ? (
      <ActivityIndicator
        size={20}
        color={theme.colors.primary}
        style={styles.headerLoader}
      />
    ) : null, [status, theme.colors.primary]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: renderHeaderRight,
    });
  }, [navigation, renderHeaderRight]);

  // Optional: keep "You" at the top
  const data = useMemo(() => {
    if (!userDoc) return matched;

    const isMe = (u: (typeof matched)[number]) =>
      u.uid === userDoc.uid ||
      (!!u.phoneNumber &&
        !!userDoc.phoneNumber &&
        normalizeVariants(u.phoneNumber).some(v =>
          new Set(normalizeVariants(userDoc.phoneNumber!)).has(v),
        ));

    const me = matched.filter(isMe);
    const others = matched
      .filter(u => !isMe(u))
      .sort((a, b) => {
        const nameA = a.displayName ?? a.username ?? a.phoneNumber ?? '';
        const nameB = b.displayName ?? b.username ?? b.phoneNumber ?? '';
        return nameA.localeCompare(nameB);
      });

    return [...me, ...others];
  }, [matched, userDoc]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <List.Section>
        <List.Subheader>All Contacts</List.Subheader>
      </List.Section>

      <FlashList
        data={data}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={EmptyComponent}
        renderItem={({ item }) => {
          const isYou =
            (!!userDoc && item.uid === userDoc.uid) ||
            (!!item.phoneNumber &&
              !!userDoc?.phoneNumber &&
              normalizeVariants(item.phoneNumber).some(v =>
                new Set(normalizeVariants(userDoc.phoneNumber!)).has(v),
              ));

          const title = isYou
            ? 'You'
            : item.displayName ?? item.username ?? 'Unknown';

          const renderContactAvatar = (props: any) => (
            <ContactAvatar {...props} item={item} title={title} />
          );

          return (
            <List.Item
              title={title}
              description={item.phoneNumber ?? undefined}
              left={renderContactAvatar}
              right={ChevronRightIcon}
              // ContactScreen
              onPress={() => {
                const rawName =
                  item.displayName ??
                  item.username ??
                  item.phoneNumber ??
                  'Unknown';

                navigation.navigate('ChatView', {
                  id: item.uid, // <-- must be uid, not item.id
                  name: rawName, // <-- not "You"
                  avatar: item.photoURL ?? '',
                });
              }}
            />
          );
        }}
      />
    </View>
  );
};

const ContactAvatar = ({ item, title, ...props }: { item: any; title: string }) => {
  if (item.photoURL) {
    return (
      <Avatar.Image
        {...props}
        size={40}
        source={{ uri: item.photoURL }}
      />
    );
  }
  return (
    <Avatar.Text
      size={40}
      {...props}
      label={(title === 'You'
        ? 'YOU'
        : item.displayName ?? item.username ?? 'U'
      )
        .slice(0, 2)
        .toUpperCase()}
    />
  );
};

const ChevronRightIcon = (props: any) => (
  <List.Icon {...props} icon="chevron-right" />
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  emptyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: 'center',
  },
  headerLoader: {
    marginRight: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
});

export default ContactScreen;
