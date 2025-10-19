import { RouteProp, useRoute } from '@react-navigation/native';
import * as React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Divider, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import ChatSettings from '../../../../../components/ChatSettings';
import ContactDetails from '../../../../../components/ContactDetails';
import ContactProfile from '../../../../../components/ContactProfile';
import MediaPreviewRow from '../../../../../components/MediaPreviewRow';
import { subscribeUserById, UserDoc } from '../../../../../services/user';

type ChatRouteParams = {
  PersonalChatContact: { id: string };
};

export default function PersonalChatContact() {
  const theme = useTheme();
  const route = useRoute<RouteProp<ChatRouteParams, 'PersonalChatContact'>>();
  const otherUid = route.params?.id;
  const [user, setUser] = React.useState<UserDoc | null>(null);

  React.useEffect(() => {
    if (!otherUid) return;

    const unsubscribe = subscribeUserById(otherUid, userData => {
      setUser(userData);
    });

    return () => unsubscribe(); // cleanup on unmount
  }, [otherUid]);
  
  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {user && (
          <>
            <ContactProfile
              name={user.displayName || 'Unknown'}
              status="Online" // You can change this if you track presence
              avatarUrl={user.photoURL || ''}
              online
              onCall={() => {}}
              onVideoCall={() => {}}
              onMute={() => {}}
              onBlock={() => {}}
            />
            <Divider />
            <ContactDetails
              phone={user.phoneNumber || 'N/A'}
              email={user.email || 'N/A'}
              onPressPhone={() => {}}
              onPressEmail={() => {}}
            />
            <Divider />
          </>
        )}

        <MediaPreviewRow otherUid={otherUid} userName={user?.displayName || 'User'} />
        <Divider />
        <ChatSettings
          notificationsEnabled
          onToggleNotifications={_v => {}}
          onClearChat={() => {}}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingBottom: 24 },
});
