import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, Divider, useTheme } from 'react-native-paper';
import GroupChatSettings from '../../../../../components/Chat/Group/GroupChatSettings';
import GroupInvite from '../../../../../components/Chat/Group/GroupInvite';
import GroupPolicies from '../../../../../components/Chat/Group/GroupPolicies';
import GroupProfile from '../../../../../components/Chat/Group/GroupProfile';
import GroupTabs from '../../../../../components/Chat/Group/GroupTabs';

export default function GroupChatProfileScreen() {
  const theme = useTheme();

  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [muteGroup, setMuteGroup] = React.useState(false);
  const [sendPolicy, setSendPolicy] = React.useState<'all' | 'admins'>('all');
  const [editPolicy, setEditPolicy] = React.useState<'admins' | 'all'>('admins');

  return (
    <ScrollView style={{ backgroundColor: theme.colors.background }} contentContainerStyle={styles.container}>
      {/* Header/Profile (mirrors personal ContactProfile composition) */}
      <GroupProfile
        name="Design Team"
        description="A collaborative space for our design projects and discussions. Share ideas, feedback, and creative solutions."
        createdAt="Jan 15, 2024"
        membersCount={12}
        onChangePhoto={() => {}}
      />

      <Divider />

      {/* Invite section */}
      <GroupInvite
        inviteLink="https://chat.app/invite/design-team-xyz123"
        onCopyLink={() => {}}
        onResetLink={() => {}}
        onShowQr={() => {}}
      />

      <Divider />

      {/* Tabs: Members / Media / Docs / Links */}
      <GroupTabs />

      <Divider />

      {/* Settings (mirrors personal ChatSettings style) */}
      <GroupChatSettings
        notificationsEnabled={notificationsEnabled}
        muteGroup={muteGroup}
        onToggleNotifications={setNotificationsEnabled}
        onToggleMute={setMuteGroup}
      />

      {/* Policies */}
      <GroupPolicies
        sendMessagesPolicy={sendPolicy}
        editInfoPolicy={editPolicy}
        onChangeSendPolicy={setSendPolicy}
        onChangeEditPolicy={setEditPolicy}
      />

      <Divider />

      {/* Leave Group */}
      <View style={styles.leaveGroupContainer}>
        <Button mode="outlined" textColor={theme.colors.error} onPress={() => {}}>
          Leave Group
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 24 },
  leaveGroupContainer: { padding: 16 },
});
